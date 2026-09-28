import { render, screen, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import i18n from "@i18n";
import { EditorStore } from "@application/document";
import { BoardSetup } from "./panels/BoardSetup/BoardSetup";
import { EditorShell } from "./EditorShell";

describe("LanguageSwitcher integration", () => {
  afterEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("switching to Portuguese re-renders Board Setup's text live", async () => {
    const store = new EditorStore();
    render(<BoardSetup store={store} onContinue={() => {}} />);

    expect(screen.getByText("New Board")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Change language: English" }));
    fireEvent.click(screen.getByRole("option", { name: "Português (BR)" }));

    expect(await screen.findByText("Novo Quadro")).toBeInTheDocument();
    expect(screen.queryByText("New Board")).not.toBeInTheDocument();
  });

  it("switching to Portuguese re-renders the Editor Shell top bar live", async () => {
    const store = new EditorStore();
    render(<EditorShell store={store} onNewProject={() => {}} />);

    expect(screen.getByRole("button", { name: /Print/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Change language: English" }));
    fireEvent.click(screen.getByRole("option", { name: "Português (BR)" }));

    expect(await screen.findByRole("button", { name: /Imprimir/ })).toBeInTheDocument();
  });
});
