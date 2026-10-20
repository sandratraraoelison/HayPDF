import { PDFDocument, degrees, type PDFPage } from "pdf-lib";
import * as mupdf from "mupdf";

export function tablePoint(page: PDFPage, x: number, y: number) {
  const box = page.getCropBox(),
    rotation = page.getRotation().angle;
  const [px, py] =
    rotation === 90
      ? [y, x]
      : rotation === 180
        ? [box.width - x, y]
        : rotation === 270
          ? [box.width - y, box.height - x]
          : [x, box.height - y];
  return { x: px + box.x, y: py + box.y, rotate: degrees(rotation) };
}

/** Inspect the original page before removing any of its contents. */
export function inspectTableTail(page: mupdf.PDFPage, cut: number) {
  const [ox, oy, right, bottom] = page.getBounds();
  const annotations = [...page.getAnnotations(), ...page.getWidgets()];
  try {
    if (annotations.some((a) => a.getRect()[3] - oy > cut))
      throw new Error(
        "Le contenu à décaler contient des annotations ou des formulaires. Leur déplacement automatique n’est pas pris en charge.",
      );
  } finally {
    annotations.forEach((a) => a.destroy());
  }
  const intervals: [number, number][] = [];
  const text = page.toStructuredText("preserve-images");
  const add = (top: number, end: number) => {
    if (end > cut) intervals.push([top, end]);
  };
  try {
    text.walk({
      onChar(_char, _origin, _font, _size, quad) {
        const ys = [quad[1], quad[3], quad[5], quad[7]].map((y) => y - oy);
        add(Math.min(...ys), Math.max(...ys));
      },
      onImageBlock(bounds) {
        add(bounds[1] - oy, bounds[3] - oy);
      },
    });
  } finally {
    text.destroy();
  }
  if (intervals.some(([top]) => top < cut - 0.5))
    throw new Error(
      "Un texte ou une image traverse le bord inférieur du tableau. Ajustez la sélection avant de décaler la suite.",
    );
  const scale = Math.min(1, 2048 / (right - ox), 2048 / (bottom - oy));
  const pixmap = page.toPixmap(
    mupdf.Matrix.scale(scale, scale),
    mupdf.ColorSpace.DeviceRGB,
    false,
    true,
  );
  const inkRows = new Set<number>();
  const pixelY = pixmap.getY();
  let end = cut;
  try {
    const pixels = pixmap.getPixels();
    for (
      let y = Math.max(0, Math.floor((oy + cut) * scale - pixmap.getY()));
      y < pixmap.getHeight();
      y++
    ) {
      for (let x = 0; x < pixmap.getWidth(); x++) {
        const offset = y * pixmap.getStride() + x * 3;
        if (
          pixels[offset] < 245 ||
          pixels[offset + 1] < 245 ||
          pixels[offset + 2] < 245
        ) {
          inkRows.add(y);
          end = (y + pixmap.getY() + 1) / scale - oy;
          break;
        }
      }
    }
    end = Math.min(
      bottom - oy,
      intervals.reduce((result, i) => Math.max(result, i[1]), end),
    );
    return {
      cut,
      end,
      split(start: number, available: number) {
        if (end - start <= available) return end;
        for (let y = Math.floor(start + available); y > start + 1; y--) {
          if (
            !inkRows.has(Math.floor((oy + y) * scale - pixelY)) &&
            !intervals.some(([a, b]) => a < y + 1 && b > y - 1)
          )
            return y;
        }
        return start;
      },
    };
  } finally {
    pixmap.destroy();
  }
}

/** Embed a normalized page so clipped portions keep selectable vector text. */
export async function tableTailSource(original: Uint8Array, index: number) {
  const source = await PDFDocument.load(original),
    raw = source.getPage(index),
    box = raw.getCropBox(),
    rotation = raw.getRotation().angle;
  const normalized = await PDFDocument.create();
  const embedded = await normalized.embedPage(raw, {
    left: box.x,
    bottom: box.y,
    right: box.x + box.width,
    top: box.y + box.height,
  });
  const width = rotation % 180 ? box.height : box.width,
    height = rotation % 180 ? box.width : box.height;
  const page = normalized.addPage([width, height]);
  page.drawPage(embedded, {
    x: rotation === 180 ? box.width : rotation === 270 ? box.height : 0,
    y: rotation === 90 ? box.width : rotation === 180 ? box.height : 0,
    rotate: degrees(rotation === 90 ? -90 : rotation === 270 ? 90 : rotation),
  });
  const saved = await PDFDocument.load(await normalized.save());
  return { page: saved.getPage(0), width, height };
}
