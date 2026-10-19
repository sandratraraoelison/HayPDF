import { test } from "node:test";
import assert from "node:assert/strict";
import type { DocumentModel } from "../src/domain/document";
import {
  emptyHistory,
  reduceDocumentHistory as reduce,
} from "../src/domain/documentHistory";

const original: DocumentModel = {
  name: "original.pdf",
  sources: [new Uint8Array([1, 2, 3])],
  pages: [{ id: "page", source: 0, index: 0, rotation: 0, marks: [] }],
};
const rotated = {
  ...original,
  pages: [{ ...original.pages[0], rotation: 90 }],
};
const renamed = { ...rotated, name: "renamed.pdf" };

test("queued commits retain every undo step and leave previous snapshots intact", () => {
  const opened = reduce(emptyHistory, { type: "open", document: original });
  const first = reduce(opened, { type: "commit", document: rotated });
  const second = reduce(first, { type: "commit", document: renamed });
  const undo = reduce(second, { type: "undo" });
  assert.equal(undo.snapshots[undo.cursor], rotated);
  const twice = reduce(undo, { type: "undo" });
  assert.equal(twice.snapshots[twice.cursor], original);
  assert.equal(original.pages[0].rotation, 0);
  assert.deepEqual(original.sources[0], new Uint8Array([1, 2, 3]));
  assert.deepEqual(opened.snapshots, [original]);
  assert.equal(
    reduce(undo, { type: "redo" }).snapshots[second.cursor],
    renamed,
  );
});

test("editing after undo discards only the abandoned redo branch", () => {
  let state = reduce(emptyHistory, { type: "open", document: original });
  state = reduce(state, { type: "commit", document: rotated });
  state = reduce(state, { type: "undo" });
  state = reduce(state, { type: "commit", document: renamed });
  assert.deepEqual(state.snapshots, [original, renamed]);
  assert.equal(reduce(state, { type: "redo" }), state);
  assert.equal(reduce(state, { type: "undo" }).cursor, 0);
});

test("opening another document resets history even after queued edits", () => {
  let state = reduce(emptyHistory, { type: "commit", document: original });
  state = reduce(state, { type: "commit", document: rotated });
  state = reduce(state, { type: "open", document: renamed });
  assert.deepEqual(state.snapshots, [renamed]);
  assert.equal(reduce(state, { type: "undo" }), state);
});

test("undo and redo are safe with no document and at history boundaries", () => {
  assert.equal(reduce(emptyHistory, { type: "undo" }), emptyHistory);
  assert.equal(reduce(emptyHistory, { type: "redo" }), emptyHistory);
  const opened = reduce(emptyHistory, { type: "open", document: original });
  assert.equal(reduce(opened, { type: "undo" }), opened);
  assert.equal(reduce(opened, { type: "redo" }), opened);
});

test("an unchanged replacement preserves redo and creates no undo step", () => {
  let state = reduce(emptyHistory, { type: "open", document: original });
  state = reduce(state, { type: "commit", document: rotated });
  state = reduce(state, { type: "undo" });
  assert.equal(reduce(state, { type: "commit", document: original }), state);
  const redone = reduce(state, { type: "redo" });
  assert.equal(redone.snapshots[redone.cursor], rotated);
});
