import type { Rect } from "../../domain/imageLayout";
import { useAreaSelection } from "../hooks/useAreaSelection";
export function AreaSelectionLayer({
  width,
  height,
  scale,
  onSelect,
  label,
}: {
  width: number;
  height: number;
  scale: number;
  onSelect: (area: Rect) => void;
  label: string;
}) {
  const selection = useAreaSelection(width, height, scale, onSelect);
  return (
    <svg
      className="freehand-layer area-selection-layer"
      viewBox={`0 0 ${width} ${height}`}
      aria-label={label}
      onPointerDown={selection.down}
      onPointerMove={selection.move}
      onPointerUp={selection.up}
      onPointerCancel={selection.cancel}
      onLostPointerCapture={selection.cancel}
      onClick={(e) => e.stopPropagation()}
    >
      {selection.area && <rect {...selection.area} />}
    </svg>
  );
}
