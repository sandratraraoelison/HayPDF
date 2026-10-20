import type { Rect } from "./imageLayout";
export interface TableDraft {
  area: Rect;
  widths: number[];
  rowHeights?: number[];
  cells: string[][];
}
export function changeTableRow(
  table: TableDraft,
  index: number,
  insert: boolean,
): TableDraft {
  const cells = table.cells.map((row) => [...row]);
  const rowHeights = table.rowHeights
    ? [...table.rowHeights]
    : cells.map(() => table.area.height / cells.length);
  if (insert) {
    rowHeights.splice(
      index,
      0,
      rowHeights[Math.min(index, rowHeights.length - 1)],
    );
    cells.splice(
      index,
      0,
      table.widths.map(() => ""),
    );
  } else if (cells.length > 1) {
    cells.splice(index, 1);
    rowHeights.splice(index, 1);
  }
  return { ...table, cells, rowHeights };
}
export function changeTableColumn(
  table: TableDraft,
  index: number,
  insert: boolean,
): TableDraft {
  if (!insert && table.widths.length === 1) return table;
  const widths = [...table.widths];
  if (insert) widths.splice(index, 0, table.area.width / table.widths.length);
  else widths.splice(index, 1);
  const total = widths.reduce((a, b) => a + b, 0);
  return {
    ...table,
    widths: widths.map((w) => (w * table.area.width) / total),
    cells: table.cells.map((row) => {
      const next = [...row];
      if (insert) next.splice(index, 0, "");
      else next.splice(index, 1);
      return next;
    }),
  };
}
