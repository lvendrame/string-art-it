import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ModeSwitcher } from "./ModeSwitcher";

describe("ModeSwitcher", () => {
  it("shows all four modes and marks the active one", () => {
    render(<ModeSwitcher mode="pin" onChange={() => {}} />);
    expect(screen.getByRole("tab", { name: "Pin" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Select" })).toHaveAttribute("aria-selected", "false");
  });

  it("calls onChange with the clicked mode", () => {
    const onChange = vi.fn();
    render(<ModeSwitcher mode="select" onChange={onChange} />);
    fireEvent.click(screen.getByRole("tab", { name: "Thread" }));
    expect(onChange).toHaveBeenCalledWith("thread");
  });
});
