import { findPinById, type EditorState, type TwoPinDraft } from "../../application/document";
import type { Point } from "../../domain/paths";
import { ThreadPathVisual } from "./ThreadPathVisual";

interface Props {
  state: EditorState;
  twoPinDraft: TwoPinDraft;
  cursorDoc: Point | null;
  secondPinCandidateId: string | null;
}

// Visualizes the in-progress Zig-zag/Parabolic draft (docs/specs/35-zigzag-parabolic-
// tools.md): before a second pin is picked, a single dashed preview line (same shape
// as ThreadDraftLayer's); once candidates exist, the FULL computed polyline for
// whichever candidate is currently chosen (live, swapping as the cursor moves).
export function TwoPinDraftLayer({ state, twoPinDraft, cursorDoc, secondPinCandidateId }: Props) {
  if (!twoPinDraft) return null;

  if (twoPinDraft.candidates.length > 0) {
    return (
      <ThreadPathVisual
        threadPath={{
          id: "two-pin-draft",
          colours: state.threadDefaults.colours,
          width: state.threadDefaults.width,
          twistPitch: state.threadDefaults.twistPitch,
          pinIds: twoPinDraft.candidates[twoPinDraft.chosenIndex],
        }}
        pinLayers={state.pinLayers}
      />
    );
  }

  if (!cursorDoc) return null;
  const from = findPinById(state.pinLayers, twoPinDraft.firstPinId);
  const to = secondPinCandidateId ? findPinById(state.pinLayers, secondPinCandidateId) : cursorDoc;
  if (!from || !to) return null;
  return (
    <line
      x1={from.x}
      y1={from.y}
      x2={to.x}
      y2={to.y}
      stroke={state.threadDefaults.colours[0]}
      strokeWidth={state.threadDefaults.width * 0.1}
      strokeDasharray="0.2 0.15"
      data-testid="two-pin-preview"
    />
  );
}
