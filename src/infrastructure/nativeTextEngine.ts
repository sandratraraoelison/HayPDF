import type { NativeText } from "../domain/document";
/** MuPDF performs real content removal; no white rectangle conceals the old text. */
export async function removeNativeText(
  bytes: Uint8Array,
  pageIndex: number,
  block: NativeText,
): Promise<Uint8Array> {
  const mupdf = await import("mupdf");
  const doc = mupdf.Document.openDocument(bytes, "application/pdf").asPDF();
  if (!doc) throw new Error("Invalid PDF");
  try {
    const page = doc.loadPage(pageIndex);
    if (!(page instanceof mupdf.PDFPage)) {
      page.destroy();
      throw new Error("Invalid PDF page");
    }
    try {
      const annotation = page.createAnnotation("Redact");
      try {
        // Both engines use the rotated page's top-left origin, in PDF points.
        const [x, y] = page.getBounds();
        annotation.setRect([
          x + block.x,
          y + block.y,
          x + block.x + block.width,
          y + block.y + block.height,
        ]);
        annotation.update();
        annotation.applyRedaction(
          0,
          mupdf.PDFPage.REDACT_IMAGE_NONE,
          mupdf.PDFPage.REDACT_LINE_ART_NONE,
          mupdf.PDFPage.REDACT_TEXT_REMOVE,
        );
      } finally {
        annotation.destroy();
      }
      const buffer = doc.saveToBuffer("garbage=4,compress");
      try {
        return buffer.asUint8Array().slice();
      } finally {
        buffer.destroy();
      }
    } finally {
      page.destroy();
    }
  } finally {
    doc.destroy();
  }
}
