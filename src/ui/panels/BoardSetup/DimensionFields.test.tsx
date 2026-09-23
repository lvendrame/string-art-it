import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useTranslation } from "react-i18next";
import { EditorStore } from "../../../application/document";
import { DimensionFields } from "./DimensionFields";

function Harness({ store }: { store: EditorStore }) {
  const { t } = useTranslation("boardSetup");
  return <DimensionFields board={store.getState().board} store={store} t={t} />;
}

describe("DimensionFields", () => {
  it("shows the Diameter field for the default circle board", () => {
    const store = new EditorStore();
    render(<Harness store={store} />);
    expect(screen.getByLabelText(/Diameter/)).toBeInTheDocument();
  });

  it("shows a hypotenuse readout for a right-angled triangle", () => {
    const store = new EditorStore();
    store.setBoardShape("triangle", "right-angled");
    render(<Harness store={store} />);
    expect(screen.getByText(/Hypotenuse:/)).toBeInTheDocument();
  });
});
