import { describe, expect, it } from "vitest";
import { createPinPath, recomputePinPath } from "./pinPath";
import { computeMirroredPinGroups } from "./symmetryConfig";

const STYLE = { colour: "#fff", diameter: 2, guideVisible: true };

describe("computeMirroredPinGroups", () => {
  it("none produces no mirrored groups", () => {
    const path = createPinPath({ type: "line", start: { x: 1, y: 0 }, end: { x: 5, y: 0 } }, 4, STYLE, { type: "none" });
    expect(computeMirroredPinGroups(path)).toHaveLength(0);
  });

  it("vertical mirror produces one reflected group", () => {
    const path = createPinPath({ type: "line", start: { x: 1, y: 0 }, end: { x: 1, y: 0 } }, 4, STYLE, {
      type: "vertical",
      axis: { x: 0, y: 0 },
    });
    const groups = computeMirroredPinGroups(path);
    expect(groups).toHaveLength(1);
    expect(groups[0][0]).toEqual({ x: -1, y: 0 });
  });

  it("radial 45deg produces 7 mirrored groups (8 total instances)", () => {
    const path = createPinPath({ type: "line", start: { x: 10, y: 0 }, end: { x: 10, y: 0 } }, 4, STYLE, {
      type: "radial",
      centre: { x: 0, y: 0 },
      intervalDegrees: 45,
    });
    expect(computeMirroredPinGroups(path)).toHaveLength(7);
  });

  it("recalculates automatically when the source pin path changes (no stored staleness)", () => {
    const path = createPinPath({ type: "circle", center: { x: 0, y: 0 }, radius: 5 }, 2, STYLE, {
      type: "radial",
      centre: { x: 0, y: 0 },
      intervalDegrees: 90,
    });
    const before = computeMirroredPinGroups(path)[0].length;

    // Simulates store.updatePinPathGeometry: recompute pins for the new geometry, then
    // mirrors are re-derived automatically since they read the (now-updated) pins.
    const resized = recomputePinPath({ ...path, geometry: { type: "circle", center: { x: 0, y: 0 }, radius: 20 } });
    const after = computeMirroredPinGroups(resized)[0]?.length ?? 0;

    expect(after).not.toBe(before);
  });
});
