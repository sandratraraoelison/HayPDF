import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { captureVersion } from "../src/domain/documentVersions";
import {
  emptyHistory,
  reduceDocumentHistory,
} from "../src/domain/documentHistory";
import { readDocument, exportDocument } from "../src/infrastructure/pdfEngine";
import { comparePdfPages } from "../src/infrastructure/pdfComparison";

test("named versions retain earlier PDF content and can be restored with undo and redo", async () => {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  pdf
    .addPage([400, 300])
    .drawText("Original document", { x: 30, y: 250, font, size: 16 });
  const original = await readDocument(await pdf.save(), "versions.pdf");
  const originalBytes = original.sources[0].slice();
  const saved = captureVersion(original, "  Before edits  ");
  const edited = {
    ...original,
    pages: original.pages.map((page) => ({ ...page, rotation: 90 })),
  };
  const comparison = comparePdfPages(
    await exportDocument(saved.document),
    await exportDocument(edited),
    0,
  );
  assert.ok(comparison.changedPixels > 0);
  assert.equal(saved.name, "Before edits");
  assert.equal(saved.document.pages[0].rotation, 0);
  assert.deepEqual(original.sources[0], originalBytes);
  let history = reduceDocumentHistory(emptyHistory, {
    type: "open",
    document: original,
  });
  history = reduceDocumentHistory(history, {
    type: "commit",
    document: edited,
  });
  history = reduceDocumentHistory(history, {
    type: "commit",
    document: saved.document,
  });
  assert.equal(history.snapshots[history.cursor], original);
  history = reduceDocumentHistory(history, { type: "undo" });
  assert.equal(history.snapshots[history.cursor], edited);
  history = reduceDocumentHistory(history, { type: "redo" });
  assert.equal(history.snapshots[history.cursor], original);
});
