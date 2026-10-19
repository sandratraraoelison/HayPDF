import type { GraphDraft, layoutGraph } from "../../domain/graph";
export function GraphPreview({
  draft,
  layout,
  label,
}: {
  draft: GraphDraft;
  layout: ReturnType<typeof layoutGraph>;
  label: string;
}) {
  return (
    <svg
      className="graph-preview"
      role="img"
      aria-label={label}
      viewBox={`0 0 ${draft.area.width} ${draft.area.height}`}
    >
      <rect width={draft.area.width} height={draft.area.height} fill="white" />
      {layout.paths.map((p, i) => (
        <path
          key={i}
          d={p.d}
          fill={p.fill ? p.color : "none"}
          stroke={p.fill ? "none" : p.color}
          strokeWidth="1"
        />
      ))}
      {layout.texts.map((text, i) => (
        <text
          key={i}
          x={text.x}
          y={text.y}
          fill={text.color}
          fontSize={text.size}
          fontFamily="Arial, sans-serif"
          textAnchor={text.center ? "middle" : "start"}
        >
          {text.text}
        </text>
      ))}
    </svg>
  );
}
