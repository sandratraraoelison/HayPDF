import type { Mark, Tool } from "../../domain/document";
import type { ShortcutAction } from "../../application/shortcuts";
import { useKeyboardShortcuts } from "../useKeyboardShortcuts";
interface EditorShortcutBindings {
  busy: boolean;
  hasDocument: boolean;
  canUndo: boolean;
  canRedo: boolean;
  pageIndex: number;
  pageCount: number;
  mark?: Mark;
  open: () => void;
  save: () => void;
  undo: () => void;
  redo: () => void;
  escape: () => void;
  help: () => void;
  zoom: (direction: number) => void;
  actualSize: () => void;
  fit: (mode: "width" | "page") => void;
  wheelZoom: (direction: number) => void;
  selectPage: (index: number) => void;
  deleteSelected: () => void;
  chooseTool: (tool: Tool) => void;
  updateMark: (changes: Partial<Mark>) => void;
}
const toolShortcuts: Partial<Record<ShortcutAction, Tool>> = {
  selectTool: "select",
  textTool: "text",
  highlightTool: "highlight",
  rectangleTool: "rectangle",
};
export function useEditorShortcuts(editor: EditorShortcutBindings) {
  function onAction(action: ShortcutAction, shift: boolean) {
    if (action === "help") {
      editor.help();
      return;
    }
    if (editor.busy) return;
    switch (action) {
      case "open":
        editor.open();
        return;
      case "save":
        editor.save();
        return;
      case "escape":
        editor.escape();
        return;
      case "zoomIn":
        editor.zoom(1);
        return;
      case "zoomOut":
        editor.zoom(-1);
        return;
      case "actualSize":
        editor.actualSize();
        return;
      case "fitWidth":
        editor.fit("width");
        return;
      case "fitPage":
        editor.fit("page");
        return;
    }
    if (!editor.hasDocument) return;
    switch (action) {
      case "undo":
        if (editor.canUndo) editor.undo();
        return;
      case "redo":
        if (editor.canRedo) editor.redo();
        return;
      case "previousPage":
        editor.selectPage(Math.max(0, editor.pageIndex - 1));
        return;
      case "nextPage":
        editor.selectPage(Math.min(editor.pageCount - 1, editor.pageIndex + 1));
        return;
      case "firstPage":
        editor.selectPage(0);
        return;
      case "lastPage":
        editor.selectPage(editor.pageCount - 1);
        return;
      case "deleteSelection":
        editor.deleteSelected();
        return;
    }
    const tool = toolShortcuts[action];
    if (tool) {
      editor.chooseTool(tool);
      return;
    }
    if (editor.mark && action.startsWith("move")) {
      const step = shift ? 10 : 1;
      editor.updateMark({
        x: Math.max(
          0,
          editor.mark.x +
            (action === "moveLeft" ? -step : action === "moveRight" ? step : 0),
        ),
        y: Math.max(
          0,
          editor.mark.y +
            (action === "moveUp" ? -step : action === "moveDown" ? step : 0),
        ),
      });
    }
  }
  useKeyboardShortcuts(onAction, (direction) => {
    if (!editor.busy) editor.wheelZoom(direction);
  });
}
