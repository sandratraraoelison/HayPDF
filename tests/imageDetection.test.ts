import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PDFDocument,
  degrees,
  rgb,
  pushGraphicsState,
  popGraphicsState,
  rectangle,
  clip,
  endPath,
} from "pdf-lib";
import {
  extractNativeImages,
  removeNativeImage,
} from "../src/infrastructure/nativeImages";
import { readDocument } from "../src/infrastructure/pdfEngine";
import { makeImageEditable } from "../src/infrastructure/editableImage";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1kAAAAASUVORK5CYII=",
  "base64",
);
async function clipped() {
  const pdf = await PDFDocument.create(),
    page = pdf.addPage([200, 200]),
    image = await pdf.embedPng(png);
  page.pushOperators(
    pushGraphicsState(),
    rectangle(50, 60, 40, 30),
    clip(),
    endPath(),
  );
  page.drawImage(image, { x: 30, y: 30, width: 100, height: 100 });
  page.pushOperators(popGraphicsState());
  page.drawImage(image, { x: 140, y: 30, width: 30, height: 30, opacity: 0 });
  page.drawImage(image, { x: 300, y: 300, width: 30, height: 30 });
  return pdf;
}
test("image bounds follow the visible clip and invisible occurrences are excluded", async () => {
  const pdf = await clipped(),
    images = await extractNativeImages(await pdf.save(), 0, 0);
  assert.equal(images.length, 1);
  assert.equal(images[0].kind, "raster");
  assert.ok(Math.abs(images[0].x - 50) < 0.1);
  assert.ok(Math.abs(images[0].y - 110) < 0.1);
  assert.ok(Math.abs(images[0].width - 40) < 0.1);
  assert.ok(Math.abs(images[0].height - 30) < 0.1);
  assert.equal(images[0].pixelWidth, 1);
  assert.equal(images[0].pixelHeight, 1);
});
test("nested form objects and cropped pages retain the correct image coordinates", async () => {
  const source = await clipped(),
    donor = await PDFDocument.load(await source.save()),
    pdf = await PDFDocument.create(),
    page = pdf.addPage([400, 400]),
    embedded = await pdf.embedPage(donor.getPage(0));
  page.drawPage(embedded, { x: 40, y: 70, width: 200, height: 200 });
  const images = await extractNativeImages(await pdf.save(), 0, 0);
  assert.equal(images.length, 1);
  assert.ok(Math.abs(images[0].x - 90) < 0.1);
  assert.ok(Math.abs(images[0].y - 240) < 0.1);
  source.getPage(0).setCropBox(20, 30, 160, 150);
  const cropped = await extractNativeImages(await source.save(), 0, 0);
  assert.equal(cropped.length, 1);
  assert.ok(Math.abs(cropped[0].x - 30) < 0.1);
  assert.ok(Math.abs(cropped[0].y - 90) < 0.1);
});
test("rotated image footprints retain their actual polygon", async () => {
  const pdf = await PDFDocument.create(),
    page = pdf.addPage([200, 200]),
    image = await pdf.embedPng(png);
  page.drawImage(image, {
    x: 130,
    y: 70,
    width: 60,
    height: 30,
    rotate: degrees(45),
  });
  const images = await extractNativeImages(await pdf.save(), 0, 0),
    found = images[0];
  assert.equal(images.length, 1);
  assert.ok(Math.abs(found.width - 90 / Math.sqrt(2)) < 0.1);
  assert.ok(Math.abs(found.height - 90 / Math.sqrt(2)) < 0.1);
  assert.equal(found.polygon?.length, 4);
  assert.ok(
    found.polygon!.some(
      (p) => p.x > found.x + 1 && p.x < found.x + found.width - 1,
    ),
  );
});
test("inline images are detected without relying on text extraction", async () => {
  const pdf = await PDFDocument.create(),
    page = pdf.addPage([200, 200]);
  page.node.addContentStream(
    pdf.context.register(
      pdf.context.flateStream(
        "q\n40 0 0 30 50 60 cm\nBI /W 1 /H 1 /CS /RGB /BPC 8 /F /AHx ID\nff0000>\nEI\nQ",
      ),
    ),
  );
  const images = await extractNativeImages(await pdf.save(), 0, 0);
  assert.equal(images.length, 1);
  assert.ok(Math.abs(images[0].x - 50) < 0.1);
  assert.ok(Math.abs(images[0].height - 30) < 0.1);
});
test("overlapping colored illustration shapes are suggested as a vector area, separate from raster images", async () => {
  const pdf = await PDFDocument.create(),
    page = pdf.addPage([250, 250]),
    image = await pdf.embedPng(png);
  page.drawRectangle({
    x: 0,
    y: 0,
    width: 250,
    height: 250,
    color: rgb(1, 1, 1),
  });
  page.drawRectangle({
    x: 40,
    y: 40,
    width: 120,
    height: 100,
    color: rgb(0.95, 0.96, 0.98),
  });
  page.drawRectangle({
    x: 50,
    y: 50,
    width: 50,
    height: 40,
    color: rgb(0.1, 0.5, 0.6),
  });
  page.drawCircle({ x: 120, y: 110, size: 15, color: rgb(1, 0.8, 0.3) });
  page.drawRectangle({
    x: 180,
    y: 180,
    width: 40,
    height: 30,
    color: rgb(0.1, 0.2, 0.6),
  });
  page.drawImage(image, { x: 175, y: 40, width: 40, height: 40 });
  const bytes = await pdf.save(),
    images = await extractNativeImages(bytes, 0, 0);
  assert.equal(images.filter((i) => i.kind === "raster").length, 1);
  assert.equal(images.filter((i) => i.kind === "vector").length, 1);
  const vector = images.find((i) => i.kind === "vector")!;
  assert.ok(Math.abs(vector.x - 40) < 0.1);
  assert.ok(Math.abs(vector.y - 110) < 0.1);
  assert.ok(Math.abs(vector.width - 120) < 0.1);
  await assert.rejects(
    removeNativeImage(await readDocument(bytes, "vector.pdf"), 0, vector),
    /aplatissement/,
  );
});
test("individual deletion remains conservative when clipped occurrences share a larger painted footprint", async () => {
  const pdf = await PDFDocument.create(),
    page = pdf.addPage([200, 200]),
    image = await pdf.embedPng(png);
  for (const x of [10, 120]) {
    page.pushOperators(
      pushGraphicsState(),
      rectangle(x, 20, 50, 50),
      clip(),
      endPath(),
    );
    page.drawImage(image, { x: 0, y: 0, width: 200, height: 200 });
    page.pushOperators(popGraphicsState());
  }
  const doc = await readDocument(await pdf.save(), "shared-clips.pdf"),
    images = await extractNativeImages(doc.sources[0], 0, 0);
  assert.equal(images.length, 2);
  assert.ok(images[0].x + images[0].width < images[1].x);
  await assert.rejects(removeNativeImage(doc, 0, images[0]), /IMAGE_OVERLAP/);
});
test("detected image metadata cannot override the editable image kind", async () => {
  const pdf = await clipped(),
    doc = await readDocument(await pdf.save(), "metadata.pdf");
  const detected = await extractNativeImages(doc.sources[0], 0, 0);
  const result = await makeImageEditable(doc, 0, detected[0]);
  assert.equal(result.doc.pages[0].marks[0].kind, "image");
});
