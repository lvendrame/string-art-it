import { render, screen, fireEvent } from "@testing-library/react";
import { Grid3x3 } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { ToggleChip } from "./ToggleChip";

describe("ToggleChip", () => {
  it("renders with the given label and calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<ToggleChip label="Grid on" active={false} onClick={onClick} icon={Grid3x3} />);
    const button = screen.getByRole("button", { name: "Grid on" });
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("applies the active modifier class when active", () => {
    render(<ToggleChip label="Grid on" active={true} onClick={() => {}} icon={Grid3x3} />);
    expect(screen.getByRole("button", { name: "Grid on" })).toHaveClass("btn-active");
  });
});
