import { Piece } from "./Piece";
import type { HexCoord } from "./Piece";
import type { Board } from "./Board";
import { canSlide } from "./utils";

/**
 * Beetle:
 * - Moves exactly 1 hex in any direction.
 * - If on the ground and target cell is empty → must satisfy sliding rules.
 * - Can climb onto an occupied hex (stacking). When on top, it may step to
 *   any adjacent hex (empty or occupied) without corridor checks.
 */
export class Beetle extends Piece {
  readonly type = "beetle";
  legalMoves(board: Board): HexCoord[] {
    const neighbors = board.neighbors(this.position);
    const moves: HexCoord[] = [];

    for (const c of neighbors) {
      const destEmpty = board.isEmpty(c);
      const onTop = board.stackHeight(this.position) > 0;

      if (destEmpty) {
        if (onTop) {
          // already on a stack, can drop down or slide—no corridor restriction
          if (board.isHiveIntact(this.position)) moves.push(c);
        } else {
          // on ground and target empty → must slide
          if (canSlide(board, this.position, c)) moves.push(c);
        }
      } else {
        // occupied destination → beetle can climb up
        if (board.isHiveIntact(this.position)) moves.push(c);
      }
    }
    return moves;
  }
}