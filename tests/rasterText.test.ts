import { test } from "node:test";
import assert from "node:assert/strict";
import { layoutRasterText, type RasterLine } from "../src/domain/rasterText";
import { applyRasterText } from "../src/application/applyRasterText";
import type { DocumentModel, Mark } from "../src/domain/document";
const line: RasterLine = {
  original: "ab",
  data: "original",
  width: 60,
  height: 20,
  glyphs: [
    { text: "a", data: "a", width: 8, height: 15, top: 2 },
    { text: "b", data: "b", width: 9, height: 15, top: 2 },
  ],
};
test("reuse exact local glyphs and refuse missing characters and overflowing lines", () => {
  assert.deepEqual(
    layoutRasterText("ba", line, []).map((p) => p.glyph.data),
    ["b", "a"],
  );
  assert.throws(() => layoutRasterText("A", line, []), /RASTER_MISSING/);
  assert.throws(
    () => layoutRasterText("aaaaaaaa", line, []),
    /RASTER_OVERFLOW/,
  );
  assert.throws(() => layoutRasterText("a\nb", line, []), /RASTER_LENGTH/);
  const other = { ...line, glyphs: [{ ...line.glyphs[0], text: "c" }] };
  assert.equal(layoutRasterText("c", line, [other])[0].glyph.text, "c");
  assert.throws(
    () => layoutRasterText("c", line, [{ ...other, height: 40 }]),
    /RASTER_MISSING/,
  );
});
test("visual replacement keeps source and history intact, updates OCR and replaces its previous overlay", () => {
  const mark: Mark = {
    id: "text",
    kind: "text",
    x: 1,
    y: 2,
    width: 30,
    height: 10,
    size: 9,
    text: "ab",
    color: "#000000",
    font: "Helvetica",
    invisible: true,
    rasterLine: line,
  };
  const doc: DocumentModel = {
    name: "scan.pdf",
    sources: [new Uint8Array([1])],
    pages: [{ id: "p", source: 0, index: 0, rotation: 90, marks: [mark] }],
  };
  const next = applyRasterText(doc, "p", "text", "ba", "first");
  const again = applyRasterText(next, "p", "text", "aa", "second");
  assert.equal(doc.pages[0].marks.length, 1);
  assert.equal(doc.pages[0].marks[0].text, "ab");
  assert.equal(again.sources, doc.sources);
  assert.equal(again.pages[0].marks.length, 2);
  assert.equal(again.pages[0].marks[0].text, "aa");
  assert.equal(again.pages[0].marks[1].data, "second");
  assert.equal(next.pages[0].marks[1].data, "first");
});

test("longer text uses detected free space without stretching, and still stops at its limit", () => {
  const extended = { ...line, availableWidth: 120 };
  assert.equal(layoutRasterText("aaaaaaaa", extended, []).length, 8);
  assert.throws(
    () => layoutRasterText("aaaaaaaaaaaaaaa", extended, []),
    /RASTER_OVERFLOW/,
  );
  const mark: Mark = {
    id: "ocr",
    kind: "text",
    x: 10,
    y: 10,
    width: 30,
    height: 10,
    text: "ab",
    size: 9,
    color: "#000000",
    font: "Helvetica",
    invisible: true,
    rasterLine: extended,
  };
  const doc: DocumentModel = {
    name: "test.pdf",
    sources: [],
    pages: [{ id: "p", source: 0, index: 0, rotation: 0, marks: [mark] }],
  };
  const result = applyRasterText(doc, "p", "ocr", "aaaaaaaa", "png");
  const image = result.pages[0].marks[1];
  assert.ok(image.width > mark.width);
  assert.equal(image.width / image.naturalWidth!, mark.width / line.width);
  assert.equal(doc.pages[0].marks.length, 1);
  const obstacle = {
    ...mark,
    id: "obstacle",
    invisible: false,
    x: 42,
    width: 10,
  };
  assert.throws(
    () =>
      applyRasterText(
        { ...doc, pages: [{ ...doc.pages[0], marks: [mark, obstacle] }] },
        "p",
        "ocr",
        "aaaaaaaa",
        "png",
      ),
    /RASTER_OVERFLOW/,
  );
});
