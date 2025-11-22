import { Piece } from "./Piece";
import type { HexCoord } from "./Piece";
import type { Board } from "./Board";
import { canSlide } from '../game/rules';

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
      const onTop = board.stackHeight(this.position) > 1; // >1 means beetle is on top

      if (destEmpty) {
        if (onTop) {
          // beetle on top can drop down or slide, no corridor check here
          if (board.isHiveIntact(this, c) && canSlide(board, this.position, c)) moves.push(c);
        } else {
          // on ground, must slide to empty spot
          if (board.isHiveIntact(this, c) && canSlide(board, this.position, c)) moves.push(c);
        }
      } else {
        // occupied spot means beetle can climb up
        if (board.isHiveIntact(this, c)) moves.push(c);
      }
    }

    return moves;
  }
}