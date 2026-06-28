import { Camera } from './Camera';
import { GridRenderer } from './GridRenderer';
import { EntityRenderer } from './EntityRenderer';
import { MinimapRenderer } from './MinimapRenderer';
import { HUDRenderer } from './HUDRenderer';
import { LeaderboardSystem } from '../systems/LeaderboardSystem';
import { Grid } from '../core/Grid';
import { Entity } from '../entities/Entity';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  camera: Camera;

  private gridRenderer: GridRenderer;
  private entityRenderer: EntityRenderer;
  private minimapRenderer: MinimapRenderer;
  hudRenderer: HUDRenderer;
  private leaderboard: LeaderboardSystem;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.camera = new Camera();
    this.gridRenderer = new GridRenderer();
    this.entityRenderer = new EntityRenderer();
    this.minimapRenderer = new MinimapRenderer();
    this.hudRenderer = new HUDRenderer();
    this.leaderboard = new LeaderboardSystem();

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize(): void {
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

  markGridDirty(): void {
    this.gridRenderer.markDirty();
  }

  frame(alpha: number, grid: Grid, entities: Entity[], playerId: number): void {
    const ctx = this.ctx;
    const w = this.camera.canvasW;
    const h = this.camera.canvasH;

    const player = entities.find(e => e.id === playerId);
    if (player) {
      this.camera.follow(player.x + 0.5, player.y + 0.5);
    }
    this.camera.update(0.12);

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, w, h);

    this.gridRenderer.draw(ctx, this.camera, grid, entities);
    this.entityRenderer.draw(ctx, entities, this.camera, alpha);

    if (player) {
      this.minimapRenderer.draw(ctx, grid, entities, player.x, player.y, w, h);
    }

    const lb = this.leaderboard.getLeaderboard(entities, grid);
    const playerEntry = lb.find(e => e.id === playerId) ?? null;
    this.hudRenderer.draw(ctx, lb, playerEntry, w, h);
  }
}
