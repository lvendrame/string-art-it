import { describe, expect, it } from "vitest";
import { isTextEntryTarget } from "./keyboard";

describe("isTextEntryTarget", () => {
  it("returns false for a null target", () => {
    expect(isTextEntryTarget(null)).toBe(false);
  });

  it("returns false for a non-HTMLElement target", () => {
    expect(isTextEntryTarget({} as EventTarget)).toBe(false);
  });

  it("returns true for an input element", () => {
    expect(isTextEntryTarget(document.createElement("input"))).toBe(true);
  });

  it("returns true for a textarea element", () => {
    expect(isTextEntryTarget(document.createElement("textarea"))).toBe(true);
  });

  it("returns true for a contenteditable element", () => {
    const div = document.createElement("div");
    Object.defineProperty(div, "isContentEditable", { value: true });
    expect(isTextEntryTarget(div)).toBe(true);
  });

  it("returns false for a plain div", () => {
    const div = document.createElement("div");
    Object.defineProperty(div, "isContentEditable", { value: false });
    expect(isTextEntryTarget(div)).toBe(false);
  });
});
