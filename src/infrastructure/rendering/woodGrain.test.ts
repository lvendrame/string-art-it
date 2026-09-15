import { describe, expect, it } from "vitest";
import { buildWoodGrainGeometry, hashSeed, mixHex, mulberry32 } from "./woodGrain";

const WALNUT: [string, string, string] = ["#8a5a3c", "#6b3f28", "#4a2a1a"];
const OAK: [string, string, string] = ["#c9a06a", "#a97c46", "#7a5730"];

describe("mulberry32", () => {
  it("is deterministic for a given seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect(a()).toBe(b());
    expect(a()).toBe(b());
  });
});

describe("hashSeed", () => {
  it("is stable for the same string and differs across strings", () => {
    expect(hashSeed("walnut")).toBe(hashSeed("walnut"));
    expect(hashSeed("walnut")).not.toBe(hashSeed("oak"));
  });
});

describe("mixHex", () => {
  it("interpolates between two hex colours", () => {
    expect(mixHex("#000000", "#ffffff", 0)).toBe("#000000");
    expect(mixHex("#000000", "#ffffff", 1)).toBe("#ffffff");
    expect(mixHex("#000000", "#ffffff", 0.5)).toBe("#808080");
  });
});

describe("buildWoodGrainGeometry", () => {
  it("is deterministic for a given presetId", () => {
    const a = buildWoodGrainGeometry("walnut", WALNUT);
    const b = buildWoodGrainGeometry("walnut", WALNUT);
    expect(a).toEqual(b);
  });

  it("produces a non-empty set of filled bands", () => {
    const geometry = buildWoodGrainGeometry("walnut", WALNUT);
    expect(geometry.bands.length).toBeGreaterThan(0);
    for (const band of geometry.bands) {
      expect(band.d).toMatch(/^M /);
      expect(band.d.trim().endsWith("Z")).toBe(true);
    }
  });

  it("produces different geometry for different presets, not just different colours", () => {
    const walnut = buildWoodGrainGeometry("walnut", WALNUT);
    const oak = buildWoodGrainGeometry("oak", WALNUT); // same colours, different seed
    expect(walnut.bands[0]?.d).not.toBe(oak.bands[0]?.d);
  });
});
