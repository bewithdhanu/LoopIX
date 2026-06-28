import { Direction, EntityState } from '../types';

let nextId = 1;

export class Entity {
  id: number;
  name: string;
  color: string;
  trailColor: string;
  headColor: string;

  x: number = 0;
  y: number = 0;
  prevX: number = 0;
  prevY: number = 0;

  direction: Direction = Direction.Right;
  nextDirection: Direction = Direction.Right;

  state: EntityState = EntityState.Alive;
  trail: { x: number; y: number }[] = [];
  territoryCount: number = 0;
  killCount: number = 0;
  respawnTimer: number = 0;
  moveAccum: number = 0;

  constructor(name: string, color: string) {
    this.id = nextId++;
    this.name = name;
    this.color = color;
    this.trailColor = this.darken(color, 0.25);
    this.headColor = this.lighten(color, 0.25);
  }

  private darken(hex: string, amount: number): string {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.max(0, Math.floor(((n >> 16) & 0xff) * (1 - amount)));
    const g = Math.max(0, Math.floor(((n >> 8) & 0xff) * (1 - amount)));
    const b = Math.max(0, Math.floor((n & 0xff) * (1 - amount)));
    return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
  }

  private lighten(hex: string, amount: number): string {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, Math.floor(((n >> 16) & 0xff) * (1 + amount)));
    const g = Math.min(255, Math.floor(((n >> 8) & 0xff) * (1 + amount)));
    const b = Math.min(255, Math.floor((n & 0xff) * (1 + amount)));
    return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
  }

  isAlive(): boolean {
    return this.state === EntityState.Alive;
  }
}
