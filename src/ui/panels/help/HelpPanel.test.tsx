import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HelpPanel } from "./HelpPanel";

describe("HelpPanel", () => {
  it("defaults to the tab matching the current mode", () => {
    render(<HelpPanel currentMode="pin" onClose={() => {}} />);
    expect(screen.getByRole("tab", { name: /Pin/ })).toHaveAttribute("aria-selected", "true");
  });

  it("defaults to Edit when the mode is select", () => {
    render(<HelpPanel currentMode="select" onClose={() => {}} />);
    expect(screen.getByRole("tab", { name: /Edit/ })).toHaveAttribute("aria-selected", "true");
  });

  it("defaults to Thread when the mode is thread", () => {
    render(<HelpPanel currentMode="thread" onClose={() => {}} />);
    expect(screen.getByRole("tab", { name: /Thread/ })).toHaveAttribute("aria-selected", "true");
  });

  it("switching tabs swaps the visible content", () => {
    render(<HelpPanel currentMode="select" onClose={() => {}} />);
    expect(screen.getByText(/Press-drag-release to translate/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /Thread/ }));
    expect(screen.queryByText(/Press-drag-release to translate/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Click a pin to start or extend a Thread Path/i)).toBeInTheDocument();
  });

  it("close button invokes onClose", () => {
    const onClose = vi.fn();
    render(<HelpPanel currentMode="select" onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("renders all seven tabs", () => {
    render(<HelpPanel currentMode="select" onClose={() => {}} />);
    ["Edit", "Pin", "Thread", "Pan", "Play", "Layers", "Keyboard & Mouse"].forEach((label) => {
      expect(screen.getByRole("tab", { name: new RegExp(label) })).toBeInTheDocument();
    });
  });
});
