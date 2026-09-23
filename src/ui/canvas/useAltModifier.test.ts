import { renderHook } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useAltModifier } from "./useAltModifier";

describe("useAltModifier", () => {
  it("starts false, becomes true on Alt keydown, and false again on Alt keyup", () => {
    const { result } = renderHook(() => useAltModifier());
    expect(result.current).toBe(false);

    fireEvent.keyDown(window, { key: "Alt" });
    expect(result.current).toBe(true);

    fireEvent.keyUp(window, { key: "Alt" });
    expect(result.current).toBe(false);
  });

  it("ignores keys other than Alt", () => {
    const { result } = renderHook(() => useAltModifier());

    fireEvent.keyDown(window, { key: "Shift" });
    expect(result.current).toBe(false);

    fireEvent.keyUp(window, { key: "Shift" });
    expect(result.current).toBe(false);
  });

  it("removes its listeners on unmount", () => {
    const { unmount } = renderHook(() => useAltModifier());
    unmount();
    expect(() => fireEvent.keyDown(window, { key: "Alt" })).not.toThrow();
  });
});
