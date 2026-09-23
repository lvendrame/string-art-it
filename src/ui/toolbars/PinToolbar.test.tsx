import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EditorStore } from "@application/document";
import { PinToolbar } from "./PinToolbar";

describe("PinToolbar", () => {
  it("clicking the Text tool button sets pinTool to text", () => {
    const store = new EditorStore();
    render(<PinToolbar store={store} />);

    fireEvent.click(screen.getByRole("button", { name: "Text [T]" }));

    expect(store.getState().pinTool).toBe("text");
  });

  it("the Text button reflects active state alongside the other basic tools", () => {
    const store = new EditorStore();
    render(<PinToolbar store={store} />);

    const textButton = screen.getByRole("button", { name: "Text [T]" });
    expect(textButton.className).not.toContain("btn-active");

    fireEvent.click(textButton);
    expect(textButton.className).toContain("btn-active");
  });

  it("clicking Eraser and Path Eraser buttons sets the corresponding pin tool", () => {
    const store = new EditorStore();
    render(<PinToolbar store={store} />);

    fireEvent.click(screen.getByRole("button", { name: /^Eraser \[/ }));
    expect(store.getState().pinTool).toBe("eraser");

    fireEvent.click(screen.getByRole("button", { name: /^Path Eraser \[/ }));
    expect(store.getState().pinTool).toBe("path-eraser");
  });

  it("choosing a polygon/star shape sets that pin tool and marks the picker active", () => {
    const store = new EditorStore();
    render(<PinToolbar store={store} />);
    const select = screen.getByLabelText("Polygon / Star");
    expect(select).toHaveValue("");
    expect(select.closest("label")!.className).not.toContain("btn-active");

    fireEvent.change(select, { target: { value: "hexagon" } });

    expect(store.getState().pinTool).toBe("hexagon");
    expect(select).toHaveValue("hexagon");
    expect(select.closest("label")!.className).toContain("btn-active");
  });
});
