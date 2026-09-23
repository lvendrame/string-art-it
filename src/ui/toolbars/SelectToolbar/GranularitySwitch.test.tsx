import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EditorStore } from "@application/document";
import { GranularitySwitch } from "./GranularitySwitch";

describe("GranularitySwitch", () => {
  it("clicking the switch track toggles the store's granularity", () => {
    const store = new EditorStore();
    render(<GranularitySwitch store={store} granularity="path" label={(g) => g} />);

    fireEvent.click(screen.getByRole("switch"));
    expect(store.getState().selectGranularity).toBe("pins");
  });
});
