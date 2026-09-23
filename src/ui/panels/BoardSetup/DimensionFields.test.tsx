import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useTranslation } from "react-i18next";
import { EditorStore } from "@application/document";
import { DimensionFields } from "./DimensionFields";

function Harness({ store, board }: { store: EditorStore; board?: ReturnType<EditorStore["getState"]>["board"] }) {
  const { t } = useTranslation("boardSetup");
  return <DimensionFields board={board ?? store.getState().board} store={store} t={t} />;
}

describe("DimensionFields", () => {
  it("shows the Diameter field for the default circle board", () => {
    const store = new EditorStore();
    render(<Harness store={store} />);
    expect(screen.getByLabelText(/Diameter/)).toBeInTheDocument();
  });

  it("Diameter writes through to the store", () => {
    const store = new EditorStore();
    render(<Harness store={store} />);
    fireEvent.change(screen.getByLabelText(/Diameter/), { target: { value: "80" } });
    expect(store.getState().board.dimensions.diameter).toBe(80);
  });

  it("shows Width/Height fields for an oval board, both writing through", () => {
    const store = new EditorStore();
    store.setBoardShape("oval");
    render(<Harness store={store} />);
    fireEvent.change(screen.getByLabelText(/Width/), { target: { value: "70" } });
    fireEvent.change(screen.getByLabelText(/Height/), { target: { value: "45" } });
    expect(store.getState().board.dimensions).toMatchObject({ width: 70, height: 45 });
  });

  it("shows Width/Height fields for a rectangle board, both writing through", () => {
    const store = new EditorStore();
    store.setBoardShape("rectangle");
    render(<Harness store={store} />);
    fireEvent.change(screen.getByLabelText(/Width/), { target: { value: "65" } });
    fireEvent.change(screen.getByLabelText(/Height/), { target: { value: "35" } });
    expect(store.getState().board.dimensions).toMatchObject({ width: 65, height: 35 });
  });

  it("shows a Side field for a square board, writing through", () => {
    const store = new EditorStore();
    store.setBoardShape("square");
    render(<Harness store={store} />);
    fireEvent.change(screen.getByLabelText(/Side/), { target: { value: "55" } });
    expect(store.getState().board.dimensions.side).toBe(55);
  });

  it("shows a Side field for an equilateral triangle, writing through", () => {
    const store = new EditorStore();
    store.setBoardShape("triangle", "equilateral");
    render(<Harness store={store} />);
    fireEvent.change(screen.getByLabelText(/Side/), { target: { value: "48" } });
    expect(store.getState().board.dimensions.side).toBe(48);
  });

  it("shows a hypotenuse readout for a right-angled triangle, and Base/Height write through", () => {
    const store = new EditorStore();
    store.setBoardShape("triangle", "right-angled");
    render(<Harness store={store} />);
    expect(screen.getByText(/Hypotenuse:/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Base/), { target: { value: "42" } });
    fireEvent.change(screen.getByLabelText(/Height/), { target: { value: "31" } });
    expect(store.getState().board.dimensions).toMatchObject({ base: 42, height: 31 });
  });

  it("falls back to fixed defaults when a dimension field is missing from the board", () => {
    const store = new EditorStore();
    store.setBoardShape("oval");
    const board = { ...store.getState().board, dimensions: {} };
    render(<Harness store={store} board={board} />);

    expect(screen.getByLabelText(/Width/)).toHaveValue(60);
    expect(screen.getByLabelText(/Height/)).toHaveValue(40);
  });

  it("falls back to fixed defaults for every other shape when its dimension is missing", () => {
    const store = new EditorStore();

    store.setBoardShape("circle");
    const circle = render(<Harness store={store} board={{ ...store.getState().board, dimensions: {} }} />);
    expect(screen.getByLabelText(/Diameter/)).toHaveValue(60);
    circle.unmount();

    store.setBoardShape("rectangle");
    const rect = render(<Harness store={store} board={{ ...store.getState().board, dimensions: {} }} />);
    expect(screen.getByLabelText(/Width/)).toHaveValue(60);
    expect(screen.getByLabelText(/Height/)).toHaveValue(40);
    rect.unmount();

    store.setBoardShape("square");
    const square = render(<Harness store={store} board={{ ...store.getState().board, dimensions: {} }} />);
    expect(screen.getByLabelText(/Side/)).toHaveValue(50);
    square.unmount();

    store.setBoardShape("triangle", "right-angled");
    render(<Harness store={store} board={{ ...store.getState().board, dimensions: {} }} />);
    expect(screen.getByLabelText(/Base/)).toHaveValue(40);
    expect(screen.getByLabelText(/Height/)).toHaveValue(30);
  });
});
