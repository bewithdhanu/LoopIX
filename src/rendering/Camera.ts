import { CELL_SIZE, GRID_SIZE } from '../constants';

export class Camera {
  centerX: number = 0;
  centerY: number = 0;
  targetX: number = 0;
  targetY: number = 0;
  scale: number = CELL_SIZE;
  canvasW: number = 0;
  canvasH: number = 0;

  update(lerp: number): void {
    this.centerX += (this.targetX - this.centerX) * lerp;
    this.centerY += (this.targetY - this.centerY) * lerp;
  }

  follow(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
  }

  worldToScreen(wx: number, wy: number): { sx: number; sy: number } {
    return {
      sx: (wx - this.centerX) * this.scale + this.canvasW / 2,
      sy: (wy - this.centerY) * this.scale + this.canvasH / 2,
    };
  }

  getVisibleBounds(): { minX: number; maxX: number; minY: number; maxY: number } {
    const halfW = this.canvasW / 2 / this.scale;
    const halfH = this.canvasH / 2 / this.scale;
    return {
      minX: Math.max(0, Math.floor(this.centerX - halfW) - 1),
      maxX: Math.min(GRID_SIZE - 1, Math.ceil(this.centerX + halfW) + 1),
      minY: Math.max(0, Math.floor(this.centerY - halfH) - 1),
      maxY: Math.min(GRID_SIZE - 1, Math.ceil(this.centerY + halfH) + 1),
    };
  }
}
