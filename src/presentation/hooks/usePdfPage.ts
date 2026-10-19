import { useEffect, useRef, useState } from "react";
import { extractNativeText } from "../../infrastructure/nativeTextExtraction";
import type {
  DocumentModel,
  NativeText,
  PageModel,
} from "../../domain/document";
import { loadPreview } from "../../infrastructure/pdfPreview";
/** Owns rendering resources and native text extraction for one visible PDF page. */
export function usePdfPage(
  doc: DocumentModel,
  page: PageModel,
  scale: number,
  extractText: boolean,
) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ width: 595, height: 842 });
  const [error, setError] = useState("");
  const [nativeBlocks, setNativeBlocks] = useState<NativeText[]>([]);
  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;
    setError("");
    setNativeBlocks([]);
    void (async () => {
      const pdf = await loadPreview(doc.sources[page.source]);
      cleanup = () => {
        void pdf.destroy();
      };
      if (disposed) {
        cleanup();
        return;
      }
      const sourcePage = await pdf.getPage(page.index + 1);
      if (disposed) return;
      const viewport = sourcePage.getViewport({
        scale,
        rotation: page.rotation,
      });
      if (extractText) {
        const blocks = await extractNativeText(
          doc.sources[page.source],
          page.index,
          page.rotation,
        );
        if (disposed) return;
        setNativeBlocks(blocks);
      }
      setSize({ width: viewport.width, height: viewport.height });
      const element = canvas.current;
      if (!element || disposed) return;
      const ratio = window.devicePixelRatio || 1;
      element.width = viewport.width * ratio;
      element.height = viewport.height * ratio;
      const task = sourcePage.render({
        canvas: element,
        viewport,
        transform: [ratio, 0, 0, ratio, 0, 0],
      });
      cleanup = () => {
        task.cancel();
        void pdf.destroy();
      };
      await task.promise;
    })().catch((error) => {
      if (!disposed && error.name !== "RenderingCancelledException") {
        setError("Impossible de rendre cette page.");
        cleanup?.();
      }
    });
    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [doc.sources, page.source, page.index, page.rotation, scale, extractText]);
  return { canvas, size, error, nativeBlocks };
}
