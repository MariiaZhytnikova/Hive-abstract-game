// CanvasRenderer.ts
import { Board } from '../models/Board';
import { Piece } from '../models/Piece';

// 🔹 Global cache for piece images
const pieceImages: Record<string, HTMLImageElement> = {};

export function loadPieceImage(type: string, color: string): HTMLImageElement {
  const key = `${type}_${color}`;
  if (!pieceImages[key]) {
    const img = new Image();
    img.src = `./src/assets/${type}_${color.toLowerCase()}.png`;
    pieceImages[key] = img;
  }
  return pieceImages[key];
}

export class CanvasRenderer {
  public ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  public size: number; // hex size

  constructor(canvas: HTMLCanvasElement, size = 30) {
    this.ctx = canvas.getContext('2d')!;
    this.width = canvas.width;
    this.height = canvas.height;
    this.size = size;
  }

  clear() {
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.restore();
  }

  // Convert axial (q,r) → pixel (x,y)
  public hexToPixel(q: number, r: number) {
    const dpr = window.devicePixelRatio || 1;
    const centerX = this.width / dpr / 2;
    const centerY = this.height / dpr / 2;
    const x = Math.sqrt(3) * this.size * (q + r / 2) + centerX;
    const y = (3 / 2) * this.size * r + centerY;
    return { x, y };
  }

  drawBoard(board: Board, hoveredHex?: { q: number; r: number } | null) {
    const radius = 6;
    for (let q = -radius; q <= radius; q++) {
      for (let r = -radius; r <= radius; r++) {
        if (Math.abs(q + r) <= radius) {
          const { x, y } = this.hexToPixel(q, r);
          if (hoveredHex && hoveredHex.q === q && hoveredHex.r === r) {
            this.drawHexCustom(x, y, this.size, '#ffe066');
          } else {
            this.drawHexCustom(x, y, this.size);
          }
        }
      }
    }
    // Draw all pieces
    board.pieces.forEach(piece => this.drawPiece(piece));
  }

  drawHexCustom(x: number, y: number, size: number, fill: string = '#ddd') {
    this.ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = Math.PI / 3 * i + Math.PI / 6;
      const px = x + size * Math.cos(angle);
      const py = y + size * Math.sin(angle);
      if (i === 0) this.ctx.moveTo(px, py);
      else this.ctx.lineTo(px, py);
    }
    this.ctx.closePath();
    this.ctx.strokeStyle = '#333';
    this.ctx.stroke();
    this.ctx.fillStyle = fill;
    this.ctx.fill();
  }

  drawPiece(piece: Piece) {
    const { q, r } = piece.position;
    const { x, y } = this.hexToPixel(q, r);
    const size = this.size;

    // normalize typeKey
    let typeKey = piece.constructor.name.toLowerCase();
    if (typeKey.includes("queen")) typeKey = "bee";
    else if (typeKey.includes("beetle")) typeKey = "beetle";
    else if (typeKey.includes("spider")) typeKey = "spider";
    else if (typeKey.includes("grass")) typeKey = "hopper";
    else if (typeKey.includes("ant")) typeKey = "ant";

    // 🔹 load from cache
    const img = loadPieceImage(typeKey, piece.owner);

    this.ctx.drawImage(
      img,
      x - size * 0.9,
      y - size * 0.9,
      size * 1.8,
      size * 1.8
    );
  }
}

