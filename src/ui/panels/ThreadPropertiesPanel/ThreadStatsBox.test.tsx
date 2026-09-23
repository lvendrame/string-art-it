import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EditorStore } from "../../../application/document";
import { ThreadStatsBox } from "./ThreadStatsBox";

describe("ThreadStatsBox", () => {
  it("renders segments, thread length, and pins visited", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } });
    const pins = store.getState().pinLayers[0].pinPaths[0].pins;
    const threadLayerId = store.getState().threadLayers[0].id;
    store.extendThreadDraft(pins[0].id);
    store.finishThreadDraftWithSegment(threadLayerId, pins[1].id);
    const thread = store.getState().threadLayers[0].threadPaths[0];

    render(<ThreadStatsBox thread={thread} pinLayers={store.getState().pinLayers} />);

    expect(screen.getByText("Segments").nextSibling).toHaveTextContent("1");
    expect(screen.getByText("Pins visited").nextSibling).toHaveTextContent("2");
  });
});
