import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import postcss from "postcss";
import selectorParser from "postcss-selector-parser";

const SRC_ROOT = join(import.meta.dirname, "..", "..");

function walk(dir: string, predicate: (path: string) => boolean, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, predicate, out);
    } else if (predicate(full)) {
      out.push(full);
    }
  }
  return out;
}

export function findCssFiles(): string[] {
  return walk(SRC_ROOT, (p) => p.endsWith(".css")).sort();
}

const TEST_DIR = join(SRC_ROOT, "test") + "/";

export function findSourceFiles(): string[] {
  return walk(
    SRC_ROOT,
    (p) =>
      (p.endsWith(".tsx") || p.endsWith(".ts")) &&
      !p.endsWith(".test.tsx") &&
      !p.endsWith(".test.ts") &&
      // src/test/ holds test infra (setup, this scanner's own source), not rendered
      // component markup — its doc-comment examples would otherwise read as fake combos.
      !p.startsWith(TEST_DIR),
  );
}

export interface CssRule {
  file: string;
  selector: string;
  /** Class names required on a single element for this selector to match. In this
   * codebase's same-element selectors (no id/type/attribute selectors are used
   * alongside classes today), specificity is exactly this count. */
  classes: string[];
  declarations: Record<string, string>;
}

/** Selectors containing a combinator (descendant/child/sibling) describe a
 * relationship between different elements, and pseudo-classes/-elements (:hover,
 * ::-webkit-slider-thumb, ...) describe conditional/shadow state jsdom can't
 * simulate reliably. Both are out of scope for this guard, which only checks the
 * default-state classes co-applied to one real node. */
function isSameElementSelector(selector: selectorParser.Selector): boolean {
  return !selector.nodes.some((node) => node.type === "combinator" || node.type === "pseudo");
}

function classesOf(selector: selectorParser.Selector): string[] {
  const classes: string[] = [];
  selector.walkClasses((node) => {
    classes.push(node.value);
  });
  return classes;
}

export function parseCssRules(files: string[]): CssRule[] {
  const rules: CssRule[] = [];
  for (const file of files) {
    const root = postcss.parse(readFileSync(file, "utf-8"));
    root.walkRules((rule) => {
      // @media/@supports-wrapped rules apply conditionally (e.g. print) and aren't
      // part of the normal-context cascade this guard checks.
      if (rule.parent?.type !== "root") return;
      const declarations: Record<string, string> = {};
      for (const node of rule.nodes) {
        if (node.type === "decl") declarations[node.prop] = node.value;
      }
      if (Object.keys(declarations).length === 0) return;

      selectorParser((selectors) => {
        selectors.each((selector) => {
          if (!isSameElementSelector(selector)) return;
          const classes = classesOf(selector);
          if (classes.length === 0) return;
          rules.push({
            file: relative(SRC_ROOT, file),
            selector: selector.toString().trim(),
            classes,
            declarations,
          });
        });
      }).processSync(rule.selector);
    });
  }
  return rules;
}

export interface ClassCombo {
  classes: string[];
  sourceFile: string;
}

// Matches `className=` and any third-party class-injection prop shaped like
// `*Classes=` (e.g. react-cookie-consent's `containerClasses`/`buttonClasses` —
// see CookieConsentBanner.tsx, which sets `buttonClasses="btn cookie-consent-banner__accept"`,
// the exact same combine-with-.btn pattern this guard exists to catch). Three
// alternatives, each with its own capture group: a plain string literal (group 1),
// a template literal whose backticks are captured bare in group 2
// (`className={` ... `}`), or any other brace expression captured bare in group 3
// (ternaries of string literals, bare identifiers, etc).
const CLASS_ATTR = /(?:className|\w*Classes)=(?:"([^"]*)"|\{`([^`]*)`\}|\{([^}]*)\})/g;
const QUOTED = /["']([^"']*)["']/g;

function expandTemplateBody(body: string): string[] {
  const parts: Array<string[] | string> = [];
  let lastIndex = 0;
  const exprRe = /\$\{([^}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = exprRe.exec(body))) {
    parts.push(body.slice(lastIndex, match.index));
    const branches = [...match[1].matchAll(QUOTED)].map((m) => m[1]);
    parts.push(branches.length > 0 ? branches : [""]);
    lastIndex = exprRe.lastIndex;
  }
  parts.push(body.slice(lastIndex));

  let results = [""];
  for (const part of parts) {
    if (typeof part === "string") {
      results = results.map((r) => r + part);
    } else {
      results = results.flatMap((r) => part.map((branch) => r + branch));
    }
  }
  return results;
}

/** Expands a className attribute match into every literal string it can render as.
 * Handles plain literals, template literals, and ternaries of string literals — the
 * patterns actually used in this codebase (see grep survey before this file was
 * written). Anything else (e.g. a classnames()/clsx() call, or a bare variable) has
 * no quoted-string branches to extract and yields no combo for that attribute; such
 * usages fall outside this guard's static scan. */
function expandClassNameMatch(m: RegExpMatchArray): string[] {
  if (m[1] !== undefined) return [m[1]];
  if (m[2] !== undefined) return expandTemplateBody(m[2]);
  return [...m[3].matchAll(QUOTED)].map((qm) => qm[1]);
}

export function extractClassCombos(files: string[]): ClassCombo[] {
  const combos: ClassCombo[] = [];
  for (const file of files) {
    const source = readFileSync(file, "utf-8");
    for (const attrMatch of source.matchAll(CLASS_ATTR)) {
      for (const rendered of expandClassNameMatch(attrMatch)) {
        const classes = rendered.split(/\s+/).filter(Boolean);
        if (classes.length > 1) combos.push({ classes, sourceFile: relative(SRC_ROOT, file) });
      }
    }
  }
  return combos;
}

/** Every class name a file applies via `className`, single or combined — unlike
 * extractClassCombos this keeps single-class usages too, since a per-component
 * snapshot cares whether a file starts/stops depending on a class at all. */
export function extractAllClasses(source: string): string[] {
  const classes = new Set<string>();
  for (const attrMatch of source.matchAll(CLASS_ATTR)) {
    for (const rendered of expandClassNameMatch(attrMatch)) {
      for (const cls of rendered.split(/\s+/).filter(Boolean)) classes.add(cls);
    }
  }
  return [...classes].sort();
}

function extractBalanced(source: string, openIdx: number): string {
  let depth = 0;
  for (let i = openIdx; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") {
      depth--;
      if (depth === 0) return source.slice(openIdx, i + 1);
    }
  }
  return source.slice(openIdx);
}

/** Every `style={...}` prop's exact source text (JSX attribute value only, not the
 * className etc). This freezes the literal expression — token references included
 * — so any edit to it (accidental or not) changes the snapshot that guards it,
 * regardless of whether the expression is a literal object or a variable/call. */
export function extractInlineStyleBlocks(source: string): string[] {
  const blocks: string[] = [];
  const attrRe = /style=\{/g;
  let match: RegExpExecArray | null;
  while ((match = attrRe.exec(source))) {
    const openIdx = match.index + "style=".length;
    blocks.push(extractBalanced(source, openIdx));
  }
  return blocks;
}

export interface FragileOverride {
  classes: string[];
  prop: string;
  /** Rules tied at the highest specificity among those touching `prop`, with
   * differing values, declared in DIFFERENT files — CSS breaks this tie by source
   * order, and cross-file order is decided by the bundler (code-splitting, chunk
   * hashing, import-graph traversal), not by this codebase. Two rules tied within
   * the same file are fine — that file's own line order never changes. This is
   * exactly the shape of bug fixed by compounding a component selector with `.btn`
   * in AutosaveDialog.css: give one rule strictly more classes so it wins
   * unconditionally, instead of relying on which file's CSS loads last. */
  tiedRules: CssRule[];
  sourceFile: string;
}

function ruleAppliesTo(rule: CssRule, comboClasses: Set<string>): boolean {
  return rule.classes.every((c) => comboClasses.has(c));
}

export function findFragileOverrides(rules: CssRule[], combos: ClassCombo[]): FragileOverride[] {
  const seen = new Set<string>();
  const out: FragileOverride[] = [];
  for (const combo of combos) {
    const key = [...combo.classes].sort().join(" ");
    if (seen.has(key)) continue;
    seen.add(key);

    const comboSet = new Set(combo.classes);
    const applying = rules.filter((r) => ruleAppliesTo(r, comboSet));

    const byProp = new Map<string, CssRule[]>();
    for (const rule of applying) {
      for (const prop of Object.keys(rule.declarations)) {
        const list = byProp.get(prop) ?? [];
        list.push(rule);
        byProp.set(prop, list);
      }
    }

    for (const [prop, propRules] of byProp) {
      const maxSpecificity = Math.max(...propRules.map((r) => r.classes.length));
      const topTier = propRules.filter((r) => r.classes.length === maxSpecificity);
      const distinctValues = new Set(topTier.map((r) => r.declarations[prop]));
      const distinctFiles = new Set(topTier.map((r) => r.file));
      if (topTier.length > 1 && distinctValues.size > 1 && distinctFiles.size > 1) {
        out.push({ classes: combo.classes, prop, tiedRules: topTier, sourceFile: combo.sourceFile });
      }
    }
  }
  return out;
}
