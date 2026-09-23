import "./NumberField.css";

export function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="selection-panel__row">
      {label}
      <input
        type="number"
        className="mono selection-panel__number-input"
        step={0.1}
        value={Number(value.toFixed(3))}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
