import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, degrees } from "pdf-lib";
import * as mupdf from "mupdf";
import { readDocument, exportDocument } from "../src/infrastructure/pdfEngine";
import {
  extractNativeImages,
  removeNativeImage,
} from "../src/infrastructure/nativeImages";

async function fixture(rotation: number, overlap = false) {
  const pdf = await PDFDocument.create();
  const image = await pdf.embedPng(
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1kAAAAASUVORK5CYII=",
      "base64",
    ),
  );
  const page = pdf.addPage([400, 500]);
  page.setRotation(degrees(rotation));
  page.drawImage(image, { x: 50, y: 100, width: 100, height: 80 });
  page.drawImage(image, {
    x: overlap ? 75 : 240,
    y: 100,
    width: 100,
    height: 80,
  });
  page.drawText("Text over image", { x: 55, y: 130, size: 10 });
  const second = pdf.addPage([400, 500]);
  second.drawImage(image, { x: 50, y: 100, width: 100, height: 80 });
  return pdf.save();
}

for (const rotation of [0, 90, 180, 270]) {
  test(`embedded image removal preserves other uses, text and source at rotation ${rotation}`, async () => {
    const doc = await readDocument(await fixture(rotation), "images.pdf");
    const original = doc.sources[0].slice();
    const images = await extractNativeImages(original, 0, rotation);
    assert.equal(images.length, 2);
    const next = await removeNativeImage(doc, 0, images[0]);
    const bytes = await exportDocument(next);
    const remaining = await extractNativeImages(bytes, 0, rotation);
    assert.equal(remaining.length, 1);
    assert.equal(Math.round(remaining[0].x), Math.round(images[1].x));
    assert.equal(Math.round(remaining[0].y), Math.round(images[1].y));
    assert.equal((await extractNativeImages(bytes, 1, 0)).length, 1);
    assert.deepEqual(doc.sources[0], original);
    assert.equal(
      (await extractNativeImages(await exportDocument(doc), 0, rotation))
        .length,
      2,
    );
    const pdf = mupdf.Document.openDocument(bytes, "application/pdf");
    const page = pdf.loadPage(0);
    const text = page.toStructuredText();
    try {
      assert.match(text.asText(), /Text over image/);
    } finally {
      text.destroy();
      page.destroy();
      pdf.destroy();
    }
  });
}

test("overlapping images are rejected without modifying the source", async () => {
  const doc = await readDocument(await fixture(0, true), "overlap.pdf");
  const images = await extractNativeImages(doc.sources[0], 0, 0);
  await assert.rejects(removeNativeImage(doc, 0, images[0]), /IMAGE_OVERLAP/);
  assert.equal((await extractNativeImages(doc.sources[0], 0, 0)).length, 2);
});
