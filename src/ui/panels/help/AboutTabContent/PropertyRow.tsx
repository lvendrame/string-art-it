import "./PropertyRow.css";

export function PropertyRow({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="about-tab-content__property-row">
      <span className="about-tab-content__property-label">{label}</span>
      <span className={`about-tab-content__property-value${mono ? " mono" : ""}`}>{value}</span>
    </div>
  );
}
