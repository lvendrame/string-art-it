import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EditorStore } from "@application/document";
import { BoardAppearancePanel } from "./BoardAppearancePanel";

describe("BoardAppearancePanel", () => {
  it("switching to Linear shows two colour stops and a direction field", () => {
    const store = new EditorStore();
    render(<BoardAppearancePanel store={store} />);

    fireEvent.click(screen.getByRole("button", { name: "Linear" }));

    expect(store.getState().board.appearance.type).toBe("linear-gradient");
    expect(screen.getByText("Direction (°)")).toBeInTheDocument();
  });

  it("Solid shows a colour swatch that writes through", () => {
    const store = new EditorStore();
    render(<BoardAppearancePanel store={store} />);

    fireEvent.change(screen.getByLabelText("Colour"), { target: { value: "#123456" } });

    expect(store.getState().board.appearance).toEqual({ type: "solid", colour: "#123456" });
  });

  it("Linear gradient: editing a stop colour and the direction writes through", () => {
    const store = new EditorStore();
    render(<BoardAppearancePanel store={store} />);
    fireEvent.click(screen.getByRole("button", { name: "Linear" }));

    const swatches = document.querySelectorAll('input[type="color"]');
    fireEvent.change(swatches[0], { target: { value: "#111111" } });
    fireEvent.change(swatches[1], { target: { value: "#222222" } });
    fireEvent.change(screen.getByLabelText("Direction (°)"), { target: { value: "90" } });

    const appearance = store.getState().board.appearance;
    if (appearance.type !== "linear-gradient") throw new Error("expected linear-gradient");
    expect(appearance.stops.map((s) => s.colour)).toEqual(["#111111", "#222222"]);
    expect(appearance.direction).toBe(90);
  });

  it("Radial gradient shows centre X/Y fields instead of direction, and they write through", () => {
    const store = new EditorStore();
    render(<BoardAppearancePanel store={store} />);
    fireEvent.click(screen.getByRole("button", { name: "Radial" }));

    expect(screen.queryByLabelText("Direction (°)")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Centre X %"), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("Centre Y %"), { target: { value: "20" } });

    const appearance = store.getState().board.appearance;
    if (appearance.type !== "radial-gradient") throw new Error("expected radial-gradient");
    expect(appearance.centre).toEqual({ x: 10, y: 20 });
  });

  it("Painted shows a preset dropdown with the paint preset list, and switching presets writes through", () => {
    const store = new EditorStore();
    render(<BoardAppearancePanel store={store} />);
    fireEvent.click(screen.getByRole("button", { name: "Painted" }));

    expect(screen.getByRole("option", { name: "Sage" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Colour preset"), { target: { value: "slate" } });

    expect(store.getState().board.appearance).toEqual({ type: "painted-wood", presetId: "slate" });
  });

  it("switching Wood presets writes through", () => {
    const store = new EditorStore();
    render(<BoardAppearancePanel store={store} />);
    fireEvent.click(screen.getByRole("button", { name: "Wood" }));

    fireEvent.change(screen.getByLabelText("Colour preset"), { target: { value: "ebony" } });

    expect(store.getState().board.appearance).toEqual({ type: "wood-texture", presetId: "ebony" });
  });

  it("selecting no file on the file input is a no-op", () => {
    const store = new EditorStore();
    render(<BoardAppearancePanel store={store} />);
    fireEvent.click(screen.getByRole("button", { name: "Custom" }));
    const before = store.getState().board.appearance;

    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [] } });

    expect(store.getState().board.appearance).toEqual(before);
  });

  it("uploading a file reads it as a data URL, stores it, and shows a preview image", async () => {
    // jsdom's real FileReader.readAsDataURL rejects the Node-Blob-swapped File from
    // setup.ts (same class of jsdom/Node-Blob mismatch as rasterExport's
    // URL.createObjectURL) — mock FileReader itself, same spirit as mocking Image
    // elsewhere for the same underlying reason.
    class MockFileReader {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      result: string | null = null;
      readAsDataURL() {
        this.result = "data:image/png;base64,ZmFrZQ==";
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal("FileReader", MockFileReader);

    const store = new EditorStore();
    render(<BoardAppearancePanel store={store} />);
    fireEvent.click(screen.getByRole("button", { name: "Custom" }));

    const file = new File(["fake-image-bytes"], "board.png", { type: "image/png" });
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } });

    await screen.findByAltText("Board texture preview");
    const appearance = store.getState().board.appearance;
    if (appearance.type !== "custom-texture") throw new Error("expected custom-texture");
    vi.unstubAllGlobals();
    expect(appearance.imageDataUrl.startsWith("data:")).toBe(true);
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
