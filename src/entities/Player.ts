import { Entity } from './Entity';
import { Direction } from '../types';

export class Player extends Entity {
  private inputQueue: Direction[] = [];

  constructor(name: string, color: string) {
    super(name, color);
  }

  queueDirection(dir: Direction): void {
    const last = this.inputQueue.length > 0
      ? this.inputQueue[this.inputQueue.length - 1]
      : this.direction;
    if ((dir + 2) % 4 !== last && dir !== last) {
      if (this.inputQueue.length < 2) this.inputQueue.push(dir);
    }
  }

  flushDirection(): Direction | null {
    return this.inputQueue.shift() ?? null;
  }
}
