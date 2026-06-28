import { Direction } from '../types';
import { Player } from '../entities/Player';

export class TouchInput {
  private player: Player | null = null;
  private startX = 0;
  private startY = 0;

  attach(canvas: HTMLCanvasElement, player: Player): void {
    this.player = player;
    canvas.addEventListener('touchstart', this.onTouchStart, { passive: true });
    canvas.addEventListener('touchend', this.onTouchEnd, { passive: true });
  }

  detach(canvas: HTMLCanvasElement): void {
    canvas.removeEventListener('touchstart', this.onTouchStart);
    canvas.removeEventListener('touchend', this.onTouchEnd);
    this.player = null;
  }

  private onTouchStart = (e: TouchEvent): void => {
    const t = e.touches[0];
    this.startX = t.clientX;
    this.startY = t.clientY;
  };

  private onTouchEnd = (e: TouchEvent): void => {
    if (!this.player) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - this.startX;
    const dy = t.clientY - this.startY;
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;

    let dir: Direction;
    if (Math.abs(dx) > Math.abs(dy)) {
      dir = dx > 0 ? Direction.Right : Direction.Left;
    } else {
      dir = dy > 0 ? Direction.Down : Direction.Up;
    }
    this.player.queueDirection(dir);
  };
}
