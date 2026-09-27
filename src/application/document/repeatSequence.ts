import type { PinLayer } from "./pinLayer";
import { findPinPosition } from "./threadPattern";
import { pinIdAt } from "./twoPinSequence";

// docs/specs/38-repeat-pattern-tool.md — the clicked pins split into two halves;
// each (first[i], second[i]) pair's pin-number step extrapolates one more group per
// cycle, walking the second pin's own Pin Path (and mirror copy).

type PinPosition = NonNullable<ReturnType<typeof findPinPosition>>;

interface RepeatPair {
  second: PinPosition;
  step: number;
}

export const MIN_REPEAT_PINS = 4;

// The two clicked halves count as groups too, so each can take its own colour.
export function maxRepeatColours(cycles: number): number {
  return cycles + 2;
}

function usablePinIds(pinIds: string[]): string[] {
  return pinIds.slice(0, pinIds.length - (pinIds.length % 2));
}

function splitHalves(pinIds: string[]): [string[], string[]] {
  const half = pinIds.length / 2;
  return [pinIds.slice(0, half), pinIds.slice(half)];
}

function resolvePairs(layers: PinLayer[], first: string[], second: string[]): RepeatPair[] | undefined {
  const pairs: RepeatPair[] = [];
  for (let i = 0; i < first.length; i++) {
    const a = findPinPosition(layers, first[i]);
    const b = findPinPosition(layers, second[i]);
    if (!a || !b) return undefined;
    pairs.push({ second: b, step: b.index - a.index });
  }
  return pairs;
}

function extrapolatePin({ second, step }: RepeatPair, cycle: number): string {
  const count = second.path.pins.length;
  const index = (((second.index + cycle * step) % count) + count) % count;
  return pinIdAt(second.path, index, second.groupIndex);
}

// Parabolic's stop rule: the first pair's displacement from the first clicked pin
// after cycle k is (k+1)·d. Landing exactly on a full lap is excluded (it would
// repeat the start); the first overshoot is kept (that pin was never visited).
export function fullFillCycleCount(step: number, pinCount: number): number {
  const d = Math.abs(step);
  if (d === 0) return 0;
  const laps = Math.ceil(pinCount / d);
  return Math.max(0, laps * d === pinCount ? laps - 2 : laps - 1);
}

export function computeRepeatGroups(layers: PinLayer[], pinIds: string[], cycles: number, fullFill: boolean): string[][] | undefined {
  const usable = usablePinIds(pinIds);
  if (usable.length < MIN_REPEAT_PINS) return undefined;
  const [first, second] = splitHalves(usable);
  const pairs = resolvePairs(layers, first, second);
  if (!pairs) return undefined;

  const lead = pairs[0];
  const cycleCount = fullFill ? fullFillCycleCount(lead.step, lead.second.path.pins.length) : cycles;
  const generated = Array.from({ length: cycleCount }, (_, k) => pairs.map((pair) => extrapolatePin(pair, k + 1)));
  return [first, second, ...generated];
}

// One colour: one continuous Thread Path. Otherwise one path per group, each group
// after the first starting at the previous group's last pin so the connecting
// segment takes the new group's colour.
export function buildRepeatThreadPins(groups: string[][], colourCount: number): string[][] {
  if (colourCount <= 1) return [groups.flat()];
  return groups.map((group, g) => (g === 0 ? group : [groups[g - 1][groups[g - 1].length - 1], ...group]));
}
