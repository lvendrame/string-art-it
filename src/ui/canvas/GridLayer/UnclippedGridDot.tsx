function gridDotRadius(gapX: number, gapY: number): number {
  return Math.max(0.03, Math.min(gapX, gapY) * 0.06);
}

export function UnclippedGridDot({ gapX, gapY, colour, opacity }: { gapX: number; gapY: number; colour: string; opacity: number }) {
  const r = gridDotRadius(gapX, gapY);
  return <circle cx={r} cy={r} r={r} fill={colour} fillOpacity={opacity} />;
}
