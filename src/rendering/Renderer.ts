import { ThreeRenderer } from './ThreeRenderer';
import { MinimapRenderer } from './MinimapRenderer';
import { HUDRenderer } from './HUDRenderer';
import { LeaderboardSystem } from '../systems/LeaderboardSystem';
import type { Grid } from '../core/Grid';
import type { Entity } from '../entities/Entity';

export class Renderer {
  private three: ThreeRenderer;
  private hud: HTMLCanvasElement;
  private hudCtx: CanvasRenderingContext2D;

  private minimapRenderer: MinimapRenderer;
  hudRenderer: HUDRenderer;
  private leaderboard: LeaderboardSystem;

  constructor(canvas: HTMLCanvasElement) {
    this.three = new ThreeRenderer(canvas);

    // 2D HUD overlay
    this.hud = document.getElementById('hud') as HTMLCanvasElement;
    this.hudCtx = this.hud.getContext('2d')!;
    this.minimapRenderer = new MinimapRenderer();
    this.hudRenderer = new HUDRenderer();
    this.leaderboard = new LeaderboardSystem();

    this.resizeHud();
    window.addEventListener('resize', () => this.resizeHud());
  }

  private resizeHud(): void {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.hud.width  = w * dpr;
    this.hud.height = h * dpr;
    this.hud.style.width  = `${w}px`;
    this.hud.style.height = `${h}px`;
    this.hudCtx.scale(dpr, dpr);
  }

  markGridDirty(): void {
    this.three.markDirty();
  }

  addDeathBurst(wx: number, wy: number, color: string): void {
    this.three.addDeathBurst(wx, wy, color);
  }

  addCaptureFlash(minX: number, minY: number, maxX: number, maxY: number, color: string): void {
    this.three.addCaptureFlash(minX, minY, maxX, maxY, color);
  }

  frame(alpha: number, grid: Grid, entities: Entity[], playerId: number): void {
    // 3D scene render
    this.three.frame(alpha, grid, entities, playerId);

    // 2D HUD render
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.hudCtx.clearRect(0, 0, w, h);

    const player = entities.find(e => e.id === playerId);
    if (player) {
      this.minimapRenderer.draw(this.hudCtx, grid, entities, player.x, player.y, w, h);
    }

    const lb = this.leaderboard.getLeaderboard(entities, grid);
    const playerEntry = lb.find(e => e.id === playerId) ?? null;
    this.hudRenderer.draw(this.hudCtx, lb, playerEntry, w, h);
  }
}
