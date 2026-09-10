import { findPinById, type EditorState, type PinLayer, type ThreadDraft } from "../../application/document";
import type { Point } from "../../domain/paths";
import { ThreadPathVisual } from "./ThreadPathVisual";

interface Props {
  state: EditorState;
  threadDraft: ThreadDraft;
  cursorDoc: Point | null;
  threadCandidateId: string | null;
}

// Visualizes the in-progress thread draft: its already-confirmed segments, the live
// preview to the candidate pin, and the pin highlight states (docs/specs/27-pin-
// highlight-states) — one cohesive "what does drawing-in-progress look like" concern.
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

      <PinHighlightOverlay pinLayers={state.pinLayers} lastPinId={lastPinId} threadCandidateId={threadCandidateId} />
    </>
  );
}

function DraftPreviewLine({
  pinLayers,
  lastPinId,
  cursorDoc,
  threadCandidateId,
  colour,
  width,
}: {
  pinLayers: PinLayer[];
  lastPinId: string;
  cursorDoc: Point | null;
  threadCandidateId: string | null;
  colour: string;
  width: number;
}) {
  if (!cursorDoc) return null;
  const from = findPinById(pinLayers, lastPinId);
  const to = threadCandidateId ? findPinById(pinLayers, threadCandidateId) : cursorDoc;
  if (!from || !to) return null;
  return <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={colour} strokeWidth={width * 0.1} strokeDasharray="0.2 0.15" data-testid="thread-preview" />;
}

function PinHighlightOverlay({ pinLayers, lastPinId, threadCandidateId }: { pinLayers: PinLayer[]; lastPinId: string; threadCandidateId: string | null }) {
  return (
    <>
      {pinLayers.flatMap((l) =>
        l.pinPaths.flatMap((p) =>
          p.pins.map((pin) => {
            const isOrigin = pin.id === lastPinId;
            const isCandidate = pin.id === threadCandidateId && !isOrigin;
            if (!isOrigin && !isCandidate) return null;
            return (
              <g key={pin.id} data-testid={isOrigin ? "pin-active-origin" : "pin-candidate"}>
                {isCandidate && <circle cx={pin.x} cy={pin.y} r={0.35} fill="none" stroke="#e8b449" strokeWidth={0.07} />}
                <circle cx={pin.x} cy={pin.y} r={0.16} fill={isOrigin ? "var(--accent)" : "#e8b449"} />
              </g>
            );
          }),
        ),
      )}
    </>
  );
}
