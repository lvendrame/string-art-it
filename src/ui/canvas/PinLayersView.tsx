import type { PinLayer } from "../../application/document";
import { PinPathVisual } from "./PinPathVisual";

export function PinLayersView({ pinLayers, selectedPathIds }: { pinLayers: PinLayer[]; selectedPathIds: string[] }) {
  return (
    <>
      {pinLayers.flatMap((l) =>
        l.visible ? l.pinPaths.map((p) => <PinPathVisual key={p.id} pinPath={p} selected={selectedPathIds.includes(p.id)} />) : [],
      )}
    </>
  );
}
