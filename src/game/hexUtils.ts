// Convert pixel coordinates (physical pixels) to axial hex coordinates
export function pixelToHex(x: number, y: number, hexSize: number) {
  // Convert physical pixels to logical hex coordinates
  const q = ((Math.sqrt(3) / 3) * (x / hexSize) - (1 / 3) * (y / hexSize));
  const r = ((2 / 3) * (y / hexSize));
  return hexRound({ q, r });
}

// Round fractional axial coordinates to nearest hex
export function hexRound(hex: { q: number; r: number }) {
  let q = Math.round(hex.q);
  let r = Math.round(hex.r);
  let s = Math.round(-hex.q - hex.r);

  const q_diff = Math.abs(q - hex.q);
  const r_diff = Math.abs(r - hex.r);
  const s_diff = Math.abs(s - (-hex.q - hex.r));

  if (q_diff > r_diff && q_diff > s_diff) q = -r - s;
  else if (r_diff > s_diff) r = -q - s;

  return { q, r };
}

// Convert axial hex coordinates to pixel coordinates (logical)
export function hexToPixel(q: number, r: number, hexSize: number) {
  const x = hexSize * Math.sqrt(3) * (q + r/2);
  const y = hexSize * 3/2 * r;
  return { x, y };
}
