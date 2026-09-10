import type { GridSettings } from "../../application/document";
import type { Viewport } from "../../domain/transforms";

function gridDotRadius(gapX: number, gapY: number): number {
  return Math.max(0.03, Math.min(gapX, gapY) * 0.06);
}

function UnclippedGridDot({ gapX, gapY, colour, opacity }: { gapX: number; gapY: number; colour: string; opacity: number }) {
  const r = gridDotRadius(gapX, gapY);
  return <circle cx={r} cy={r} r={r} fill={colour} fillOpacity={opacity} />;
}

interface Props {
  grid: GridSettings;
  viewport: Viewport;
  viewportPx: { width: number; height: number };
}

export function GridLayer({ grid, viewport, viewportPx }: Props) {
  if (!grid.visible) return null;

  return (
    <>
      <defs>
        <pattern id="grid-dots" width={grid.gapX} height={grid.gapY} patternUnits="userSpaceOnUse">
          <UnclippedGridDot gapX={grid.gapX} gapY={grid.gapY} colour={grid.colour} opacity={grid.opacity} />
        </pattern>
      </defs>
      <rect
        x={viewport.panOrigin.x}
        y={viewport.panOrigin.y}
        width={viewportPx.width / viewport.zoom}
        height={viewportPx.height / viewport.zoom}
        fill="url(#grid-dots)"
        data-testid="grid-overlay"
      />
    </>
  );
}
