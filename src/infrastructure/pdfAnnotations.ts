import * as mupdf from "mupdf";
import type { DocumentModel } from "../domain/document";
import {
  measurePoints,
  type Point,
  type MeasurementKind,
} from "../domain/workbench";
import { mutatePdf, withPdfPage } from "./pdfMutation";
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";
import { exportDocument, readDocument } from "./pdfEngine";
import type { Rect } from "../domain/imageLayout";

export async function addMeasurement(
  doc: DocumentModel,
  index: number,
  points: Point[],
  kind: MeasurementKind,
  unitsPerPoint: number,
  unit: string,
): Promise<DocumentModel> {
  const value = measurePoints(points, kind, unitsPerPoint);
  if (!unit.trim()) throw new Error("INVALID_MEASUREMENT");
  return mutatePdf(doc, (pdf) =>
    withPdfPage(pdf, index, (page) => {
      const bounds = page.getBounds();
      if (
        points.some(
          (p) =>
            p.x < bounds[0] ||
            p.y < bounds[1] ||
            p.x > bounds[2] ||
            p.y > bounds[3],
        )
      )
        throw new Error("INVALID_MEASUREMENT");
      const annotation = page.createAnnotation(
        kind === "distance" && points.length === 2
          ? "Line"
          : kind === "distance"
            ? "PolyLine"
            : "Polygon",
      );
      try {
        if (annotation.hasLine()) {
          annotation.setLine(
            [points[0].x, points[0].y],
            [points[1].x, points[1].y],
          );
          annotation.setLineEndingStyles("OpenArrow", "OpenArrow");
          annotation.setLineCaption(true);
        } else annotation.setVertices(points.map((p) => [p.x, p.y]));
        annotation.setColor([0.45, 0.2, 0.8]);
        annotation.setBorderWidth(1.5);
        annotation.setContents(
          `${value.toFixed(3)} ${unit}${kind === "area" ? "²" : ""}`,
        );
        annotation.setAuthor("HayPDF");
        annotation.setName(crypto.randomUUID());
        annotation.setFlags(mupdf.PDFAnnotation.IS_PRINT);
        const obj = annotation.getObject();
        obj.put("Measure", {
          Type: "Measure",
          Subtype: "RL",
          R: pdf.newString(`1 pt = ${unitsPerPoint} ${unit}`),
          X: [
            {
              Type: "NumberFormat",
              U: pdf.newString(unit),
              C: unitsPerPoint,
              D: 1000,
            },
          ],
          D: [
            {
              Type: "NumberFormat",
              U: pdf.newString(unit),
              C: unitsPerPoint,
              D: 1000,
            },
          ],
          A: [
            {
              Type: "NumberFormat",
              U: pdf.newString(`${unit}²`),
              C: unitsPerPoint ** 2,
              D: 1000,
            },
          ],
        });
        annotation.update();
      } finally {
        annotation.destroy();
      }
    }),
  );
}
export async function addCustomStamp(
  doc: DocumentModel,
  index: number,
  rect: Rect,
  text: string,
  image?: Uint8Array,
): Promise<DocumentModel> {
  if (image)
    return mutatePdf(doc, (pdf) =>
      withPdfPage(pdf, index, (page) => {
        const a = page.createAnnotation("Stamp"),
          bitmap = new mupdf.Image(image);
        try {
          a.setStampImage(bitmap);
          a.setRect([
            rect.x,
            rect.y,
            rect.x + rect.width,
            rect.y + rect.height,
          ]);
          a.setAuthor("HayPDF");
          a.setContents(text);
          a.setName(crypto.randomUUID());
          a.setFlags(mupdf.PDFAnnotation.IS_PRINT);
          a.update();
        } finally {
          bitmap.destroy();
          a.destroy();
        }
      }),
    );
  const pdf = await PDFDocument.load(await exportDocument(doc)),
    page = pdf.getPage(index),
    rotation = ((page.getRotation().angle % 360) + 360) % 360;
  const font = await pdf.embedFont(StandardFonts.HelveticaBold),
    label = text
      .replaceAll("{date}", new Date().toLocaleDateString("fr-FR"))
      .replaceAll("{page}", String(index + 1));
  const size = Math.min(
    24,
    (rect.width - 16) / Math.max(1, font.widthOfTextAtSize(label, 1)),
  );
  if (size < 6) throw new Error("STAMP_TOO_SMALL");
  const box = page.getCropBox();
  const [x, y] =
    rotation === 90
      ? [box.x + rect.y + rect.height, box.y + rect.x]
      : rotation === 180
        ? [box.x + box.width - rect.x, box.y + rect.y + rect.height]
        : rotation === 270
          ? [
              box.x + box.width - rect.y - rect.height,
              box.y + box.height - rect.x,
            ]
          : [box.x + rect.x, box.y + box.height - rect.y - rect.height];
  page.drawRectangle({
    x,
    y,
    width: rect.width,
    height: rect.height,
    borderWidth: 2,
    borderColor: rgb(0.45, 0.2, 0.8),
    rotate: degrees(rotation),
  });
  const angle = (rotation * Math.PI) / 180;
  page.drawText(label, {
    x: x + Math.cos(angle) * 8 - (Math.sin(angle) * (rect.height - size)) / 2,
    y: y + Math.sin(angle) * 8 + (Math.cos(angle) * (rect.height - size)) / 2,
    size,
    font,
    color: rgb(0.45, 0.2, 0.8),
    rotate: degrees(rotation),
  });
  return readDocument(await pdf.save(), doc.name);
}
