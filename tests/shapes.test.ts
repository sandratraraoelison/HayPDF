import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, degrees } from "pdf-lib";
import * as mupdf from "mupdf";
import { shapeOptions, normalizeStroke } from "../src/domain/shapes";
import { readDocument, exportDocument } from "../src/infrastructure/pdfEngine";

for (const rotation of [0, 90, 180, 270]) {
  test(`all shapes export at their editor coordinates on rotated pages (${rotation})`, async () => {
    for (const shape of shapeOptions) {
      const pdf = await PDFDocument.create();
      pdf.addPage([400, 500]).setRotation(degrees(rotation));
      const doc = await readDocument(await pdf.save(), "shapes.pdf");
      const original = doc.sources[0].slice();
      doc.pages[0].marks.push({
        id: shape.id,
        kind: "rectangle",
        shape: shape.id,
        points:
          shape.id === "freehand"
            ? [
                { x: 0.02, y: 0.2 },
                { x: 0.3, y: 0.9 },
                { x: 0.65, y: 0.15 },
                { x: 0.98, y: 0.8 },
              ]
            : undefined,
        x: 40,
        y: 60,
        width: 120,
        height: 80,
        text: "",
        size: 18,
        color: "#ff0000",
        font: "Helvetica",
      });
      const bytes = await exportDocument(doc);
      assert.deepEqual(doc.sources[0], original);
      const rendered = mupdf.Document.openDocument(bytes, "application/pdf");
      const page = rendered.loadPage(0);
      const pixmap = page.toPixmap(
        mupdf.Matrix.identity,
        mupdf.ColorSpace.DeviceRGB,
        false,
      );
      try {
        const pixels = pixmap.getPixels(),
          stride = pixmap.getStride(),
          components = pixmap.getNumberOfComponents();
        const points: number[][] = [];
        for (let y = 0; y < pixmap.getHeight(); y++)
          for (let x = 0; x < pixmap.getWidth(); x++) {
            const i = y * stride + x * components;
            if (pixels[i] > 200 && pixels[i + 1] < 100 && pixels[i + 2] < 100)
              points.push([x, y]);
          }
        assert.ok(points.length > 50, `${shape.id} must be visible`);
        assert.ok(
          points.every(([x, y]) => x >= 39 && x <= 161 && y >= 59 && y <= 141),
          `${shape.id} must stay in its editor bounds`,
        );
        const xs = points.map(([x]) => x);
        assert.ok(
          Math.max(...xs) - Math.min(...xs) > 90,
          `${shape.id} must use the requested width`,
        );
      } finally {
        pixmap.destroy();
        page.destroy();
        rendered.destroy();
      }
    }
  });
}

test("freehand normalization retains the original trajectory and rejects empty clicks", () => {
  const original = [
    { x: 40, y: 60 },
    { x: 80, y: 90 },
    { x: 120, y: 65 },
  ];
  const stroke = normalizeStroke(original)!;
  assert.ok(stroke);
  for (let i = 0; i < original.length; i++) {
    assert.equal(stroke.x + stroke.points[i].x * stroke.width, original[i].x);
    assert.equal(stroke.y + stroke.points[i].y * stroke.height, original[i].y);
  }
  assert.equal(normalizeStroke([]), undefined);
  assert.equal(normalizeStroke([{ x: 1, y: 1 }]), undefined);
  assert.equal(
    normalizeStroke([
      { x: 1, y: 1 },
      { x: 1, y: 1 },
    ]),
    undefined,
  );
});
