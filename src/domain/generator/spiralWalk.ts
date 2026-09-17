// docs/specs/32-generator-mode.md Spiral pattern — a single continuous walk around one
// circle of n pins, jumping by a chord "span" that starts near n/2 and shrinks by one
// pin every step down to `innerLength`, then resets for the next of `repetition`
// passes. A shrinking chord span sweeps progressively tighter arcs each pass, which is
// what gives the accumulated threads their spiral-like tightening look — an original,
// simple decaying-span walk, not a reproduction of any specific reference formula.
export function spiralDecayingWalk(n: number, repetition: number, innerLength: number): number[] {
  if (n <= 0) throw new Error("n must be positive");
  if (repetition <= 0) throw new Error("repetition must be positive");
  if (innerLength <= 0) throw new Error("innerLength must be positive");
  const indices: number[] = [0];
  let current = 0;
  for (let r = 0; r < repetition; r += 1) {
    const startSpan = Math.max(innerLength + 1, Math.floor(n / 2));
    for (let span = startSpan; span > innerLength; span -= 1) {
      current = (current + span) % n;
      indices.push(current);
    }
  }
  return indices;
}
