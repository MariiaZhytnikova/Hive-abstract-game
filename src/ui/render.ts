// ui/render.ts
import { CanvasRenderer, loadPieceImage } from "../game/CanvasRenderer"; 
import { drawPieceBanks } from "../game/PieceBank";
import type { BankPiece } from "../game/PieceBank";
import type { Piece } from "../models/Piece";
import type { Board } from "../models/Board";

export function drawHighlightedHexes(
  ctx: CanvasRenderingContext2D,
  hexes: { q: number; r: number }[],
  renderer: CanvasRenderer,
  hexSize: number
) {
  ctx.save();
  ctx.fillStyle = "rgba(0, 200, 0, 0.3)";

  const unique = new Set<string>();
  const filtered = hexes.filter(h => {
    const key = `${h.q},${h.r}`;
    if (unique.has(key)) return false;
    unique.add(key);
    return true;
  });

  filtered.forEach(h => {
    const { x, y } = renderer.hexToPixel(h.q, h.r);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = Math.PI / 180 * (60 * i - 30);
      const px = x + hexSize * Math.cos(angle);
      const py = y + hexSize * Math.sin(angle);
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  });

  ctx.restore();
}

export function renderCanvasBoard(
  renderer: CanvasRenderer,
  board: Board,
  bank: BankPiece[],
  hoveredHex: { q: number; r: number } | null,
  selected: { from: "bank" | "board"; ref?: Piece; type?: string; color?: string } | null,
  validMoves: { q: number; r: number }[],
  mousePos: { x: number; y: number },
  hexSize: number
) {
  renderer.clear();

  // Draw bank
  drawPieceBanks(bank, renderer.ctx);

  // Draw board (hex grid + pieces)
  renderer.drawBoard(board, hoveredHex);

  // Draw dragged piece (bank or board)
  if (selected) {
    const ctx = renderer.ctx;

    let type: string;
    let owner: string;

    if (selected.from === "bank") {
      type = selected.type!;
      owner = selected.color!;
    } else {
      type = selected.ref!.type;
      owner = selected.ref!.owner;
    }

    const img = loadPieceImage(type, owner);
    if (img.complete && img.naturalWidth > 0) {
      ctx.drawImage(
        img,
        mousePos.x - hexSize,
        mousePos.y - hexSize,
        hexSize * 2,
        hexSize * 2
      );
    }
  }

  // Draw legal moves highlight
  if (validMoves.length > 0) {
    drawHighlightedHexes(renderer.ctx, validMoves, renderer, hexSize);
  }
}
