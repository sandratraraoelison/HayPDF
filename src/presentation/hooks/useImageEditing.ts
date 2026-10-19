import { useEffect, useRef, useState } from "react";
import type { DocumentModel, Mark } from "../../domain/document";
import type { Rect } from "../../domain/imageLayout";
import { makeImageEditable } from "../../infrastructure/editableImage";
import { readImageFile } from "../../infrastructure/imageFile";

export function useImageEditing(
  doc: DocumentModel | undefined,
  pageIndex: number,
  mark: Mark | undefined,
  commit: (doc: DocumentModel) => void,
  run: (action: () => Promise<void>) => Promise<void>,
  select: (id: string) => void,
) {
  const [selecting, setSelecting] = useState(false),
    [error, setError] = useState("");
  const replacementInput = useRef<HTMLInputElement>(null),
    current = useRef(doc);
  current.current = doc;
  const pending = useRef<
    { doc: DocumentModel; page: number; id: string } | undefined
  >(undefined);
  useEffect(() => {
    setSelecting(false);
    setError("");
  }, [doc, pageIndex]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelecting(false);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  function start() {
    setError("");
    setSelecting(true);
  }
  function cancel() {
    setSelecting(false);
    setError("");
  }
  async function selectArea(area: Rect) {
    setSelecting(false);
    if (!doc) return;
    await run(async () => {
      try {
        const result = await makeImageEditable(doc, pageIndex, area);
        if (current.current !== doc) return;
        commit(result.doc);
        select(result.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }
  function requestReplace() {
    if (!doc || mark?.kind !== "image") return;
    pending.current = { doc, page: pageIndex, id: mark.id };
    replacementInput.current?.click();
  }
  async function loadReplacement(file?: File) {
    const target = pending.current;
    pending.current = undefined;
    if (!file || !target) return;
    await run(async () => {
      const image = await readImageFile(file);
      if (current.current !== target.doc) return;
      commit({
        ...target.doc,
        pages: target.doc.pages.map((page, i) =>
          i === target.page
            ? {
                ...page,
                marks: page.marks.map((m) =>
                  m.id === target.id
                    ? {
                        ...m,
                        data: image.data,
                        naturalWidth: image.width,
                        naturalHeight: image.height,
                      }
                    : m,
                ),
              }
            : page,
        ),
      });
      select(target.id);
    });
  }
  return {
    selecting,
    error,
    replacementInput,
    start,
    cancel,
    selectArea,
    requestReplace,
    loadReplacement,
  };
}
