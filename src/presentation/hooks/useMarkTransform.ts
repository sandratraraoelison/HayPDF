import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type MouseEvent,
} from "react";
import type { Mark } from "../../domain/document";
import {
  resizeImage,
  type Rect,
  type Bounds,
  type ResizeHandle,
} from "../../domain/imageLayout";
interface Options {
  mark: Mark;
  scale: number;
  selected: boolean;
  bounds: Bounds;
  onSelect?: (id: string) => void;
  onMove?: (id: string, x: number, y: number) => void;
  onResize?: (id: string, rect: Rect) => void;
}
export function useMarkTransform({
  mark,
  scale,
  selected,
  bounds,
  onSelect,
  onMove,
  onResize,
}: Options) {
  const [preview, setPreview] = useState<Rect>();
  const gesture = useRef<
    | {
        start: Rect;
        x: number;
        y: number;
        handle?: ResizeHandle;
        latest: Rect;
        pointerId: number;
      }
    | undefined
  >(undefined);
  const moved = useRef(false);
  useEffect(() => {
    if (!selected) {
      gesture.current = undefined;
      setPreview(undefined);
      moved.current = false;
    }
  }, [selected]);
  function start(event: PointerEvent<HTMLElement>, handle?: ResizeHandle) {
    if (
      !event.isPrimary ||
      event.button !== 0 ||
      (handle && !onResize) ||
      (!handle && !onMove)
    )
      return;
    event.stopPropagation();
    event.preventDefault();
    onSelect?.(mark.id);
    event.currentTarget.setPointerCapture(event.pointerId);
    const rect = {
      x: mark.x,
      y: mark.y,
      width: mark.width,
      height: mark.height,
    };
    gesture.current = {
      start: rect,
      x: event.clientX,
      y: event.clientY,
      handle,
      latest: rect,
      pointerId: event.pointerId,
    };
    moved.current = false;
  }
  function move(event: PointerEvent<HTMLElement>) {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    event.stopPropagation();
    const dx = (event.clientX - current.x) / scale,
      dy = (event.clientY - current.y) / scale;
    const next = current.handle
      ? resizeImage(
          current.start,
          current.handle,
          dx,
          dy,
          (mark.lockAspectRatio ?? true) !== event.shiftKey,
          bounds,
        )
      : {
          ...current.start,
          x: Math.max(
            0,
            Math.min(bounds.width - current.start.width, current.start.x + dx),
          ),
          y: Math.max(
            0,
            Math.min(
              bounds.height - current.start.height,
              current.start.y + dy,
            ),
          ),
        };
    current.latest = next;
    moved.current = Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5;
    setPreview(next);
  }
  function end(event: PointerEvent<HTMLElement>) {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    event.stopPropagation();
    if (moved.current) {
      if (current.handle) onResize?.(mark.id, current.latest);
      else onMove?.(mark.id, current.latest.x, current.latest.y);
    }
    gesture.current = undefined;
    setPreview(undefined);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function cancel() {
    gesture.current = undefined;
    setPreview(undefined);
    moved.current = false;
  }
  return {
    rect: preview ?? mark,
    start,
    move,
    end,
    cancel,
    select: (event: MouseEvent) => {
      event.stopPropagation();
      if (!moved.current) onSelect?.(mark.id);
      moved.current = false;
    },
  };
}
