import type { Mark } from "../../domain/document";
import type { Bounds, Rect } from "../../domain/imageLayout";
import { useMarkTransform } from "../hooks/useMarkTransform";
import { ImageResizeHandles } from "./ImageResizeHandles";
import { shapePath } from "../../domain/shapes";
import { ImageContent } from "./ImageContent";
interface MarkOverlayProps {
  mark: Mark;
  scale: number;
  selected: boolean;
  t: (text: string) => string;
  onSelect?: (id: string) => void;
  onMove?: (id: string, x: number, y: number) => void;
  onResize?: (id: string, rect: Rect) => void;
  bounds: Bounds;
}
/** Annotation view independent of the editor session and PDF renderer. */
export function MarkOverlay({
  mark,
  scale,
  selected,
  t,
  onSelect,
  onMove,
  onResize,
  bounds,
}: MarkOverlayProps) {
  const transform = useMarkTransform({
    mark,
    scale,
    selected,
    bounds,
    onSelect,
    onMove,
    onResize,
  });
  return (
    <div
      className={`mark ${mark.kind} ${selected ? "selected" : ""}`}
      style={{
        pointerEvents: onSelect || onMove || onResize ? undefined : "none",
        left: transform.rect.x * scale,
        top: transform.rect.y * scale,
        width: transform.rect.width * scale,
        height: transform.rect.height * scale,
        fontSize: mark.size * scale,
        color: mark.color,
        fontWeight: mark.bold ? "bold" : undefined,
        fontStyle: mark.italic ? "italic" : undefined,
        fontFamily:
          mark.font === "TimesRoman"
            ? "Georgia"
            : mark.font === "Courier"
              ? "monospace"
              : "Arial",
        background: mark.kind === "highlight" ? `${mark.color}55` : undefined,
        borderColor: mark.color,
      }}
      onClick={transform.select}
      onPointerDown={(event) => transform.start(event)}
      onPointerMove={transform.move}
      onPointerUp={transform.end}
      onPointerCancel={transform.cancel}
    >
      {mark.kind === "image" ? (
        <>
          <div className="image-content">
            <ImageContent
              mark={mark}
              frame={transform.rect}
              label={t("Image ajoutée")}
            />
          </div>
          {selected && onResize && (
            <ImageResizeHandles
              onStart={(handle) => (event) => transform.start(event, handle)}
              t={t}
            />
          )}
        </>
      ) : mark.kind === "rectangle" ? (
        <>
          <svg
            className="shape-preview"
            viewBox={`0 0 ${transform.rect.width} ${transform.rect.height}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d={shapePath(
                mark.shape ?? "rectangle",
                transform.rect.width,
                transform.rect.height,
                mark.points,
              )}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
          {selected && onResize && (
            <ImageResizeHandles
              onStart={(handle) => (event) => transform.start(event, handle)}
              t={t}
              label="Redimensionner la forme"
            />
          )}
        </>
      ) : mark.kind === "highlight" ? (
        ""
      ) : (
        mark.text
      )}
    </div>
  );
}
