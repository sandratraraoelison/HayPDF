import { test } from "node:test";
import assert from "node:assert/strict";
import {
  resolveShortcut,
  clampZoom,
  type KeyInput,
} from "../src/application/shortcuts";
const key = (key: string, options: Partial<KeyInput> = {}): KeyInput => ({
  key,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  ...options,
});
test("standard document shortcuts work with Ctrl and Command", () => {
  for (const modifier of [{ ctrlKey: true }, { metaKey: true }]) {
    assert.equal(resolveShortcut(key("o", modifier), false), "open");
    assert.equal(resolveShortcut(key("s", modifier), false), "save");
    assert.equal(resolveShortcut(key("z", modifier), false), "undo");
    assert.equal(
      resolveShortcut(key("z", { ...modifier, shiftKey: true }), false),
      "redo",
    );
    assert.equal(resolveShortcut(key("y", modifier), false), "redo");
  }
});
test("text editing, composition and AltGr are preserved", () => {
  for (const value of ["z", "y", "a", "c", "v", "x"])
    assert.equal(
      resolveShortcut(key(value, { ctrlKey: true }), true),
      undefined,
    );
  for (const value of [
    "Delete",
    "Backspace",
    "Home",
    "End",
    "ArrowLeft",
    "PageDown",
    "t",
    "?",
  ])
    assert.equal(resolveShortcut(key(value), true), undefined);
  assert.equal(resolveShortcut(key("s", { ctrlKey: true }), true), "save");
  assert.equal(
    resolveShortcut(key("t", { isComposing: true }), false),
    undefined,
  );
  assert.equal(
    resolveShortcut(key("0", { ctrlKey: true, altKey: true }), false),
    undefined,
  );
});
test("zoom keys cover AZERTY number row and numeric keypad", () => {
  assert.equal(resolveShortcut(key("=", { ctrlKey: true }), false), "zoomIn");
  assert.equal(
    resolveShortcut(key("+", { ctrlKey: true, shiftKey: true }), false),
    "zoomIn",
  );
  assert.equal(resolveShortcut(key("-", { metaKey: true }), false), "zoomOut");
  assert.equal(
    resolveShortcut(key("à", { ctrlKey: true, code: "Digit0" }), false),
    "actualSize",
  );
  assert.equal(
    resolveShortcut(key("&", { ctrlKey: true, code: "Digit1" }), false),
    "fitWidth",
  );
  assert.equal(
    resolveShortcut(key("é", { ctrlKey: true, code: "Digit2" }), false),
    "fitPage",
  );
  assert.equal(
    resolveShortcut(key("Add", { ctrlKey: true, code: "NumpadAdd" }), false),
    "zoomIn",
  );
  assert.equal(clampZoom(0.85 + 0.1), 0.95);
  assert.equal(clampZoom(8), 3);
  assert.equal(clampZoom(0.1), 0.25);
});
test("navigation and selection shortcuts resolve without deleting pages", () => {
  assert.equal(resolveShortcut(key("PageDown"), false), "nextPage");
  assert.equal(resolveShortcut(key("Home"), false), "firstPage");
  assert.equal(resolveShortcut(key("End"), false), "lastPage");
  assert.equal(resolveShortcut(key("Delete"), false), "deleteSelection");
  assert.equal(
    resolveShortcut(key("ArrowUp", { shiftKey: true }), false),
    "moveUp",
  );
  assert.equal(resolveShortcut(key("Escape"), true), "escape");
  assert.equal(resolveShortcut(key("F1"), true), "help");
});
