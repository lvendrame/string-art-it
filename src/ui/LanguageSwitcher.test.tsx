import { createRef } from "react";
import { act, render, screen, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import i18n from "@i18n";
import { LanguageSwitcher, type LanguageSwitcherHandle } from "./LanguageSwitcher";

describe("LanguageSwitcher", () => {
  afterEach(async () => {
    await i18n.changeLanguage("en");
    window.localStorage.clear();
  });

  it("renders a trigger showing the current language", () => {
    render(<LanguageSwitcher />);
    expect(screen.getByRole("button", { name: "Change language: English" })).toHaveTextContent("English");
  });

  it("opens to list every supported language", () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByRole("button", { name: "Change language: English" }));

    expect(screen.getByRole("option", { name: "English" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Português (BR)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Español" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Français" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Deutsch" })).toBeInTheDocument();
  });

  it("selecting a language changes i18n.language and persists it", () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByRole("button", { name: "Change language: English" }));
    fireEvent.click(screen.getByRole("option", { name: "Português (BR)" }));

    expect(i18n.language).toBe("pt-BR");
    expect(window.localStorage.getItem("stringartit:language:v1")).toBe("pt-BR");
  });

  it("closes the menu on Escape", () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByRole("button", { name: "Change language: English" }));
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
    fireEvent.click(screen.getByRole("button", { name: "Change language: English" }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByTestId("outside"));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("ArrowDown/ArrowUp move focus between options, wrapping at each end", () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByRole("button", { name: "Change language: English" }));

    const listbox = screen.getByRole("listbox");
    const options = screen.getAllByRole("option");

    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    expect(options[0]).toHaveFocus();

    options[0].focus();
    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    expect(options[1]).toHaveFocus();

    fireEvent.keyDown(listbox, { key: "ArrowUp" });
    expect(options[0]).toHaveFocus();

    fireEvent.keyDown(listbox, { key: "ArrowUp" });
    expect(options[options.length - 1]).toHaveFocus();
  });

  it("ignores keys other than ArrowUp/ArrowDown in the menu", () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByRole("button", { name: "Change language: English" }));

    const listbox = screen.getByRole("listbox");
    const options = screen.getAllByRole("option");
    options[0].focus();

    fireEvent.keyDown(listbox, { key: "Tab" });
    expect(options[0]).toHaveFocus();
  });

  it("ArrowUp with no option focused wraps to the last option", () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByRole("button", { name: "Change language: English" }));

    const listbox = screen.getByRole("listbox");
    const options = screen.getAllByRole("option");
    (document.activeElement as HTMLElement | null)?.blur();

    fireEvent.keyDown(listbox, { key: "ArrowUp" });
    expect(options[options.length - 1]).toHaveFocus();
  });

  it("openOrCycle opens the dropdown when closed, then cycles to the next language when open", async () => {
    const ref = createRef<LanguageSwitcherHandle>();
    render(<LanguageSwitcher ref={ref} />);

    act(() => ref.current!.openOrCycle());
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    act(() => ref.current!.openOrCycle());
    expect(i18n.language).toBe("pt-BR"); // next after English in SUPPORTED_LANGUAGES order
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
