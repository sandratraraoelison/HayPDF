import * as mupdf from "mupdf";
import {
  PDFDocument,
  PDFName,
  PDFDict,
  PDFArray,
  PDFString,
  PDFHexString,
  PDFRef,
  type PDFObject,
} from "pdf-lib";
import type { DocumentModel } from "../domain/document";
import { exportDocument, readDocument } from "./pdfEngine";

export interface StructureTag {
  path: number[];
  role: string;
  alt: string;
}
export interface PdfAudit {
  title: string;
  language: string;
  tagged: boolean;
  tags: StructureTag[];
  pages: {
    width: number;
    height: number;
    trim: number[];
    bleed: number[];
    images: { width: number; height: number; dpi: number }[];
    fonts: string[];
  }[];
}
const string = (value: PDFObject | undefined) =>
  value instanceof PDFString || value instanceof PDFHexString
    ? value.decodeText()
    : "";
export async function inspectPdf(doc: DocumentModel): Promise<PdfAudit> {
  const bytes = await exportDocument(doc),
    pdf = await PDFDocument.load(bytes),
    source = mupdf.Document.openDocument(bytes, "application/pdf");
  const tags: StructureTag[] = [];
  const tree = pdf.catalog.lookupMaybe(PDFName.of("StructTreeRoot"), PDFDict);
  const walk = (
    value: PDFObject | undefined,
    path: number[],
    seen: Set<string>,
  ) => {
    if (!value) return;
    if (value instanceof PDFRef) {
      if (seen.has(value.toString())) return;
      seen = new Set(seen).add(value.toString());
      value = pdf.context.lookup(value);
    }
    if (value instanceof PDFArray) {
      value.asArray().forEach((child, i) => walk(child, [...path, i], seen));
      return;
    }
    if (!(value instanceof PDFDict)) return;
    const role = value.get(PDFName.of("S"));
    if (role instanceof PDFName)
      tags.push({
        path,
        role: role.decodeText(),
        alt: string(value.get(PDFName.of("Alt"))),
      });
    walk(value.get(PDFName.of("K")), [...path, -1], seen);
  };
  walk(tree?.get(PDFName.of("K")), [], new Set());
  try {
    const pages = pdf.getPages().map((page, index) => {
      const p = source.loadPage(index),
        images: PdfAudit["pages"][number]["images"] = [],
        fonts = new Set<string>();
      try {
        const text = p.toStructuredText("preserve-images");
        try {
          text.walk({
            onChar: (_c, _o, font) => fonts.add(font.getName()),
            onImageBlock: (_bbox, matrix, image) => {
              const w = Math.hypot(matrix[0], matrix[1]),
                h = Math.hypot(matrix[2], matrix[3]);
              images.push({
                width: image.getWidth(),
                height: image.getHeight(),
                dpi: Math.min(
                  (image.getWidth() * 72) / Math.max(w, 0.001),
                  (image.getHeight() * 72) / Math.max(h, 0.001),
                ),
              });
            },
          });
        } finally {
          text.destroy();
        }
      } finally {
        p.destroy();
      }
      const trim = page.getTrimBox(),
        bleed = page.getBleedBox();
      return {
        width: page.getWidth(),
        height: page.getHeight(),
        trim: [trim.x, trim.y, trim.width, trim.height],
        bleed: [bleed.x, bleed.y, bleed.width, bleed.height],
        images,
        fonts: [...fonts],
      };
    });
    return {
      title: pdf.getTitle() ?? "",
      language: string(pdf.catalog.get(PDFName.of("Lang"))),
      tagged: !!tree,
      tags,
      pages,
    };
  } finally {
    source.destroy();
  }
}
export async function setAccessibility(
  doc: DocumentModel,
  title: string,
  language: string,
  alternatives: { path: number[]; alt: string }[],
): Promise<DocumentModel> {
  if (!title.trim() || !language.trim())
    throw new Error("ACCESSIBILITY_METADATA_REQUIRED");
  const pdf = await PDFDocument.load(await exportDocument(doc));
  pdf.setTitle(title);
  pdf.catalog.set(PDFName.of("Lang"), PDFHexString.fromText(language));
  const preferences =
    pdf.catalog.lookupMaybe(PDFName.of("ViewerPreferences"), PDFDict) ??
    pdf.context.obj({});
  preferences.set(PDFName.of("DisplayDocTitle"), pdf.context.obj(true));
  pdf.catalog.set(PDFName.of("ViewerPreferences"), preferences);
  const tree = pdf.catalog.lookupMaybe(PDFName.of("StructTreeRoot"), PDFDict);
  for (const edit of alternatives) {
    let value: PDFObject | undefined = tree?.get(PDFName.of("K"));
    for (const step of edit.path) {
      value = value ? pdf.context.lookup(value) : undefined;
      value =
        step === -1 && value instanceof PDFDict
          ? value.get(PDFName.of("K"))
          : step >= 0 && value instanceof PDFArray
            ? value.get(step)
            : undefined;
    }
    const node = value ? pdf.context.lookup(value) : undefined;
    if (node instanceof PDFDict)
      node.set(PDFName.of("Alt"), PDFHexString.fromText(edit.alt));
  }
  return readDocument(await pdf.save(), doc.name);
}
export async function setPrintBoxes(
  doc: DocumentModel,
  insetMm: number,
  bleedMm: number,
): Promise<DocumentModel> {
  if (
    !Number.isFinite(insetMm + bleedMm) ||
    insetMm < 0 ||
    bleedMm < 0 ||
    bleedMm > insetMm
  )
    throw new Error("INVALID_PRINT_BOXES");
  const pdf = await PDFDocument.load(await exportDocument(doc));
  const inset = (insetMm * 72) / 25.4,
    bleed = (bleedMm * 72) / 25.4;
  for (const page of pdf.getPages()) {
    const box = page.getMediaBox();
    if (inset * 2 >= Math.min(box.width, box.height))
      throw new Error("INVALID_PRINT_BOXES");
    page.setTrimBox(
      box.x + inset,
      box.y + inset,
      box.width - 2 * inset,
      box.height - 2 * inset,
    );
    page.setBleedBox(
      box.x + inset - bleed,
      box.y + inset - bleed,
      box.width - 2 * inset + 2 * bleed,
      box.height - 2 * inset + 2 * bleed,
    );
  }
  return readDocument(await pdf.save(), doc.name);
}
export async function writeDocumentScript(
  doc: DocumentModel,
  name: string,
  code: string,
): Promise<DocumentModel> {
  if (!name.trim() || !code.trim()) throw new Error("SCRIPT_REQUIRED");
  const pdf = await PDFDocument.load(await exportDocument(doc));
  const root = pdf.catalog.lookupMaybe(PDFName.of("Names"), PDFDict);
  const scripts = root?.lookupMaybe(PDFName.of("JavaScript"), PDFDict);
  const names = scripts?.lookupMaybe(PDFName.of("Names"), PDFArray);
  if (names)
    for (let i = names.size() - 2; i >= 0; i -= 2) {
      if (string(names.get(i)) === name) {
        names.remove(i + 1);
        names.remove(i);
      }
    }
  pdf.addJavaScript(name, code);
  return readDocument(await pdf.save(), doc.name);
}
export async function moveStructureTag(
  doc: DocumentModel,
  path: number[],
  direction: -1 | 1,
): Promise<DocumentModel> {
  const pdf = await PDFDocument.load(await exportDocument(doc));
  const tree = pdf.catalog.lookupMaybe(PDFName.of("StructTreeRoot"), PDFDict);
  let value: PDFObject | undefined = tree?.get(PDFName.of("K"));
  const index = path.at(-1);
  if (index === undefined || index < 0) throw new Error("INVALID_TAG_ORDER");
  for (const step of path.slice(0, -1)) {
    value = value ? pdf.context.lookup(value) : undefined;
    value =
      step === -1 && value instanceof PDFDict
        ? value.get(PDFName.of("K"))
        : step >= 0 && value instanceof PDFArray
          ? value.get(step)
          : undefined;
  }
  const array = value ? pdf.context.lookup(value) : undefined;
  if (
    !(array instanceof PDFArray) ||
    index + direction < 0 ||
    index + direction >= array.size()
  )
    throw new Error("INVALID_TAG_ORDER");
  const current = array.get(index),
    other = array.get(index + direction);
  array.set(index, other);
  array.set(index + direction, current);
  return readDocument(await pdf.save(), doc.name);
}
