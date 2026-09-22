export const PALETTE = ["#5b8def", "#edeff7", "#e8b449", "#d96c6c", "#8fd6c8"];

// docs/specs/34-keyboard-shortcuts.md — Shift+1/2/3 reuses this exact array-building
// logic (not just PALETTE) so the keyboard shortcut and ThreadPropertiesPanel's own
// [1,2,3] buttons always agree on which colours survive a count change.
export function coloursForCount(colours: string[], n: number): string[] {
  return Array.from({ length: n }, (_, i) => colours[i] ?? PALETTE[i % PALETTE.length]);
}
