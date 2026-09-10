import type { Board } from "../../application/document";
import { BoardFillDefs, boardFillPaint } from "../../infrastructure/rendering/boardFill";

export function BoardLayer({ board, pathD }: { board: Board; pathD: string }) {
  return (
    <>
      <defs>
        <BoardFillDefs id="board-fill" appearance={board.appearance} />
      </defs>
      <path d={pathD} fill={boardFillPaint("board-fill", board.appearance)} stroke="#00000055" strokeWidth={0.1} data-testid="board-outline" />
    </>
  );
}
