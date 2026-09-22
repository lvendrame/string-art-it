import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildComponentStyleReports } from "./componentStyleSnapshot";

/**
 * Per-component style guard: for every component file that applies a class or an
 * inline `style` prop, freezes its classes, every CSS rule that actually paints it
 * (its own component-scoped rules AND any theme.css rule its classes satisfy — a
 * theme.css edit legitimately changes what this component renders, so it must be
 * able to fail this component's snapshot too), and every inline style expression's
 * exact source text — one snapshot FILE per component (mirroring its source path under
 * __snapshots__/components/), so two people editing different components never
 * conflict on the same file and `git diff` on a single file already names the
 * component. Any edit that changes what a component renders — intentional or a
 * mistake — changes that component's file and fails here until the diff is
 * reviewed and the snapshot updated. Complements the cascade-order guard in
 * cascadeGuard.test.ts, which only catches a different failure shape (an override
 * silently losing due to specificity/order).
 */

const reports = buildComponentStyleReports();
const SNAPSHOT_DIR = join(import.meta.dirname, "__snapshots__", "components");

describe("component style guard", () => {
  it("found components to guard", () => {
    expect(reports.length).toBeGreaterThan(0);
  });

  it.each(reports.map((r) => [r.file, r] as const))("%s", async (file, report) => {
    await expect(JSON.stringify(report, null, 2)).toMatchFileSnapshot(join(SNAPSHOT_DIR, `${file}.snap`));
  });
});
