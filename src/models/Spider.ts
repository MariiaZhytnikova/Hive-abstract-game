import { Piece } from "./Piece";
import type { HexCoord } from "./Piece";
import type { Board } from "./Board";
import { canSlide } from '../game/rules';

/**
 * Spider:
 * - Must move exactly 3 hexes.
 * - Path must be along connected ground cells only
 *   (cannot climb or move over gaps).
 * - Each step must obey the sliding (corridor) rule.
 * - Cannot backtrack or revisit the same cell in the same move.
 */
export class Spider extends Piece {
  readonly type = "spider";

  legalMoves(board: Board): HexCoord[] {
    const results: HexCoord[] = [];

    const visited = new Set<string>();
    visited.add(`${this.position.q},${this.position.r}`);

    const dfs = (pos: HexCoord, steps: number) => {
      if (steps === 3) {
        results.push(pos);
        return;
      }

      for (const n of board.neighbors(pos)) {
        const key = `${n.q},${n.r}`;

        if (visited.has(key)) continue;
        if (!board.isEmpty(n)) continue;
        if (!canSlide(board, pos, n)) continue;
        if (!board.isHiveIntact(this, n)) continue;

        visited.add(key);
        dfs(n, steps + 1);
        visited.delete(key);
      }
    };

    dfs(this.position, 0);
    return results;
  }
}