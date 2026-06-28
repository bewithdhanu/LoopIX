import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GRID_SIZE } from '../constants';
import type { Grid } from '../core/Grid';
import type { Entity } from '../entities/Entity';
import { CellType } from '../types';

const GS = GRID_SIZE;
const MAX_TERR  = GS * GS;
const MAX_TRAIL = 25000;

// ── Direction → y-rotation so the "face" (+Z side) points that way ──────────
const DIR_ROT_Y = [Math.PI, -Math.PI / 2, 0, Math.PI / 2] as const;

interface EntityVisual {
  group: THREE.Group;
  body: THREE.Mesh;
  face: THREE.Mesh;
  light: THREE.PointLight;
}

interface DeathBurst {
  pts:   THREE.Points;
  vel:   Float32Array;
  life:  number;
}

interface CaptureFlash {
  mesh:  THREE.Mesh;
  life:  number;
}

export class ThreeRenderer {
  readonly renderer: THREE.WebGLRenderer;
  private scene:    THREE.Scene;
  private camera:   THREE.PerspectiveCamera;
  private composer: EffectComposer;
  private bloom:    UnrealBloomPass;

  // Grid meshes (InstancedMesh with per-instance colour)
  private terrMesh:  THREE.InstancedMesh;
  private trailMesh: THREE.InstancedMesh;

  // Per-entity visuals
  private eVisuals = new Map<number, EntityVisual>();

  // Shared geometries / materials (reused across entities)
  private bodyGeo:  THREE.BoxGeometry;
  private faceGeo:  THREE.PlaneGeometry;

  // Animations
  private bursts:  DeathBurst[]    = [];
  private flashes: CaptureFlash[]  = [];

  // Camera state (world-space)
  private camTX = GS / 2;
  private camTZ = GS / 2;
  private camX  = GS / 2;
  private camZ  = GS / 2;

  private dirty = true;
  private readonly _mat4 = new THREE.Matrix4();

  constructor(canvas: HTMLCanvasElement) {
    // ── WebGL renderer ───────────────────────────────────────────────────────
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping       = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    // ── Scene ────────────────────────────────────────────────────────────────
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0f24);
    this.scene.fog = new THREE.FogExp2(0x0a0f24, 0.006);

    // ── Camera ───────────────────────────────────────────────────────────────
    this.camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 600);

    // ── Lighting ─────────────────────────────────────────────────────────────
    this.scene.add(new THREE.AmbientLight(0x2a3a6a, 3.5));

    const sun = new THREE.DirectionalLight(0xffffff, 1.8);
    sun.position.set(20, 40, 15);
    sun.castShadow = true;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far  = 120;
    sun.shadow.camera.left = sun.shadow.camera.bottom = -50;
    sun.shadow.camera.right = sun.shadow.camera.top   =  50;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.bias = -0.001;
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0x5588ff, 0.6);
    fill.position.set(-10, 8, -10);
    this.scene.add(fill);

    // ── Floor ────────────────────────────────────────────────────────────────
    const floorGeo = new THREE.PlaneGeometry(GS + 30, GS + 30);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x07091a, roughness: 1 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(GS / 2, -0.07, GS / 2);
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Grid overlay texture on floor
    const gridCanvas = document.createElement('canvas');
    gridCanvas.width = gridCanvas.height = 512;
    const gc = gridCanvas.getContext('2d')!;
    gc.fillStyle = '#07091a';
    gc.fillRect(0, 0, 512, 512);
    gc.strokeStyle = 'rgba(255,255,255,0.05)';
    gc.lineWidth = 1;
    const step = 512 / 8;
    for (let i = 0; i <= 8; i++) {
      gc.beginPath(); gc.moveTo(i * step, 0); gc.lineTo(i * step, 512); gc.stroke();
      gc.beginPath(); gc.moveTo(0, i * step); gc.lineTo(512, i * step); gc.stroke();
    }
    const gridTex = new THREE.CanvasTexture(gridCanvas);
    gridTex.wrapS = gridTex.wrapT = THREE.RepeatWrapping;
    gridTex.repeat.set(GS / 4, GS / 4);
    (floor.material as THREE.MeshStandardMaterial).map = gridTex;

    // ── Map border ───────────────────────────────────────────────────────────
    const borderPts = [
      new THREE.Vector3(0, 0.15, 0), new THREE.Vector3(GS, 0.15, 0),
      new THREE.Vector3(GS, 0.15, GS), new THREE.Vector3(0, 0.15, GS),
      new THREE.Vector3(0, 0.15, 0),
    ];
    const borderLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(borderPts),
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 }),
    );
    this.scene.add(borderLine);

    // ── Territory InstancedMesh ───────────────────────────────────────────────
    const terrGeo = new THREE.BoxGeometry(0.9, 0.13, 0.9);
    const terrMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.15 });
    this.terrMesh = new THREE.InstancedMesh(terrGeo, terrMat, MAX_TERR);
    this.terrMesh.count = 0;
    this.terrMesh.castShadow  = false;
    this.terrMesh.receiveShadow = true;
    this.scene.add(this.terrMesh);

    // ── Trail InstancedMesh ───────────────────────────────────────────────────
    const trailGeo = new THREE.BoxGeometry(0.42, 0.26, 0.42);
    const trailMat = new THREE.MeshBasicMaterial({ vertexColors: true }); // unlit → blooms bright
    this.trailMesh = new THREE.InstancedMesh(trailGeo, trailMat, MAX_TRAIL);
    this.trailMesh.count = 0;
    this.scene.add(this.trailMesh);

    // ── Shared entity geometry ────────────────────────────────────────────────
    this.bodyGeo = new THREE.BoxGeometry(0.68, 0.68, 0.68);
    this.faceGeo = new THREE.PlaneGeometry(0.46, 0.46);

    // ── Post-processing ───────────────────────────────────────────────────────
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.85,   // strength
      0.5,    // radius
      0.72,   // threshold (only bright objects bloom)
    );
    this.composer.addPass(this.bloom);

    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  markDirty(): void { this.dirty = true; }

  addDeathBurst(wx: number, wy: number, color: string): void {
    const COUNT = 100;
    const pos = new Float32Array(COUNT * 3);
    const vel = new Float32Array(COUNT * 3);

    for (let i = 0; i < COUNT; i++) {
      const angle  = (i / COUNT) * Math.PI * 2 + Math.random() * 0.4;
      const speed  = 3 + Math.random() * 9;
      const upward = 1 + Math.random() * 5;
      pos[i*3]   = wx + 0.5; pos[i*3+1] = 0.5; pos[i*3+2] = wy + 0.5;
      vel[i*3]   = Math.cos(angle) * speed;
      vel[i*3+1] = upward;
      vel[i*3+2] = Math.sin(angle) * speed;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    const mat = new THREE.PointsMaterial({
      color: new THREE.Color(color),
      size: 0.35,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const pts = new THREE.Points(geo, mat);
    this.scene.add(pts);
    this.bursts.push({ pts, vel, life: 1 });
  }

  addCaptureFlash(minX: number, minY: number, maxX: number, maxY: number, color: string): void {
    const w = maxX - minX + 1;
    const h = maxY - minY + 1;
    const geo = new THREE.PlaneGeometry(w, h);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(minX + w / 2, 0.25, minY + h / 2);
    this.scene.add(mesh);
    this.flashes.push({ mesh, life: 1 });
  }

  frame(alpha: number, grid: Grid, entities: Entity[], playerId: number): void {
    const dt = 1 / 60;

    if (this.dirty) {
      this.rebuildGrid(grid, entities);
      this.dirty = false;
    }

    this.updateEntityVisuals(entities, alpha, playerId);
    this.updateCamera(entities, playerId);
    this.updateBursts(dt);
    this.updateFlashes(dt);

    this.composer.render();
  }

  resize(): void {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.bloom.resolution.set(w, h);
  }

  // ── Grid rebuild ────────────────────────────────────────────────────────────

  private rebuildGrid(grid: Grid, entities: Entity[]): void {
    const data = grid.getRawData();
    const colorMap     = new Map<number, THREE.Color>();
    const trailColorMap = new Map<number, THREE.Color>();
    for (const e of entities) {
      colorMap.set(e.id,     new THREE.Color(e.color));
      trailColorMap.set(e.id, new THREE.Color(e.trailColor));
    }

    let ti = 0, ri = 0;

    for (let i = 0; i < data.length; i++) {
      const raw = data[i];
      if (!raw) continue;

      const type  = raw & 0x3;
      const owner = raw >> 2;
      const gx = i % GS;
      const gy = Math.floor(i / GS);

      if (type === CellType.Territory) {
        const c = colorMap.get(owner);
        if (!c) continue;
        this._mat4.makeTranslation(gx + 0.5, 0.065, gy + 0.5);
        this.terrMesh.setMatrixAt(ti, this._mat4);
        this.terrMesh.setColorAt(ti, c);
        ti++;
      } else if (type === CellType.Trail && ri < MAX_TRAIL) {
        const c = trailColorMap.get(owner);
        if (!c) continue;
        this._mat4.makeTranslation(gx + 0.5, 0.18, gy + 0.5);
        this.trailMesh.setMatrixAt(ri, this._mat4);
        this.trailMesh.setColorAt(ri, c);
        ri++;
      }
    }

    this.terrMesh.count  = ti;
    this.terrMesh.instanceMatrix.needsUpdate = true;
    if (this.terrMesh.instanceColor) this.terrMesh.instanceColor.needsUpdate = true;

    this.trailMesh.count = ri;
    this.trailMesh.instanceMatrix.needsUpdate = true;
    if (this.trailMesh.instanceColor) this.trailMesh.instanceColor.needsUpdate = true;
  }

  // ── Entity visuals ──────────────────────────────────────────────────────────

  private updateEntityVisuals(entities: Entity[], alpha: number, playerId: number): void {
    const seen = new Set<number>();

    for (const entity of entities) {
      seen.add(entity.id);
      let vis = this.eVisuals.get(entity.id);

      if (!vis) {
        vis = this.createEntityVisual(entity);
        this.eVisuals.set(entity.id, vis);
      }

      if (!entity.isAlive()) {
        vis.group.visible = false;
        vis.light.visible = false;
        continue;
      }

      vis.group.visible = true;
      vis.light.visible = true;

      // Interpolated position
      const ix = entity.prevX + (entity.x - entity.prevX) * alpha + 0.5;
      const iz = entity.prevY + (entity.y - entity.prevY) * alpha + 0.5;

      // Bob + pulse
      const t   = performance.now() * 0.001;
      const bob = Math.sin(t * 4 + entity.id) * 0.06;
      vis.group.position.set(ix, 0.45 + bob, iz);

      // Face the direction of travel
      vis.group.rotation.y = DIR_ROT_Y[entity.direction] ?? 0;

      // Player slightly larger
      const scale = entity.id === playerId ? 1.08 : 1;
      vis.group.scale.setScalar(scale + Math.sin(t * 5 + entity.id) * 0.015);

      // Move point light to entity
      vis.light.position.set(ix, 3, iz);
      vis.light.intensity = entity.id === playerId ? 2.5 : 1.2;
    }

    // Clean up visuals for removed entities
    for (const [id, vis] of this.eVisuals) {
      if (!seen.has(id)) {
        this.scene.remove(vis.group);
        this.scene.remove(vis.light);
        this.eVisuals.delete(id);
      }
    }
  }

  private createEntityVisual(entity: Entity): EntityVisual {
    const group = new THREE.Group();

    // Body cube
    const bodyMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(entity.color),
      emissive: new THREE.Color(entity.color),
      emissiveIntensity: 0.4,
      roughness: 0.25,
      metalness: 0.35,
    });
    const body = new THREE.Mesh(this.bodyGeo, bodyMat);
    body.castShadow = true;
    group.add(body);

    // Bright front face (direction indicator)
    const faceMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(entity.headColor),
      transparent: true,
      opacity: 0.92,
    });
    const face = new THREE.Mesh(this.faceGeo, faceMat);
    face.position.set(0, 0, 0.345); // front face of the 0.68-wide cube
    group.add(face);

    // Eyes (two tiny spheres on the face)
    const eyeGeo = new THREE.SphereGeometry(0.07, 6, 6);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.13, 0.08, 0.35);
    eyeR.position.set( 0.13, 0.08, 0.35);
    group.add(eyeL, eyeR);

    this.scene.add(group);

    // Per-entity point light (player color glow)
    const light = new THREE.PointLight(new THREE.Color(entity.color), 1.2, 18);
    light.position.set(0, 2, 0);
    this.scene.add(light);

    return { group, body, face, light };
  }

  // ── Camera ──────────────────────────────────────────────────────────────────

  private updateCamera(entities: Entity[], playerId: number): void {
    const player = entities.find(e => e.id === playerId);
    if (player && player.isAlive()) {
      this.camTX = player.x + 0.5;
      this.camTZ = player.y + 0.5;
    }

    this.camX += (this.camTX - this.camX) * 0.09;
    this.camZ += (this.camTZ - this.camZ) * 0.09;

    this.camera.position.set(this.camX, 23, this.camZ + 17);
    this.camera.lookAt(this.camX, 0, this.camZ);
  }

  // ── Animations ──────────────────────────────────────────────────────────────

  private updateBursts(dt: number): void {
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      b.life -= dt * 1.4;

      const pos = b.pts.geometry.attributes.position as THREE.BufferAttribute;
      const vel = b.vel;
      const cnt = pos.count;

      for (let j = 0; j < cnt; j++) {
        pos.setXYZ(j,
          pos.getX(j) + vel[j*3]   * dt,
          pos.getY(j) + vel[j*3+1] * dt,
          pos.getZ(j) + vel[j*3+2] * dt,
        );
        vel[j*3+1] -= 12 * dt; // gravity
        vel[j*3]   *= 0.95;
        vel[j*3+2] *= 0.95;
      }
      pos.needsUpdate = true;
      (b.pts.material as THREE.PointsMaterial).opacity = Math.max(0, b.life);
      (b.pts.material as THREE.PointsMaterial).size    = 0.35 * b.life;

      if (b.life <= 0) {
        this.scene.remove(b.pts);
        b.pts.geometry.dispose();
        (b.pts.material as THREE.Material).dispose();
        this.bursts.splice(i, 1);
      }
    }
  }

  private updateFlashes(dt: number): void {
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i];
      f.life -= dt * 2.5;
      (f.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, f.life * 0.6);

      if (f.life <= 0) {
        this.scene.remove(f.mesh);
        f.mesh.geometry.dispose();
        (f.mesh.material as THREE.Material).dispose();
        this.flashes.splice(i, 1);
      }
    }
  }
}
