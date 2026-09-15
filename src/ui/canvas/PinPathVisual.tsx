import { useMemo } from "react";
import { computeMirroredPinGroups, geometryToContourPaths, type PinPath } from "../../application/document";
import { pathToSvgD } from "../../infrastructure/rendering/svgPath";

// docs/specs/06-symmetry.md: mirrored copies are derived from the source pins on every
// render — never stored, so editing the source always keeps them in sync.
export function PinPathVisual({ pinPath, selected }: { pinPath: PinPath; selected: boolean }) {
  // geometryToContourPaths generalizes to N contours (a Text Pin Path's letter-holes
  // included) — SVG's `d` attribute natively supports multiple "M…Z" subpaths, so this
  // is a strict superset of the old single-Path behaviour (byte-identical output for
  // every other shape, which always has exactly 1 contour).
  const d = useMemo(() => geometryToContourPaths(pinPath.geometry).map(pathToSvgD).join(" "), [pinPath.geometry]);
  const radius = pinPath.diameter / 20; // mm -> cm, then /2 for radius
  const mirroredGroups = useMemo(() => computeMirroredPinGroups(pinPath), [pinPath]);

  return (
    <g data-testid="pin-path">
      {pinPath.guideVisible && (
        <path d={d} fill="none" stroke={selected ? "var(--accent)" : "#000000"} strokeOpacity={selected ? 1 : 0.8} strokeWidth={selected ? 0.08 : 0.05} strokeDasharray="0.2 0.15" />
      )}
      {mirroredGroups.map((group, gi) => (
        <g key={gi} data-testid="mirrored-pins" opacity={1}>
          {group.map((pin) => (
            <circle key={pin.id} cx={pin.x} cy={pin.y} r={Math.max(radius, 0.06)} fill={pinPath.colour} stroke="#1b1b1b" strokeWidth={0.02} />
          ))}
        </g>
      ))}
      {pinPath.pins.map((pin) => (
        <circle key={pin.id} cx={pin.x} cy={pin.y} r={Math.max(radius, 0.06)} fill={pinPath.colour} stroke="#1b1b1b" strokeWidth={0.02} />
      ))}
    </g>
  );
}
