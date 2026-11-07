export interface RasterGlyph {
  text: string;
  data: string;
  width: number;
  height: number;
  top: number;
}
export interface RasterLine {
  background?: string;
  original: string;
  data: string;
  width: number;
  height: number;
  glyphs: RasterGlyph[];
  availableWidth?: number;
}
/** Exact, case-sensitive reuse; never substitute a different character or font. */
export function layoutRasterText(
  text: string,
  line: RasterLine,
  others: RasterLine[],
) {
  if (text.includes("\n") || text.length > 500)
    throw new Error("RASTER_LENGTH");
  const placed: { glyph: RasterGlyph; x: number }[] = [];
  let x = 0;
  const gap = Math.max(1, line.height * 0.08);
  for (const char of Array.from(text)) {
    if (char === " ") {
      x += line.height * 0.33;
      continue;
    }
    const glyph = [
      ...line.glyphs,
      ...others
        .filter(
          (l) =>
            Math.abs(l.height / line.height - 1) < 0.15 &&
            (l.background ?? "#ffffff") === (line.background ?? "#ffffff"),
        )
        .flatMap((l) => l.glyphs),
    ].find((g) => g.text === char);
    if (!glyph) throw new Error("RASTER_MISSING: " + char);
    placed.push({ glyph, x });
    x += glyph.width + gap;
  }
  if (x - gap > (line.availableWidth ?? line.width))
    throw new Error("RASTER_OVERFLOW");
  return placed;
}

export function rasterTextWidth(
  text: string,
  line: RasterLine,
  others: RasterLine[],
) {
  if (text === line.original) return line.width;
  const placed = layoutRasterText(text, line, others);
  const last = placed.at(-1);
  return Math.max(line.width, Math.ceil(last ? last.x + last.glyph.width : 0));
}
