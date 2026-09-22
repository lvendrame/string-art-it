import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import {
  extractAllClasses,
  extractInlineStyleBlocks,
  findCssFiles,
  findSourceFiles,
  parseCssRules,
  type CssRule,
} from "./cssCascade";

const SRC_ROOT = join(import.meta.dirname, "..", "..");

export interface ComponentStyleReport {
  file: string;
  /** Every class this component applies, global or component-owned — a new or
   * dropped entry here means the component's visual dependencies changed. */
  classes: string[];
  /** Every CSS rule (from any .css file, theme.css included) whose required classes
   * this component's classes satisfy — i.e. every rule that actually paints this
   * component. A theme.css edit legitimately changes what this component renders,
   * so it belongs here too: it should fail every consumer's snapshot, not none of
   * them, so the edit's real blast radius is visible instead of silently absorbed. */
  cssRules: Array<{ selector: string; file: string; declarations: Record<string, string> }>;
  /** Every `style={...}` prop's exact source text, in source order. */
  inlineStyleBlocks: string[];
}

export function buildComponentStyleReports(): ComponentStyleReport[] {
  const rules = parseCssRules(findCssFiles());
  const reports: ComponentStyleReport[] = [];

  for (const file of findSourceFiles()) {
    const source = readFileSync(file, "utf-8");
    const classes = extractAllClasses(source);
    const inlineStyleBlocks = extractInlineStyleBlocks(source);
    if (classes.length === 0 && inlineStyleBlocks.length === 0) continue;

    const classSet = new Set(classes);
    const cssRules = rules
      .filter((r: CssRule) => r.classes.every((c) => classSet.has(c)))
      .map((r) => ({ selector: r.selector, file: r.file, declarations: r.declarations }));

    reports.push({ file: relative(SRC_ROOT, file), classes, cssRules, inlineStyleBlocks });
  }

  return reports.sort((a, b) => a.file.localeCompare(b.file));
}
