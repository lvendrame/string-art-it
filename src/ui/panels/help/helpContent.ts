import type { ComponentType } from "react";
import { Hand, Keyboard, Layers as LayersIcon, MousePointer2, Pin as PinIcon, Play, Spline } from "lucide-react";
import type { EditorMode } from "../../../application/document";

export type HelpTabId = "edit" | "pin" | "thread" | "pan" | "play" | "layers" | "keyboard-mouse";

export interface HelpItem {
  label: string;
  description: string;
}

export interface HelpSection {
  heading?: string;
  items: HelpItem[];
}

export interface HelpTab {
  id: HelpTabId;
  label: string;
  icon: ComponentType<{ size?: number }>;
  sections: HelpSection[];
}

// docs/specs/20-help.md — maps the live EditorMode to the Help tab shown by default
// when the modal opens, so Help always opens "on the thing you're doing." Layers and
// Keyboard & Mouse have no corresponding EditorMode, so they're simply never a target.
export const MODE_TO_HELP_TAB: Record<EditorMode, HelpTabId> = {
  select: "edit",
  pin: "pin",
  thread: "thread",
  pan: "pan",
  play: "play",
};

export const HELP_TABS: HelpTab[] = [
  {
    id: "edit",
    label: "Edit",
    icon: MousePointer2,
    sections: [
      {
        heading: "Tools",
        items: [
          { label: "Select", description: "Click a pin to select its Pin Path, exposing its geometry for editing." },
          { label: "Move", description: "Press-drag-release to translate the selected Pin Path. Disabled unless a Pin Path is selected; commits as one undo step." },
          { label: "Rotation", description: "Press-drag-release to rotate the selected Pin Path about the point where the mouse was pressed, 0.3° per screen pixel (drag right to increase). Disabled unless a Pin Path is selected; commits as one undo step." },
          { label: "Scale", description: "Press-drag-release to resize the selected Pin Path about its own centre (drag right to grow, left to shrink). Recalculates pin count and reattaches any connected threads to the nearest new pin. Disabled unless a Pin Path is selected; commits as one undo step." },
          { label: "Merge", description: "Left-click accumulates pins (from any Pin Path or layer) into a pending set; right-click commits them into one new pin at their average position. Esc cancels an in-progress Move, Rotation, Scale, or Merge." },
        ],
      },
      {
        heading: "Selection panel (shown when a Pin Path is selected)",
        items: [
          { label: "Pin distance", description: "The requested spacing between pins on the selected Pin Path. Editing it recalculates pin count and reattaches any connected threads to the nearest new pin, as one undo step." },
          { label: "Geometry fields", description: "Live-editable numeric fields for the selected shape's geometry (position, radius, rotation, etc. — varies by shape type). Editing a field recalculates the generated pins immediately." },
          { label: "Symmetry", description: "The same Symmetry controls as Pin mode, scoped to the selected Pin Path." },
          { label: "Delete Pin Path", description: "Deletes the selected Pin Path along with its pins and any symmetry copies." },
        ],
      },
    ],
  },
  {
    id: "pin",
    label: "Pin",
    icon: PinIcon,
    sections: [
      {
        heading: "Drawing tools",
        items: [
          { label: "Line", description: "Click a start point, then an end point, to draw a straight Line Pin Path." },
          { label: "Arc", description: "Click a start point, then an end point, then drag to shape the curvature and click again to confirm." },
          { label: "Ellipse", description: "Press-drag-release a bounding box. Hold Alt while dragging to constrain it to a Circle." },
          { label: "Circle", description: "Press-drag-release to size a Circle Pin Path." },
          { label: "Rect", description: "Press-drag-release a bounding box. Hold Alt while dragging to constrain it to a Square." },
          { label: "Square", description: "Press-drag-release to size a Square Pin Path." },
          { label: "Freehand", description: "Drag to sample a freehand path of pins as you move." },
          { label: "Eraser", description: "Click a pin to remove that one pin." },
          { label: "Path Eraser", description: "Click a Pin Path to remove the whole path, cascading into any thread segments that referenced its pins. One undo step." },
          { label: "Polygon / Star", description: "A dropdown activating a regular polygon (Pentagon, Hexagon, Octagon), conventional star (5/6/8-point), or polygram (Pentagram, Heptagram, Octagram) drawing tool." },
        ],
      },
      {
        heading: "Pin Properties (defaults, or the selected Pin Path's own values)",
        items: [
          { label: "Spacing (cm)", description: "The requested distance between generated pins." },
          { label: "Actual gap", description: "Read-only — the real computed spacing after distribution. Only shown when a Pin Path is selected." },
          { label: "Diameter (mm)", description: "Pin diameter." },
          { label: "Colour", description: "Pin colour." },
          { label: "Guide visible", description: "Shows or hides the underlying guide geometry line, independent of pin visibility." },
        ],
      },
      {
        heading: "Symmetry",
        items: [
          { label: "None / Horiz / Vert / Both / Radial", description: "Selects the symmetry mode. Copies are generated live and stay logically linked to the source pins." },
          { label: "Interval (°)", description: "Radial symmetry only — angular spacing between copies. Accepts custom, non-preset values." },
          { label: "Centre X / Centre Y", description: "Radial symmetry only — the symmetry centre position. Also draggable directly on the canvas; snaps to the grid while dragging." },
        ],
      },
    ],
  },
  {
    id: "thread",
    label: "Thread",
    icon: Spline,
    sections: [
      {
        heading: "Tools",
        items: [
          { label: "Draw", description: "Click a pin to start or extend a Thread Path (snaps to the nearest pin). Double-click finishes with a final segment; right-click finishes without adding one. Esc cancels/discards the in-progress draft; ArrowLeft retracts the draft's last point." },
          { label: "Eraser", description: "Click a Thread Path to remove the whole path in one click." },
          { label: "Segment", description: "Click one segment to remove it, splitting the path into up to two surviving fragments (a fragment left with under 2 pins is dropped). Pins themselves are untouched." },
        ],
      },
      {
        heading: "Thread properties",
        items: [
          { label: "Colour count (1 / 2 / 3)", description: "How many strands the thread renders as — a single strand, or a two/three-colour spiral. Geometry is unaffected." },
          { label: "Colour swatches", description: "One colour picker per active strand." },
          { label: "Width", description: "Thread stroke width." },
          { label: "Twist pitch", description: "Only shown with 2+ colours — controls how tightly the spiral twists." },
          { label: "Pin state legend", description: "Read-only reference showing the four pin highlight states: Normal, Nearest candidate, Active origin, and Used in this thread." },
        ],
      },
    ],
  },
  {
    id: "pan",
    label: "Pan",
    icon: Hand,
    sections: [
      {
        heading: "Canvas",
        items: [
          { label: "Left-click-drag", description: "Pans the viewport anywhere on the canvas while in Pan mode." },
        ],
      },
      {
        heading: "Grid",
        items: [
          { label: "Grid ON/OFF", description: "Toggles grid line visibility." },
          { label: "Snap ON/OFF", description: "Toggles snap-to-grid while drawing or dragging." },
          { label: "Gap X / Gap Y", description: "Grid cell spacing, in cm." },
          { label: "Grid colour", description: "Colour of the grid lines." },
          { label: "Grid opacity", description: "Grid line opacity, 0–1." },
        ],
      },
      {
        heading: "Zoom",
        items: [
          { label: "Zoom out / Zoom in", description: "Steps the zoom level by ÷1.25 / ×1.25, centred on the viewport centre." },
          { label: "Fit", description: "Resets the viewport to fit the whole board in view." },
        ],
      },
    ],
  },
  {
    id: "play",
    label: "Play",
    icon: Play,
    sections: [
      {
        heading: "Transport",
        items: [
          { label: "First / Previous / Next / Last", description: "Jump to frame 0, one frame back, one frame forward, or the last frame. Any of these pauses playback if it was running." },
          { label: "Play / Pause", description: "Auto-advances one frame per interval tick; stops (does not loop) at the last frame. Pressing Play again while already at the last frame restarts from frame 0." },
          { label: "Frame", description: "An editable field — typing a value jumps to that frame (clamped) and pauses playback." },
          { label: "Total", description: "Read-only total frame count." },
          { label: "Time between frames (ms)", description: "Controls the auto-advance interval." },
        ],
      },
      {
        heading: "Export",
        items: [
          { label: "Export to Video", description: "Records the animation to a .webm file, showing live \"Exporting… N/total\" progress. Disabled if the browser doesn't support video recording, or there are zero frames to play." },
        ],
      },
    ],
  },
  {
    id: "layers",
    label: "Layers",
    icon: LayersIcon,
    sections: [
      {
        heading: "Pin Layers / Thread Layers",
        items: [
          { label: "Tab switch", description: "Two fully independent lists — a Pin Layer never contains Thread Paths and vice versa. The visible tab automatically follows the current Editor mode (Pin mode shows Pin Layers, Thread mode shows Thread Layers); Edit/Pan/Play leave it as you last set it." },
        ],
      },
      {
        heading: "Per-layer row",
        items: [
          { label: "Eye icon", description: "Shows or hides the layer. Purely visual — hidden contents are retained and still function (e.g. still referenceable by threads)." },
          { label: "Lock icon", description: "Locks or unlocks the layer. A locked layer blocks all create/move/resize/rotate/erase/property-change operations on its contents; visibility can still be toggled." },
          { label: "Name (double-click)", description: "Double-click a layer's name to rename it inline." },
          { label: "Click row", description: "Selects that layer as the active layer for new objects and layer actions." },
        ],
      },
      {
        heading: "Layer actions",
        items: [
          { label: "New Layer", description: "Creates a new, empty, visible, unlocked layer of the active kind." },
          { label: "Duplicate", description: "Duplicates the active layer and its objects with new stable IDs. Thread references to duplicated pins still point at the originals, not the copies." },
          { label: "Move layer up / down", description: "Moves the active layer up or down in stacking/render order." },
          { label: "Delete", description: "Deletes the active layer and all its contents in one undo step. Disabled when only one layer remains." },
        ],
      },
    ],
  },
  {
    id: "keyboard-mouse",
    label: "Keyboard & Mouse",
    icon: Keyboard,
    sections: [
      {
        heading: "Keyboard",
        items: [
          { label: "Ctrl/Cmd+Z", description: "Undo. Ignored while a text field (an input, textarea, or editable text) has focus." },
          { label: "Ctrl/Cmd+Shift+Z", description: "Redo. Same text-field exception as Undo." },
          { label: "Escape", description: "Cancels the active tool's in-progress action: an unfinished thread draft, an in-progress Move or Rotation drag, or a pending Merge selection — whichever applies to the current mode/tool." },
          { label: "ArrowLeft", description: "Thread Draw tool only — retracts the last point of the in-progress thread draft." },
          { label: "Alt (held while dragging)", description: "Pin mode Ellipse/Rectangle tools only — constrains the shape to a Circle/Square. Releasing Alt mid-drag reverts to unconstrained." },
        ],
      },
      {
        heading: "Mouse",
        items: [
          { label: "Left button", description: "Drives every draw, select, and drag gesture across every mode." },
          { label: "Right-click", description: "Reserved for specific per-tool actions only — committing a Merge (Edit mode), or finishing a thread draft without adding a final segment (Thread mode). It is never a generic context menu." },
          { label: "Double-click", description: "Thread Draw tool — finishes the in-progress draft, adding one final segment to the clicked pin." },
          { label: "Left-drag", description: "Pans the viewport in Pan mode; press-drag-release also drives Move/Rotation in Edit mode and most shape tools in Pin mode." },
        ],
      },
    ],
  },
];
