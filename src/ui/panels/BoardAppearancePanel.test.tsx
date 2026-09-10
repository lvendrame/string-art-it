import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EditorStore } from "../../application/document";
import { BoardAppearancePanel } from "./BoardAppearancePanel";

describe("BoardAppearancePanel", () => {
  it("switching to Linear shows two colour stops and a direction field", () => {
    const store = new EditorStore();
    render(<BoardAppearancePanel store={store} />);

    fireEvent.click(screen.getByRole("button", { name: "Linear" }));

    expect(store.getState().board.appearance.type).toBe("linear-gradient");
    expect(screen.getByText("Direction (°)")).toBeInTheDocument();
  });

  it("switching to Wood shows a preset dropdown with the expanded preset list", () => {
    const store = new EditorStore();
    render(<BoardAppearancePanel store={store} />);

    fireEvent.click(screen.getByRole("button", { name: "Wood" }));

    expect(screen.getByRole("option", { name: "Mahogany" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Ebony" })).toBeInTheDocument();
  });

  it("switching to Custom shows a file input", () => {
    const store = new EditorStore();
    render(<BoardAppearancePanel store={store} />);

    fireEvent.click(screen.getByRole("button", { name: "Custom" }));

    expect(store.getState().board.appearance.type).toBe("custom-texture");
    expect(document.querySelector('input[type="file"]')).toBeInTheDocument();
  });

  it("uploading a custom texture stores it as a data URL and persists across save/load", () => {
    const store = new EditorStore();
    store.setBoardAppearance({ type: "custom-texture", imageDataUrl: "data:image/png;base64,AAA=" });

    const file = store.toProjectFile();
    const reloaded = new EditorStore();
    reloaded.loadProject(JSON.parse(JSON.stringify(file)));

    expect(reloaded.getState().board.appearance).toEqual({ type: "custom-texture", imageDataUrl: "data:image/png;base64,AAA=" });
  });
});
