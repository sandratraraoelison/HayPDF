import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, degrees } from "pdf-lib";
import * as mupdf from "mupdf";
import { mkdir, writeFile } from "node:fs/promises";
import { resizeImage, type ResizeHandle } from "../src/domain/imageLayout";
import { readDocument, exportDocument } from "../src/infrastructure/pdfEngine";
test("corner and edge resizing preserves aspect ratio and keeps the image on the page", () => {
  for (const handle of [
    "nw",
    "n",
    "ne",
    "e",
    "se",
    "s",
    "sw",
    "w",
  ] as ResizeHandle[]) {
    const result = resizeImage(
      { x: 40, y: 40, width: 120, height: 60 },
      handle,
      400,
      -300,
      true,
      { width: 300, height: 300 },
    );
    assert.ok(Math.abs(result.width / result.height - 2) < 0.001);
    assert.ok(result.x >= 0 && result.y >= 0);
    assert.ok(
      result.x + result.width <= 300.001 && result.y + result.height <= 300.001,
    );
  }
  const free = resizeImage(
    { x: 40, y: 40, width: 120, height: 60 },
    "se",
    30,
    50,
    false,
    { width: 300, height: 300 },
  );
  assert.deepEqual(free, { x: 40, y: 40, width: 150, height: 110 });
});
function sourceImage() {
  const pix = new mupdf.Pixmap(
      mupdf.ColorSpace.DeviceRGB,
      [0, 0, 100, 50],
      false,
    ),
    pixels = pix.getPixels();
  for (let y = 0; y < 50; y++)
    for (let x = 0; x < 100; x++) {
      const offset = (y * 100 + x) * 3;
      pixels[offset] = x < 25 ? 255 : 0;
      pixels[offset + 1] = x >= 25 && x < 75 ? 255 : 0;
      pixels[offset + 2] = x >= 75 ? 255 : 0;
    }
  try {
    return (
      "data:image/png;base64," + Buffer.from(pix.asPNG()).toString("base64")
    );
  } finally {
    pix.destroy();
  }
}
for (const rotation of [0, 90, 180, 270])
  for (const fit of ["contain", "cover", "fill"] as const)
    test(`image ${fit} export matches its frame at ${rotation} degrees`, async () => {
      const pdf = await PDFDocument.create();
      pdf.addPage([250, 250]).setRotation(degrees(rotation));
      const doc = await readDocument(await pdf.save(), "image.pdf");
      doc.pages[0].marks.push({
        id: "image",
        kind: "image",
        x: 30,
        y: 30,
        width: 100,
        height: 100,
        text: "",
        size: 18,
        color: "#000000",
        font: "Helvetica",
        data: sourceImage(),
        imageFit: fit,
      });
      const bytes = await exportDocument(doc),
        out = mupdf.Document.openDocument(bytes, "application/pdf"),
        page = out.loadPage(0),
        pix = page.toPixmap(
          mupdf.Matrix.identity,
          mupdf.ColorSpace.DeviceRGB,
          false,
        );
      const pixels = pix.getPixels();
      const color = (x: number, y: number) =>
        Array.from(pixels.slice((y * 250 + x) * 3, (y * 250 + x) * 3 + 3));
      try {
        assert.deepEqual(color(25, 80), [255, 255, 255]);
        assert.deepEqual(color(135, 80), [255, 255, 255]);
        assert.deepEqual(color(80, 80), [0, 255, 0]);
        assert.deepEqual(
          color(35, 35),
          fit === "contain"
            ? [255, 255, 255]
            : fit === "cover"
              ? [0, 255, 0]
              : [255, 0, 0],
        );
        assert.deepEqual(
          color(125, 80),
          fit === "cover" ? [0, 255, 0] : [0, 0, 255],
        );
        if (rotation === 0) {
          await mkdir("tmp/image-layout", { recursive: true });
          await writeFile(`tmp/image-layout/${fit}.png`, pix.asPNG());
        }
      } finally {
        pix.destroy();
        page.destroy();
        out.destroy();
      }
    });
