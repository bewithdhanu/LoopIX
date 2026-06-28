import { Grid } from '../core/Grid';
import { Entity } from '../entities/Entity';
import { CellType } from '../types';
import { GRID_SIZE } from '../constants';
import type { TrailClosedEvent } from './MovementSystem';

export class CaptureSystem {
  onCapture: ((entityId: number, gained: number) => void) | null = null;
  onTrailDestroyed: ((victimId: number) => void) | null = null;

  handle(event: TrailClosedEvent, grid: Grid, _entities: Entity[]): void {
    const { entity } = event;
    const gs = GRID_SIZE;

    const exterior = grid.exterior;
    const queue = grid.bfsQueue;
    exterior.fill(0);

    const data = grid.getRawData();

    // Mark barriers: entity's territory + trail
    for (let i = 0; i < gs * gs; i++) {
      const raw = data[i];
      const ownerId = raw >> 2;
      const type = raw & 0x3;
      if (ownerId === entity.id && (type === CellType.Territory || type === CellType.Trail)) {
        exterior[i] = 2; // barrier
      }
    }

    // BFS from all border cells → mark exterior
    let head = 0, tail = 0;
    const enqueue = (idx: number) => {
      if (exterior[idx] === 0) {
        exterior[idx] = 1;
        queue[tail++] = idx;
      }
    };

    for (let x = 0; x < gs; x++) {
      enqueue(x);
      enqueue((gs - 1) * gs + x);
    }
    for (let y = 0; y < gs; y++) {
      enqueue(y * gs);
      enqueue(y * gs + gs - 1);
    }

    while (head < tail) {
      const idx = queue[head++];
      const x = idx % gs;
      const y = Math.floor(idx / gs);
      if (x > 0)      enqueue(idx - 1);
      if (x < gs - 1) enqueue(idx + 1);
      if (y > 0)      enqueue(idx - gs);
      if (y < gs - 1) enqueue(idx + gs);
    }

    // Capture interior cells
    let gained = 0;
    const trailVictims = new Set<number>();

    for (let i = 0; i < gs * gs; i++) {
      if (exterior[i] === 0) {
        const raw = data[i];
        const prevOwner = raw >> 2;
        const prevType = raw & 0x3;

        if (prevOwner !== 0 && prevOwner !== entity.id && prevType === CellType.Trail) {
          trailVictims.add(prevOwner);
        }

        const x = i % gs;
        const y = Math.floor(i / gs);
        grid.setTerritory(x, y, entity.id);
        gained++;
      }
    }

    // Convert trail cells to territory
    for (const cell of entity.trail) {
      grid.setTerritory(cell.x, cell.y, entity.id);
    }
    entity.trail = [];

    entity.territoryCount += gained;
    this.onCapture?.(entity.id, gained);

    for (const victimId of trailVictims) {
      this.onTrailDestroyed?.(victimId);
    }
  }
}
