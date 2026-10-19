import type { NativeImage } from "../domain/nativeImage";
import type { DocumentModel } from "../domain/document";
import { mutatePdf, withPdfPage } from "./pdfMutation";
import * as mupdf from "mupdf";

function pageImages(page: mupdf.PDFPage): NativeImage[] {
  const [ox, oy] = page.getBounds();
  const text = page.toStructuredText("preserve-images");
  const images: NativeImage[] = [];
  try {
    text.walk({
      onImageBlock: ([x0, y0, x1, y1]) => {
        images.push({
          index: images.length,
          x: x0 - ox,
          y: y0 - oy,
          width: x1 - x0,
          height: y1 - y0,
        });
      },
    });
    return images;
  } finally {
    text.destroy();
  }
}

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
  return mutatePdf(doc, (pdf) =>
    withPdfPage(pdf, pageIndex, (page) => {
      const images = pageImages(page);
      const target = images[selected.index];
      if (
        !target ||
        ["x", "y", "width", "height"].some(
          (key) =>
            Math.abs(
              target[key as keyof NativeImage] -
                selected[key as keyof NativeImage],
            ) > 0.1,
        )
      )
        throw new Error("IMAGE_SELECTION_CHANGED");
      // Redaction affects every intersecting image. Refuse ambiguous overlapping images.
      if (
        images.some(
          (image) =>
            image !== target &&
            image.x < target.x + target.width &&
            image.x + image.width > target.x &&
            image.y < target.y + target.height &&
            image.y + image.height > target.y,
        )
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
