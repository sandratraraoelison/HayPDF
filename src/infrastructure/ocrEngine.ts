import { createWorker } from "tesseract.js";
import { loadPreview } from "./pdfPreview";
import type { DocumentModel, Mark, PageModel } from "../domain/document";
import { uid } from "../domain/document";
import { exportDocument } from "./pdfEngine";
import type { RecognitionLanguage } from "../domain/conversion";
export async function recognizePage(
  doc: DocumentModel,
  page: PageModel,
  onProgress: (progress: number) => void,
  language: Exclude<RecognitionLanguage, "none"> = "fra+eng",
): Promise<Mark[]> {
  const visiblePage = {
    ...page,
    marks: page.marks.filter((mark) => !mark.invisible),
  };
  const bytes = await exportDocument(doc, [visiblePage]);
  const preview = await loadPreview(bytes);
  let worker: Awaited<ReturnType<typeof createWorker>> | undefined;
  try {
    const pdfPage = await preview.getPage(1);
    const original = pdfPage.getViewport({ scale: 1, rotation: page.rotation });
    const scale = Math.min(2, 3500 / Math.max(original.width, original.height));
    const viewport = pdfPage.getViewport({ scale, rotation: page.rotation });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await pdfPage.render({ canvas, viewport }).promise;
    const base = new URL(`${import.meta.env.BASE_URL}ocr/`, document.baseURI)
      .href;
    worker = await createWorker(language.split("+"), 1, {
      workerPath: `${base}worker.min.js`,
      corePath: base,
      langPath: base,
      workerBlobURL: false,
      logger: (message) => {
        if (message.status === "recognizing text") onProgress(message.progress);
      },
    });
    const { data } = await worker.recognize(
      canvas,
      {},
      { blocks: true, text: true },
    );
    return (data.blocks ?? [])
      .flatMap((block) =>
        block.paragraphs.flatMap((paragraph) =>
          paragraph.lines.map((line) => ({
            id: uid(),
            kind: "text" as const,
            text: line.text.trim(),
            x: line.bbox.x0 / scale,
            y: line.bbox.y0 / scale,
            width: (line.bbox.x1 - line.bbox.x0) / scale + 5,
            height: (line.bbox.y1 - line.bbox.y0) / scale,
            size: Math.max(6, ((line.bbox.y1 - line.bbox.y0) / scale) * 0.9),
            color: "#000000",
            font: "Helvetica" as const,
            invisible: true,
          })),
        ),
      )
      .filter((mark) => mark.text.length > 0);
  } finally {
    await worker?.terminate();
    await preview.destroy();
  }
}
