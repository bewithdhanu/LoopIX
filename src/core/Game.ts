import { Grid } from './Grid';
import { Player } from '../entities/Player';
import { Bot } from '../entities/Bot';
import { Entity } from '../entities/Entity';
import { MovementSystem } from '../systems/MovementSystem';
import { CaptureSystem } from '../systems/CaptureSystem';
import { CollisionSystem } from '../systems/CollisionSystem';
import { BotAISystem } from '../systems/BotAISystem';
import { Renderer } from '../rendering/Renderer';
import { KeyboardInput } from '../input/KeyboardInput';
import { TouchInput } from '../input/TouchInput';
import { Direction, EntityState } from '../types';
import type { KillEvent } from '../types';
import {
  BOT_COUNT, ENTITY_COLORS, GRID_SIZE, RESPAWN_DELAY_MS,
  STARTING_TERRITORY, TICK_MS,
} from '../constants';

const BOT_NAMES = [
  'Shadow', 'Blaze', 'Nova', 'Viper', 'Titan', 'Rogue',
  'Storm', 'Ghost', 'Frost', 'Blitz', 'Apex', 'Lynx',
  'Hawk', 'Cobra', 'Ember',
];

export class Game {
  private grid: Grid;
  private player!: Player;
  private bots: Bot[] = [];
  private entities: Entity[] = [];

  private movement = new MovementSystem();
  private capture = new CaptureSystem();
  private collision = new CollisionSystem();
  private botAI = new BotAISystem();

  private renderer: Renderer;
  private keyboard = new KeyboardInput();
  private touch = new TouchInput();

  private rafId = 0;
  private lastTime = 0;
  private accumulated = 0;

  private playerName = 'Player';
  private onDeath: ((killerName: string | null, territory: number, kills: number) => void) | null = null;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.grid = new Grid();
    this.setupSystems();
  }

  setOnDeath(cb: (killerName: string | null, territory: number, kills: number) => void): void {
    this.onDeath = cb;
  }

  start(playerName: string): void {
    this.playerName = playerName || 'Player';
    this.initGame();
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.loop);
  }

  restart(playerName: string): void {
    cancelAnimationFrame(this.rafId);
    this.keyboard.detach();
    this.touch.detach(this.canvas);
    this.grid.reset();
    this.entities = [];
    this.bots = [];
    this.start(playerName);
  }

  private initGame(): void {
    this.grid.reset();
    this.entities = [];
    this.bots = [];

    const cx = Math.floor(GRID_SIZE / 2);
    const cy = Math.floor(GRID_SIZE / 2);
    const colorIdx = Math.floor(Math.random() * ENTITY_COLORS.length);
    this.player = new Player(this.playerName, ENTITY_COLORS[colorIdx]);
    this.placeEntity(this.player, cx, cy, Direction.Right);
    this.entities.push(this.player);

    const cols = 4, rows = Math.ceil(BOT_COUNT / cols);
    const zoneW = GRID_SIZE / cols;
    const zoneH = GRID_SIZE / rows;
    const usedColors = new Set([colorIdx]);

    for (let i = 0; i < BOT_COUNT; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const bx = Math.round(zoneW * col + zoneW / 2);
      const by = Math.round(zoneH * row + zoneH / 2);

      let ci = Math.floor(Math.random() * ENTITY_COLORS.length);
      for (let a = 0; usedColors.has(ci) && a < 20; a++) ci = (ci + 1) % ENTITY_COLORS.length;
      usedColors.add(ci);

      const bot = new Bot(BOT_NAMES[i % BOT_NAMES.length], ENTITY_COLORS[ci]);
      const dirs = [Direction.Right, Direction.Down, Direction.Left, Direction.Up];
      this.placeEntity(bot, bx, by, dirs[i % 4]);
      this.bots.push(bot);
      this.entities.push(bot);
    }

    this.keyboard.attach(this.player);
    this.touch.attach(this.canvas, this.player);
    this.renderer.markGridDirty();
  }

  private placeEntity(entity: Entity, x: number, y: number, dir: Direction): void {
    entity.x = x;
    entity.y = y;
    entity.prevX = x;
    entity.prevY = y;
    entity.direction = dir;
    entity.nextDirection = dir;
    entity.trail = [];
    entity.state = EntityState.Alive;
    entity.moveAccum = 0;
    entity.territoryCount = 0;
    entity.killCount = 0;
    entity.respawnTimer = 0;

    const hs = STARTING_TERRITORY;
    let count = 0;
    for (let dy = -hs; dy <= hs; dy++) {
      for (let dx = -hs; dx <= hs; dx++) {
        const gx = x + dx, gy = y + dy;
        if (this.grid.inBounds(gx, gy)) {
          this.grid.setTerritory(gx, gy, entity.id);
          count++;
        }
      }
    }
    entity.territoryCount = count;
  }

  private setupSystems(): void {
    this.movement.onTrailClosed = (event) => {
      this.capture.handle(event, this.grid, this.entities);
      this.renderer.markGridDirty();
    };

    this.movement.onOutOfBounds = (entity) => {
      this.handleDeath(entity, null);
    };

    this.capture.onCapture = (_entityId, _gained) => {
      this.renderer.markGridDirty();
    };

    this.capture.onTrailDestroyed = (victimId) => {
      const victim = this.entities.find(e => e.id === victimId);
      if (victim && victim.isAlive()) {
        this.handleDeath(victim, null);
      }
    };

    this.collision.onKill = (event: KillEvent) => {
      const victim = this.entities.find(e => e.id === event.victimId);
      const killer = this.entities.find(e => e.id === event.killerId);
      if (victim) this.handleDeath(victim, killer ?? null);
      this.renderer.hudRenderer.addKill(
        event,
        event.killerId === this.player?.id,
        event.victimId === this.player?.id,
      );
    };
  }

  private handleDeath(entity: Entity, killer: Entity | null): void {
    if (!entity.isAlive()) return;

    entity.state = EntityState.Dead;
    entity.respawnTimer = 0;

    this.grid.clearAllOwner(entity.id);
    entity.trail = [];
    entity.territoryCount = 0;
    this.renderer.markGridDirty();

    if (entity === this.player) {
      const territory = Math.round((entity.killCount / (GRID_SIZE * GRID_SIZE)) * 1000) / 10;
      this.onDeath?.(killer?.name ?? null, territory, entity.killCount);
      this.keyboard.detach();
      this.touch.detach(this.canvas);
    }
  }

  private tick(dt: number): void {
    this.movement.tick(dt, this.entities, this.grid);
    this.collision.tick(this.entities, this.grid);
    this.botAI.tick(this.bots, this.entities, this.grid);

    for (const bot of this.bots) {
      if (bot.state === EntityState.Dead) {
        bot.respawnTimer += dt * 1000;
        if (bot.respawnTimer >= RESPAWN_DELAY_MS) {
          this.respawnBot(bot);
        }
      }
    }
  }

  private respawnBot(bot: Bot): void {
    const margin = STARTING_TERRITORY + 5;
    for (let i = 0; i < 30; i++) {
      const x = margin + Math.floor(Math.random() * (GRID_SIZE - margin * 2));
      const y = margin + Math.floor(Math.random() * (GRID_SIZE - margin * 2));
      if (this.grid.getOwner(x, y) === 0) {
        this.placeEntity(bot, x, y, Direction.Right);
        bot.aiState = 0;
        bot.aiTarget = null;
        bot.aiDecisionTimer = 0;
        this.renderer.markGridDirty();
        return;
      }
    }
  }

  private loop = (now: number): void => {
    const delta = Math.min(now - this.lastTime, 200);
    this.lastTime = now;
    this.accumulated += delta;

    while (this.accumulated >= TICK_MS) {
      this.tick(TICK_MS / 1000);
      this.accumulated -= TICK_MS;
    }

    const alpha = this.accumulated / TICK_MS;
    this.renderer.frame(alpha, this.grid, this.entities, this.player.id);

    this.rafId = requestAnimationFrame(this.loop);
  };
}
