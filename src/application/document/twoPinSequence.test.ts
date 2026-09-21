import { describe, expect, it } from "vitest";
import { computeCrossPathCandidates, computeSamePathCandidates, type TwoPinFillSettings } from "./twoPinSequence";
import type { PinLayer } from "./pinLayer";
import type { Pin } from "./pinPath";

function pin(id: string, x: number, y: number): Pin {
  return { id, x, y };
}

// One layer with a single Pin Path of `count` pins, numbered "p1".."pN" in position
// order. `closed` picks a circle-ish (closed) vs. line (open) geometry — the actual
// coordinates don't matter to this module, only path.pins order and geometry.closed.
function makeLayer(count: number, closed: boolean): PinLayer[] {
  const pins = Array.from({ length: count }, (_, i) => pin(`p${i + 1}`, i, 0));
  return [
    {
      id: "layer-1",
      name: "Layer 1",
      visible: true,
      locked: false,
      pinPaths: [
        {
          id: "path-a",
          geometry: closed
            ? { type: "circle", center: { x: 0, y: 0 }, radius: count }
            : { type: "line", start: { x: 0, y: 0 }, end: { x: count, y: 0 } },
          requestedSpacing: 1,
          actualSpacing: 1,
          pins,
          guideVisible: true,
          colour: "#fff",
          diameter: 2,
          symmetry: { type: "none" },
        },
      ],
    },
  ];
}

// Two separate Pin Paths (each open, "line"-shaped) in one layer: "a" with `countA`
// pins ("a1".."aN"), "b" with `countB` pins ("b1".."bN").
function makeTwoPaths(countA: number, countB: number): PinLayer[] {
  const pinsA = Array.from({ length: countA }, (_, i) => pin(`a${i + 1}`, i, 0));
  const pinsB = Array.from({ length: countB }, (_, i) => pin(`b${i + 1}`, i, 10));
  return [
    {
      id: "layer-1",
      name: "Layer 1",
      visible: true,
      locked: false,
      pinPaths: [
        { id: "path-a", geometry: { type: "line", start: { x: 0, y: 0 }, end: { x: countA, y: 0 } }, requestedSpacing: 1, actualSpacing: 1, pins: pinsA, guideVisible: true, colour: "#fff", diameter: 2, symmetry: { type: "none" } },
        { id: "path-b", geometry: { type: "line", start: { x: 0, y: 10 }, end: { x: countB, y: 10 } }, requestedSpacing: 1, actualSpacing: 1, pins: pinsB, guideVisible: true, colour: "#fff", diameter: 2, symmetry: { type: "none" } },
      ],
    },
  ];
}

function seq(...ids: string[]): string[] {
  return ids;
}

// step=0 on both sides, fullFill off: identical to the tools' original (pre-
// configuration) shipped behaviour — every test below that doesn't exercise the new
// config explicitly uses this baseline.
const DEFAULT_SETTINGS: TwoPinFillSettings = { stepA: 0, stepB: 0, fullFill: false };

describe("computeSamePathCandidates — Case 1 (same Pin Path)", () => {
  it("zig-zag, open path, N=10: mirrors outer-in", () => {
    const layers = makeLayer(10, false);
    const candidates = computeSamePathCandidates(layers, "p1", "p10", "zigzag", DEFAULT_SETTINGS);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].sequence).toEqual(seq("p1", "p10", "p2", "p9", "p3", "p8", "p4", "p7", "p5", "p6"));
  });

  it("zig-zag, open path, N=11: odd leftover middle pin appended", () => {
    const layers = makeLayer(11, false);
    const candidates = computeSamePathCandidates(layers, "p1", "p11", "zigzag", DEFAULT_SETTINGS);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].sequence).toEqual(seq("p1", "p11", "p2", "p10", "p3", "p9", "p4", "p8", "p5", "p7", "p6"));
  });

  it("parabolic, open path, N=10: two ascending halves, no reverse", () => {
    const layers = makeLayer(10, false);
    const candidates = computeSamePathCandidates(layers, "p1", "p10", "parabolic", DEFAULT_SETTINGS);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].sequence).toEqual(seq("p1", "p6", "p2", "p7", "p3", "p8", "p4", "p9", "p5", "p10"));
  });

  it("parabolic, open path, N=11: leftover is the larger half's last element", () => {
    const layers = makeLayer(11, false);
    const candidates = computeSamePathCandidates(layers, "p1", "p11", "parabolic", DEFAULT_SETTINGS);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].sequence).toEqual(seq("p1", "p7", "p2", "p8", "p3", "p9", "p4", "p10", "p5", "p11", "p6"));
  });

  it("reversed click order on an open path still starts the sequence at the first-clicked pin", () => {
    const layers = makeLayer(10, false);
    const candidates = computeSamePathCandidates(layers, "p10", "p1", "zigzag", DEFAULT_SETTINGS);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].sequence[0]).toBe("p10");
    expect(candidates[0].sequence).toEqual(seq("p10", "p1", "p9", "p2", "p8", "p3", "p7", "p4", "p6", "p5"));
  });

  it("adjacent pins (N=2) degenerate to a straight segment for both tools", () => {
    const layers = makeLayer(10, false);
    expect(computeSamePathCandidates(layers, "p4", "p5", "zigzag", DEFAULT_SETTINGS)[0].sequence).toEqual(seq("p4", "p5"));
    expect(computeSamePathCandidates(layers, "p4", "p5", "parabolic", DEFAULT_SETTINGS)[0].sequence).toEqual(seq("p4", "p5"));
  });

  it("closed path offers two arc candidates, both starting at A", () => {
    const layers = makeLayer(8, true);
    const candidates = computeSamePathCandidates(layers, "p1", "p4", "zigzag", DEFAULT_SETTINGS);
    expect(candidates).toHaveLength(2);
    // Every candidate's sequence starts at A; only the no-reverse (parabolic) shape
    // also always ends at B — zig-zag's mirror pairing does not (see the N=10/N=11
    // worked examples above: the sequence ends at the middle pin, not at B).
    for (const c of candidates) expect(c.sequence[0]).toBe("p1");
    // Short arc (p1->p2->p3->p4, N=4) and long arc (p1->p8->p7->p6->p5->p4, N=6).
    const lengths = candidates.map((c) => c.sequence.length).sort();
    expect(lengths).toEqual([4, 6]);
  });

  it("same pin twice, or pins on different paths, yields no same-path candidates", () => {
    const layers = makeLayer(10, false);
    expect(computeSamePathCandidates(layers, "p3", "p3", "zigzag", DEFAULT_SETTINGS)).toEqual([]);
    const twoPaths = makeTwoPaths(5, 5);
    expect(computeSamePathCandidates(twoPaths, "a1", "b1", "zigzag", DEFAULT_SETTINGS)).toEqual([]);
  });
});

describe("computeCrossPathCandidates — Case 2 (different Pin Paths)", () => {
  it("zig-zag: path1 has 10 pins, path2 has 11 — stops once path1 is exhausted", () => {
    const layers = makeTwoPaths(10, 11);
    const candidates = computeCrossPathCandidates(layers, "a1", "b1", "zigzag", DEFAULT_SETTINGS);
    const best = candidates.find((c) => c.sequence.length === 20);
    expect(best).toBeDefined();
    expect(best!.sequence).toEqual(
      seq("a1", "b1", "a2", "b2", "a3", "b3", "a4", "b4", "a5", "b5", "a6", "b6", "a7", "b7", "a8", "b8", "a9", "b9", "a10", "b10"),
    );
  });

  it("parabolic: same paths, second run walked in reverse", () => {
    const layers = makeTwoPaths(10, 11);
    const candidates = computeCrossPathCandidates(layers, "a1", "b1", "parabolic", DEFAULT_SETTINGS);
    const best = candidates.find((c) => c.sequence.length === 20);
    expect(best).toBeDefined();
    expect(best!.sequence).toEqual(
      seq("a1", "b10", "a2", "b9", "a3", "b8", "a4", "b7", "a5", "b6", "a6", "b5", "a7", "b4", "a8", "b3", "a9", "b2", "a10", "b1"),
    );
  });

  it("degenerate minimum: L=1 is the same for both tools", () => {
    // a10 is path a's last pin (index 9 of 10) and b1 is path b's first pin (index 0):
    // whichever direction walks "outward" past each path's own end leaves only the
    // anchor itself on that side, so some combination always bottoms out at L=1 —
    // and with only the anchor pin involved, direction can't affect the result, so
    // zig-zag and parabolic (which only differ in how the SECOND run is ordered)
    // produce the same one-segment sequence.
    const layers = makeTwoPaths(10, 11);
    const zig = computeCrossPathCandidates(layers, "a10", "b1", "zigzag", DEFAULT_SETTINGS).find((c) => c.sequence.length === 2);
    const par = computeCrossPathCandidates(layers, "a10", "b1", "parabolic", DEFAULT_SETTINGS).find((c) => c.sequence.length === 2);
    expect(zig?.sequence).toEqual(seq("a10", "b1"));
    expect(par?.sequence).toEqual(seq("a10", "b1"));
  });

  it("same path yields no cross-path candidates", () => {
    const layers = makeLayer(10, false);
    expect(computeCrossPathCandidates(layers, "p1", "p2", "zigzag", DEFAULT_SETTINGS)).toEqual([]);
  });

  it("an anchor in the middle of an open path offers direction choices in both directions", () => {
    const layers = makeTwoPaths(11, 11);
    const candidates = computeCrossPathCandidates(layers, "a6", "b6", "zigzag", DEFAULT_SETTINGS);
    // a6 (index 5 of 11) has 6 pins remaining forward and 6 remaining backward — same
    // for b6 — so all 4 direction combinations are distinct and every one uses all 6
    // pins per side (12 total).
    expect(candidates).toHaveLength(4);
    for (const c of candidates) expect(c.sequence).toHaveLength(12);
  });
});

describe("step-by (stride = step + 1)", () => {
  it("reproduces the exact user-supplied worked example: step=2 both sides, cross-path zig-zag", () => {
    const layers = makeTwoPaths(10, 20);
    const settings: TwoPinFillSettings = { stepA: 2, stepB: 2, fullFill: false };
    const candidates = computeCrossPathCandidates(layers, "a1", "b1", "zigzag", settings);
    const best = candidates.find((c) => c.dirA === 1 && c.dirB === 1);
    // subA=[a1,a4,a7,a10] (stride 3, path a has only 10 pins), subB=[b1,b4,b7,b10]
    // (stride 3, truncated to match a's 4-pin length since fullFill is off).
    expect(best?.sequence).toEqual(seq("a1", "b1", "a4", "b4", "a7", "b7", "a10", "b10"));
  });

  it("a stride that doesn't land on the far end leaves those pins simply unused, without fullFill", () => {
    const layers = makeTwoPaths(10, 10);
    // stepA=1 -> stride 2 -> subA=[a1,a3,a5,a7,a9] (5 pins); stepB=0 -> subB=all 10.
    const settings: TwoPinFillSettings = { stepA: 1, stepB: 0, fullFill: false };
    const candidates = computeCrossPathCandidates(layers, "a1", "b1", "zigzag", settings);
    const best = candidates.find((c) => c.dirA === 1 && c.dirB === 1);
    // Truncated to min(5,10)=5 pairs — b6..b10 never appear anywhere in the sequence.
    expect(best?.sequence).toEqual(seq("a1", "b1", "a3", "b2", "a5", "b3", "a7", "b4", "a9", "b5"));
    expect(best?.sequence).not.toContain("b6");
  });
});

describe("full-fill — Zig-zag (bounded, no wraparound)", () => {
  it("Case 2: keeps advancing the longer side alone once the shorter is exhausted", () => {
    const layers = makeTwoPaths(10, 10);
    const settings: TwoPinFillSettings = { stepA: 1, stepB: 0, fullFill: true };
    const candidates = computeCrossPathCandidates(layers, "a1", "b1", "zigzag", settings);
    const best = candidates.find((c) => c.dirA === 1 && c.dirB === 1);
    // Same subA/subB as the "leftover" test above, but now b's remaining tail
    // (b6..b10) is appended solo after the 5 interleaved pairs.
    expect(best?.sequence).toEqual(seq("a1", "b1", "a3", "b2", "a5", "b3", "a7", "b4", "a9", "b5", "b6", "b7", "b8", "b9", "b10"));
  });

  it("Case 1: applies the same rule to firstHalf/secondHalf when their strides differ", () => {
    const layers = makeLayer(10, false);
    // A=p1, B=p10: firstHalf=[p1..p5], secondHalf (B-anchored, reversed)=[p10,p9,p8,p7,p6].
    // stepA=0 keeps all 5 of firstHalf; stepB=1 (stride 2) keeps [p10,p8,p6] (3 pins).
    const settings: TwoPinFillSettings = { stepA: 0, stepB: 1, fullFill: true };
    const candidates = computeSamePathCandidates(layers, "p1", "p10", "zigzag", settings);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].sequence).toEqual(seq("p1", "p10", "p2", "p8", "p3", "p6", "p4", "p5"));
  });
});

describe("full-fill — Parabolic", () => {
  it("same-closed-path pair: circles=1 is one full ring pass (today's shape, generalized to the whole ring)", () => {
    const layers = makeLayer(8, true);
    const settings: TwoPinFillSettings = { stepA: 0, stepB: 0, fullFill: true, circles: 1 };
    const candidates = computeSamePathCandidates(layers, "p1", "p3", "parabolic", settings);
    expect(candidates).toHaveLength(2);
    const forward = candidates.find((c) => c.dirA === 1)!;
    // Full ring (all 8 pins) in the forward direction, split at the midpoint and
    // paired without reversal — not bounded to the p1->p3 arc the two clicks implied.
    expect(forward.sequence).toEqual(seq("p1", "p5", "p2", "p6", "p3", "p7", "p4", "p8"));
  });

  it("same-closed-path pair: circles=3 repeats the same full-ring pass 3 times", () => {
    const layers = makeLayer(8, true);
    const settingsOnce: TwoPinFillSettings = { stepA: 0, stepB: 0, fullFill: true, circles: 1 };
    const settingsThrice: TwoPinFillSettings = { stepA: 0, stepB: 0, fullFill: true, circles: 3 };
    const once = computeSamePathCandidates(layers, "p1", "p3", "parabolic", settingsOnce).find((c) => c.dirA === 1)!;
    const thrice = computeSamePathCandidates(layers, "p1", "p3", "parabolic", settingsThrice).find((c) => c.dirA === 1)!;
    expect(thrice.sequence).toEqual([...once.sequence, ...once.sequence, ...once.sequence]);
  });

  it("cross-path pair: falls back to Zig-zag's bounded tail-append rule, not a ring wrap", () => {
    const layers = makeTwoPaths(10, 10);
    const settings: TwoPinFillSettings = { stepA: 1, stepB: 0, fullFill: true, circles: 5 };
    const candidates = computeCrossPathCandidates(layers, "a1", "b1", "parabolic", settings);
    const best = candidates.find((c) => c.dirA === 1 && c.dirB === 1)!;
    // subA=[a1,a3,a5,a7,a9] (5), subB=reverse(all 10 b's)=[b10..b1] (10, no stride) —
    // interleaved to 5 pairs, then b's remaining tail (b5..b1) appended solo. `circles`
    // has no effect here (cross-path, not a same-closed-path pair).
    expect(best.sequence).toEqual(
      seq("a1", "b10", "a3", "b9", "a5", "b8", "a7", "b7", "a9", "b6", "b5", "b4", "b3", "b2", "b1"),
    );
  });
});
