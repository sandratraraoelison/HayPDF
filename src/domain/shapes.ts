export const shapeOptions = [
  { id: "rectangle", label: "Rectangle" },
  { id: "rounded", label: "Rectangle arrondi" },
  { id: "ellipse", label: "Ellipse" },
  { id: "triangle", label: "Triangle" },
  { id: "diamond", label: "Losange" },
  { id: "pentagon", label: "Pentagone" },
  { id: "hexagon", label: "Hexagone" },
  { id: "star", label: "Étoile" },
  { id: "line", label: "Ligne" },
  { id: "arrow", label: "Flèche" },
  { id: "double-arrow", label: "Double flèche" },
  { id: "freehand", label: "Tracé libre" },
] as const;
export type ShapeKind = (typeof shapeOptions)[number]["id"];
export type StrokePoint = { x: number; y: number };

export function normalizeStroke(points: StrokePoint[]) {
  if (points.length < 2) return undefined;
  const xs = points.map((p) => p.x),
    ys = points.map((p) => p.y);
  const x = Math.min(...xs) - 1,
    y = Math.min(...ys) - 1;
  const width = Math.max(...xs) - x + 1,
    height = Math.max(...ys) - y + 1;
  if (width < 3 && height < 3) return undefined;
  return {
    x,
    y,
    width,
    height,
    points: points.map((p) => ({
      x: (p.x - x) / width,
      y: (p.y - y) / height,
    })),
  };
}

/** Coordinates use the editor's top-left origin, in PDF points. */
export function shapePath(
  shape: ShapeKind,
  width: number,
  height: number,
  points?: StrokePoint[],
): string {
  if (shape === "freehand") {
    const stroke = points ?? [
      { x: 0.05, y: 0.7 },
      { x: 0.25, y: 0.2 },
      { x: 0.5, y: 0.8 },
      { x: 0.7, y: 0.3 },
      { x: 0.95, y: 0.5 },
    ];
    return stroke
      .map((p, i) => `${i ? "L" : "M"} ${p.x * width} ${p.y * height}`)
      .join(" ");
  }
  const w = Math.max(2, width),
    h = Math.max(2, height);
  const l = 1,
    r = w - 1,
    t = 1,
    b = h - 1,
    cx = w / 2,
    cy = h / 2;
  const polygon = (points: number[][]) =>
    points.map(([x, y], i) => `${i ? "L" : "M"} ${x} ${y}`).join(" ") + " Z";
  if (shape === "ellipse") {
    const k = 0.5522847498,
      rx = cx - 1,
      ry = cy - 1;
    return `M ${cx} ${t} C ${cx + rx * k} ${t} ${r} ${cy - ry * k} ${r} ${cy} C ${r} ${cy + ry * k} ${cx + rx * k} ${b} ${cx} ${b} C ${cx - rx * k} ${b} ${l} ${cy + ry * k} ${l} ${cy} C ${l} ${cy - ry * k} ${cx - rx * k} ${t} ${cx} ${t} Z`;
  }
  if (shape === "rounded") {
    const a = Math.min(w, h) * 0.18;
    return `M ${l + a} ${t} L ${r - a} ${t} Q ${r} ${t} ${r} ${t + a} L ${r} ${b - a} Q ${r} ${b} ${r - a} ${b} L ${l + a} ${b} Q ${l} ${b} ${l} ${b - a} L ${l} ${t + a} Q ${l} ${t} ${l + a} ${t} Z`;
  }
  if (shape === "triangle")
    return polygon([
      [cx, t],
      [r, b],
      [l, b],
    ]);
  if (shape === "diamond")
    return polygon([
      [cx, t],
      [r, cy],
      [cx, b],
      [l, cy],
    ]);
  if (["pentagon", "hexagon", "star"].includes(shape)) {
    const n = shape === "pentagon" ? 5 : shape === "hexagon" ? 6 : 10;
    return polygon(
      Array.from({ length: n }, (_, i) => {
        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
        const radius = shape === "star" && i % 2 ? 0.42 : 1;
        return [
          cx + (cx - 1) * Math.cos(angle) * radius,
          cy + (cy - 1) * Math.sin(angle) * radius,
        ];
      }),
    );
  }
  if (["line", "arrow", "double-arrow"].includes(shape)) {
    const a = Math.min(w * 0.22, h * 0.45);
    return (
      `M ${l} ${cy} L ${r} ${cy}` +
      (shape !== "line"
        ? ` M ${r - a} ${cy - a} L ${r} ${cy} L ${r - a} ${cy + a}`
        : "") +
      (shape === "double-arrow"
        ? ` M ${l + a} ${cy - a} L ${l} ${cy} L ${l + a} ${cy + a}`
        : "")
    );
  }
  return polygon([
    [l, t],
    [r, t],
    [r, b],
    [l, b],
  ]);
}
