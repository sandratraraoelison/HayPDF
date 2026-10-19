import type { DocumentModel } from "./document";

export interface DocumentHistory {
  readonly snapshots: readonly DocumentModel[];
  readonly cursor: number;
}

export type HistoryAction =
  | { type: "open" | "commit"; document: DocumentModel }
  | { type: "undo" | "redo" };

export const emptyHistory: DocumentHistory = { snapshots: [], cursor: -1 };

/** Keep snapshots and their cursor in one atomic state transition. */
export function reduceDocumentHistory(
  state: DocumentHistory,
  action: HistoryAction,
): DocumentHistory {
  switch (action.type) {
    case "open":
      return { snapshots: [action.document], cursor: 0 };
    case "commit":
      if (state.snapshots[state.cursor] === action.document) return state;
      return {
        snapshots: [
          ...state.snapshots.slice(0, state.cursor + 1),
          action.document,
        ],
        cursor: state.cursor + 1,
      };
    case "undo":
      return state.cursor > 0 ? { ...state, cursor: state.cursor - 1 } : state;
    case "redo":
      return state.cursor < state.snapshots.length - 1
        ? { ...state, cursor: state.cursor + 1 }
        : state;
  }
}
