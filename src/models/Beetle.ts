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
    const onTop = board.stackHeight(this.position) > 1;

    for (const c of neighbors) {
      if (!board.isHiveIntact(this, c)) continue;

      if (board.isEmpty(c)) {
        if (onTop) {
          // ✅ NO corridor / sliding check
          moves.push(c);
        } else {
          if (canSlide(board, this.position, c)) {
            moves.push(c);
          }
        }
      } else {
        // ✅ Can always climb
        moves.push(c);
      }
    }

    return moves;
  }
}