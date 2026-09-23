import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EditorStore } from "@application/document";
import { ThreadDraftLayer } from "./ThreadDraftLayer";

function setup() {
  const store = new EditorStore();
  const layerId = store.getState().pinLayers[0].id;
  store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 5 });
  const pins = store.getState().pinLayers[0].pinPaths[0].pins;
  store.setMode("thread");
  return { store, pins };
}

describe("ThreadDraftLayer", () => {
  it("renders nothing when there is no thread draft", () => {
    const { store } = setup();
    const { container } = render(
      <svg>
        <ThreadDraftLayer state={store.getState()} threadDraft={null} cursorDoc={null} threadCandidateId={null} />
      </svg>,
    );
    expect(container.querySelectorAll("*")).toHaveLength(1); // just the <svg>
  });

  it("with a single-pin draft, does not render the confirmed-segments path", () => {
    const { store, pins } = setup();
    store.extendThreadDraft(pins[0].id);
    const { container } = render(
      <svg>
        <ThreadDraftLayer state={store.getState()} threadDraft={store.getState().threadDraft} cursorDoc={null} threadCandidateId={null} />
      </svg>,
    );
    expect(container.querySelector("[data-testid='thread-path']")).toBeNull();
  });

  it("with a 2+ pin draft, renders the confirmed-segments path", () => {
    const { store, pins } = setup();
    store.extendThreadDraft(pins[0].id);
    store.extendThreadDraft(pins[1].id);
    const { container } = render(
      <svg>
        <ThreadDraftLayer state={store.getState()} threadDraft={store.getState().threadDraft} cursorDoc={null} threadCandidateId={null} />
      </svg>,
    );
    expect(container.querySelector("[data-testid='thread-path']")).not.toBeNull();
  });
});
