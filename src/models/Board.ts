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
  
  isHiveIntact(movingPiece: Piece, pos: HexCoord): boolean {
    if (this.pieces.length <= 1) return true;

    // Build a map of positions to pieces at that position
    const stacks = new Map<string, Piece[]>();
    for (const p of this.pieces) {
      const key = `${p.position.q},${p.position.r}`;
      if (!stacks.has(key)) stacks.set(key, []);
      stacks.get(key)!.push(p);
    }

    // Simulate moving the piece to the new position
    const oldKey = `${movingPiece.position.q},${movingPiece.position.r}`;
    const newKey = `${pos.q},${pos.r}`;

    // Remove from old position stack
    if (stacks.has(oldKey)) {
      stacks.set(oldKey, stacks.get(oldKey)!.filter(p => p !== movingPiece));
      if (stacks.get(oldKey)!.length === 0) {
        stacks.delete(oldKey);
      }
    }

    // Add to new position stack
    if (!stacks.has(newKey)) stacks.set(newKey, []);
    stacks.get(newKey)!.push(movingPiece);

    // Get all positions with a visible (top) piece
    const remaining = Array.from(stacks.entries())
      .map(([key, stack]) => ({ key, top: stack[stack.length - 1] }))
      .map(({ key }) => key);

    if (remaining.length === 0) return true;

    // Flood fill connectivity check
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

    return visited.size === remaining.length;
  }


  stackHeight(coord: HexCoord): number {
    return this.pieces.filter(
      p => p.position.q === coord.q && p.position.r === coord.r
    ).length;
  }

  getStackAt(coord: HexCoord): Piece[] {
    return this.pieces
      .filter(p => p.position.q === coord.q && p.position.r === coord.r)
      .sort((a, b) => a.stackLevel - b.stackLevel); // lowest to highest
  }

  updateStackLevelsAt(coord: HexCoord): number {
    const stack = this.getStackAt(coord);
    return stack.length; // place it on top
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

  allCoordsAroundHive(): HexCoord[] {
    const coords = new Set<string>();
    for (const p of this.pieces) {
      const top = this.topPieceAt(this, p.position);
      if (!top) continue;

      for (const n of this.neighbors(p.position)) {
        if (this.isEmpty(n)) {
          coords.add(`${n.q},${n.r}`);
        }
      }
    }
    return Array.from(coords).map(s => {
      const [q, r] = s.split(',').map(Number);
      return { q, r };
    });
  }

  isTopPiece(piece: Piece, board: Board): boolean {
    const stack = board.getStackAt(piece.position);
    return stack.length > 0 && stack[stack.length - 1] === piece;
  }

  topPieceAt(board: Board, coord: { q: number; r: number }): Piece | null {
    const stack = board.getStackAt(coord); // get all pieces at this hex
    if (!stack || stack.length === 0) return null; // empty hex
    return stack[stack.length - 1]; // topmost piece
  }

}