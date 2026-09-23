import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OverlayPanelHeader } from "./OverlayPanelHeader";

describe("OverlayPanelHeader", () => {
  it("renders the title and calls onClose when the close button is clicked", () => {
    const onClose = vi.fn();
    render(<OverlayPanelHeader title="Statistics" onClose={onClose} />);
    expect(screen.getByText("Statistics")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
