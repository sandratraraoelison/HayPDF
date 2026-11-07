import type { RasterLine } from "../domain/rasterText";
import { layoutRasterText, rasterTextWidth } from "../domain/rasterText";

export function captureRasterLine(
  canvas: HTMLCanvasElement,
  line: {
    text: string;
    bbox: { x0: number; y0: number; x1: number; y1: number };
    words: {
      symbols: {
        text: string;
        confidence: number;
        bbox: { x0: number; y0: number; x1: number; y1: number };
      }[];
    }[];
  },
): RasterLine | undefined {
  const b = line.bbox;
  const width = b.x1 - b.x0,
    height = b.y1 - b.y0;
  if (width < 1 || height < 1 || height > 300) return;
  const ctx = canvas.getContext("2d")!;
  // Estimate a uniform background from the border, including gray UI panels.
  if (
    b.x0 < 2 ||
    b.y0 < 2 ||
    b.x1 + 2 >= canvas.width ||
    b.y1 + 2 >= canvas.height
  )
    return;
  const border = ctx.getImageData(b.x0 - 2, b.y0 - 2, width + 4, height + 4);
  const samples: number[][] = [];
  for (let y = 0; y < border.height; y++)
    for (let x = 0; x < border.width; x++) {
      if (x >= 2 && x < width + 2 && y >= 2 && y < height + 2) continue;
      const i = (y * border.width + x) * 4;
      samples.push([border.data[i], border.data[i + 1], border.data[i + 2]]);
    }
  const rgb = [0, 1, 2].map(
    (channel) =>
      samples.map((s) => s[channel]).sort((a, b) => a - b)[
        Math.floor(samples.length / 2)
      ],
  );
  if (
    samples.filter((s) => s.some((v, c) => Math.abs(v - rgb[c]) > 12)).length >
    samples.length * 0.08
  )
    return;
  const background =
    "#" + rgb.map((v) => v.toString(16).padStart(2, "0")).join("");
  // Scan the full line-height band, including its border. Stop at the first
  // non-background pixel (text, rules, icons or a change of background).
  const band = ctx.getImageData(
    b.x1,
    b.y0 - 2,
    canvas.width - b.x1,
    height + 4,
  );
  let extra = 0;
  for (let x = 0; x < band.width; x++) {
    let free = true;
    for (let y = 0; y < band.height && free; y++) {
      const index = (y * band.width + x) * 4;
      free = rgb.every(
        (value, channel) => Math.abs(band.data[index + channel] - value) <= 12,
      );
    }
    if (!free) break;
    extra++;
  }
  const crop = (x: number, y: number, w: number, h: number) => {
    const output = document.createElement("canvas");
    output.width = w;
    output.height = h;
    output.getContext("2d")!.drawImage(canvas, x, y, w, h, 0, 0, w, h);
    return output.toDataURL("image/png");
  };
  return {
    background,
    original: line.text.trim(),
    data: crop(b.x0, b.y0, width, height),
    width,
    availableWidth: width + Math.max(0, extra - 2),
    height,
    glyphs: line.words
      .flatMap((w) => w.symbols)
      .filter(
        (s) =>
          s.confidence >= 80 &&
          Array.from(s.text).length === 1 &&
          s.bbox.x1 > s.bbox.x0 &&
          s.bbox.y1 > s.bbox.y0,
      )
      .map((s) => ({
        text: s.text,
        data: crop(
          s.bbox.x0,
          s.bbox.y0,
          s.bbox.x1 - s.bbox.x0,
          s.bbox.y1 - s.bbox.y0,
        ),
        width: s.bbox.x1 - s.bbox.x0,
        height: s.bbox.y1 - s.bbox.y0,
        top: s.bbox.y0 - b.y0,
      })),
  };
}
export async function renderRasterText(
  text: string,
  line: RasterLine,
  others: RasterLine[],
) {
  if (text === line.original) return line.data;
  const placed = layoutRasterText(text, line, others);
  const canvas = document.createElement("canvas");
  canvas.width = rasterTextWidth(text, line, others);
  canvas.height = line.height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = line.background ?? "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (const { glyph, x } of placed) {
    const image = new Image();
    image.src = glyph.data;
    await image.decode();
    ctx.drawImage(image, x, Math.min(glyph.top, line.height - glyph.height));
  }
  return canvas.toDataURL("image/png");
}
