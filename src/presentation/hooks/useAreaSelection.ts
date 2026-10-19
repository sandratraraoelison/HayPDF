import { useRef, useState, type PointerEvent } from "react";
import type { Rect } from "../../domain/imageLayout";

export function useAreaSelection(
  width: number,
  height: number,
  scale: number,
  onSelect: (area: Rect) => void,
) {
  const start = useRef<{ x: number; y: number; id: number } | undefined>(
    undefined,
  );
  const [area, setArea] = useState<Rect>();
  const point = (event: PointerEvent<SVGSVGElement>) => {
    const r = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(width, (event.clientX - r.left) / scale)),
      y: Math.max(0, Math.min(height, (event.clientY - r.top) / scale)),
    };
  };
  function down(event: PointerEvent<SVGSVGElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    start.current = { ...point(event), id: event.pointerId };
    setArea(undefined);
  }
  function rect(event: PointerEvent<SVGSVGElement>) {
    const first = start.current;
    if (!first || first.id !== event.pointerId) return;
    const p = point(event);
    return {
      x: Math.min(first.x, p.x),
      y: Math.min(first.y, p.y),
      width: Math.abs(first.x - p.x),
      height: Math.abs(first.y - p.y),
    };
  }
  function move(event: PointerEvent<SVGSVGElement>) {
    setArea(rect(event));
  }
  function cancel() {
    start.current = undefined;
    setArea(undefined);
  }
  function up(event: PointerEvent<SVGSVGElement>) {
    const next = rect(event);
    cancel();
    if (next && next.width > 10 && next.height > 10) onSelect(next);
  }
  return { area, down, move, up, cancel };
}
