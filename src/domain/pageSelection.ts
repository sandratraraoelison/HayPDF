/** User page numbers are one-based; engine indices are zero-based. */
export function parsePageSelection(value: string, pageCount: number): number[] {
  const result: number[] = [];
  if (!value.trim())
    return Array.from({ length: pageCount }, (_, index) => index);
  for (const part of value.split(",")) {
    const match = /^\s*(\d+)\s*(?:-\s*(\d+)\s*)?$/.exec(part);
    if (!match) throw new Error("INVALID_PAGE_RANGE");
    const start = Number(match[1]),
      end = Number(match[2] ?? match[1]);
    if (start < 1 || end < start || end > pageCount)
      throw new Error("INVALID_PAGE_RANGE");
    for (let n = start; n <= end; n++)
      if (!result.includes(n - 1)) result.push(n - 1);
  }
  if (!result.length) throw new Error("INVALID_PAGE_RANGE");
  return result;
}

export function splitPageGroups(value: string, pageCount: number): number[][] {
  if (!value.trim()) return Array.from({ length: pageCount }, (_, i) => [i]);
  const groups = value.split(";").map((part) => {
    if (!part.trim()) throw new Error("INVALID_PAGE_RANGE");
    return parsePageSelection(part, pageCount);
  });
  return groups;
}
