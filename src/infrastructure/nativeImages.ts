import type { NativeImage } from "../domain/nativeImage";
import type { DocumentModel } from "../domain/document";
import { mutatePdf, withPdfPage } from "./pdfMutation";
import * as mupdf from "mupdf";
import { collectPageImages as pageImages } from "./nativeImageDetection";

export async function extractNativeImages(
  bytes: Uint8Array,
  index: number,
  rotation: number,
) {
  const pdf = mupdf.Document.openDocument(bytes, "application/pdf").asPDF();
  if (!pdf) throw new Error("Invalid PDF");
  try {
    pdf.findPage(index).put("Rotate", rotation);
    return withPdfPage(pdf, index, pageImages);
  } finally {
    pdf.destroy();
  }
}

/** Redact images only; retain text and vector artwork, including content behind the image. */
export async function removeNativeImage(
  doc: DocumentModel,
  pageIndex: number,
  selected: NativeImage,
) {
  if (selected.kind === "vector")
    throw new Error(
      "Utilisez l’aplatissement de zone pour modifier une illustration vectorielle.",
    );
  return mutatePdf(doc, (pdf) =>
    withPdfPage(pdf, pageIndex, (page) => {
      const images = pageImages(page);
      const target = images[selected.index];
      if (
        !target ||
        (["x", "y", "width", "height"] as const).some(
          (key) => Math.abs(target[key] - selected[key]) > 0.1,
        )
      )
        throw new Error("IMAGE_SELECTION_CHANGED");
      // Redaction affects every intersecting image. Refuse ambiguous overlapping images.
      if (
        images.some((image) => {
          const bounds = image.sourceBounds ?? image;
          return (
            image !== target &&
            image.kind !== "vector" &&
            bounds.x < target.x + target.width &&
            bounds.x + bounds.width > target.x &&
            bounds.y < target.y + target.height &&
            bounds.y + bounds.height > target.y
          );
        })
      )
        throw new Error("IMAGE_OVERLAP");
      const [ox, oy] = page.getBounds();
      const annotation = page.createAnnotation("Redact");
      try {
        annotation.setRect([
          ox + target.x,
          oy + target.y,
          ox + target.x + target.width,
          oy + target.y + target.height,
        ]);
        annotation.applyRedaction(
          0,
          mupdf.PDFPage.REDACT_IMAGE_REMOVE,
          mupdf.PDFPage.REDACT_LINE_ART_NONE,
          mupdf.PDFPage.REDACT_TEXT_NONE,
        );
      } finally {
        annotation.destroy();
      }
    }),
  );
}
