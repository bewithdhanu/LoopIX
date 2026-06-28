import type { Camera } from './Camera';
import type { Grid } from '../core/Grid';
import type { Entity } from '../entities/Entity';
import { CellType } from '../types';
import { GRID_SIZE } from '../constants';

const GS = GRID_SIZE;

export class GridRenderer {
  // Draw directly to screen canvas for visible bounds — no offscreen cache, trails always current
  draw(ctx: CanvasRenderingContext2D, camera: Camera, grid: Grid, entities: Entity[]): void {
    const { minX, maxX, minY, maxY } = camera.getVisibleBounds();
    const data = grid.getRawData();
    const cs = camera.scale;
    const now = performance.now() * 0.001;

    // Build owner → color maps
    const colorMap = new Map<number, string>();
    const trailMap = new Map<number, string>();
    for (const e of entities) {
      colorMap.set(e.id, e.color);
      trailMap.set(e.id, e.trailColor);
    }

    // Subtle background grid lines (every 4 cells)
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 0.5;
    const { sx: bx0, sy: by0 } = camera.worldToScreen(0, 0);
    const { sx: bx1, sy: by1 } = camera.worldToScreen(GS, GS);
    const gridStep = 4;
    for (let gx = Math.ceil(minX / gridStep) * gridStep; gx <= maxX; gx += gridStep) {
      const { sx } = camera.worldToScreen(gx, 0);
      ctx.beginPath(); ctx.moveTo(sx, by0); ctx.lineTo(sx, by1); ctx.stroke();
    }
    for (let gy = Math.ceil(minY / gridStep) * gridStep; gy <= maxY; gy += gridStep) {
      const { sy } = camera.worldToScreen(0, gy);
      ctx.beginPath(); ctx.moveTo(bx0, sy); ctx.lineTo(bx1, sy); ctx.stroke();
    }

    // Pass 1 — territory fills (seamless, full cell)
    for (let gy = minY; gy <= maxY; gy++) {
      for (let gx = minX; gx <= maxX; gx++) {
        const raw = data[gy * GS + gx];
        if (!raw || (raw & 0x3) !== CellType.Territory) continue;
        const owner = raw >> 2;
        const color = colorMap.get(owner);
        if (!color) continue;
        const { sx, sy } = camera.worldToScreen(gx, gy);
        ctx.fillStyle = color;
        ctx.fillRect(Math.floor(sx), Math.floor(sy), Math.ceil(cs) + 1, Math.ceil(cs) + 1);
      }
    }

    // Pass 2 — territory edge highlights (bevel effect)
    for (let gy = minY; gy <= maxY; gy++) {
      for (let gx = minX; gx <= maxX; gx++) {
        const raw = data[gy * GS + gx];
        if (!raw || (raw & 0x3) !== CellType.Territory) continue;
        const owner = raw >> 2;
        const { sx, sy } = camera.worldToScreen(gx, gy);
        const bh = Math.max(2, cs * 0.13);

        const isOwnTerr = (r: number) => (r >> 2) === owner && (r & 0x3) === CellType.Territory;
        const tOK = gy > 0 && isOwnTerr(data[(gy - 1) * GS + gx]);
        const lOK = gx > 0 && isOwnTerr(data[gy * GS + gx - 1]);
        const rOK = gx < GS - 1 && isOwnTerr(data[gy * GS + gx + 1]);
        const bOK = gy < GS - 1 && isOwnTerr(data[(gy + 1) * GS + gx]);

        if (!tOK) { ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fillRect(Math.floor(sx), Math.floor(sy), Math.ceil(cs), Math.ceil(bh)); }
        if (!lOK) { ctx.fillStyle = 'rgba(255,255,255,0.20)'; ctx.fillRect(Math.floor(sx), Math.floor(sy), Math.ceil(bh), Math.ceil(cs)); }
        if (!bOK) { ctx.fillStyle = 'rgba(0,0,0,0.32)'; ctx.fillRect(Math.floor(sx), Math.floor(sy + cs - bh), Math.ceil(cs), Math.ceil(bh)); }
        if (!rOK) { ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(Math.floor(sx + cs - bh), Math.floor(sy), Math.ceil(bh), Math.ceil(cs)); }
      }
    }

    // Pass 3 — trail cells with animated glow pulse
    const pulse = 0.65 + Math.sin(now * 3.5) * 0.35; // 0.30–1.00

    for (let gy = minY; gy <= maxY; gy++) {
      for (let gx = minX; gx <= maxX; gx++) {
        const raw = data[gy * GS + gx];
        if (!raw || (raw & 0x3) !== CellType.Trail) continue;
        const owner = raw >> 2;
        const color = colorMap.get(owner);
        const trailColor = trailMap.get(owner);
        if (!color || !trailColor) continue;

        const { sx, sy } = camera.worldToScreen(gx, gy);
        const cx = sx + cs / 2;
        const cy2 = sy + cs / 2;

        // Neighbour connectivity (trail or territory of same owner)
        const sameOwner = (r: number) => r !== 0 && (r >> 2) === owner;
        const hasR = gx < GS - 1 && sameOwner(data[gy * GS + gx + 1]);
        const hasL = gx > 0     && sameOwner(data[gy * GS + gx - 1]);
        const hasB = gy < GS - 1 && sameOwner(data[(gy + 1) * GS + gx]);
        const hasT = gy > 0     && sameOwner(data[(gy - 1) * GS + gx]);

        const strip = Math.ceil(cs * 0.36);
        const half = strip / 2;

        // Outer glow halo
        ctx.fillStyle = color + '2a';
        ctx.fillRect(Math.floor(sx), Math.floor(sy), Math.ceil(cs), Math.ceil(cs));

        // Trail core strips
        ctx.fillStyle = trailColor;
        if (hasL || hasR) ctx.fillRect(Math.floor(sx), Math.floor(cy2 - half), Math.ceil(cs), Math.ceil(strip));
        if (hasT || hasB) ctx.fillRect(Math.floor(cx - half), Math.floor(sy), Math.ceil(strip), Math.ceil(cs));
        if (!hasL && !hasR && !hasT && !hasB) {
          ctx.fillRect(Math.floor(cx - half), Math.floor(cy2 - half), Math.ceil(strip), Math.ceil(strip));
        }

        // Animated bright centre line
        const lineW = Math.max(2, cs * 0.13);
        const lh = lineW / 2;
        const br = Math.floor(180 + 75 * pulse);
        ctx.fillStyle = `rgba(${br},${br},${br},${0.45 + pulse * 0.35})`;
        if (hasL || hasR) ctx.fillRect(Math.floor(sx), Math.floor(cy2 - lh), Math.ceil(cs), Math.ceil(lineW));
        if (hasT || hasB) ctx.fillRect(Math.floor(cx - lh), Math.floor(sy), Math.ceil(lineW), Math.ceil(cs));
        if (!hasL && !hasR && !hasT && !hasB) {
          ctx.fillRect(Math.floor(cx - lh), Math.floor(cy2 - lh), Math.ceil(lineW), Math.ceil(lineW));
        }
      }
    }

    // Map border with subtle glow
    ctx.shadowColor = 'rgba(255,255,255,0.4)';
    ctx.shadowBlur = 8;
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx0 + 1, by0 + 1, bx1 - bx0 - 2, by1 - by0 - 2);
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
  }
}
