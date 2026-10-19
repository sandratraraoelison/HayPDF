import { shapeOptions, shapePath, type ShapeKind } from "../../domain/shapes";
import { Button } from "../ui/Button";

export function ShapePicker({
  value,
  onChange,
  t,
}: {
  value: ShapeKind;
  onChange: (shape: ShapeKind) => void;
  t: (text: string) => string;
}) {
  return (
    <fieldset className="shape-picker">
      <legend>{t("Choisir une forme")}</legend>
      <div className="shape-grid">
        {shapeOptions.map((shape) => (
          <Button
            key={shape.id}
            aria-pressed={value === shape.id}
            title={t(shape.label)}
            onClick={() => onChange(shape.id)}
          >
            <svg viewBox="0 0 48 32" aria-hidden="true">
              <path
                d={shapePath(shape.id, 48, 32)}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
            <span>{t(shape.label)}</span>
          </Button>
        ))}
      </div>
    </fieldset>
  );
}
