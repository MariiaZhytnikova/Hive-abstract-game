import { Game } from '../game/Game';
import type { Player } from "../models/Piece";
import { findBestMove } from "./minimaxAi";
import { applyMove } from "./minimaxAi";


export class AIController {
	private game: Game;

	constructor(game: Game) {
		this.game = game;
	}

	isEnabled = false;
	aiPlays: Player = "Black";

	enable() {
		this.isEnabled = true;
		console.log("AI enabled!");
	}
	
	disable() {
		this.isEnabled = false;
		console.log("AI disabled!");
	}

	toggle() {
		this.isEnabled = !this.isEnabled;
		return this.isEnabled;
	}

	makeMoveIfNeeded() {
		if (this.game.isGameOver) return;
		if (!this.isEnabled) return;
		if (!this.game.currentPlayer) return;
		if (!this.game.aiPlays) return;

		console.log("🤖 AI thinking...");

		const move = findBestMove(this.game, this.aiPlays, 2); // depth=2

		if (!move) {
			console.log("AI: no move found");
			return;
		}

		console.log("🤖 AI selected move:", move);

		applyMove(this.game, move);

		if (this.onMoveComplete) {
			this.onMoveComplete();  // This triggers nextTurnOrSkip() in main
		}
	}
	onMoveComplete: (() => void) | null = null;
}