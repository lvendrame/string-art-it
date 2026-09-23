import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EditorStore } from "@application/document";
import { ChangeBackgroundPopover } from "./ChangeBackgroundPopover";

describe("ChangeBackgroundPopover", () => {
  it("renders a trigger and keeps the panel hidden until opened", () => {
    const store = new EditorStore();
    render(<ChangeBackgroundPopover store={store} />);

    expect(screen.getByRole("button", { name: "Change background" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens to show the Appearance panel pre-filled from the store", () => {
    const store = new EditorStore();
    render(<ChangeBackgroundPopover store={store} />);
    fireEvent.click(screen.getByRole("button", { name: "Change background" }));

    const appearance = store.getState().board.appearance;
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Appearance")).toBeInTheDocument();
    if (appearance.type === "solid") {
      expect(screen.getByLabelText("Colour")).toHaveValue(appearance.colour);
    }
  });

  it("changing the appearance colour live-applies to the store", () => {
    const store = new EditorStore();
    render(<ChangeBackgroundPopover store={store} />);
    fireEvent.click(screen.getByRole("button", { name: "Change background" }));

    fireEvent.change(screen.getByLabelText("Colour"), { target: { value: "#ff00ff" } });

    const appearance = store.getState().board.appearance;
    expect(appearance.type).toBe("solid");
    expect(appearance.type === "solid" && appearance.colour).toBe("#ff00ff");
  });

  it("changing the appearance type live-applies to the store", () => {
    const store = new EditorStore();
    render(<ChangeBackgroundPopover store={store} />);
    fireEvent.click(screen.getByRole("button", { name: "Change background" }));

    fireEvent.click(screen.getByRole("button", { name: "Radial" }));

    expect(store.getState().board.appearance.type).toBe("radial-gradient");
  });

  it("re-clicking the trigger closes the popover", () => {
    const store = new EditorStore();
    render(<ChangeBackgroundPopover store={store} />);
    const trigger = screen.getByRole("button", { name: "Change background" });

    fireEvent.click(trigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(trigger);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes on Escape", () => {
    const store = new EditorStore();
    render(<ChangeBackgroundPopover store={store} />);
    fireEvent.click(screen.getByRole("button", { name: "Change background" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes on outside click", () => {
    const store = new EditorStore();
    render(
      <div>
        <div data-testid="outside" />
        <ChangeBackgroundPopover store={store} />
      </div>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Change background" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByTestId("outside"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
