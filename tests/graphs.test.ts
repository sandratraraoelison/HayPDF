import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, rgb, degrees } from "pdf-lib";
import * as mupdf from "mupdf";
import { readDocument, exportDocument } from "../src/infrastructure/pdfEngine";
import { replaceGraph, readGraphText } from "../src/infrastructure/pdfGraphs";
import {
  layoutGraph,
  graphColors,
  type GraphDraft,
  type GraphKind,
} from "../src/domain/graph";

async function fixture(rotation = 0) {
  const pdf = await PDFDocument.create(),
    page = pdf.addPage([400, 400]);
  page.setRotation(degrees(rotation));
  page.drawRectangle({
    x: 170,
    y: 170,
    width: 60,
    height: 60,
    color: rgb(1, 0, 0),
  });
  page.drawText("OLD_GRAPH", { x: 175, y: 202, size: 10 });
  page.drawText("Outside intact", { x: 20, y: 370, size: 10 });
  return readDocument(await pdf.save(), "graph.pdf");
}
function draft(kind: GraphKind): GraphDraft {
  return {
    area: { x: 40, y: 80, width: 320, height: 240 },
    kind,
    title: "NEW_GRAPH",
    sourceText: "",
    items: [
      { label: "One", detail: "Load", value: 40, color: graphColors[0] },
      { label: "Two", detail: "Edit", value: 35, color: graphColors[1] },
      { label: "Three", detail: "Save", value: 25, color: graphColors[2] },
    ],
  };
}
for (const rotation of [0, 90, 180, 270])
  for (const kind of ["bars", "pie", "process"] as const)
    test(`${kind} reconstruction stays vector and preserves surrounding content at ${rotation} degrees`, async () => {
      const doc = await fixture(rotation),
        before = doc.sources[0].slice(),
        model = draft(kind);
      assert.match(await readGraphText(doc, 0, model.area), /OLD_GRAPH/);
      const next = await replaceGraph(doc, 0, model),
        bytes = await exportDocument(next);
      const pdf = mupdf.Document.openDocument(bytes, "application/pdf"),
        page = pdf.loadPage(0),
        text = page.toStructuredText();
      let paths = 0,
        images = 0,
        red = 0;
      const device = new mupdf.Device({
        fillPath(_path, _evenOdd, _matrix, _space, color) {
          paths++;
          if (
            color.length === 3 &&
            color[0] > 0.9 &&
            color[1] < 0.1 &&
            color[2] < 0.1
          )
            red++;
        },
        fillImage() {
          images++;
        },
      });
      try {
        assert.match(text.asText(), /NEW_GRAPH/);
        assert.match(text.asText(), /Outside intact/);
        assert.ok(!text.asText().includes("OLD_GRAPH"));
        page.runPageContents(device, mupdf.Matrix.identity);
        device.close();
        assert.ok(paths >= 3);
        assert.equal(images, 0);
        assert.equal(red, 0);
      } finally {
        device.destroy();
        text.destroy();
        page.destroy();
        pdf.destroy();
      }
      assert.deepEqual(doc.sources[0], before);
    });
test("invalid charts and unsupported text reject without changing the PDF", async () => {
  const doc = await fixture(),
    before = doc.sources[0].slice(),
    model = draft("pie");
  model.items = model.items.map((i) => ({ ...i, value: 0 }));
  await assert.rejects(replaceGraph(doc, 0, model), /supérieur à zéro/);
  const negative = draft("bars");
  negative.items[0].value = -1;
  assert.throws(() => layoutGraph(negative), /invalide/);
  const unsupported = draft("bars");
  unsupported.title = "😀";
  await assert.rejects(replaceGraph(doc, 0, unsupported), /caractères/);
  assert.deepEqual(doc.sources[0], before);
});
test("compact process diagrams keep readable text on light and dark blocks", async () => {
  const doc = await fixture(),
    model = draft("process");
  model.area = { x: 40, y: 160, width: 320, height: 80 };
  model.items[0].color = "#ffffff";
  model.items[1].color = "#000000";
  const layout = layoutGraph(model);
  assert.equal(layout.texts.find((t) => t.text === "One")?.color, "#000000");
  assert.equal(layout.texts.find((t) => t.text === "Two")?.color, "#ffffff");
  await replaceGraph(doc, 0, model);
});
