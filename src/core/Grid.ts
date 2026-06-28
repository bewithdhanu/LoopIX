import { GRID_SIZE } from '../constants';
import { CellType } from '../types';

// Each cell: bits[1:0] = CellType, bits[15:2] = ownerId (0 = unowned)
export class Grid {
  private data: Uint16Array;

  // Scratch buffers for flood-fill (reused to avoid GC)
  readonly exterior: Uint8Array;
  readonly bfsQueue: Int32Array;

  constructor() {
    this.data = new Uint16Array(GRID_SIZE * GRID_SIZE);
    this.exterior = new Uint8Array(GRID_SIZE * GRID_SIZE);
    this.bfsQueue = new Int32Array(GRID_SIZE * GRID_SIZE);
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE;
  }

  private idx(x: number, y: number): number {
    return y * GRID_SIZE + x;
  }

  getRaw(x: number, y: number): number {
    return this.data[this.idx(x, y)];
  }

  getType(x: number, y: number): CellType {
    return (this.data[this.idx(x, y)] & 0x3) as CellType;
  }

  getOwner(x: number, y: number): number {
    return this.data[this.idx(x, y)] >> 2;
  }

  set(x: number, y: number, ownerId: number, type: CellType): void {
    this.data[this.idx(x, y)] = (ownerId << 2) | type;
  }

  clear(x: number, y: number): void {
    this.data[this.idx(x, y)] = 0;
  }

  setTerritory(x: number, y: number, ownerId: number): void {
    this.set(x, y, ownerId, CellType.Territory);
  }

  setTrail(x: number, y: number, ownerId: number): void {
    this.set(x, y, ownerId, CellType.Trail);
  }

  clearOwner(ownerId: number, cells: { x: number; y: number }[]): void {
    for (const c of cells) {
      if (this.getOwner(c.x, c.y) === ownerId) {
        this.clear(c.x, c.y);
      }
    }
  }

  // Clear ALL cells belonging to ownerId (for full death cleanup)
  clearAllOwner(ownerId: number): void {
    for (let i = 0; i < this.data.length; i++) {
      if ((this.data[i] >> 2) === ownerId) {
        this.data[i] = 0;
      }
    }
  }

  reset(): void {
    this.data.fill(0);
  }

  getRawData(): Uint16Array {
    return this.data;
  }
}
