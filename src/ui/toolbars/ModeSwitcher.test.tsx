import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ModeSwitcher } from "./ModeSwitcher";

describe("ModeSwitcher", () => {
  it("shows all six modes and marks the active one", () => {
    render(<ModeSwitcher mode="pin" onChange={() => {}} />);
    expect(screen.getByRole("tab", { name: "Pin" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Edit" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tab", { name: "Thread" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tab", { name: "Generate" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tab", { name: "Pan" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tab", { name: "Play" })).toHaveAttribute("aria-selected", "false");
  });

  it("calls onChange with \"generate\" when the Generate tab is clicked", () => {
    const onChange = vi.fn();
    render(<ModeSwitcher mode="pin" onChange={onChange} />);
    fireEvent.click(screen.getByRole("tab", { name: "Generate" }));
    expect(onChange).toHaveBeenCalledWith("generate");
  });

  it("calls onChange with \"play\" when the Play tab is clicked", () => {
    const onChange = vi.fn();
    render(<ModeSwitcher mode="pin" onChange={onChange} />);
    fireEvent.click(screen.getByRole("tab", { name: "Play" }));
    expect(onChange).toHaveBeenCalledWith("play");
  });

  it("calls onChange with the clicked mode", () => {
    const onChange = vi.fn();
    render(<ModeSwitcher mode="select" onChange={onChange} />);
    fireEvent.click(screen.getByRole("tab", { name: "Thread" }));
    expect(onChange).toHaveBeenCalledWith("thread");
  });
});
