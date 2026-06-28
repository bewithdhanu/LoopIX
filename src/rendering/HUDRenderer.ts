import type { LeaderboardEntry } from '../systems/LeaderboardSystem';
import type { KillEvent } from '../types';
import { KILL_FEED_TTL_MS } from '../constants';

interface KillFeedEntry {
  text: string;
  timestamp: number;
}

export class HUDRenderer {
  private killFeed: KillFeedEntry[] = [];

  addKill(event: KillEvent, isPlayerKiller: boolean, isPlayerVictim: boolean): void {
    let text: string;
    if (isPlayerVictim) {
      text = `You were killed by ${event.killerName}`;
    } else if (isPlayerKiller) {
      text = `You killed ${event.victimName}`;
    } else {
      text = `${event.killerName} killed ${event.victimName}`;
    }
    this.killFeed.unshift({ text, timestamp: event.timestamp });
    if (this.killFeed.length > 5) this.killFeed.pop();
  }

  draw(
    ctx: CanvasRenderingContext2D,
    leaderboard: LeaderboardEntry[],
    playerEntry: LeaderboardEntry | null,
    canvasW: number,
    canvasH: number
  ): void {
    this.drawLeaderboard(ctx, leaderboard, playerEntry);
    this.drawKillFeed(ctx, canvasH);
    if (playerEntry) this.drawPlayerStats(ctx, playerEntry, canvasW, canvasH);
  }

  private drawLeaderboard(
    ctx: CanvasRenderingContext2D,
    entries: LeaderboardEntry[],
    playerEntry: LeaderboardEntry | null
  ): void {
    const x = 16, y = 16;
    const w = 200, rowH = 32, pad = 10;
    const totalH = pad + entries.length * rowH + pad;

    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    this.roundRect(ctx, x, y, w, totalH, 8);
    ctx.fill();

    entries.forEach((entry, i) => {
      const ry = y + pad + i * rowH;
      const isPlayer = playerEntry?.id === entry.id;

      ctx.fillStyle = entry.color;
      ctx.fillRect(x + 10, ry + 8, 14, 14);

      ctx.fillStyle = isPlayer ? '#fff' : 'rgba(255,255,255,0.8)';
      ctx.font = isPlayer ? 'bold 12px sans-serif' : '11px sans-serif';
      ctx.textAlign = 'left';
      const name = entry.name.length > 12 ? entry.name.slice(0, 11) + '…' : entry.name;
      ctx.fillText(name, x + 32, ry + 20);

      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.textAlign = 'right';
      ctx.fillText(`${entry.percent.toFixed(1)}%`, x + w - 10, ry + 20);
    });

    ctx.textAlign = 'left';
  }

  private drawKillFeed(ctx: CanvasRenderingContext2D, canvasH: number): void {
    const now = performance.now();
    const x = 16;
    let y = canvasH - 20;
    ctx.font = '12px sans-serif';

    for (let i = this.killFeed.length - 1; i >= 0; i--) {
      const entry = this.killFeed[i];
      const age = now - entry.timestamp;
      if (age > KILL_FEED_TTL_MS) {
        this.killFeed.splice(i, 1);
        continue;
      }
      const alpha = 1 - age / KILL_FEED_TTL_MS;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fillText(entry.text, x, y);
      y -= 20;
    }
  }

  private drawPlayerStats(
    ctx: CanvasRenderingContext2D,
    entry: LeaderboardEntry,
    canvasW: number,
    canvasH: number
  ): void {
    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.textAlign = 'center';
    ctx.fillText(`${entry.percent.toFixed(1)}%`, canvasW / 2, canvasH - 20);
    ctx.textAlign = 'left';
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
}
