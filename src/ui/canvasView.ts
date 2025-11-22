// src/ui/canvasView.ts
import { CanvasRenderer } from "../game/CanvasRenderer";

export function setupCanvas(
  canvasId: string,
  width: number,
  height: number,
  hexSize: number
) {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
  if (!canvas) throw new Error(`Canvas #${canvasId} not found`);

  // DPI scaling
  const dpr = window.devicePixelRatio || 1;

  canvas.width = width * dpr;
  canvas.height = height * dpr;

  canvas.style.width = width + "px";
  canvas.style.height = height + "px";

  // Create renderer
  const renderer = new CanvasRenderer(canvas, hexSize);

  // Apply scaling to drawing context
  renderer.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  return { canvas, renderer, dpr };
}
