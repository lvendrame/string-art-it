import { useMemo } from "react";
import { computeMirroredPinGroups, geometryToPath, type PinPath } from "../../application/document";
import { pathToSvgD } from "../../infrastructure/rendering/svgPath";

// docs/specs/06-symmetry.md: mirrored copies are derived from the source pins on every
// render — never stored, so editing the source always keeps them in sync.
export function PinPathVisual({ pinPath, selected }: { pinPath: PinPath; selected: boolean }) {
  const d = useMemo(() => pathToSvgD(geometryToPath(pinPath.geometry)), [pinPath.geometry]);
  const radius = pinPath.diameter / 20; // mm -> cm, then /2 for radius
  const mirroredGroups = useMemo(() => computeMirroredPinGroups(pinPath), [pinPath]);

  return (
    <g data-testid="pin-path">
      {pinPath.guideVisible && (
        <path d={d} fill="none" stroke={selected ? "var(--accent)" : "#000000"} strokeOpacity={selected ? 1 : 0.8} strokeWidth={selected ? 0.08 : 0.05} strokeDasharray="0.2 0.15" />
      )}
      {mirroredGroups.map((group, gi) => (
        <g key={gi} data-testid="mirrored-pins" opacity={0.45}>
          {group.map((pt, pi) => (
            <circle key={pi} cx={pt.x} cy={pt.y} r={Math.max(radius, 0.06)} fill={pinPath.colour} stroke="#1b1b1b" strokeWidth={0.02} />
          ))}
        </g>
      ))}
      {pinPath.pins.map((pin) => (
        <circle key={pin.id} cx={pin.x} cy={pin.y} r={Math.max(radius, 0.06)} fill={pinPath.colour} stroke="#1b1b1b" strokeWidth={0.02} />
      ))}
    </g>
  );
}
