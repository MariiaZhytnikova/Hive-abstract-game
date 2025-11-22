// src/ui/events.ts
import { pixelToHex } from "../game/hexUtils";
import type { BankPiece } from "../game/PieceBank";

function getMousePos(evt: MouseEvent, canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  const x = (evt.clientX - rect.left);
  const y = (evt.clientY - rect.top);
  // Convert from CSS pixels to your logical coordinate system
  return { x, y };
}

export type UIEventHandlers = {
  onHexClick: (hex: { q: number; r: number }) => void;
  onBankClick: (bankPiece: BankPiece) => void;
  onHoverHex: (
    hex: { q: number; r: number } | null,
    mouse: { x: number; y: number }
  ) => void;
};

export function initUIEvents(
  canvas: HTMLCanvasElement,
  gameBank: BankPiece[],
  HEX_SIZE: number,
  handlers: UIEventHandlers
) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  // CLICK
  canvas.addEventListener("click", (e) => {
    const { x, y } = getMousePos(e, canvas);
    const centerX = width / 2;
    const centerY = height / 2;

    // BANK hit test
    for (let i = gameBank.length - 1; i >= 0; i--) {
      const b = gameBank[i];
      if (x >= b.x && x <= b.x + b.width &&
          y >= b.y && y <= b.y + b.height) {
        handlers.onBankClick(b);
        return;
      }
    }

    // BOARD click (convert pixel → hex)
    const hex = pixelToHex(x - centerX, y - centerY, HEX_SIZE);
    handlers.onHexClick(hex);
  });

  // HOVER
 canvas.addEventListener("mousemove", (e) => {
  const { x, y } = getMousePos(e, canvas);
  const centerX = width / 2;
  const centerY = height / 2;

  const hex = pixelToHex(x - centerX, y - centerY, HEX_SIZE);
  handlers.onHoverHex(hex, { x, y });   // <-- FIXED!
});

canvas.addEventListener("mouseleave", () => {
  handlers.onHoverHex(null, { x: 0, y: 0 });   // <-- pass dummy mouse values
});
}
