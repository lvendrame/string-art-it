import { describe, expect, it } from "vitest";
import { EditorStore } from "./EditorStore";
import { pinPathStatistics, projectThreadTotals, projectTotalPins, threadPathStatistics, threadStatisticsByType } from "./statistics";

describe("pinPathStatistics", () => {
  it("reports pin count, requested/actual spacing, and diameter", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 31 / (2 * Math.PI) });
    store.setPinProperty({ spacing: 2 });
    // property changes apply to defaults only when nothing selected; re-add with spacing baked in
    store.select({ type: "pinPaths", refs: [{ layerId, pathId: store.getState().pinLayers[0].pinPaths[0].id }] });
    store.setPinProperty({ spacing: 2 });

    const stats = pinPathStatistics(store.getState().pinLayers[0].pinPaths[0]);
    expect(stats.pins).toBe(16);
    expect(stats.actualSpacing).toBeCloseTo(1.9375, 3);
    expect(stats.requestedSpacing).toBe(2);
    expect(stats.perimeterCm).toBeCloseTo(31, 6);
  });

  it("sums every contour's length for a multi-contour (Text) Pin Path", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathId = store.addPinPath(layerId, {
      type: "text",
      origin: { x: 0, y: 0 },
      text: "x",
      fontId: "pt-sans",
      weight: "regular",
      italic: false,
      size: 5,
      letterSpacing: 0,
      rotation: 0,
      // two disjoint closed contours: a 3-4-5 triangle (perimeter 12) and a unit square (perimeter 4)
      contours: [
        [{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 3, y: 4 }],
        [{ x: 10, y: 10 }, { x: 11, y: 10 }, { x: 11, y: 11 }, { x: 10, y: 11 }],
      ],
    })!;

    const stats = pinPathStatistics(store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!);
    expect(stats.perimeterCm).toBeCloseTo(12 + 4, 6);
  });
});

describe("projectTotalPins", () => {
  it("sums pins across all Pin Paths and layers", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 8, y: 0 } }); // 9 pins @ default spacing 1
    store.addPinLayer();
    const secondLayerId = store.getState().pinLayers[1].id;
    store.addPinPath(secondLayerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 4, y: 0 } }); // 5 pins

    expect(projectTotalPins(store.getState().pinLayers)).toBe(14);
  });
});

describe("threadPathStatistics", () => {
  it("counts segments, sums length, counts pins visited (including repeats), and reports colours", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 8, y: 0 } });
    const pins = store.getState().pinLayers[0].pinPaths[0].pins; // 0,1,2,...,8
    const threadLayerId = store.getState().threadLayers[0].id;
    store.setThreadDefaults({ colours: ["red", "white"] });

    store.extendThreadDraft(pins[0].id); // pin at x=0
    store.extendThreadDraft(pins[5].id); // pin at x=5
    store.finishThreadDraftWithSegment(threadLayerId, pins[0].id); // revisits pin 0

    const thread = store.getState().threadLayers[0].threadPaths[0];
    const stats = threadPathStatistics(thread, store.getState().pinLayers);

    expect(stats.segments).toBe(2);
    expect(stats.pinsVisited).toBe(3); // includes the repeated visit
    expect(stats.lengthCm).toBeCloseTo(10, 6); // 0->5 (5cm) + 5->0 (5cm)
    expect(stats.colours).toEqual(["red", "white"]);
  });

  it("skips a segment whose pin id no longer resolves (stale reference), without throwing", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 8, y: 0 } });
    const pins = store.getState().pinLayers[0].pinPaths[0].pins;

    const thread = { id: "t1", pinIds: [pins[0].id, "missing-pin-id", pins[1].id], colours: ["red"], width: 1, twistPitch: 6 };
    const stats = threadPathStatistics(thread, store.getState().pinLayers);

    expect(stats.pinsVisited).toBe(3);
    expect(stats.lengthCm).toBe(0); // neither segment has both endpoints resolvable
  });
});

describe("projectThreadTotals", () => {
  it("sums thread count and length across all Thread Paths and layers", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 8, y: 0 } });
    const pins = store.getState().pinLayers[0].pinPaths[0].pins;
    const threadLayerId = store.getState().threadLayers[0].id;

    store.extendThreadDraft(pins[0].id);
    store.finishThreadDraftWithSegment(threadLayerId, pins[5].id); // 0->5, 5cm

    store.addThreadLayer();
    const secondThreadLayerId = store.getState().threadLayers[1].id;
    store.extendThreadDraft(pins[0].id);
    store.finishThreadDraftWithSegment(secondThreadLayerId, pins[3].id); // 0->3, 3cm

    const totals = projectThreadTotals(store.getState().threadLayers, store.getState().pinLayers);
    expect(totals.threadCount).toBe(2);
    expect(totals.totalLengthCm).toBeCloseTo(8, 6);
  });

  it("returns zeroes for a document with no threads", () => {
    const store = new EditorStore();
    const totals = projectThreadTotals(store.getState().threadLayers, store.getState().pinLayers);
    expect(totals).toEqual({ threadCount: 0, totalLengthCm: 0 });
  });
});

describe("threadStatisticsByType", () => {
  it("treats a multi-colour thread as its own type, not split across its individual colours", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 8, y: 0 } });
    const pins = store.getState().pinLayers[0].pinPaths[0].pins;
    const threadLayerId = store.getState().threadLayers[0].id;

    store.setThreadDefaults({ colours: ["red"], width: 1.5 });
    store.extendThreadDraft(pins[0].id);
    store.finishThreadDraftWithSegment(threadLayerId, pins[5].id); // 0->5, 5cm, plain red

    store.setThreadDefaults({ colours: ["red", "white"], width: 1.5 });
    store.extendThreadDraft(pins[0].id);
    store.finishThreadDraftWithSegment(threadLayerId, pins[3].id); // 0->3, 3cm, red+white twist

    const byType = threadStatisticsByType(store.getState().threadLayers, store.getState().pinLayers);
    expect(byType).toHaveLength(2); // ["red"] and ["red","white"] are distinct types, not merged under "red"

    const red = byType.find((t) => t.colours.length === 1)!;
    const redWhite = byType.find((t) => t.colours.length === 2)!;

    expect(red).toEqual({ colours: ["red"], width: 1.5, threadCount: 1, totalSegments: 1, totalLengthCm: 5, totalPinsVisited: 2 });
    expect(redWhite).toEqual({ colours: ["red", "white"], width: 1.5, threadCount: 1, totalSegments: 1, totalLengthCm: 3, totalPinsVisited: 2 });
  });

  it("treats same colours at different widths as distinct types", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 8, y: 0 } });
    const pins = store.getState().pinLayers[0].pinPaths[0].pins;
    const threadLayerId = store.getState().threadLayers[0].id;

    store.setThreadDefaults({ colours: ["red"], width: 1.5 });
    store.extendThreadDraft(pins[0].id);
    store.finishThreadDraftWithSegment(threadLayerId, pins[5].id); // 5cm @ width 1.5

    store.setThreadDefaults({ colours: ["red"], width: 2.5 });
    store.extendThreadDraft(pins[0].id);
    store.finishThreadDraftWithSegment(threadLayerId, pins[3].id); // 3cm @ width 2.5

    const byType = threadStatisticsByType(store.getState().threadLayers, store.getState().pinLayers);
    expect(byType).toHaveLength(2);
    expect(byType.find((t) => t.width === 1.5)?.totalLengthCm).toBe(5);
    expect(byType.find((t) => t.width === 2.5)?.totalLengthCm).toBe(3);
  });

  it("returns an empty array for a document with no threads", () => {
    const store = new EditorStore();
    expect(threadStatisticsByType(store.getState().threadLayers, store.getState().pinLayers)).toEqual([]);
  });
});
