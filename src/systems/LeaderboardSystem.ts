import { Entity } from '../entities/Entity';
import { Grid } from '../core/Grid';
import { CellType } from '../types';
import { GRID_SIZE, LEADERBOARD_TOP } from '../constants';

export interface LeaderboardEntry {
  id: number;
  name: string;
  color: string;
  percent: number;
  kills: number;
}

export class LeaderboardSystem {
  private tickCount = 0;

  getLeaderboard(entities: Entity[], grid: Grid): LeaderboardEntry[] {
    this.tickCount++;
    if (this.tickCount % 60 === 0) {
      this.recount(entities, grid);
    }

    return [...entities]
      .sort((a, b) => b.territoryCount - a.territoryCount)
      .slice(0, LEADERBOARD_TOP)
      .map(e => ({
        id: e.id,
        name: e.name,
        color: e.color,
        percent: Math.round((e.territoryCount / (GRID_SIZE * GRID_SIZE)) * 1000) / 10,
        kills: e.killCount,
      }));
  }

  private recount(entities: Entity[], grid: Grid): void {
    const counts = new Map<number, number>();
    for (const e of entities) counts.set(e.id, 0);

    const data = grid.getRawData();
    for (let i = 0; i < data.length; i++) {
      const raw = data[i];
      if ((raw & 0x3) === CellType.Territory) {
        const owner = raw >> 2;
        if (counts.has(owner)) counts.set(owner, counts.get(owner)! + 1);
      }
    }

    for (const e of entities) {
      e.territoryCount = counts.get(e.id) ?? 0;
    }
  }
}
