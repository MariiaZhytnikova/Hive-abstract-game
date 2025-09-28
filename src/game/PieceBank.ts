import type { Player } from '../models/Piece';

export type BankPiece = {
  id: string;
  x: number;
  y: number;
  type: "bee" | "spider" | "beetle" | "hopper" | "ant";
  color: Player;
  width: number;
  height: number;
};

const pieceImages: Record<string, HTMLImageElement> = {};

export function loadPieceImage(type: BankPiece["type"], color: Player): HTMLImageElement {
  const key = `${type}_${color}`;
  if (!pieceImages[key]) {
    const img = new Image();
    img.src = `./src/assets/${type}_${color.toLowerCase()}.png`;
    pieceImages[key] = img;
  }
  return pieceImages[key];
}

export function drawPieceBanks(bankPieces: BankPiece[], ctx: CanvasRenderingContext2D) {
  bankPieces.forEach(piece => {
    const img = loadPieceImage(piece.type, piece.color);
    ctx.drawImage(
      img,
      piece.x - piece.width / 2,
      piece.y - piece.height / 2,
      piece.width,
      piece.height
    );
  });
}

export function layoutBankPositions(
  bankPieces: BankPiece[],
  canvasWidth: number,
  pieceSize: number
) {
  const leftX = 20 + pieceSize / 2;                  // центр левой колонки
  const rightX = canvasWidth - 20 - pieceSize / 2;  // центр правой колонки
  const startY = 60 + pieceSize / 2;
  const gapY = pieceSize + 10;

  let yBlack = startY;
  let yWhite = startY;

  const order = ["bee","spider","beetle","hopper","ant"];

  const blackPieces = bankPieces
    .filter(p => p.color === "Black")
    .sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));
  const whitePieces = bankPieces
    .filter(p => p.color === "White")
    .sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));

  blackPieces.forEach(p => {
    p.x = leftX;
    p.y = yBlack;
    yBlack += gapY;
  });

  whitePieces.forEach(p => {
    p.x = rightX;
    p.y = yWhite;
    yWhite += gapY;
  });
}

