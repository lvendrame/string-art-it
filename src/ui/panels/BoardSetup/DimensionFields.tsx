import type { TFunction } from "i18next";
import type { Board, EditorStore } from "../../../application/document";
import { boardHypotenuse } from "../../../application/document";
import { DimensionField } from "./DimensionField";
import "./DimensionFields.css";

export function DimensionFields({ board, store, t }: { board: Board; store: EditorStore; t: TFunction<"boardSetup"> }) {
  const d = board.dimensions;
  switch (board.shape) {
    case "circle":
      return <DimensionField label={t("fields.diameter")} value={d.diameter ?? 60} onChange={(v) => store.setBoardDimensions({ diameter: v })} />;
    case "oval":
      return (
        <>
          <DimensionField label={t("fields.width")} value={d.width ?? 60} onChange={(v) => store.setBoardDimensions({ width: v })} />
          <DimensionField label={t("fields.height")} value={d.height ?? 40} onChange={(v) => store.setBoardDimensions({ height: v })} />
        </>
      );
    case "rectangle":
      return (
        <>
          <DimensionField label={t("fields.width")} value={d.width ?? 60} onChange={(v) => store.setBoardDimensions({ width: v })} />
          <DimensionField label={t("fields.height")} value={d.height ?? 40} onChange={(v) => store.setBoardDimensions({ height: v })} />
        </>
      );
    case "square":
      return <DimensionField label={t("fields.side")} value={d.side ?? 50} onChange={(v) => store.setBoardDimensions({ side: v })} />;
    case "triangle":
      if (board.triangleType === "right-angled") {
        return (
          <>
            <DimensionField label={t("fields.base")} value={d.base ?? 40} onChange={(v) => store.setBoardDimensions({ base: v })} />
            <DimensionField label={t("fields.height")} value={d.height ?? 30} onChange={(v) => store.setBoardDimensions({ height: v })} />
            <div className="mono board-setup__hypotenuse">{t("hypotenuse", { value: boardHypotenuse(board)?.toFixed(1) })}</div>
          </>
        );
      }
      return <DimensionField label={t("fields.side")} value={d.side ?? 50} onChange={(v) => store.setBoardDimensions({ side: v })} />;
  }
}
