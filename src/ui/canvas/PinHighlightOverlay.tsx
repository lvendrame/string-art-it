import { allPinsWithMirrors, type PinLayer } from "../../application/document";

interface Props {
  pinLayers: PinLayer[];
  lastPinId: string | null;
  threadCandidateId: string | null;
  usedPinIds?: string[];
}

// docs/specs/12-thread-editor.md §Pin Highlight States — Normal/Candidate/Active-Origin,
// plus a fourth, app-specific "already used in this draft" state: every pin already
// confirmed into the current insertion (besides the origin, which keeps its own ring)
// renders muted so the user can see the whole in-progress path's pins at a glance.
// The Candidate highlight applies even with no active draft (lastPinId null): "Nearest
// pin is highlighted before drawing starts" is its own spec scenario, not only a
// mid-draw behavior.
export function PinHighlightOverlay({ pinLayers, lastPinId, threadCandidateId, usedPinIds = [] }: Props) {
  return (
    <>
      {pinLayers.flatMap((l) =>
        l.pinPaths.flatMap((p) =>
          allPinsWithMirrors(p).map((pin) => {
            const isOrigin = pin.id === lastPinId;
            const isCandidate = pin.id === threadCandidateId && !isOrigin;
            const isUsed = !isOrigin && !isCandidate && usedPinIds.includes(pin.id);
            if (!isOrigin && !isCandidate && !isUsed) return null;
            if (isUsed) {
              return <circle key={pin.id} cx={pin.x} cy={pin.y} r={0.16} fill="var(--accent)" fillOpacity={0.5} data-testid="pin-used-in-thread" />;
            }
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
