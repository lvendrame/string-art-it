import type { PinLayer, ThreadLayer } from "../../application/document";
import { ThreadPathVisual } from "./ThreadPathVisual";

export function ThreadLayersView({ threadLayers, pinLayers }: { threadLayers: ThreadLayer[]; pinLayers: PinLayer[] }) {
  return (
    <>
      {threadLayers.flatMap((l) =>
        l.visible ? l.threadPaths.map((t) => <ThreadPathVisual key={t.id} threadPath={t} pinLayers={pinLayers} />) : [],
      )}
    </>
  );
}
