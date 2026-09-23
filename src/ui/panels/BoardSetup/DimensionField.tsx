import "./DimensionField.css";

export function DimensionField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="board-setup__field-label">
      {label}
      <input
        type="number"
        className="mono board-setup__field-input"
        value={value}
        min={0.1}
        step={0.1}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
