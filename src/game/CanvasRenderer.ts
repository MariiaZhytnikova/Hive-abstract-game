// CanvasRenderer.ts
import { Board } from '../models/Board';
import { Piece } from '../models/Piece';
import { hexRound } from "../game/hexUtils";

// 🔹 Global cache for piece images
const pieceImages: Record<string, HTMLImageElement> = {};

function getAssetPath(filename: string): string {
  // For local development, assets are served from public/
  // For production, they'll be served from the base URL
  const base = import.meta.env.BASE_URL || '/';
  const fullPath = `${base}assets/${filename}`;
  console.log('Loading asset:', fullPath); // Debug log
  return fullPath;
}

export function loadPieceImage(type: string, color: string): HTMLImageElement {
  const key = `${type}_${color}`;
  if (!pieceImages[key]) {
    const img = new Image();
    img.src = getAssetPath(`${type}_${color.toLowerCase()}.png`);
    pieceImages[key] = img;
  }
  return pieceImages[key];
}

export class CanvasRenderer {
  public ctx: CanvasRenderingContext2D;
  private logicalWidth: number;   // CSS pixels
  private logicalHeight: number;  // CSS pixels
  private physicalWidth: number;  // device pixels (canvas.width)
  private physicalHeight: number; // device pixels (canvas.height)
  public size: number;            // hex size in logical (CSS) pixels

  // Camera for board
  public cameraQ = 0;
  public cameraR = 0;

  get width() {
    return this.logicalWidth;
  }

  get height() {
    return this.logicalHeight;
  }

  constructor(canvas: HTMLCanvasElement, size = 30) {
    this.ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    this.physicalWidth = canvas.width;   // width * dpr
    this.physicalHeight = canvas.height; // height * dpr
    this.logicalWidth = canvas.width / dpr;
    this.logicalHeight = canvas.height / dpr;
    this.size = size; // logical pixels
  }

  clear() {
    // Reset transform to identity and clear using PHYSICAL sizes
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.physicalWidth, this.physicalHeight);
    this.ctx.restore();
  }

  // Convert axial (q,r) → pixel (logical x,y)
  // returns logical coordinates (to be used with scaled context)
  // public hexToPixel(q: number, r: number) {
  //   const centerX = this.logicalWidth / 2;
  //   const centerY = this.logicalHeight / 2;
  //   const x = Math.sqrt(3) * this.size * (q + r / 2) + centerX;
  //   const y = (3 / 2) * this.size * r + centerY;
  //   return { x, y };
  // }

  public hexToPixel(q: number, r: number) {
    const centerX = this.logicalWidth / 2;
    const centerY = this.logicalHeight / 2;

    // 👇 CAMERA OFFSET APPLIED HERE
    const dq = q - this.cameraQ;
    const dr = r - this.cameraR;

    const x = Math.sqrt(3) * this.size * (dq + dr / 2) + centerX;
    const y = (3 / 2) * this.size * dr + centerY;
    return { x, y };
  }

  public pixelToHex(x: number, y: number) {
    const centerX = this.logicalWidth / 2;
    const centerY = this.logicalHeight / 2;

    // Convert screen -> board space
    const px = x - centerX;
    const py = y - centerY;

    const q = (Math.sqrt(3)/3 * px - 1/3 * py) / this.size;
    const r = (2/3 * py) / this.size;

    // Apply camera BACK
    return hexRound({
      q: q + this.cameraQ,
      r: r + this.cameraR
    });
  }

  public hexToPixelStatic(q: number, r: number) {
  const centerX = this.logicalWidth / 2;
  const centerY = this.logicalHeight / 2;

  const x = Math.sqrt(3) * this.size * (q + r / 2) + centerX;
  const y = (3 / 2) * this.size * r + centerY;

  return { x, y };
  }

  // drawBoard(board: Board, hoveredHex?: { q: number; r: number } | null) {
  //   const radius = 9;

  //   // --- 1. Draw the hex grid ---
  //   for (let q = -radius; q <= radius; q++) {
  //     for (let r = -radius; r <= radius; r++) {
  //       if (Math.abs(q + r) <= radius) {
  //         const { x, y } = this.hexToPixel(q, r);
  //         const isHovered = hoveredHex && hoveredHex.q === q && hoveredHex.r === r;
  //         this.drawHexCustom(x, y, this.size, isHovered ? '#ffe066' : undefined);
  //       }
  //     }
  //   }

  //   // --- 2. Group pieces by stack position ---
  //   const stacksByCoord = new Map<string, Piece[]>();

  //   for (const piece of board.pieces) {
  //     const key = `${piece.position.q},${piece.position.r}`;
  //     if (!stacksByCoord.has(key)) {
  //       stacksByCoord.set(key, []);
  //     }
  //     stacksByCoord.get(key)!.push(piece);
  //   }

  //   // --- 3. Draw pieces from bottom to top of each stack ---
  //   for (const stack of stacksByCoord.values()) {
  //     stack.sort((a, b) => a.stackLevel - b.stackLevel);
  //     for (const piece of stack) {
  //       this.drawPiece(piece);
  //     }
  //   }
  // }

drawBoard(board: Board, hoveredHex?: { q: number; r: number } | null) {
  const radius = 9;

  // --- 1. Draw the hex grid (STATIC) ---
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      if (Math.abs(q + r) <= radius) {
        const { x, y } = this.hexToPixelStatic(q, r);

        const worldQ = q + this.cameraQ;
        const worldR = r + this.cameraR;

        const isHovered =
          hoveredHex &&
          hoveredHex.q === worldQ &&
          hoveredHex.r === worldR;

        this.drawHexCustom(
          x,
          y,
          this.size,
          isHovered ? "#ffe066" : undefined
        );
      }
    }
  }

  // --- 2. Draw pieces (CAMERA APPLIED) ---
  const stacksByCoord = new Map<string, Piece[]>();

  for (const piece of board.pieces) {
    const key = `${piece.position.q},${piece.position.r}`;
    if (!stacksByCoord.has(key)) stacksByCoord.set(key, []);
    stacksByCoord.get(key)!.push(piece);
  }

  for (const stack of stacksByCoord.values()) {
    stack.sort((a, b) => a.stackLevel - b.stackLevel);
    for (const piece of stack) {
      this.drawPiece(piece); // uses hexToPixel (with camera)
    }
  }
}


  drawHexCustom(x: number, y: number, size: number, fill: string = '#ddd') {
    this.ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = Math.PI / 3 * i + Math.PI / 6; // pointy-top
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

    // Use piece.type directly for better reliability
    const typeKey = piece.type || piece.constructor.name.toLowerCase();

    const img = loadPieceImage(typeKey, piece.owner);

    // Only draw if image is loaded successfully, otherwise leave empty space
    if (img.complete && img.naturalWidth > 0) {
      this.ctx.drawImage(
        img,
        x - size * 0.9,
        y - size * 0.9,
        size * 1.8,
        size * 1.8
      );
    }
    // If image isn't loaded, just don't draw anything (empty space)
  }
}
