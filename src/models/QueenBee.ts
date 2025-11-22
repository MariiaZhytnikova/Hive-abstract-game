import { Piece } from "./Piece";
import { canSlide } from '../game/rules';
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
    const currentPos = this.position;
    const neighborHexes = board.neighbors(currentPos);
    const legalMoves: HexCoord[] = [];

    for (const hex of neighborHexes) {
      if (!canSlide(board, currentPos, hex)) continue;

      // simulate move using isHiveIntact
      const hiveIntact = board.isHiveIntact(this, hex);

      if (hiveIntact) {
        legalMoves.push(hex);
      }
    }
    return legalMoves;
  }
}
