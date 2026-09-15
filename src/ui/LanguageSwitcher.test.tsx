import { render, screen, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import i18n from "../i18n";
import { LanguageSwitcher } from "./LanguageSwitcher";

describe("LanguageSwitcher", () => {
  afterEach(async () => {
    await i18n.changeLanguage("en");
    window.localStorage.clear();
  });

  it("renders a trigger showing the current language", () => {
    render(<LanguageSwitcher />);
    expect(screen.getByRole("button", { name: "Change language" })).toHaveTextContent("English");
  });

  it("opens to list every supported language", () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByRole("button", { name: "Change language" }));

    expect(screen.getByRole("option", { name: "English" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Português (BR)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Español" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Français" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Deutsch" })).toBeInTheDocument();
  });

  it("selecting a language changes i18n.language and persists it", () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByRole("button", { name: "Change language" }));
    fireEvent.click(screen.getByRole("option", { name: "Português (BR)" }));

    expect(i18n.language).toBe("pt-BR");
    expect(window.localStorage.getItem("stringartit:language:v1")).toBe("pt-BR");
  });

  it("closes the menu on Escape", () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByRole("button", { name: "Change language" }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("closes the menu on outside click", () => {
    render(
      <div>
        <div data-testid="outside" />
        <LanguageSwitcher />
      </div>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Change language" }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByTestId("outside"));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
