interface NumberFieldProps {
  label: string;
  value: number;
  min: number;
  max?: number;
  onChange: (value: number) => void;
}
export function NumberField({
  label,
  value,
  min,
  max = Number.MAX_SAFE_INTEGER,
  onChange,
}: NumberFieldProps) {
  return (
    <label>
      {label}
      <input
        type="number"
        min={min}
        max={max === Number.MAX_SAFE_INTEGER ? undefined : max}
        value={value}
        onChange={(event) => {
          const next = event.target.valueAsNumber;
          if (Number.isFinite(next))
            onChange(Math.max(min, Math.min(max, next)));
        }}
      />
    </label>
  );
}
