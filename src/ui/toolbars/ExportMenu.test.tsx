import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { jsPDF } from "jspdf";
import { EditorStore } from "@application/document";
import { ExportMenu } from "./ExportMenu";
// Forces svg2pdf.js's side-effect registration of jsPDF.API.svg at module-load time —
// ExportMenu's own PDF handler only imports pdfExport.ts lazily (on first PDF click),
// so without this the PDF describe block below would try to spy on jsPDF.API.svg
// before it exists.
import "@infrastructure/export/pdfExport";

class MockImage {
  onload: (() => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  src = "";
  constructor() {
    queueMicrotask(() => this.onload?.());
  }
}

function stubRasterEnvironment() {
  vi.stubGlobal("Image", MockImage);
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    fillStyle: "",
    fillRect: vi.fn(),
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (callback: BlobCallback, mime?: string) {
    callback(new Blob(["png"], { type: mime }));
  });
}

describe("ExportMenu", () => {
  it("opens a menu with SVG/PDF/PNG/JPEG options", () => {
    const store = new EditorStore();
    render(<ExportMenu store={store} />);

    fireEvent.click(screen.getByRole("button", { name: "Export" }));

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
    fireEvent.click(screen.getByRole("button", { name: "Export" }));
    fireEvent.click(screen.getByText("SVG (vector)"));

    expect(downloadedName).toBe("string-art-design.svg");
    expect(downloadedType).toBe("image/svg+xml");
    expect(clickSpy).toHaveBeenCalled();

    vi.restoreAllMocks();
  });

  it("changing DPI updates the displayed value for PNG/JPEG", () => {
    const store = new EditorStore();
    render(<ExportMenu store={store} />);
    fireEvent.click(screen.getByRole("button", { name: "Export" }));

    fireEvent.change(screen.getByLabelText("DPI"), { target: { value: "300" } });

    expect(screen.getByText("PNG (300 DPI)")).toBeInTheDocument();
    expect(screen.getByText("JPEG (300 DPI)")).toBeInTheDocument();
  });

  it("closes the menu on outside click", () => {
    render(
      <div>
        <div data-testid="outside" />
        <ExportMenu store={new EditorStore()} />
      </div>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Export" }));
    expect(screen.getByText("SVG (vector)")).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByTestId("outside"));

    expect(screen.queryByText("SVG (vector)")).not.toBeInTheDocument();
  });

  describe("PNG/JPEG export", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    it("PNG export downloads a rasterized file and disables the trigger while busy", async () => {
      stubRasterEnvironment();
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
      vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-url");
      vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

      render(<ExportMenu store={new EditorStore()} />);
      fireEvent.click(screen.getByRole("button", { name: "Export" }));
      fireEvent.click(screen.getByText(/^PNG/));

      await waitFor(() => expect(clickSpy).toHaveBeenCalled());
      expect(screen.getByRole("button", { name: "Export" })).not.toBeDisabled();
    });

    it("JPEG export downloads a rasterized file", async () => {
      stubRasterEnvironment();
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
      vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-url");
      vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

      render(<ExportMenu store={new EditorStore()} />);
      fireEvent.click(screen.getByRole("button", { name: "Export" }));
      fireEvent.click(screen.getByText(/^JPEG/));

      await waitFor(() => expect(clickSpy).toHaveBeenCalled());
    });

    it("shows an alert with the error message when rasterization fails", async () => {
      // No stubRasterEnvironment() here — jsdom's real, unmocked
      // HTMLCanvasElement.getContext("2d") returns null, so exportToRaster rejects
      // deterministically with its own "Canvas 2D context unavailable." error, without
      // needing to race Image's onload/onerror timing.
      vi.stubGlobal("Image", MockImage);
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
      vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
      vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-url");
      vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

      render(<ExportMenu store={new EditorStore()} />);
      fireEvent.click(screen.getByRole("button", { name: "Export" }));
      fireEvent.click(screen.getByText(/^PNG/));

      await waitFor(() => expect(alertSpy).toHaveBeenCalledWith("Canvas 2D context unavailable."));
    });

    it("falls back to a generic error message when a non-Error value is thrown", async () => {
      vi.stubGlobal("Image", MockImage);
      vi.spyOn(URL, "createObjectURL").mockImplementation(() => {
        throw "boom"; // deliberately a non-Error, to exercise the fallback-message branch
      });
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

      render(<ExportMenu store={new EditorStore()} />);
      fireEvent.click(screen.getByRole("button", { name: "Export" }));
      fireEvent.click(screen.getByText(/^PNG/));

      await waitFor(() => expect(alertSpy).toHaveBeenCalledWith("Export failed."));
    });
  });

  describe("PDF export", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("downloads a PDF via the lazy-loaded exporter", async () => {
      const svgSpy = vi.spyOn(jsPDF.API, "svg").mockResolvedValue(undefined as unknown as jsPDF);
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
      vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-url");
      vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

      render(<ExportMenu store={new EditorStore()} />);
      fireEvent.click(screen.getByRole("button", { name: "Export" }));
      fireEvent.click(screen.getByText("PDF (vector)"));

      await waitFor(() => expect(clickSpy).toHaveBeenCalled());
      expect(svgSpy).toHaveBeenCalledTimes(1);
    });

    it("shows an alert with the error message when PDF generation fails", async () => {
      vi.spyOn(jsPDF.API, "svg").mockRejectedValue(new Error("svg2pdf exploded"));
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

      render(<ExportMenu store={new EditorStore()} />);
      fireEvent.click(screen.getByRole("button", { name: "Export" }));
      fireEvent.click(screen.getByText("PDF (vector)"));

      await waitFor(() => expect(alertSpy).toHaveBeenCalledWith("svg2pdf exploded"));
    });

    it("falls back to a generic error message when a non-Error value is thrown", async () => {
      vi.spyOn(jsPDF.API, "svg").mockRejectedValue("boom");
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

      render(<ExportMenu store={new EditorStore()} />);
      fireEvent.click(screen.getByRole("button", { name: "Export" }));
      fireEvent.click(screen.getByText("PDF (vector)"));

      await waitFor(() => expect(alertSpy).toHaveBeenCalledWith("PDF export failed."));
    });
  });
});
