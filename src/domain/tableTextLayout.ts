/** Allocate space to the text rather than keeping the old column proportions. */
export function tableTextLayout(
  cells: string[][],
  totalWidth: number,
  measure: (text: string) => number,
) {
  const count = cells[0].length;
  const preferred = Array.from({ length: count }, (_, c) =>
    Math.max(
      24,
      ...cells.flatMap((row) =>
        row[c].split(/\r?\n/).map((line) => measure(line) + 8),
      ),
    ),
  );
  const words = Array.from({ length: count }, (_, c) =>
    Math.max(
      24,
      ...cells.flatMap((row) =>
        (row[c].match(/\S+/g) ?? []).map((word) => measure(word) + 8),
      ),
    ),
  );
  const minimum =
    words.reduce((a, b) => a + b, 0) <= totalWidth
      ? words
      : words.map(() => 24);
  const minimumTotal = minimum.reduce((a, b) => a + b, 0);
  const need = preferred.map((width, c) => Math.max(0, width - minimum[c]));
  const needTotal = need.reduce((a, b) => a + b, 0);
  const extra = Math.max(0, totalWidth - minimumTotal);
  const widths = minimum.map(
    (width, c) =>
      width + (needTotal ? (extra * need[c]) / needTotal : extra / count),
  );
  let breaks = 0,
    splits = 0;
  const wrapped = cells.map((row) =>
    row.map((value, c) =>
      value.split(/\r?\n/).flatMap((paragraph) => {
        const lines: string[] = [];
        let line = "";
        for (const word of paragraph.match(/\S+/g) ?? []) {
          const candidate = line ? `${line} ${word}` : word;
          if (measure(candidate) <= widths[c] - 8 + 0.001) {
            line = candidate;
            continue;
          }
          if (line) {
            lines.push(line);
            breaks++;
            line = "";
          }
          for (const char of word) {
            if (line && measure(line + char) > widths[c] - 8 + 0.001) {
              lines.push(line);
              splits++;
              breaks++;
              line = "";
            }
            line += char;
          }
        }
        lines.push(line);
        return lines;
      }),
    ),
  );
  return {
    widths,
    wrapped,
    breaks,
    splits,
    preferredWidth: preferred.reduce((a, b) => a + b, 0),
  };
}
