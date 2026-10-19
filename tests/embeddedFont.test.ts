import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import {
  PDFDocument,
  rgb,
  pushGraphicsState,
  popGraphicsState,
  concatTransformationMatrix,
} from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import * as mupdf from "mupdf";
import { extractNativeText } from "../src/infrastructure/nativeTextExtraction";
import { replaceWithOriginalFont } from "../src/infrastructure/nativeFontReplacement";
const fontPath = [
  "C:/Windows/Fonts/times.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
].find(existsSync);
async function fixture() {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(await readFile(fontPath!));
  const page = doc.addPage([595, 180]);
  page.pushOperators(
    pushGraphicsState(),
    concatTransformationMatrix(0.9, 0, 0, 1, 0, 0),
  );
  page.drawText("Technical support, functional understanding, IT", {
    x: 50,
    y: 100,
    size: 14,
    font,
    color: rgb(0, 0, 0),
  });
  page.pushOperators(popGraphicsState());
  page.drawText("consulting", { x: 45, y: 80, size: 14, font });
  return doc.save();
}
function pixels(bytes: Uint8Array) {
  const doc = mupdf.Document.openDocument(bytes, "application/pdf"),
    page = doc.loadPage(0),
    pix = page.toPixmap(
      mupdf.Matrix.scale(2, 2),
      mupdf.ColorSpace.DeviceRGB,
      false,
    );
  try {
    return { pixels: pix.getPixels().slice(), png: pix.asPNG() };
  } finally {
    pix.destroy();
    page.destroy();
    doc.destroy();
  }
}
test(
  "re-emitting an embedded font preserves its glyphs, horizontal transform and raster appearance",
  { skip: !fontPath },
  async () => {
    const bytes = await fixture(),
      block = (await extractNativeText(bytes, 0, 0))[0];
    assert.ok(block.fontName);
    assert.notEqual(block.fontName, "Times-Roman");
    // Bypass the no-op optimization: this exercises actual removal and font re-embedding.
    const result = await replaceWithOriginalFont(bytes, 0, block, block.text, {
      size: block.size,
      color: block.color!,
    });
    const before = pixels(bytes),
      after = pixels(result);
    await mkdir("tmp/embedded-font", { recursive: true });
    await writeFile("tmp/embedded-font/before.png", before.png);
    await writeFile("tmp/embedded-font/after.png", after.png);
    assert.deepEqual(after.pixels, before.pixels);
    const extracted = (await extractNativeText(result, 0, 0)).find(
      (b) => b.text === block.text,
    )!;
    assert.ok(extracted);
    assert.equal(
      extracted.fontName?.replace(/-\d+$/, ""),
      block.fontName?.replace(/-\d+$/, ""),
    );
  },
);
test(
  "an edit uses the embedded font without squeezing the replacement",
  { skip: !fontPath },
  async () => {
    const bytes = await fixture(),
      block = (await extractNativeText(bytes, 0, 0))[0];
    const result = await replaceWithOriginalFont(
      bytes,
      0,
      block,
      "Technical advice, functional understanding, IT",
      { size: block.size, color: block.color! },
    );
    const blocks = await extractNativeText(result, 0, 0),
      updated = blocks.find((b) => b.text.startsWith("Technical advice"))!;
    assert.ok(updated);
    assert.equal(
      updated.fontName?.replace(/-\d+$/, ""),
      block.fontName?.replace(/-\d+$/, ""),
    );
    assert.ok(Math.abs(updated.size - block.size) < 0.001);
    assert.deepEqual(
      blocks.find((b) => b.text === "consulting"),
      (await extractNativeText(bytes, 0, 0)).find(
        (b) => b.text === "consulting",
      ),
    );
  },
);
test(
  "overflow fails without silently compressing text or returning a modified document",
  { skip: !fontPath },
  async () => {
    const bytes = await fixture(),
      block = (await extractNativeText(bytes, 0, 0))[0];
    await assert.rejects(
      replaceWithOriginalFont(
        bytes,
        0,
        block,
        block.text + " extra words that do not fit".repeat(10),
        { size: block.size, color: block.color! },
      ),
      /NATIVE_TEXT_OVERFLOW/,
    );
  },
);
