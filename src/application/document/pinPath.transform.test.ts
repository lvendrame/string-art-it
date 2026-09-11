import { describe, expect, it } from "vitest";
import { rotatePoint } from "../../domain/transforms";
import { rotateGeometry, translateGeometry, type PinPathGeometry } from "./pinPath";

describe("translateGeometry", () => {
  it("line: shifts both endpoints", () => {
    const g: PinPathGeometry = { type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } };
    const next = translateGeometry(g, { x: 3, y: -2 });
    expect(next).toEqual({ type: "line", start: { x: 3, y: -2 }, end: { x: 13, y: -2 } });
  });

  it("arc: shifts endpoints, curvature untouched", () => {
    const g: PinPathGeometry = { type: "arc", start: { x: 0, y: 0 }, end: { x: 10, y: 0 }, curvature: 4 };
    const next = translateGeometry(g, { x: 1, y: 1 });
    expect(next).toEqual({ type: "arc", start: { x: 1, y: 1 }, end: { x: 11, y: 1 }, curvature: 4 });
  });

  it("circle/ellipse/polygon-family: shifts center only", () => {
    const g: PinPathGeometry = { type: "circle", center: { x: 5, y: 5 }, radius: 3 };
    const next = translateGeometry(g, { x: 2, y: 2 });
    expect(next).toEqual({ type: "circle", center: { x: 7, y: 7 }, radius: 3 });
  });

  it("rectangle/square: shifts position only, rotation untouched", () => {
    const g: PinPathGeometry = { type: "rectangle", position: { x: 0, y: 0 }, width: 10, height: 4, rotation: 0.5 };
    const next = translateGeometry(g, { x: 3, y: 3 });
    expect(next).toEqual({ type: "rectangle", position: { x: 3, y: 3 }, width: 10, height: 4, rotation: 0.5 });
  });

  it("freehand: shifts every point", () => {
    const g: PinPathGeometry = { type: "freehand", points: [{ x: 0, y: 0 }, { x: 1, y: 1 }] };
    const next = translateGeometry(g, { x: 5, y: 5 });
    expect(next).toEqual({ type: "freehand", points: [{ x: 5, y: 5 }, { x: 6, y: 6 }] });
  });
});

describe("rotateGeometry", () => {
  it("line: rotates both endpoints about the pivot", () => {
    const g: PinPathGeometry = { type: "line", start: { x: 1, y: 0 }, end: { x: 2, y: 0 } };
    const next = rotateGeometry(g, { x: 0, y: 0 }, Math.PI / 2);
    if (next.type !== "line") throw new Error("expected line");
    expect(next.start.x).toBeCloseTo(0, 6);
    expect(next.start.y).toBeCloseTo(1, 6);
    expect(next.end.x).toBeCloseTo(0, 6);
    expect(next.end.y).toBeCloseTo(2, 6);
  });

  it("circle: only the center moves, no rotation field", () => {
    const g: PinPathGeometry = { type: "circle", center: { x: 1, y: 0 }, radius: 3 };
    const next = rotateGeometry(g, { x: 0, y: 0 }, Math.PI / 2);
    if (next.type !== "circle") throw new Error("expected circle");
    expect(next.center.x).toBeCloseTo(0, 6);
    expect(next.center.y).toBeCloseTo(1, 6);
    expect(next.radius).toBe(3);
  });

  it("regular-polygon: center rotates about the pivot, rotation field accumulates", () => {
    const g: PinPathGeometry = { type: "regular-polygon", center: { x: 10, y: 0 }, radius: 5, sides: 6, rotation: 0.2 };
    const next = rotateGeometry(g, { x: 0, y: 0 }, Math.PI / 2);
    if (next.type !== "regular-polygon") throw new Error("expected regular-polygon");
    expect(next.center.x).toBeCloseTo(0, 6);
    expect(next.center.y).toBeCloseTo(10, 6);
    expect(next.rotation).toBeCloseTo(0.2 + Math.PI / 2, 6);
  });

  it("freehand: rotates every point about the pivot", () => {
    const g: PinPathGeometry = { type: "freehand", points: [{ x: 1, y: 0 }] };
    const next = rotateGeometry(g, { x: 0, y: 0 }, Math.PI / 2);
    if (next.type !== "freehand") throw new Error("expected freehand");
    expect(next.points[0].x).toBeCloseTo(0, 6);
    expect(next.points[0].y).toBeCloseTo(1, 6);
  });

  it("rectangle: rotating about its OWN center leaves the center unchanged (the pivot bug this must avoid)", () => {
    // A naive `rotatePoint(position, pivot, theta)` would move the derived center,
    // even when the pivot IS the shape's own center — this is exactly the bug the
    // domain-transform proof in the plan called out. Assert it does NOT happen.
    const g: PinPathGeometry = { type: "rectangle", position: { x: 0, y: 0 }, width: 10, height: 10, rotation: 0 };
    const ownCenter = { x: 5, y: 5 };
    const next = rotateGeometry(g, ownCenter, Math.PI / 2);
    if (next.type !== "rectangle") throw new Error("expected rectangle");
    const newCenter = { x: next.position.x + next.width / 2, y: next.position.y + next.height / 2 };
    expect(newCenter.x).toBeCloseTo(5, 6);
    expect(newCenter.y).toBeCloseTo(5, 6);
    expect(next.rotation).toBeCloseTo(Math.PI / 2, 6);
  });

  it("rectangle: rotating about an ARBITRARY external pivot moves the center to exactly rotatePoint(oldCenter, pivot, theta)", () => {
    const g: PinPathGeometry = { type: "rectangle", position: { x: 0, y: 0 }, width: 10, height: 4, rotation: 0.1 };
    const pivot = { x: 20, y: -5 };
    const theta = 1.234;
    const oldCenter = { x: g.position.x + g.width / 2, y: g.position.y + g.height / 2 };
    const expectedCenter = rotatePoint(oldCenter, pivot, theta);

    const next = rotateGeometry(g, pivot, theta);
    if (next.type !== "rectangle") throw new Error("expected rectangle");
    const newCenter = { x: next.position.x + next.width / 2, y: next.position.y + next.height / 2 };
    expect(newCenter.x).toBeCloseTo(expectedCenter.x, 6);
    expect(newCenter.y).toBeCloseTo(expectedCenter.y, 6);
    expect(next.rotation).toBeCloseTo(0.1 + theta, 6);
  });

  it("square: same external-pivot correctness as rectangle", () => {
    const g: PinPathGeometry = { type: "square", position: { x: 2, y: 2 }, side: 6, rotation: 0 };
    const pivot = { x: -10, y: 10 };
    const theta = -0.7;
    const oldCenter = { x: g.position.x + g.side / 2, y: g.position.y + g.side / 2 };
    const expectedCenter = rotatePoint(oldCenter, pivot, theta);

    const next = rotateGeometry(g, pivot, theta);
    if (next.type !== "square") throw new Error("expected square");
    const newCenter = { x: next.position.x + next.side / 2, y: next.position.y + next.side / 2 };
    expect(newCenter.x).toBeCloseTo(expectedCenter.x, 6);
    expect(newCenter.y).toBeCloseTo(expectedCenter.y, 6);
  });
});
