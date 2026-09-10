import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EditorStore } from "../../application/document";
import { ExportMenu } from "./ExportMenu";

describe("ExportMenu", () => {
  it("opens a menu with SVG/PDF/PNG/JPEG options", () => {
    const store = new EditorStore();
    render(<ExportMenu store={store} />);

    fireEvent.click(screen.getByRole("button", { name: "Export ▾" }));

    expect(screen.getByText("SVG (vector)")).toBeInTheDocument();
    expect(screen.getByText("PDF (vector)")).toBeInTheDocument();
    expect(screen.getByText(/^PNG/)).toBeInTheDocument();
    expect(screen.getByText(/^JPEG/)).toBeInTheDocument();
  });

  it("SVG export downloads a .svg file with vector content", () => {
    const store = new EditorStore();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    let downloadedName = "";
    let downloadedType = "";
    const originalCreate = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = originalCreate(tag);
      if (tag === "a") Object.defineProperty(el, "download", { set: (v) => { downloadedName = v; }, get: () => downloadedName });
      return el;
    });
    vi.spyOn(URL, "createObjectURL").mockImplementation((obj) => {
      downloadedType = (obj as Blob).type;
      return "blob:mock";
    });

    render(<ExportMenu store={store} />);
    fireEvent.click(screen.getByRole("button", { name: "Export ▾" }));
    fireEvent.click(screen.getByText("SVG (vector)"));

    expect(downloadedName).toBe("string-art-design.svg");
    expect(downloadedType).toBe("image/svg+xml");
    expect(clickSpy).toHaveBeenCalled();

    vi.restoreAllMocks();
  });

  it("changing DPI updates the displayed value for PNG/JPEG", () => {
    const store = new EditorStore();
    render(<ExportMenu store={store} />);
    fireEvent.click(screen.getByRole("button", { name: "Export ▾" }));

    fireEvent.change(screen.getByLabelText("DPI"), { target: { value: "300" } });

    expect(screen.getByText("PNG (300 DPI)")).toBeInTheDocument();
    expect(screen.getByText("JPEG (300 DPI)")).toBeInTheDocument();
  });
});
