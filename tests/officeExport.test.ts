import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { unzipSync, strFromU8 } from "fflate";
import ExcelJS from "exceljs";
import { readDocument } from "../src/infrastructure/pdfEngine";
import {
  exportOfficeDocument,
  rtfText,
} from "../src/infrastructure/officeExport";

async function fixture() {
  const pdf = await PDFDocument.create(),
    font = await pdf.embedFont(StandardFonts.Helvetica);
  pdf
    .addPage([400, 300])
    .drawText("First page café {value}", { x: 30, y: 240, font, size: 16 });
  pdf
    .addPage([300, 400])
    .drawText("Second page", { x: 30, y: 340, font, size: 16 });
  return readDocument(await pdf.save(), "sample.pdf");
}

test("DOCX preserves selected text, page order and source snapshots", async () => {
  const doc = await fixture(),
    source = doc.sources[0].slice();
  const file = await exportOfficeDocument(doc, [1, 0], "docx");
  const archive = unzipSync(file.bytes),
    xml = strFromU8(archive["word/document.xml"]);
  assert.match(file.name, /\.docx$/);
  assert.ok(archive["[Content_Types].xml"]);
  assert.ok(xml.indexOf("Second page") < xml.indexOf("First page"));
  assert.match(xml, /café/);
  assert.deepEqual(doc.sources[0], source);
});

test("XLSX can be reopened and retains selected pages and literal text", async () => {
  const file = await exportOfficeDocument(await fixture(), [1, 0], "xlsx");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(file.bytes as unknown as ExcelJS.Buffer);
  assert.deepEqual(
    workbook.worksheets.map((sheet) => sheet.name),
    ["Page 2", "Page 1"],
  );
  assert.equal(workbook.worksheets[0].getCell("A1").value, "Second page");
  assert.equal(
    workbook.worksheets[1].getCell("A1").value,
    "First page café {value}",
  );
});

test("PPTX embeds one PDF rendering per selected page without stretching", async () => {
  const file = await exportOfficeDocument(await fixture(), [1, 0], "pptx");
  const archive = unzipSync(file.bytes);
  assert.ok(archive["ppt/presentation.xml"]);
  assert.equal(
    Object.keys(archive).filter((name) =>
      /^ppt\/slides\/slide\d+\.xml$/.test(name),
    ).length,
    2,
  );
  assert.equal(
    Object.keys(archive).filter(
      (name) => name.startsWith("ppt/media/") && name.endsWith(".png"),
    ).length,
    2,
  );
  assert.match(strFromU8(archive["ppt/slides/slide1.xml"]), /<p:pic>/);
});

test("RTF escapes control characters and Unicode, including surrogate pairs", async () => {
  const file = await exportOfficeDocument(await fixture(), [0], "rtf");
  const text = new TextDecoder().decode(file.bytes);
  assert.match(text, /^\{\\rtf1/);
  assert.ok(text.includes("caf\\u233? \\{value\\}"));
  assert.equal(rtfText("\\{\t🚀\n"), "\\\\\\{\\tab \\u-10179?\\u-8576?\\par\n");
});

test("empty text and invalid page ranges reject rather than producing misleading files", async () => {
  const pdf = await PDFDocument.create();
  pdf.addPage();
  const blank = await readDocument(await pdf.save(), "blank.pdf");
  for (const format of ["docx", "xlsx", "rtf"] as const)
    await assert.rejects(
      exportOfficeDocument(blank, [0], format),
      /NO_EXTRACTABLE_TEXT/,
    );
  await assert.rejects(
    exportOfficeDocument(blank, [], "pptx"),
    /INVALID_PAGE_RANGE/,
  );
  await assert.rejects(
    exportOfficeDocument(blank, [1], "pptx"),
    /INVALID_PAGE_RANGE/,
  );
});
