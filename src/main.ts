import './style.css';
//import { showPopup } from "./popup";
import "./popup";
import { Game } from './game/Game';
import { drawPieceBanks, layoutBankPositions } from './game/PieceBank';
import type { BankPiece } from './game/PieceBank';
import { pixelToHex } from './game/hexUtils';
import { createPiece } from './models/createPiece';
import { CanvasRenderer, loadPieceImage } from './game/CanvasRenderer';
import {showWinnerPopup} from './popup'
import type { Piece, Player } from './models/Piece';

let validMoves: { q: number; r: number }[] = [];
let mousePos = { x: 0, y: 0 };
let bankPieces: BankPiece[] = [];
let selected:
	| { from: "bank"; bankId: string; type: BankPiece["type"]; color: Player }
	| { from: "board"; ref: Piece }
	| null = null;

const canvas = document.getElementById('hive-canvas') as HTMLCanvasElement;

// High-DPI setup
const dpr = window.devicePixelRatio || 1;
canvas.width = 1000 * dpr;
canvas.height = 750 * dpr;
canvas.style.width = "1000px";
canvas.style.height = "750px";

// Create renderer and scale context
const renderer = new CanvasRenderer(canvas);
renderer.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

const game = new Game();

// Correct counts per color
const pieceBankConfig: Array<{ type: BankPiece["type"]; count: number }> = [
	{ type: "bee", count: 1 },
	{ type: "spider", count: 2 },
	{ type: "beetle", count: 2 },
	{ type: "hopper", count: 3 },
	{ type: "ant", count: 3 },
];
const pieceSize = 50;

const HEX_SIZE = 40 / dpr;

// 🆕 ID helper
let _id = 0;
function uid() { return `p_${_id++}`; }

// Build the full bank once
function initPieceBanks() {
	bankPieces = [];
	(["Black", "White"] as const).forEach((color) => {
		pieceBankConfig.forEach(({ type, count }) => {
			for (let i = 0; i < count; i++) {
				bankPieces.push({
					id: uid(),
					x: 0, y: 0,
					type,
					color,
					width: pieceSize,
					height: pieceSize,
				});
			}
		});
	});
	layoutBankPositions(bankPieces, canvas.width, dpr, pieceSize);
}

let hoveredHex: { q: number, r: number } | null = null;

// ---- CLICK HANDLER ----
canvas.addEventListener('click', (e) => {
  const { x: clickX, y: clickY } = getMousePos(e, canvas);
  const centerX = canvas.width / (2 * dpr);
  const centerY = canvas.height / (2 * dpr);
	// const rect = canvas.getBoundingClientRect();
	// const clickX = e.clientX - rect.left;
	// const clickY = e.clientY - rect.top;

	// const centerX = canvas.width / dpr / 2;
	// const centerY = canvas.height / dpr / 2;

	// 1) BANK HIT-TEST
  if (!selected) {
    for (let i = bankPieces.length - 1; i >= 0; i--) {
      const b = bankPieces[i];
      if (
        clickX >= b.x && clickX <= b.x + b.width &&
        clickY >= b.y && clickY <= b.y + b.height 
      ) {
        selected = { from: "bank", bankId: b.id, type: b.type, color: b.color };
        return;
      }
    }

	// 2) BOARD PIECE HIT-TEST

    const hex = pixelToHex(clickX - centerX, clickY - centerY, HEX_SIZE);
    for (let i = game.board.pieces.length - 1; i >= 0; i--) {
      const p = game.board.pieces[i];
      if (p.position.q === hex.q && p.position.r === hex.r && p.owner === game.currentPlayer) {
        console.log('Click hex:', hex);                 /// LOG
        selected = { from: "board", ref: p };
        validMoves = p.legalMoves(game.board);
        console.log('Selected from board:', selected);  /// LOG
        return;
      }
    }
  }

  // Move or Place

  if (selected) {
    const sel = selected;
    const target = pixelToHex(clickX - centerX, clickY - centerY, HEX_SIZE); /// PLACE of insert

    if (sel.from === "bank") {                   /// BANK
      const pieceObj = createPiece(sel.type, sel.color, target);
      if (pieceObj && game.placePiece(pieceObj, target)) {
        // remove from bank + reflow
        const idx = bankPieces.findIndex(p => p.id === sel.bankId);
        if (idx !== -1) {
          bankPieces.splice(idx, 1);
          layoutBankPositions(bankPieces, canvas.width, dpr, pieceSize);
        }
          game.nextTurn(); 
      }
    } else if (sel.from === "board") {            /// BOARD
      if (game.movePiece(sel.ref, target)) {
        console.log("Move successful");           /// LOG
        game.nextTurn();
      } else {
        console.log("Move failed");                 /// LOG
      }
    }
    selected = null;
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
  const centerX = canvas.width / (2 * dpr);
  const centerY = canvas.height / (2 * dpr);
	// const rect = canvas.getBoundingClientRect();
	// const mouseX = e.clientX - rect.left;
	// const mouseY = e.clientY - rect.top;
	// const centerX = canvas.width / dpr / 2;
	// const centerY = canvas.height / dpr / 2;
	const newHoveredHex = pixelToHex(mouseX - centerX, mouseY - centerY, HEX_SIZE);
	// Only redraw if hovered hex actually changes
	if (!hoveredHex || hoveredHex.q !== newHoveredHex.q || hoveredHex.r !== newHoveredHex.r) {
		hoveredHex = newHoveredHex;
		renderCanvasBoard();
	}
});

canvas.addEventListener('mouseleave', () => {
	hoveredHex = null;
	renderCanvasBoard();
});

// ---- RENDER LOOP ----
// function renderCanvasBoard() {
// 	renderer.clear();
// 	drawPieceBanks(bankPieces, renderer.ctx);
// 	renderer.drawBoard(game.board, hoveredHex);
// }

/////////////////////////////////////////////////////
// HELPERS

// function drawHighlightedHexes(ctx: CanvasRenderingContext2D, hexes: {q:number,r:number}[], renderer: CanvasRenderer) {
//   ctx.save();
//   ctx.fillStyle = 'rgba(0, 200, 0, 0.3)'; 
//   hexes.forEach(h => {
//     const { x, y } = renderer.hexToPixel(h.q, h.r);
//     ctx.beginPath();
//     for (let i = 0; i < 6; i++) {
//       const angle = Math.PI / 180 * (60 * i - 30);
//       const px = x + HEX_SIZE * Math.cos(angle);
//       const py = y + HEX_SIZE * Math.sin(angle);
//       if (i === 0) ctx.moveTo(px, py);
//       else ctx.lineTo(px, py);
//     }
//     ctx.closePath();
//     ctx.fill();
//   });
//   ctx.restore();
// }

function getMousePos(evt: MouseEvent, canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
}

////////////////////////////////////////////////////////////////////////////////

function renderCanvasBoard() {
  renderer.clear();

  // ---- Valid Moves ----
  // if (validMoves.length > 0) {
  //   drawHighlightedHexes(renderer.ctx, validMoves, renderer);
  // }

  drawPieceBanks(bankPieces, renderer.ctx);

  renderer.drawBoard(game.board, hoveredHex);

  // ---- Drag piece ----
  if (selected && selected.from === "bank") {
    const ctx = renderer.ctx;
    let typeKey = selected.type.toLowerCase();
    const img = loadPieceImage(typeKey, selected.color);
    ctx.drawImage(img, mousePos.x - HEX_SIZE, mousePos.y - HEX_SIZE, HEX_SIZE * 2, HEX_SIZE * 2);
  } else if (selected && selected.from === "board") {
  // Highlight selected board piece as I suggested earlier
    const ctx = renderer.ctx;  
    const type = selected.ref.type;
    const owner = selected.ref.owner; // "White" or "Black"
    const img = loadPieceImage(type, owner);
    ctx.drawImage(img, mousePos.x - HEX_SIZE, mousePos.y - HEX_SIZE, HEX_SIZE * 2, HEX_SIZE * 2);
  }
}

// ---- BOOTSTRAP ----
initPieceBanks();
renderCanvasBoard();
document.getElementById("game-container")?.classList.remove("hidden");
document.body.classList.add("ready");