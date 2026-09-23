import type { EditorState, ThreadDraft } from "@application/document";
import type { Point } from "@domain/paths";
import { ThreadPathVisual } from "@ui/canvas/ThreadPathVisual";
import { DraftPreviewLine } from "./DraftPreviewLine";

interface Props {
  state: EditorState;
  threadDraft: ThreadDraft;
  cursorDoc: Point | null;
  threadCandidateId: string | null;
}

// Visualizes the in-progress thread draft's already-confirmed segments and the live
// preview to the candidate pin. Pin highlight states live in PinHighlightOverlay,
// rendered by Canvas.tsx independently of whether a draft exists (docs/specs/12-
// thread-editor.md: the Candidate highlight applies before a draft starts too).
export function ThreadDraftLayer({ state, threadDraft, cursorDoc, threadCandidateId }: Props) {
  if (!threadDraft) return null;
  const lastPinId = threadDraft.pinIds[threadDraft.pinIds.length - 1];

  return (
    <>
      {threadDraft.pinIds.length >= 2 && (
        <ThreadPathVisual
          threadPath={{
            id: "draft",
            colours: state.threadDefaults.colours,
            width: state.threadDefaults.width,
            twistPitch: state.threadDefaults.twistPitch,
            pinIds: threadDraft.pinIds,
          }}
          pinLayers={state.pinLayers}
        />
      )}

      <DraftPreviewLine
        pinLayers={state.pinLayers}
        lastPinId={lastPinId}
        cursorDoc={cursorDoc}
        threadCandidateId={threadCandidateId}
        colour={state.threadDefaults.colours[0]}
        width={state.threadDefaults.width}
      />
    </>
  );
}
