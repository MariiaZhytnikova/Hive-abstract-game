import { Board } from "../models/Board";
import { Piece } from "../models/Piece";
import type { Player } from "../models/Piece";
import type { HexCoord } from "../models/Piece";

/**
 * Game: manages game state and main rules.
 *
 * - board: holds pieces and helper methods
 * - currentPlayer: "White" | "Black"
 * - movesMade: number of moves each player already performed
 * - placePiece(piece, coord): place a piece from the player's hand on the board`
 * - movePiece(piece, coord): move an existing piece on the board
 * - enforces "Queen must be placed by 4th turn" rule
 * - validates moves via piece.legalMoves(board)
 * - determines game over (queen surrounded)
 */

export class Game {
  board: Board;
  currentPlayer: Player;
  turnCount: number;

  constructor() {
    this.board = new Board();
    this.currentPlayer = "White";
    this.turnCount = 1;
  }

  playPiece(piece: Piece, coord: { q: number; r: number }): boolean {
    // validate placement using the same checks as placePiece
    const ok = this.placePiece(piece, coord);
    if (!ok) return false;

    // if placement succeeded, advance the turn
    return true;
  }

  /** Switch to the other player and increment turn */
  nextTurn(): void {
    this.currentPlayer = this.currentPlayer === "White" ? "Black" : "White";
    this.turnCount++;
  }

  /** Check if a piece can legally be placed at a given coordinate 
   * Checks:
   *  - Destination is empty
   *  - If not the very first move, new piece must touch at least one piece
   *  - QueenBee must be placed by each player's 4th turn
  */
private canPlacePiece(piece: Piece, coord: HexCoord): boolean {
  if (!this.board.isEmpty(coord)) return false;

  if (this.board.pieces.length === 0) return true; // первый ход разрешён

  const neighbors = this.board.neighbors(coord);
  const touching = neighbors.some(n => !this.board.isEmpty(n));
  if (!touching) return false;

  // Queen-bee placement
  const playerPieces = this.board.pieces.filter(p => p.owner === piece.owner);
  const hasQueen = playerPieces.some(p => p.constructor.name === "QueenBee");
  if (!hasQueen && playerPieces.length >= 3 && piece.constructor.name !== "QueenBee") {
    return false;
  }

  return true;
}


  /**
   * Place a piece on the board if the move is valid.
   */
  placePiece(piece: Piece, coord: HexCoord): boolean {
    if (piece.owner !== this.currentPlayer) return false; // Only current player can play
    if (!this.canPlacePiece(piece, coord)) return false;

    this.board.addPiece(piece, coord); // Actually add to board
    this.nextTurn();                   // Advance turn
    return true;
  }

  /** Return all legal placements for a piece (without modifying the board) */
  legalPlacements(piece: Piece): HexCoord[] {
    const candidates = this.board.allEmptyHexes(); // You need a method returning all empty hexes
    return candidates.filter(coord => this.canPlacePiece(piece, coord));
  }

  /**
   * Moving pieces that are already on the board.
   * Checks:
   *  - The piece belongs to the current player
   *  - The destination is one of piece.legalMoves(board)
   *  - The hive remains intact after the move
   * Result:
   *  - Remove the piece from its old hex
   *  - Set its position to the new hex
   */
  movePiece(piece: Piece, to: { q: number; r: number }): boolean {
    // must be this player's piece
    if (piece.owner !== this.currentPlayer) return false;

    // check if move legal
    const legal = piece.legalMoves(this.board);
    const allowed = legal.some(c => c.q === to.q && c.r === to.r);
    if (!allowed) return false;

    // try the move and ensure hive stays intact
    const old = { ...piece.position };
    piece.position = to;
    if (!this.board.isHiveIntact(old)) {
      // revert if the hive would break
      piece.position = old;
      return false;
    }

    this.nextTurn();
    return true;
  }

  checkWin(): Player | null {
    const queens = this.board.pieces.filter(p => p.constructor.name === "QueenBee");
    for (const q of queens) {
      const neighbors = this.board.neighbors(q.position);
      const surrounded = neighbors.every(n => !this.board.isEmpty(n));
      if (surrounded) return q.owner === "White" ? "Black" : "White";
    }
    return null;
  }
}
