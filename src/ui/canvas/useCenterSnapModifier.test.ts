import { act, fireEvent, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useCenterSnapModifier } from "./useCenterSnapModifier";

describe("useCenterSnapModifier", () => {
  it.each(["Control", "Meta"])("tracks %s being held", (key) => {
    const { result } = renderHook(() => useCenterSnapModifier());
    expect(result.current).toBe(false);

    fireEvent.keyDown(window, { key });
    expect(result.current).toBe(true);

    fireEvent.keyUp(window, { key });
    expect(result.current).toBe(false);
  });

  it("ignores other keys", () => {
    const { result } = renderHook(() => useCenterSnapModifier());
    fireEvent.keyDown(window, { key: "Shift" });
    expect(result.current).toBe(false);
  });

  it("resets when the window loses focus", () => {
    const { result } = renderHook(() => useCenterSnapModifier());
    fireEvent.keyDown(window, { key: "Control" });
    act(() => { window.dispatchEvent(new Event("blur")); });
    expect(result.current).toBe(false);
  });
});
