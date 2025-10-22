// // CanvasRenderer.ts
// import { Board } from '../models/Board';
// import { Piece } from '../models/Piece';

// // 🔹 Global cache for piece images
// const pieceImages: Record<string, HTMLImageElement> = {};

// export function loadPieceImage(type: string, color: string): HTMLImageElement {
//   const key = `${type}_${color}`;
//   if (!pieceImages[key]) {
//     const img = new Image();
//     img.src = `./src/assets/${type}_${color.toLowerCase()}.png`;
//     pieceImages[key] = img;
//   }
//   return pieceImages[key];
// }

// export class CanvasRenderer {
//   public ctx: CanvasRenderingContext2D;
//   private width: number;
//   private height: number;
//   private size: number; // hex size

//   constructor(canvas: HTMLCanvasElement, size = 30) {
//     this.ctx = canvas.getContext('2d')!;
//     this.width = canvas.width;
//     this.height = canvas.height;
//     this.size = size;
//     // const dpr = window.devicePixelRatio || 1;
//     // this.width = canvas.width / dpr;
//     // this.height = canvas.height / dpr;
//   }

//   clear() {
//     this.ctx.save();
//     this.ctx.setTransform(1, 0, 0, 1, 0, 0);
//     this.ctx.fillStyle = '#000000';
//     this.ctx.fillRect(0, 0, this.width, this.height);
//     this.ctx.restore();
//   }

//   // Convert axial (q,r) → pixel (x,y)
//   public hexToPixel(q: number, r: number) {
//     const dpr = window.devicePixelRatio || 1;
//     const centerX = this.width / dpr / 2;
//     const centerY = this.height / dpr / 2;
//     const x = Math.sqrt(3) * this.size * (q + r / 2) + centerX;
//     const y = (3 / 2) * this.size * r + centerY;
//     return { x, y };
//   }

//   drawBoard(board: Board, hoveredHex?: { q: number; r: number } | null) {
//     const radius = 6;

//     // --- 1. Draw the hex grid ---
//     for (let q = -radius; q <= radius; q++) {
//       for (let r = -radius; r <= radius; r++) {
//         if (Math.abs(q + r) <= radius) {
//           const { x, y } = this.hexToPixel(q, r);
//           const isHovered = hoveredHex && hoveredHex.q === q && hoveredHex.r === r;
//           this.drawHexCustom(x, y, this.size, isHovered ? '#ffe066' : undefined);
//         }
//       }
//     }

//     // --- 2. Group pieces by stack position ---
//     const stacksByCoord = new Map<string, Piece[]>();

//     for (const piece of board.pieces) {
//       const key = `${piece.position.q},${piece.position.r}`;
//       if (!stacksByCoord.has(key)) {
//         stacksByCoord.set(key, []);
//       }
//       stacksByCoord.get(key)!.push(piece);
//     }

//     // --- 3. Draw pieces from bottom to top of each stack ---
//     for (const stack of stacksByCoord.values()) {
//       // Optional: sort by a `stackLevel` property if you track it
//       stack.sort((a, b) => a.stackLevel - b.stackLevel);
//       for (const piece of stack) {
//         this.drawPiece(piece);
//       }
//     }
//   }

//   drawHexCustom(x: number, y: number, size: number, fill: string = '#ddd') {
//     this.ctx.beginPath();
//     for (let i = 0; i < 6; i++) {
//       const angle = Math.PI / 3 * i + Math.PI / 6;
//       const px = x + size * Math.cos(angle);
//       const py = y + size * Math.sin(angle);
//       if (i === 0) this.ctx.moveTo(px, py);
//       else this.ctx.lineTo(px, py);
//     }
//     this.ctx.closePath();
//     this.ctx.strokeStyle = '#333';
//     this.ctx.stroke();
//     this.ctx.fillStyle = fill;
//     this.ctx.fill();
//   }

//   drawPiece(piece: Piece) {
//     const { q, r } = piece.position;
//     const { x, y } = this.hexToPixel(q, r);
//     const size = this.size;

//     // normalize typeKey
//     let typeKey = piece.constructor.name.toLowerCase();
//     if (typeKey.includes("queen")) typeKey = "bee";
//     else if (typeKey.includes("beetle")) typeKey = "beetle";
//     else if (typeKey.includes("spider")) typeKey = "spider";
//     else if (typeKey.includes("grass")) typeKey = "hopper";
//     else if (typeKey.includes("ant")) typeKey = "ant";

//     // 🔹 load from cache
//     const img = loadPieceImage(typeKey, piece.owner);

//     this.ctx.drawImage(
//       img,
//       x - size * 0.9,
//       y - size * 0.9,
//       size * 1.8,
//       size * 1.8
//     );
//   }
// }

// CanvasRenderer.ts
import { Board } from '../models/Board';
import { Piece } from '../models/Piece';

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
  public hexToPixel(q: number, r: number) {
    const centerX = this.logicalWidth / 2;
    const centerY = this.logicalHeight / 2;
    const x = Math.sqrt(3) * this.size * (q + r / 2) + centerX;
    const y = (3 / 2) * this.size * r + centerY;
    return { x, y };
  }

  drawBoard(board: Board, hoveredHex?: { q: number; r: number } | null) {
    const radius = 6;

    // --- 1. Draw the hex grid ---
    for (let q = -radius; q <= radius; q++) {
      for (let r = -radius; r <= radius; r++) {
        if (Math.abs(q + r) <= radius) {
          const { x, y } = this.hexToPixel(q, r);
          const isHovered = hoveredHex && hoveredHex.q === q && hoveredHex.r === r;
          this.drawHexCustom(x, y, this.size, isHovered ? '#ffe066' : undefined);
        }
      }
    }

    // --- 2. Group pieces by stack position ---
    const stacksByCoord = new Map<string, Piece[]>();

    for (const piece of board.pieces) {
      const key = `${piece.position.q},${piece.position.r}`;
      if (!stacksByCoord.has(key)) {
        stacksByCoord.set(key, []);
      }
      stacksByCoord.get(key)!.push(piece);
    }

    // --- 3. Draw pieces from bottom to top of each stack ---
    for (const stack of stacksByCoord.values()) {
      stack.sort((a, b) => a.stackLevel - b.stackLevel);
      for (const piece of stack) {
        this.drawPiece(piece);
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
