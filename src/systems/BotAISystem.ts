import { Grid } from '../core/Grid';
import { Bot, BotState } from '../entities/Bot';
import { Entity } from '../entities/Entity';
import { CellType, Direction, DIR_DX, DIR_DY } from '../types';
import { GRID_SIZE, AI_DECISION_RATE, STARTING_TERRITORY } from '../constants';

const TRAIL_DANGER = 35;

export class BotAISystem {
  tick(bots: Bot[], _allEntities: Entity[], grid: Grid): void {
    for (const bot of bots) {
      if (!bot.isAlive()) continue;

      bot.aiDecisionTimer++;
      if (bot.aiDecisionTimer < AI_DECISION_RATE) continue;
      bot.aiDecisionTimer = 0;

      this.updateState(bot, grid);
      const dir = this.chooseDirection(bot, grid);
      bot.nextDirection = dir;
    }
  }

  private updateState(bot: Bot, _grid: Grid): void {
    const trailLen = bot.trail.length;

    if (bot.aiState === BotState.Farming) {
      if (trailLen > TRAIL_DANGER) {
        bot.aiState = BotState.Retreating;
        bot.aiTarget = null;
      }
    } else if (bot.aiState === BotState.Retreating) {
      if (trailLen === 0) {
        bot.aiState = BotState.Farming;
        bot.aiTarget = null;
      }
    }

    if (bot.aiState === BotState.Farming && bot.aiTarget === null) {
      bot.aiTarget = this.pickFarmTarget(bot);
    }
  }

  private pickFarmTarget(bot: Bot): { x: number; y: number } {
    const radius = 25 + Math.floor(Math.random() * 20);
    const angle = Math.random() * Math.PI * 2;
    const tx = Math.round(bot.x + Math.cos(angle) * radius);
    const ty = Math.round(bot.y + Math.sin(angle) * radius);
    const margin = STARTING_TERRITORY + 2;
    return {
      x: Math.max(margin, Math.min(GRID_SIZE - margin - 1, tx)),
      y: Math.max(margin, Math.min(GRID_SIZE - margin - 1, ty)),
    };
  }

  private chooseDirection(bot: Bot, grid: Grid): Direction {
    const bx = Math.round(bot.x);
    const by = Math.round(bot.y);

    let target: { x: number; y: number };

    if (bot.aiState === BotState.Retreating) {
      target = this.nearestOwnTerritory(bot, grid) ?? { x: bx, y: by };
    } else {
      if (!bot.aiTarget) bot.aiTarget = this.pickFarmTarget(bot);

      const dist = Math.abs(bx - bot.aiTarget.x) + Math.abs(by - bot.aiTarget.y);
      if (dist <= 1) {
        if (bot.trail.length > 0) {
          bot.aiState = BotState.Retreating;
          target = this.nearestOwnTerritory(bot, grid) ?? bot.aiTarget;
        } else {
          bot.aiTarget = this.pickFarmTarget(bot);
          target = bot.aiTarget;
        }
      } else {
        target = bot.aiTarget;
      }
    }

    return this.scoredDirection(bot, target, grid);
  }

  private scoredDirection(bot: Bot, target: { x: number; y: number }, grid: Grid): Direction {
    const bx = Math.round(bot.x);
    const by = Math.round(bot.y);
    const current = bot.direction;

    let bestDir = current;
    let bestScore = -Infinity;

    for (let d = 0; d < 4; d++) {
      const dir = d as Direction;
      if ((dir + 2) % 4 === current) continue;

      const nx = bx + DIR_DX[d];
      const ny = by + DIR_DY[d];

      let score = 0;

      if (!grid.inBounds(nx, ny)) {
        score -= 100;
      } else {
        const cellType = grid.getType(nx, ny);
        const cellOwner = grid.getOwner(nx, ny);

        if (cellType === CellType.Trail && cellOwner !== bot.id) score -= 80;
        if (cellType === CellType.Trail && cellOwner === bot.id) score -= 50;

        const dBefore = Math.abs(bx - target.x) + Math.abs(by - target.y);
        const dAfter = Math.abs(nx - target.x) + Math.abs(ny - target.y);
        score += (dBefore - dAfter) * 15;
      }

      if (dir === current) score += 5;

      if (score > bestScore) {
        bestScore = score;
        bestDir = dir;
      }
    }

    return bestDir;
  }

  private nearestOwnTerritory(bot: Bot, grid: Grid): { x: number; y: number } | null {
    const bx = Math.round(bot.x);
    const by = Math.round(bot.y);

    for (let r = 1; r < 80; r++) {
      let best: { x: number; y: number } | null = null;
      let bestDist = Infinity;
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
          const x = bx + dx, y = by + dy;
          if (!grid.inBounds(x, y)) continue;
          if (grid.getType(x, y) === CellType.Territory && grid.getOwner(x, y) === bot.id) {
            const dist = Math.abs(dx) + Math.abs(dy);
            if (dist < bestDist) { bestDist = dist; best = { x, y }; }
          }
        }
      }
      if (best) return best;
    }
    return null;
  }
}
