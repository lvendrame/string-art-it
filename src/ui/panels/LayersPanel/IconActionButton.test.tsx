import { render, screen, fireEvent } from "@testing-library/react";
import { Plus } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { IconActionButton } from "./IconActionButton";

describe("IconActionButton", () => {
  it("calls onClick and applies the danger modifier class when danger", () => {
    const onClick = vi.fn();
    render(<IconActionButton icon={Plus} label="Delete" onClick={onClick} danger />);
    const button = screen.getByRole("button", { name: "Delete" });
    expect(button).toHaveClass("layers-panel__action-btn--danger");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
