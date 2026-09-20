import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "../App";

describe("App — New project returns to board setup", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("clicking Continue enters the editor, then New takes the user back to board setup", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Continue to Editor" }));
    expect(screen.getByRole("button", { name: "New" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "New" }));

    expect(screen.getByRole("button", { name: "Continue to Editor" })).toBeInTheDocument();
  });

  it("Continue to Editor always lands on the Pin tab, even if a prior session left another mode active", () => {
    render(<App />);
    window.stringArtItDebug!.setMode("thread");

    fireEvent.click(screen.getByRole("button", { name: "Continue to Editor" }));

    expect(screen.getByRole("tab", { name: "Pin" })).toHaveAttribute("aria-selected", "true");
  });
});
