import type { HexCoord, Piece } from "./Piece";

export class Board {
  pieces: Piece[] = [];

  // Add piece to board
  addPiece(piece: Piece, coord: HexCoord): void {
    // update the piece’s internal position first
    piece.position = coord;
    // then store it on the board
    this.pieces.push(piece);
  }

  isEmpty(pos: HexCoord): boolean {
    return !this.pieces.some(p => p.position.q === pos.q && p.position.r === pos.r);
  }

  // Returns all neighbors of a hex (axial coordinates)
  neighbors(pos: HexCoord): HexCoord[] {
    const deltas = [
      { q: +1, r: 0 },
      { q: -1, r: 0 },
      { q: 0, r: +1 },
      { q: 0, r: -1 },
      { q: +1, r: -1 },
      { q: -1, r: +1 },
    ];

    return deltas.map(d => ({ q: pos.q + d.q, r: pos.r + d.r }));
  }

  // Check if moving a piece would break the hive
  isHiveIntact(from: HexCoord): boolean {
    // Simple rule: if there’s 1 or 0 pieces, hive is intact
    if (this.pieces.length <= 1) return true;

    // Build a set of all positions except `from`
    const remaining = this.pieces
      .filter(p => p.position.q !== from.q || p.position.r !== from.r)
      .map(p => `${p.position.q},${p.position.r}`);

    if (remaining.length === 0) return true;

    // Perform a BFS/DFS from first remaining piece
    const visited = new Set<string>();
    const stack = [remaining[0]];

    while (stack.length > 0) {
      const current = stack.pop()!;
      if (visited.has(current)) continue;
      visited.add(current);

      const [q, r] = current.split(',').map(Number);
      this.neighbors({ q, r }).forEach(n => {
        const key = `${n.q},${n.r}`;
        if (remaining.includes(key) && !visited.has(key)) {
          stack.push(key);
        }
      });
    }

    // If visited all remaining pieces, hive is intact
    return visited.size === remaining.length;
  }

  stackHeight(coord: HexCoord): number {
    return this.pieces.filter(
      p => p.position.q === coord.q && p.position.r === coord.r
    ).length;
  }

   /**
   * Return the 6 hex directions as axial coordinate deltas
   */
  directions(): HexCoord[] {
    return [
      { q: 1,  r: 0 },  // east
      { q: 1,  r: -1 }, // northeast
      { q: 0,  r: -1 }, // northwest
      { q: -1, r: 0 },  // west
      { q: -1, r: 1 },  // southwest
      { q: 0,  r: 1 },  // southeast
    ];
  }

  addDir(coord: HexCoord, dir: HexCoord): HexCoord {
    return { q: coord.q + dir.q, r: coord.r + dir.r };
  }

  // Returns all coordinates that are empty and potentially legal
  allEmptyHexes(): HexCoord[] {
    const hexSet = new Set<string>();
    const neighbors: HexCoord[] = [];

    // Collect all neighboring coords of existing pieces
    this.pieces.forEach(p => {
      this.neighbors(p.position).forEach(n => {
        if (this.isEmpty(n)) {
          const key = `${n.q},${n.r}`;
          if (!hexSet.has(key)) {
            hexSet.add(key);
            neighbors.push(n);
          }
        }
      });
    });

    // if no pieces yet, return just the center
    if (this.pieces.length === 0) return [{ q: 0, r: 0 }];

    return neighbors;
  }

}