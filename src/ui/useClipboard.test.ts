import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { EditorStore, parseClipboard } from "@application/document";
import { useClipboard } from "./useClipboard";

function dispatchClipboard(type: "copy" | "paste", target: EventTarget, text = "") {
  const data = new Map<string, string>([["text/plain", text]]);
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "clipboardData", {
    value: { getData: (mime: string) => data.get(mime) ?? "", setData: (mime: string, value: string) => data.set(mime, value) },
  });
  target.dispatchEvent(event);
  return { event, written: data.get("text/plain") ?? "" };
}

function seededStore() {
  const store = new EditorStore();
  const layerId = store.getState().pinLayers[0].id;
  const pathId = store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } })!;
  store.setMode("select");
  store.select({ type: "pinPaths", refs: [{ layerId, pathId }] });
  return store;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("useClipboard", () => {
  it("Copy writes the app clipboard envelope for the selection", () => {
    const store = seededStore();
    renderHook(() => useClipboard(store));
    const { event, written } = dispatchClipboard("copy", document.body);
    expect(event.defaultPrevented).toBe(true);
    expect(parseClipboard(written)?.pinPaths).toHaveLength(1);
  });

  it("Copy with nothing selected leaves the native copy alone", () => {
    const store = seededStore();
    store.select({ type: "none" });
    renderHook(() => useClipboard(store));
    expect(dispatchClipboard("copy", document.body).event.defaultPrevented).toBe(false);
  });

  it("Paste of app content adds it to the document", () => {
    const store = seededStore();
    renderHook(() => useClipboard(store));
    const { written } = dispatchClipboard("copy", document.body);
    const { event } = dispatchClipboard("paste", document.body, written);
    expect(event.defaultPrevented).toBe(true);
    expect(store.getState().pinLayers[0].pinPaths).toHaveLength(2);
  });

  it("Paste of foreign text is ignored", () => {
    const store = seededStore();
    renderHook(() => useClipboard(store));
    const { event } = dispatchClipboard("paste", document.body, "just some text");
    expect(event.defaultPrevented).toBe(false);
    expect(store.getState().pinLayers[0].pinPaths).toHaveLength(1);
  });

  it("copy/paste inside a text field is left to the browser", () => {
    const store = seededStore();
    renderHook(() => useClipboard(store));
    const input = document.createElement("input");
    document.body.appendChild(input);
    const { written } = dispatchClipboard("copy", document.body);
    expect(dispatchClipboard("copy", input).event.defaultPrevented).toBe(false);
    expect(dispatchClipboard("paste", input, written).event.defaultPrevented).toBe(false);
    expect(store.getState().pinLayers[0].pinPaths).toHaveLength(1);
  });
});
