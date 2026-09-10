import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "../App";
import { EditorStore } from "../application/document";
import { saveAutosave } from "../infrastructure/persistence/autosave";

describe("App autosave banner", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows a restore banner when an autosave exists on mount", () => {
    const seed = new EditorStore();
    seed.addPinPath(seed.getState().pinLayers[0].id, { type: "circle", center: { x: 0, y: 0 }, radius: 5 });
    saveAutosave(seed.toProjectFile());

    render(<App />);

    expect(screen.getByText(/autosaved project was found/)).toBeInTheDocument();
  });

  it("no banner when nothing was autosaved", () => {
    render(<App />);
    expect(screen.queryByText(/autosaved project was found/)).not.toBeInTheDocument();
  });

  it("Discard clears the autosave and hides the banner", () => {
    const seed = new EditorStore();
    saveAutosave(seed.toProjectFile());
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Discard" }));

    expect(screen.queryByText(/autosaved project was found/)).not.toBeInTheDocument();
    expect(window.localStorage.getItem("stringartit:autosave:v1")).toBeNull();
  });
});
