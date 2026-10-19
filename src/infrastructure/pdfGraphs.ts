import * as mupdf from "mupdf";
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";
import type { DocumentModel } from "../domain/document";
import type { Rect } from "../domain/imageLayout";
import { layoutGraph, type GraphDraft } from "../domain/graph";
import { exportDocument, readDocument } from "./pdfEngine";

export async function readGraphText(
  doc: DocumentModel,
  index: number,
  area: Rect,
) {
  const bytes = await exportDocument(doc);
  const pdf = mupdf.Document.openDocument(bytes, "application/pdf"),
    page = pdf.loadPage(index),
    text = page.toStructuredText("preserve-whitespace");
  const [ox, oy] = page.getBounds(),
    lines: string[] = [];
  let line = "";
  try {
    text.walk({
      onChar(char, _origin, _font, _size, quad) {
        const x = (quad[0] + quad[2] + quad[4] + quad[6]) / 4 - ox,
          y = (quad[1] + quad[3] + quad[5] + quad[7]) / 4 - oy;
        if (
          x >= area.x &&
          x <= area.x + area.width &&
          y >= area.y &&
          y <= area.y + area.height
        )
          line += char;
      },
      endLine() {
        if (line.trim()) lines.push(line.trim());
        line = "";
      },
    });
    if (line.trim()) lines.push(line.trim());
    return lines.join("\n");
  } finally {
    text.destroy();
    page.destroy();
    pdf.destroy();
  }
}
export async function replaceGraph(
  doc: DocumentModel,
  index: number,
  draft: GraphDraft,
): Promise<DocumentModel> {
  const layout = layoutGraph(draft),
    original = await exportDocument(doc);
  const metrics = await PDFDocument.create(),
    font = await metrics.embedFont(StandardFonts.Helvetica);
  for (const label of layout.texts) {
    let width: number;
    try {
      width = font.widthOfTextAtSize(label.text, label.size);
    } catch {
      throw new Error(
        "Certains caractères ne sont pas pris en charge par la police du graphique.",
      );
    }
    if (width > label.maxWidth) {
      label.size *= label.maxWidth / width;
      if (label.size < 6)
        throw new Error(
          "Un libellé est trop long. Réduisez le texte ou le nombre d’éléments.",
        );
    }
  }
  const source = mupdf.Document.openDocument(
    original,
    "application/pdf",
  ).asPDF()!;
  let cleaned: Uint8Array;
  try {
    const page = source.loadPage(index) as mupdf.PDFPage;
    try {
      const [ox, oy, right, bottom] = page.getBounds(),
        a = draft.area;
      if (
        !Number.isFinite(a.x + a.y + a.width + a.height) ||
        a.x < 0 ||
        a.y < 0 ||
        a.x + a.width > right - ox + 0.1 ||
        a.y + a.height > bottom - oy + 0.1
      )
        throw new Error("Zone hors de la page / Area outside page");
      const annotation = page.createAnnotation("Redact");
      try {
        annotation.setRect([
          ox + a.x,
          oy + a.y,
          ox + a.x + a.width,
          oy + a.y + a.height,
        ]);
        annotation.applyRedaction(
          0,
          mupdf.PDFPage.REDACT_IMAGE_PIXELS,
          mupdf.PDFPage.REDACT_LINE_ART_REMOVE_IF_COVERED,
          mupdf.PDFPage.REDACT_TEXT_REMOVE,
        );
      } finally {
        annotation.destroy();
      }
      const buffer = source.saveToBuffer("garbage=4,compress");
      try {
        cleaned = buffer.asUint8Array().slice();
      } finally {
        buffer.destroy();
      }
    } finally {
      page.destroy();
    }
  } finally {
    source.destroy();
  }
  const pdf = await PDFDocument.load(cleaned),
    page = pdf.getPage(index),
    face = await pdf.embedFont(StandardFonts.Helvetica),
    box = page.getCropBox(),
    rotation = page.getRotation().angle;
  const convert = (x: number, y: number) => {
    x += draft.area.x;
    y += draft.area.y;
    const [px, py] =
      rotation === 90
        ? [y, x]
        : rotation === 180
          ? [box.width - x, y]
          : rotation === 270
            ? [box.width - y, box.height - x]
            : [x, box.height - y];
    return { x: px + box.x, y: py + box.y, rotate: degrees(rotation) };
  };
  const color = (hex: string) =>
    rgb(
      parseInt(hex.slice(1, 3), 16) / 255,
      parseInt(hex.slice(3, 5), 16) / 255,
      parseInt(hex.slice(5, 7), 16) / 255,
    );
  page.drawRectangle({
    ...convert(0, draft.area.height),
    width: draft.area.width,
    height: draft.area.height,
    color: rgb(1, 1, 1),
  });
  for (const path of layout.paths)
    page.drawSvgPath(path.d, {
      ...convert(0, 0),
      color: path.fill ? color(path.color) : undefined,
      borderColor: path.fill ? undefined : color(path.color),
      borderWidth: path.fill ? 0 : 1,
    });
  for (const label of layout.texts)
    page.drawText(label.text, {
      ...convert(
        label.x -
          (label.center
            ? face.widthOfTextAtSize(label.text, label.size) / 2
            : 0),
        label.y,
      ),
      font: face,
      size: label.size,
      color: color(label.color),
    });
  return readDocument(await pdf.save(), doc.name);
}
