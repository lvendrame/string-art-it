import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EditorStore } from "@application/document";
import { percentToZoom, toDocument } from "@domain/transforms";
import { useWheelZoom } from "./useWheelZoom";
import { MAX_ZOOM_PERCENT, MIN_ZOOM_PERCENT, zoomByWheelDelta } from "./zoomSteps";

describe("zoomByWheelDelta", () => {
  const viewport = { zoom: percentToZoom(100), panOrigin: { x: 0, y: 0 } };

  it("zooms in on negative delta and out on positive delta", () => {
    expect(zoomByWheelDelta(viewport, -100, { x: 0, y: 0 }).zoom).toBeGreaterThan(viewport.zoom);
    expect(zoomByWheelDelta(viewport, 100, { x: 0, y: 0 }).zoom).toBeLessThan(viewport.zoom);
  });

  it("keeps the document point under the anchor fixed", () => {
    const anchor = { x: 120, y: 80 };
    const next = zoomByWheelDelta(viewport, -100, anchor);
    const before = toDocument(anchor, viewport);
    const after = toDocument(anchor, next);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  it("clamps to the zoom range", () => {
    expect(zoomByWheelDelta(viewport, -100000, { x: 0, y: 0 }).zoom).toBeCloseTo(percentToZoom(MAX_ZOOM_PERCENT));
    expect(zoomByWheelDelta(viewport, 100000, { x: 0, y: 0 }).zoom).toBeCloseTo(percentToZoom(MIN_ZOOM_PERCENT));
  });
});

describe("useWheelZoom", () => {
  function setup() {
    const store = new EditorStore();
    const element = document.createElement("div");
    document.body.appendChild(element);
    renderHook(() => useWheelZoom({ current: element }, store));
    return { store, element };
  }

  it("zooms the store viewport and prevents the default scroll", () => {
    const { store, element } = setup();
    const before = store.getState().viewport.zoom;
    const event = new WheelEvent("wheel", { deltaY: -100, clientX: 10, clientY: 10, cancelable: true });

    element.dispatchEvent(event);

    expect(store.getState().viewport.zoom).toBeGreaterThan(before);
    expect(event.defaultPrevented).toBe(true);
  });

  it("scales line-mode deltas", () => {
    const { store, element } = setup();
    const before = store.getState().viewport.zoom;

    element.dispatchEvent(new WheelEvent("wheel", { deltaY: 3, deltaMode: WheelEvent.DOM_DELTA_LINE, cancelable: true }));

    expect(store.getState().viewport.zoom).toBeCloseTo(zoomByWheelDelta({ ...store.getState().viewport, zoom: before }, 48, { x: 0, y: 0 }).zoom);
  });

  it("ignores horizontal-only wheel events", () => {
    const { store, element } = setup();
    const before = store.getState().viewport;
    const event = new WheelEvent("wheel", { deltaX: 50, deltaY: 0, cancelable: true });

    element.dispatchEvent(event);

    expect(store.getState().viewport).toBe(before);
    expect(event.defaultPrevented).toBe(false);
  });
});
