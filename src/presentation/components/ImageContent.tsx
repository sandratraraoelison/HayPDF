import type { Mark } from "../../domain/document";
import type { Bounds } from "../../domain/imageLayout";
import { imagePlacement } from "../../domain/imageLayout";
export function ImageContent({
  mark,
  frame,
  label,
}: {
  mark: Mark;
  frame: Bounds;
  label: string;
}) {
  const placement = imagePlacement(
    frame,
    {
      width: mark.naturalWidth ?? mark.width,
      height: mark.naturalHeight ?? mark.height,
    },
    mark,
  );
  return (
    <svg
      className="image-svg"
      viewBox={`0 0 ${frame.width} ${frame.height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
    >
      <image
        href={mark.data}
        width="1"
        height="1"
        preserveAspectRatio="none"
        transform={`matrix(${placement.svg.join(" ")})`}
        opacity={mark.imageOpacity ?? 1}
      />
    </svg>
  );
}
