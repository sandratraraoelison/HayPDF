import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import * as mupdf from "mupdf";
import { extractNativeText } from "../src/infrastructure/nativeTextExtraction";
import { readDocument, exportDocument } from "../src/infrastructure/pdfEngine";
import { replaceNativeText } from "../src/application/replaceNativeText";
async function fixture() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 220]);
  const regular = await doc.embedFont(StandardFonts.TimesRoman),
    bold = await doc.embedFont(StandardFonts.TimesRomanBold);
  page.drawText("Tools / methods:", { x: 45, y: 170, size: 13, font: bold });
  page.drawText(" Git, web environments, analysis and problem", {
    x: 138,
    y: 170,
    size: 13,
    font: regular,
  });
  page.drawText("solving", { x: 45, y: 153, size: 13, font: regular });
  page.drawText("Cross-functional:", { x: 45, y: 136, size: 13, font: bold });
  page.drawText(" Technical support, functional understanding, IT", {
    x: 142,
    y: 136,
    size: 13,
    font: regular,
  });
  page.drawText("consulting", { x: 45, y: 119, size: 13, font: regular });
  page.drawLine({
    start: { x: 45, y: 100 },
    end: { x: 510, y: 100 },
    color: rgb(0.8, 0.4, 0.2),
    thickness: 1,
  });
  return doc.save();
}
function render(bytes: Uint8Array) {
  const doc = mupdf.Document.openDocument(bytes, "application/pdf"),
    page = doc.loadPage(0),
    pixmap = page.toPixmap(
      mupdf.Matrix.scale(2, 2),
      mupdf.ColorSpace.DeviceRGB,
      false,
    );
  try {
    return pixmap.asPNG();
  } finally {
    pixmap.destroy();
    page.destroy();
    doc.destroy();
  }
}
test("mixed bold and regular runs retain their baselines and never wrap into the next line", async () => {
  const before = await fixture(),
    runs = await extractNativeText(before, 0, 0);
  const label = runs.find((run) => run.text === "Cross-functional:")!;
  const body = runs.find((run) => run.text.includes("Technical support"))!;
  assert.ok(label.bold);
  assert.equal(label.font, "TimesRoman");
  assert.equal(body.bold, false);
  const doc = await readDocument(before, "layout.pdf");
  const afterLabel = await replaceNativeText(doc, 0, label, "Collaboration:", {
    font: label.font!,
    size: label.size,
    color: label.color!,
  });
  const selected = (await extractNativeText(afterLabel.sources[0], 0, 0)).find(
    (run) => run.text.includes("Technical support"),
  )!;
  const result = await replaceNativeText(
    afterLabel,
    0,
    selected,
    " Technical advice, functional understanding, IT",
    { font: selected.font!, size: selected.size, color: selected.color! },
  );
  const bytes = await exportDocument(result),
    updated = await extractNativeText(bytes, 0, 0);
  const modifiedLabel = updated.find((run) => run.text === "Collaboration:")!;
  assert.ok(modifiedLabel.bold);
  assert.equal(modifiedLabel.font, "TimesRoman");
  assert.ok(
    Math.abs(
      modifiedLabel.y +
        modifiedLabel.baselineOffset! -
        label.y -
        label.baselineOffset!,
    ) < 0.02,
  );
  const modifiedBody = updated.find((run) =>
    run.text.includes("Technical advice"),
  )!;
  assert.ok(modifiedBody);
  assert.ok(
    Math.abs(
      modifiedBody.y +
        modifiedBody.baselineOffset! -
        body.y -
        body.baselineOffset!,
    ) < 0.02,
  );
  assert.ok(
    modifiedBody.x + modifiedBody.width <= body.x + body.width + 0.1,
    JSON.stringify({ body, selected, modifiedBody }),
  );
  const originalNext = runs.find((run) => run.text === "consulting")!,
    next = updated.find((run) => run.text === "consulting")!;
  assert.deepEqual(next, originalNext);
  await mkdir("tmp/native-layout", { recursive: true });
  await writeFile("tmp/native-layout/before.png", render(before));
  await writeFile("tmp/native-layout/after.png", render(bytes));
});
test("applying unchanged native text leaves the original bytes and typography intact", async () => {
  const bytes = await fixture(),
    doc = await readDocument(bytes, "same.pdf"),
    block = (await extractNativeText(bytes, 0, 0))[0];
  const result = await replaceNativeText(doc, 0, block, block.text, {
    font: block.font!,
    size: block.size,
    color: block.color!,
  });
  assert.equal(result, doc);
  assert.deepEqual(result.sources[0], bytes);
});
test("native multiline replacements are rejected before changing the document", async () => {
  const bytes = await fixture(),
    doc = await readDocument(bytes, "same.pdf"),
    block = (await extractNativeText(bytes, 0, 0))[0];
  await assert.rejects(
    replaceNativeText(doc, 0, block, "one\ntwo", {
      font: "TimesRoman",
      size: 13,
      color: "#000000",
    }),
    /NATIVE_TEXT_SINGLE_LINE/,
  );
  assert.deepEqual(doc.sources[0], bytes);
});
