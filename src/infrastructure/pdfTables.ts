import * as mupdf from "mupdf";
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";
import type { DocumentModel } from "../domain/document";
import type { Rect } from "../domain/imageLayout";
import type { TableDraft } from "../domain/table";
import { exportDocument, readDocument } from "./pdfEngine";
import { fitTableToPage } from "./tableLayout";
import {
  inspectTableTail,
  tableTailSource,
  tablePoint,
} from "./tablePagination";

export async function detectTable(
  doc: DocumentModel,
  index: number,
  selection: Rect,
): Promise<TableDraft> {
  const bytes = await exportDocument(doc);
  const pdf = mupdf.Document.openDocument(bytes, "application/pdf");
  const page = pdf.loadPage(index);
  const [ox, oy] = page.getBounds();
  const horizontal: { x1: number; x2: number; y: number }[] = [],
    vertical: { y1: number; y2: number; x: number }[] = [];
  const inside = (x: number, y: number) =>
    x >= selection.x - 2 &&
    x <= selection.x + selection.width + 2 &&
    y >= selection.y - 2 &&
    y <= selection.y + selection.height + 2;
  const device = new mupdf.Device({
    fillPath(path, _evenOdd, matrix) {
      const points: number[][] = [];
      let curved = false;
      const point = (x: number, y: number) =>
        points.push([
          matrix[0] * x + matrix[2] * y + matrix[4] - ox,
          matrix[1] * x + matrix[3] * y + matrix[5] - oy,
        ]);
      path.walk({
        moveTo: point,
        lineTo: point,
        curveTo() {
          curved = true;
        },
      });
      if (curved || points.length < 3) return;
      const xs = points.map((p) => p[0]),
        ys = points.map((p) => p[1]);
      const x1 = Math.min(...xs),
        x2 = Math.max(...xs),
        y1 = Math.min(...ys),
        y2 = Math.max(...ys);
      if (!inside(x1, y1) || !inside(x2, y2)) return;
      if (x2 - x1 <= 2 && y2 - y1 > 8)
        vertical.push({ x: (x1 + x2) / 2, y1, y2 });
      if (y2 - y1 <= 2 && x2 - x1 > 8)
        horizontal.push({ y: (y1 + y2) / 2, x1, x2 });
    },
    strokePath(path, _stroke, matrix) {
      let previous: [number, number] = [0, 0],
        first = previous;
      const transform = (x: number, y: number): [number, number] => [
        matrix[0] * x + matrix[2] * y + matrix[4] - ox,
        matrix[1] * x + matrix[3] * y + matrix[5] - oy,
      ];
      const line = (next: [number, number]) => {
        const [x1, y1] = previous,
          [x2, y2] = next;
        if (inside(x1, y1) && inside(x2, y2)) {
          if (Math.abs(y1 - y2) < 0.5 && Math.abs(x1 - x2) > 8)
            horizontal.push({
              x1: Math.min(x1, x2),
              x2: Math.max(x1, x2),
              y: (y1 + y2) / 2,
            });
          if (Math.abs(x1 - x2) < 0.5 && Math.abs(y1 - y2) > 8)
            vertical.push({
              y1: Math.min(y1, y2),
              y2: Math.max(y1, y2),
              x: (x1 + x2) / 2,
            });
        }
        previous = next;
      };
      path.walk({
        moveTo(x, y) {
          first = previous = transform(x, y);
        },
        lineTo(x, y) {
          line(transform(x, y));
        },
        curveTo() {
          previous = [NaN, NaN];
        },
        closePath() {
          line(first);
        },
      });
    },
  });
  try {
    page.runPageContents(device, mupdf.Matrix.identity);
    device.close();
    const unique = (values: number[]) =>
      values.sort((a, b) => a - b).filter((v, i, a) => !i || v - a[i - 1] > 1);
    const xs = unique(vertical.map((l) => l.x)),
      ys = unique(horizontal.map((l) => l.y));
    if (xs.length < 2 || ys.length < 2 || xs.length > 21 || ys.length > 1001)
      throw new Error(
        "Sélectionnez un seul tableau avec une grille régulière et du texte sélectionnable.",
      );
    // Every divider must cover the entire grid; reject merged cells and partial selections.
    const covers = (segments: number[][], start: number, end: number) => {
      let cursor = start;
      for (const [a, b] of segments.sort((a, b) => a[0] - b[0])) {
        if (a > cursor + 2) return false;
        cursor = Math.max(cursor, b);
      }
      return cursor >= end - 2;
    };
    if (
      xs.some(
        (x) =>
          !covers(
            vertical
              .filter((l) => Math.abs(l.x - x) < 1)
              .map((l) => [l.y1, l.y2]),
            ys[0],
            ys.at(-1)!,
          ),
      ) ||
      ys.some(
        (y) =>
          !covers(
            horizontal
              .filter((l) => Math.abs(l.y - y) < 1)
              .map((l) => [l.x1, l.x2]),
            xs[0],
            xs.at(-1)!,
          ),
      )
    )
      throw new Error(
        "Les cellules fusionnées et les grilles incomplètes ne sont pas prises en charge.",
      );
    const cells = Array.from({ length: ys.length - 1 }, () =>
      Array.from({ length: xs.length - 1 }, () => ""),
    );
    const text = page.toStructuredText("preserve-whitespace");
    let textCount = 0;
    try {
      text.walk({
        onChar(char, _origin, _font, _size, quad) {
          const x = (quad[0] + quad[2] + quad[4] + quad[6]) / 4 - ox,
            y = (quad[1] + quad[3] + quad[5] + quad[7]) / 4 - oy;
          const col = xs.findIndex(
            (v, i) => i < xs.length - 1 && x >= v && x < xs[i + 1],
          );
          const row = ys.findIndex(
            (v, i) => i < ys.length - 1 && y >= v && y < ys[i + 1],
          );
          if (row >= 0 && col >= 0) {
            cells[row][col] += char;
            textCount++;
          }
        },
        endLine() {
          for (const row of cells)
            for (let c = 0; c < row.length; c++)
              if (row[c] && !row[c].endsWith("\n")) row[c] += "\n";
        },
      });
    } finally {
      text.destroy();
    }
    if (!textCount)
      throw new Error(
        "Ce tableau ne contient pas de texte sélectionnable. Les tableaux scannés nécessitent une transcription manuelle hors de cet outil.",
      );
    return {
      area: {
        x: xs[0],
        y: ys[0],
        width: xs.at(-1)! - xs[0],
        height: ys.at(-1)! - ys[0],
      },
      widths: xs.slice(1).map((x, i) => x - xs[i]),
      rowHeights: ys.slice(1).map((y, i) => y - ys[i]),
      cells: cells.map((row) => row.map((v) => v.trim())),
    };
  } finally {
    device.destroy();
    page.destroy();
    pdf.destroy();
  }
}

/** Rebuild with content-aware widths and flow subsequent page content downward. */
export async function replaceTable(
  doc: DocumentModel,
  index: number,
  table: TableDraft,
): Promise<DocumentModel> {
  const { area, cells } = table;
  let widths = table.widths;
  if (
    !cells.length ||
    cells.length > 1000 ||
    !widths.length ||
    widths.length > 20 ||
    cells.some((r) => r.length !== widths.length) ||
    (table.rowHeights !== undefined &&
      (table.rowHeights.length !== cells.length ||
        table.rowHeights.some((h) => !Number.isFinite(h) || h <= 0))) ||
    !Number.isFinite(area.x + area.y + area.width + area.height) ||
    area.x < 0 ||
    area.y < 0 ||
    area.width <= 0 ||
    area.height <= 0 ||
    widths.some((w) => !Number.isFinite(w) || w <= 0) ||
    Math.abs(widths.reduce((a, b) => a + b, 0) - area.width) > 0.1
  )
    throw new Error(
      "Le tableau est trop dense : au moins 14 points par ligne et 24 points par colonne sont nécessaires.",
    );
  const original = await exportDocument(doc);
  // Validate encoding and text fit before altering any PDF content.
  const metrics = await PDFDocument.create(),
    font = await metrics.embedFont(StandardFonts.Helvetica);
  let layout: ReturnType<typeof fitTableToPage>;
  const source = mupdf.Document.openDocument(
    original,
    "application/pdf",
  ).asPDF()!;
  let cleaned: Uint8Array;
  let tail: ReturnType<typeof inspectTableTail> | undefined;
  try {
    const page = source.loadPage(index) as mupdf.PDFPage;
    try {
      const [ox, oy, right, bottom] = page.getBounds();
      if (
        area.x + area.width > right - ox + 0.1 ||
        area.y + area.height > bottom - oy + 0.1
      )
        throw new Error("Zone hors de la page / Area outside page");
      layout = fitTableToPage(page, table, font);
      widths = layout.widths;
      if (layout.rowHeights.reduce((a, b) => a + b, 0) > area.height + 0.01)
        tail = inspectTableTail(page, area.y + area.height + 1);
      const annotation = page.createAnnotation("Redact");
      try {
        annotation.setRect([
          ox + area.x - 0.5,
          oy + area.y - 0.5,
          ox + area.x + area.width + 0.5,
          oy + area.y + area.height + 0.5,
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
      if (tail && tail.end > tail.cut) {
        const removal = page.createAnnotation("Redact");
        try {
          removal.setRect([ox, oy + tail.cut, right, bottom]);
          removal.applyRedaction(
            0,
            mupdf.PDFPage.REDACT_IMAGE_PIXELS,
            mupdf.PDFPage.REDACT_LINE_ART_REMOVE_IF_COVERED,
            mupdf.PDFPage.REDACT_TEXT_REMOVE,
          );
        } finally {
          removal.destroy();
        }
      }
      const buffer = source.saveToBuffer("garbage=4,compress");
      try {
        cleaned = buffer.asUint8Array().slice();
      } finally {
        buffer.destroy();
      }
    } finally {
      page.destroy();
    }
  } finally {
    source.destroy();
  }
  const pdf = await PDFDocument.load(cleaned);
  let page = pdf.getPage(index),
    pageIndex = index;
  const box = page.getCropBox(),
    rotation = page.getRotation().angle;
  const visualHeight = rotation % 180 ? box.width : box.height;
  const face = await pdf.embedFont(StandardFonts.Helvetica);
  const { wrapped, rowHeights, fontSize } = layout!;
  let top = area.y;
  function drawRow(r: number) {
    let left = area.x;
    for (let c = 0; c < widths.length; c++) {
      page.drawRectangle({
        ...tablePoint(page, left, top + rowHeights[r]),
        width: widths[c],
        height: rowHeights[r],
        color:
          r === 0
            ? rgb(0.1, 0.3, 0.42)
            : r % 2
              ? rgb(0.96, 0.97, 0.98)
              : rgb(1, 1, 1),
        borderColor: rgb(0.68, 0.74, 0.79),
        borderWidth: 0.6,
      });
      wrapped[r][c].forEach((line, n) =>
        page.drawText(line, {
          ...tablePoint(
            page,
            left + 4,
            top + 3 + fontSize + n * fontSize * 1.2,
          ),
          font: face,
          size: fontSize,
          color: r === 0 ? rgb(1, 1, 1) : rgb(0.1, 0.12, 0.15),
        }),
      );
      left += widths[c];
    }
    top += rowHeights[r];
  }
  function nextPage() {
    page = pdf.insertPage(++pageIndex, [box.width, box.height]);
    page.setRotation(degrees(rotation));
    top = 24;
  }
  for (let r = 0; r < cells.length; r++) {
    if (top + rowHeights[r] > visualHeight - 24 && tail) {
      nextPage();
      if (r > 0 && rowHeights[0] + rowHeights[r] <= visualHeight - 48)
        drawRow(0);
    }
    drawRow(r);
  }
  if (tail && tail.end > tail.cut) {
    const originalPage = await tableTailSource(original, index);
    let start = tail.cut;
    top += 1;
    while (start < tail.end - 0.01) {
      const end = tail.split(start, visualHeight - 24 - top);
      if (end <= start) {
        if (top <= 24)
          throw new Error(
            "Un bloc du contenu suivant est trop haut pour une page. Son déplacement automatique n’est pas possible.",
          );
        nextPage();
        continue;
      }
      const clipped = await pdf.embedPage(originalPage.page, {
        left: 0,
        right: originalPage.width,
        bottom: originalPage.height - end,
        top: originalPage.height - start,
      });
      page.drawPage(clipped, { ...tablePoint(page, 0, top + end - start) });
      top += end - start;
      start = end;
      if (start < tail.end - 0.01) nextPage();
    }
  }
  return readDocument(await pdf.save(), doc.name);
}
