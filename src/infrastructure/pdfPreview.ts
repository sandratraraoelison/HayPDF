import * as pdfjs from "pdfjs-dist";
import worker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjs.GlobalWorkerOptions.workerSrc = worker;
export async function loadPreview(bytes: Uint8Array) {
  const task = pdfjs.getDocument({ data: bytes.slice() });
  const pdf = await task.promise;
  return {
    getPage: (number: number) => pdf.getPage(number),
    destroy: () => task.destroy(),
  };
}
