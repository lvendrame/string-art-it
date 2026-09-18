import type { CSSProperties } from "react";

const FIELD_LABEL_STYLE: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11.5, color: "var(--text-secondary)" };
const SLIDER_VALUE_STYLE: CSSProperties = { color: "var(--text-primary)", fontSize: 11.5, minWidth: 34, textAlign: "right" };

// docs/specs/18-design-system.md — Slider (range input): shared numeric-parameter
// control for GeneratorPanel's pattern fields and both panels' thread-width field.
// Always paired with a monospace value readout since a raw <input type="range">
// has no visible number on its own.
export function SliderField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <div style={FIELD_LABEL_STYLE}>
        <span>{label}</span>
        <span className="mono" style={SLIDER_VALUE_STYLE}>
          {format ? format(value) : value}
        </span>
      </div>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="slider-field-range"
      />
    </label>
  );
}
