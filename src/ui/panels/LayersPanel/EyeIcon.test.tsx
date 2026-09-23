import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EyeIcon } from "./EyeIcon";

describe("EyeIcon", () => {
  it("renders an svg for both open and closed states", () => {
    const { container: openContainer } = render(<EyeIcon open={true} />);
    expect(openContainer.querySelector("svg")).toBeInTheDocument();

    const { container: closedContainer } = render(<EyeIcon open={false} />);
    expect(closedContainer.querySelector("svg")).toBeInTheDocument();
  });
});
