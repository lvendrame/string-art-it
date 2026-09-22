// docs/specs/18-design-system.md — shared checkbox control, extracted out of
// GeneratorPanel.tsx once ThreadPropertiesPanel.tsx also needed one (same "move out
// once a second panel needs it" precedent SliderField already went through).
import "./CheckboxField.css";

export function CheckboxField({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={`checkbox-field${disabled ? " is-disabled" : ""}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
