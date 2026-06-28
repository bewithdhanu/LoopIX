import { Direction } from '../types';
import { Player } from '../entities/Player';

export class KeyboardInput {
  private player: Player | null = null;

  attach(player: Player): void {
    this.player = player;
    window.addEventListener('keydown', this.onKey);
  }

  detach(): void {
    window.removeEventListener('keydown', this.onKey);
    this.player = null;
  }

  private onKey = (e: KeyboardEvent): void => {
    if (!this.player) return;
    let dir: Direction | null = null;
    switch (e.code) {
      case 'ArrowUp':    case 'KeyW': dir = Direction.Up; break;
      case 'ArrowRight': case 'KeyD': dir = Direction.Right; break;
      case 'ArrowDown':  case 'KeyS': dir = Direction.Down; break;
      case 'ArrowLeft':  case 'KeyA': dir = Direction.Left; break;
    }
    if (dir !== null) {
      e.preventDefault();
      this.player.queueDirection(dir);
    }
  };
}
