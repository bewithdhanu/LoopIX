import type { Camera } from './Camera';

interface Particle {
  wx: number; wy: number;
  vx: number; vy: number;
  r: number;
  color: string;
  life: number;
  decay: number;
  angle: number;
  spark: boolean; // true = thin elongated spark, false = circle blob
}

interface RippleRing {
  r: number;
  maxR: number;
  alpha: number;
}

interface CaptureFlash {
  cx: number; cy: number;
  w: number; h: number;
  color: string;
  life: number;
  rings: RippleRing[];
}

export class AnimationSystem {
  private particles: Particle[] = [];
  private flashes: CaptureFlash[] = [];

  addDeathBurst(wx: number, wy: number, color: string): void {
    const count = 32;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const isSpark = i % 3 === 0;
      const speed = isSpark
        ? 6 + Math.random() * 14
        : 3 + Math.random() * 10;
      this.particles.push({
        wx: wx + 0.5, wy: wy + 0.5,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: isSpark ? 1.5 + Math.random() * 3 : 3 + Math.random() * 7,
        color,
        life: 1,
        decay: isSpark
          ? 0.018 + Math.random() * 0.022
          : 0.022 + Math.random() * 0.028,
        angle,
        spark: isSpark,
      });
    }
  }

  addCaptureFlash(minX: number, minY: number, maxX: number, maxY: number, color: string): void {
    const cx = (minX + maxX) / 2 + 0.5;
    const cy = (minY + maxY) / 2 + 0.5;
    const w = maxX - minX + 1;
    const h = maxY - minY + 1;
    const maxDim = Math.max(w, h);
    this.flashes.push({
      cx, cy, w, h, color, life: 1,
      rings: [
        { r: 0, maxR: maxDim * 0.55, alpha: 0.9 },
        { r: 0, maxR: maxDim * 0.85, alpha: 0.6 },
        { r: 0, maxR: maxDim * 1.20, alpha: 0.35 },
      ],
    });
  }

  update(dt: number): void {
    for (const p of this.particles) {
      p.wx += p.vx * dt;
      p.wy += p.vy * dt;
      p.vx *= 0.84;
      p.vy *= 0.84;
      p.life -= p.decay;
    }
    this.particles = this.particles.filter(p => p.life > 0);

    for (const f of this.flashes) {
      f.life -= dt * 1.6;
      for (const ring of f.rings) {
        ring.r += ring.maxR * dt * 2.8;
        ring.alpha = Math.max(0, ring.alpha - dt * 2.2);
      }
    }
    this.flashes = this.flashes.filter(f => f.life > 0);
  }

  draw(ctx: CanvasRenderingContext2D, camera: Camera): void {
    const cs = camera.scale;

    // ── Capture flashes: fill + expanding ripple rings ──────────────────────
    for (const f of this.flashes) {
      const { sx: x0, sy: y0 } = camera.worldToScreen(f.cx - f.w / 2, f.cy - f.h / 2);
      const { sx: x1, sy: y1 } = camera.worldToScreen(f.cx + f.w / 2, f.cy + f.h / 2);

      // Background overlay
      ctx.globalAlpha = Math.max(0, f.life * 0.28);
      ctx.fillStyle = f.color;
      ctx.fillRect(x0, y0, x1 - x0, y1 - y0);

      // Expanding rings
      const { sx: cx, sy: cy } = camera.worldToScreen(f.cx, f.cy);
      ctx.lineWidth = Math.max(1.5, cs * 0.14);
      ctx.strokeStyle = f.color;
      for (const ring of f.rings) {
        if (ring.alpha <= 0) continue;
        ctx.globalAlpha = ring.alpha;
        ctx.beginPath();
        ctx.arc(cx, cy, ring.r * cs, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;

    // ── Death particles ──────────────────────────────────────────────────────
    for (const p of this.particles) {
      const { sx, sy } = camera.worldToScreen(p.wx, p.wy);
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;

      if (p.spark) {
        // Thin elongated spark
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(p.angle);
        const len = Math.max(2, p.r * p.life * cs * 0.35);
        ctx.fillRect(-len, -1, len * 2, 2);
        ctx.restore();
      } else {
        // Circular blob that shrinks as it fades
        const radius = Math.max(1, p.r * p.life * (cs / 16));
        ctx.beginPath();
        ctx.arc(sx, sy, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
}
