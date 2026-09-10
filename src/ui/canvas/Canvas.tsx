import { useEffect, useMemo, useRef, useState } from "react";
import {
  boardPath,
  computeMirroredPinGroups,
  curvatureFromCursor,
  DRAG_TOOLS,
  findPinById,
  geometryFromDrag,
  geometryToPath,
  type EditorStore,
  type PinLayer,
  type PinPath,
  type SymmetryConfig,
  type ThreadPath,
} from "../../application/document";
import { boundingBoxOf, fitToViewport, toDocument } from "../../domain/transforms";
import { resolveSnapPosition, type SnapPin } from "../../domain/snapping";
import { pathBoundingBoxPoints, type Point } from "../../domain/paths";
import { BoardFillDefs, boardFillPaint } from "../../infrastructure/rendering/boardFill";
import { pathToSvgD } from "../../infrastructure/rendering/svgPath";
import { useEditorState } from "../useEditorStore";
import { StatusBar } from "./StatusBar";

const VIEWPORT_PX = { width: 720, height: 640 };

interface ArcDraft {
  start: Point;
  end?: Point;
}

export function Canvas({ store }: { store: EditorStore }) {
  const state = useEditorState(store);
  const containerRef = useRef<HTMLDivElement>(null);
  const altHeldRef = useRef(false);

  const [cursorDoc, setCursorDoc] = useState<Point | null>(null);
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [arcDraft, setArcDraft] = useState<ArcDraft | null>(null);
  const [threadCandidateId, setThreadCandidateId] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Alt") altHeldRef.current = true;
      if (e.key === "Escape" && store.getState().mode === "thread") {
        store.escapeThreadDraft(store.getState().activeThreadLayerId);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => { if (e.key === "Alt") altHeldRef.current = false; };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [store]);

  const path = useMemo(() => boardPath(state.board), [state.board]);
  const pathD = useMemo(() => pathToSvgD(path), [path]);
  const box = useMemo(() => boundingBoxOf(pathBoundingBoxPoints(path)), [path]);

  const fitViewport = () => {
    const padded = { minX: box.minX - 5, minY: box.minY - 5, maxX: box.maxX + 5, maxY: box.maxY + 5 };
    store.setViewport(fitToViewport(padded, VIEWPORT_PX, 20));
  };

  const { viewport } = state;
  const viewBox = `${viewport.panOrigin.x} ${viewport.panOrigin.y} ${VIEWPORT_PX.width / viewport.zoom} ${VIEWPORT_PX.height / viewport.zoom}`;
  const layerId = state.activePinLayerId;
  const threadLayerId = state.activeThreadLayerId;
  const allPins: SnapPin[] = useMemo(
    () => state.pinLayers.flatMap((l) => l.pinPaths.flatMap((p) => p.pins)),
    [state.pinLayers],
  );

  function screenToDoc(e: React.MouseEvent<SVGSVGElement>): Point {
    const rect = e.currentTarget.getBoundingClientRect();
    return toDocument({ x: e.clientX - rect.left, y: e.clientY - rect.top }, viewport);
  }

  function resolvePoint(raw: Point): Point {
    const result = resolveSnapPosition(raw, {
      pins: allPins,
      pinSnapEnabled: state.snap.pinSnapEnabled,
      snapRadiusPx: state.snap.radiusPx,
      gridSnapEnabled: state.grid.snapEnabled,
      gridGap: { x: state.grid.gapX, y: state.grid.gapY },
      viewport,
    });
    return result.point;
  }

  function nearestPinOwner(point: Point, maxDocDistance: number): { layerId: string; pathId: string; pinId: string } | null {
    let best: { layerId: string; pathId: string; pinId: string } | null = null;
    let bestDist = Infinity;
    for (const l of state.pinLayers) {
      for (const p of l.pinPaths) {
        for (const pin of p.pins) {
          const d = Math.hypot(pin.x - point.x, pin.y - point.y);
          if (d <= maxDocDistance && d < bestDist) {
            bestDist = d;
            best = { layerId: l.id, pathId: p.id, pinId: pin.id };
          }
        }
      }
    }
    return best;
  }

  function distanceToSegment(p: Point, a: Point, b: Point): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSq = dx * dx + dy * dy;
    const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
  }

  // docs/specs/31-erasers Thread Eraser: click near any segment removes that whole
  // Thread Path (segment-level splitting is a scope reduction — see orchestrator M5).
  function nearestThreadPath(point: Point, maxDocDistance: number): { layerId: string; pathId: string } | null {
    let best: { layerId: string; pathId: string } | null = null;
    let bestDist = Infinity;
    for (const l of state.threadLayers) {
      for (const t of l.threadPaths) {
        for (let i = 0; i < t.pinIds.length - 1; i += 1) {
          const a = findPinById(state.pinLayers, t.pinIds[i]);
          const b = findPinById(state.pinLayers, t.pinIds[i + 1]);
          if (!a || !b) continue;
          const d = distanceToSegment(point, a, b);
          if (d <= maxDocDistance && d < bestDist) {
            bestDist = d;
            best = { layerId: l.id, pathId: t.id };
          }
        }
      }
    }
    return best;
  }

  function handlePointerDown(e: React.MouseEvent<SVGSVGElement>) {
    const raw = screenToDoc(e);
    const point = resolvePoint(raw);
    const maxDist = state.snap.radiusPx / viewport.zoom;

    if (state.mode === "select") {
      const hit = nearestPinOwner(raw, maxDist);
      store.select(hit ? { type: "pinPath", layerId: hit.layerId, pathId: hit.pathId } : { type: "none" });
      return;
    }

    if (state.mode === "thread") {
      if (state.threadTool === "eraser") {
        const hitThread = nearestThreadPath(raw, maxDist);
        if (hitThread) store.deleteThreadPath(hitThread.layerId, hitThread.pathId);
        return;
      }
      const hit = nearestPinOwner(raw, maxDist);
      if (hit) store.extendThreadDraft(hit.pinId);
      return;
    }

    if (state.mode !== "pin") return;

    if (state.pinTool === "eraser") {
      const hit = nearestPinOwner(raw, maxDist);
      if (hit) store.erasePin(hit.layerId, hit.pathId, hit.pinId);
      return;
    }

    if (state.pinTool === "line") {
      if (!dragStart) setDragStart(point);
      else {
        store.addPinPath(layerId, { type: "line", start: dragStart, end: point });
        setDragStart(null);
      }
      return;
    }

    if (state.pinTool === "arc") {
      if (!arcDraft) setArcDraft({ start: point });
      else if (!arcDraft.end) setArcDraft({ ...arcDraft, end: point });
      else {
        const curvature = curvatureFromCursor(arcDraft.start, arcDraft.end, point);
        store.addPinPath(layerId, { type: "arc", start: arcDraft.start, end: arcDraft.end, curvature });
        setArcDraft(null);
      }
      return;
    }

    if (DRAG_TOOLS.includes(state.pinTool)) {
      setDragStart(point);
    }
  }

  function handlePointerMove(e: React.MouseEvent<SVGSVGElement>) {
    const raw = screenToDoc(e);
    setCursorDoc(resolvePoint(raw));
    if (state.mode === "thread") {
      const maxDist = state.snap.radiusPx / viewport.zoom;
      setThreadCandidateId(nearestPinOwner(raw, maxDist)?.pinId ?? null);
    }
  }

  function handlePointerUp(e: React.MouseEvent<SVGSVGElement>) {
    if (state.mode !== "pin" || !dragStart) return;
    if (!DRAG_TOOLS.includes(state.pinTool)) return;
    const point = resolvePoint(screenToDoc(e));
    const geometry = geometryFromDrag(state.pinTool, dragStart, point, altHeldRef.current);
    if (geometry) store.addPinPath(layerId, geometry);
    setDragStart(null);
  }

  // docs/specs/29-ending-cutting-thread
  function handleDoubleClick(e: React.MouseEvent<SVGSVGElement>) {
    if (state.mode !== "thread" || state.threadTool !== "draw") return;
    const raw = screenToDoc(e);
    const maxDist = state.snap.radiusPx / viewport.zoom;
    const hit = nearestPinOwner(raw, maxDist);
    if (hit) store.finishThreadDraftWithSegment(threadLayerId, hit.pinId);
  }

  function handleContextMenu(e: React.MouseEvent<SVGSVGElement>) {
    e.preventDefault();
    if (state.mode !== "thread" || state.threadTool !== "draw") return;
    store.finishThreadDraft(threadLayerId);
  }

  const previewGeometry = useMemo(() => {
    if (state.mode !== "pin" || !cursorDoc) return null;
    if (state.pinTool === "line" && dragStart) return { type: "line" as const, start: dragStart, end: cursorDoc };
    if (state.pinTool === "arc" && arcDraft?.end) {
      const curvature = curvatureFromCursor(arcDraft.start, arcDraft.end, cursorDoc);
      return { type: "arc" as const, start: arcDraft.start, end: arcDraft.end, curvature };
    }
    if (state.pinTool === "arc" && arcDraft && !arcDraft.end) return { type: "line" as const, start: arcDraft.start, end: cursorDoc };
    if (dragStart && DRAG_TOOLS.includes(state.pinTool)) return geometryFromDrag(state.pinTool, dragStart, cursorDoc, altHeldRef.current);
    return null;
  }, [state.mode, state.pinTool, cursorDoc, dragStart, arcDraft]);

  const threadStatusText = useMemo(() => {
    if (state.mode !== "thread" || !state.threadDraft) return null;
    const lastPinId = state.threadDraft.pinIds[state.threadDraft.pinIds.length - 1];
    const from = findPinById(state.pinLayers, lastPinId);
    const to = threadCandidateId ? findPinById(state.pinLayers, threadCandidateId) : cursorDoc;
    if (!from || !to) return null;
    const segment = Math.hypot(to.x - from.x, to.y - from.y);
    return `From Pin ${lastPinId} → ${threadCandidateId ?? "?"} | Segment: ${segment.toFixed(1)} cm`;
  }, [state.mode, state.threadDraft, state.pinLayers, threadCandidateId, cursorDoc]);

  const gridLines = state.grid.visible;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, background: "var(--bg-canvas)" }}>
      <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: "1px solid var(--border)" }}>
        <ToggleChip label={`Grid ${state.grid.visible ? "ON" : "OFF"}`} active={state.grid.visible} onClick={() => store.setGrid({ visible: !state.grid.visible })} />
        <ToggleChip label={`Snap ${state.grid.snapEnabled ? "ON" : "OFF"}`} active={state.grid.snapEnabled} onClick={() => store.setGrid({ snapEnabled: !state.grid.snapEnabled })} />
        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-secondary)" }}>
          Gap X
          <input
            type="number"
            className="mono"
            min={0.1}
            step={0.1}
            value={state.grid.gapX}
            onChange={(e) => store.setGrid({ gapX: Math.max(0.1, Number(e.target.value)) })}
            style={{ width: 52, background: "var(--bg-panel-2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", padding: "3px 6px", fontSize: 11 }}
          />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-secondary)" }}>
          Gap Y
          <input
            type="number"
            className="mono"
            min={0.1}
            step={0.1}
            value={state.grid.gapY}
            onChange={(e) => store.setGrid({ gapY: Math.max(0.1, Number(e.target.value)) })}
            style={{ width: 52, background: "var(--bg-panel-2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", padding: "3px 6px", fontSize: 11 }}
          />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-secondary)" }}>
          Grid colour
          <input
            type="color"
            value={state.grid.colour}
            onChange={(e) => store.setGrid({ colour: e.target.value })}
            style={{ width: 24, height: 22, border: "1px solid var(--border)", borderRadius: 4, background: "none", padding: 0 }}
          />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-secondary)" }}>
          Grid opacity
          <input
            type="number"
            className="mono"
            min={0}
            max={1}
            step={0.05}
            value={state.grid.opacity}
            onChange={(e) => store.setGrid({ opacity: Math.min(1, Math.max(0, Number(e.target.value))) })}
            style={{ width: 48, background: "var(--bg-panel-2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", padding: "3px 6px", fontSize: 11 }}
          />
        </label>
        <div style={{ flex: 1 }} />
        <button className="btn mono" style={{ borderRadius: 8, padding: "6px 10px", fontSize: 12 }} onClick={() => store.setViewport({ ...viewport, zoom: Math.max(0.5, viewport.zoom / 1.25) })}>
          −
        </button>
        <span className="mono" style={{ fontSize: 12, width: 46, textAlign: "center" }}>{Math.round(viewport.zoom * 100)}%</span>
        <button className="btn mono" style={{ borderRadius: 8, padding: "6px 10px", fontSize: 12 }} onClick={() => store.setViewport({ ...viewport, zoom: Math.min(40, viewport.zoom * 1.25) })}>
          +
        </button>
        <button className="btn" style={{ borderRadius: 8, padding: "6px 10px", fontSize: 12 }} onClick={fitViewport}>
          Fit
        </button>
      </div>

      <div ref={containerRef} style={{ flex: 1, position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg
          width={VIEWPORT_PX.width}
          height={VIEWPORT_PX.height}
          viewBox={viewBox}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onDoubleClick={handleDoubleClick}
          onContextMenu={handleContextMenu}
          role="img"
          aria-label="Board canvas"
        >
          <defs>
            <BoardFillDefs id="board-fill" appearance={state.board.appearance} />
            <pattern id="grid-dots" width={state.grid.gapX} height={state.grid.gapY} patternUnits="userSpaceOnUse">
              <UnclippedGridDot gapX={state.grid.gapX} gapY={state.grid.gapY} colour={state.grid.colour} opacity={state.grid.opacity} />
            </pattern>
          </defs>

          <path d={pathD} fill={boardFillPaint("board-fill", state.board.appearance)} stroke="#00000055" strokeWidth={0.1} data-testid="board-outline" />

          {gridLines && (
            <rect
              x={viewport.panOrigin.x}
              y={viewport.panOrigin.y}
              width={VIEWPORT_PX.width / viewport.zoom}
              height={VIEWPORT_PX.height / viewport.zoom}
              fill="url(#grid-dots)"
              data-testid="grid-overlay"
            />
          )}

          {state.pinLayers.flatMap((l) =>
            l.visible
              ? l.pinPaths.map((p) => (
                  <PinPathVisual key={p.id} pinPath={p} selected={state.selection.type === "pinPath" && state.selection.pathId === p.id} />
                ))
              : [],
          )}

          {state.mode === "pin" && <SymmetryOverlay config={store.getSelectedPinPath()?.symmetry ?? state.symmetryDefaults} />}

          {previewGeometry && (
            <path d={pathToSvgD(geometryToPath(previewGeometry))} fill="none" stroke="var(--accent)" strokeWidth={0.1} strokeDasharray="0.3 0.2" data-testid="pin-preview" />
          )}

          {state.threadLayers.flatMap((l) =>
            l.visible ? l.threadPaths.map((t) => <ThreadPathVisual key={t.id} threadPath={t} pinLayers={state.pinLayers} />) : [],
          )}

          {state.mode === "thread" && state.threadDraft && state.threadDraft.pinIds.length >= 2 && (
            <ThreadPathVisual
              threadPath={{
                id: "draft",
                colours: state.threadDefaults.colours,
                width: state.threadDefaults.width,
                twistPitch: state.threadDefaults.twistPitch,
                pinIds: state.threadDraft.pinIds,
              }}
              pinLayers={state.pinLayers}
            />
          )}

          {state.mode === "thread" && state.threadDraft && cursorDoc && (() => {
            const lastPinId = state.threadDraft.pinIds[state.threadDraft.pinIds.length - 1];
            const from = findPinById(state.pinLayers, lastPinId);
            const to = threadCandidateId ? findPinById(state.pinLayers, threadCandidateId) : cursorDoc;
            if (!from || !to) return null;
            return (
              <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={state.threadDefaults.colours[0]} strokeWidth={state.threadDefaults.width * 0.1} strokeDasharray="0.2 0.15" data-testid="thread-preview" />
            );
          })()}

          {state.mode === "thread" &&
            state.pinLayers.flatMap((l) =>
              l.pinPaths.flatMap((p) =>
                p.pins.map((pin) => {
                  const isOrigin = state.threadDraft && state.threadDraft.pinIds[state.threadDraft.pinIds.length - 1] === pin.id;
                  const isCandidate = threadCandidateId === pin.id && !isOrigin;
                  if (!isOrigin && !isCandidate) return null;
                  return (
                    <g key={pin.id} data-testid={isOrigin ? "pin-active-origin" : "pin-candidate"}>
                      {isCandidate && <circle cx={pin.x} cy={pin.y} r={0.35} fill="none" stroke="#e8b449" strokeWidth={0.07} />}
                      <circle cx={pin.x} cy={pin.y} r={0.16} fill={isOrigin ? "var(--accent)" : "#e8b449"} />
                    </g>
                  );
                }),
              ),
            )}
        </svg>
      </div>

      <StatusBar
        mode={state.mode}
        zoomPercent={Math.round(viewport.zoom * 100)}
        cursor={cursorDoc}
        pinTool={state.pinTool}
        previewGeometry={previewGeometry}
        spacing={state.pinDefaults.spacing}
        threadStatusText={threadStatusText}
      />
    </div>
  );
}

function PinPathVisual({ pinPath, selected }: { pinPath: PinPath; selected: boolean }) {
  const d = useMemo(() => pathToSvgD(geometryToPath(pinPath.geometry)), [pinPath.geometry]);
  const radius = pinPath.diameter / 20; // mm -> cm, then /2 for radius
  // docs/specs/06-symmetry.md: mirrored copies are derived from the source pins on
  // every render — never stored, so editing the source always keeps them in sync.
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

// docs/specs/25-thread-colour-rendering: geometry is one path (A -> B -> ...)
// regardless of strand count — 2/3 colours render as the SAME line repeated with an
// offset dash pattern per strand, never as separate parallel geometry.
function ThreadPathVisual({ threadPath, pinLayers }: { threadPath: ThreadPath; pinLayers: PinLayer[] }) {
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

function SymmetryOverlay({ config }: { config: SymmetryConfig }) {
  if (config.type === "none") return null;
  if (config.type === "radial") {
    const { centre, intervalDegrees } = config;
    const spokes = [];
    for (let a = 0; a < 360; a += intervalDegrees) spokes.push((a * Math.PI) / 180);
    return (
      <g opacity={0.5} data-testid="radial-overlay">
        {spokes.map((rad, i) => (
          <line key={i} x1={centre.x} y1={centre.y} x2={centre.x + Math.cos(rad) * 1000} y2={centre.y + Math.sin(rad) * 1000} stroke="var(--accent)" strokeWidth={0.03} strokeDasharray="0.15 0.25" />
        ))}
        <circle cx={centre.x} cy={centre.y} r={0.4} fill="none" stroke="var(--accent)" strokeWidth={0.06} />
        <circle cx={centre.x} cy={centre.y} r={0.1} fill="var(--accent)" />
      </g>
    );
  }
  const { axis } = config;
  return (
    <g opacity={0.5} data-testid="mirror-axis-overlay">
      {(config.type === "vertical" || config.type === "both") && (
        <line x1={axis.x} y1={-1000} x2={axis.x} y2={1000} stroke="var(--accent)" strokeWidth={0.03} strokeDasharray="0.15 0.25" />
      )}
      {(config.type === "horizontal" || config.type === "both") && (
        <line x1={-1000} y1={axis.y} x2={1000} y2={axis.y} stroke="var(--accent)" strokeWidth={0.03} strokeDasharray="0.15 0.25" />
      )}
    </g>
  );
}

function gridDotRadius(gapX: number, gapY: number): number {
  return Math.max(0.03, Math.min(gapX, gapY) * 0.06);
}

function UnclippedGridDot({ gapX, gapY, colour, opacity }: { gapX: number; gapY: number; colour: string; opacity: number }) {
  const r = gridDotRadius(gapX, gapY);
  return <circle cx={r} cy={r} r={r} fill={colour} fillOpacity={opacity} />;
}

function ToggleChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      className={`btn${active ? " btn-active" : ""}`}
      onClick={onClick}
      style={{ borderRadius: 999, padding: "6px 12px", fontSize: 11.5, fontWeight: 600, gap: 6 }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
      {label}
    </button>
  );
}
