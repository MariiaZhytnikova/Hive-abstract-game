import type { HexCoord, Piece } from "../models/Piece";
import type { Board } from "../models/Board";

/** cells adjacent to both `a` and `b` */
function sharedNeighbors(board: Board, a: HexCoord, b: HexCoord): HexCoord[] {
  const an = board.neighbors(a);
  const bn = board.neighbors(b);
  return an.filter(n => bn.some(m => m.q === n.q && m.r === n.r));
}

/**
 * Returns true if a piece can slide from `from` to `to` on the board.
 * - The `to` hex must be empty
 * - Must not break the hive (assume board.isHiveIntact(from) exists)
 * - Must be adjacent to at least one piece (sliding rule)
 */
export function canSlide(board: Board, from: HexCoord, to: HexCoord): boolean {
  if (!board.isEmpty(to)) return false;

  // check that target has at least one neighbor
  const neighbors = board.neighbors(to);
  const hasNeighbor = neighbors.some(n => !board.isEmpty(n));
  if (!hasNeighbor) return false;

  // corridor rule: the two cells adjacent to BOTH from & to
  const shared = sharedNeighbors(board, from, to);
  const blocked = shared.length === 2 &&
                  shared.every(n => !board.isEmpty(n));
  if (blocked) return false;

  return true;
}

export function hasAvailableMoves(
  board: Board,
  player: "White" | "Black",
  bankPieces: { color: string; type: string }[]
): boolean {

  // First move — always legal
  if (board.pieces.length === 0) return true;

  // Second move — must be adjacent to the first piece
  if (board.pieces.length === 1) return true;

  // Placement from bank
  const playerBank = bankPieces.filter(p => p.color === player);
  if (playerBank.length > 0) {
    const coords = board.allCoordsAroundHive();

    for (const coord of coords) {
      if (!board.isEmpty(coord)) continue;

      const neighbors = board.neighbors(coord)
        .map(n => board.topPieceAt(board, n))
        .filter((p): p is Piece => p != null);

      if (neighbors.length === 0) continue;

      const touchesOwn = neighbors.some(n => n.owner === player);
      const touchesOpponent = neighbors.some(n => n.owner !== player);

      if (touchesOwn && !touchesOpponent) return true;
    }
  }

  // Movement check
  for (const piece of board.pieces) {
    if (piece.owner !== player) continue;
    if (!board.isTopPiece(piece, board)) continue;

    if (piece.legalMoves(board).length > 0) return true;
  }

  // 🚫 No legal moves found
  return false;
}
