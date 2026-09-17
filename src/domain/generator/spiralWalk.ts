// docs/specs/32-generator-mode.md Spiral pattern — a single continuous walk around one
// circle of n pins: a pointer oscillates forward by the current "span" then backward
// by span-1, repeatedly, while span slowly shrinks from `innerLength` down to 0 (one
// decrement every `2*repetition-1` oscillations, nudging the pointer forward by 1 each
// time it does). The back-and-forth oscillation is what makes the accumulated chords
// cross back over themselves as they tighten, producing the layered spiral look — a
// monotonic one-directional walk (this pattern's first version) reads as a plain
// fan instead. Basic index arithmetic, an original implementation of the general
// "oscillating decaying span" technique.
export function spiralDecayingWalk(n: number, repetition: number, innerLength: number): number[] {
  if (n <= 0) throw new Error("n must be positive");
  if (repetition <= 0) throw new Error("repetition must be positive");
  if (innerLength <= 0) throw new Error("innerLength must be positive");
  const realRepetition = 2 * repetition - 1;
  let span = Math.round(innerLength);
  let repetitionCount = 0;
  let point = 0;
  let isPrevPoint = false;
  const indices: number[] = [0];
  while (span > 0) {
    point = isPrevPoint ? point - span + 1 : point + span;
    if (repetitionCount === realRepetition) {
      span -= 1;
      repetitionCount = 0;
      point += 1;
    } else {
      repetitionCount += 1;
    }
    indices.push(((point % n) + n) % n);
    isPrevPoint = !isPrevPoint;
  }
  return indices;
}
