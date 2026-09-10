import type { PinLayer } from "../../application/document";
import { PinPathVisual } from "./PinPathVisual";

export function PinLayersView({ pinLayers, selectedPathId }: { pinLayers: PinLayer[]; selectedPathId: string | null }) {
  return (
    <>
      {pinLayers.flatMap((l) =>
        l.visible ? l.pinPaths.map((p) => <PinPathVisual key={p.id} pinPath={p} selected={p.id === selectedPathId} />) : [],
      )}
    </>
  );
}
