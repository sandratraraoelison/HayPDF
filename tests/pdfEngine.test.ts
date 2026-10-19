import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import {
  readDocument,
  mergeDocument,
  exportDocument,
} from "../src/infrastructure/pdfEngine";
async function fixture(widths: number[]) {
  const pdf = await PDFDocument.create();
  widths.forEach((w) => pdf.addPage([w, 800]));
  return pdf.save();
}
test("fusion, réorganisation, rotation et extraction conservent les bonnes pages", async () => {
  const original = await readDocument(await fixture([400, 500]), "test.pdf");
  const merged = await mergeDocument(original, await fixture([600]));
  assert.equal(merged.pages.length, 3);
  const model = {
    ...merged,
    pages: [{ ...merged.pages[2], rotation: 90 }, merged.pages[0]],
  };
  const result = await PDFDocument.load(await exportDocument(model));
  assert.equal(result.getPageCount(), 2);
  assert.equal(result.getPage(0).getWidth(), 600);
  assert.equal(result.getPage(0).getRotation().angle, 90);
  assert.equal(result.getPage(1).getWidth(), 400);
  const extracted = await PDFDocument.load(
    await exportDocument(model, [model.pages[0]]),
  );
  assert.equal(extracted.getPageCount(), 1);
  assert.equal(original.pages.length, 2);
});
test("exporte texte et formes sans modifier le document source", async () => {
  const doc = await readDocument(await fixture([595]), "annotations.pdf");
  doc.pages[0].marks = [
    {
      id: "text",
      kind: "text",
      x: 40,
      y: 40,
      width: 220,
      height: 30,
      text: "Bonjour PDF",
      size: 18,
      color: "#393454",
      font: "Helvetica",
    },
    {
      id: "shape",
      kind: "rectangle",
      x: 50,
      y: 100,
      width: 100,
      height: 80,
      text: "",
      size: 18,
      color: "#8060ce",
      font: "Helvetica",
    },
  ];
  const bytes = await exportDocument(doc);
  const pdf = await PDFDocument.load(bytes);
  assert.equal(pdf.getPageCount(), 1);
  assert.ok(bytes.length > doc.sources[0].length);
});
test("refuse un fichier non PDF", async () => {
  await assert.rejects(readDocument(new Uint8Array([1, 2, 3]), "invalid.pdf"));
});
