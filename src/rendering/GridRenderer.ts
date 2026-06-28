import { Grid } from '../core/Grid';
import { Entity } from '../entities/Entity';
import { Camera } from './Camera';
import { CellType } from '../types';
import { CELL_SIZE, GRID_SIZE } from '../constants';

const CS = CELL_SIZE;

export class GridRenderer {
  private offscreen: OffscreenCanvas;
  private offCtx: OffscreenCanvasRenderingContext2D;
  private dirty = true;

  private colorMap = new Map<number, string>();
  private trailMap = new Map<number, string>();

  constructor() {
    const size = GRID_SIZE * CS;
    this.offscreen = new OffscreenCanvas(size, size);
    this.offCtx = this.offscreen.getContext('2d')!;
  }

  markDirty(): void { this.dirty = true; }

  draw(ctx: CanvasRenderingContext2D, camera: Camera, grid: Grid, entities: Entity[]): void {
    if (this.dirty) {
      this.buildColorMaps(entities);
      this.redrawFull(grid);
      this.dirty = false;
    }

    const { minX, maxX, minY, maxY } = camera.getVisibleBounds();
    const { sx: x0, sy: y0 } = camera.worldToScreen(minX, minY);
    const srcW = (maxX - minX + 1) * CS;
    const srcH = (maxY - minY + 1) * CS;
    const dstW = (maxX - minX + 1) * camera.scale;
    const dstH = (maxY - minY + 1) * camera.scale;

    ctx.drawImage(this.offscreen, minX * CS, minY * CS, srcW, srcH, x0, y0, dstW, dstH);
  }

  private buildColorMaps(entities: Entity[]): void {
    this.colorMap.clear();
    this.trailMap.clear();
    for (const e of entities) {
      this.colorMap.set(e.id, e.color);
      this.trailMap.set(e.id, e.trailColor);
    }
  }

  private redrawFull(grid: Grid): void {
    const ctx = this.offCtx;
    const gs = GRID_SIZE;
    const data = grid.getRawData();

    // Background
    ctx.fillStyle = '#16213e';
    ctx.fillRect(0, 0, gs * CS, gs * CS);

    // Subtle background grid (every 4 cells)
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= gs; x += 4) {
      ctx.beginPath(); ctx.moveTo(x * CS, 0); ctx.lineTo(x * CS, gs * CS); ctx.stroke();
    }
    for (let y = 0; y <= gs; y += 4) {
      ctx.beginPath(); ctx.moveTo(0, y * CS); ctx.lineTo(gs * CS, y * CS); ctx.stroke();
    }

    // Pass 1: Fill territory cells fully (seamless between same-owner cells)
    let lastColor = '';
    for (let i = 0; i < data.length; i++) {
      const raw = data[i];
      if (!raw) continue;
      if ((raw & 0x3) !== CellType.Territory) continue;
      const owner = raw >> 2;
      const color = this.colorMap.get(owner);
      if (!color) continue;
      if (color !== lastColor) { ctx.fillStyle = color; lastColor = color; }
      const x = (i % gs) * CS;
      const y = Math.floor(i / gs) * CS;
      ctx.fillRect(x, y, CS, CS);
    }

    // Pass 2: Territory edge shading — highlight at edges facing empty/foreign
    for (let i = 0; i < data.length; i++) {
      const raw = data[i];
      if (!raw) continue;
      if ((raw & 0x3) !== CellType.Territory) continue;
      const owner = raw >> 2;
      const gx = i % gs;
      const gy = Math.floor(i / gs);
      const px = gx * CS;
      const py = gy * CS;

      const isOwnerTerr = (r: number) => (r >> 2) === owner && (r & 0x3) === CellType.Territory;
      const tOK = gy > 0 && isOwnerTerr(data[i - gs]);
      const lOK = gx > 0 && isOwnerTerr(data[i - 1]);
      const rOK = gx < gs - 1 && isOwnerTerr(data[i + 1]);
      const bOK = gy < gs - 1 && isOwnerTerr(data[i + gs]);

      if (!tOK) { ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(px, py, CS, 2); }
      if (!lOK) { ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(px, py, 2, CS); }
      if (!bOK) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(px, py + CS - 2, CS, 2); }
      if (!rOK) { ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(px + CS - 2, py, 2, CS); }
    }

    // Pass 3: Trail cells — glowing connected strip
    for (let i = 0; i < data.length; i++) {
      const raw = data[i];
      if (!raw) continue;
      if ((raw & 0x3) !== CellType.Trail) continue;
      const owner = raw >> 2;
      const trailColor = this.trailMap.get(owner);
      const baseColor = this.colorMap.get(owner);
      if (!trailColor || !baseColor) continue;

      const gx = i % gs;
      const gy = Math.floor(i / gs);
      const px = gx * CS;
      const py = gy * CS;

      const sameOwnerAt = (r: number) => r !== 0 && (r >> 2) === owner;
      const hasR = gx < gs - 1 && sameOwnerAt(data[i + 1]);
      const hasL = gx > 0 && sameOwnerAt(data[i - 1]);
      const hasB = gy < gs - 1 && sameOwnerAt(data[i + gs]);
      const hasT = gy > 0 && sameOwnerAt(data[i - gs]);

      const strip = Math.ceil(CS * 0.38);
      const c = Math.floor(CS / 2);

      // Glow halo
      ctx.fillStyle = baseColor + '44';
      ctx.fillRect(px, py, CS, CS);

      // Solid strip core
      ctx.fillStyle = trailColor;
      const drawH = hasL || hasR;
      const drawV = hasT || hasB;
      if (drawH) ctx.fillRect(px, py + c - strip / 2, CS, strip);
      if (drawV) ctx.fillRect(px + c - strip / 2, py, strip, CS);
      if (!drawH && !drawV) ctx.fillRect(px + c - strip / 2, py + c - strip / 2, strip, strip);

      // Bright center
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      if (drawH) ctx.fillRect(px, py + c - 1, CS, 2);
      if (drawV) ctx.fillRect(px + c - 1, py, 2, CS);
      if (!drawH && !drawV) ctx.fillRect(px + c - 1, py + c - 1, 2, 2);
    }

    // Map border
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 3;
    ctx.strokeRect(1, 1, gs * CS - 2, gs * CS - 2);
  }
}
