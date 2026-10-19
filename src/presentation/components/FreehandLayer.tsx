import type { StrokePoint } from "../../domain/shapes";
import { useFreehand } from "../hooks/useFreehand";

export function FreehandLayer({
  width,
  height,
  scale,
  color,
  onComplete,
  label,
}: {
  width: number;
  height: number;
  scale: number;
  color: string;
  onComplete: (points: StrokePoint[]) => void;
  label: string;
}) {
  const stroke = useFreehand(width, height, scale, onComplete);
  return (
    <svg
      className="freehand-layer"
      viewBox={`0 0 ${width} ${height}`}
      aria-label={label}
      onPointerDown={stroke.start}
      onPointerMove={stroke.move}
      onPointerUp={stroke.end}
      onPointerCancel={stroke.cancel}
      onLostPointerCapture={stroke.cancel}
      onClick={(event) => event.stopPropagation()}
    >
      <polyline
        points={stroke.points.map((p) => `${p.x},${p.y}`).join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
      />
    </svg>
  );
}
