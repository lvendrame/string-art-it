import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { boardPath, EditorStore, paperDimensionsCm } from "../../../application/document";
import { pathBoundingBoxPoints } from "../../../domain/paths";
import { boundingBoxOf } from "../../../domain/transforms";
import { PrintPage } from "./PrintPage";

describe("PrintPage", () => {
  it("renders a page svg sized to the paper", () => {
    const store = new EditorStore();
    const state = store.getState();
    const path = boardPath(state.board);
    const box = boundingBoxOf(pathBoundingBoxPoints(path));
    const paperSize = paperDimensionsCm(state.printSettings.paper);

    const { container } = render(<PrintPage state={state} path={path} box={box} paperSize={paperSize} effectiveScale={1} />);

    expect(container.querySelector("svg.print-preview-panel__page-svg")).toBeInTheDocument();
  });
});
