export const Direction = { Up: 0, Right: 1, Down: 2, Left: 3 } as const;
export type Direction = typeof Direction[keyof typeof Direction];

export const EntityState = { Alive: 0, Dead: 1, Respawning: 2 } as const;
export type EntityState = typeof EntityState[keyof typeof EntityState];

export const CellType = { Empty: 0, Territory: 1, Trail: 2 } as const;
export type CellType = typeof CellType[keyof typeof CellType];

export interface Vec2 { x: number; y: number }

export const DIR_DX = [0, 1, 0, -1] as const;
export const DIR_DY = [-1, 0, 1, 0] as const;

export interface KillEvent {
  killerId: number;
  killerName: string;
  victimId: number;
  victimName: string;
  timestamp: number;
}

export interface CaptureEvent {
  entityId: number;
  gained: number;
}
