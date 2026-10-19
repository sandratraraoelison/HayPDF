import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, degrees } from "pdf-lib";
import * as mupdf from "mupdf";
import { readDocument, exportDocument } from "../src/infrastructure/pdfEngine";
import { replaceNativeText } from "../src/application/replaceNativeText";
import { removeNativeText } from "../src/infrastructure/nativeTextEngine";
async function fixture(rotation = 0) {
  const doc = await PDFDocument.create();
  const p = doc.addPage([595, 842]);
  p.drawText("Original text", { x: 45, y: 770, size: 20 });
  p.drawText("Keep this line", { x: 45, y: 700, size: 20 });
  p.setRotation(degrees(rotation));
  return doc.save();
}
function inspect(bytes: Uint8Array) {
  const doc = mupdf.Document.openDocument(bytes, "application/pdf");
  const p = doc.loadPage(0);
  const text = p.toStructuredText({});
  try {
    return text.asText();
  } finally {
    text.destroy();
    p.destroy();
    doc.destroy();
  }
}
test("native replacement actually removes the old text while preserving nearby text", async () => {
  const doc = await readDocument(await fixture(), "native.pdf");
  const block = {
    text: "Original text",
    x: 44,
    y: 51,
    width: 140,
    height: 28,
    size: 20,
  };
  const next = await replaceNativeText(doc, 0, block, "Nouveau texte", {
    font: "Helvetica",
    size: 20,
    color: "#302d3e",
  });
  const text = inspect(await exportDocument(next));
  assert.ok(!text.includes("Original"));
  assert.ok(text.includes("Nouveau texte"));
  assert.ok(text.includes("Keep this line"));
  assert.ok(inspect(doc.sources[0]).includes("Original text"));
});
for (const rotation of [0, 90, 180, 270])
  test(`native removal uses correct coordinates at ${rotation} degrees`, async () => {
    const bytes = await fixture(rotation);
    const doc = mupdf.Document.openDocument(bytes, "application/pdf");
    const page = doc.loadPage(0);
    const quads = page.search("Original text").flat();
    const values = quads.flat();
    const xs = values.filter((_, i) => i % 2 === 0),
      ys = values.filter((_, i) => i % 2 === 1);
    page.destroy();
    doc.destroy();
    const block = {
      text: "Original text",
      x: Math.min(...xs),
      y: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
      size: 20,
    };
    const text = inspect(await removeNativeText(bytes, 0, block));
    assert.ok(!text.includes("Original"), text);
    assert.ok(text.includes("Keep this line"), text);
  });
test("OCR export includes searchable text without a visible text overlay", async () => {
  const model = await readDocument(await fixture(), "ocr.pdf");
  model.pages[0].marks.push({
    id: "ocr",
    kind: "text",
    text: "Recognized scan",
    x: 50,
    y: 200,
    width: 250,
    height: 20,
    size: 16,
    color: "#000000",
    font: "Helvetica",
    invisible: true,
  });
  const bytes = await exportDocument(model);
  assert.ok(inspect(bytes).includes("Recognized scan"));
  const original = mupdf.Document.openDocument(
      model.sources[0],
      "application/pdf",
    ),
    output = mupdf.Document.openDocument(bytes, "application/pdf");
  const p1 = original.loadPage(0),
    p2 = output.loadPage(0);
  const a = p1.toPixmap(
      mupdf.Matrix.identity,
      mupdf.ColorSpace.DeviceRGB,
      false,
    ),
    b = p2.toPixmap(mupdf.Matrix.identity, mupdf.ColorSpace.DeviceRGB, false);
  try {
    assert.deepEqual(a.getPixels(), b.getPixels());
  } finally {
    a.destroy();
    b.destroy();
    p1.destroy();
    p2.destroy();
    original.destroy();
    output.destroy();
  }
});
test("native replacement leaves unrelated pending redactions unapplied", async () => {
  const original = mupdf.Document.openDocument(
    await fixture(),
    "application/pdf",
  ).asPDF()!;
  const page = original.loadPage(0) as mupdf.PDFPage;
  const pending = page.createAnnotation("Redact");
  pending.setRect([40, 120, 250, 150]);
  pending.update();
  const buffer = original.saveToBuffer("");
  const bytes = buffer.asUint8Array().slice();
  buffer.destroy();
  pending.destroy();
  page.destroy();
  original.destroy();
  const edited = await removeNativeText(bytes, 0, {
    text: "Original text",
    x: 44,
    y: 51,
    width: 140,
    height: 28,
    size: 20,
  });
  assert.ok(inspect(edited).includes("Keep this line"));
  assert.ok(!inspect(edited).includes("Original text"));
});
