import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "../App";
import { createDefaultBoard } from "../application/document";
import { zoomToPercent } from "../domain/transforms";
import { fitViewportForBoard } from "./canvas/boardViewport";

describe("App — entering the editor fits the viewport to the board", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("Continue to Editor shows the default board at its fitted zoom, not a tiny/arbitrary placeholder", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Continue to Editor" }));

    const expectedPercent = Math.round(zoomToPercent(fitViewportForBoard(createDefaultBoard()).zoom));
    expect(screen.getByText(`${expectedPercent}%`)).toBeInTheDocument();
  });
});
