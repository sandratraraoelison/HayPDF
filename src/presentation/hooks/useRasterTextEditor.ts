import { applyRasterText } from "../../application/applyRasterText";
import { useState } from "react";
import type { DocumentModel, Mark } from "../../domain/document";
import { renderRasterText } from "../../infrastructure/rasterText";
export function useRasterTextEditor(
  doc: DocumentModel | undefined,
  pageId: string,
  mark: Mark,
  commit: (doc: DocumentModel) => void,
) {
  const [text, setText] = useState(mark.text);
  const [preview, setPreview] = useState<{
    text: string;
    data: string;
    doc: DocumentModel;
    result: DocumentModel;
  }>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function prepare() {
    if (!doc || !mark.rasterLine) return;
    setBusy(true);
    setError("");
    setPreview(undefined);
    try {
      const page = doc.pages.find((p) => p.id === pageId)!;
      const data = await renderRasterText(
        text,
        mark.rasterLine,
        page.marks.flatMap((m) => (m.rasterLine ? [m.rasterLine] : [])),
      );
      const result = applyRasterText(doc, pageId, mark.id, text, data);
      setPreview({ text, data, doc, result });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  function apply() {
    if (
      !doc ||
      preview?.doc !== doc ||
      preview.text !== text ||
      !mark.rasterLine
    )
      return;
    commit(preview.result);
    setPreview(undefined);
  }
  return {
    text,
    setText,
    preview:
      preview && preview.doc === doc && preview.text === text
        ? preview.data
        : undefined,
    error,
    busy,
    prepare,
    apply,
  };
}
