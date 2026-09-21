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

describe("full-fill — Case 2 (different Pin Paths): combines a mid-path anchor's two directions", () => {
  it("a mid-path anchor uses both its directions as one run (dir +1's pins, then dir -1's, anchor deduplicated)", () => {
    const layers = makeTwoPaths(10, 10);
    const settings: TwoPinFillSettings = { stepA: 0, stepB: 0, fullFill: true };
    // a5 is mid-path (index 4 of 10): its two directions are [a5..a10] and [a5,a4,a3,a2,a1].
    // b1 is a true endpoint, so full-fill has no effect on it (nothing to combine).
    const candidates = computeCrossPathCandidates(layers, "a5", "b1", "zigzag", settings);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].sequence).toEqual(
      seq("a5", "b1", "a6", "b2", "a7", "b3", "a8", "b4", "a9", "b5", "a10", "b6", "a4", "b7", "a3", "b8", "a2", "b9", "a1", "b10"),
    );
  });

  it("without full-fill, the same mid-path anchor still needs the 3rd click (multiple direction candidates) — unchanged, pre-existing behavior", () => {
    const layers = makeTwoPaths(10, 10);
    const settings: TwoPinFillSettings = { stepA: 0, stepB: 0, fullFill: false };
    const withoutFullFill = computeCrossPathCandidates(layers, "a5", "b1", "zigzag", settings);
    const withFullFill = computeCrossPathCandidates(layers, "a5", "b1", "zigzag", { ...settings, fullFill: true });
    expect(withoutFullFill.length).toBeGreaterThan(1);
    expect(withFullFill).toHaveLength(1);
  });

  it("unequal combined-run lengths: outer pairing simply truncates to the shorter one, no tail is appended", () => {
    const layers = makeTwoPaths(10, 20);
    const settings: TwoPinFillSettings = { stepA: 0, stepB: 0, fullFill: true };
    // a5's combined run is still 10 pins (bounded by its own 10-pin path); b1 (endpoint
    // of the 20-pin path) contributes all 20. Pairing truncates to 10 — b11..b20 never
    // appear anywhere, even though full-fill is on.
    const candidates = computeCrossPathCandidates(layers, "a5", "b1", "zigzag", settings);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].sequence).toEqual(
      seq("a5", "b1", "a6", "b2", "a7", "b3", "a8", "b4", "a9", "b5", "a10", "b6", "a4", "b7", "a3", "b8", "a2", "b9", "a1", "b10"),
    );
    expect(candidates[0].sequence).not.toContain("b11");
  });

  it("Parabolic gets the same combined-run treatment, with its own cross-path reversal applied afterward", () => {
    const layers = makeTwoPaths(10, 10);
    const settings: TwoPinFillSettings = { stepA: 0, stepB: 0, fullFill: true };
    const candidates = computeCrossPathCandidates(layers, "a5", "b1", "parabolic", settings);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].sequence).toEqual(
      seq("a5", "b10", "a6", "b9", "a7", "b8", "a8", "b7", "a9", "b6", "a10", "b5", "a4", "b4", "a3", "b3", "a2", "b2", "a1", "b1"),
    );
  });

  it("Cycles has no effect here at all (only read for a same-closed-path pair)", () => {
    const layers = makeTwoPaths(10, 10);
    const withoutCycles = computeCrossPathCandidates(layers, "a5", "b1", "parabolic", { stepA: 0, stepB: 0, fullFill: true });
    const withCycles = computeCrossPathCandidates(layers, "a5", "b1", "parabolic", { stepA: 0, stepB: 0, fullFill: true, cycles: 5 });
    expect(withCycles[0].sequence).toEqual(withoutCycles[0].sequence);
  });
});

describe("full-fill — Case 1 (same Pin Path)", () => {
  it("open path: full-fill has no effect — there's no per-anchor direction ambiguity to combine (B already forces the direction)", () => {
    const layers = makeLayer(10, false);
    const without = computeSamePathCandidates(layers, "p1", "p10", "zigzag", { stepA: 0, stepB: 0, fullFill: false });
    const withFullFill = computeSamePathCandidates(layers, "p1", "p10", "zigzag", { stepA: 0, stepB: 0, fullFill: true });
    expect(withFullFill).toHaveLength(1);
    expect(withFullFill[0].sequence).toEqual(without[0].sequence);
  });

  it("closed path: full-fill runs the SAME bounded-arc algorithm on both arcs, committed as TWO SEPARATE strands — first pair is still (A,B) in each", () => {
    const layers = makeLayer(8, true);
    const settings: TwoPinFillSettings = { stepA: 0, stepB: 0, fullFill: true };
    const candidates = computeSamePathCandidates(layers, "p1", "p3", "zigzag", settings);
    expect(candidates).toHaveLength(1); // no 3rd click — both arcs are used, nothing to disambiguate
    // Short arc (p1,p2,p3 -> zigzag [p1,p3,p2]) and the long arc (p1,p8,p7,p6,p5,p4,p3
    // -> zigzag [p1,p3,p8,p4,p7,p5,p6]) — (A,B)=(p1,p3) is the first pair in BOTH arcs,
    // exactly like the bounded (non-full-fill) algorithm already produces for a single
    // arc. Kept as two SEPARATE strands (sequence + extraSequences), not concatenated
    // into one — concatenating would draw a spurious segment between wherever the
    // short arc's zigzag ends and wherever the long arc's own (A,B) pair restarts.
    expect(candidates[0].sequence).toEqual(seq("p1", "p3", "p2"));
    expect(candidates[0].extraSequences).toEqual([seq("p1", "p3", "p8", "p4", "p7", "p5", "p6")]);
  });

  it("without full-fill, the same closed-path pair still needs the 3rd click (pick one arc) — unchanged", () => {
    const layers = makeLayer(8, true);
    const candidates = computeSamePathCandidates(layers, "p1", "p3", "zigzag", { stepA: 0, stepB: 0, fullFill: false });
    expect(candidates).toHaveLength(2);
    expect(candidates[0].extraSequences).toBeUndefined();
    expect(candidates[1].extraSequences).toBeUndefined();
  });

  it("Parabolic same-closed-path pair: full-fill is a single continuous constant-offset walk, NOT the two-arc shape", () => {
    // Confirmed against a real reported example (141-pin ring, pins 125 & 22): the
    // resulting sequence keeps the SAME (A,B) offset constant while both pins advance
    // together — [125,22, 126,23, ...] — for one full lap, stopping just before it
    // would repeat the very first pair again. This is NOT firstHalf/secondHalf pairing
    // (Zig-zag's own closed-path full-fill shape, which stays unchanged) — Parabolic's
    // is a plain "walk A forward, walk B forward in lockstep" using the SAME
    // extractIds/strideList/interleave primitives, not the arc-split algorithm.
    const layers = makeLayer(8, true);
    const settings: TwoPinFillSettings = { stepA: 0, stepB: 0, fullFill: true, cycles: 1 };
    const candidates = computeSamePathCandidates(layers, "p1", "p3", "parabolic", settings);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].extraSequences).toBeUndefined();
    // offset = 2 (index of p3 minus index of p1), constant across all 8 pairs:
    // (p1,p3),(p2,p4),(p3,p5),(p4,p6),(p5,p7),(p6,p8),(p7,p1),(p8,p2).
    expect(candidates[0].sequence).toEqual(
      seq("p1", "p3", "p2", "p4", "p3", "p5", "p4", "p6", "p5", "p7", "p6", "p8", "p7", "p1", "p8", "p2"),
    );
  });

  it("Zig-zag same-closed-path pair keeps the two-arc shape (unaffected by the Parabolic change above)", () => {
    const layers = makeLayer(8, true);
    const settings: TwoPinFillSettings = { stepA: 0, stepB: 0, fullFill: true, cycles: 1 };
    const candidates = computeSamePathCandidates(layers, "p1", "p3", "zigzag", settings);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].sequence).toEqual(seq("p1", "p3", "p2"));
    expect(candidates[0].extraSequences).toEqual([seq("p1", "p3", "p8", "p4", "p7", "p5", "p6")]);
  });

  it("Parabolic cycles=3 continues the SAME walk for 3 origin-passes, as one continuous strand (not 3 separate repeats)", () => {
    // Confirmed by the user: cycles>1 should keep extending the same walk until a side
    // has reached/passed its own starting pin `cycles` times, not restart from scratch
    // as separate overlapping strands — cycles=3's sequence starts with exactly
    // cycles=1's sequence, then keeps going for 2 more passes.
    const layers = makeLayer(8, true);
    const settingsOnce: TwoPinFillSettings = { stepA: 0, stepB: 0, fullFill: true, cycles: 1 };
    const settingsThrice: TwoPinFillSettings = { stepA: 0, stepB: 0, fullFill: true, cycles: 3 };
    const once = computeSamePathCandidates(layers, "p1", "p3", "parabolic", settingsOnce)[0];
    const thrice = computeSamePathCandidates(layers, "p1", "p3", "parabolic", settingsThrice)[0];
    expect(once.extraSequences).toBeUndefined();
    expect(thrice.extraSequences).toBeUndefined();
    expect(once.sequence).toHaveLength(16); // 8 pairs
    expect(thrice.sequence).toHaveLength(48); // 24 pairs (3x)
    expect(thrice.sequence.slice(0, 16)).toEqual(once.sequence);
  });

  it("Zig-zag cycles=3 still repeats the arc-pair 3 times as 6 separate strands (unchanged)", () => {
    const layers = makeLayer(8, true);
    const settingsOnce: TwoPinFillSettings = { stepA: 0, stepB: 0, fullFill: true, cycles: 1 };
    const settingsThrice: TwoPinFillSettings = { stepA: 0, stepB: 0, fullFill: true, cycles: 3 };
    const once = computeSamePathCandidates(layers, "p1", "p3", "zigzag", settingsOnce)[0];
    const thrice = computeSamePathCandidates(layers, "p1", "p3", "zigzag", settingsThrice)[0];
    const onceStrands = [once.sequence, ...(once.extraSequences ?? [])];
    const thriceStrands = [thrice.sequence, ...(thrice.extraSequences ?? [])];
    expect(onceStrands).toHaveLength(2);
    expect(thriceStrands).toHaveLength(6);
    expect(thriceStrands).toEqual([...onceStrands, ...onceStrands, ...onceStrands]);
  });

  it("reproduces the exact reported example: 141-pin ring, pins 125 & 22, Parabolic full-fill", () => {
    const layers = makeLayer(141, true);
    const settings: TwoPinFillSettings = { stepA: 0, stepB: 0, fullFill: true };
    const candidates = computeSamePathCandidates(layers, "p125", "p22", "parabolic", settings);
    expect(candidates).toHaveLength(1);
    const sequence = candidates[0].sequence;
    expect(sequence).toHaveLength(282); // 141 pairs, no closing repeat back to (125,22)
    expect(sequence.slice(0, 10)).toEqual(seq("p125", "p22", "p126", "p23", "p127", "p24", "p128", "p25", "p129", "p26"));
    expect(sequence.slice(-2)).toEqual(seq("p124", "p21"));
    // The (A,B) PAIR never repeats — pin 125 can legitimately reappear later as part of
    // B's own lap (it eventually walks through every pin, including where A started),
    // but the very first pair specifically is never re-inserted a second time.
    const pairs: [string, string][] = [];
    for (let i = 0; i < sequence.length; i += 2) pairs.push([sequence[i], sequence[i + 1]]);
    expect(pairs.filter(([x, y]) => x === "p125" && y === "p22")).toHaveLength(1);
  });

  it("reproduces the exact reported example: 119-pin ring, pins 99 & 19, Step A 0 / Step B 1, Parabolic full-fill", () => {
    // Pins 99/19 on a 119-pin ring, Step A=0 (stride 1) and Step B=1 (stride 2). Stride
    // 1 always divides pinCount exactly, so A's own hop count is 119 (stop before
    // repeating its own start). Stride 2 does NOT divide 119 exactly (119 is odd), so B
    // overshoots its own start rather than landing on it — its hop count is
    // ceil(119/2)+1 = 61, INCLUDING the pin that overshoots. The walk stops at
    // min(119, 61) = 61.
    const layers = makeLayer(119, true);
    const settings: TwoPinFillSettings = { stepA: 0, stepB: 1, fullFill: true };
    const candidates = computeSamePathCandidates(layers, "p99", "p19", "parabolic", settings);
    expect(candidates).toHaveLength(1);
    const sequence = candidates[0].sequence;
    expect(sequence).toHaveLength(122); // 61 pairs
    expect(sequence.slice(0, 10)).toEqual(seq("p99", "p19", "p100", "p21", "p101", "p23", "p102", "p25", "p103", "p27"));
    expect(sequence.slice(-6)).toEqual(seq("p38", "p16", "p39", "p18", "p40", "p20"));
  });

  it("cycles=3 on that same example continues the SAME walk for 3 origin-passes, as one continuous strand", () => {
    const layers = makeLayer(119, true);
    const settingsOnce: TwoPinFillSettings = { stepA: 0, stepB: 1, fullFill: true, cycles: 1 };
    const settingsThrice: TwoPinFillSettings = { stepA: 0, stepB: 1, fullFill: true, cycles: 3 };
    const once = computeSamePathCandidates(layers, "p99", "p19", "parabolic", settingsOnce)[0];
    const thrice = computeSamePathCandidates(layers, "p99", "p19", "parabolic", settingsThrice)[0];
    expect(thrice.extraSequences).toBeUndefined();
    expect(thrice.sequence).toHaveLength(360); // 180 pairs
    expect(thrice.sequence.slice(0, once.sequence.length)).toEqual(once.sequence);
    expect(thrice.sequence.slice(-10)).toEqual(seq("p36", "p12", "p37", "p14", "p38", "p16", "p39", "p18", "p40", "p20"));
  });

  it("reproduces the exact reported example: 151-pin ring, pins 124 & 15, Step A 0 / Step B 2, Parabolic full-fill", () => {
    // Pins 124/15 on a 151-pin ring, Step A=0 (stride 1) and Step B=2 (stride 3).
    // Stride 1 always divides pinCount exactly, so A's own hop count is 151. Stride 3
    // does NOT divide 151 exactly (151 is prime), so B overshoots rather than landing
    // exactly — its hop count is ceil(151/3)+1 = 52, including the overshoot pin. The
    // walk stops at min(151, 52) = 52.
    const layers = makeLayer(151, true);
    const settings: TwoPinFillSettings = { stepA: 0, stepB: 2, fullFill: true };
    const candidates = computeSamePathCandidates(layers, "p124", "p15", "parabolic", settings);
    expect(candidates).toHaveLength(1);
    const sequence = candidates[0].sequence;
    expect(sequence).toHaveLength(104); // 52 pairs
    expect(sequence.slice(0, 8)).toEqual(seq("p124", "p15", "p125", "p18", "p126", "p21", "p127", "p24"));
    expect(sequence.slice(-6)).toEqual(seq("p22", "p11", "p23", "p14", "p24", "p17"));
  });

  it("stops as soon as either anchor returns to its OWN starting pin — that's one cycle", () => {
    // Confirmed directly by the user, correcting an earlier statement of theirs: the
    // walk stops the moment ANY vertex reaches/passes its own origin pin, not once the
    // pair as a whole realigns. On a 12-pin ring, Step A=0 (stride 1, cycle length 12)
    // vs Step B=3 (stride 4, cycle length 3, since gcd(12,4)=4) — B is the first to
    // return to its own start, after 3 hops, so the walk stops there.
    const layers = makeLayer(12, true);
    const settings: TwoPinFillSettings = { stepA: 0, stepB: 3, fullFill: true };
    const candidates = computeSamePathCandidates(layers, "p1", "p2", "parabolic", settings);
    expect(candidates).toHaveLength(1);
    const sequence = candidates[0].sequence;
    expect(sequence).toHaveLength(6); // 3 pairs — bounded by B's shorter cycle
    expect(sequence).toEqual(seq("p1", "p2", "p2", "p6", "p3", "p10"));
  });

  it("uses the shorter of the two anchors' own cycle lengths even when neither divides the other", () => {
    // On a 12-pin ring, Step A=2 (stride 3, cycle length 4, since gcd(12,3)=3) and
    // Step B=1 (stride 2, cycle length 6, since gcd(12,2)=2) — A is first back to its
    // own start, after 4 hops.
    const layers = makeLayer(12, true);
    const settings: TwoPinFillSettings = { stepA: 2, stepB: 1, fullFill: true };
    const candidates = computeSamePathCandidates(layers, "p1", "p2", "parabolic", settings);
    expect(candidates).toHaveLength(1);
    const sequence = candidates[0].sequence;
    expect(sequence).toHaveLength(8); // 4 pairs — bounded by A's shorter cycle
    expect(sequence).toEqual(seq("p1", "p2", "p4", "p4", "p7", "p6", "p10", "p8"));
  });

  it("a side that overshoots its own origin (stride doesn't divide pinCount) includes the overshooting pin", () => {
    // Confirmed by the user with a concrete example: if a side's own origin is pin 12
    // and its stride skips past it landing on pin 13 instead of exactly on 12, that
    // pin 13 counts as having "passed" the origin and is the side's stopping point —
    // unlike a stride that lands exactly ON its origin (excluded, so the pair isn't
    // redundantly repeated). On a 10-pin ring, Step A=0 (stride 1, divides 10 exactly)
    // vs Step B=2 (stride 3, does NOT divide 10) — B never lands exactly back on its
    // own start within its walk, so its final term is the pin where it first overshoots.
    const layers = makeLayer(10, true);
    const settings: TwoPinFillSettings = { stepA: 0, stepB: 2, fullFill: true };
    const candidates = computeSamePathCandidates(layers, "p1", "p2", "parabolic", settings);
    expect(candidates).toHaveLength(1);
    const sequence = candidates[0].sequence;
    expect(sequence).toHaveLength(10); // 5 pairs
    expect(sequence).toEqual(seq("p1", "p2", "p2", "p5", "p3", "p8", "p4", "p1", "p5", "p4"));
  });
});
