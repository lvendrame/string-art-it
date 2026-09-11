# StringArtIt

StringArtIt is a browser-based tool for planning physical string-art boards. You define a board, place pins along geometric shapes, connect the pins with thread, and print a construction template to build the real thing.

## Quick start

Requires Node.js `>=22 <23`.

```bash
git clone git@github.com:lvendrame/string-art-it.git
cd string-art-it
npm install
npm run dev
```

Open the printed local URL in a browser.

## Setting up a board

The app opens on a board setup screen before you reach the editor:

1. Pick a **shape**: circle, oval, rectangle, square, or triangle (equilateral or right-angled).
2. Enter its **real-world dimensions in centimetres** (diameter, width/height, or side, depending on the shape).
3. Pick an **appearance**: solid colour, linear gradient, radial gradient, one of 8 wood presets, one of 4 painted-wood presets, or upload your own image as a custom texture.
4. Click **Continue to Editor**.

You can return to this screen at any time with the **New** button (this replaces the current board — save first if you want to keep it).

## The editor

The editor is laid out as:

- **Top bar** — File menu (New/Save/Open), Export, the mode switcher (Select/Pin/Thread/Pan), Undo/Redo, Stats, Print.
- **Left panel** — tools and settings for whichever mode is active.
- **Canvas (centre)** — the board. Left-click/drag to draw, per the active mode below.
- **Right panel** — Layers (separate lists for pin layers and thread layers).

### Canvas controls (all modes)

- **Zoom**: `−`/`+` buttons in the canvas toolbar, or **Fit** to frame the whole board.
- **Grid**: toggle visibility and snapping independently (a hidden grid can still snap). Configure gap X/Y, colour, and opacity.
- **Snap**: with grid-snap on, the canvas shows a small ring at the grid point your cursor will land on. With pin-snap on (default), the nearest pin always wins over the grid.

## Select mode

Click a pin to select the Pin Path it belongs to. The left panel then shows that shape's numeric properties (position, size, spacing, colour, diameter, guide visibility, symmetry) — edit the numbers directly rather than dragging handles on the canvas. Clicking empty space clears the selection.

## Pin mode

Pick a tool in the left panel, then draw on the canvas:

| Tool | How to draw |
|---|---|
| Line | Click the start point, click the end point. |
| Arc | Click the start point, click the end point, then move the cursor and click again to set how much the arc bulges. |
| Ellipse, Circle, Rectangle, Square | Click and drag from one corner to the opposite corner. **Hold Alt while dragging** an ellipse to force a circle, or a rectangle to force a square. |
| Pentagon, Hexagon, Octagon, 5/6/8-point star, Pentagram, Heptagram, Octagram | Pick from the "Polygon / Star" dropdown, then click and drag **from the centre outward** to set the radius. |
| Eraser | Click a pin to remove it (also removes any thread segments that referenced it). |

While drawing, the status bar shows live measurements (perimeter/length, pin count, actual spacing). Pin spacing, diameter, and guide-line visibility for the *next* shape you draw are set in the left panel before you start.

### Symmetry

Turn on Horizontal, Vertical, Both, or Radial symmetry in the left panel before (or while) drawing a shape. Mirrored/radial copies of the shape — and of its pins — appear live as you draw, and stay linked: editing the source shape later updates all its copies automatically. Radial symmetry has a centre point (numeric fields, not a canvas drag-handle) and a configurable angle interval.

## Thread mode

Threads connect existing pins only — you can't drop a thread endpoint on empty canvas.

- **Hover** near a pin: it's outlined as the nearest candidate.
- **Left-click** a candidate pin: starts (or extends) the thread. The pin you just clicked becomes the new "active origin," shown filled; every pin already used earlier in this thread is shown dimmed so you can see the path so far.
- **Double-click** a pin: adds a final segment to it and finishes the thread.
- **Right-click**: finishes the thread at the last confirmed pin, without adding whatever segment was being previewed.
- **Esc**: if no segment has been confirmed yet, cancels the thread outright; if at least one segment exists, finishes the thread where it is.
- **Left Arrow**: removes the last vertex you added. If only one vertex is left, removing it cancels the thread.
- **Eraser tool**: click near any segment to delete that whole Thread Path.

Thread appearance (1, 2, or 3 colours, width, twist pitch for multi-colour spirals) is set in the left panel and applies to new threads you draw; colours 2 and 3 twist around the first as one continuous strand, not separate parallel lines.

## Layers

The right panel has two tabs, Pin Layers and Thread Layers, each with the same controls:

- Click a row to make it the active layer (new pins/threads you draw go there).
- Click the eye icon to show/hide a layer — hidden layers keep their contents, they just don't render or print.
- Click the lock icon to lock/unlock — locked layers can't be edited, but stay visible and still print.
- Double-click a layer's name to rename it (Enter to confirm).
- **New Layer**, **Duplicate**, the up/down arrows to reorder, and **Delete** (disabled once only one layer is left).

## Undo / redo

| Shortcut | Action |
|---|---|
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` | Redo |

Also available as Undo/Redo buttons in the top bar, which grey out when there's nothing to undo/redo. Shortcuts are ignored while a text field has focus, so they don't interfere with the browser's own text editing.

## Printing

Click **Print** in the top bar to open the print preview:

1. Choose which elements print: board outline, background, pins, pin guide lines, pin numbers, threads, grid — independently of what's currently visible in the editor.
2. Choose a scale: actual size (1:1), fit to page, or a custom ratio.
3. Choose paper size (A4/A3/Letter/custom) and orientation.
4. If your printer/browser scales output slightly off, run **Print calibration test**: print the reference line, measure it with a ruler, enter the result, and the correction factor is applied to future 1:1 prints.
5. For a board bigger than one sheet, turn on **tiling** to split it across multiple pages, with configurable overlap and optional trim marks, alignment marks, page numbers, and page coordinates.
6. Click **Print** to open your browser's print dialog (or save as PDF from there).

## Exporting and saving

- **Export** menu: SVG or PDF (vector), PNG or JPEG (choose the DPI).
- **Save**: downloads the project as a `.json` file.
- **Open**: loads a previously saved `.json` project file.
- **Autosave**: the current project is saved to the browser's local storage as you work; if you reload with unsaved changes pending, you'll see a banner offering to restore or discard them.

## Development

```bash
npm run dev          # start the dev server
npm run build         # type-check and build for production
npm run preview       # preview the production build
npm run lint          # ESLint, including an architecture-boundary check
npm run test          # run the test suite once (Vitest)
npm run test:watch    # run the test suite in watch mode
```

Stack: React 19 + TypeScript on Vite, Vitest + React Testing Library for tests, jsPDF/svg2pdf.js for PDF export, lucide-react for icons. No backend — everything runs client-side.

Source is layered `domain/` (pure geometry, no DOM/React) → `application/` (document state, undo/redo) → `infrastructure/` (browser adapters: export, persistence, rendering) → `ui/` (React), with an ESLint rule enforcing that `domain/` and `application/` never import React or anything under `ui/`.

Full functional specs are in `docs/specs/`; the implementation plan and milestone status are in `docs/plan/orchestrator.md`.
