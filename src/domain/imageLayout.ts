export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface Bounds {
  width: number;
  height: number;
}
export type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
export function imageContentRect(
  frame: Bounds,
  natural: Bounds,
  fit: "contain" | "cover" | "fill",
): Rect {
  if (fit === "fill")
    return { x: 0, y: 0, width: frame.width, height: frame.height };
  const ratio =
    fit === "cover"
      ? Math.max(frame.width / natural.width, frame.height / natural.height)
      : Math.min(frame.width / natural.width, frame.height / natural.height);
  const width = natural.width * ratio,
    height = natural.height * ratio;
  return {
    x: (frame.width - width) / 2,
    y: (frame.height - height) / 2,
    width,
    height,
  };
}
/** Resize around the opposite edge/corner, preserving ratio and staying on the page. */
export function resizeImage(
  start: Rect,
  handle: ResizeHandle,
  dx: number,
  dy: number,
  locked: boolean,
  bounds: Bounds,
): Rect {
  const west = handle.includes("w"),
    east = handle.includes("e"),
    north = handle.includes("n"),
    south = handle.includes("s");
  let width = Math.max(16, start.width + (west ? -dx : east ? dx : 0)),
    height = Math.max(16, start.height + (north ? -dy : south ? dy : 0));
  const ratio = start.width / start.height;
  if (locked) {
    if (
      (west || east) &&
      (!(north || south) ||
        Math.abs(dx / start.width) >= Math.abs(dy / start.height))
    )
      height = width / ratio;
    else width = height * ratio;
    const factor = Math.max(1, 16 / width, 16 / height);
    width *= factor;
    height *= factor;
  }
  const anchorX = west
    ? start.x + start.width
    : east
      ? start.x
      : start.x + start.width / 2;
  const anchorY = north
    ? start.y + start.height
    : south
      ? start.y
      : start.y + start.height / 2;
  const maxWidth = west
    ? anchorX
    : east
      ? bounds.width - anchorX
      : 2 * Math.min(anchorX, bounds.width - anchorX);
  const maxHeight = north
    ? anchorY
    : south
      ? bounds.height - anchorY
      : 2 * Math.min(anchorY, bounds.height - anchorY);
  if (locked) {
    const factor = Math.min(1, maxWidth / width, maxHeight / height);
    width *= factor;
    height *= factor;
  } else {
    width = Math.min(width, maxWidth);
    height = Math.min(height, maxHeight);
  }
  return {
    x: west ? anchorX - width : east ? anchorX : anchorX - width / 2,
    y: north ? anchorY - height : south ? anchorY : anchorY - height / 2,
    width: Math.max(1, width),
    height: Math.max(1, height),
  };
}
