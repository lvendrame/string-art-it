---
name: test-with-debug-hook
description: Drive StringArtIt's live document state directly via window.stringArtItDebug instead of simulating pixel-accurate mouse gestures for every setup step, when live-verifying a change via Playwright MCP. Use for any browser-based verification in this repo.
---

# Testing StringArtIt via the debug hook

## What it is

`window.stringArtItDebug` is the live `EditorStore` instance, and
`window.stringArtItDebugHelpers` is a small bag of the pure geometry-transform
functions (`scaleGeometry`, `rotateGeometry`, `translateGeometry`, `recomputePinPath`)
the Edit-mode tools use to build their commit arguments — both attached unconditionally
in `src/App.tsx`. This is a real, unstable debug/test hook — no compat guarantee, not
part of the app's product surface — but it is always present (no DEV-only gate; this
app has no backend/auth/multi-user data, so exposing it in every build carries no real
security cost). It exists specifically so Playwright (or a human in devtools) can set
up document state directly instead of recreating every precondition through
pixel-perfect clicks/drags.

**It is available immediately on page load** — `App.tsx` creates the store via
`useMemo` before the Board Setup screen even renders, so `stringArtItDebug` exists
whether you're on the Board Setup screen or inside the Editor.

## Why use this instead of simulating the UI for everything

Driving *every* step through real mouse events is slow and fragile: pin dot positions
shift with zoom level, accessibility-tree `ref`s go stale across renders (Playwright
silently falls back to a wrong element), and `browser_click`/`browser_drag` need exact
screen coordinates you can only get by screenshotting first. Most of a live-verification
session is **setup** (draw a shape, connect a thread, select a path, lock a layer) —
none of that needs real pointer events, since the same `EditorStore` methods are what
the UI itself calls, and what the unit tests already call directly.

**Reserve real Playwright interactions for the one thing actually under test** — a drag
gesture's sensitivity math, hit-testing/nearest-pin snapping, hover states, CSS
layout/visual appearance. Everything else: call the store.

## How to call it

Use `mcp__playwright__browser_run_code_unsafe` (or `browser_evaluate`) to run
`page.evaluate` against `window.stringArtItDebug`:

```js
async (page) => {
  const r = await page.evaluate(() => {
    const store = window.stringArtItDebug;
    const layerId = store.getState().pinLayers[0].id;
    const pathId = store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 7 });
    return { layerId, pathId, pins: store.getState().pinLayers[0].pinPaths[0].pins };
  });
  return r;
}
```

Read state back the same way — `store.getState()` returns the full `EditorState`
(`pinLayers`, `threadLayers`, `selection`, `board`, `viewport`, `mode`, `selectTool`,
etc.) as plain JSON. Prefer asserting on this directly over parsing an accessibility
snapshot or screenshot for a number (pin count, radius, thread `pinIds`) — it's exact
and has zero layout/zoom ambiguity.

## Available methods (all on `EditorStore`, `src/application/document/EditorStore.ts`)

Everything here is undoable through the same `HistoryStack` the UI uses (`store.undo()`
/ `store.redo()` / `store.canUndo()` / `store.canRedo()` work identically regardless of
whether a mutation came from the debug hook or a real click).

**State / history**
`getState()`, `subscribe(listener)`, `undo()`, `redo()`, `canUndo()`, `canRedo()`

**Board**
`setBoardShape(shape, triangleType?)`, `setTriangleType(t)`,
`setBoardDimensions(patch)`, `setBoardAppearance(appearance)`

**Editor chrome**
`setMode(mode)` — `"select" | "pin" | "thread" | "pan" | "play"`,
`setGrid(patch)`, `setPinSnapEnabled(bool)`, `setViewport(viewport)`,
`setPinTool(tool)`, `select(selection)`, `setSelectTool(tool)` — `"select" | "move" |
"rotate" | "scale" | "merge"`

**Pin Paths**
`addPinPath(layerId, geometry)` → returns new `pathId` or `null` if layer locked,
`setSymmetryConfig(config)`, `deletePinPath(layerId, pathId)`,
`updatePinPathGeometry(layerId, pathId, geometry)`,
`setPinProperty(patch)` — `{spacing?, colour?, diameter?, guideVisible?}`, applies to
selected path or future defaults depending on `state.selection`,
`erasePin(layerId, pathId, pinId)`, `erasePinPath(layerId, pathId)`,
`getSelectedPinPath()`

**Edit-mode tools (Move/Rotation/Scale/Merge)** — these back real drag gestures; call
them directly to skip simulating the drag entirely when the gesture math itself isn't
what you're testing:
`previewPinPathPins(layerId, pathId, pins)` (non-undoable live preview),
`commitPinPathTransform(layerId, pathId, geometry, pins, previousPinLayers)` (Move/
Rotation — keeps pin ids stable),
`restorePinLayers(previous)` (Esc-cancel),
`commitPinPathScale(layerId, pathId, newPinPath, {pinLayers, threadLayers})` — build
`newPinPath` with `recomputePinPath({...path, geometry: scaleGeometry(path.geometry,
factor)})`, using `window.stringArtItDebugHelpers` for both (see worked example below —
these are plain module exports, not store methods, so they aren't reachable off
`stringArtItDebug` itself),
`extendMergeSelection(candidate)`, `cancelMergeSelection()`, `commitMergeSelection()`

**Threads**
`setThreadTool(tool)`, `setThreadDefaults(patch)`,
`extendThreadDraft(pinId)` — click a pin to start/extend a thread,
`finishThreadDraftWithSegment(layerId, pinId)` — double-click equivalent,
`finishThreadDraft(layerId)`, `escapeThreadDraft(layerId)`, `cancelThreadDraft()`,
`retractThreadDraft()`, `deleteThreadPath(layerId, pathId)`,
`eraseThreadSegment(layerId, pathId, segmentIndex)`

**Layers**
`setLayerPanelTab("pin"|"thread")`, `setActivePinLayer(layerId)`,
`setActiveThreadLayer(layerId)`, `addPinLayer()`, `renamePinLayer(layerId, name)`,
`togglePinLayerVisible(layerId)`, `togglePinLayerLocked(layerId)`,
`reorderPinLayer(layerId, dir)` — `dir: -1 | 1`, `duplicatePinLayer(layerId)`,
`deletePinLayer(layerId)`, and the `Thread` equivalents of all the above
(`addThreadLayer`, `renameThreadLayer`, `toggleThreadLayerVisible`,
`toggleThreadLayerLocked`, `reorderThreadLayer`, `duplicateThreadLayer`,
`deleteThreadLayer`)

**Print / persistence**
`setPrintSettings(patch)`, `toProjectFile()`, `loadProject(doc)`

## Worked example: set up a scaled circle with a connected thread in one call

```js
async (page) => {
  return await page.evaluate(() => {
    const store = window.stringArtItDebug;
    const layerId = store.getState().pinLayers[0].id;
    const pathId = store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 7 });
    const pins = store.getState().pinLayers[0].pinPaths[0].pins;
    const threadLayerId = store.getState().threadLayers[0].id;
    store.extendThreadDraft(pins[0].id);
    store.finishThreadDraftWithSegment(threadLayerId, pins[1].id);
    store.select({ type: "pinPath", layerId, pathId });
    return store.getState();
  });
}
```

Then drive ONLY the actual Scale drag through real `page.mouse` events (that's the
gesture under test), and read back `store.getState()` afterward to assert on radius,
pin ids, and thread `pinIds` — no screenshot parsing needed.

## Worked example: commit a Scale programmatically (skip the drag entirely)

Useful when you're testing something Scale *feeds into* (reattachment, undo bundling,
lock blocking) rather than the drag gesture's own sensitivity math:

```js
async (page) => {
  return await page.evaluate(() => {
    const store = window.stringArtItDebug;
    const { scaleGeometry, recomputePinPath } = window.stringArtItDebugHelpers;
    const { layerId, pathId } = store.getState().selection; // must already be a selected pinPath
    const path = store.getSelectedPinPath();
    const previous = { pinLayers: store.getState().pinLayers, threadLayers: store.getState().threadLayers };
    const newPinPath = recomputePinPath({ ...path, geometry: scaleGeometry(path.geometry, 2) }); // factor 2 = double
    store.commitPinPathScale(layerId, pathId, newPinPath, previous);
    return store.getState().pinLayers[0].pinPaths[0];
  });
}
```

## Gotchas hit in practice

- **Board Setup vs Editor**: `stringArtItDebug` exists on the Board Setup screen too,
  but most pin/thread methods assume a board+layers already exist (they do — created
  in the store constructor's defaults), so you don't have to click "Continue to
  Editor" first if you're only exercising store logic. Click it if you need the actual
  `<Canvas>` DOM mounted (e.g. to test a real drag gesture).
- **Autosave restore prompt**: if a prior session's autosave exists, the app boots into
  a restore/discard banner before Board Setup ever renders. `stringArtItDebug` is
  already attached at that point, but calling mutating methods before choosing
  Restore/Discard is undefined — click one first.
- **Dev-server module caching**: if you're iterating on app source *during* the same
  live-verification session (edit → reload → re-test), Chromium can serve a stale
  cached copy of a changed `.ts` module even after a full `page.goto()` reload —
  observed firsthand, cost a long debugging detour. Before trusting a behavioral
  result that depends on a very recent edit, verify what's actually being served:
  `await page.evaluate(() => fetch('/src/path/to/file.ts', {cache:'no-store'}).then(r=>r.text()))`
  and check your edit is present. If it's stale, open a brand-new tab
  (`mcp__playwright__browser_tabs` action `"new"`) rather than reloading the same one.
- **`getState()` is a live reference**, not a deep clone — don't mutate the returned
  object; treat it as read-only, same contract the UI itself relies on.
