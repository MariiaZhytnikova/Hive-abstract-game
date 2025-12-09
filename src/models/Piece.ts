import type { Board } from "./Board";

export type HexCoord = { q: number; r: number };
export type Player = "White" | "Black";

export abstract class Piece {
  public owner: Player;
  position: HexCoord;
  stackLevel: number = 0;

  constructor(owner: Player, position: HexCoord) {
    this.owner = owner;
    this.position = position;
  }

  /** Return all legal target coordinates from current position */
  abstract legalMoves(board: Board): HexCoord[];
  clone(): Piece {
    const Cls = this.constructor as any;

    const newPiece: Piece = new Cls(
      this.owner,
      { ...this.position }
    );

    // Copy properties that differ across piece types
    newPiece.stackLevel = this.stackLevel;
    newPiece.type = this.type;

    return newPiece;
  }
}

export interface Piece {
  type: string;        // like "bee", "spider"…
  owner: "White" | "Black"; // color of player
  position: HexCoord;  // {q, r}

  
}
