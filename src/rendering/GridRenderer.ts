import { Grid } from '../core/Grid';
import { Entity } from '../entities/Entity';
import { Camera } from './Camera';
import { CellType } from '../types';
import { CELL_SIZE, GRID_SIZE } from '../constants';

export class GridRenderer {
  private offscreen: OffscreenCanvas;
  private offCtx: OffscreenCanvasRenderingContext2D;
  private dirty = true;

  constructor() {
    const size = GRID_SIZE * CELL_SIZE;
    this.offscreen = new OffscreenCanvas(size, size);
    this.offCtx = this.offscreen.getContext('2d')!;
  }

  markDirty(): void { this.dirty = true; }

  draw(ctx: CanvasRenderingContext2D, camera: Camera, grid: Grid, entities: Entity[]): void {
    if (this.dirty) {
      this.redrawFull(grid, entities);
      this.dirty = false;
    }

    // Blit offscreen to main canvas with camera transform
    const { minX, maxX, minY, maxY } = camera.getVisibleBounds();
    const { sx: x0, sy: y0 } = camera.worldToScreen(minX, minY);

    ctx.drawImage(
      this.offscreen,
      minX * CELL_SIZE, minY * CELL_SIZE,
      (maxX - minX + 1) * CELL_SIZE, (maxY - minY + 1) * CELL_SIZE,
      x0, y0,
      (maxX - minX + 1) * camera.scale, (maxY - minY + 1) * camera.scale
    );
  }

  private redrawFull(grid: Grid, entities: Entity[]): void {
    const ctx = this.offCtx;
    const cs = CELL_SIZE;
    const gs = GRID_SIZE;

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, gs * cs, gs * cs);

    // Draw grid lines (subtle)
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= gs; x++) {
      ctx.beginPath(); ctx.moveTo(x * cs, 0); ctx.lineTo(x * cs, gs * cs); ctx.stroke();
    }
    for (let y = 0; y <= gs; y++) {
      ctx.beginPath(); ctx.moveTo(0, y * cs); ctx.lineTo(gs * cs, y * cs); ctx.stroke();
    }

    // Build color lookup from entities
    const colorMap = new Map<number, { territory: string; trail: string }>();
    for (const e of entities) {
      colorMap.set(e.id, { territory: e.color, trail: e.trailColor });
    }

    const data = grid.getRawData();
    let currentColor = '';

    for (let i = 0; i < data.length; i++) {
      const raw = data[i];
      if (raw === 0) continue;

      const type = raw & 0x3;
      const owner = raw >> 2;
      const colors = colorMap.get(owner);
      if (!colors) continue;

      const x = (i % gs) * cs;
      const y = Math.floor(i / gs) * cs;

      const color = type === CellType.Territory ? colors.territory : colors.trail;
      if (color !== currentColor) {
        ctx.fillStyle = color;
        currentColor = color;
      }

      if (type === CellType.Territory) {
        ctx.fillRect(x, y, cs, cs);
        // Border effect
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(x, y, cs, 1);
        ctx.fillRect(x, y, 1, cs);
        ctx.fillStyle = color;
        currentColor = color;
      } else {
        // Trail: slightly smaller rect for visibility
        ctx.fillRect(x + 2, y + 2, cs - 4, cs - 4);
      }
    }

    // Grid border
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, gs * cs, gs * cs);
  }
}
