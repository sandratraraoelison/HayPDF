import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, rgb, degrees } from "pdf-lib";
import * as mupdf from "mupdf";
import { detectTable, replaceTable } from "../src/infrastructure/pdfTables";
import { readDocument, exportDocument } from "../src/infrastructure/pdfEngine";
import { changeTableColumn, changeTableRow } from "../src/domain/table";

async function fixture() {
  const pdf = await PDFDocument.create(),
    page = pdf.addPage([400, 400]);
  for (let c = 0; c <= 3; c++)
    page.drawLine({
      start: { x: 40 + c * 100, y: 120 },
      end: { x: 40 + c * 100, y: 280 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
  for (let r = 0; r <= 4; r++)
    page.drawLine({
      start: { x: 40, y: 120 + r * 40 },
      end: { x: 340, y: 120 + r * 40 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 3; c++)
      page.drawText(r === 2 && c === 0 ? "REMOVE_ME" : `R${r}C${c}`, {
        x: 45 + c * 100,
        y: 255 - r * 40,
        size: 10,
      });
  page.drawText("Outside stays", { x: 40, y: 330, size: 12 });
  return readDocument(await pdf.save(), "tables.pdf");
}
function text(bytes: Uint8Array) {
  const pdf = mupdf.Document.openDocument(bytes, "application/pdf"),
    page = pdf.loadPage(0),
    text = page.toStructuredText();
  try {
    return text.asText();
  } finally {
    text.destroy();
    page.destroy();
    pdf.destroy();
  }
}
test("tables with borders painted as thin filled rectangles are detected", async () => {
  const pdf = await PDFDocument.create(),
    page = pdf.addPage([400, 400]);
  for (let c = 0; c <= 3; c++)
    page.drawRectangle({
      x: 40 + c * 100 - 0.5,
      y: 120,
      width: 1,
      height: 160,
      color: rgb(0, 0, 0),
    });
  for (let r = 0; r <= 4; r++)
    page.drawRectangle({
      x: 40,
      y: 120 + r * 40 - 0.5,
      width: 300,
      height: 1,
      color: rgb(0, 0, 0),
    });
  page.drawText("FILLED_GRID", { x: 45, y: 255, size: 10 });
  const doc = await readDocument(await pdf.save(), "filled-grid.pdf");
  const draft = await detectTable(doc, 0, {
    x: 37,
    y: 117,
    width: 306,
    height: 166,
  });
  assert.equal(draft.cells.length, 4);
  assert.equal(draft.widths.length, 3);
  assert.equal(draft.cells[0][0], "FILLED_GRID");
  draft.cells[0][0] = "REPLACED";
  const next = await replaceTable(doc, 0, draft);
  assert.match(text(next.sources[0]), /REPLACED/);
  assert.ok(!text(next.sources[0]).includes("FILLED_GRID"));
});
test("table rebuilding respects a rotated page and preserves surrounding text", async () => {
  const original = await fixture(),
    pdf = await PDFDocument.load(original.sources[0]);
  pdf.getPage(0).setRotation(degrees(90));
  const doc = await readDocument(await pdf.save(), "rotated-table.pdf");
  const draft = await detectTable(doc, 0, {
    x: 117,
    y: 37,
    width: 166,
    height: 306,
  });
  assert.equal(draft.cells.length, 3);
  assert.equal(draft.widths.length, 4);
  draft.cells[0][0] = "ROTATED";
  const next = await replaceTable(doc, 0, draft);
  assert.match(text(await exportDocument(next)), /ROTAT\s*ED/);
  assert.match(text(await exportDocument(next)), /Outside stays/);
  assert.equal(next.pages[0].rotation, 90);
});
test("table detection retains every cell; deleting and adding rows and columns preserves outside content and source", async () => {
  const doc = await fixture(),
    snapshot = doc.sources[0].slice();
  let draft = await detectTable(doc, 0, {
    x: 37,
    y: 117,
    width: 306,
    height: 166,
  });
  assert.equal(draft.cells.length, 4);
  assert.equal(draft.widths.length, 3);
  assert.equal(draft.cells[2][0], "REMOVE_ME");
  draft = changeTableRow(draft, 2, false);
  draft = changeTableRow(draft, 3, true);
  draft.cells[3][0] = "NEW_ROW";
  draft = changeTableColumn(draft, 2, false);
  draft = changeTableColumn(draft, 2, true);
  draft.cells[1][2] = "NEW_COL";
  const next = await replaceTable(doc, 0, draft),
    bytes = await exportDocument(next),
    result = text(bytes);
  assert.ok(!result.includes("REMOVE_ME"));
  assert.ok(!result.includes("R1C2"));
  assert.match(result, /NEW_ROW/);
  assert.match(result, /NEW_COL/);
  assert.match(result, /Outside stays/);
  assert.deepEqual(doc.sources[0], snapshot);
  assert.match(text(await exportDocument(doc)), /REMOVE_ME/);
  const detected = await detectTable(next, 0, {
    x: 37,
    y: 117,
    width: 306,
    height: 166,
  });
  assert.equal(detected.cells.length, 4);
  assert.equal(detected.widths.length, 3);
  let single = detected;
  while (single.widths.length > 1) single = changeTableColumn(single, 1, false);
  while (single.cells.length > 1) single = changeTableRow(single, 1, false);
  const one = await replaceTable(next, 0, single);
  const oneDetected = await detectTable(one, 0, {
    x: 37,
    y: 117,
    width: 306,
    height: 166,
  });
  assert.equal(oneDetected.cells.length, 1);
  assert.equal(oneDetected.widths.length, 1);
});
test("partial grids and overflowing content are rejected without changing the source", async () => {
  const doc = await fixture();
  await assert.rejects(
    detectTable(doc, 0, { x: 60, y: 130, width: 120, height: 80 }),
  );
  const draft = await detectTable(doc, 0, {
    x: 37,
    y: 117,
    width: 306,
    height: 166,
  });
  draft.cells[0][0] = "X".repeat(1000);
  await assert.rejects(replaceTable(doc, 0, draft), /dépasse/);
  assert.match(text(doc.sources[0]), /REMOVE_ME/);
});
