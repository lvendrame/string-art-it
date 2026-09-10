import type { SymmetryConfig } from "../../application/document";

export function SymmetryOverlay({ config }: { config: SymmetryConfig }) {
  if (config.type === "none") return null;

  if (config.type === "radial") {
    const { centre, intervalDegrees } = config;
    const spokes = [];
    for (let a = 0; a < 360; a += intervalDegrees) spokes.push((a * Math.PI) / 180);
    return (
      <g opacity={0.5} data-testid="radial-overlay">
        {spokes.map((rad, i) => (
          <line key={i} x1={centre.x} y1={centre.y} x2={centre.x + Math.cos(rad) * 1000} y2={centre.y + Math.sin(rad) * 1000} stroke="var(--accent)" strokeWidth={0.03} strokeDasharray="0.15 0.25" />
        ))}
        <circle cx={centre.x} cy={centre.y} r={0.4} fill="none" stroke="var(--accent)" strokeWidth={0.06} />
        <circle cx={centre.x} cy={centre.y} r={0.1} fill="var(--accent)" />
      </g>
    );
  }

  const { axis } = config;
  return (
    <g opacity={0.5} data-testid="mirror-axis-overlay">
      {(config.type === "vertical" || config.type === "both") && (
        <line x1={axis.x} y1={-1000} x2={axis.x} y2={1000} stroke="var(--accent)" strokeWidth={0.03} strokeDasharray="0.15 0.25" />
      )}
      {(config.type === "horizontal" || config.type === "both") && (
        <line x1={-1000} y1={axis.y} x2={1000} y2={axis.y} stroke="var(--accent)" strokeWidth={0.03} strokeDasharray="0.15 0.25" />
      )}
    </g>
  );
}
