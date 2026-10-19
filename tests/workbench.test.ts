import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, PDFName, PDFDict, PDFArray, degrees } from "pdf-lib";
import * as mupdf from "mupdf";
import { readDocument, exportDocument } from "../src/infrastructure/pdfEngine";
import {
  writeComments,
  readComments,
  exportReview,
  importReview,
} from "../src/infrastructure/pdfReview";
import {
  attachFile,
  listAttachments,
  removeAttachment,
} from "../src/infrastructure/pdfAttachments";
import {
  addMeasurement,
  addCustomStamp,
} from "../src/infrastructure/pdfAnnotations";
import {
  inspectPdf,
  setAccessibility,
  setPrintBoxes,
  writeDocumentScript,
} from "../src/infrastructure/pdfAnalysis";
import { comparePdfPages } from "../src/infrastructure/pdfComparison";
import { indexPdf, searchIndexedPdfs } from "../src/infrastructure/searchIndex";
import { applyWorkflow, validRecipe } from "../src/application/workflows";
import { measurePoints, type ReviewComment } from "../src/domain/workbench";
import {
  createArchivalPdf,
  accessibleTranscript,
} from "../src/infrastructure/pdfStandards";

async function fixture(text = "Original", rotation = 0) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([400, 500]);
  page.drawText(text, { x: 30, y: 400, size: 20 });
  page.setRotation(degrees(rotation));
  return readDocument(await pdf.save(), "workbench.pdf");
}
const comment: ReviewComment = {
  id: "note-1",
  page: 0,
  author: "Alice",
  text: "À vérifier",
  date: new Date("2026-01-01T00:00:00Z").toISOString(),
  x: 40,
  y: 60,
};
test("comments and threaded replies survive exports; review imports match the underlying content", async () => {
  const original = await fixture();
  const annotated = await writeComments(original, [
    comment,
    {
      ...comment,
      id: "reply",
      author: "Bob",
      text: "Corrigé",
      replyTo: "note-1",
      x: 80,
    },
  ]);
  const comments = await readComments(
    await readDocument(await exportDocument(annotated), "copy.pdf"),
  );
  assert.equal(comments.length, 2);
  assert.equal(comments.find((c) => c.id === "reply")?.replyTo, "note-1");
  assert.equal(comments[0].text, "À vérifier");
  const packet = await exportReview(annotated);
  const imported = await importReview(original, packet);
  assert.equal((await readComments(imported)).length, 2);
  await assert.rejects(
    importReview(await fixture("Other"), packet),
    /REVIEW_DOCUMENT_MISMATCH/,
  );
  assert.equal((await readComments(original)).length, 0);
});
test("attachments retain bytes after normal exports and page extraction, and can be removed", async () => {
  const original = await fixture(),
    bytes = new Uint8Array([1, 2, 3, 4]);
  const attached = await attachFile(original, 0, {
    name: "sample.mp3",
    type: "audio/mpeg",
    bytes,
  });
  assert.deepEqual(
    (
      await listAttachments(
        await readDocument(await exportDocument(attached), "again.pdf"),
      )
    )[0].bytes,
    bytes,
  );
  const merged = {
    ...attached,
    pages: [...attached.pages, { ...attached.pages[0], id: "second" }],
  };
  assert.equal(
    (
      await listAttachments(
        await readDocument(
          await exportDocument(merged, [merged.pages[1]]),
          "part.pdf",
        ),
      )
    ).length,
    1,
  );
  assert.equal(
    (await listAttachments(await removeAttachment(attached, "sample.mp3")))
      .length,
    0,
  );
});
test("calibrated distances, perimeters and areas use consistent units", () => {
  const points = [
    { x: 0, y: 0 },
    { x: 30, y: 0 },
    { x: 30, y: 40 },
  ];
  assert.equal(measurePoints(points, "distance", 2), 140);
  assert.equal(measurePoints(points, "perimeter", 2), 240);
  assert.equal(measurePoints(points, "area", 2), 2400);
  assert.throws(() => measurePoints([], "area", 1), /INVALID_MEASUREMENT/);
});
for (const rotation of [0, 90, 180, 270])
  test(`measurement annotations and custom stamps export on rotated pages ${rotation}`, async () => {
    let doc = await fixture("Original", rotation);
    doc = await addMeasurement(
      doc,
      0,
      [
        { x: 50, y: 80 },
        { x: 150, y: 80 },
      ],
      "distance",
      0.5,
      "cm",
    );
    doc = await addCustomStamp(
      doc,
      0,
      { x: 40, y: 130, width: 200, height: 50 },
      "APPROVED {page}",
    );
    const pdf = mupdf.Document.openDocument(
        await exportDocument(doc),
        "application/pdf",
      ).asPDF()!,
      page = pdf.loadPage(0) as mupdf.PDFPage;
    try {
      const annots = page.getAnnotations();
      try {
        assert.equal(annots[0].getContents(), "50.000 cm");
        assert.equal(
          annots[0].getObject().get("Measure", "Subtype").asName(),
          "RL",
        );
      } finally {
        annots.forEach((a) => a.destroy());
      }
      const text = page.toStructuredText({});
      try {
        assert.match(text.asText(), /APPROVED 1/);
      } finally {
        text.destroy();
      }
    } finally {
      page.destroy();
      pdf.destroy();
    }
  });
test("comparison detects text edits and creates visual differences, identical pages have zero differences", async () => {
  const first = await exportDocument(await fixture()),
    second = await exportDocument(await fixture("Changed"));
  const same = comparePdfPages(first, first, 0);
  assert.equal(same.changedPixels, 0);
  const changed = comparePdfPages(first, second, 0);
  assert.ok(changed.changedPixels > 0);
  assert.ok(
    changed.changes.some((c) => c.added && c.value.includes("Changed")),
  );
  assert.ok(changed.differenceImage.length);
});
test("search index returns document and page matches without network services", async () => {
  const index = await indexPdf(
    await exportDocument(await fixture("Search this text")),
    "file.pdf",
  );
  assert.equal(searchIndexedPdfs([index], "THIS")[0].page, 0);
  assert.equal(searchIndexedPdfs([index], "missing").length, 0);
});
test("workflows are validated, reversible in source models, and cancellable", async () => {
  const source = await fixture();
  assert.equal(
    validRecipe({
      id: "1",
      name: "Rotate",
      steps: [{ kind: "rotate", angle: 90 }],
    }),
    true,
  );
  assert.equal(
    validRecipe({
      id: "1",
      name: "Run",
      steps: [{ kind: "execute", command: "bad" }],
    }),
    false,
  );
  const next = await applyWorkflow(
    source,
    [{ kind: "rotate", angle: 90 }, { kind: "compress" }],
    () => {},
  );
  assert.equal(next.pages[0].rotation, 90);
  assert.equal(source.pages[0].rotation, 0);
  const abort = new AbortController();
  abort.abort();
  await assert.rejects(
    applyWorkflow(source, [{ kind: "compress" }], () => {}, abort.signal),
  );
});
test("cancellation during the final workflow step rejects without changing the source", async () => {
  const source = await fixture();
  const bytes = source.sources[0].slice();
  const abort = new AbortController();
  await assert.rejects(
    applyWorkflow(
      source,
      [{ kind: "rotate", angle: 90 }],
      () => queueMicrotask(() => abort.abort()),
      abort.signal,
    ),
    { name: "AbortError" },
  );
  assert.equal(source.pages[0].rotation, 0);
  assert.deepEqual(source.sources[0], bytes);
});

test("accessibility metadata, print boxes, scripts and document-level catalog information persist", async () => {
  let doc = await fixture();
  doc = await setAccessibility(doc, "Accessible title", "fr-FR", []);
  doc = await setPrintBoxes(doc, 5, 3);
  doc = await writeDocumentScript(doc, "Example", "this.getField('total');");
  const audit = await inspectPdf(doc);
  assert.equal(audit.title, "Accessible title");
  assert.equal(audit.language, "fr-FR");
  assert.ok(audit.pages[0].trim[0] > 0);
  const pdf = await PDFDocument.load(await exportDocument(doc));
  assert.ok(
    pdf.catalog
      .lookup(PDFName.of("Names"), PDFDict)
      .get(PDFName.of("JavaScript")),
  );
});
test("archival derivative embeds an ICC output intent, XMP identification, and removes interactive content", async () => {
  const doc = await writeComments(await fixture(), [comment]);
  const output = await createArchivalPdf(
      await exportDocument(doc),
      "Archive <test>",
      72,
    ),
    pdf = await PDFDocument.load(output);
  assert.equal(pdf.getPageCount(), 1);
  assert.equal(pdf.getTitle(), "Archive <test>");
  assert.equal(
    pdf.catalog.lookup(PDFName.of("OutputIntents"), PDFArray).size(),
    1,
  );
  assert.ok(pdf.catalog.get(PDFName.of("Metadata")));
  assert.equal(pdf.getPage(0).node.Annots()?.size() ?? 0, 0);
  const html = accessibleTranscript(["<script>bad()</script>"], "Safe", "fr");
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});
