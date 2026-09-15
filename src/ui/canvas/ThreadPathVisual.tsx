import { findPinById, type PinLayer, type ThreadPath } from "../../application/document";

// docs/specs/25-thread-colour-rendering: geometry is one path (A -> B -> ...)
// regardless of strand count — 2/3 colours render as the SAME line repeated with an
// offset dash pattern per strand, never as separate parallel geometry.
export function ThreadPathVisual({
  threadPath,
  pinLayers,
  selected = false,
}: {
  threadPath: ThreadPath;
  pinLayers: PinLayer[];
  selected?: boolean;
}) {
  const points = threadPath.pinIds.map((id) => findPinById(pinLayers, id)).filter((p): p is NonNullable<typeof p> => !!p);
  if (points.length < 2) return null;

  const d = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const strandWidth = threadPath.width * 0.1;
  const pitch = strandWidth * threadPath.twistPitch;

  return (
    <g data-testid="thread-path">
      {/* docs/specs/27-thread-select-tool.md — an additive accent halo underneath the
          coloured strands, same approach PinPathVisual uses for its selected guide
          line, so the multi-colour spiral rendering itself is never altered. */}
      {selected && <path d={d} fill="none" stroke="var(--accent)" strokeWidth={strandWidth + 0.08} strokeOpacity={0.6} data-testid="thread-path-selected" />}
      {threadPath.colours.map((colour, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke={colour}
          strokeWidth={strandWidth}
          strokeDasharray={i === 0 ? undefined : `${pitch} ${pitch * threadPath.colours.length}`}
          strokeDashoffset={i * pitch}
          opacity={i === 0 ? 0.95 : 0.9}
        />
      ))}
    </g>
  );
}
