import * as mupdf from "mupdf";
import type { DocumentModel, Mark } from "../domain/document";
import { uid } from "../domain/document";
import type { Rect } from "../domain/imageLayout";
import { exportDocument, readDocument } from "./pdfEngine";

/** Flatten only the selected area into an editable PNG; retain the source snapshot for undo. */
export async function makeImageEditable(
  doc: DocumentModel,
  index: number,
  area: Rect,
) {
  if (
    !Number.isFinite(area.x + area.y + area.width + area.height) ||
    area.x < 0 ||
    area.y < 0 ||
    area.width < 2 ||
    area.height < 2
  )
    throw new Error("Zone d’image invalide.");
  const pdf = mupdf.Document.openDocument(
    await exportDocument(doc),
    "application/pdf",
  ).asPDF()!;
  let png: Uint8Array, cleaned: Uint8Array, width: number, height: number;
  try {
    const page = pdf.loadPage(index) as mupdf.PDFPage;
    try {
      const [ox, oy, right, bottom] = page.getBounds();
      if (
        area.x + area.width > right - ox + 0.1 ||
        area.y + area.height > bottom - oy + 0.1
      )
        throw new Error("Zone hors de la page / Area outside page");
      const annotations = [...page.getAnnotations(), ...page.getWidgets()];
      if (
        annotations.some((annotation) => {
          const b = annotation.getBounds();
          return (
            b[0] < ox + area.x + area.width &&
            b[2] > ox + area.x &&
            b[1] < oy + area.y + area.height &&
            b[3] > oy + area.y
          );
        })
      )
        throw new Error(
          "La zone contient une annotation ou un formulaire. Choisissez une zone sans élément interactif.",
        );
      const text = page.toStructuredText({});
      let cutText = false;
      try {
        text.walk({
          onChar(char, _origin, _font, _size, q) {
            if (!char.trim()) return;
            const xs = [q[0], q[2], q[4], q[6]],
              ys = [q[1], q[3], q[5], q[7]],
              left = Math.min(...xs) - ox,
              top = Math.min(...ys) - oy,
              right = Math.max(...xs) - ox,
              bottom = Math.max(...ys) - oy;
            if (
              left < area.x + area.width &&
              right > area.x &&
              top < area.y + area.height &&
              bottom > area.y &&
              (left < area.x - 0.3 ||
                right > area.x + area.width + 0.3 ||
                top < area.y - 0.3 ||
                bottom > area.y + area.height + 0.3)
            )
              cutText = true;
          },
        });
      } finally {
        text.destroy();
      }
      if (cutText)
        throw new Error(
          "La sélection coupe du texte. Ajustez la zone pour inclure ou exclure les caractères entiers.",
        );
      const scale = Math.min(
        3,
        4096 / area.width,
        4096 / area.height,
        Math.sqrt(12000000 / (area.width * area.height)),
      );
      width = Math.ceil(area.width * scale);
      height = Math.ceil(area.height * scale);
      const pixmap = new mupdf.Pixmap(
        mupdf.ColorSpace.DeviceRGB,
        [0, 0, width, height],
        false,
      );
      try {
        pixmap.clear(255);
        const device = new mupdf.DrawDevice(
          [scale, 0, 0, scale, -(ox + area.x) * scale, -(oy + area.y) * scale],
          pixmap,
        );
        try {
          page.runPageContents(device, mupdf.Matrix.identity);
          device.close();
          png = pixmap.asPNG().slice();
        } finally {
          device.destroy();
        }
      } finally {
        pixmap.destroy();
      }
      const annotation = page.createAnnotation("Redact");
      try {
        annotation.setRect([
          ox + area.x,
          oy + area.y,
          ox + area.x + area.width,
          oy + area.y + area.height,
        ]);
        annotation.applyRedaction(
          0,
          mupdf.PDFPage.REDACT_IMAGE_PIXELS,
          mupdf.PDFPage.REDACT_LINE_ART_REMOVE_IF_COVERED,
          mupdf.PDFPage.REDACT_TEXT_REMOVE,
        );
      } finally {
        annotation.destroy();
      }
      const buffer = pdf.saveToBuffer("garbage=4,compress");
      try {
        cleaned = buffer.asUint8Array().slice();
      } finally {
        buffer.destroy();
      }
    } finally {
      page.destroy();
    }
  } finally {
    pdf.destroy();
  }
  const chunks: string[] = [];
  for (let offset = 0; offset < png.length; offset += 16384)
    chunks.push(String.fromCharCode(...png.subarray(offset, offset + 16384)));
  const next = await readDocument(cleaned, doc.name);
  const mark: Mark = {
    id: uid(),
    kind: "image",
    x: area.x,
    y: area.y,
    width: area.width,
    height: area.height,
    data: `data:image/png;base64,${btoa(chunks.join(""))}`,
    text: "",
    size: 18,
    color: "#000000",
    font: "Helvetica",
    imageFit: "fill",
    lockAspectRatio: true,
    naturalWidth: width,
    naturalHeight: height,
  };
  next.pages[index].marks.push(mark);
  return { doc: next, id: mark.id };
}
