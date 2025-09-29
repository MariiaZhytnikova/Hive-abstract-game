import { Piece } from "./Piece";
import type { HexCoord } from "./Piece";
import type { Board } from "./Board";
import { canSlide } from "./utils";


/**
 * Soldier Ant:
 * - May move any number of hexes around the hive perimeter.
 * - Must remain on the ground the entire move.
 * - Every intermediate step must obey the sliding (corridor) rule.
 * - Functionally: explore all reachable empty cells that satisfy sliding.
 */
export class SoldierAnt extends Piece {
  readonly type = "ant";
  legalMoves(board: Board): HexCoord[] {
    const results: HexCoord[] = [];
    const visited = new Set<string>();
    visited.add(`${this.position.q},${this.position.r}`);

    const dfs = (pos: HexCoord) => {
      for (const n of board.neighbors(pos)) {
        const key = `${n.q},${n.r}`;
        if (visited.has(key)) continue;
        if (!board.isEmpty(n)) continue;
        if (!canSlide(board, pos, n)) continue;

        visited.add(key);
        results.push(n);
        dfs(n); // recurse to extend path
        visited.delete(key);
      }
    };

    dfs(this.position);
    return results;
  }
}