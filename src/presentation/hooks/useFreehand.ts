import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { StrokePoint } from "../../domain/shapes";

export function useFreehand(
  width: number,
  height: number,
  scale: number,
  onComplete: (points: StrokePoint[]) => void,
) {
  const gesture = useRef<{ id: number; points: StrokePoint[] } | undefined>(
    undefined,
  );
  const [points, setPoints] = useState<StrokePoint[]>([]);
  const cancel = () => {
    gesture.current = undefined;
    setPoints([]);
  };
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancel();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  function point(event: PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(width, (event.clientX - rect.left) / scale)),
      y: Math.max(0, Math.min(height, (event.clientY - rect.top) / scale)),
    };
  }
  function start(event: PointerEvent<SVGSVGElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const first = point(event);
    gesture.current = { id: event.pointerId, points: [first] };
    setPoints([first]);
  }
  function move(event: PointerEvent<SVGSVGElement>) {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId) return;
    const next = point(event),
      previous = current.points[current.points.length - 1];
    if (
      Math.hypot(next.x - previous.x, next.y - previous.y) < 0.7 ||
      current.points.length >= 10000
    )
      return;
    current.points.push(next);
    setPoints([...current.points]);
  }
  function end(event: PointerEvent<SVGSVGElement>) {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId) return;
    move(event);
    const result = [...current.points];
    cancel();
    onComplete(result);
  }
  return { points, start, move, end, cancel };
}
