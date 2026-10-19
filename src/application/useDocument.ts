import { useReducer } from "react";
import type { DocumentModel } from "../domain/document";
import { emptyHistory, reduceDocumentHistory } from "../domain/documentHistory";
export function useDocument() {
  const [history, dispatch] = useReducer(reduceDocumentHistory, emptyHistory);
  return {
    doc: history.snapshots[history.cursor],
    commit: (document: DocumentModel) => dispatch({ type: "commit", document }),
    open: (document: DocumentModel) => dispatch({ type: "open", document }),
    undo: () => dispatch({ type: "undo" }),
    redo: () => dispatch({ type: "redo" }),
    canUndo: history.cursor > 0,
    canRedo: history.cursor < history.snapshots.length - 1,
  };
}
