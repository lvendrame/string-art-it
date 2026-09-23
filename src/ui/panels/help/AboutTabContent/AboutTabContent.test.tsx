import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AboutTabContent } from "./AboutTabContent";
import pkg from "../../../../../package.json";

describe("AboutTabContent", () => {
  it("shows app name, live version, and author", () => {
    render(<AboutTabContent />);
    expect(screen.getByText("StringArtIt")).toBeInTheDocument();
    expect(screen.getByText(pkg.version)).toBeInTheDocument();
    expect(screen.getByText("Luís Fernando Saquetim Vendrame")).toBeInTheDocument();
  });

  it("offers exactly the four allowed subjects", () => {
    render(<AboutTabContent />);
    const options = screen.getAllByRole("option").filter((o) => (o as HTMLOptionElement).value !== "");
    expect(options.map((o) => (o as HTMLOptionElement).value)).toEqual(["question", "support", "issue", "other"]);
    expect(["Question", "Support", "Issue", "Other"]).toEqual(options.map((o) => o.textContent));
  });

  it("Send is inert until Name, Subject, and Message are all filled", () => {
    render(<AboutTabContent />);
    const send = screen.getByRole("link", { name: /Send/i });
    expect(send).toHaveAttribute("aria-disabled", "true");
    expect(send).toHaveAttribute("href", "#");
  });

  it("Send builds a mailto link addressed to the author with the prefixed subject and the entered fields", () => {
    render(<AboutTabContent />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Ana" } });
    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "support" } });
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Help please" } });

    const send = screen.getByRole("link", { name: /Send/i });
    expect(send).not.toHaveAttribute("aria-disabled", "true");
    const href = send.getAttribute("href") ?? "";
    expect(href.startsWith("mailto:lfsvendrame@gmail.com")).toBe(true);
    const decoded = decodeURIComponent(href);
    expect(decoded).toContain("StringArtIt - Support");
    expect(decoded).toContain("Ana");
    expect(decoded).toContain("Help please");
  });
});
