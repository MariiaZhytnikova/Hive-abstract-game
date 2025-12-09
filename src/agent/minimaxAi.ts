import { Game } from "../game/Game";
import { hasAvailableMoves } from "../game/rules";
import { createPiece } from "../models/createPiece";
import type { Player, Piece, HexCoord } from "../models/Piece";
import type { BankPiece } from "../game/PieceBank";

// ============================================================
// TYPES
// ============================================================
const MAX_THINK_TIME_MS = 250; // safe for browser
const MAX_ROOT_MOVES = 6;
let thinkStart = 0;

export type AIMove =
  | {
      kind: "place";
      from: "bank";
      pieceType: BankPiece["type"];
      color: Player;
      target: HexCoord;
    }
  | {
      kind: "move";
      from: "board";
      pieceType: Piece["type"];
      color: Player;
      fromCoord: HexCoord;
      to: HexCoord;
    };

// ============================================================
// PUBLIC ENTRY — FIND BEST MOVE
// ============================================================

export function findBestMove(
  game: Game,
  aiPlayer: Player,
  depth: number = 2
): AIMove | null {
  thinkStart = performance.now();
  if (!game.currentPlayer) return null;
  if (game.currentPlayer !== aiPlayer) return null;

  const allMoves = generateAIMoves(game, aiPlayer);
  if (allMoves.length === 0) return null;

  // ✅ PRIORITIZE moves here
  const scored = allMoves
    .map((move) => ({
      move,
      score: scoreMove(game, move, aiPlayer),
    }))
    .sort((a, b) => b.score - a.score);

  const bestScored = scored[0];
  if (bestScored.score >= 100_000) {
    return bestScored.move; // PLAY IMMEDIATELY WIN
  }

  const moves = scored.slice(0, MAX_ROOT_MOVES).map((s) => s.move);

  let bestMove: AIMove | null = null;
  let bestScore = -Infinity;

  for (const move of moves) {
    const cloned = game.clone();
    applyMoveOnClone(cloned, move, aiPlayer);
    advanceTurnForAI(cloned);

    const score = minimax(
      cloned,
      depth - 1,
      -Infinity,
      Infinity,
      false,
      aiPlayer
    );

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}


// ============================================================
// MINIMAX + ALPHA-BETA
// ============================================================

function minimax(
  game: Game,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  me: Player
): number {
  if (performance.now() - thinkStart > MAX_THINK_TIME_MS) {
    return evaluateGame(game, me);
  }
  const winner = game.checkWin();
  if (winner === me) return 100_000;
  if (winner && winner !== me) return -100_000;

  if (depth === 0) {
    return evaluateGame(game, me);
  }

  const current = game.currentPlayer as Player;
  const moves = generateAIMoves(game, current);

  if (moves.length === 0) {
    return maximizing ? -500 : 500;
  }

  if (maximizing) {
    let value = -Infinity;

    for (const move of moves) {
      const gClone = game.clone();
      applyMoveOnClone(gClone, move, current);
      advanceTurnForAI(gClone);

      const score = minimax(gClone, depth - 1, alpha, beta, false, me);
      value = Math.max(value, score);

      alpha = Math.max(alpha, value);
      if (alpha >= beta) break;
    }

    return value;
  } else {
    let value = Infinity;

    for (const move of moves) {
      const gClone = game.clone();
      applyMoveOnClone(gClone, move, current);
      advanceTurnForAI(gClone);

      const score = minimax(gClone, depth - 1, alpha, beta, true, me);
      value = Math.min(value, score);

      beta = Math.min(beta, value);
      if (alpha >= beta) break;
    }

    return value;
  }
}

// ============================================================
// EVALUATION FUNCTION
// ============================================================

function evaluateGame(game: Game, me: Player): number {
  const board = game.board;
  const pieces = board.pieces;

  const myPieces = pieces.filter((p) => p.owner === me);
  const oppPieces = pieces.filter((p) => p.owner !== me);

  const myMobility = myPieces
    .filter((p) => board.isTopPiece(p, board))
    .reduce((sum, p) => sum + p.legalMoves(board).length, 0);

  const oppMobility = oppPieces
    .filter((p) => board.isTopPiece(p, board))
    .reduce((sum, p) => sum + p.legalMoves(board).length, 0);

  const myQueen = pieces.find(
    (p) =>
      p.owner === me &&
      (p.type === "bee" || p.constructor.name === "QueenBee")
  );

  const oppQueen = pieces.find(
    (p) =>
      p.owner !== me &&
      (p.type === "bee" || p.constructor.name === "QueenBee")
  );

  const myQueenPressure = myQueen
    ? countSurrounding(board, myQueen.position)
    : 0;

  const oppQueenPressure = oppQueen
    ? countSurrounding(board, oppQueen.position)
    : 0;

  return (
    10 * (myPieces.length - oppPieces.length) +
    2 * (myMobility - oppMobility) +
    8 * (oppQueenPressure - myQueenPressure)
  );
}

// How many occupied neighbors the queen has (0–6)
// Higher = more surrounded = more danger for that queen.
function queenPressureForPlayer(game: Game, player: Player): number {
  const board = game.board;
  const pieces = board.pieces;

  const queen = pieces.find(
    (p) =>
      p.owner === player &&
      (p.type === "bee" || p.constructor.name === "QueenBee")
  );

  if (!queen) return 0;
  return countSurrounding(board, queen.position);
}

function getOpponent(player: Player): Player {
  return player === "White" ? "Black" : "White";
}

function countSurrounding(board: any, pos: HexCoord): number {
  const neighbors = board.neighbors(pos);
  return neighbors.filter((n: HexCoord) => !board.isEmpty(n)).length;
}

// ============================================================
// QUEEN PLACEMENT
// ============================================================

function generateForcedQueenPlacementsFor(
  game: Game,
  player: Player
): AIMove[] {
  const moves: AIMove[] = [];
  const board = game.board;
  const coords = board.allCoordsAroundHive();

  for (const coord of coords) {
    if (!board.isEmpty(coord)) continue;

    const placementMove = {
      pieceType: "bee" as const,
      color: player,
      target: { ...coord },
    };

    if (isLegalPlacement(game, placementMove)) {
      moves.push({
        kind: "place",
        from: "bank",
        pieceType: "bee",
        color: player,
        target: { ...coord },
      });
    }
  }

  return moves;
}

function mustPlaceQueen(game: Game, player: Player): boolean {
  const turn = game.getTurnNumber(player);
  const hasQueen = game.board.pieces.some(
    (p) =>
      p.owner === player &&
      (p.type === "bee" || p.constructor.name === "QueenBee")
  );
  return !hasQueen && turn >= 3;
}

// ============================================================
// MOVE GENERATION
// ============================================================

export function generateAIMoves(game: Game, player: Player): AIMove[] {
	const moves: AIMove[] = [];
	const board = game.board;
	const bank = game.bank;

	const moveCache = new Map<Piece, HexCoord[]>();

	function getLegalMovesCached(piece: Piece): HexCoord[] {
		if (!moveCache.has(piece)) {
			moveCache.set(piece, piece.legalMoves(board));
		}
		return moveCache.get(piece)!;
	}

	// Forced queen placement
if (mustPlaceQueen(game, player)) {
    return generateForcedQueenPlacementsFor(game, player);
}

	// Placement moves
	for (const bp of bank) {
		if (bp.color !== player) continue;

		const coords = board.allCoordsAroundHive();
		for (const coord of coords) {
		if (!board.isEmpty(coord)) continue;

		if (board.pieces.length === 1) {
			if (
			isLegalPlacement(game, {
				pieceType: bp.type,
				color: player,
				target: { ...coord },
			})
			) {
			moves.push({
				kind: "place",
				from: "bank",
				pieceType: bp.type,
				color: player,
				target: { ...coord },
			});
			}
			continue;
		}

       // ======= NEW FAST PRUNING ========
        const neighbors = board.neighbors(coord);
        
        let touchesOwn = false;
        let touchesOpponent = false;

        for (const n of neighbors) {
            const p = board.topPieceAt(board, n);
            if (!p) continue;

            if (p.owner === player) touchesOwn = true;
            else touchesOpponent = true;
        }

        // MUST touch your own color
        if (!touchesOwn) continue;

        // MUST NOT touch opponent color
        if (touchesOpponent) continue;
        // ===============================

        const placementMove = {
            pieceType: bp.type,
            color: player,
            target: { ...coord },
        };

		if (isLegalPlacement(game, placementMove)) {
			moves.push({
			kind: "place",
			from: "bank",
			pieceType: bp.type,
			color: player,
			target: { ...coord },
			});
		}
		}
	}

	// Movement moves
	for (const piece of board.pieces) {
		if (piece.owner !== player) continue;
		if (!board.isTopPiece(piece, board)) continue;

		const legal = getLegalMovesCached(piece);
		for (const dest of legal) {
		moves.push({
			kind: "move",
			from: "board",
			pieceType: piece.type,
			color: piece.owner,
			fromCoord: { ...piece.position },
			to: { ...dest },
		});
		}
	}

	return moves;
	}

// ============================================================
// MOVE SCORE
// ============================================================

function scoreMove(game: Game, move: AIMove, player: Player): number {
  let score = 0;

  const enemy = getOpponent(player);

  // --- Situation BEFORE the move ---
  const myPressureBefore = queenPressureForPlayer(game, player);
  const enemyPressureBefore = queenPressureForPlayer(game, enemy);

  const myMobilityBefore = mobilityForPlayer(game, player);
  const enemyMobilityBefore = mobilityForPlayer(game, enemy);

  // --- Simulate this move on a clone ---
  const sim = game.clone();
  applyMoveOnClone(sim, move, player);
  // no advanceTurnForAI here: we just care about board shape after OUR move

  const myPressureAfter = queenPressureForPlayer(sim, player);
  const enemyPressureAfter = queenPressureForPlayer(sim, enemy);

  const myMobilityAfter = mobilityForPlayer(sim, player);
  const enemyMobilityAfter = mobilityForPlayer(sim, enemy);

  // Saving own queen = highest priority
  if (myPressureAfter > myPressureBefore) score -= 500; // made queen worse

  // Encourage placing strategic pieces
  if (move.kind === "place") {
    const turn = game.getTurnNumber(player);

    // Early–mid game: prefer development
    if (turn <= 6) {
      score += 120;
    }
  }

  // Hard danger zones (DEFENSE)
  if (myPressureAfter >= 5) score -= 5000;
  if (myPressureAfter === 4) score -= 1500;

  // Soft attack pressure building
  if (enemyPressureAfter > enemyPressureBefore) {
    score += 200;
  }

  // Attacking enemy queen
  if (enemyPressureAfter >= 6) {
    return 100_000; // FORCE TOP PRIORITY
  }
  if (enemyPressureAfter >= 5) score += 5000;

  // Commit to attack once it starts
  if (enemyPressureBefore >= 3 && enemyPressureAfter > enemyPressureBefore) {
    score += 400;
  }

  if (
    enemyPressureBefore >= 4 &&
    enemyPressureAfter >= enemyPressureBefore
  ) {
    score += 400;
  }

  // Grasshoppers are attack
  if (move.kind === "place" && move.pieceType === "hopper") {
    if (enemyPressureBefore >= 2) {
      score += 120; // prepares jump-ins
    }
  }

  // Small penalty for pure reposition moves when bank isn’t empty.
  if (
    move.kind === "move" &&
    game.bank.some(b => b.color === player) &&
    myPressureAfter === myPressureBefore &&
    enemyPressureAfter === enemyPressureBefore
  ) {
    score -= 80;
  }
  // Detect moves that change nothing
  const quietMove =
    enemyPressureAfter === enemyPressureBefore &&
    myPressureAfter === myPressureBefore &&
    Math.abs(myMobilityAfter - myMobilityBefore) < 1;

  if (quietMove) score -= 80;

  // Mobility (number of legal moves)
  const myMobilityDelta = myMobilityAfter - myMobilityBefore;
  const enemyMobilityDelta = enemyMobilityAfter - enemyMobilityBefore;
  score += myMobilityDelta * 8;
  score -= enemyMobilityDelta * 6;

  // Small preference: placing vs moving
  if (move.kind === "place" && move.pieceType !== "bee") {
    if (game.getTurnNumber(player) < 4) score += 30;
    else score -= 10;
  }

  // Small randomness to avoid totally deterministic play
  score += Math.random() * 2;

  return score;
}

function mobilityForPlayer(game: Game, player: Player): number {
  const board = game.board;
  const pieces = board.pieces.filter((p) => p.owner === player);

  let sum = 0;
  for (const p of pieces) {
    if (!board.isTopPiece(p, board)) continue;
    sum += p.legalMoves(board).length;
  }

  // Clamp so it doesn't dominate the score
  return Math.min(sum, 20);
}

// ============================================================
// PLACEMENT VALIDATION
// ============================================================

function isLegalPlacement(
  game: Game,
  move: {
    pieceType: BankPiece["type"];
    color: Player;
    target: HexCoord;
  }
): boolean {
  const g = game.clone();
  const piece = createPiece(move.pieceType, move.color, move.target);
  if (!piece) return false;

  if (g.board.pieces.length === 1) {
    return g.placePiece(piece, move.target);
  }

  return g.placePiece(piece, move.target);
}

// ============================================================
// APPLY MOVE (REAL GAME)
// ============================================================

export function applyMove(game: Game, move: AIMove): void {
  if (move.kind === "place") {
    const piece = createPiece(move.pieceType, move.color, move.target);
    if (!piece) return;

    game.placePiece(piece, move.target);

    const idx = game.bank.findIndex(
      (b) => b.type === move.pieceType && b.color === move.color
    );
    if (idx !== -1) game.bank.splice(idx, 1);

    return;
  }

  const piece = game.board.pieces.find(
    (p) =>
      p.owner === move.color &&
      p.type === move.pieceType &&
      p.position.q === move.fromCoord.q &&
      p.position.r === move.fromCoord.r
  );
  if (!piece) return;

  game.movePiece(piece, move.to);
}

// ============================================================
// APPLY MOVE (MINIMAX CLONES)
// ============================================================

function applyMoveOnClone(
  game: Game,
  move: AIMove,
  player: Player
): void {
  if (move.kind === "place") {
    game.currentPlayer = player;

    const pieceObj = createPiece(
      move.pieceType,
      move.color,
      move.target
    );
    if (!pieceObj) return;

    const ok = game.placePiece(pieceObj, move.target);
    if (!ok) return;

    const idx = game.bank.findIndex(
      (b) => b.color === move.color && b.type === move.pieceType
    );
    if (idx !== -1) game.bank.splice(idx, 1);

    return;
  }

  game.currentPlayer = player;

  const piece = game.board.pieces.find(
    (p) =>
      p.owner === move.color &&
      p.type === move.pieceType &&
      p.position.q === move.fromCoord.q &&
      p.position.r === move.fromCoord.r
  );
  if (!piece) return;

  game.movePiece(piece, move.to);
}

// ============================================================
// TURN LOGIC FOR MINIMAX (NO UI)
// ============================================================

function advanceTurnForAI(game: Game): void {
  if (!game.currentPlayer) return;

  const next: Player =
    game.currentPlayer === "White" ? "Black" : "White";

  if (!hasAvailableMoves(game.board, next, game.bank)) {
    // Skip opponent, current player stays
    return;
  }

  game.nextTurn();
}