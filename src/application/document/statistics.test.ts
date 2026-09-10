import { describe, expect, it } from "vitest";
import { EditorStore } from "./EditorStore";
import { pinPathStatistics, projectTotalPins, threadPathStatistics } from "./statistics";

describe("pinPathStatistics", () => {
  it("reports pin count, requested/actual spacing, and diameter", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 31 / (2 * Math.PI) });
    store.setPinProperty({ spacing: 2 });
    // property changes apply to defaults only when nothing selected; re-add with spacing baked in
    store.select({ type: "pinPath", layerId, pathId: store.getState().pinLayers[0].pinPaths[0].id });
    store.setPinProperty({ spacing: 2 });

    const stats = pinPathStatistics(store.getState().pinLayers[0].pinPaths[0]);
    expect(stats.pins).toBe(16);
    expect(stats.actualSpacing).toBeCloseTo(1.9375, 3);
    expect(stats.requestedSpacing).toBe(2);
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
});
