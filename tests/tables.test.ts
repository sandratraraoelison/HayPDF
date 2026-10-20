import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, rgb, degrees } from "pdf-lib";
import * as mupdf from "mupdf";
import { detectTable, replaceTable } from "../src/infrastructure/pdfTables";
import { readDocument, exportDocument } from "../src/infrastructure/pdfEngine";
import { changeTableColumn, changeTableRow } from "../src/domain/table";

async function fixture() {
  const pdf = await PDFDocument.create(),
    page = pdf.addPage([400, 400]);
  for (let c = 0; c <= 3; c++)
    page.drawLine({
      start: { x: 40 + c * 100, y: 120 },
      end: { x: 40 + c * 100, y: 280 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
  for (let r = 0; r <= 4; r++)
    page.drawLine({
      start: { x: 40, y: 120 + r * 40 },
      end: { x: 340, y: 120 + r * 40 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 3; c++)
      page.drawText(r === 2 && c === 0 ? "REMOVE_ME" : `R${r}C${c}`, {
        x: 45 + c * 100,
        y: 255 - r * 40,
        size: 10,
      });
  page.drawText("Outside stays", { x: 40, y: 330, size: 12 });
  return readDocument(await pdf.save(), "tables.pdf");
}
function text(bytes: Uint8Array) {
  const pdf = mupdf.Document.openDocument(bytes, "application/pdf"),
    page = pdf.loadPage(0),
    text = page.toStructuredText();
  try {
    return text.asText();
  } finally {
    text.destroy();
    page.destroy();
    pdf.destroy();
  }
}
test("tables with borders painted as thin filled rectangles are detected", async () => {
  const pdf = await PDFDocument.create(),
    page = pdf.addPage([400, 400]);
  for (let c = 0; c <= 3; c++)
    page.drawRectangle({
      x: 40 + c * 100 - 0.5,
      y: 120,
      width: 1,
      height: 160,
      color: rgb(0, 0, 0),
    });
  for (let r = 0; r <= 4; r++)
    page.drawRectangle({
      x: 40,
      y: 120 + r * 40 - 0.5,
      width: 300,
      height: 1,
      color: rgb(0, 0, 0),
    });
  page.drawText("FILLED_GRID", { x: 45, y: 255, size: 10 });
  const doc = await readDocument(await pdf.save(), "filled-grid.pdf");
  const draft = await detectTable(doc, 0, {
    x: 37,
    y: 117,
    width: 306,
    height: 166,
  });
  assert.equal(draft.cells.length, 4);
  assert.equal(draft.widths.length, 3);
  assert.equal(draft.cells[0][0], "FILLED_GRID");
  draft.cells[0][0] = "REPLACED";
  const next = await replaceTable(doc, 0, draft);
  assert.match(text(next.sources[0]), /REPLACED/);
  assert.ok(!text(next.sources[0]).includes("FILLED_GRID"));
});
test("table rebuilding respects a rotated page and preserves surrounding text", async () => {
  const original = await fixture(),
    pdf = await PDFDocument.load(original.sources[0]);
  pdf.getPage(0).setRotation(degrees(90));
  const doc = await readDocument(await pdf.save(), "rotated-table.pdf");
  const draft = await detectTable(doc, 0, {
    x: 117,
    y: 37,
    width: 166,
    height: 306,
  });
  assert.equal(draft.cells.length, 3);
  assert.equal(draft.widths.length, 4);
  draft.cells[0][0] = "ROTATED";
  const next = await replaceTable(doc, 0, draft);
  assert.match(text(await exportDocument(next)), /ROTAT\s*ED/);
  assert.match(text(await exportDocument(next)), /Outside stays/);
  assert.equal(next.pages[0].rotation, 90);
});
test("table detection retains every cell; deleting and adding rows and columns preserves outside content and source", async () => {
  const doc = await fixture(),
    snapshot = doc.sources[0].slice();
  let draft = await detectTable(doc, 0, {
    x: 37,
    y: 117,
    width: 306,
    height: 166,
  });
  assert.equal(draft.cells.length, 4);
  assert.equal(draft.widths.length, 3);
  assert.equal(draft.cells[2][0], "REMOVE_ME");
  draft = changeTableRow(draft, 2, false);
  draft = changeTableRow(draft, 3, true);
  draft.cells[3][0] = "NEW_ROW";
  draft = changeTableColumn(draft, 2, false);
  draft = changeTableColumn(draft, 2, true);
  draft.cells[1][2] = "NEW_COL";
  const next = await replaceTable(doc, 0, draft),
    bytes = await exportDocument(next),
    result = text(bytes);
  assert.ok(!result.includes("REMOVE_ME"));
  assert.ok(!result.includes("R1C2"));
  assert.match(result, /NEW_ROW/);
  assert.match(result, /NEW_COL/);
  assert.match(result, /Outside stays/);
  assert.deepEqual(doc.sources[0], snapshot);
  assert.match(text(await exportDocument(doc)), /REMOVE_ME/);
  const detected = await detectTable(next, 0, {
    x: 37,
    y: 117,
    width: 306,
    height: 166,
  });
  assert.equal(detected.cells.length, 4);
  assert.equal(detected.widths.length, 3);
  let single = detected;
  while (single.widths.length > 1) single = changeTableColumn(single, 1, false);
  while (single.cells.length > 1) single = changeTableRow(single, 1, false);
  const one = await replaceTable(next, 0, single);
  const oneDetected = await detectTable(one, 0, {
    x: 37,
    y: 117,
    width: 306,
    height: 166,
  });
  assert.equal(oneDetected.cells.length, 1);
  assert.equal(oneDetected.widths.length, 1);
});
test("partial grids and overflowing content are rejected without changing the source", async () => {
  const doc = await fixture();
  await assert.rejects(
    detectTable(doc, 0, { x: 60, y: 130, width: 120, height: 80 }),
  );
  const draft = await detectTable(doc, 0, {
    x: 37,
    y: 117,
    width: 306,
    height: 166,
  });
  draft.cells[0][0] = "X".repeat(10000);
  await assert.rejects(replaceTable(doc, 0, draft), /dépasse/);
  assert.match(text(doc.sources[0]), /REMOVE_ME/);
});

test("an added column automatically grows rows and preserves all text and the source", async () => {
  const doc = await fixture(),
    snapshot = doc.sources[0].slice();
  let draft = await detectTable(doc, 0, {
    x: 37,
    y: 117,
    width: 306,
    height: 166,
  });
  draft = changeTableColumn(draft, 3, true);
  draft.cells[1][1] =
    "Automatic sizing keeps this entire sentence inside its cell";
  draft.cells[1][3] = "NEW_COLUMN";
  const next = await replaceTable(doc, 0, draft);
  const detected = await detectTable(next, 0, {
    x: 37,
    y: 117,
    width: 362,
    height: 282,
  });
  assert.equal(detected.widths.length, 4);
  assert.ok(detected.area.height >= draft.area.height);
  assert.ok(detected.widths[1] > draft.widths[1]);
  assert.equal(
    detected.cells[1][1].replace(/\s/g, ""),
    draft.cells[1][1].replace(/\s/g, ""),
  );
  assert.match(text(next.sources[0]), /Outside stays/);
  assert.deepEqual(doc.sources[0], snapshot);
});

test("automatic growth moves the following content instead of overwriting it", async () => {
  const original = await fixture(),
    pdf = await PDFDocument.load(original.sources[0]);
  const page = pdf.getPage(0);
  page.drawRectangle({
    x: 35,
    y: 10,
    width: 365,
    height: 108,
    color: rgb(0.8, 0, 0),
  });
  page.drawRectangle({
    x: 342,
    y: 10,
    width: 58,
    height: 280,
    color: rgb(0, 0, 0.8),
  });
  const doc = await readDocument(await pdf.save(), "blocked.pdf");
  const draft = await detectTable(doc, 0, {
    x: 37,
    y: 117,
    width: 306,
    height: 166,
  });
  draft.cells[1][0] =
    "A long sentence that must grow beyond the available height. ".repeat(5);
  const snapshot = doc.sources[0].slice();
  const moved = await replaceTable(doc, 0, draft);
  assert.ok(moved.pages.length > doc.pages.length);
  assert.match(text(moved.sources[0]), /Outside stays/);
  assert.deepEqual(doc.sources[0], snapshot);
});

for (const rotation of [0, 90, 180, 270]) {
  test(`automatic table widening preserves a nearby obstacle at rotation ${rotation}`, async () => {
    const pdf = await PDFDocument.create(),
      page = pdf.addPage([400, 400]);
    // Place the obstacle in visual page coordinates for each rotation.
    const x = rotation === 90 ? 142 : 0;
    const y =
      rotation === 0 ? 0 : rotation === 90 ? 0 : rotation === 180 ? 142 : 0;
    page.drawRectangle({
      x,
      y,
      width: rotation % 180 ? 258 : 400,
      height: rotation % 180 ? 400 : 258,
      color: rgb(0.9, 0.2, 0.2),
    });
    page.setRotation(degrees(rotation));
    const doc = await readDocument(await pdf.save(), "widen.pdf");
    const draft = {
      area: { x: 40, y: 100, width: 100, height: 40 },
      widths: [50, 50],
      cells: [
        ["Long column heading", "Value"],
        ["Another long heading", "42"],
      ],
    };
    const next = await replaceTable(doc, 0, draft);
    const detected = await detectTable(next, 0, {
      x: 37,
      y: 97,
      width: 362,
      height: 44,
    });
    assert.ok(detected.area.width > 100);
    assert.ok(detected.area.height <= 40.1);
    assert.equal(detected.cells[0][0], "Long column heading");
    assert.equal(next.pages[0].rotation, rotation);
    const rendered = mupdf.Document.openDocument(
        next.sources[0],
        "application/pdf",
      ),
      renderedPage = rendered.loadPage(0);
    const pixmap = renderedPage.toPixmap(
      mupdf.Matrix.identity,
      mupdf.ColorSpace.DeviceRGB,
      false,
      true,
    );
    try {
      const offset = 200 * pixmap.getStride() + 200 * 3;
      assert.ok(
        pixmap.getPixels()[offset] > 200 &&
          pixmap.getPixels()[offset + 1] < 100,
      );
    } finally {
      pixmap.destroy();
      renderedPage.destroy();
      rendered.destroy();
    }
  });
}

test("column widths use available space and wrap between whole words", async () => {
  const doc = await fixture();
  const draft = {
    area: { x: 40, y: 120, width: 300, height: 160 },
    widths: [50, 110, 40, 40, 30, 30],
    cells: [
      ["ID", "Tache", "Responsable", "Statut", "Progression", "Colonne"],
      ["TSK-001", "Selectionner du texte", "Mina", "En cours", "65 %", "Test"],
    ],
  };
  const next = await replaceTable(doc, 0, draft);
  const detected = await detectTable(next, 0, {
    x: 37,
    y: 117,
    width: 362,
    height: 282,
  });
  assert.equal(detected.cells[0][2], "Responsable");
  assert.equal(detected.cells[0][4], "Progression");
  assert.ok(
    detected.cells[1][1]
      .split("\n")
      .every((line) =>
        line
          .split(" ")
          .every((word) => ["Selectionner", "du", "texte"].includes(word)),
      ),
  );
});

test("adding many rows inserts continuation pages before the untouched following pages", async () => {
  const original = await fixture(),
    pdf = await PDFDocument.load(original.sources[0]);
  pdf.getPage(0).drawText("FOLLOWING_CONTENT", { x: 40, y: 60, size: 12 });
  pdf
    .addPage([400, 400])
    .drawText("NEXT_ORIGINAL_PAGE", { x: 40, y: 330, size: 12 });
  const doc = await readDocument(await pdf.save(), "flow.pdf"),
    snapshot = doc.sources[0].slice();
  let draft = await detectTable(doc, 0, {
    x: 37,
    y: 117,
    width: 306,
    height: 166,
  });
  while (draft.cells.length < 140)
    draft = changeTableRow(draft, draft.cells.length, true);
  draft.cells[139][0] = "LAST_NEW_ROW";
  const next = await replaceTable(doc, 0, draft);
  assert.ok(next.pages.length > 2);
  const result = mupdf.Document.openDocument(
    next.sources[0],
    "application/pdf",
  );
  const texts: string[] = [];
  try {
    for (let i = 0; i < result.countPages(); i++) {
      const page = result.loadPage(i),
        structured = page.toStructuredText();
      try {
        texts.push(structured.asText());
      } finally {
        structured.destroy();
        page.destroy();
      }
    }
  } finally {
    result.destroy();
  }
  const combined = texts.join("\n");
  assert.equal(combined.split("FOLLOWING_CONTENT").length, 2);
  assert.ok(
    combined.indexOf("FOLLOWING_CONTENT") > combined.indexOf("LAST_NEW_ROW"),
  );
  assert.match(texts.at(-1)!, /NEXT_ORIGINAL_PAGE/);
  assert.deepEqual(doc.sources[0], snapshot);
});

test("adding one row keeps existing row heights and shifts subsequent text by that height", async () => {
  const original = await fixture(),
    pdf = await PDFDocument.load(original.sources[0]);
  pdf.getPage(0).drawText("FOLLOW_ONE", { x: 40, y: 90, size: 12 });
  const doc = await readDocument(await pdf.save(), "one-row.pdf");
  const draft = await detectTable(doc, 0, {
    x: 37,
    y: 117,
    width: 306,
    height: 166,
  });
  const next = await replaceTable(doc, 0, changeTableRow(draft, 4, true));
  function followingTop(bytes: Uint8Array) {
    const pdf = mupdf.Document.openDocument(bytes, "application/pdf"),
      page = pdf.loadPage(0),
      structured = page.toStructuredText();
    let line = "",
      top = 0,
      result = NaN;
    try {
      structured.walk({
        beginLine(box) {
          line = "";
          top = box[1];
        },
        onChar(c) {
          line += c;
        },
        endLine() {
          if (line.includes("FOLLOW_ONE")) result = top;
        },
      });
      return result;
    } finally {
      structured.destroy();
      page.destroy();
      pdf.destroy();
    }
  }
  assert.equal(next.pages.length, 1);
  assert.ok(
    Math.abs(
      followingTop(next.sources[0]) - followingTop(doc.sources[0]) - 40,
    ) < 0.1,
  );
});

for (const rotation of [0, 90, 180, 270]) {
  test(`pagination preserves cropped and rotated following text at ${rotation} degrees`, async () => {
    const pdf = await PDFDocument.create(),
      page = pdf.addPage([500, 500]);
    page.setCropBox(20, 30, 400, 400);
    page.setRotation(degrees(rotation));
    const position =
      rotation === 0
        ? [40, 100]
        : rotation === 90
          ? [300, 40]
          : rotation === 180
            ? [360, 300]
            : [100, 360];
    page.drawText("ROTATED_FOLLOWING", {
      x: 20 + position[0],
      y: 30 + position[1],
      size: 10,
      rotate: degrees(rotation),
    });
    const doc = await readDocument(await pdf.save(), "rotated-flow.pdf");
    const draft = {
      area: { x: 40, y: 80, width: 300, height: 80 },
      widths: [150, 150],
      cells: Array.from({ length: 40 }, (_, i) => [`ROW_${i}`, "VALUE"]),
    };
    const next = await replaceTable(doc, 0, draft);
    assert.ok(next.pages.length > 1);
    const result = mupdf.Document.openDocument(
      next.sources[0],
      "application/pdf",
    );
    let found = 0;
    try {
      for (let i = 0; i < result.countPages(); i++) {
        const rendered = result.loadPage(i),
          structured = rendered.toStructuredText();
        try {
          if (structured.asText().includes("ROTATED_FOLLOWING")) {
            found++;
            assert.ok(i > 0);
            const bounds = rendered.getBounds();
            structured.walk({
              onChar(_c, _origin, _font, _size, quad) {
                for (let p = 0; p < quad.length; p += 2) {
                  assert.ok(
                    quad[p] >= bounds[0] - 1 && quad[p] <= bounds[2] + 1,
                  );
                  assert.ok(
                    quad[p + 1] >= bounds[1] - 1 &&
                      quad[p + 1] <= bounds[3] + 1,
                  );
                }
              },
            });
          }
        } finally {
          structured.destroy();
          rendered.destroy();
        }
      }
    } finally {
      result.destroy();
    }
    assert.equal(found, 1);
  });
}
