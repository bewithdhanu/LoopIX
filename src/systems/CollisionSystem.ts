import { Grid } from '../core/Grid';
import { Entity } from '../entities/Entity';
import { CellType, EntityState } from '../types';
import type { KillEvent } from '../types';

export class CollisionSystem {
  onKill: ((event: KillEvent) => void) | null = null;

  tick(entities: Entity[], grid: Grid): void {
    for (const entity of entities) {
      if (!entity.isAlive()) continue;

      const x = Math.round(entity.x);
      const y = Math.round(entity.y);

      if (!grid.inBounds(x, y)) continue;

      const cellType = grid.getType(x, y);
      const cellOwner = grid.getOwner(x, y);

      if (cellType === CellType.Trail && cellOwner !== entity.id) {
        // Head on another entity's trail → that trail owner dies
        const victim = entities.find(e => e.id === cellOwner);
        if (victim && victim.isAlive()) {
          this.killEntity(victim, entity);
        }
      }
    }
  }

  private killEntity(victim: Entity, killer: Entity | null): void {
    if (!victim.isAlive()) return;

    victim.state = EntityState.Dead;
    victim.respawnTimer = 0;

    if (killer) {
      killer.killCount++;
      this.onKill?.({
        killerId: killer.id,
        killerName: killer.name,
        victimId: victim.id,
        victimName: victim.name,
        timestamp: performance.now(),
      });
    }
  }
}
