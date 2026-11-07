import { type DocumentModel, type Mark } from "../domain/document";
import { rasterTextWidth } from "../domain/rasterText";
export function applyRasterText(
  doc: DocumentModel,
  pageId: string,
  id: string,
  text: string,
  data: string,
): DocumentModel {
  const page = doc.pages.find((p) => p.id === pageId);
  const mark = page?.marks.find((m) => m.id === id);
  if (!mark?.rasterLine || !mark.invisible) throw new Error("RASTER_TARGET");
  const imageId = `raster-${mark.id}`;
  const pixelWidth = rasterTextWidth(
    text,
    mark.rasterLine,
    page!.marks.flatMap((m) => (m.rasterLine ? [m.rasterLine] : [])),
  );
  const width = (mark.width * pixelWidth) / mark.rasterLine.width;
  if (
    width > mark.width &&
    page!.marks.some(
      (m) =>
        !m.invisible &&
        m.id !== imageId &&
        m.x < mark.x + width &&
        m.x + m.width > mark.x + mark.width &&
        m.y < mark.y + mark.height &&
        m.y + m.height > mark.y,
    )
  )
    throw new Error("RASTER_OVERFLOW");
  const image: Mark = {
    id: imageId,
    kind: "image",
    x: mark.x,
    y: mark.y,
    width,
    height: mark.height,
    text: "",
    size: mark.size,
    color: mark.color,
    font: mark.font,
    data,
    imageFit: "fill",
    naturalWidth: pixelWidth,
    naturalHeight: mark.rasterLine.height,
  };
  return {
    ...doc,
    pages: doc.pages.map((p) =>
      p.id !== pageId
        ? p
        : {
            ...p,
            marks: [
              ...p.marks
                .filter((m) => m.id !== imageId)
                .map((m) => (m.id === id ? { ...m, text } : m)),
              image,
            ],
          },
    ),
  };
}
