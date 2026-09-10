import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EditorStore } from "../../application/document";
import { FileMenu } from "./FileMenu";

describe("FileMenu", () => {
  it("New resets the document to an empty project", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 5 });
    render(<FileMenu store={store} />);

    fireEvent.click(screen.getByRole("button", { name: "New" }));

    expect(store.getState().pinLayers[0].pinPaths).toHaveLength(0);
  });

  it("Save triggers a file download with the correct filename and MIME type", () => {
    const store = new EditorStore();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    let downloadedName = "";
    let downloadedType = "";
    const originalCreate = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = originalCreate(tag);
      if (tag === "a") {
        Object.defineProperty(el, "download", {
          set: (v) => { downloadedName = v; },
          get: () => downloadedName,
        });
      }
      return el;
    });
    const createObjectURLSpy = vi.spyOn(URL, "createObjectURL").mockImplementation((obj) => {
      downloadedType = (obj as Blob).type;
      return "blob:mock";
    });

    render(<FileMenu store={store} />);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(downloadedName).toBe("string-art-project.json");
    expect(downloadedType).toBe("application/json");
    expect(clickSpy).toHaveBeenCalled();

    clickSpy.mockRestore();
    createObjectURLSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it("Open loads a valid project file", async () => {
    const seed = new EditorStore();
    seed.addPinPath(seed.getState().pinLayers[0].id, { type: "circle", center: { x: 0, y: 0 }, radius: 5 });
    const file = new File([JSON.stringify(seed.toProjectFile())], "project.json", { type: "application/json" });

    const store = new EditorStore();
    render(<FileMenu store={store} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await vi.waitFor(() => expect(store.getState().pinLayers[0].pinPaths).toHaveLength(1));
  });

  it("Open shows an error for an invalid file instead of crashing", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const badFile = new File(["not json"], "bad.json", { type: "application/json" });
    const store = new EditorStore();
    render(<FileMenu store={store} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [badFile] } });

    await vi.waitFor(() => expect(alertSpy).toHaveBeenCalled());
    alertSpy.mockRestore();
  });
});
