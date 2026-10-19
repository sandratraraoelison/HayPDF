import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import * as mupdf from "mupdf";
import { extractNativeText } from "../src/infrastructure/nativeTextExtraction";
import { replaceWithOriginalFont } from "../src/infrastructure/nativeFontReplacement";
import { NativeFontError } from "../src/domain/NativeFontError";
import { describeOperationError } from "../src/application/operationError";
const noto = () =>
  readFile(
    new URL("../src/assets/fonts/NotoSerif-Regular.ttf", import.meta.url),
  );
async function subsetFixture() {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(await noto(), { subset: true });
  const page = doc.addPage([500, 160]);
  page.drawText("Malagasy | French | English", {
    x: 45,
    y: 90,
    size: 12,
    font,
  });
  page.drawText("English", { x: 45, y: 65, size: 12, font });
  return doc.save();
}
function png(bytes: Uint8Array) {
  const doc = mupdf.Document.openDocument(bytes, "application/pdf"),
    p = doc.loadPage(0),
    pix = p.toPixmap(
      mupdf.Matrix.scale(2, 2),
      mupdf.ColorSpace.DeviceRGB,
      false,
    );
  try {
    return pix.asPNG();
  } finally {
    pix.destroy();
    p.destroy();
    doc.destroy();
  }
}
test("subset Noto Serif can replace English with Espagnol using local complete glyphs", async () => {
  const bytes = await subsetFixture(),
    original = await extractNativeText(bytes, 0, 0),
    block = original[0];
  const result = await replaceWithOriginalFont(
    bytes,
    0,
    block,
    "Malagasy | French | Espagnol",
    { size: block.size, color: block.color! },
  );
  const doc = mupdf.Document.openDocument(result, "application/pdf"),
    page = doc.loadPage(0),
    text = page.toStructuredText({});
  try {
    assert.ok(
      text.asText().includes("Malagasy | French | Espagnol"),
      text.asText(),
    );
  } finally {
    text.destroy();
    page.destroy();
    doc.destroy();
  }
  assert.deepEqual(
    (await extractNativeText(result, 0, 0)).find((b) => b.text === "English"),
    original.find((b) => b.text === "English"),
  );
  await mkdir("tmp/font-fallback", { recursive: true });
  await writeFile("tmp/font-fallback/before.png", png(bytes));
  await writeFile("tmp/font-fallback/after.png", png(result));
});
test("a loaded font can supply missing characters without a network font lookup", async () => {
  const bytes = await subsetFixture(),
    block = (await extractNativeText(bytes, 0, 0))[0];
  const result = await replaceWithOriginalFont(
    bytes,
    0,
    block,
    "Malagasy | French | Espagnol",
    { size: block.size, color: block.color! },
    { fontData: new Uint8Array(await noto()) },
  );
  assert.ok(
    (await extractNativeText(result, 0, 0)).some((b) => b.text.includes("p")),
  );
});
test("full diagnostic lists the source font, missing Unicode character and original cause", async () => {
  const bytes = await subsetFixture(),
    block = (await extractNativeText(bytes, 0, 0))[0];
  let caught: unknown;
  try {
    await replaceWithOriginalFont(bytes, 0, block, "Malagasy 🚀", {
      size: block.size,
      color: block.color!,
    });
  } catch (error) {
    caught = error;
  }
  assert.ok(caught instanceof NativeFontError);
  assert.equal(caught.code, "NATIVE_FONT_MISSING_GLYPH");
  assert.ok(caught.fontName.includes("NotoSerif"));
  const described = describeOperationError(caught, (text) => text);
  assert.ok(described.details.includes("U+1F680"));
  assert.ok(described.details.includes("NotoSerif"));
  assert.ok(described.fontRelated);
  const nested = describeOperationError(
    new NativeFontError(
      "NATIVE_FONT_UNAVAILABLE",
      "Example",
      [],
      new Error("Original font decoder failure"),
    ),
    (text) => text,
  );
  assert.ok(nested.details.includes("Original font decoder failure"));
  assert.ok(
    (await extractNativeText(bytes, 0, 0)).some((b) =>
      b.text.includes("English"),
    ),
  );
});
