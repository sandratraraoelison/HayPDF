import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, PDFName, PDFArray, PDFDict, degrees } from "pdf-lib";
import * as mupdf from "mupdf";
import {
  applyAdvancedPdf,
  type AdvancedOptions,
} from "../src/infrastructure/advancedPdf";
import { readDocument, exportDocument } from "../src/infrastructure/pdfEngine";

const options: AdvancedOptions = {
  text: "Example",
  footer: "{page} / {pages}",
  allPages: false,
  x: 40,
  y: 40,
  width: 200,
  height: 30,
};
async function fixture(rotation = 0) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  page.setRotation(degrees(rotation));
  page.drawText("Secret value", { x: 45, y: 785, size: 18 });
  page.drawText("Keep this", { x: 45, y: 700, size: 18 });
  pdf.addPage([500, 700]);
  return readDocument(await pdf.save(), "advanced.pdf");
}
function text(bytes: Uint8Array, index = 0) {
  const doc = mupdf.Document.openDocument(bytes, "application/pdf");
  const page = doc.loadPage(index);
  const s = page.toStructuredText({});
  try {
    return s.asText();
  } finally {
    s.destroy();
    page.destroy();
    doc.destroy();
  }
}
test("blank pages insert after the selected page without mutating sources", async () => {
  const doc = await fixture();
  const next = await applyAdvancedPdf(doc, 0, "blank", options);
  const pdf = await PDFDocument.load(await exportDocument(next));
  assert.equal(pdf.getPageCount(), 3);
  assert.equal(pdf.getPage(1).getWidth(), 595);
  assert.equal(pdf.getPage(2).getWidth(), 500);
  assert.equal(doc.pages.length, 2);
});
test("headers, page tokens and watermark survive repeated exports", async () => {
  let doc = await fixture();
  doc = await applyAdvancedPdf(doc, 0, "header", {
    ...options,
    text: "Report",
    allPages: true,
  });
  doc = await applyAdvancedPdf(doc, 0, "watermark", {
    ...options,
    text: "DRAFT",
  });
  const bytes = await exportDocument(doc);
  assert.match(text(bytes), /Report/);
  assert.match(text(bytes), /1 \/ 2/);
  assert.match(text(bytes), /DRAFT/);
  assert.match(text(bytes, 1), /2 \/ 2/);
  assert.doesNotMatch(text(bytes, 1), /DRAFT/);
});
test("interactive fields remain registered after reopening and repeated export", async () => {
  const doc = await applyAdvancedPdf(await fixture(), 0, "form", options);
  const bytes = await exportDocument(
    await readDocument(await exportDocument(doc), "again.pdf"),
  );
  const pdf = await PDFDocument.load(bytes);
  assert.equal(
    pdf
      .getForm()
      .getTextField(pdf.getForm().getFields()[0].getName())
      .getText(),
    "Example",
  );
  const field = pdf.getForm().getFields()[0];
  assert.equal(field.acroField.getWidgets().length, 1);
  const resources = pdf.catalog
    .lookup(PDFName.of("AcroForm"), PDFDict)
    .lookup(PDFName.of("DR"), PDFDict)
    .lookup(PDFName.of("Font"), PDFDict);
  assert.ok(
    resources.keys().length > 0,
    "Reader can resolve the font when filling the field",
  );
  pdf.getForm().getTextField(field.getName()).setText("Filled by reader");
  const filled = await PDFDocument.load(await pdf.save());
  assert.equal(
    filled.getForm().getTextField(field.getName()).getText(),
    "Filled by reader",
  );
});
for (const rotation of [0, 90, 180, 270])
  test(`link annotations map to rotated page ${rotation}`, async () => {
    const doc = await applyAdvancedPdf(await fixture(rotation), 0, "link", {
      ...options,
      text: "https://example.com/path",
    });
    const pdf = await PDFDocument.load(await exportDocument(doc));
    const annots = pdf.getPage(0).node.lookup(PDFName.of("Annots"), PDFArray);
    const annotation = pdf.context.lookup(annots.get(0), PDFDict);
    const rect = annotation
      .lookup(PDFName.of("Rect"), PDFArray)
      .asArray()
      .map((n) => Number(n.toString()));
    const expected =
      rotation === 0
        ? [40, 772, 240, 802]
        : rotation === 90
          ? [40, 40, 70, 240]
          : rotation === 180
            ? [355, 40, 555, 70]
            : [525, 602, 555, 802];
    assert.deepEqual(rect, expected);
    assert.match(
      annotation
        .lookup(PDFName.of("A"), PDFDict)
        .get(PDFName.of("URI"))!
        .toString(),
      /example.com/,
    );
  });
test("redaction removes searchable text and leaves nearby content and history intact", async () => {
  const original = await fixture();
  const next = await applyAdvancedPdf(original, 0, "redact", {
    ...options,
    height: 40,
  });
  const extracted = text(await exportDocument(next));
  assert.doesNotMatch(extracted, /Secret/);
  assert.match(extracted, /Keep this/);
  assert.match(text(original.sources[0]), /Secret/);
});
test("invalid areas and unsafe link protocols reject without modifying source", async () => {
  const doc = await fixture();
  await assert.rejects(
    applyAdvancedPdf(doc, 0, "link", {
      ...options,
      text: "javascript:alert(1)",
    }),
    /HTTP/,
  );
  await assert.rejects(
    applyAdvancedPdf(doc, 0, "redact", { ...options, x: 590 }),
    /outside/,
  );
  assert.match(text(doc.sources[0]), /Secret/);
});
