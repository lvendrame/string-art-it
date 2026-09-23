import { useId } from "react";
import {
  boardPath,
  computeMirroredPinGroups,
  findPinById,
  geometryCenter,
  geometryToContourPaths,
  type EditorState,
  type PinPath,
} from "@application/document";
import type { Point } from "@domain/paths";
import { generateRadialCopies, mirrorCopies } from "@domain/symmetry";
import type { BoundingBox } from "@domain/transforms";
import { BoardFillDefs } from "@infrastructure/rendering/boardFill/boardFill";
import { boardFillPaint } from "@infrastructure/rendering/boardFillUtils";
import { pathToSvgD } from "@infrastructure/rendering/svgPath";
import {
  GRID_OPACITY,
  MIN_GRID_STROKE_PX,
  MIN_PIN_DOT_RADIUS_PX,
  MIN_PIN_NUMBER_FONT_PX,
  PIN_NUMBER_GAP_PX,
  PRINT_PX_PER_CM,
} from "./constants";

// docs/specs/14-printing.md — a fixed diagonal offset put numbers for pins on the
// far side of a closed shape (bottom/left of a circle, say) back over the shape's
// interior, covering other pins and paths (see printed-template feedback). A pure
// radial-from-centre offset fixed that for round/star-like shapes, but for anything
// with straight runs of collinear pins (Line, Rectangle/Square edges, and Freehand
// wherever the sampled path is locally straight or curls tight, e.g. a spiral) the
// centre-to-pin ray points ALONG the path rather than away from it — the label lands
// on the next pin instead of beside its own. The general fix is the local outward
// NORMAL: perpendicular to the path's tangent at that pin (from its neighbours in
// the already-ordered `pins` array), oriented away from the shape's centre. This
// reduces to the same radial offset for circles/ellipses/polygons (tangent there is
// always perpendicular to the radius already) and additionally fixes the collinear
// cases the pure-radial version got wrong.
function pinLabelPosition(
  pin: Point,
  prev: Point | null,
  next: Point | null,
  center: Point,
  offsetCm: number,
): Point {
  const tx = (next?.x ?? pin.x) - (prev?.x ?? pin.x);
  const ty = (next?.y ?? pin.y) - (prev?.y ?? pin.y);
  const tlen = Math.hypot(tx, ty);
  let nx: number, ny: number;
  /* v8 ignore else -- tlen<=1e-6 needs a pin whose two path neighbours both coincide with it; distributePins never produces that from any real geometry */
  if (tlen > 1e-6) {
    nx = -ty / tlen;
    ny = tx / tlen;
    const toPinX = pin.x - center.x;
    const toPinY = pin.y - center.y;
    if (nx * toPinX + ny * toPinY < 0) {
      nx = -nx;
      ny = -ny;
    }
  } else {
    const dx = pin.x - center.x;
    const dy = pin.y - center.y;
    const dist = Math.hypot(dx, dy);
    [nx, ny] = dist > 1e-6 ? [dx / dist, dy / dist] : [0, -1];
  }
  return { x: pin.x + nx * offsetCm, y: pin.y + ny * offsetCm };
}

// Precomputes every pin's label position for one pin path in one pass, matching
// pins up with their path-order neighbours (wrapping around for a closed shape,
// clamping at the ends for an open one like Line/Arc/Freehand).
function pinLabelPositions(pins: Point[], closed: boolean, center: Point, offsetCm: number): Point[] {
  const n = pins.length;
  return pins.map((pin, i) => {
    const prev = closed ? pins[(i - 1 + n) % n] : (pins[i - 1] ?? null);
    const next = closed ? pins[(i + 1) % n] : (pins[i + 1] ?? null);
    return pinLabelPosition(pin, prev, next, center, offsetCm);
  });
}

// The mirrored pin center is the source shape's centre carried through the same
// mirror/radial transform used to derive the mirrored pins themselves, so its
// label ray stays consistent with computeMirroredPinGroups' own point order.
function mirroredGeometryCenters(pinPath: PinPath): Point[] {
  const symmetry = pinPath.symmetry;
  if (symmetry.type === "none") return [];
  const center = geometryCenter(pinPath.geometry);
  const groups =
    symmetry.type === "radial"
      ? generateRadialCopies(
          [center],
          symmetry.centre,
          symmetry.intervalDegrees,
        )
      : mirrorCopies([center], symmetry.type, symmetry.axis);
  return groups.map((group) => group[0]);
}

// One physical page's worth of board content, offset by `tileOffsetCm` (used when
// tiling splits the printed board across multiple pages).
export function PrintPage({
  state,
  path,
  box,
  paperSize,
  effectiveScale,
  tileOffsetCm,
  tileLabel,
  coordLabel,
  trimMarks,
  alignmentMarks,
}: {
  state: EditorState;
  path: ReturnType<typeof boardPath>;
  box: BoundingBox;
  paperSize: { width: number; height: number };
  effectiveScale: number;
  tileOffsetCm?: { x: number; y: number };
  tileLabel?: string;
  coordLabel?: string;
  trimMarks?: boolean;
  alignmentMarks?: boolean;
}) {
  const { elements } = state.printSettings;
  // Board geometry (outline/guides/threads) prints true-to-scale, but a pin dot/number
  // shrunk proportionally with a "fit to page" board becomes sub-pixel and vanishes —
  // so their on-paper size is floored to stay legible regardless of effectiveScale.
  const groupScale = effectiveScale * PRINT_PX_PER_CM;
  const pinDotRadiusCm = (diameterMm: number) =>
    Math.max(diameterMm / 20, MIN_PIN_DOT_RADIUS_PX / groupScale);
  const pinNumberFontCm = MIN_PIN_NUMBER_FONT_PX / groupScale;
  const pinNumberGapCm = PIN_NUMBER_GAP_PX / groupScale;
  // Centered (text-anchor/dominant-baseline "middle") on the offset point, so the
  // label's near edge — not its center — needs to clear the dot: push out by the
  // dot radius plus half the glyph height plus a small gap, not just the gap alone.
  const pinNumberOffsetCm = (diameterMm: number) =>
    pinDotRadiusCm(diameterMm) + pinNumberFontCm / 2 + pinNumberGapCm;
  const gridStrokeWidthCm = Math.max(0.02, MIN_GRID_STROKE_PX / groupScale);
  const paperPx = {
    width: paperSize.width * PRINT_PX_PER_CM,
    height: paperSize.height * PRINT_PX_PER_CM,
  };
  const boardCenter = {
    x: (box.minX + box.maxX) / 2,
    y: (box.minY + box.maxY) / 2,
  };
  // Content origin: board centre maps to paper centre, then the tile's offset shifts
  // that origin so each page shows a different slice of the printed-size content.
  const originPx = {
    x: (paperSize.width / 2 - (tileOffsetCm?.x ?? 0)) * PRINT_PX_PER_CM,
    y: (paperSize.height / 2 - (tileOffsetCm?.y ?? 0)) * PRINT_PX_PER_CM,
  };
  // The on-screen preview and the print portal both render a PrintPage for the same
  // tile at the same time (see <PrintPortal> below) — a plain tileLabel/coordLabel id
  // would collide between those two instances, making `url(#id)` clip-path references
  // ambiguous. useId() keeps every instance's ids unique regardless of duplication.
  const instanceId = useId();
  const clipId = `tile-clip-${instanceId}-${tileLabel ?? "single"}-${coordLabel ?? ""}`;

  return (
    <div className="print-page">
      <svg width={paperPx.width} height={paperPx.height} className="print-preview-panel__page-svg">
        <defs>
          <clipPath id={clipId}>
            <rect x={0} y={0} width={paperPx.width} height={paperPx.height} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          <g
            transform={`translate(${originPx.x}, ${originPx.y}) scale(${effectiveScale * PRINT_PX_PER_CM}) translate(${-boardCenter.x}, ${-boardCenter.y})`}
          >
            <defs>
              {elements.background && (
                <BoardFillDefs
                  id={`print-fill-${clipId}`}
                  appearance={state.board.appearance}
                />
              )}
            </defs>
            {elements.grid && (
              <g opacity={GRID_OPACITY}>
                {Array.from({ length: 200 }, (_, i) => i - 100).map((i) => (
                  <line
                    key={`v${i}`}
                    x1={i}
                    y1={-500}
                    x2={i}
                    y2={500}
                    stroke="black"
                    strokeWidth={gridStrokeWidthCm}
                  />
                ))}
                {Array.from({ length: 200 }, (_, i) => i - 100).map((i) => (
                  <line
                    key={`h${i}`}
                    x1={-500}
                    y1={i}
                    x2={500}
                    y2={i}
                    stroke="black"
                    strokeWidth={gridStrokeWidthCm}
                  />
                ))}
              </g>
            )}
            {elements.boardOutline && (
              <path
                d={pathToSvgD(path)}
                fill={
                  elements.background
                    ? boardFillPaint(
                        `print-fill-${clipId}`,
                        state.board.appearance,
                      )
                    : "none"
                }
                stroke="black"
                strokeWidth={0.05}
              />
            )}
            {elements.threads &&
              state.threadLayers.flatMap((l) =>
                l.threadPaths.map((t) => {
                  const points = t.pinIds
                    .map((id) => findPinById(state.pinLayers, id))
                    .filter((p): p is NonNullable<typeof p> => !!p);
                  if (points.length < 2) return null;
                  const d = points
                    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
                    .join(" ");
                  return (
                    <path
                      key={t.id}
                      d={d}
                      fill="none"
                      stroke={t.colours[0]}
                      strokeWidth={0.03}
                    />
                  );
                }),
              )}
            {state.pinLayers.flatMap((l) =>
              l.pinPaths.map((p) => {
                const center = geometryCenter(p.geometry);
                // A Text Pin Path is N independent closed contours (every glyph
                // outline is a closed loop) — treat it as closed for label placement,
                // the same as Circle/Ellipse.
                const closed = p.geometry.type === "text" ? true : geometryToContourPaths(p.geometry)[0].closed;
                const mirroredCenters = mirroredGeometryCenters(p);
                const offsetCm = pinNumberOffsetCm(p.diameter);
                const labelPositions = pinLabelPositions(p.pins, closed, center, offsetCm);
                return (
                  <g key={p.id}>
                    {elements.pinGuides && (
                      <path
                        d={geometryToContourPaths(p.geometry).map(pathToSvgD).join(" ")}
                        fill="none"
                        stroke="black"
                        strokeOpacity={0.8}
                        strokeWidth={0.03}
                        strokeDasharray="0.15 0.1"
                      />
                    )}
                    {elements.pins &&
                      p.pins.map((pin, i) => {
                        const labelPos = labelPositions[i];
                        return (
                          <g key={pin.id}>
                            <circle
                              cx={pin.x}
                              cy={pin.y}
                              r={pinDotRadiusCm(p.diameter)}
                              fill="black"
                            />
                            {elements.pinNumbers && (
                              <text
                                x={labelPos.x}
                                y={labelPos.y}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fontSize={pinNumberFontCm}
                                fill="black"
                              >
                                {i + 1}
                              </text>
                            )}
                          </g>
                        );
                      })}
                    {/* docs/specs/06-symmetry.md — a mirrored pin is a real physical pin
                      on the board, so it prints too, numbered after its source. */}
                    {elements.pins &&
                      computeMirroredPinGroups(p).flatMap(
                        (group, groupIndex) => {
                          const mirroredCenter = mirroredCenters[groupIndex];
                          const mirroredLabelPositions = pinLabelPositions(group, closed, mirroredCenter, offsetCm);
                          return group.map((pin, i) => {
                            const labelPos = mirroredLabelPositions[i];
                            return (
                              <g key={pin.id}>
                                <circle
                                  cx={pin.x}
                                  cy={pin.y}
                                  r={pinDotRadiusCm(p.diameter)}
                                  fill="black"
                                />
                                {elements.pinNumbers && (
                                  <text
                                    x={labelPos.x}
                                    y={labelPos.y}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    fontSize={pinNumberFontCm}
                                    fill="black"
                                  >
                                    {i + 1}
                                  </text>
                                )}
                              </g>
                            );
                          });
                        },
                      )}
                  </g>
                );
              }),
            )}
          </g>
        </g>

        {trimMarks && (
          <g stroke="black" strokeWidth={1} opacity={0.6}>
            <line x1={0} y1={12} x2={12} y2={12} />
            <line x1={12} y1={0} x2={12} y2={12} />
            <line x1={paperPx.width - 12} y1={12} x2={paperPx.width} y2={12} />
            <line
              x1={paperPx.width - 12}
              y1={0}
              x2={paperPx.width - 12}
              y2={12}
            />
            <line
              x1={0}
              y1={paperPx.height - 12}
              x2={12}
              y2={paperPx.height - 12}
            />
            <line
              x1={12}
              y1={paperPx.height - 12}
              x2={12}
              y2={paperPx.height}
            />
            <line
              x1={paperPx.width - 12}
              y1={paperPx.height - 12}
              x2={paperPx.width}
              y2={paperPx.height - 12}
            />
            <line
              x1={paperPx.width - 12}
              y1={paperPx.height - 12}
              x2={paperPx.width - 12}
              y2={paperPx.height}
            />
          </g>
        )}
        {alignmentMarks && (
          <g stroke="black" strokeWidth={1} opacity={0.5}>
            <line
              x1={paperPx.width / 2 - 6}
              y1={paperPx.height / 2}
              x2={paperPx.width / 2 + 6}
              y2={paperPx.height / 2}
            />
            <line
              x1={paperPx.width / 2}
              y1={paperPx.height / 2 - 6}
              x2={paperPx.width / 2}
              y2={paperPx.height / 2 + 6}
            />
          </g>
        )}
        {(tileLabel || coordLabel) && (
          <text
            x={paperPx.width - 8}
            y={paperPx.height - 8}
            textAnchor="end"
            fontSize={11}
            fill="black"
            opacity={0.7}
          >
            {[coordLabel, tileLabel].filter(Boolean).join(" · ")}
          </text>
        )}
      </svg>
    </div>
  );
}
