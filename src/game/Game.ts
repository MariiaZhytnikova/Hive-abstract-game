import { Board } from "../models/Board";
import { Piece } from "../models/Piece";
import type { Player } from "../models/Piece";
import { showError } from '../ui/uiUtils';
import type { BankPiece } from './PieceBank';

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

const pieceBankConfig: Array<{ type: BankPiece["type"]; count: number }> = [
	{ type: "bee", count: 1 },
	{ type: "spider", count: 2 },
	{ type: "beetle", count: 2 },
	{ type: "hopper", count: 3 },
	{ type: "ant", count: 3 },
];

// Simple ID generator for bank pieces
let _bankId = 0;
function bankUid() {
  return `p_${_bankId++}`;
}

export class Game {
	public bank: BankPiece[] = [];
	board: Board;
	currentPlayer: Player | null;
	public validMoves: { q: number; r: number }[] = [];
	turnCount: number;

	constructor() {
		this.board = new Board();
		this.currentPlayer = null;
		this.turnCount = 1;
		this.bank = this.createInitialBank();
	}

	private createInitialBank(): BankPiece[] {
		const result: BankPiece[] = [];
		(["Black", "White"] as const).forEach((color) => {
			pieceBankConfig.forEach(({ type, count }) => {
				for (let i = 0; i < count; i++) {
					result.push({
						id: bankUid(),
						x: 0,
						y: 0,
						type,
						color,
						width: 0,   // will be set by layoutBankPositions()
						height: 0,  // "
					});
				}
			});
		});
    	return result;
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
	placePiece(piece: Piece, coord: { q: number; r: number }): boolean { //when first bug placed climb you cant place anymore pieces
	console.log("placePiece", coord.q, coord.r);
		if (piece.owner !== this.currentPlayer) {
		console.log("not your turn");
		showError("❌ Not your turn!");
		return false;
	}
	
	if (!this.board.isEmpty(coord)) return false;

	// first move
	if (this.board.pieces.length === 0) {
		this.board.addPiece(piece, coord);
		return true;
	}

	//second move
	if (this.board.pieces.length === 1) {
		const neighbors = this.board.neighbors(coord);
		const touching = neighbors.some(n => !this.board.isEmpty(n));
		if (!touching) {
			console.log("Move failed: Hive is not intact");
			showError("❌ Hive is not intact!");
			return false;
		}

		this.board.addPiece(piece, coord);
		return true;
	}

	// all next moves
	const neighbors = this.board.neighbors(coord);
	let touchesOwn = false;

	for (const n of neighbors) {
		const neighborPiece = this.board.topPieceAt(this.board, n); 
		if (!neighborPiece) continue;
		if (neighborPiece.owner === this.currentPlayer) {
			touchesOwn = true;
		} else {
			console.log("Move failed: You can place pieces next to your own, not your opponent’s.");
			showError("❌ Piece must touch your color only!");
			return false;
		}
	}

	if (!touchesOwn) {
		console.log("Move failed: hive is not intact");
		showError("❌ Hive is not intact!");
		return false;
	}

	// check - 4th move- should be BEE
	const samePlayerPieces = this.board.pieces.filter(
		p => p.owner === piece.owner
	);
	const hasQueen = samePlayerPieces.some(p => p.constructor.name === "QueenBee" || p.type === "bee");
	if (!hasQueen && samePlayerPieces.length >= 3 && piece.constructor.name !== "QueenBee" && piece.type !== "bee") {
		console.log("Move failed: Queen should be placed at 4 move");
		showError("❌ The Queen Bee must be placed by turn 4!");
		return false;
	}

	this.board.addPiece(piece, coord);
	this.board.updateStackLevelsAt(coord);

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
		if (!allowed) {
			console.log("Move failed: Not a legal move");
			console.log("Legal moves:", legal);
			console.log("Attempted move to:", to);
		return false;
		}

		// try the move and ensure hive stays intact
		const old = { ...piece.position };
		if (this.board.pieces.length > 2 && !(piece.type === "beetle" && piece.stackLevel === 0)) {
			piece.position = to;
			if (!this.board.isHiveIntact(piece, to)) {
				// revert if the hive would break
				piece.position = old;
				console.log("Move failed: Hive not intact");
				showError("❌ Hive is not intact!");
				return false;
			}
		}

		piece.position = to;
		piece.stackLevel = this.board.updateStackLevelsAt(to);
		return true;
	}

	checkWin(): Player | null {
	this.board.pieces.forEach(p => {
		    console.log(
      p.owner,
      p.type,
      (p as any).name,
      p.constructor?.name,
      p.position
    );
	});

	const queens = this.board.pieces.filter(p => p.type === "bee" || p.constructor.name === "QueenBee");
	for (const q of queens) {
		const neighbors = this.board.neighbors(q.position);
		const surrounded = neighbors.every(n => !this.board.isEmpty(n));
		if (surrounded) return q.owner === "White" ? "Black" : "White";
	}
	return null;
	}

}