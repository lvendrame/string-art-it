# Reusable test scenarios (via the debug hook)

Companion to [`SKILL.md`](./SKILL.md) — read that first for what `window.stringArtItDebug`/
`window.stringArtItDebugHelpers` are and how to call them. This file is a catalogue of
bigger, named scenario-builders: complex/mixed preconditions worth reusing across
live-verification sessions instead of re-deriving them each time. Each is a
self-contained `page.evaluate` body (paste into `mcp__playwright__browser_run_code_unsafe`
as shown in `SKILL.md`) that returns the ids/state you need for assertions.

None of this is shipped in the app bundle — these are Playwright-side scripts only,
composed entirely from the documented `EditorStore` methods in `SKILL.md`.

Every scenario assumes a fresh document (default single Pin Layer `"Layer 1"` / Thread
Layer `"Layer 1"`, no autosave banner pending — see `SKILL.md`'s Gotchas). Scenarios
that need a second layer create it inline.

---

## 1. Two Pin Paths, same layer, one thread crossing both

Baseline "does a thread spanning two different shapes work" case.

```js
async (page) => page.evaluate(() => {
  const store = window.stringArtItDebug;
  const layerId = store.getState().pinLayers[0].id;
  const linePathId = store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } });
  const circlePathId = store.addPinPath(layerId, { type: "circle", center: { x: 20, y: 0 }, radius: 5 });
  const linePins = store.getState().pinLayers[0].pinPaths.find((p) => p.id === linePathId).pins;
  const circlePins = store.getState().pinLayers[0].pinPaths.find((p) => p.id === circlePathId).pins;
  const threadLayerId = store.getState().threadLayers[0].id;
  store.extendThreadDraft(linePins[linePins.length - 1].id);
  store.finishThreadDraftWithSegment(threadLayerId, circlePins[0].id);
  return { linePathId, circlePathId, thread: store.getState().threadLayers[0].threadPaths[0] };
});
```

## 2. Two Pin Paths in DIFFERENT Pin Layers, thread crossing layers

Threads reference pins by global id, not by layer — this confirms cross-layer
connections resolve correctly (`findPinById` scans every layer).

```js
async (page) => page.evaluate(() => {
  const store = window.stringArtItDebug;
  const layerA = store.getState().pinLayers[0].id;
  store.addPinLayer();
  const layerB = store.getState().pinLayers[store.getState().pinLayers.length - 1].id;
  const pathA = store.addPinPath(layerA, { type: "square", position: { x: 0, y: 0 }, side: 8, rotation: 0 });
  const pathB = store.addPinPath(layerB, { type: "regular-polygon", center: { x: 20, y: 0 }, radius: 6, sides: 6, rotation: 0 });
  const pinsA = store.getState().pinLayers.find((l) => l.id === layerA).pinPaths[0].pins;
  const pinsB = store.getState().pinLayers.find((l) => l.id === layerB).pinPaths[0].pins;
  const threadLayerId = store.getState().threadLayers[0].id;
  store.extendThreadDraft(pinsA[0].id);
  store.finishThreadDraftWithSegment(threadLayerId, pinsB[0].id);
  return { layerA, layerB, pathA, pathB, thread: store.getState().threadLayers[0].threadPaths[0] };
});
```

## 3. Radial symmetry + a thread endpoint on a MIRRORED pin

Mirrored pins are derived (never stored) but have valid, addressable ids
(`mirroredPinId`) — this confirms a Thread Path can legitimately end on one.

```js
async (page) => page.evaluate(() => {
  const store = window.stringArtItDebug;
  const layerId = store.getState().pinLayers[0].id;
  const pathId = store.addPinPath(layerId, {
    type: "star", center: { x: 0, y: 0 }, outerRadius: 8, innerRadius: 3, points: 5, rotation: 0,
  });
  store.select({ type: "pinPath", layerId, pathId });
  store.setSymmetryConfig({ type: "radial", centre: { x: 0, y: 0 }, intervalDegrees: 72 }); // 5-fold
  const path = store.getState().pinLayers[0].pinPaths[0];
  // Mirrored pin ids follow `${sourcePinId}~mirror-${groupIndex}` — group 0 is the
  // first radial copy. No need to compute mirror groups client-side: the id is
  // deterministic, and Thread drafting accepts it directly (same as clicking it).
  const mirroredPinId = `${path.pins[0].id}~mirror-0`;
  const threadLayerId = store.getState().threadLayers[0].id;
  store.extendThreadDraft(path.pins[1].id);
  store.finishThreadDraftWithSegment(threadLayerId, mirroredPinId);
  return { pathId, thread: store.getState().threadLayers[0].threadPaths[0] };
});
```

## 4. Symmetry + Scale — mirrored-pin thread reattachment

Combines M13's reattachment with derived symmetry pins: scales the source, confirms
the thread (ending on a *mirrored* pin) still resolves after the mirrored pin's id and
position change.

```js
async (page) => page.evaluate(() => {
  const store = window.stringArtItDebug;
  const { scaleGeometry, recomputePinPath } = window.stringArtItDebugHelpers;
  const layerId = store.getState().pinLayers[0].id;
  const pathId = store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 6 });
  store.select({ type: "pinPath", layerId, pathId });
  store.setSymmetryConfig({ type: "vertical", axis: { x: 0, y: 0 } });
  const before = store.getState().pinLayers[0].pinPaths[0];
  const mirroredIdBefore = `${before.pins[0].id}~mirror-0`;
  const threadLayerId = store.getState().threadLayers[0].id;
  store.extendThreadDraft(before.pins[1].id);
  store.finishThreadDraftWithSegment(threadLayerId, mirroredIdBefore);

  const previous = { pinLayers: store.getState().pinLayers, threadLayers: store.getState().threadLayers };
  const newPinPath = recomputePinPath({ ...before, geometry: scaleGeometry(before.geometry, 1.5) });
  store.commitPinPathScale(layerId, pathId, newPinPath, previous);

  const after = store.getState();
  const mirroredIdAfter = `${after.pinLayers[0].pinPaths[0].pins[0].id}~mirror-0`;
  return {
    threadPinIds: after.threadLayers[0].threadPaths[0].pinIds,
    mirroredIdAfter,
    reattached: after.threadLayers[0].threadPaths[0].pinIds.includes(mirroredIdAfter)
      || after.threadLayers[0].threadPaths[0].pinIds.some((id) => id.includes("~mirror-")),
  };
});
```

## 5. Merge across two Pin Paths, one pin already threaded

Merge contracts a Thread Path (repoints + collapses) rather than fragmenting it —
confirm that still holds when the merged pin has an existing connection.

```js
async (page) => page.evaluate(() => {
  const store = window.stringArtItDebug;
  const layerId = store.getState().pinLayers[0].id;
  const pathA = store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 2, y: 0 } }); // pins at x=0,1,2
  const pathB = store.addPinPath(layerId, { type: "line", start: { x: 0, y: 10 }, end: { x: 2, y: 10 } });
  const pinsA = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathA).pins;
  const pinsB = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathB).pins;
  const threadLayerId = store.getState().threadLayers[0].id;
  store.extendThreadDraft(pinsA[2].id);
  store.finishThreadDraftWithSegment(threadLayerId, pinsA[0].id); // thread: A2 -> A0
  store.extendMergeSelection({ layerId, pathId: pathA, pinId: pinsA[0].id });
  store.extendMergeSelection({ layerId, pathId: pathB, pinId: pinsB[0].id });
  store.commitMergeSelection();
  return { pathA, pathB, thread: store.getState().threadLayers[0].threadPaths[0] };
});
```

## 6. Locked layer blocks an edit, then unlock + edit + undo + redo

Full round-trip through the lock guard and history in one scenario.

```js
async (page) => page.evaluate(() => {
  const store = window.stringArtItDebug;
  const layerId = store.getState().pinLayers[0].id;
  const pathId = store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 5 });
  store.select({ type: "pinPath", layerId, pathId });
  store.togglePinLayerLocked(layerId);

  store.setPinProperty({ spacing: 0.5 }); // should be a no-op while locked
  const blockedSpacing = store.getState().pinLayers[0].pinPaths[0].requestedSpacing;

  store.togglePinLayerLocked(layerId);
  store.setPinProperty({ spacing: 0.5 }); // should apply now
  const appliedSpacing = store.getState().pinLayers[0].pinPaths[0].requestedSpacing;

  store.undo(); // undoes the spacing change
  const afterUndo = store.getState().pinLayers[0].pinPaths[0].requestedSpacing;
  store.redo();
  const afterRedo = store.getState().pinLayers[0].pinPaths[0].requestedSpacing;

  return { blockedSpacing, appliedSpacing, afterUndo, afterRedo };
});
```

## 7. Mixed-command undo/redo stack (draw → thread → scale → respace → merge)

Stress-tests `HistoryStack` ordering across different Command shapes in sequence —
useful for confirming redo invalidation and step-granularity together.

```js
async (page) => page.evaluate(() => {
  const store = window.stringArtItDebug;
  const { scaleGeometry, recomputePinPath } = window.stringArtItDebugHelpers;
  const layerId = store.getState().pinLayers[0].id;

  const pathId = store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 5 }); // step 1
  const pins = store.getState().pinLayers[0].pinPaths[0].pins;
  const threadLayerId = store.getState().threadLayers[0].id;
  store.extendThreadDraft(pins[0].id);
  store.finishThreadDraftWithSegment(threadLayerId, pins[1].id); // step 2

  store.select({ type: "pinPath", layerId, pathId });
  const path = store.getSelectedPinPath();
  const previous = { pinLayers: store.getState().pinLayers, threadLayers: store.getState().threadLayers };
  const scaled = recomputePinPath({ ...path, geometry: scaleGeometry(path.geometry, 2) });
  store.commitPinPathScale(layerId, pathId, scaled, previous); // step 3

  store.setPinProperty({ spacing: 2 }); // step 4

  const radiusAfterAllSteps = store.getState().pinLayers[0].pinPaths[0].geometry.radius;
  store.undo(); // undoes step 4 (respace)
  store.undo(); // undoes step 3 (scale) — back to the pre-scale radius
  const radiusAfter2Undos = store.getState().pinLayers[0].pinPaths[0].geometry.radius;
  const canRedoNow = store.canRedo();
  store.redo();
  const radiusAfter1Redo = store.getState().pinLayers[0].pinPaths[0].geometry.radius;

  return { radiusAfterAllSteps, radiusAfter2Undos, canRedoNow, radiusAfter1Redo };
});
```

## 8. Cascading pin delete splits a 5-pin thread into two fragments

```js
async (page) => page.evaluate(() => {
  const store = window.stringArtItDebug;
  const layerId = store.getState().pinLayers[0].id;
  const pathId = store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 4, y: 0 } }); // 5 pins, x=0..4
  const pins = store.getState().pinLayers[0].pinPaths[0].pins;
  const threadLayerId = store.getState().threadLayers[0].id;
  pins.forEach((p, i) => {
    if (i === 0) store.extendThreadDraft(p.id);
    else if (i === pins.length - 1) store.finishThreadDraftWithSegment(threadLayerId, p.id);
    else store.extendThreadDraft(p.id);
  });
  store.erasePin(layerId, pathId, pins[2].id); // middle pin — should split into two fragments
  return { fragments: store.getState().threadLayers[0].threadPaths };
});
```

## 9. Two Thread Paths sharing a pin, Segment Eraser touches only one

```js
async (page) => page.evaluate(() => {
  const store = window.stringArtItDebug;
  const layerId = store.getState().pinLayers[0].id;
  const pathId = store.addPinPath(layerId, { type: "regular-polygon", center: { x: 0, y: 0 }, radius: 6, sides: 5, rotation: 0 });
  const pins = store.getState().pinLayers[0].pinPaths[0].pins;
  const threadLayerId = store.getState().threadLayers[0].id;
  store.extendThreadDraft(pins[0].id);
  store.finishThreadDraftWithSegment(threadLayerId, pins[1].id); // thread 1: 0-1
  store.extendThreadDraft(pins[0].id);
  store.finishThreadDraftWithSegment(threadLayerId, pins[2].id); // thread 2: 0-2
  const [threadA] = store.getState().threadLayers[0].threadPaths;
  store.eraseThreadSegment(threadLayerId, threadA.id, 0); // delete thread 1's only segment
  return { threadPaths: store.getState().threadLayers[0].threadPaths };
});
```

## 10. Rotated rectangle, moved via `commitPinPathTransform` (no real drag)

Move/Rotation keep pin ids stable (unlike Scale) — this exercises that path and the
corner/position-vs-centre rectangle math without simulating a mouse drag.

```js
async (page) => page.evaluate(() => {
  const store = window.stringArtItDebug;
  const { translateGeometry } = window.stringArtItDebugHelpers;
  const layerId = store.getState().pinLayers[0].id;
  const pathId = store.addPinPath(layerId, { type: "rectangle", position: { x: 0, y: 0 }, width: 10, height: 4, rotation: 0.3 });
  const originalPins = store.getState().pinLayers[0].pinPaths[0].pins;
  const snapshot = store.getState().pinLayers;
  const delta = { x: 5, y: -3 };
  const movedPins = originalPins.map((p) => ({ ...p, x: p.x + delta.x, y: p.y + delta.y }));
  const newGeometry = translateGeometry(store.getState().pinLayers[0].pinPaths[0].geometry, delta);
  store.commitPinPathTransform(layerId, pathId, newGeometry, movedPins, snapshot);
  const after = store.getState().pinLayers[0].pinPaths[0];
  return {
    idsStable: after.pins.map((p) => p.id).join(",") === originalPins.map((p) => p.id).join(","),
    geometry: after.geometry,
  };
});
```

## 11. Rotate via `commitPinPathTransform` about an arbitrary external pivot

Same family as #10 but Rotation, which needs per-pin `rotatePoint` math inlined (the
pure helper isn't in `stringArtItDebugHelpers` — only geometry-level `rotateGeometry`
is, so pins are rotated manually here to match).

```js
async (page) => page.evaluate(() => {
  const store = window.stringArtItDebug;
  const { rotateGeometry } = window.stringArtItDebugHelpers;
  const rotatePoint = (p, pivot, theta) => {
    const cos = Math.cos(theta), sin = Math.sin(theta);
    const dx = p.x - pivot.x, dy = p.y - pivot.y;
    return { x: pivot.x + dx * cos - dy * sin, y: pivot.y + dx * sin + dy * cos };
  };
  const layerId = store.getState().pinLayers[0].id;
  const pathId = store.addPinPath(layerId, { type: "square", position: { x: 0, y: 0 }, side: 8, rotation: 0 });
  const originalPins = store.getState().pinLayers[0].pinPaths[0].pins;
  const snapshot = store.getState().pinLayers;
  const pivot = { x: 20, y: 0 }; // NOT the shape's own centre
  const theta = Math.PI / 4;
  const rotatedPins = originalPins.map((p) => ({ ...p, ...rotatePoint(p, pivot, theta) }));
  const newGeometry = rotateGeometry(store.getState().pinLayers[0].pinPaths[0].geometry, pivot, theta);
  store.commitPinPathTransform(layerId, pathId, newGeometry, rotatedPins, snapshot);
  return store.getState().pinLayers[0].pinPaths[0];
});
```

## 12. Polygram (vertex-anchored, non-circle) + Pin distance change

M13's reattachment fix isn't circle-specific — this exercises the vertex-anchored
distribution path (`distributePathPerVertex`) instead of `distributeClosedPath`.

```js
async (page) => page.evaluate(() => {
  const store = window.stringArtItDebug;
  const layerId = store.getState().pinLayers[0].id;
  const pathId = store.addPinPath(layerId, { type: "polygram", center: { x: 0, y: 0 }, radius: 7, points: 7, skip: 2, rotation: 0 });
  const pins = store.getState().pinLayers[0].pinPaths[0].pins;
  const threadLayerId = store.getState().threadLayers[0].id;
  store.extendThreadDraft(pins[0].id);
  store.finishThreadDraftWithSegment(threadLayerId, pins[3].id);
  store.select({ type: "pinPath", layerId, pathId });
  store.setPinProperty({ spacing: 0.4 });
  const after = store.getState();
  const thread = after.threadLayers[0].threadPaths[0];
  return {
    pinCount: after.pinLayers[0].pinPaths[0].pins.length,
    threadStillResolves: thread && thread.pinIds.every((id) => after.pinLayers[0].pinPaths[0].pins.some((p) => p.id === id)),
  };
});
```

## 13. Freehand path + Scale (centroid = arithmetic mean, not a `center` field)

Freehand is the one geometry type whose "centre" for Scale is computed (average of
points), not read off an existing field — worth exercising on its own.

```js
async (page) => page.evaluate(() => {
  const store = window.stringArtItDebug;
  const { scaleGeometry, recomputePinPath } = window.stringArtItDebugHelpers;
  const layerId = store.getState().pinLayers[0].id;
  const points = [{ x: 0, y: 0 }, { x: 4, y: 2 }, { x: 8, y: 0 }, { x: 4, y: -2 }];
  const pathId = store.addPinPath(layerId, { type: "freehand", points });
  store.select({ type: "pinPath", layerId, pathId });
  const path = store.getSelectedPinPath();
  const previous = { pinLayers: store.getState().pinLayers, threadLayers: store.getState().threadLayers };
  const scaled = recomputePinPath({ ...path, geometry: scaleGeometry(path.geometry, 2) });
  store.commitPinPathScale(layerId, pathId, scaled, previous);
  return store.getState().pinLayers[0].pinPaths[0].geometry; // centroid (4,0) should be preserved
});
```

## 14. Everything at once — big regression smoke-test fixture

Two Pin Layers, two Thread Layers, three different shape families, one with radial
symmetry, threads both within a path and crossing layers, one layer locked mid-way,
then Scale + Merge + Undo/Redo. Good as a single "did I break anything broad" sanity
check after a cross-cutting change (e.g. to `EditorStore` or the distribution
pipeline).

```js
async (page) => page.evaluate(() => {
  const store = window.stringArtItDebug;
  const { scaleGeometry, recomputePinPath } = window.stringArtItDebugHelpers;

  const layerA = store.getState().pinLayers[0].id;
  store.addPinLayer();
  const layerB = store.getState().pinLayers[store.getState().pinLayers.length - 1].id;
  store.addThreadLayer();
  const threadLayerA = store.getState().threadLayers[0].id;
  const threadLayerB = store.getState().threadLayers[store.getState().threadLayers.length - 1].id;

  const circlePath = store.addPinPath(layerA, { type: "circle", center: { x: 0, y: 0 }, radius: 6 });
  store.select({ type: "pinPath", layerId: layerA, pathId: circlePath });
  store.setSymmetryConfig({ type: "radial", centre: { x: 0, y: 0 }, intervalDegrees: 90 });

  const starPath = store.addPinPath(layerB, { type: "star", center: { x: 20, y: 0 }, outerRadius: 8, innerRadius: 3, points: 6, rotation: 0 });
  const rectPath = store.addPinPath(layerA, { type: "rectangle", position: { x: -20, y: -5 }, width: 10, height: 6, rotation: 0.2 });

  const circlePins = store.getState().pinLayers.find((l) => l.id === layerA).pinPaths.find((p) => p.id === circlePath).pins;
  const starPins = store.getState().pinLayers.find((l) => l.id === layerB).pinPaths[0].pins;
  const rectPins = store.getState().pinLayers.find((l) => l.id === layerA).pinPaths.find((p) => p.id === rectPath).pins;

  // thread within the circle path
  store.extendThreadDraft(circlePins[0].id);
  store.finishThreadDraftWithSegment(threadLayerA, circlePins[1].id);
  // thread crossing layers (rectangle in layerA -> star in layerB), on the OTHER thread layer
  store.extendThreadDraft(rectPins[0].id);
  store.finishThreadDraftWithSegment(threadLayerB, starPins[0].id);

  store.togglePinLayerLocked(layerB); // lock mid-scenario
  store.select({ type: "pinPath", layerId: layerB, pathId: starPath });
  const starSpacingOriginal = store.getState().pinLayers.find((l) => l.id === layerB).pinPaths[0].requestedSpacing;
  store.setPinProperty({ spacing: 0.3 }); // blocked — starPath's layer (layerB) is locked
  const starSpacingBlocked = store.getState().pinLayers.find((l) => l.id === layerB).pinPaths[0].requestedSpacing;
  store.togglePinLayerLocked(layerB);

  // Scale the circle
  store.select({ type: "pinPath", layerId: layerA, pathId: circlePath });
  const path = store.getSelectedPinPath();
  const previous = { pinLayers: store.getState().pinLayers, threadLayers: store.getState().threadLayers };
  const scaled = recomputePinPath({ ...path, geometry: scaleGeometry(path.geometry, 1.8) });
  store.commitPinPathScale(layerA, circlePath, scaled, previous);

  // Merge a rectangle pin into a star pin (cross-layer merge)
  store.extendMergeSelection({ layerId: layerA, pathId: rectPath, pinId: rectPins[1].id });
  store.extendMergeSelection({ layerId: layerB, pathId: starPath, pinId: starPins[1].id });
  store.commitMergeSelection();

  const beforeUndo = store.getState();
  store.undo(); // undoes the merge
  const afterUndo = store.getState();
  store.redo();
  const afterRedo = store.getState();

  return {
    layerA, layerB, circlePath, starPath, rectPath,
    starSpacingOriginal, starSpacingBlocked, // should be equal, proving the lock held
    threadCountBeforeUndo: beforeUndo.threadLayers.flatMap((l) => l.threadPaths).length,
    mergeUndone: JSON.stringify(afterUndo.pinLayers) !== JSON.stringify(beforeUndo.pinLayers),
    mergeRedone: JSON.stringify(afterRedo.pinLayers) === JSON.stringify(beforeUndo.pinLayers),
  };
});
```

---

## Adding a new scenario

Keep the same shape: one `async (page) => page.evaluate(() => {...})` block, comment
above it saying what it specifically targets/why it's not redundant with an existing
one, and return enough state to assert the interesting property without the caller
needing to know the document's internal shape by heart.
