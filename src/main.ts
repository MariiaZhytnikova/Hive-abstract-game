// -------- Styles & Basics --------
import './style.css';
import "./popup";

// -------- Styles & Basics --------
import { Game } from './game/Game';
import { layoutBankPositions } from './game/PieceBank';
import type { BankPiece } from './game/PieceBank';
import { hasAvailableMoves } from './game/rules';
import { createPiece } from './models/createPiece';
import {showWinnerPopup} from './popup'
import type { Piece, Player } from './models/Piece';

// -------- UI / Rendering --------
import { setupCanvas } from "./ui/canvasView";
import { renderCanvasBoard } from "./ui/render";
import { initUIEvents } from "./ui/events";
import { showError } from './ui/uiUtils';

// -------------- AI ---------------
import { AIController } from "./agent/aiController";

// ===============================
//  CANVAS SETUP
// ===============================
const width = 1000;
const height = 750;
const HEX_SIZE = 30;
const pieceSize = 30;

const { canvas, renderer, dpr } = setupCanvas(
  "hive-canvas",
  width,
  height,
  HEX_SIZE
);

// ===============================
// 📌 GAME INITIALIZATION
// ===============================

const game = new Game();
layoutBankPositions(game.bank, width, dpr, pieceSize);
let selected:
	| { from: "bank"; bankId: string; type: BankPiece["type"]; color: Player }
	| { from: "board"; ref: Piece }
	| null = null;
let mousePos = { x: 0, y: 0 };
const ai = new AIController(game);
ai.onMoveComplete = () => nextTurnOrSkip();
let hoveredHex: { q: number, r: number } | null = null;

// -------------------------------
// HANDLER — BANK SELECTION
// -------------------------------

function handleBankClick(b: BankPiece) {

  // If AI is enabled and this bank piece belongs to AI
if (game.aiEnabled) {
  if (game.currentPlayer === game.aiPlays) {
    showError("🤖 AI is thinking...");
    return;
  }
  if (b.color === game.aiPlays) {
    showError(`🤖 You cannot play ${game.aiPlays}, AI controls it!`);
    return;
  }
}

  if (!game.currentPlayer) {
    game.currentPlayer = b.color;
    console.log(`First player: ${game.currentPlayer}`);
    document.getElementById('game-status')!.textContent =
      `Game started — ${game.currentPlayer} moves first`;
  }

  selected = { from: "bank", bankId: b.id, type: b.type, color: b.color };
  console.log(`Selected from bank: ${selected.color}, ${selected.type}`);
}

// -------------------------------
// HANDLER — HEX CLICK (MOVE OR PLACE)
// -------------------------------
function handleHexClick(hex: { q: number; r: number }) {

  // If AI is playing and it's AI’s turn
  if (game.aiEnabled && game.currentPlayer === game.aiPlays) {
  showError("🤖 AI is thinking...");
  return;
  }

  if (!selected) {
    // Selecting board piece
    const piece = game.board.topPieceAt(game.board, hex);

    // Prevent selecting AI-owned pieces
    if (game.aiEnabled && piece && piece.owner === game.aiPlays) {
      showError("🤖 You cannot move Black — AI plays Black!");
      return;
    }

    if (
      piece &&
      piece.owner === game.currentPlayer
    ) {
      selected = { from: "board", ref: piece };
      console.log(`Selected from board: ${piece.owner}, ${piece.type}`);
      game.validMoves = piece.legalMoves(game.board);
      return;
    }

    return;
  }

  // ---- BANK → PLACE ----
  if (selected.from === "bank") {
    placeFromBank(hex);
  }

  // ---- BOARD → MOVE ----
  else if (selected.from === "board") {
    moveFromBoard(hex);
  }

  selected = null;
  game.validMoves = [];

  renderCanvasBoard(
    renderer,
    game.board,
    game.bank,
    hoveredHex,
    selected,
    game.validMoves,
    mousePos,
    HEX_SIZE
  );

  const winner = game.checkWin();
  if (winner) showWinnerPopup(winner);
}

// -------------------------------
// PLACE FROM BANK
// -------------------------------
function placeFromBank(hex: { q: number; r: number }) {
  const sel = selected!;
  const radius = 6;

  if (
    Math.abs(hex.q) > radius ||
    Math.abs(hex.r) > radius ||
    Math.abs(hex.q + hex.r) > radius
  ) {
    showError("❌ Outside board bounds");
    return;
  }

  if (sel.from === "bank") {
    const pieceObj = createPiece(sel.type, sel.color, hex);
    if (!pieceObj) return;

    if (game.placePiece(pieceObj, hex)) {
      const idx = game.bank.findIndex((p) => p.id === sel.bankId);
      if (idx !== -1) {
        game.bank.splice(idx, 1);
        layoutBankPositions(game.bank, width, dpr, pieceSize);
      }
      nextTurnOrSkip();
    }
  }
}

// -------------------------------
// MOVE FROM BOARD
// -------------------------------
function moveFromBoard(hex: { q: number; r: number }) {
    if (!selected || selected.from !== "board") return;

    const piece = selected.ref;

    if (game.movePiece(piece, hex)) {
        nextTurnOrSkip();
    }

    selected = null;
    game.validMoves = [];
    renderCanvasBoard(renderer, game.board, game.bank, hoveredHex, selected, game.validMoves, mousePos, HEX_SIZE);
}

// -------------------------------
// TURN LOGIC (skip if no moves)
// -------------------------------
function nextTurnOrSkip() {
  const next = game.currentPlayer === "White" ? "Black" : "White";
  console.log(`Now turn of: ${next}`);
  if (!hasAvailableMoves(game.board, next, game.bank)) {
    console.log(`${next} has no availible moves`);
    showError(`⚠️ ${next} has no legal moves — turn skipped!`);
  } else {
    console.log(`${next} has availible moves`);
    game.nextTurn();
  }

  // clear selection after turn change
  selected = null;
  game.validMoves = [];

  document.getElementById("game-status")!.textContent =
    `Next move: ${game.currentPlayer}`;

  // Trigger AI AFTER UI updates
  if (ai.isEnabled && game.currentPlayer === game.aiPlays) {
    setTimeout(() => ai.makeMoveIfNeeded(), 200);
  }
}

// -------------------------------
// HANDLER — HOVER
// -------------------------------
function handleHover(
  hex: { q: number; r: number } | null,
  mouse: { x: number; y: number }
) {
  hoveredHex = hex;
  mousePos = mouse;

  renderCanvasBoard(
    renderer,
    game.board,
    game.bank,
    hoveredHex,
    selected,
    game.validMoves,
    mousePos,
    HEX_SIZE
  );
}

// ===============================
//   AI 
// ===============================

document.getElementById("play_against_ai")!.addEventListener("click", () => {
  const enabled = ai.toggle();

  // When enabling AI mode:
  if (enabled) {

    // Human must play White
    game.aiEnabled = true;
    game.aiPlays = "Black";

    // If game already started with Black first → block
    if (game.currentPlayer === "Black") {
      showError("⚠️ AI mode ON, but Black already started. Restart the game!");
    }
  } 
  // When disabling AI:
  else {
    game.aiEnabled = false;
  }

  const button = document.getElementById("play_against_ai")!;
  button.textContent = enabled ? "AI: ON" : "AI: OFF";

  showError(enabled ? "🤖 AI Enabled" : "❌ AI Disabled");
});

// ===============================
// 📌 INITIAL RENDER
// ===============================
renderCanvasBoard(
  renderer,
  game.board,
  game.bank,
  hoveredHex,
  selected,
  game.validMoves,
  mousePos,
  HEX_SIZE
);

document.getElementById("game-container")?.classList.remove("hidden");
document.body.classList.add("ready");

// ===============================
// 📌 ATTACH UI EVENTS
// ===============================
initUIEvents(canvas, game.bank, HEX_SIZE, {
  onHexClick: handleHexClick,
  onBankClick: handleBankClick,
  onHoverHex: handleHover
});
