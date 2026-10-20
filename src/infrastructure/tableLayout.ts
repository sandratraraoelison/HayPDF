import type { PDFFont } from "pdf-lib";
import * as mupdf from "mupdf";
import type { TableDraft } from "../domain/table";
import { tableTextLayout } from "../domain/tableTextLayout";

/** Prefer fewer wraps; grow right into free space and paginate below the table. */
export function fitTableToPage(
  page: mupdf.PDFPage,
  table: TableDraft,
  font: PDFFont,
) {
  const { area, cells } = table;
  const [ox, oy, right, bottom] = page.getBounds();
  const maxWidth = Math.max(area.width, right - ox - area.x - 1);
  const fontSize = 10;
  const baseHeight = Math.max(19, area.height / cells.length);
  const minimumWidth = Math.max(area.width, cells[0].length * 24);
  const measure = (text: string) => {
    try {
      return font.widthOfTextAtSize(text, fontSize);
    } catch {
      throw new Error(
        "Certains caractères ne sont pas pris en charge par la police du tableau.",
      );
    }
  };
  let best:
    | {
        widths: number[];
        wrapped: string[][][];
        rowHeights: number[];
        fontSize: number;
        breaks: number;
        splits: number;
      }
    | undefined;
  let pixmap: mupdf.Pixmap | undefined;
  const widgets = [...page.getAnnotations(), ...page.getWidgets()];
  try {
    // Try the existing width first, then progressively widen up to the page edge.
    for (
      let width = minimumWidth;
      width <= maxWidth + 0.01;
      width = Math.min(maxWidth, width + 12)
    ) {
      const { widths, wrapped, breaks, splits } = tableTextLayout(
        cells,
        width,
        measure,
      );
      const rowHeights = wrapped.map((row, r) =>
        Math.max(
          table.rowHeights?.[r] ?? baseHeight,
          19,
          ...row.map((lines) => lines.length * fontSize * 1.2 + 7),
        ),
      );
      const height = rowHeights.reduce((a, b) => a + b, 0);
      let blocked = rowHeights.some((h) => h > bottom - oy - 48);
      const grows = width > area.width + 0.01 || height > area.height + 0.01;
      if (!blocked && grows) {
        // Include annotations/forms, even when their visible appearance is empty.
        blocked = widgets.some((widget) => {
          const [x1, y1, x2, y2] = widget.getRect();
          return (
            x2 > ox + area.x &&
            y2 > oy + area.y &&
            x1 < ox + area.x + width &&
            y1 < oy + area.y + height
          );
        });
        const scale = Math.min(1, 2048 / (right - ox), 2048 / (bottom - oy));
        pixmap ??= page.toPixmap(
          mupdf.Matrix.scale(scale, scale),
          mupdf.ColorSpace.DeviceRGB,
          false,
          true,
        );
        const pixels = pixmap.getPixels(),
          stride = pixmap.getStride();
        for (
          let py = Math.max(
            0,
            Math.floor((oy + area.y) * scale - pixmap.getY()),
          );
          py <
            Math.min(
              pixmap.getHeight(),
              Math.ceil((oy + area.y + height) * scale - pixmap.getY()),
            ) && !blocked;
          py++
        ) {
          for (
            let px = Math.max(
              0,
              Math.floor((ox + area.x) * scale - pixmap.getX()),
            );
            px <
            Math.min(
              pixmap.getWidth(),
              Math.ceil((ox + area.x + width) * scale - pixmap.getX()),
            );
            px++
          ) {
            const x = (px + pixmap.getX() + 0.5) / scale - ox;
            const y = (py + pixmap.getY() + 0.5) / scale - oy;
            if (y > area.y + area.height + 1 || x <= area.x + area.width + 1)
              continue;
            const offset = py * stride + px * 3;
            if (
              pixels[offset] < 245 ||
              pixels[offset + 1] < 245 ||
              pixels[offset + 2] < 245
            ) {
              blocked = true;
              break;
            }
          }
        }
      }
      if (
        !blocked &&
        (!best ||
          splits < best.splits ||
          (splits === best.splits && breaks < best.breaks))
      )
        best = { widths, rowHeights, wrapped, fontSize, breaks, splits };
      if (best && best.breaks === 0) return best;
      if (width >= maxWidth) break;
    }
    if (best) return best;
    throw new Error(
      "Le contenu dépasse l’espace libre disponible sur la page. Réduisez le texte ou le nombre de lignes et colonnes.",
    );
  } finally {
    pixmap?.destroy();
    for (const widget of widgets) widget.destroy();
  }
}
