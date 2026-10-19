import type { Mark } from "../../domain/document";
import type { Bounds, Rect } from "../../domain/imageLayout";
import { useMarkTransform } from "../hooks/useMarkTransform";
import { ImageResizeHandles } from "./ImageResizeHandles";
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
            <img
              draggable={false}
              src={mark.data}
              alt={t("Image ajoutée")}
              style={{ objectFit: mark.imageFit ?? "contain" }}
            />
          </div>
          {selected && onResize && (
            <ImageResizeHandles
              onStart={(handle) => (event) => transform.start(event, handle)}
              t={t}
            />
          )}
        </>
      ) : mark.kind === "rectangle" || mark.kind === "highlight" ? (
        ""
      ) : (
        mark.text
      )}
    </div>
  );
}
