import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { PDFDocument, StandardFonts, degrees } from "pdf-lib";
import * as mupdf from "mupdf";
import { unzipSync } from "fflate";
import {
  parsePageSelection,
  splitPageGroups,
} from "../src/domain/pageSelection";
import {
  createBlankPdf,
  createImagesPdf,
  exportPageImages,
  exportPlainText,
  splitDocument,
} from "../src/infrastructure/documentExports";
import { readDocument, exportDocument } from "../src/infrastructure/pdfEngine";
import {
  protectPdf,
  unlockPdf,
  compressPdf,
} from "../src/infrastructure/pdfSecurity";
import {
  applyAdvancedPdf,
  type AdvancedOptions,
} from "../src/infrastructure/advancedPdf";
import {
  readFormFields,
  fillFormFields,
} from "../src/infrastructure/formFields";
import { duplicateDocumentPage } from "../src/application/pageOperations";

async function fixture() {
  const pdf = await PDFDocument.create();
  pdf.addPage([300, 400]).drawText("First page", { x: 30, y: 340, size: 20 });
  const page = pdf.addPage([400, 500]);
  page.drawText("Second page", { x: 30, y: 400, size: 20 });
  page.setRotation(degrees(90));
  return readDocument(await pdf.save(), "example.pdf");
}
function raster(bytes: Uint8Array, index = 0) {
  const doc = mupdf.Document.openDocument(bytes, "application/pdf"),
    page = doc.loadPage(index);
  const pixmap = page.toPixmap(
    mupdf.Matrix.identity,
    mupdf.ColorSpace.DeviceRGB,
    false,
    true,
  );
  try {
    return createHash("sha256").update(pixmap.getPixels()).digest("hex");
  } finally {
    pixmap.destroy();
    page.destroy();
    doc.destroy();
  }
}
test("page ranges reject invalid selections and split groups preserve order", () => {
  assert.deepEqual(parsePageSelection("3,1-2,2", 3), [2, 0, 1]);
  assert.deepEqual(parsePageSelection("", 2), [0, 1]);
  assert.deepEqual(splitPageGroups("1-2;3", 3), [[0, 1], [2]]);
  for (const value of ["0", "3-1", "1,", "4", "1--2", "-1", "1.5"])
    assert.throws(() => parsePageSelection(value, 3), /INVALID_PAGE_RANGE/);
  assert.throws(() => splitPageGroups("1;;2", 2));
});
test("PNG/JPEG exports preserve visible edits, rotation and requested page selection", async () => {
  const doc = await fixture();
  doc.pages[0].marks.push({
    id: "m",
    kind: "text",
    x: 20,
    y: 150,
    width: 200,
    height: 30,
    text: "Added",
    size: 14,
    color: "#000000",
    font: "Helvetica",
  });
  const png = await exportPageImages(doc, [0], "png", 144);
  assert.equal(png.mime, "image/png");
  const image = new mupdf.Image(png.bytes);
  try {
    assert.equal(image.getWidth(), 600);
    assert.equal(image.getHeight(), 800);
  } finally {
    image.destroy();
  }
  const jpg = await exportPageImages(doc, [1], "jpeg", 72);
  assert.equal(jpg.bytes[0], 255);
  assert.equal(jpg.bytes[1], 216);
  const rotated = new mupdf.Image(jpg.bytes);
  try {
    assert.equal(rotated.getWidth(), 500);
    assert.equal(rotated.getHeight(), 400);
  } finally {
    rotated.destroy();
  }
  const archive = unzipSync(
    (await exportPageImages(doc, [0, 1], "png", 72)).bytes,
  );
  assert.deepEqual(Object.keys(archive), [
    "example-page-1.png",
    "example-page-2.png",
  ]);
  const text = new TextDecoder().decode(
    (await exportPlainText(doc, [1, 0])).bytes,
  );
  assert.ok(text.indexOf("Second page") < text.indexOf("First page"));
  assert.match(text, /Added/);
});
test("split creates standalone PDF files in a ZIP and retains selected order", async () => {
  const doc = await fixture();
  const parts = unzipSync((await splitDocument(doc, "2;1-2")).bytes);
  assert.equal(Object.keys(parts).length, 2);
  const first = await PDFDocument.load(parts["example-part-1.pdf"]),
    second = await PDFDocument.load(parts["example-part-2.pdf"]);
  assert.equal(first.getPageCount(), 1);
  assert.equal(first.getPage(0).getRotation().angle, 90);
  assert.equal(second.getPageCount(), 2);
  assert.equal(
    Object.keys(unzipSync((await splitDocument(doc, "")).bytes)).length,
    2,
  );
});
test("creation from PNG and JPEG produces ordered A4 pages without stretching", async () => {
  const source = await fixture();
  const png = (await exportPageImages(source, [0], "png", 72)).bytes;
  const jpeg = (await exportPageImages(source, [1], "jpeg", 72)).bytes;
  const images = await createImagesPdf([
    { bytes: png, type: "png" },
    { bytes: jpeg, type: "jpeg" },
  ]);
  const result = await PDFDocument.load(await exportDocument(images));
  assert.equal(result.getPageCount(), 2);
  assert.deepEqual(result.getPage(0).getSize(), { width: 595, height: 842 });
  assert.deepEqual(result.getPage(1).getSize(), { width: 842, height: 595 });
  assert.equal((await createBlankPdf("blank.pdf", 600, 800)).pages.length, 1);
  await assert.rejects(createImagesPdf([]), /NO_IMAGES/);
});
for (const password of ["simple123", 'a,b="quoted"& café'])
  test(`AES-256 encryption and reopening accept ${JSON.stringify(password)}`, async () => {
    const original = await exportDocument(await fixture());
    const encrypted = protectPdf(original, password);
    const doc = mupdf.Document.openDocument(encrypted, "application/pdf");
    try {
      assert.ok(doc.needsPassword());
      assert.equal(doc.authenticatePassword("wrong"), 0);
      assert.ok(doc.authenticatePassword(password));
      assert.equal(doc.countPages(), 2);
    } finally {
      doc.destroy();
    }
    assert.equal(unlockPdf(encrypted), undefined);
    assert.throws(() => unlockPdf(encrypted, "wrong"), /WRONG_PASSWORD/);
    const decrypted = unlockPdf(encrypted, password)!;
    assert.equal((await PDFDocument.load(decrypted)).getPageCount(), 2);
    assert.equal(raster(original), raster(decrypted));
  });
test("lossless optimization never increases export size and preserves rendering", async () => {
  const bytes = await exportDocument(await fixture()),
    compressed = compressPdf(bytes);
  assert.ok(compressed.length <= bytes.length);
  assert.equal(raster(bytes), raster(compressed));
});
test("duplicating a page creates independent model ids and form field names", async () => {
  let original = await fixture();
  original = await applyAdvancedPdf(original, 0, "form", {
    ...formOptions,
    fieldName: "Name",
    text: "Original",
  });
  const copy = duplicateDocumentPage(original, 0);
  assert.equal(original.pages.length, 2);
  assert.equal(copy.pages.length, 3);
  assert.notEqual(copy.pages[0].id, copy.pages[1].id);
  const fields = await readFormFields(await exportDocument(copy));
  assert.equal(fields.length, 2);
  assert.notEqual(fields[0].name, fields[1].name);
});
const formOptions: AdvancedOptions = {
  text: "",
  footer: "",
  allPages: false,
  x: 30,
  y: 50,
  width: 200,
  height: 80,
};
test("all form controls retain typed answers across editing, export and flattening", async () => {
  let doc = await fixture();
  for (const [i, type] of (
    ["text", "checkbox", "dropdown", "radio", "list"] as const
  ).entries()) {
    doc = await applyAdvancedPdf(doc, 0, "form", {
      ...formOptions,
      y: 20 + i * 70,
      height: 60,
      formType: type,
      fieldName: type,
      choices: "Alpha\nBeta",
      text: "Initial",
    });
  }
  const bytes = await exportDocument(doc);
  assert.equal((await readFormFields(bytes)).length, 5);
  const answers = {
    text: "Filled",
    checkbox: true,
    dropdown: "Beta",
    radio: "Alpha",
    list: ["Alpha", "Beta"],
  };
  const filled = await fillFormFields(bytes, answers),
    fields = await readFormFields(
      await exportDocument(await readDocument(filled, "filled.pdf")),
    );
  for (const field of fields)
    assert.deepEqual(field.value, answers[field.name as keyof typeof answers]);
  const flattened = await fillFormFields(filled, answers, true);
  assert.equal((await readFormFields(flattened)).length, 0);
  assert.equal(raster(filled), raster(flattened));
});
test("splitting a shared form prunes widgets from excluded pages", async () => {
  const pdf = await PDFDocument.create();
  const first = pdf.addPage([300, 400]),
    second = pdf.addPage([300, 400]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const field = pdf.getForm().createTextField("shared");
  field.setText("Shared");
  for (const page of [first, second])
    field.addToPage(page, { x: 30, y: 300, width: 150, height: 30, font });
  const doc = await readDocument(await pdf.save(), "shared.pdf");
  const all = await PDFDocument.load(await exportDocument(doc));
  assert.equal(all.getForm().getFields().length, 1);
  assert.equal(all.getForm().getFields()[0].acroField.getWidgets().length, 2);
  const single = await PDFDocument.load(
    await exportDocument(doc, [doc.pages[0]]),
  );
  assert.equal(
    single.getForm().getFields()[0].acroField.getWidgets().length,
    1,
  );
});
test("office conversion rejects unsupported formats before running external programs", async () => {
  const require = createRequire(import.meta.url);
  const { convertOffice } = require("../electron/officeConverter.cjs");
  await assert.rejects(
    convertOffice("file.exe", new Uint8Array()),
    /UNSUPPORTED_OFFICE_FORMAT/,
  );
});
