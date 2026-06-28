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
    const halfSize = camera.scale * 0.45;
    const r = halfSize * 0.3;

    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 8;

    ctx.fillStyle = entity.color;
    this.roundRect(ctx, sx - halfSize, sy - halfSize, halfSize * 2, halfSize * 2, r);
    ctx.fill();

    // Direction face indicator
    ctx.fillStyle = entity.headColor;
    const d = entity.direction;
    const faceSize = halfSize * 0.55;
    const fc = halfSize * 0.5;

    if (d === Direction.Right) ctx.fillRect(sx + fc - faceSize * 0.5, sy - faceSize / 2, faceSize * 0.5, faceSize);
    else if (d === Direction.Left) ctx.fillRect(sx - fc, sy - faceSize / 2, faceSize * 0.5, faceSize);
    else if (d === Direction.Down) ctx.fillRect(sx - faceSize / 2, sy + fc - faceSize * 0.5, faceSize, faceSize * 0.5);
    else ctx.fillRect(sx - faceSize / 2, sy - fc, faceSize, faceSize * 0.5);

    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

    if (camera.scale >= 12) {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = `bold ${Math.max(9, camera.scale * 0.7)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(entity.name.slice(0, 10), sx, sy - halfSize - 4);
    }
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
