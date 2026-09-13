import { describe, expect, it } from "vitest";
import { createPinPath, recomputePinPath } from "./pinPath";
import { buildNearestPinRemap, computeMirroredPinGroups } from "./symmetryConfig";

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
    expect(groups[0][0]).toMatchObject({ x: -1, y: 0 });
  });

  it("gives each mirrored pin a stable id distinct from its source, so it can be a Thread endpoint", () => {
    const path = createPinPath({ type: "line", start: { x: 1, y: 0 }, end: { x: 1, y: 0 } }, 4, STYLE, {
      type: "vertical",
      axis: { x: 0, y: 0 },
    });
    const sourceId = path.pins[0].id;
    const mirroredId = computeMirroredPinGroups(path)[0][0].id;
    expect(mirroredId).not.toBe(sourceId);
    expect(mirroredId).toContain(sourceId);
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

// docs/specs/21-scale-and-pin-distance.md Nearest-Pin Reattachment
describe("buildNearestPinRemap", () => {
  const base = { geometry: { type: "circle" as const, center: { x: 0, y: 0 }, radius: 5 }, requestedSpacing: 1, actualSpacing: 1, ...STYLE, symmetry: { type: "none" as const } };

  it("maps each old pin to its nearest new pin by position", () => {
    const oldPath = { ...base, id: "p", pins: [{ id: "p1", x: 0, y: 0 }, { id: "p2", x: 10, y: 0 }] };
    const newPath = { ...base, id: "p", pins: [{ id: "n1", x: 1, y: 0 }, { id: "n2", x: 9, y: 0 }] };
    const map = buildNearestPinRemap(oldPath, newPath);
    expect(map.get("p1")).toBe("n1");
    expect(map.get("p2")).toBe("n2");
  });

  it("multiple old pins can map to the same new pin when the new set is sparser", () => {
    const oldPath = { ...base, id: "p", pins: [{ id: "p1", x: 0, y: 0 }, { id: "p2", x: 1, y: 0 }] };
    const newPath = { ...base, id: "p", pins: [{ id: "n1", x: 0.5, y: 0 }] };
    const map = buildNearestPinRemap(oldPath, newPath);
    expect(map.get("p1")).toBe("n1");
    expect(map.get("p2")).toBe("n1");
  });

  it("includes symmetry-mirrored pins on both sides, since a mirrored pin is a valid Thread endpoint", () => {
    const symmetry = { type: "vertical" as const, axis: { x: 0, y: 0 } };
    const oldPath = { ...base, id: "p", symmetry, pins: [{ id: "p1", x: 3, y: 0 }] };
    const newPath = { ...base, id: "p", symmetry, pins: [{ id: "n1", x: 6, y: 0 }] };
    const map = buildNearestPinRemap(oldPath, newPath);
    // real pin -> real pin
    expect(map.get("p1")).toBe("n1");
    // mirrored pin (at x=-3) -> mirrored pin (at x=-6), not the real n1
    const mirroredOldId = computeMirroredPinGroups(oldPath)[0][0].id;
    const mirroredNewId = computeMirroredPinGroups(newPath)[0][0].id;
    expect(map.get(mirroredOldId)).toBe(mirroredNewId);
  });
});
