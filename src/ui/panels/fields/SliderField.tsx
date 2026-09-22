import "./SliderField.css";

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
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
  disabled?: boolean;
}) {
  return (
    <label className={`slider-field${disabled ? " is-disabled" : ""}`}>
      <div className="slider-field__row">
        <span>{label}</span>
        <span className="mono slider-field__value">{format ? format(value) : value}</span>
      </div>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="slider-field-range"
      />
    </label>
  );
}
