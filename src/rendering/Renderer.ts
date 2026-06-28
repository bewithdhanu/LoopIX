import { Camera } from './Camera';
import { GridRenderer } from './GridRenderer';
import { EntityRenderer } from './EntityRenderer';
import { MinimapRenderer } from './MinimapRenderer';
import { HUDRenderer } from './HUDRenderer';
import { AnimationSystem } from './AnimationSystem';
import { LeaderboardSystem } from '../systems/LeaderboardSystem';
import type { Grid } from '../core/Grid';
import type { Entity } from '../entities/Entity';
import { TICK_MS } from '../constants';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private camera: Camera;

  private gridRenderer: GridRenderer;
  private entityRenderer: EntityRenderer;
  private minimapRenderer: MinimapRenderer;
  hudRenderer: HUDRenderer;
  private leaderboard: LeaderboardSystem;
  private anim: AnimationSystem;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.camera = new Camera();
    this.gridRenderer = new GridRenderer();
    this.entityRenderer = new EntityRenderer();
    this.minimapRenderer = new MinimapRenderer();
    this.hudRenderer = new HUDRenderer();
    this.leaderboard = new LeaderboardSystem();
    this.anim = new AnimationSystem();

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.scale(dpr, dpr);
    this.camera.canvasW = w;
    this.camera.canvasH = h;
  }

  // Grid is always drawn fresh (no dirty-flag cache) — this is a no-op kept for API compat
  markGridDirty(): void { /* intentional no-op */ }

  addDeathBurst(wx: number, wy: number, color: string): void {
    this.anim.addDeathBurst(wx, wy, color);
  }

  addCaptureFlash(minX: number, minY: number, maxX: number, maxY: number, color: string): void {
    this.anim.addCaptureFlash(minX, minY, maxX, maxY, color);
  }

  frame(alpha: number, grid: Grid, entities: Entity[], playerId: number): void {
    const ctx = this.ctx;
    const w = this.camera.canvasW;
    const h = this.camera.canvasH;

    const player = entities.find(e => e.id === playerId);
    if (player) this.camera.follow(player.x + 0.5, player.y + 0.5);
    this.camera.update(0.1);

    this.anim.update(TICK_MS / 1000);

    ctx.fillStyle = '#0d1428';
    ctx.fillRect(0, 0, w, h);

    this.gridRenderer.draw(ctx, this.camera, grid, entities);
    this.anim.draw(ctx, this.camera);
    this.entityRenderer.draw(ctx, entities, this.camera, alpha);

    if (player) {
      this.minimapRenderer.draw(ctx, grid, entities, player.x, player.y, w, h);
    }

    const lb = this.leaderboard.getLeaderboard(entities, grid);
    const playerEntry = lb.find(e => e.id === playerId) ?? null;
    this.hudRenderer.draw(ctx, lb, playerEntry, w, h);
  }
}
