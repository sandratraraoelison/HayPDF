import { useEffect, useMemo, useRef, useState } from "react";
import type { DocumentModel } from "../../domain/document";
import type { Rect } from "../../domain/imageLayout";
import {
  graphColors,
  layoutGraph,
  type GraphDraft,
  type GraphItem,
} from "../../domain/graph";
import { readGraphText, replaceGraph } from "../../infrastructure/pdfGraphs";

export function useGraphEditor(
  doc: DocumentModel | undefined,
  pageIndex: number,
  commit: (doc: DocumentModel) => void,
  run: (action: () => Promise<void>) => Promise<void>,
) {
  const [selecting, setSelecting] = useState(false),
    [draft, setDraft] = useState<GraphDraft>(),
    [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null),
    source = useRef<DocumentModel | undefined>(undefined),
    sourcePage = useRef(0);
  useEffect(() => {
    if (draft) dialog.current?.showModal();
  }, [!!draft]);
  useEffect(() => {
    setSelecting(false);
    setDraft(undefined);
    setError("");
  }, [doc, pageIndex]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelecting(false);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const preview = useMemo(() => {
    if (!draft || !draft.items.length) return {};
    try {
      return { layout: layoutGraph(draft) };
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  }, [draft]);
  function start() {
    setError("");
    setSelecting(true);
  }
  function cancel() {
    setSelecting(false);
    setDraft(undefined);
    setError("");
  }
  async function select(area: Rect) {
    setSelecting(false);
    if (!doc) return;
    await run(async () => {
      try {
        if (area.width < 180 || area.height < 80)
          throw new Error(
            "Sélectionnez une zone d’au moins 180 × 80 points pour le graphique.",
          );
        const sourceText = await readGraphText(doc, pageIndex, area);
        source.current = doc;
        sourcePage.current = pageIndex;
        setDraft({
          area,
          kind: area.height < 120 ? "process" : "bars",
          title: "",
          items: [],
          sourceText,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }
  function update(changes: Partial<Pick<GraphDraft, "kind" | "title">>) {
    setError("");
    setDraft((d) => (d ? { ...d, ...changes } : d));
  }
  function item(index: number, changes: Partial<GraphItem>) {
    setError("");
    setDraft((d) =>
      d
        ? {
            ...d,
            items: d.items.map((i, n) =>
              n === index ? { ...i, ...changes } : i,
            ),
          }
        : d,
    );
  }
  function add(label: string) {
    setDraft((d) =>
      d && d.items.length < 12
        ? {
            ...d,
            items: [
              ...d.items,
              {
                label,
                detail: "",
                value: 0,
                color: graphColors[d.items.length % graphColors.length],
              },
            ],
          }
        : d,
    );
    setError("");
  }
  function remove(index: number) {
    setDraft((d) =>
      d ? { ...d, items: d.items.filter((_, n) => n !== index) } : d,
    );
    setError("");
  }
  function move(index: number, delta: number) {
    setDraft((d) => {
      if (!d || index + delta < 0 || index + delta >= d.items.length) return d;
      const items = [...d.items];
      [items[index], items[index + delta]] = [
        items[index + delta],
        items[index],
      ];
      return { ...d, items };
    });
  }
  async function apply() {
    if (!doc || !draft || source.current !== doc) return;
    await run(async () => {
      try {
        commit(await replaceGraph(doc, sourcePage.current, draft));
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
    preview,
    start,
    cancel,
    select,
    update,
    item,
    add,
    remove,
    move,
    apply,
  };
}
