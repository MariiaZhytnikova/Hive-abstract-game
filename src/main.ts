import './style.css';
import { Game } from './game/Game';
import { CanvasRenderer, loadPieceImage } from './game/CanvasRenderer';
import { drawPieceBanks, layoutBankPositions } from './game/PieceBank';
import type { BankPiece } from './game/PieceBank';
import type { Piece, Player } from './models/Piece';
import { pixelToHex } from './game/hexUtils';
import { createPiece } from './models/createPiece';

// ---------- Canvas & DPR ----------
const canvas = document.getElementById('hive-canvas') as HTMLCanvasElement;
const dpr = window.devicePixelRatio || 1;

canvas.width  = 1000 * dpr;
canvas.height = 750 * dpr;
canvas.style.width  = '1000px';
canvas.style.height = '750px';

const renderer = new CanvasRenderer(canvas);
renderer.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

// ---------- Mouse helpers ----------
function getMousePos(evt: MouseEvent, canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
}

// ---------- Game & Banks ----------
const game = new Game();
const pieceSize = 50;
let bankPieces: BankPiece[] = [];
let selected:
  | { from: "bank"; bankId: string; type: BankPiece["type"]; color: Player }
  | { from: "board"; ref: Piece }
  | null = null;
let _id = 0;
function uid() { return `p_${_id++}`; }

const pieceBankConfig = [
  { type: 'bee',    count: 1 },
  { type: 'spider', count: 2 },
  { type: 'beetle', count: 2 },
  { type: 'hopper', count: 3 },
  { type: 'ant',    count: 3 },
];

function initPieceBanks() {
  bankPieces = [];
  (['Black', 'White'] as const).forEach(color => {
    pieceBankConfig.forEach(({ type, count }) => {
      for (let i = 0; i < count; i++) {
        bankPieces.push({
          id: uid(),
          x: 0,
          y: 0,
          type: type as BankPiece["type"],
          color,
          width: pieceSize,
          height: pieceSize
        });
      }
    });
  });
  layoutBankPositions(bankPieces, canvas.width / dpr, pieceSize);
}

// ---------- Interaction state ----------
let selectedBankId: string | null = null;
let validMoves: { q: number; r: number }[] = [];
let hoveredHex: { q: number; r: number } | null = null;
let draggingPiece: Piece | null = null;
let dragOffset = { x: 0, y: 0 };
let dragPos    = { x: 0, y: 0 };

// ---------- Highlight helper ----------
function drawHighlightedHexes(ctx: CanvasRenderingContext2D, hexes: {q:number,r:number}[], renderer: CanvasRenderer) {
  ctx.save();
  ctx.fillStyle = 'rgba(0, 200, 0, 0.3)'; 
  hexes.forEach(h => {
    const { x, y } = renderer.hexToPixel(h.q, h.r);
    const size = renderer.size;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = Math.PI / 180 * (60 * i - 30);
      const px = x + size * Math.cos(angle);
      const py = y + size * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  });
  ctx.restore();
}

// ---------- Event handlers ----------

canvas.addEventListener("click", (e) => {
  const { x: clickX, y: clickY } = getMousePos(e, canvas);

  // center of the board in canvas-pixel space
  const centerX = canvas.width / (2 * dpr);
  const centerY = canvas.height / (2 * dpr);

  // --- 1) BANK HIT-TEST  (bank pieces are drawn in canvas space)
  for (let i = bankPieces.length - 1; i >= 0; i--) {
    const b = bankPieces[i];
    if (
      clickX >= b.x &&
      clickX <= b.x + b.width &&
      clickY >= b.y &&
      clickY <= b.y + b.height
    ) {
      selected = {
        from: "bank",
        bankId: b.id,
        type: b.type,
        color: b.color,
      };
      return;
    }
  }

  // 2) BOARD PIECE HIT-TEST
  // translate click to board–relative hex coords (for logging / placement)
  const hex = pixelToHex(clickX - centerX, clickY - centerY, renderer.size);
  console.log("clicked hex:", hex);

  // loop pieces top-to-bottom so upper pieces win if stacked
  for (let i = game.board.pieces.length - 1; i >= 0; i--) {
    const p = game.board.pieces[i];
    const { q, r } = p.position;

    // get the canvas-pixel center of this hex
    const { x, y } = renderer.hexToPixel(q, r);

    // ---- precise point-in-hex test ----
    const dx = clickX - x;
    const dy = clickY - y;
    const nx = Math.abs(dx) / renderer.size;
    const ny = Math.abs(dy) / renderer.size;

    // inside a regular pointy-top hex if these inequalities hold:
    if (ny <= 0.5 && Math.sqrt(3) * nx + ny <= Math.sqrt(3) / 2) {
      selected = { from: "board", ref: p };
      return;
    }
  }

  // 3) PLACE OR MOVE
  if (selected) {
     const sel = selected; 
    const target = pixelToHex(clickX - centerX, clickY - centerY, renderer.size);

    if (sel.from === "bank") {
      const pieceObj = createPiece(sel.type, sel.color, target);
      if (pieceObj) {
        game.board.addPiece(pieceObj, target);
        game.nextTurn?.();
        // remove from bank + reflow
        const idx = bankPieces.findIndex(p => p.id === sel.bankId);
        if (idx !== -1) {
          bankPieces.splice(idx, 1);
          layoutBankPositions(bankPieces, canvas.width / dpr, pieceSize);
        }
      }
    } else if (sel.from === "board") {
    sel.ref.position = target;
  }
    selected = null;
    renderCanvasBoard();
  }
});

canvas.addEventListener('mousedown', e => {
  const { x: mouseX, y: mouseY } = getMousePos(e, canvas);
  const centerX = canvas.width / (2 * dpr);
  const centerY = canvas.height / (2 * dpr);

  // Board pieces
  for (let i = game.board.pieces.length - 1; i >= 0; i--) {
    const p = game.board.pieces[i];
    const { x, y } = renderer.hexToPixel(p.position.q, p.position.r);
    const hovered = pixelToHex(mouseX - centerX, mouseY - centerY, renderer.size);
    if (hovered.q === p.position.q && hovered.r === p.position.r) {
      draggingPiece = p;
      selectedBankId = null;
      dragOffset = { x: mouseX - x, y: mouseY - y };
      dragPos = { x, y };
      validMoves = p.legalMoves(game.board);
      hoveredHex = null;
      renderCanvasBoard();
      return;
    }
  }

  // Bank pieces
  for (let i = bankPieces.length - 1; i >= 0; i--) {
    const b = bankPieces[i];
    const bLeft   = b.x - b.width / 2;
    const bTop    = b.y - b.height / 2;
    const bRight  = b.x + b.width / 2;
    const bBottom = b.y + b.height / 2;

    if (mouseX >= bLeft && mouseX <= bRight &&
        mouseY >= bTop && mouseY <= bBottom) {

      const piece = createPiece(b.type, b.color, { q: 0, r: 0 });
      if (!piece) return;

      draggingPiece = piece;
      selectedBankId = b.id;
      dragOffset = { x: mouseX - b.x, y: mouseY - b.y };
      dragPos = { x: b.x, y: b.y };
      validMoves = game.legalPlacements(piece);
      hoveredHex = null;
      renderCanvasBoard();
      return;
    }
  }
});

canvas.addEventListener('mousemove', e => {
  const { x: mouseX, y: mouseY } = getMousePos(e, canvas);
  const centerX = canvas.width / (2 * dpr);
  const centerY = canvas.height / (2 * dpr);

  if (draggingPiece) {
    dragPos.x = mouseX - dragOffset.x;
    dragPos.y = mouseY - dragOffset.y;

    const candidateHex = pixelToHex(dragPos.x - centerX, dragPos.y - centerY, renderer.size);
    hoveredHex = validMoves.some(h => h.q === candidateHex.q && h.r === candidateHex.r)
      ? candidateHex
      : null;
  } else {
    const newHoveredHex = pixelToHex(mouseX - centerX, mouseY - centerY, renderer.size);
    if (!hoveredHex || hoveredHex.q !== newHoveredHex.q || hoveredHex.r !== newHoveredHex.r) {
      hoveredHex = newHoveredHex;
    }
  }
  renderCanvasBoard();
});

canvas.addEventListener('mouseup', e => {
  if (!draggingPiece) return;

  const { x: mouseX, y: mouseY } = getMousePos(e, canvas);
  const centerX = canvas.width / (2 * dpr);
  const centerY = canvas.height / (2 * dpr);

  const targetHex = pixelToHex(mouseX - centerX, mouseY - centerY, renderer.size);
  const isValid = validMoves.some(h => h.q === targetHex.q && h.r === targetHex.r);

  if (isValid) {
    if (selectedBankId) {
      // ставим на доску
      game.placePiece(draggingPiece, targetHex);

      // удаляем из банка
      bankPieces = bankPieces.filter(b => b.id !== selectedBankId);
      selectedBankId = null;
    } else {
      game.movePiece(draggingPiece, targetHex);
    }
    game.nextTurn?.();
  }

  draggingPiece = null;
  validMoves = [];
  hoveredHex = null;
  renderCanvasBoard();
});

canvas.addEventListener('mouseleave', () => {
  hoveredHex = null;
  renderCanvasBoard();
});

// ---------- Render ----------
function renderCanvasBoard() {
  renderer.clear();

  if (draggingPiece && validMoves.length > 0) {
    drawHighlightedHexes(renderer.ctx, validMoves, renderer);
  }

  drawPieceBanks(bankPieces, renderer.ctx);
  renderer.drawBoard(game.board, hoveredHex);

  if (draggingPiece) {
    const ctx = renderer.ctx;
    const size = renderer.size;
    let typeKey = draggingPiece.constructor.name.toLowerCase();
    if (typeKey.includes('queen'))  typeKey = 'bee';
    else if (typeKey.includes('beetle')) typeKey = 'beetle';
    else if (typeKey.includes('spider')) typeKey = 'spider';
    else if (typeKey.includes('hopper')) typeKey = 'hopper';
    else if (typeKey.includes('ant'))    typeKey = 'ant';

    const img = loadPieceImage(typeKey, draggingPiece.owner);
    ctx.drawImage(img, dragPos.x - size, dragPos.y - size, size * 2, size * 2);
  }
}

// ---------- Bootstrap ----------
initPieceBanks();
renderCanvasBoard();


/*import './style.css';
import { Game } from './game/Game';
import { drawPieceBanks, layoutBankPositions } from './game/PieceBank';
import type { BankPiece } from './game/PieceBank';
import { pixelToHex, pointInHex } from './game/hexUtils';
import { createPiece } from './models/createPiece';
import { CanvasRenderer } from './game/CanvasRenderer';
import type { Piece, Player } from './models/Piece';


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

const HEX_SIZE = 40;

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

canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();

  // convert CSS-pixel mouse coords to canvas-pixel coords
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;

  // center of the board in canvas-pixel space
  const centerX = canvas.width / dpr / 2;
  const centerY = canvas.height / dpr / 2;

  // --- 1) BANK HIT-TEST  (bank pieces are drawn in canvas space)
  for (let i = bankPieces.length - 1; i >= 0; i--) {
    const b = bankPieces[i];
    if (
      clickX >= b.x &&
      clickX <= b.x + b.width &&
      clickY >= b.y &&
      clickY <= b.y + b.height
    ) {
      selected = {
        from: "bank",
        bankId: b.id,
        type: b.type,
        color: b.color,
      };
      return;
    }
  }

	// 2) BOARD PIECE HIT-TEST
  // translate click to board–relative hex coords (for logging / placement)
  const hex = pixelToHex(clickX - centerX, clickY - centerY, HEX_SIZE);
  console.log("clicked hex:", hex);

  // loop pieces top-to-bottom so upper pieces win if stacked
  for (let i = game.board.pieces.length - 1; i >= 0; i--) {
    const p = game.board.pieces[i];
    const { q, r } = p.position;

    // get the canvas-pixel center of this hex
    const { x, y } = renderer.hexToPixel(q, r);

    // ---- precise point-in-hex test ----
    const dx = clickX - x;
    const dy = clickY - y;
    const nx = Math.abs(dx) / HEX_SIZE;
    const ny = Math.abs(dy) / HEX_SIZE;

    // inside a regular pointy-top hex if these inequalities hold:
    if (ny <= 0.5 && Math.sqrt(3) * nx + ny <= Math.sqrt(3) / 2) {
      selected = { from: "board", ref: p };
      return;
    }
  }

	// 3) PLACE OR MOVE
	if (selected) {
		 const sel = selected; 
		const target = pixelToHex(clickX - centerX, clickY - centerY, HEX_SIZE);

		if (sel.from === "bank") {
			const pieceObj = createPiece(sel.type, sel.color, target);
			if (pieceObj) {
				game.board.addPiece(pieceObj, target);
        game.nextTurn?.();
				// remove from bank + reflow
				const idx = bankPieces.findIndex(p => p.id === sel.bankId);
				if (idx !== -1) {
					bankPieces.splice(idx, 1);
					layoutBankPositions(bankPieces, canvas.width, dpr, pieceSize);
				}
			}
		} else if (sel.from === "board") {
		sel.ref.position = target;
	}
		selected = null;
		renderCanvasBoard();
	}
});

canvas.addEventListener('mousemove', (e) => {
	const rect = canvas.getBoundingClientRect();
  const mouseX = (e.clientX - rect.left) * dpr;
  const mouseY = (e.clientY - rect.top) * dpr;
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
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
function renderCanvasBoard() {
	renderer.clear();
	drawPieceBanks(bankPieces, renderer.ctx);
	renderer.drawBoard(game.board, hoveredHex);
}

// ---- BOOTSTRAP ----
initPieceBanks();
renderCanvasBoard();
 */