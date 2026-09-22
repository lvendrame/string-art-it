import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AutosaveDialog } from "./AutosaveDialog";

describe("AutosaveDialog", () => {
  it("calls onRestore when the restore button is clicked", () => {
    const onRestore = vi.fn();
    render(<AutosaveDialog onRestore={onRestore} onDiscard={vi.fn()} />);

    fireEvent.click(screen.getByText(/restore/i));

    expect(onRestore).toHaveBeenCalledOnce();
  });

  it("calls onDiscard when the discard button is clicked", () => {
    const onDiscard = vi.fn();
    render(<AutosaveDialog onRestore={vi.fn()} onDiscard={onDiscard} />);

    fireEvent.click(screen.getByText(/discard/i));

    expect(onDiscard).toHaveBeenCalledOnce();
  });
});
