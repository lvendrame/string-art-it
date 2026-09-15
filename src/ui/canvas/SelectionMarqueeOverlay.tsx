import type { Rect } from "./hitTesting";

// docs/specs/26-edit-mode-multi-select.md — the live rubber-band rectangle while
// dragging with the Select tool. Same visual language as SymmetryOverlay: dashed
// `--accent` stroke, translucent `--accent-soft` fill.
export function SelectionMarqueeOverlay({ rect }: { rect: Rect }) {
  const x = Math.min(rect.x0, rect.x1);
  const y = Math.min(rect.y0, rect.y1);
  const width = Math.abs(rect.x1 - rect.x0);
  const height = Math.abs(rect.y1 - rect.y0);
  return (
    <rect
      data-testid="selection-marquee"
      x={x}
      y={y}
      width={width}
      height={height}
      fill="var(--accent-soft)"
      fillOpacity={0.25}
      stroke="var(--accent)"
      strokeWidth={0.03}
      strokeDasharray="0.15 0.1"
    />
  );
}
