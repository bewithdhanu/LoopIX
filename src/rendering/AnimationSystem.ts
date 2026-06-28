import type { Camera } from './Camera';

interface Particle {
  wx: number; wy: number;   // world position
  vx: number; vy: number;   // velocity (cells/s)
  r: number;                // radius (px)
  color: string;
  alpha: number;
  life: number;             // 0-1
  decay: number;
}

interface CaptureFlash {
  minX: number; minY: number;
  maxX: number; maxY: number;
  color: string;
  alpha: number;
}

export class AnimationSystem {
  private particles: Particle[] = [];
  private flashes: CaptureFlash[] = [];

  addDeathBurst(wx: number, wy: number, color: string): void {
    const count = 14;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 4 + Math.random() * 8;
      this.particles.push({
        wx: wx + 0.5, wy: wy + 0.5,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 4 + Math.random() * 6,
        color,
        alpha: 1,
        life: 1,
        decay: 0.04 + Math.random() * 0.03,
      });
    }
  }

  addCaptureFlash(minX: number, minY: number, maxX: number, maxY: number, color: string): void {
    this.flashes.push({ minX, minY, maxX, maxY, color, alpha: 0.45 });
  }

  update(dt: number): void {
    for (const p of this.particles) {
      p.wx += p.vx * dt;
      p.wy += p.vy * dt;
      p.vx *= 0.88;
      p.vy *= 0.88;
      p.life -= p.decay;
      p.alpha = p.life;
    }
    this.particles = this.particles.filter(p => p.life > 0);

    for (const f of this.flashes) {
      f.alpha -= 0.04;
    }
    this.flashes = this.flashes.filter(f => f.alpha > 0);
  }

  draw(ctx: CanvasRenderingContext2D, camera: Camera): void {
    // Capture flashes
    for (const f of this.flashes) {
      const { sx: x0, sy: y0 } = camera.worldToScreen(f.minX, f.minY);
      const { sx: x1, sy: y1 } = camera.worldToScreen(f.maxX + 1, f.maxY + 1);
      ctx.globalAlpha = f.alpha;
      ctx.fillStyle = f.color;
      ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    }
    ctx.globalAlpha = 1;

    // Death particles
    for (const p of this.particles) {
      const { sx, sy } = camera.worldToScreen(p.wx, p.wy);
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(sx, sy, p.r * p.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
