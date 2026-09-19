import { useEffect, type ComponentType, type CSSProperties } from "react";
import { Menu, MenuItem } from "@spaceymonk/react-radial-menu";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Circle,
  Ellipse,
  Eraser,
  GitMerge,
  Maximize,
  Minus,
  MousePointer2,
  Move,
  Pause,
  PenLine,
  PenTool,
  Play as PlayIcon,
  RectangleHorizontal,
  RotateCw,
  Scaling,
  Scissors,
  SkipBack,
  SkipForward,
  Spline,
  Square,
  Trash2,
  Waypoints,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { EditorState, EditorStore } from "../../../application/document";
import type { Point } from "../../../domain/paths";
import type { PlaybackTransport } from "../../toolbars/usePlaybackTransport";
import { fitViewportForBoard } from "../boardViewport";
import { zoomInStep, zoomOutStep } from "../zoomSteps";
import { getRadialMenuSliceIds, type RadialMenuSliceId } from "./radialMenuSlices";

const TOOLTIP_ID = "radial-context-menu-tooltip";
const INNER_RADIUS = 32;
const OUTER_RADIUS = 100;

// docs/specs/18-design-system.md §Radial context menu — the library themes itself via
// these internal CSS custom properties; overriding them here (rather than using its
// built-in light/dark themes) is how the menu picks up this app's own design tokens
// instead of the library's defaults.
const MENU_STYLE = {
  "--__reactRadialMenu__menu-bgColor": "var(--bg-panel-2)",
  "--__reactRadialMenu__separator-color": "var(--border)",
  "--__reactRadialMenu__item-color": "var(--text-secondary)",
  "--__reactRadialMenu__activeItem-bgColor": "var(--accent-soft)",
  "--__reactRadialMenu__activeItem-color": "var(--accent)",
  "--__reactRadialMenu__arrow-color": "var(--text-secondary)",
  "--__reactRadialMenu__activeArrow-color": "var(--accent)",
  filter: "drop-shadow(var(--shadow-float))",
} as CSSProperties;

interface SliceDescriptor {
  icon: ComponentType<{ size?: number }>;
  tooltip: string;
  onSelect: () => void;
}

function buildDescriptor(
  id: RadialMenuSliceId,
  ctx: { t: (key: string) => string; store: EditorStore; state: EditorState; transport: PlaybackTransport; anchorPoint: Point },
): SliceDescriptor {
  const { t, store, state, transport, anchorPoint } = ctx;
  switch (id) {
    case "select":
      return { icon: MousePointer2, tooltip: t("selectToolbar.tools.select.label"), onSelect: () => store.setSelectTool("select") };
    case "move":
      return { icon: Move, tooltip: t("selectToolbar.tools.move.label"), onSelect: () => store.setSelectTool("move") };
    case "rotate":
      return { icon: RotateCw, tooltip: t("selectToolbar.tools.rotate.label"), onSelect: () => store.setSelectTool("rotate") };
    case "scale":
      return { icon: Scaling, tooltip: t("selectToolbar.tools.scale.label"), onSelect: () => store.setSelectTool("scale") };
    case "merge":
      return { icon: GitMerge, tooltip: t("selectToolbar.tools.merge.label"), onSelect: () => store.commitSelectionMerge() };
    case "pinLine":
      return { icon: Minus, tooltip: t("pinToolbar.basicTools.line"), onSelect: () => store.setPinTool("line") };
    case "pinArc":
      return { icon: Spline, tooltip: t("pinToolbar.basicTools.arc"), onSelect: () => store.setPinTool("arc") };
    case "pinEllipse":
      return { icon: Ellipse, tooltip: t("pinToolbar.basicTools.ellipse"), onSelect: () => store.setPinTool("ellipse") };
    case "pinCircle":
      return { icon: Circle, tooltip: t("pinToolbar.basicTools.circle"), onSelect: () => store.setPinTool("circle") };
    case "pinRectangle":
      return { icon: RectangleHorizontal, tooltip: t("pinToolbar.basicTools.rectangle"), onSelect: () => store.setPinTool("rectangle") };
    case "pinSquare":
      return { icon: Square, tooltip: t("pinToolbar.basicTools.square"), onSelect: () => store.setPinTool("square") };
    case "pinFreehand":
      return { icon: PenTool, tooltip: t("pinToolbar.basicTools.freehand"), onSelect: () => store.setPinTool("freehand") };
    case "pinPath":
      return { icon: Waypoints, tooltip: t("pinToolbar.basicTools.path"), onSelect: () => store.setPinTool("polygon") };
    case "pinEraser":
      return { icon: Eraser, tooltip: t("pinToolbar.eraser"), onSelect: () => store.setPinTool("eraser") };
    case "pinPathEraser":
      return { icon: Trash2, tooltip: t("pinToolbar.pathEraser"), onSelect: () => store.setPinTool("path-eraser") };
    case "threadDraw":
      return { icon: PenLine, tooltip: t("threadToolbar.draw"), onSelect: () => store.setThreadTool("draw") };
    case "threadEraser":
      return { icon: Eraser, tooltip: t("threadToolbar.eraser"), onSelect: () => store.setThreadTool("eraser") };
    case "threadSegment":
      return { icon: Scissors, tooltip: t("threadToolbar.segment"), onSelect: () => store.setThreadTool("segment-eraser") };
    case "threadCut":
      return { icon: Scissors, tooltip: t("radialMenu.cut"), onSelect: () => store.finishThreadDraft(state.activeThreadLayerId) };
    case "threadBack":
      return { icon: ArrowLeft, tooltip: t("radialMenu.back"), onSelect: () => store.retractThreadDraft() };
    case "threadNext":
      return { icon: ArrowRight, tooltip: t("radialMenu.next"), onSelect: () => store.advanceThreadDraftByPattern() };
    case "polygonCut":
      return { icon: Scissors, tooltip: t("radialMenu.cut"), onSelect: () => store.finishPolygonDraft(state.activePinLayerId) };
    case "polygonBack":
      return { icon: ArrowLeft, tooltip: t("radialMenu.back"), onSelect: () => store.retractPolygonDraft() };
    case "polygonCancel":
      return { icon: X, tooltip: t("radialMenu.cancel"), onSelect: () => store.cancelPolygonDraft() };
    case "panFit":
      return { icon: Maximize, tooltip: t("canvasToolbar.fit"), onSelect: () => store.setViewport(fitViewportForBoard(state.board)) };
    case "panZoomIn":
      return { icon: ZoomIn, tooltip: t("canvasToolbar.zoomIn"), onSelect: () => store.setViewport(zoomInStep(state.viewport, anchorPoint)) };
    case "panZoomOut":
      return { icon: ZoomOut, tooltip: t("canvasToolbar.zoomOut"), onSelect: () => store.setViewport(zoomOutStep(state.viewport, anchorPoint)) };
    case "playFirst":
      return { icon: SkipBack, tooltip: t("playToolbar.firstFrame"), onSelect: transport.first };
    case "playPrevious":
      return { icon: ChevronLeft, tooltip: t("playToolbar.previousFrame"), onSelect: transport.previous };
    case "playToggle":
      return {
        icon: transport.isPlaying ? Pause : PlayIcon,
        tooltip: transport.isPlaying ? t("playToolbar.pause") : t("playToolbar.play"),
        onSelect: () => (transport.isPlaying ? transport.pause() : transport.play()),
      };
    case "playNext":
      return { icon: ChevronRight, tooltip: t("playToolbar.nextFrame"), onSelect: transport.next };
    case "playLast":
      return { icon: SkipForward, tooltip: t("playToolbar.lastFrame"), onSelect: transport.last };
  }
}

export interface RadialMenuPosition {
  x: number;
  y: number;
  anchorPoint: Point;
}

// docs/specs/25-radial-context-menu.md — cursor-anchored, mode-aware radial menu.
// Mounted once in EditorShell.tsx (not per-Canvas) since it must cover both the
// interactive Canvas (Select/Pin/Thread/Pan) and the separate PlaybackCanvas (Play).
export function RadialContextMenu({
  store,
  state,
  transport,
  position,
  onClose,
}: {
  store: EditorStore;
  state: EditorState;
  transport: PlaybackTransport;
  position: RadialMenuPosition;
  onClose: () => void;
}) {
  const { t } = useTranslation("toolbars");

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const sliceIds = getRadialMenuSliceIds(state);
  const descriptors = sliceIds.map((id) => buildDescriptor(id, { t, store, state, transport, anchorPoint: position.anchorPoint }));

  return (
    <>
      {/* Outside-click dismissal — the Menu's own SVG only paints its ring, so clicks
          landing anywhere else on this full-bleed backdrop close the menu without
          firing an action; a slice click's own stopPropagation (built into the
          library) never reaches this handler. */}
      <div
        data-testid="radial-menu-backdrop"
        onClick={onClose}
        style={{ position: "absolute", inset: 0, zIndex: 1 }}
      />
      <Menu
        centerX={position.x}
        centerY={position.y}
        innerRadius={INNER_RADIUS}
        outerRadius={OUTER_RADIUS}
        show
        animation={["fade", "scale"]}
        animationTimeout={150}
        style={MENU_STYLE}
      >
        {descriptors.map((slice, i) => (
          <MenuItem
            key={sliceIds[i]}
            onItemClick={() => {
              slice.onSelect();
              onClose();
            }}
            data-tooltip-id={TOOLTIP_ID}
            data-tooltip-content={slice.tooltip}
          >
            <slice.icon size={16} />
          </MenuItem>
        ))}
      </Menu>
      <Tooltip id={TOOLTIP_ID} place="top" />
    </>
  );
}
