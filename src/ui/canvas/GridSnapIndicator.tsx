import type { Point } from "../../domain/paths";

// docs/specs/05-canvas-and-viewport.md §Grid Snap Feedback — the nearest grid
// intersection gets a visual indicator whenever grid-snap is active, independent of
// whether the grid lines themselves are visible.
export function GridSnapIndicator({ point }: { point: Point }) {
  return (
    <g data-testid="grid-snap-indicator">
      <circle cx={point.x} cy={point.y} r={0.3} fill="none" stroke="var(--accent)" strokeWidth={0.05} />
      <circle cx={point.x} cy={point.y} r={0.06} fill="var(--accent)" />
    </g>
  );
}
