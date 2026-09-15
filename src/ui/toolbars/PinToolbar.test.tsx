import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EditorStore } from "../../application/document";
import { PinToolbar } from "./PinToolbar";

describe("PinToolbar", () => {
  it("clicking the Text tool button sets pinTool to text", () => {
    const store = new EditorStore();
    render(<PinToolbar store={store} />);

    fireEvent.click(screen.getByRole("button", { name: "Text" }));

    expect(store.getState().pinTool).toBe("text");
  });

  it("the Text button reflects active state alongside the other basic tools", () => {
    const store = new EditorStore();
    render(<PinToolbar store={store} />);

    const textButton = screen.getByRole("button", { name: "Text" });
    expect(textButton.className).not.toContain("btn-active");

    fireEvent.click(textButton);
    expect(textButton.className).toContain("btn-active");
  });
});
