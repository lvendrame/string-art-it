import type { PinLayer } from "../../application/document";

interface Props {
  pinLayers: PinLayer[];
  selectedPinIds: string[];
  hoverPinId?: string | null;
}

// docs/specs/09-selection-and-editing.md Merge tool — outlines every pin accumulated
// so far, so the user can see what's pending before right-clicking to commit, plus a
// candidate ring (same amber used for Thread mode's nearest-pin highlight, see
// PinHighlightOverlay) on the pin the cursor is currently over, so the user can see
// which pin a click will target before committing to it.
export function MergeSelectionOverlay({ pinLayers, selectedPinIds, hoverPinId = null }: Props) {
  if (selectedPinIds.length === 0 && !hoverPinId) return null;
  return (
    <>
      {pinLayers.flatMap((l) =>
        l.pinPaths.flatMap((p) =>
          p.pins
            .filter((pin) => selectedPinIds.includes(pin.id) || pin.id === hoverPinId)
            .map((pin) => {
              const isSelected = selectedPinIds.includes(pin.id);
              const isHover = pin.id === hoverPinId;
              return (
                <g key={pin.id}>
                  {isHover && !isSelected && (
                    <circle cx={pin.x} cy={pin.y} r={0.35} fill="none" stroke="#e8b449" strokeWidth={0.07} data-testid="pin-merge-candidate" />
                  )}
                  {isSelected && (
                    <circle cx={pin.x} cy={pin.y} r={0.35} fill="none" stroke="var(--accent)" strokeWidth={0.08} data-testid="pin-merge-selected" />
                  )}
                </g>
              );
            }),
        ),
      )}
    </>
  );
}
