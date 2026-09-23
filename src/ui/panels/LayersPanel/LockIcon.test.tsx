import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LockIcon } from "./LockIcon";

describe("LockIcon", () => {
  it("renders an svg for both locked and unlocked states", () => {
    const { container: lockedContainer } = render(<LockIcon locked={true} />);
    expect(lockedContainer.querySelector("svg")).toBeInTheDocument();

    const { container: unlockedContainer } = render(<LockIcon locked={false} />);
    expect(unlockedContainer.querySelector("svg")).toBeInTheDocument();
  });
});
