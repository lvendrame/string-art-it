import { findPinById, geometryToPath, type PinLayer, type ThreadLayer } from "../../application/document";
import { pathToSvgD } from "../../infrastructure/rendering/svgPath";
import type { PinHit, ThreadHit } from "./hitTesting";

interface Props {
  pinLayers: PinLayer[];
  threadLayers: ThreadLayer[];
  pinEraserHit?: PinHit | null;
  pathEraserHit?: PinHit | null;
  threadEraserHit?: ThreadHit | null;
  segmentEraserHit?: ThreadHit | null;
}

// docs/specs/11-erasers.md — a `--danger` preview (the design system's destructive-action
// colour, per 18-design-system.md) of exactly what the hovered eraser would remove on
// click: a ring on the one pin (Pin Eraser), a ring on every pin plus the shape's guide
// outline for the whole path (Path Eraser, Pin mode), the full polyline for the whole
// Thread Path (Path Eraser, Thread mode), or just the one segment (Segment Eraser).
export function EraserHoverOverlay({ pinLayers, threadLayers, pinEraserHit, pathEraserHit, threadEraserHit, segmentEraserHit }: Props) {
  const pinEraserPin = pinEraserHit ? findPinById(pinLayers, pinEraserHit.pinId) : null;

  const hoveredPinPath = pathEraserHit
    ? pinLayers.find((l) => l.id === pathEraserHit.layerId)?.pinPaths.find((p) => p.id === pathEraserHit.pathId)
    : null;

  const hoveredThreadPath = threadEraserHit
    ? threadLayers.find((l) => l.id === threadEraserHit.layerId)?.threadPaths.find((t) => t.id === threadEraserHit.pathId)
    : null;

  const hoveredSegmentPath = segmentEraserHit
    ? threadLayers.find((l) => l.id === segmentEraserHit.layerId)?.threadPaths.find((t) => t.id === segmentEraserHit.pathId)
    : null;
  const segmentA = hoveredSegmentPath && segmentEraserHit ? findPinById(pinLayers, hoveredSegmentPath.pinIds[segmentEraserHit.segmentIndex]) : null;
  const segmentB = hoveredSegmentPath && segmentEraserHit ? findPinById(pinLayers, hoveredSegmentPath.pinIds[segmentEraserHit.segmentIndex + 1]) : null;

  if (!pinEraserPin && !hoveredPinPath && !hoveredThreadPath && !(segmentA && segmentB)) return null;

  return (
    <>
      {pinEraserPin && (
        <circle cx={pinEraserPin.x} cy={pinEraserPin.y} r={0.35} fill="none" stroke="var(--danger)" strokeWidth={0.08} data-testid="pin-eraser-candidate" />
      )}

      {hoveredPinPath && (
        <g data-testid="path-eraser-candidate">
          <path
            d={pathToSvgD(geometryToPath(hoveredPinPath.geometry))}
            fill="none"
            stroke="var(--danger)"
            strokeWidth={0.12}
            strokeDasharray="0.2 0.15"
          />
          {hoveredPinPath.pins.map((pin) => (
            <circle key={pin.id} cx={pin.x} cy={pin.y} r={0.3} fill="none" stroke="var(--danger)" strokeWidth={0.07} />
          ))}
        </g>
      )}

      {hoveredThreadPath &&
        (() => {
          const points = hoveredThreadPath.pinIds.map((id) => findPinById(pinLayers, id)).filter((p): p is NonNullable<typeof p> => !!p);
          if (points.length < 2) return null;
          const d = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
          return (
            <path
              d={d}
              fill="none"
              stroke="var(--danger)"
              strokeWidth={hoveredThreadPath.width * 0.1 + 0.25}
              strokeLinecap="round"
              opacity={0.75}
              data-testid="thread-eraser-candidate"
            />
          );
        })()}

      {segmentA && segmentB && (
        <line
          x1={segmentA.x}
          y1={segmentA.y}
          x2={segmentB.x}
          y2={segmentB.y}
          stroke="var(--danger)"
          strokeWidth={0.35}
          strokeLinecap="round"
          opacity={0.85}
          data-testid="segment-eraser-candidate"
        />
      )}
    </>
  );
}
