import {
  PDFDocument,
  StandardFonts,
  degrees,
  rgb,
  pushGraphicsState,
  popGraphicsState,
  concatTransformationMatrix,
  rectangle,
  clip,
  endPath,
  type PDFPage,
} from "pdf-lib";
import type { DocumentModel, PageModel } from "../domain/document";
import { uid } from "../domain/document";
import { imagePlacement } from "../domain/imageLayout";
import { restoreFormRoot } from "./pdfForms";
import { preserveCatalog } from "./pdfCatalog";
import { shapePath } from "../domain/shapes";
export async function readDocument(
  bytes: Uint8Array,
  name: string,
): Promise<DocumentModel> {
  const pdf = await PDFDocument.load(bytes);
  return {
    name,
    sources: [bytes],
    pages: pdf.getPages().map((page, index) => ({
      id: uid(),
      source: 0,
      index,
      rotation: page.getRotation().angle,
      marks: [],
    })),
  };
}
export async function mergeDocument(
  doc: DocumentModel,
  bytes: Uint8Array,
): Promise<DocumentModel> {
  const added = await readDocument(bytes, "");
  return {
    ...doc,
    sources: [...doc.sources, bytes],
    pages: [
      ...doc.pages,
      ...added.pages.map((p) => ({ ...p, source: doc.sources.length })),
    ],
  };
}
export async function exportDocument(
  doc: DocumentModel,
  pages: PageModel[] = doc.pages,
) {
  const sources = await Promise.all(
    doc.sources.map((bytes) =>
      PDFDocument.load(bytes, { updateMetadata: false }),
    ),
  );
  const intact =
    sources.length === 1 &&
    pages.length === sources[0].getPageCount() &&
    pages.every((page, index) => page.source === 0 && page.index === index);
  const output = intact ? sources[0] : await PDFDocument.create();
  if (!intact) preserveCatalog(output, sources);
  const fonts = await Promise.all(
    [
      StandardFonts.Helvetica,
      StandardFonts.TimesRoman,
      StandardFonts.Courier,
      StandardFonts.HelveticaBold,
      StandardFonts.HelveticaOblique,
      StandardFonts.HelveticaBoldOblique,
      StandardFonts.TimesRomanBold,
      StandardFonts.TimesRomanItalic,
      StandardFonts.TimesRomanBoldItalic,
      StandardFonts.CourierBold,
      StandardFonts.CourierOblique,
      StandardFonts.CourierBoldOblique,
    ].map((font) => output.embedFont(font)),
  );
  // Copy each source's distinct pages together so multi-page form fields share a parent.
  const copied = new Map<PageModel, PDFPage>();
  for (const [sourceIndex, source] of sources.entries()) {
    if (intact) break;
    const seen = new Set<number>();
    const unique = pages.filter((model) => {
      if (model.source !== sourceIndex || seen.has(model.index)) return false;
      seen.add(model.index);
      return true;
    });
    const result = await output.copyPages(
      source,
      unique.map((model) => model.index),
    );
    unique.forEach((model, i) => copied.set(model, result[i]));
  }
  for (const model of pages) {
    const page = intact
      ? output.getPage(model.index)
      : (copied.get(model) ??
        (await output.copyPages(sources[model.source], [model.index]))[0]);
    if (!intact) output.addPage(page);
    page.setRotation(degrees(model.rotation));
    // PDF.js viewport coordinates are converted back to the unrotated PDF page.
    const { x: originX, y: originY, width, height } = page.getCropBox();
    const convert = (x: number, y: number): [number, number] => {
      const point: [number, number] =
        model.rotation === 90
          ? [y, x]
          : model.rotation === 180
            ? [width - x, y]
            : model.rotation === 270
              ? [width - y, height - x]
              : [x, height - y];
      return [point[0] + originX, point[1] + originY];
    };
    for (const mark of model.marks) {
      const isBox = ["image", "highlight", "rectangle"].includes(mark.kind);
      const [x, y] = convert(
        mark.x,
        mark.y + (isBox ? mark.height : (mark.baselineOffset ?? mark.size)),
      );
      const color = rgb(
        parseInt(mark.color.slice(1, 3), 16) / 255,
        parseInt(mark.color.slice(3, 5), 16) / 255,
        parseInt(mark.color.slice(5, 7), 16) / 255,
      );
      const common = { x, y, rotate: degrees(model.rotation) };
      if (mark.kind === "image" && mark.data) {
        const image = mark.data.startsWith("data:image/png")
          ? await output.embedPng(mark.data)
          : await output.embedJpg(mark.data);
        const placement = imagePlacement(
          mark,
          { width: image.width, height: image.height },
          mark,
        );
        const angle = (model.rotation * Math.PI) / 180;
        page.pushOperators(
          pushGraphicsState(),
          concatTransformationMatrix(
            Math.cos(angle),
            Math.sin(angle),
            -Math.sin(angle),
            Math.cos(angle),
            x,
            y,
          ),
          rectangle(0, 0, mark.width, mark.height),
          clip(),
          endPath(),
        );
        page.pushOperators(concatTransformationMatrix(...placement.pdf));
        page.drawImage(image, {
          x: 0,
          y: 0,
          width: 1,
          height: 1,
          opacity: mark.imageOpacity ?? 1,
        });
        page.pushOperators(popGraphicsState());
      } else if (mark.kind === "rectangle") {
        const [topX, topY] = convert(mark.x, mark.y);
        page.drawSvgPath(
          shapePath(
            mark.shape ?? "rectangle",
            mark.width,
            mark.height,
            mark.points,
          ),
          {
            x: topX,
            y: topY,
            rotate: degrees(model.rotation),
            borderColor: color,
            borderWidth: 1.5,
          },
        );
      } else if (mark.kind === "highlight") {
        page.drawRectangle({
          ...common,
          width: mark.width,
          height: mark.height,
          color,
          opacity: 0.3,
          borderColor: color,
          borderWidth: 0,
        });
      } else {
        const familyIndex = ["Helvetica", "TimesRoman", "Courier"].indexOf(
          mark.font,
        );
        const variant = mark.bold ? (mark.italic ? 3 : 1) : mark.italic ? 2 : 0;
        const font =
          fonts[
            variant === 0 ? familyIndex : 3 + familyIndex * 3 + variant - 1
          ];
        // A single PDF Tj operator uses glyph advances, without pair kerning.
        const textWidth = Array.from(mark.text).reduce(
          (width, char) => width + font.widthOfTextAtSize(char, mark.size),
          0,
        );
        if (mark.noWrap && textWidth > mark.width + 0.5)
          throw new Error("NATIVE_TEXT_OVERFLOW");
        const angle = (model.rotation * Math.PI) / 180;
        if (mark.noWrap)
          page.pushOperators(
            pushGraphicsState(),
            concatTransformationMatrix(
              Math.cos(angle),
              Math.sin(angle),
              -Math.sin(angle),
              Math.cos(angle),
              x,
              y,
            ),
          );
        page.drawText(mark.text, {
          ...(mark.noWrap ? { x: 0, y: 0 } : common),
          size: mark.size,
          color,
          opacity: mark.invisible ? 0 : 1,
          font,
          maxWidth: mark.noWrap ? undefined : mark.width,
          lineHeight: mark.size * 1.25,
        });
        if (mark.noWrap) page.pushOperators(popGraphicsState());
      }
    }
  }
  restoreFormRoot(output);
  return output.save();
}
