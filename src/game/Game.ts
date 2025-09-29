import { Board } from "../models/Board";
import { Piece } from "../models/Piece";
import type { Player } from "../models/Piece";

import { showWinnerPopup } from "../popup";

// When you detect a win:
showWinnerPopup("White"); // or showWinnerPopup("Black");



/**
 * Game: manages game state and main rules.
 *
 * - board: holds pieces and helper methods
 * - currentPlayer: "White" | "Black"
 * - movesMade: number of moves each player already performed
 * - placePiece(piece, coord): place a piece from the player's hand on the board
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

  /** Switch to the other player and increment turn */
  nextTurn(): void {
    this.currentPlayer = this.currentPlayer === "White" ? "Black" : "White";
    this.turnCount++;
  }

  /**
   * Place a piece on the board if the move is valid.
   * Checks:
   *  - Destination is empty
   *  - If not the very first move, new piece must touch at least one piece
   *  - QueenBee must be placed by each player's 4th turn
   */
  placePiece(piece: Piece, coord: { q: number; r: number }): boolean {
    // destination must be empty
    console.log("placePiece", coord.q, coord.r);

    if (piece.owner !== this.currentPlayer) return false;
    if (!this.board.isEmpty(coord)) return false;

    if (this.board.pieces.length === 0) {
      this.board.addPiece(piece, coord);
      return true;
    }
  

    if (this.board.pieces.length === 1) {
      // black’s first move cannot touch opponent’s piece
      const neighbors = this.board.neighbors(coord);
      if (neighbors.some(n => !this.board.isEmpty(n))) return false;
    } else if (this.board.pieces.length > 1) {
      // other moves must touch hive
      const neighbors = this.board.neighbors(coord);
      if (!neighbors.some(n => !this.board.isEmpty(n))) return false;
    }

    // queen-bee rule: each player must place queen by their 4th turn
    const samePlayerPieces = this.board.pieces.filter(
      p => p.owner === piece.owner
    );
    const hasQueen = samePlayerPieces.some(p => p.constructor.name === "QueenBee");
    if (!hasQueen && samePlayerPieces.length >= 3 && piece.constructor.name !== "QueenBee") {
      return false;
    }

    // all checks passed: add to board
    this.board.addPiece(piece, coord);
    return true;
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
