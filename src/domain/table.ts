import type { Rect } from "./imageLayout";
export interface TableDraft {
  area: Rect;
  widths: number[];
  cells: string[][];
}
export function changeTableRow(
  table: TableDraft,
  index: number,
  insert: boolean,
): TableDraft {
  const cells = table.cells.map((row) => [...row]);
  if (insert)
    cells.splice(
      index,
      0,
      table.widths.map(() => ""),
    );
  else if (cells.length > 1) cells.splice(index, 1);
  return { ...table, cells };
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
