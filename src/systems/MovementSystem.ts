import { Grid } from '../core/Grid';
import { Entity } from '../entities/Entity';
import { Player } from '../entities/Player';
import { CellType, DIR_DX, DIR_DY, EntityState } from '../types';
import { PLAYER_SPEED } from '../constants';

export interface TrailClosedEvent {
  entity: Entity;
  closedX: number;
  closedY: number;
}

export class MovementSystem {
  onTrailClosed: ((e: TrailClosedEvent) => void) | null = null;
  onOutOfBounds: ((entity: Entity) => void) | null = null;

  tick(dt: number, entities: Entity[], grid: Grid): void {
    for (const entity of entities) {
      if (!entity.isAlive()) continue;
      this.moveEntity(dt, entity, grid);
    }
  }

  private moveEntity(dt: number, entity: Entity, grid: Grid): void {
    entity.moveAccum += PLAYER_SPEED * dt;

    while (entity.moveAccum >= 1) {
      entity.moveAccum -= 1;
      this.stepEntity(entity, grid);
      if (!entity.isAlive()) return;
    }
  }

  private stepEntity(entity: Entity, grid: Grid): void {
    // Apply buffered direction at cell boundary
    if (entity instanceof Player) {
      const queued = entity.flushDirection();
      if (queued !== null) {
        entity.direction = queued;
        entity.nextDirection = queued;
      }
    } else {
      entity.direction = entity.nextDirection;
    }

    const cx = Math.round(entity.x);
    const cy = Math.round(entity.y);
    const nx = cx + DIR_DX[entity.direction];
    const ny = cy + DIR_DY[entity.direction];

    entity.prevX = entity.x;
    entity.prevY = entity.y;

    // OOB check
    if (!grid.inBounds(nx, ny)) {
      entity.state = EntityState.Dead;
      this.onOutOfBounds?.(entity);
      return;
    }

    const nextType = grid.getType(nx, ny);
    const nextOwner = grid.getOwner(nx, ny);
    const movingToOwnTerritory = nextOwner === entity.id && nextType === CellType.Territory;

    const curType = grid.getType(cx, cy);
    const curOwner = grid.getOwner(cx, cy);
    const onOwnTerritory = curOwner === entity.id && curType === CellType.Territory;

    // Write trail on current cell when leaving own territory or extending trail.
    // Skip if already own trail (crossing own trail is allowed — no duplicate entry).
    if (!onOwnTerritory || entity.trail.length > 0) {
      const isOwnTerritory = curOwner === entity.id && curType === CellType.Territory;
      const isOwnTrail     = curOwner === entity.id && curType === CellType.Trail;
      if (!isOwnTerritory && !isOwnTrail) {
        grid.setTrail(cx, cy, entity.id);
        entity.trail.push({ x: cx, y: cy });
      }
    }

    entity.x = nx;
    entity.y = ny;

    // Check if we closed the trail back to our territory
    if (movingToOwnTerritory && entity.trail.length > 0) {
      this.onTrailClosed?.({ entity, closedX: nx, closedY: ny });
      entity.trail = [];
    }
  }
}
