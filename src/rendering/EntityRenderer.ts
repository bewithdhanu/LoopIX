import type { Camera } from './Camera';
import type { Entity } from '../entities/Entity';
import { Direction } from '../types';

const TAU = Math.PI * 2;

export class EntityRenderer {
  draw(ctx: CanvasRenderingContext2D, entities: Entity[], camera: Camera, alpha: number): void {
    const now = performance.now() * 0.001;
    for (const entity of entities) {
      if (!entity.isAlive()) continue;
      this.drawEntity(ctx, entity, camera, alpha, now);
    }
  }

  private drawEntity(
    ctx: CanvasRenderingContext2D,
    entity: Entity,
    camera: Camera,
    alpha: number,
    now: number,
  ): void {
    const ix = entity.prevX + (entity.x - entity.prevX) * alpha;
    const iy = entity.prevY + (entity.y - entity.prevY) * alpha;

    const { sx, sy } = camera.worldToScreen(ix + 0.5, iy + 0.5);
    const cs = camera.scale;
    const half = cs * 0.41;

    // Animated bob + scale pulse
    const phase = entity.id * 1.7;
    const bob = Math.sin(now * 4.2 + phase) * cs * 0.045;
    const scaleP = 1 + Math.sin(now * 2.8 + phase) * 0.028;
    const drawHalf = half * scaleP;
    const drawY = sy + bob;
    const r = drawHalf * 0.42;

    // ── Outer aura glow ──────────────────────────────────────────────────────
    const outerR = drawHalf * 2.6;
    const grd = ctx.createRadialGradient(sx, drawY, 0, sx, drawY, outerR);
    grd.addColorStop(0, entity.color + '55');
    grd.addColorStop(0.45, entity.color + '22');
    grd.addColorStop(1, entity.color + '00');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(sx, drawY, outerR, 0, TAU);
    ctx.fill();

    // ── Drop shadow ──────────────────────────────────────────────────────────
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = cs * 0.55;
    ctx.shadowOffsetX = cs * 0.08;
    ctx.shadowOffsetY = cs * 0.18;

    // ── Main body ────────────────────────────────────────────────────────────
    ctx.fillStyle = entity.color;
    this.roundRect(ctx, sx - drawHalf, drawY - drawHalf, drawHalf * 2, drawHalf * 2, r);
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // ── Glossy top-left highlight ────────────────────────────────────────────
    ctx.fillStyle = 'rgba(255,255,255,0.30)';
    this.roundRect(ctx, sx - drawHalf + cs * 0.04, drawY - drawHalf + cs * 0.04, drawHalf * 0.68, drawHalf * 0.42, r * 0.6);
    ctx.fill();

    // ── Direction face ───────────────────────────────────────────────────────
    const fLen = drawHalf * 0.52;
    const fThick = drawHalf * 0.44;
    const edge = drawHalf * 0.54;
    const d = entity.direction;

    ctx.fillStyle = entity.headColor;
    if (d === Direction.Right) this.roundRect(ctx, sx + edge - fThick * 0.5,  drawY - fLen / 2, fThick, fLen, 3);
    else if (d === Direction.Left)  this.roundRect(ctx, sx - edge - fThick * 0.5,  drawY - fLen / 2, fThick, fLen, 3);
    else if (d === Direction.Down)  this.roundRect(ctx, sx - fLen / 2, drawY + edge - fThick * 0.5, fLen, fThick, 3);
    else                            this.roundRect(ctx, sx - fLen / 2, drawY - edge - fThick * 0.5, fLen, fThick, 3);
    ctx.fill();

    // ── Eyes (two circles facing direction) ──────────────────────────────────
    if (cs >= 9) {
      const eyeR = Math.max(1.5, cs * 0.072);
      const eOff = drawHalf * 0.24;
      const eFwd = drawHalf * 0.44;

      let ex1 = sx, ey1 = drawY, ex2 = sx, ey2 = drawY;
      if (d === Direction.Right) {
        ex1 = sx + eFwd; ey1 = drawY - eOff;
        ex2 = sx + eFwd; ey2 = drawY + eOff;
      } else if (d === Direction.Left) {
        ex1 = sx - eFwd; ey1 = drawY - eOff;
        ex2 = sx - eFwd; ey2 = drawY + eOff;
      } else if (d === Direction.Down) {
        ex1 = sx - eOff; ey1 = drawY + eFwd;
        ex2 = sx + eOff; ey2 = drawY + eFwd;
      } else {
        ex1 = sx - eOff; ey1 = drawY - eFwd;
        ex2 = sx + eOff; ey2 = drawY - eFwd;
      }

      // White sclera
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(ex1, ey1, eyeR, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(ex2, ey2, eyeR, 0, TAU); ctx.fill();
      // Black pupil
      ctx.fillStyle = '#111111';
      const pR = eyeR * 0.54;
      ctx.beginPath(); ctx.arc(ex1, ey1, pR, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(ex2, ey2, pR, 0, TAU); ctx.fill();
      // Tiny white sparkle
      ctx.fillStyle = '#ffffff';
      const sR = pR * 0.38;
      ctx.beginPath(); ctx.arc(ex1 + pR * 0.3, ey1 - pR * 0.3, sR, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(ex2 + pR * 0.3, ey2 - pR * 0.3, sR, 0, TAU); ctx.fill();
    }

    // ── Name label with pill background ─────────────────────────────────────
    if (cs >= 12) {
      const fontSize = Math.max(10, cs * 0.68);
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      const label = entity.name.slice(0, 10);
      const tw = ctx.measureText(label).width;
      const labelY = drawY - drawHalf - cs * 0.08;

      ctx.fillStyle = 'rgba(0,0,0,0.68)';
      this.roundRect(ctx, sx - tw / 2 - 6, labelY - fontSize - 4, tw + 12, fontSize + 6, 4);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, sx, labelY - 3);
      ctx.textAlign = 'left';
    }
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number,
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
}
