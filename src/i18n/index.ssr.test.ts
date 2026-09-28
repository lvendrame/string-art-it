// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

describe("i18n bootstrap (SSR-style environment)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("initializes without throwing when navigator and document are unavailable", async () => {
    vi.stubGlobal("navigator", undefined);
    expect(typeof document).toBe("undefined");
    vi.resetModules();

    await expect(import("./index")).resolves.toBeDefined();
  });
});
