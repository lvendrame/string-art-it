import { describe, expect, it } from "vitest";
import { extractClassCombos, findCssFiles, findFragileOverrides, findSourceFiles, parseCssRules } from "./cssCascade";

/**
 * Guards every component against the class of bug fixed by
 * `.btn.autosave-dialog__restore` (a component class losing to the global `.btn`
 * rule): it statically finds every class combination actually used together on one
 * element across the codebase, then fails if two CSS rules that could both apply
 * set the same property to different values at equal specificity. Equal specificity
 * is broken by source order, which is a real bundler's CSS chunk order — not
 * something this codebase controls or should rely on. The fix is always the same
 * shape: make the intended winner strictly more specific (e.g. compound it with the
 * class it needs to beat), not reorder imports.
 */

const rules = parseCssRules(findCssFiles());
const combos = extractClassCombos(findSourceFiles());
const fragileOverrides = findFragileOverrides(rules, combos);

describe("CSS cascade guard", () => {
  it("scanned at least one class combination", () => {
    // If this drops to 0, the scanner broke (e.g. className patterns changed shape) —
    // not that the codebase suddenly stopped combining classes on one element.
    expect(combos.length).toBeGreaterThan(0);
  });

  it("has no same-specificity CSS conflicts that depend on source order", () => {
    const report = fragileOverrides
      .map(
        (f) =>
          `  classes="${f.classes.join(" ")}" (from ${f.sourceFile}), property "${f.prop}" is set differently by ` +
          `equally-specific rules: ${f.tiedRules.map((r) => `${r.selector} { ${f.prop}: ${r.declarations[f.prop]} } [${r.file}]`).join(" vs ")}`,
      )
      .join("\n");

    expect(fragileOverrides, report ? `\n${report}` : undefined).toEqual([]);
  });
});
