import { useEffect, useRef, useState } from "react";
import type { DocumentModel } from "../../domain/document";
import type { Rect } from "../../domain/imageLayout";
import {
  changeTableColumn,
  changeTableRow,
  type TableDraft,
} from "../../domain/table";
import { detectTable, replaceTable } from "../../infrastructure/pdfTables";

export function useTableEditor(
  doc: DocumentModel | undefined,
  pageIndex: number,
  commit: (doc: DocumentModel) => void,
  run: (action: () => Promise<void>) => Promise<void>,
  t: (s: string) => string,
) {
  const [selecting, setSelecting] = useState(false),
    [draft, setDraft] = useState<TableDraft>(),
    [error, setError] = useState("");
  const source = useRef<DocumentModel | undefined>(undefined),
    sourcePage = useRef(0);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (draft) dialog.current?.showModal();
  }, [!!draft]);
  useEffect(() => {
    setSelecting(false);
    setDraft(undefined);
    setError("");
  }, [doc, pageIndex]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelecting(false);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  function start() {
    setError("");
    setSelecting(true);
  }
  function cancel() {
    setDraft(undefined);
    setSelecting(false);
    setError("");
  }
  async function select(area: Rect) {
    setSelecting(false);
    if (!doc) return;
    await run(async () => {
      try {
        const next = await detectTable(doc, pageIndex, area);
        source.current = doc;
        sourcePage.current = pageIndex;
        setDraft(next);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }
  function cell(row: number, col: number, value: string) {
    setError("");
    setDraft((current) =>
      current
        ? {
            ...current,
            cells: current.cells.map((r, i) =>
              i === row ? r.map((v, j) => (j === col ? value : v)) : r,
            ),
          }
        : current,
    );
  }
  function row(index: number, insert: boolean) {
    setError("");
    setDraft((current) =>
      current ? changeTableRow(current, index, insert) : current,
    );
  }
  function column(index: number, insert: boolean) {
    setError("");
    setDraft((current) =>
      current ? changeTableColumn(current, index, insert) : current,
    );
  }
  async function apply() {
    if (!draft || !doc || source.current !== doc) return;
    await run(async () => {
      try {
        const next = await replaceTable(doc, sourcePage.current, draft);
        commit(next);
        cancel();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }
  return {
    selecting,
    draft,
    error,
    dialog,
    start,
    cancel,
    select,
    cell,
    row,
    column,
    apply,
    t,
  };
}
