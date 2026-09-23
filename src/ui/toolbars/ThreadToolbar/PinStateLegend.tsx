import "./PinStateLegend.css";

export function PinStateLegend({ swatch, label }: { swatch: React.ReactNode; label: string }) {
  return (
    <div className="thread-toolbar__legend-row">
      {swatch}
      <span className="thread-toolbar__legend-label">{label}</span>
    </div>
  );
}
