import { findPinById, type PinLayer, type ThreadPath } from "../../application/document";

// docs/specs/25-thread-colour-rendering: geometry is one path (A -> B -> ...)
// regardless of strand count — 2/3 colours render as the SAME line repeated with an
// offset dash pattern per strand, never as separate parallel geometry.
export function ThreadPathVisual({ threadPath, pinLayers }: { threadPath: ThreadPath; pinLayers: PinLayer[] }) {
  const points = threadPath.pinIds.map((id) => findPinById(pinLayers, id)).filter((p): p is NonNullable<typeof p> => !!p);
  if (points.length < 2) return null;

  const d = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const strandWidth = threadPath.width * 0.1;
  const pitch = strandWidth * threadPath.twistPitch;

  return (
    <g data-testid="thread-path">
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
