import { Grid } from '../core/Grid';
import { Entity } from '../entities/Entity';
import { CellType } from '../types';
import { GRID_SIZE, MINIMAP_SIZE } from '../constants';

export class MinimapRenderer {
  private offscreen: OffscreenCanvas;
  private offCtx: OffscreenCanvasRenderingContext2D;
  private frameCount = 0;

  constructor() {
    this.offscreen = new OffscreenCanvas(MINIMAP_SIZE, MINIMAP_SIZE);
    this.offCtx = this.offscreen.getContext('2d')!;
  }

  draw(
    ctx: CanvasRenderingContext2D,
    grid: Grid,
    entities: Entity[],
    playerX: number,
    playerY: number,
    canvasW: number,
    canvasH: number
  ): void {
    this.frameCount++;
    if (this.frameCount % 6 === 0) {
      this.redraw(grid, entities);
    }

    const pad = 12;
    const x = canvasW - MINIMAP_SIZE - pad;
    const y = canvasH - MINIMAP_SIZE - pad;

    // Background border
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x - 2, y - 2, MINIMAP_SIZE + 4, MINIMAP_SIZE + 4);

    ctx.drawImage(this.offscreen, x, y);

    // Player dot
    const px = x + (playerX / GRID_SIZE) * MINIMAP_SIZE;
    const py = y + (playerY / GRID_SIZE) * MINIMAP_SIZE;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  private redraw(grid: Grid, entities: Entity[]): void {
    const ctx = this.offCtx;
    const ms = MINIMAP_SIZE;
    const gs = GRID_SIZE;
    const ratio = gs / ms;

    // Build color lookup
    const colorMap = new Map<number, string>();
    for (const e of entities) colorMap.set(e.id, e.color);

    const imageData = ctx.createImageData(ms, ms);
    const buf = imageData.data;

    for (let py = 0; py < ms; py++) {
      for (let px = 0; px < ms; px++) {
        const gx = Math.floor(px * ratio);
        const gy = Math.floor(py * ratio);
        const raw = grid.getRawData()[gy * gs + gx];
        const type = raw & 0x3;
        const owner = raw >> 2;
        const idx = (py * ms + px) * 4;

        if (type === CellType.Empty || owner === 0) {
          buf[idx] = 26; buf[idx+1] = 26; buf[idx+2] = 46; buf[idx+3] = 255;
        } else {
          const color = colorMap.get(owner) ?? '#888';
          const n = parseInt(color.slice(1), 16);
          buf[idx]   = (n >> 16) & 0xff;
          buf[idx+1] = (n >> 8) & 0xff;
          buf[idx+2] = n & 0xff;
          buf[idx+3] = 255;
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }
}
