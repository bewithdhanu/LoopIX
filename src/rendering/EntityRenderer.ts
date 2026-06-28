import { Entity } from '../entities/Entity';
import { Camera } from './Camera';
import { Direction } from '../types';

export class EntityRenderer {
  draw(ctx: CanvasRenderingContext2D, entities: Entity[], camera: Camera, alpha: number): void {
    for (const entity of entities) {
      if (!entity.isAlive()) continue;
      this.drawEntity(ctx, entity, camera, alpha);
    }
  }

  private drawEntity(ctx: CanvasRenderingContext2D, entity: Entity, camera: Camera, alpha: number): void {
    const ix = entity.prevX + (entity.x - entity.prevX) * alpha;
    const iy = entity.prevY + (entity.y - entity.prevY) * alpha;

    const { sx, sy } = camera.worldToScreen(ix + 0.5, iy + 0.5);
    const half = camera.scale * 0.44;
    const r = half * 0.4;

    // Outer glow
    const glowRadius = half * 1.6;
    const grd = ctx.createRadialGradient(sx, sy, half * 0.3, sx, sy, glowRadius);
    grd.addColorStop(0, entity.color + 'bb');
    grd.addColorStop(1, entity.color + '00');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(sx, sy, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    // Drop shadow
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 3;

    // Main body
    ctx.fillStyle = entity.color;
    this.roundRect(ctx, sx - half, sy - half, half * 2, half * 2, r);
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Direction face highlight
    const d = entity.direction;
    const faceLen = half * 0.55;
    const faceThick = half * 0.45;
    const edge = half * 0.52;

    ctx.fillStyle = entity.headColor;
    if (d === Direction.Right) this.roundRect(ctx, sx + edge - faceThick * 0.5, sy - faceLen / 2, faceThick, faceLen, 3);
    else if (d === Direction.Left)  this.roundRect(ctx, sx - edge - faceThick * 0.5, sy - faceLen / 2, faceThick, faceLen, 3);
    else if (d === Direction.Down)  this.roundRect(ctx, sx - faceLen / 2, sy + edge - faceThick * 0.5, faceLen, faceThick, 3);
    else                            this.roundRect(ctx, sx - faceLen / 2, sy - edge - faceThick * 0.5, faceLen, faceThick, 3);
    ctx.fill();

    // Shine (top-left specular)
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    this.roundRect(ctx, sx - half + 2, sy - half + 2, half * 0.65, half * 0.38, 2);
    ctx.fill();

    // Name label with pill background
    if (camera.scale >= 12) {
      const fontSize = Math.max(10, camera.scale * 0.72);
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      const label = entity.name.slice(0, 10);
      const tw = ctx.measureText(label).width;

      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      this.roundRect(ctx, sx - tw / 2 - 5, sy - half - fontSize - 9, tw + 10, fontSize + 5, 4);
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.fillText(label, sx, sy - half - 5);
    }
    ctx.textAlign = 'left';
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
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
