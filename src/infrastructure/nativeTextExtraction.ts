import type { NativeText } from "../domain/document";
/** Keep independently styled runs separate, including bold labels on the same line. */
export async function extractNativeText(
  bytes: Uint8Array,
  pageIndex: number,
  rotation: number,
): Promise<NativeText[]> {
  const mupdf = await import("mupdf");
  const doc = mupdf.Document.openDocument(bytes, "application/pdf").asPDF();
  if (!doc) throw new Error("Invalid PDF");
  try {
    const object = doc.findPage(pageIndex);
    object.put("Rotate", rotation);
    const page = doc.loadPage(pageIndex);
    try {
      const [originX, originY] = page.getBounds();
      const text = page.toStructuredText("preserve-whitespace");
      const runs: NativeText[] = [];
      let run: NativeText | undefined,
        horizontal = true;
      const flush = () => {
        if (run?.text.trim()) runs.push(run);
        run = undefined;
      };
      try {
        text.walk({
          beginLine: (_bbox, mode, direction) => {
            flush();
            horizontal =
              mode === 0 &&
              direction[0] > 0.99 &&
              Math.abs(direction[1]) < 0.01;
          },
          endLine: flush,
          onChar: (char, origin, font, size, quad, color) => {
            if (!horizontal) return;
            const xs = [quad[0], quad[2], quad[4], quad[6]],
              ys = [quad[1], quad[3], quad[5], quad[7]];
            const x = Math.min(...xs) - originX,
              y = Math.min(...ys) - originY,
              right = Math.max(...xs) - originX,
              bottom = Math.max(...ys) - originY;
            const family = font.isMono()
              ? "Courier"
              : font.isSerif()
                ? "TimesRoman"
                : "Helvetica";
            const rgb =
              color.length === 1 ? [color[0], color[0], color[0]] : color;
            const hex =
              "#" +
              rgb
                .slice(0, 3)
                .map((c) =>
                  Math.round(Math.max(0, Math.min(1, c)) * 255)
                    .toString(16)
                    .padStart(2, "0"),
                )
                .join("");
            const bold = font.isBold(),
              italic = font.isItalic();
            const fontName = font.getName();
            if (
              run &&
              (run.font !== family ||
                run.fontName !== fontName ||
                run.bold !== bold ||
                run.italic !== italic ||
                run.color !== hex ||
                Math.abs(run.size - size) > 0.01 ||
                Math.abs(
                  run.y + (run.baselineOffset ?? 0) - (origin[1] - originY),
                ) > 0.1 ||
                x > run.x + run.width + size)
            )
              flush();
            if (!run)
              run = {
                text: "",
                x,
                y,
                width: right - x,
                height: bottom - y,
                size,
                font: family,
                fontName,
                color: hex,
                bold,
                italic,
                baselineOffset: origin[1] - originY - y,
              };
            run.text += char;
            const newY = Math.min(run.y, y),
              baseline = run.y + (run.baselineOffset ?? 0);
            run.width = Math.max(run.x + run.width, right) - run.x;
            run.height = Math.max(run.y + run.height, bottom) - newY;
            run.y = newY;
            run.baselineOffset = baseline - newY;
          },
        });
        flush();
        const right = page.getBounds()[2] - originX - 12;
        for (const run of runs) {
          const baseline = run.y + (run.baselineOffset ?? run.size);
          const next = runs
            .filter(
              (other) =>
                other !== run &&
                other.x >= run.x + run.width - 0.1 &&
                Math.abs(
                  other.y + (other.baselineOffset ?? other.size) - baseline,
                ) < 0.6,
            )
            .sort((a, b) => a.x - b.x)[0];
          run.availableWidth = Math.max(
            run.width,
            (next ? Math.min(right, next.x - 2) : right) - run.x,
          );
        }
        return runs;
      } finally {
        text.destroy();
      }
    } finally {
      page.destroy();
    }
  } finally {
    doc.destroy();
  }
}
