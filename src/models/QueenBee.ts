import { Piece } from "./Piece";
import { canSlide } from "./utils";
import type { HexCoord } from "./Piece";
import type { Board } from "./Board";

/**
 * Queen Bee:
 * - Must be played by each player by their 4th turn.
 * - Moves exactly 1 hex in any direction.
 * - Target hex must be empty and obey the sliding (corridor) rule.
 * - Move cannot break the single-hive connectivity.
 */
export class QueenBee extends Piece {
  readonly type = "bee";
  legalMoves(board: Board): HexCoord[] {
    return board.neighbors(this.position)
                .filter(c => canSlide(board, this.position, c));
  }
}