import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, rgb, degrees } from "pdf-lib";
import * as mupdf from "mupdf";
import { makeImageEditable } from "../src/infrastructure/editableImage";
import { readDocument, exportDocument } from "../src/infrastructure/pdfEngine";

function inspect(bytes: Uint8Array) {
  const pdf = mupdf.Document.openDocument(bytes, "application/pdf"),
    page = pdf.loadPage(0),
    text = page.toStructuredText({});
  try {
    return text.asText();
  } finally {
    text.destroy();
    page.destroy();
    pdf.destroy();
  }
}
test("flattening rejects interactive fields and cut text without modifying the source", async () => {
  const pdf = await PDFDocument.create(),
    page = pdf.addPage([400, 400]);
  page.drawText("CUTTEXT", { x: 100, y: 200, size: 20 });
  const doc = await readDocument(await pdf.save(), "cut-text.pdf"),
    before = doc.sources[0].slice();
  await assert.rejects(
    makeImageEditable(doc, 0, { x: 105, y: 170, width: 100, height: 50 }),
    /coupe du texte/,
  );
  assert.deepEqual(doc.sources[0], before);
  pdf
    .getForm()
    .createTextField("interactive")
    .addToPage(page, { x: 150, y: 150, width: 80, height: 30 });
  const form = await readDocument(await pdf.save(), "form.pdf");
  await assert.rejects(
    makeImageEditable(form, 0, { x: 140, y: 210, width: 100, height: 50 }),
    /annotation ou un formulaire/,
  );
});
for (const rotation of [0, 90, 180, 270])
  test(`flattened illustration becomes editable and preserves outside content at ${rotation} degrees`, async () => {
    const pdf = await PDFDocument.create(),
      page = pdf.addPage([400, 400]);
    page.setRotation(degrees(rotation));
    page.drawRectangle({
      x: 170,
      y: 170,
      width: 60,
      height: 60,
      color: rgb(0.1, 0.5, 0.7),
    });
    page.drawText("Inside", { x: 175, y: 202, size: 10 });
    page.drawText("Outside", { x: 20, y: 370, size: 10 });
    const doc = await readDocument(await pdf.save(), "illustration.pdf"),
      snapshot = doc.sources[0].slice();
    const result = await makeImageEditable(doc, 0, {
      x: 100,
      y: 100,
      width: 200,
      height: 200,
    });
    assert.equal(result.doc.pages[0].marks[0].id, result.id);
    assert.equal(result.doc.pages[0].marks[0].kind, "image");
    assert.match(
      result.doc.pages[0].marks[0].data!,
      /^data:image\/png;base64,/,
    );
    const exported = await exportDocument(result.doc);
    assert.match(inspect(exported), /Outside/);
    assert.ok(!inspect(exported).includes("Inside"));
    assert.deepEqual(doc.sources[0], snapshot);
    assert.match(inspect(doc.sources[0]), /Inside/);
    const before = mupdf.Document.openDocument(snapshot, "application/pdf"),
      after = mupdf.Document.openDocument(exported, "application/pdf"),
      p1 = before.loadPage(0),
      p2 = after.loadPage(0),
      a = p1.toPixmap(mupdf.Matrix.identity, mupdf.ColorSpace.DeviceRGB, false),
      b = p2.toPixmap(mupdf.Matrix.identity, mupdf.ColorSpace.DeviceRGB, false);
    try {
      const pa = a.getPixels(),
        pb = b.getPixels(),
        offset = 220 * a.getStride() + 220 * 3;
      for (let c = 0; c < 3; c++)
        assert.ok(Math.abs(pa[offset + c] - pb[offset + c]) < 5);
    } finally {
      a.destroy();
      b.destroy();
      p1.destroy();
      p2.destroy();
      before.destroy();
      after.destroy();
    }
  });
const colors = [
  [255, 0, 0],
  [0, 255, 0],
  [0, 0, 255],
  [255, 255, 0],
];
function quadrantPng() {
  const pix = new mupdf.Pixmap(mupdf.ColorSpace.DeviceRGB, [0, 0, 2, 2], false);
  try {
    pix.getPixels().set(colors.flat());
    return `data:image/png;base64,${Buffer.from(pix.asPNG()).toString("base64")}`;
  } finally {
    pix.destroy();
  }
}
test("flattening another area preserves an already rotated, mirrored and translucent image", async () => {
  const pdf = await PDFDocument.create(),
    page = pdf.addPage([500, 500]);
  page.drawRectangle({
    x: 230,
    y: 150,
    width: 180,
    height: 120,
    color: rgb(0.1, 0.5, 0.6),
  });
  const doc = await readDocument(await pdf.save(), "outside-image.pdf");
  doc.pages[0].marks.push({
    id: "outside",
    kind: "image",
    x: 50,
    y: 120,
    width: 80,
    height: 100,
    text: "",
    size: 18,
    color: "#000000",
    font: "Helvetica",
    data: quadrantPng(),
    imageRotation: 90,
    imageFlipX: true,
    imageOpacity: 0.5,
  });
  const before = await exportDocument(doc),
    result = await makeImageEditable(doc, 0, {
      x: 225,
      y: 225,
      width: 190,
      height: 130,
    }),
    after = await exportDocument(result.doc);
  const sample = (bytes: Uint8Array) => {
    const pdf = mupdf.Document.openDocument(bytes, "application/pdf"),
      page = pdf.loadPage(0),
      pix = page.toPixmap(
        mupdf.Matrix.identity,
        mupdf.ColorSpace.DeviceRGB,
        false,
      );
    try {
      const offset = 140 * pix.getStride() + 70 * 3;
      return Array.from(pix.getPixels().subarray(offset, offset + 3));
    } finally {
      pix.destroy();
      page.destroy();
      pdf.destroy();
    }
  };
  assert.deepEqual(sample(after), sample(before));
  assert.notDeepEqual(sample(after), [255, 255, 255]);
});
for (const pageRotation of [0, 90, 180, 270])
  test(`image rotations and mirrors match rendered quadrants on a ${pageRotation} degree page`, async () => {
    const data = quadrantPng(),
      pdf = await PDFDocument.create();
    pdf.addPage([200, 200]).setRotation(degrees(pageRotation));
    const doc = await readDocument(await pdf.save(), "transforms.pdf");
    const expected = [
      [0, 1, 2, 3],
      [2, 0, 3, 1],
      [3, 2, 1, 0],
      [1, 3, 0, 2],
    ];
    for (const rotation of [0, 90, 180, 270] as const)
      for (const flipX of [false, true])
        for (const flipY of [false, true]) {
          let order = [...expected[rotation / 90]];
          if (flipX) order = [order[1], order[0], order[3], order[2]];
          if (flipY) order = [order[2], order[3], order[0], order[1]];
          const next = {
            ...doc,
            pages: doc.pages.map((p) => ({
              ...p,
              marks: [
                {
                  id: "image",
                  kind: "image" as const,
                  x: 50,
                  y: 50,
                  width: 80,
                  height: 80,
                  text: "",
                  size: 18,
                  color: "#000000",
                  font: "Helvetica" as const,
                  data,
                  naturalWidth: 2,
                  naturalHeight: 2,
                  imageRotation: rotation,
                  imageFlipX: flipX,
                  imageFlipY: flipY,
                },
              ],
            })),
          };
          const rendered = mupdf.Document.openDocument(
              await exportDocument(next),
              "application/pdf",
            ),
            page = rendered.loadPage(0),
            pix = page.toPixmap(
              mupdf.Matrix.identity,
              mupdf.ColorSpace.DeviceRGB,
              false,
            );
          try {
            const pixels = pix.getPixels();
            [
              [65, 65],
              [115, 65],
              [65, 115],
              [115, 115],
            ].forEach(([x, y], i) => {
              const offset = y * pix.getStride() + x * 3;
              for (let c = 0; c < 3; c++)
                assert.ok(
                  Math.abs(pixels[offset + c] - colors[order[i]][c]) < 5,
                  `rotation ${rotation}, mirrors ${flipX}/${flipY}, quadrant ${i}`,
                );
            });
          } finally {
            pix.destroy();
            page.destroy();
            rendered.destroy();
          }
        }
  });
test("image opacity is retained in the exported PDF", async () => {
  const pdf = await PDFDocument.create();
  pdf.addPage([200, 200]);
  const doc = await readDocument(await pdf.save(), "opacity.pdf");
  doc.pages[0].marks.push({
    id: "alpha",
    kind: "image",
    x: 50,
    y: 50,
    width: 80,
    height: 80,
    text: "",
    size: 18,
    color: "#000000",
    font: "Helvetica",
    data: quadrantPng(),
    imageOpacity: 0.5,
  });
  const rendered = mupdf.Document.openDocument(
      await exportDocument(doc),
      "application/pdf",
    ),
    page = rendered.loadPage(0),
    pix = page.toPixmap(
      mupdf.Matrix.identity,
      mupdf.ColorSpace.DeviceRGB,
      false,
    );
  try {
    const offset = 65 * pix.getStride() + 65 * 3,
      p = pix.getPixels();
    assert.equal(p[offset], 255);
    assert.ok(p[offset + 1] > 120 && p[offset + 1] < 135);
    assert.ok(p[offset + 2] > 120 && p[offset + 2] < 135);
  } finally {
    pix.destroy();
    page.destroy();
    rendered.destroy();
  }
});
