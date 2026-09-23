import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EditorStore, type TwoPinDraft } from "@application/document";
import { TwoPinDraftLayer } from "./TwoPinDraftLayer";

function seed() {
  const store = new EditorStore();
  const layerId = store.getState().pinLayers[0].id;
  store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 5 });
  const state = store.getState();
  const pins = state.pinLayers[0].pinPaths[0].pins;
  return { state, pins };
}

describe("TwoPinDraftLayer", () => {
  it("renders nothing when there's no draft", () => {
    const { state } = seed();
    const { container } = render(
      <svg>
        <TwoPinDraftLayer state={state} twoPinDraft={null as unknown as TwoPinDraft} cursorDoc={null} secondPinCandidateId={null} />
      </svg>,
    );
    expect(container.querySelector("svg")!.children).toHaveLength(0);
  });

  it("renders the full computed polyline once candidates exist", () => {
    const { state, pins } = seed();
    const draft: TwoPinDraft = { tool: "zigzag", firstPinId: pins[0].id, candidates: [[pins[0].id, pins[1].id, pins[2].id]], chosenIndex: 0 };

    render(
      <svg>
        <TwoPinDraftLayer state={state} twoPinDraft={draft} cursorDoc={null} secondPinCandidateId={null} />
      </svg>,
    );

    expect(screen.getByTestId("thread-path")).toBeInTheDocument();
  });

  it("renders nothing before candidates exist and with no cursor position", () => {
    const { state, pins } = seed();
    const draft: TwoPinDraft = { tool: "zigzag", firstPinId: pins[0].id, candidates: [], chosenIndex: 0 };

    const { container } = render(
      <svg>
        <TwoPinDraftLayer state={state} twoPinDraft={draft} cursorDoc={null} secondPinCandidateId={null} />
      </svg>,
    );

    expect(container.querySelector("svg")!.children).toHaveLength(0);
  });

  it("previews a dashed line from the first pin to the live cursor position", () => {
    const { state, pins } = seed();
    const draft: TwoPinDraft = { tool: "zigzag", firstPinId: pins[0].id, candidates: [], chosenIndex: 0 };

    render(
      <svg>
        <TwoPinDraftLayer state={state} twoPinDraft={draft} cursorDoc={{ x: 3, y: 4 }} secondPinCandidateId={null} />
      </svg>,
    );

    const line = screen.getByTestId("two-pin-preview");
    expect(line).toHaveAttribute("x1", String(pins[0].x));
    expect(line).toHaveAttribute("y1", String(pins[0].y));
    expect(line).toHaveAttribute("x2", "3");
    expect(line).toHaveAttribute("y2", "4");
  });

  it("previews a dashed line from the first pin to the hovered candidate pin, when one is given", () => {
    const { state, pins } = seed();
    const draft: TwoPinDraft = { tool: "zigzag", firstPinId: pins[0].id, candidates: [], chosenIndex: 0 };

    render(
      <svg>
        <TwoPinDraftLayer state={state} twoPinDraft={draft} cursorDoc={{ x: 3, y: 4 }} secondPinCandidateId={pins[1].id} />
      </svg>,
    );

    const line = screen.getByTestId("two-pin-preview");
    expect(line).toHaveAttribute("x2", String(pins[1].x));
    expect(line).toHaveAttribute("y2", String(pins[1].y));
  });

  it("renders nothing if the first pin can't be found", () => {
    const { state } = seed();
    const draft: TwoPinDraft = { tool: "zigzag", firstPinId: "missing-pin", candidates: [], chosenIndex: 0 };

    const { container } = render(
      <svg>
        <TwoPinDraftLayer state={state} twoPinDraft={draft} cursorDoc={{ x: 0, y: 0 }} secondPinCandidateId={null} />
      </svg>,
    );

    expect(container.querySelector("svg")!.children).toHaveLength(0);
  });

  it("renders nothing if the hovered candidate pin can't be found", () => {
    const { state, pins } = seed();
    const draft: TwoPinDraft = { tool: "zigzag", firstPinId: pins[0].id, candidates: [], chosenIndex: 0 };

    const { container } = render(
      <svg>
        <TwoPinDraftLayer state={state} twoPinDraft={draft} cursorDoc={{ x: 0, y: 0 }} secondPinCandidateId="missing-pin" />
      </svg>,
    );

    expect(container.querySelector("svg")!.children).toHaveLength(0);
  });
});
