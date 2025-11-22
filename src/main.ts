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

let hoveredHex: { q: number, r: number } | null = null;

// -------------------------------
// HANDLER — BANK SELECTION
// -------------------------------

function handleBankClick(b: BankPiece) {
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
  if (!selected) {
    // Selecting board piece
    const piece = game.board.topPieceAt(game.board, hex);

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

  // Move or Place
  if (selected) {
    const sel = selected;
    const target = pixelToHex(clickX - centerX, clickY - centerY, HEX_SIZE);
    
    if (sel.from === "bank") {                   /// BANK
      const radius = 6;                           //board radius
      if (Math.abs(target.q) > radius || Math.abs(target.r) > radius || Math.abs(target.q + target.r) > radius) {
        console.log("❌ Outside board bounds:", target);
        showError("❌ Outside board bounds");
        selected = null;
        renderCanvasBoard();
        return;
      }
      const pieceObj = createPiece(sel.type, sel.color, target);
      if (pieceObj && game.placePiece(pieceObj, target)) {
        // remove from bank + reflow
        const idx = bankPieces.findIndex(p => p.id === sel.bankId);
        if (idx !== -1) {
          bankPieces.splice(idx, 1);
          layoutBankPositions(bankPieces, width, dpr, pieceSize);
        }
        // Check for win condition after placing a piece!!!!!!!!!!
        const winner = game.checkWin();
        if (winner) {
          console.log(`Winner: ${winner}`);
          showWinnerPopup(winner);
          return;
        }
        if (game.board.pieces.length > 2) {
          const next = game.currentPlayer === "White" ? "Black" : "White";
          if (!hasAvailableMoves(game.board, next, bankPieces)) {
            console.log(`${next} has no legal moves — skipping turn`);
            showError(`⚠️ ${next} has no legal moves — turn skipped!`); // CHECK PLAYERS TURN!!!
          } else {
            game.nextTurn();
          }
        } else {
          game.nextTurn();
        }
      }
    } else if (sel.from === "board") {            /// BOARD
      if (game.movePiece(sel.ref, target)) {
        console.log("Move successful");
        const next = game.currentPlayer === "White" ? "Black" : "White";
        if (!hasAvailableMoves(game.board, next, bankPieces)) {
          console.log(`${next} has no legal moves — skipping turn`);
          showError(`⚠️ ${next} has no legal moves — turn skipped!`); // CHECK PLAYERS TURN!!!
        } else {
          game.nextTurn();
        }
      } else {
        console.log("Move failed");
      }
    }
    selected = null;
    validMoves = [];
    renderCanvasBoard();
    document.getElementById('game-status')!.textContent = `Next move: ${game.currentPlayer}`;

    // DEBUG (check the winner)


		const winner = game.checkWin();
		if (winner) {
		  console.log(`Winner: ${winner}`);
		  showWinnerPopup(winner);
		}
	}
});

canvas.addEventListener('mousemove', (e) => {
  mousePos = getMousePos(e, canvas);
  const { x: mouseX, y: mouseY } = getMousePos(e, canvas);
  const centerX = width / 2;
  const centerY = height / 2;

	const newHoveredHex = pixelToHex(mouseX - centerX, mouseY - centerY, HEX_SIZE);
	// Only redraw if hovered hex actually changes
	if (!hoveredHex || hoveredHex.q !== newHoveredHex.q || hoveredHex.r !== newHoveredHex.r) {
		hoveredHex = newHoveredHex;
		renderCanvasBoard();
	}
});

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

  document.getElementById("game-status")!.textContent =
    `Next move: ${game.currentPlayer}`;
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
