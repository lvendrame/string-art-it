import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PrintPortal } from "./PrintPortal";

describe("PrintPortal", () => {
  it("renders its children into a #print-portal element appended to body", () => {
    render(
      <PrintPortal>
        <span data-testid="portal-child">hello</span>
      </PrintPortal>,
    );
    const portalEl = document.getElementById("print-portal");
    expect(portalEl).toBeInTheDocument();
    expect(portalEl?.querySelector('[data-testid="portal-child"]')).toBeInTheDocument();
  });
});
