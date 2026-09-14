import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EditorStore } from "../../application/document";
import { BoardSetup } from "./BoardSetup";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("BoardSetup", () => {
  it("shows only the relevant dimension field per shape (docs/specs/03)", () => {
    const store = new EditorStore();
    render(<BoardSetup store={store} onContinue={() => {}} />);

    expect(screen.getByLabelText(/Diameter/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Width/)).not.toBeInTheDocument();
  });

  it("selecting Rectangle swaps in Width/Height fields", () => {
    const store = new EditorStore();
    render(<BoardSetup store={store} onContinue={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));

    expect(screen.getByLabelText(/Width/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Height/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Diameter/)).not.toBeInTheDocument();
  });

  it("selecting Triangle requires a sub-type choice before dimension fields for that type appear", () => {
    const store = new EditorStore();
    render(<BoardSetup store={store} onContinue={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: "Triangle" }));
    expect(screen.getByRole("button", { name: "Equilateral" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Right-angled" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Right-angled" }));
    expect(screen.getByLabelText(/Base/)).toBeInTheDocument();
    expect(screen.getByText(/Hypotenuse:/)).toBeInTheDocument();
  });

  it("continue button invokes onContinue", () => {
    const store = new EditorStore();
    const onContinue = vi.fn();
    render(<BoardSetup store={store} onContinue={onContinue} />);

    fireEvent.click(screen.getByRole("button", { name: "Continue to Editor" }));
    expect(onContinue).toHaveBeenCalled();
  });

  it("renders one template card per entry in the manifest (docs/specs/26)", () => {
    const store = new EditorStore();
    render(<BoardSetup store={store} onContinue={() => {}} />);

    for (const name of ["Spiral", "Comet", "Flower", "Lotus", "Sun", "Star of David", "Spirals", "Assymetry", "Polygon"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
  });

  it("selecting a template fetches its file, replaces the document, and calls onContinue, skipping the rest of the wizard", async () => {
    const fixture = JSON.parse(
      readFileSync(path.join(process.cwd(), "public/board-templates/spiral.json"), "utf-8"),
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        expect(url).toBe("/board-templates/spiral.json");
        return { ok: true, json: async () => fixture } as Response;
      }),
    );

    const store = new EditorStore();
    const onContinue = vi.fn();
    render(<BoardSetup store={store} onContinue={onContinue} />);

    fireEvent.click(screen.getByRole("button", { name: "Spiral" }));

    await waitFor(() => expect(onContinue).toHaveBeenCalled());
    const state = store.getState();
    expect(state.board.shape).toBe(fixture.board.shape);
    expect(state.pinLayers[0].pinPaths.length).toBeGreaterThan(0);
    expect(state.threadLayers[0].threadPaths.length).toBeGreaterThan(0);
  });

  it("shows a translated error alert when a template fails to load", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 404 }) as Response));
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    const store = new EditorStore();
    const onContinue = vi.fn();
    render(<BoardSetup store={store} onContinue={onContinue} />);

    fireEvent.click(screen.getByRole("button", { name: "Spiral" }));

    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
    expect(onContinue).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
