import * as mupdf from "mupdf";
import type { NativeImage } from "../domain/nativeImage";
type Point = { x: number; y: number };
type Box = [number, number, number, number];
const intersect = (a: Box, b: Box): Box => [
  Math.max(a[0], b[0]),
  Math.max(a[1], b[1]),
  Math.min(a[2], b[2]),
  Math.min(a[3], b[3]),
];
const visible = (b: Box) =>
  b.every(Number.isFinite) && b[2] - b[0] > 0.1 && b[3] - b[1] > 0.1;
// MuPDF accepts null to request fill bounds; its published TS signature omits null.
const fillBounds = (path: mupdf.Path, matrix: mupdf.Matrix) =>
  path.getBounds(null as unknown as mupdf.StrokeState, matrix) as Box;
function quad(matrix: mupdf.Matrix): Point[] {
  return [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ].map(([x, y]) => ({
    x: matrix[0] * x + matrix[2] * y + matrix[4],
    y: matrix[1] * x + matrix[3] * y + matrix[5],
  }));
}
function bounds(points: Point[]): Box {
  return [
    Math.min(...points.map((p) => p.x)),
    Math.min(...points.map((p) => p.y)),
    Math.max(...points.map((p) => p.x)),
    Math.max(...points.map((p) => p.y)),
  ];
}
function clipPolygon(points: Point[], box: Box) {
  let result = points;
  for (const [axis, edge, sign] of [
    ["x", box[0], 1],
    ["x", box[2], -1],
    ["y", box[1], 1],
    ["y", box[3], -1],
  ] as const) {
    const input = result;
    result = [];
    if (!input.length) break;
    let previous = input[input.length - 1];
    for (const current of input) {
      const a = (previous[axis] - edge) * sign >= 0,
        b = (current[axis] - edge) * sign >= 0;
      if (a !== b) {
        const ratio =
          (edge - previous[axis]) / (current[axis] - previous[axis]);
        result.push({
          x: previous.x + (current.x - previous.x) * ratio,
          y: previous.y + (current.y - previous.y) * ratio,
        });
      }
      if (b) result.push(current);
      previous = current;
    }
  }
  return result;
}
/** Inspect painted page content, including nested forms, stencils and clipping. */
export function collectPageImages(page: mupdf.PDFPage): NativeImage[] {
  const pageBox = page.getBounds() as Box,
    [ox, oy] = pageBox,
    clips: Box[] = [pageBox],
    groups = [1],
    masks: Box[] = [];
  const images: NativeImage[] = [],
    fills: { box: Box; colored: boolean }[] = [];
  const clip = () => clips[clips.length - 1];
  const push = (box: Box) => clips.push(intersect(clip(), box));
  const active = (alpha = 1) =>
    !masks.length && alpha * groups[groups.length - 1] > 0.001;
  const add = (image: mupdf.Image, matrix: mupdf.Matrix, alpha: number) => {
    if (!active(alpha)) return;
    if (Math.abs(matrix[0] * matrix[3] - matrix[1] * matrix[2]) < 1e-8) return;
    const original = quad(matrix),
      source = bounds(original);
    const points = clipPolygon(original, clip());
    if (points.length < 3) return;
    const box = bounds(points);
    if (!visible(box)) return;
    images.push({
      index: images.length,
      kind: "raster",
      x: box[0] - ox,
      y: box[1] - oy,
      width: box[2] - box[0],
      height: box[3] - box[1],
      pixelWidth: image.getWidth(),
      pixelHeight: image.getHeight(),
      polygon: points.map((p) => ({ x: p.x - ox, y: p.y - oy })),
      sourceBounds: {
        x: source[0] - ox,
        y: source[1] - oy,
        width: source[2] - source[0],
        height: source[3] - source[1],
      },
    });
  };
  const device = new mupdf.Device({
    fillImage: add,
    fillImageMask(image, matrix, _space, _color, alpha) {
      add(image, matrix, alpha);
    },
    clipPath(path, _evenOdd, matrix) {
      push(fillBounds(path, matrix));
    },
    clipStrokePath(path, state, matrix) {
      push(path.getBounds(state, matrix) as Box);
    },
    clipImageMask(_image, matrix) {
      push(bounds(quad(matrix)));
    },
    popClip() {
      if (clips.length > 1) clips.pop();
    },
    beginGroup(_box, _space, _isolated, _knockout, _blend, alpha) {
      groups.push(groups[groups.length - 1] * alpha);
    },
    endGroup() {
      if (groups.length > 1) groups.pop();
    },
    beginMask(box) {
      masks.push(box as Box);
    },
    endMask() {
      const box = masks.pop();
      if (box) push(box);
    },
    fillPath(path, _evenOdd, matrix, space, color, alpha) {
      if (!active(alpha) || fills.length >= 1500) return;
      const box = intersect(fillBounds(path, matrix), clip());
      if (!visible(box) || box[2] - box[0] < 3 || box[3] - box[1] < 3) return;
      const area = (box[2] - box[0]) * (box[3] - box[1]),
        pageArea = (pageBox[2] - ox) * (pageBox[3] - oy);
      if (
        area > pageArea * 0.75 ||
        (color.every((c) => c > 0.995) && !space.isCMYK())
      )
        return;
      const colored = space.isRGB()
        ? Math.max(...color) - Math.min(...color) > 0.07
        : space.isCMYK()
          ? Math.max(...color.slice(0, 3)) > 0.07
          : !space.isGray();
      fills.push({ box, colored });
    },
  });
  try {
    page.runPageContents(device, mupdf.Matrix.identity);
    device.close();
  } finally {
    device.destroy();
  }
  // Overlapping colored fills, such as a background and several illustration shapes.
  const visited = new Set<number>();
  for (let i = 0; i < fills.length; i++) {
    if (visited.has(i)) continue;
    const component = [i];
    visited.add(i);
    for (let n = 0; n < component.length; n++)
      for (let j = 0; j < fills.length; j++)
        if (
          !visited.has(j) &&
          visible(intersect(fills[component[n]].box, fills[j].box))
        ) {
          visited.add(j);
          component.push(j);
        }
    if (component.length < 3 || !component.some((n) => fills[n].colored))
      continue;
    const box: Box = [
      Math.min(...component.map((n) => fills[n].box[0])),
      Math.min(...component.map((n) => fills[n].box[1])),
      Math.max(...component.map((n) => fills[n].box[2])),
      Math.max(...component.map((n) => fills[n].box[3])),
    ];
    if (
      box[2] - box[0] < 48 ||
      box[3] - box[1] < 36 ||
      (box[2] - box[0]) * (box[3] - box[1]) >
        (pageBox[2] - ox) * (pageBox[3] - oy) * 0.7
    )
      continue;
    images.push({
      index: images.length,
      kind: "vector",
      x: box[0] - ox,
      y: box[1] - oy,
      width: box[2] - box[0],
      height: box[3] - box[1],
    });
  }
  return images;
}
