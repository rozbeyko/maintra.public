// The 3D layer: phones (and a laptop) drawn by three.js, each carrying a real,
// clickable screen through CSS3DRenderer.
//
// One fixed layer over the whole page. World units are CSS pixels on the
// z = 0 plane: the camera sits exactly as far back as makes that true, so a
// device is laid over the page by reading the box of an empty element (a
// slot) and nothing else. Moving between slots is how the hero phone becomes
// the tour phone as the page scrolls.
//
// Without WebGL the screens still work: the CSS layer needs no GPU, and the
// stylesheet draws a plain bezel round them instead of the model.

import * as THREE from '../journey/three.module.min.js';
import { RoomEnvironment } from '../journey/RoomEnvironment.js';
import { CSS3DRenderer, CSS3DObject } from './css3d.js?v=c7b4a8c7';

const FOV = 26;

// The phone, in CSS pixels: the screen is the board size the design uses.
export const PHONE = { w: 390, h: 844, r: 54, bezel: 12, depth: 44 };
PHONE.bw = PHONE.w + PHONE.bezel * 2;
PHONE.bh = PHONE.h + PHONE.bezel * 2;
PHONE.br = PHONE.r + PHONE.bezel;

// The laptop's screen shows the desktop boards (1280 wide).
export const LAPTOP = { w: 1280, h: 800, bezel: 26, chin: 34, depth: 14 };

function glOK() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch (e) {
    return false;
  }
}

function rr(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0);
  s.lineTo(x + w, y + h - r);
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2);
  s.lineTo(x + r, y + h);
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
  s.lineTo(x, y + r);
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
  return s;
}

const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const KEYS = ['x', 'y', 'h', 'z', 'rx', 'ry', 'rz', 'o'];

class Device {
  constructor(stage, { el, group, height, materials }) {
    this.stage = stage;
    this.el = el;
    this.group = group;
    this.height = height;
    this.materials = materials;
    this.cur = null;
    this.follow = null;
    this.shownOpacity = -1;
  }

  update(dt, t) {
    const s = this.stage;
    const tg = this.follow ? this.follow(t) : null;
    if (!tg) {
      this.group.visible = false;
      this.cur = null;
      return false;
    }
    let moving = true;
    if (!this.cur || tg.snap) this.cur = { ...tg };
    else {
      const c = this.cur;
      const kp = tg.k || 14;
      let left = 0;
      for (const key of KEYS) {
        const k = key === 'o' ? 7 : key[0] === 'r' ? kp * 0.7 : kp;
        c[key] = damp(c[key], tg[key], s.reduce ? 60 : k, dt);
        // what is still to travel, in pixels (a turn of 1/400 rad is about one)
        const gap = Math.abs(c[key] - tg[key]) * (key[0] === 'r' ? 400 : key === 'o' ? 200 : 1);
        if (gap > left) left = gap;
      }
      moving = left > 0.3;
    }
    const c = this.cur;
    const on = c.o > 0.01 && c.y + c.h > -c.h * 0.2 && c.y - c.h < s.vh + c.h * 0.2;
    this.group.visible = on;
    if (!on) return moving && c.o > 0.01;
    this.group.position.set(c.x - s.vw / 2, s.vh / 2 - c.y, c.z);
    this.group.scale.setScalar(c.h / this.height);
    this.group.rotation.set(c.rx, c.ry, c.rz);
    const o = Math.round(c.o * 100) / 100;
    if (o !== this.shownOpacity) {
      this.shownOpacity = o;
      this.el.style.opacity = o;
      for (const m of this.materials) {
        m.transparent = o < 1;
        m.opacity = o * (m.userData.base ?? 1);
        m.depthWrite = o >= 1;
      }
    }
    // keep drawing while it travels or breathes; a phone at rest costs nothing
    return moving || !!tg.live;
  }
}

export class Stage {
  constructor({ reduce = false } = {}) {
    this.reduce = reduce;
    this.devices = [];
    this.extras = [];
    // drawn first, each with its own camera: the hero's garage (room.js)
    this.backdrops = [];
    this.PHONE = PHONE;
    this.raf = 0;
    const root = (this.root = document.createElement('div'));
    root.className = 'stage';
    document.body.appendChild(root);
    this.camera = new THREE.PerspectiveCamera(FOV, 1, 1, 100000);
    this.scene = new THREE.Scene();
    this.gl = null;
    if (glOK()) {
      try {
        const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
        r.outputColorSpace = THREE.SRGBColorSpace;
        r.toneMapping = THREE.ACESFilmicToneMapping;
        r.toneMappingExposure = 1.05;
        // soft shadows, for the garage wall; nothing in the phone's own scene casts any
        r.shadowMap.enabled = true;
        r.shadowMap.type = THREE.VSMShadowMap;
        r.autoClear = false;
        r.domElement.className = 'stage-gl';
        r.domElement.setAttribute('aria-hidden', 'true');
        root.appendChild(r.domElement);
        const pmrem = new THREE.PMREMGenerator(r);
        this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        this.scene.environmentIntensity = 0.85;
        pmrem.dispose();
        this.gl = r;
      } catch (e) {
        this.gl = null;
      }
    }
    if (!this.gl) root.classList.add('nogl');
    this.css = new CSS3DRenderer();
    this.css.domElement.className = 'stage-css';
    root.appendChild(this.css.domElement);

    // a warm key from the lamp above, gold rim from behind, a cool kicker
    const key = new THREE.DirectionalLight(0xfff0d8, 1.5);
    key.position.set(-0.5, 1, 0.9);
    const rim = new THREE.DirectionalLight(0xf4b223, 3.2);
    rim.position.set(1, 0.35, -0.8);
    const kick = new THREE.DirectionalLight(0xd8e2ff, 0.5);
    kick.position.set(-1, -0.3, -0.6);
    this.scene.add(key, rim, kick);

    this.pointer = { x: 0, y: 0, sx: 0, sy: 0, active: false };
    addEventListener(
      'pointermove',
      (e) => {
        if (e.pointerType === 'touch') return;
        this.pointer.x = (e.clientX / innerWidth) * 2 - 1;
        this.pointer.y = (e.clientY / innerHeight) * 2 - 1;
        this.wake();
      },
      { passive: true },
    );
    addEventListener('scroll', () => this.wake(), { passive: true });
    addEventListener('resize', () => {
      this.resize();
      this.wake();
    });
    document.addEventListener('visibilitychange', () => this.wake());
    this.resize();
    this.t0 = performance.now();
    this.last = this.t0;
    this.frame = this.frame.bind(this);
  }

  resize() {
    const vw = (this.vw = document.documentElement.clientWidth);
    const vh = (this.vh = innerHeight);
    this.D = vh / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const c = this.camera;
    c.aspect = vw / vh;
    c.position.set(0, 0, this.D);
    c.near = this.D / 20;
    c.far = this.D * 8;
    c.updateProjectionMatrix();
    if (this.gl) {
      // a fixed budget of device pixels: a 5K ultrawide gets a softer canvas,
      // never a slower one. The screens are DOM and stay sharp regardless.
      const budget = 7e6;
      const pr = Math.max(0.7, Math.min(devicePixelRatio || 1, 2, Math.sqrt(budget / (vw * vh))));
      this.gl.setPixelRatio(pr);
      this.gl.setSize(vw, vh, false);
      this.gl.domElement.style.width = `${vw}px`;
      this.gl.domElement.style.height = `${vh}px`;
    }
    this.css.setSize(vw, vh);
  }

  wake() {
    if (!this.raf && !document.hidden) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.frame);
    }
  }

  frame(now) {
    this.raf = 0;
    const dt = Math.min(0.05, Math.max(0.001, (now - this.last) / 1000));
    this.last = now;
    const t = (now - this.t0) / 1000;
    const p = this.pointer;
    const k = this.reduce ? 1 : 1 - Math.exp(-dt * 4);
    p.sx += (p.x - p.sx) * k;
    p.sy += (p.y - p.sy) * k;
    let live = false;
    for (const d of this.devices) live = d.update(dt, t) || live;
    for (const x of this.extras) live = x.update(dt, t) || live;
    if (this.gl) {
      const r = this.gl;
      r.clear();
      for (const b of this.backdrops) b.render(r);
      r.clearDepth();
      r.render(this.scene, this.camera);
    }
    this.css.render(this.scene, this.camera);
    if (live && !document.hidden) this.raf = requestAnimationFrame(this.frame);
  }

  // ---------------------------------------------------------------- phone
  phone() {
    const P = PHONE;
    const g = new THREE.Group();
    const materials = [];
    if (this.gl) {
      const mat = (m, base) => {
        m.userData.base = base ?? 1;
        materials.push(m);
        return m;
      };
      const frame = mat(new THREE.MeshPhysicalMaterial({ color: 0x45413a, metalness: 1, roughness: 0.3, clearcoat: 0.35, clearcoatRoughness: 0.25 }));
      const bevel = 7;
      const body = new THREE.ExtrudeGeometry(rr(P.bw - bevel * 2, P.bh - bevel * 2, P.br - bevel), {
        depth: P.depth - bevel * 2,
        bevelEnabled: true,
        bevelThickness: bevel,
        bevelSize: bevel,
        bevelSegments: 6,
        curveSegments: 28,
      });
      body.center();
      g.add(new THREE.Mesh(body, frame));
      const FZ = P.depth / 2;
      const glass = new THREE.Mesh(
        new THREE.ShapeGeometry(rr(P.bw - 3, P.bh - 3, P.br - 1.5), 28),
        mat(new THREE.MeshPhysicalMaterial({ color: 0x050505, metalness: 0, roughness: 0.08, clearcoat: 1 })),
      );
      glass.position.z = FZ + 0.3;
      g.add(glass);
      const black = new THREE.Mesh(new THREE.ShapeGeometry(rr(P.w, P.h, P.r), 28), mat(new THREE.MeshBasicMaterial({ color: 0x000000 })));
      black.position.z = FZ + 0.6;
      g.add(black);
      const back = new THREE.Mesh(
        new THREE.ShapeGeometry(rr(P.bw - 4, P.bh - 4, P.br - 2), 28),
        mat(new THREE.MeshPhysicalMaterial({ color: 0x23211e, metalness: 0.25, roughness: 0.62 })),
      );
      back.position.z = -FZ - 0.3;
      back.rotation.y = Math.PI;
      g.add(back);
      // camera plateau and three lenses, top left seen from behind
      const plateau = new THREE.Mesh(
        new THREE.ExtrudeGeometry(rr(162, 162, 40), { depth: 6, bevelEnabled: true, bevelThickness: 3, bevelSize: 3, bevelSegments: 3, curveSegments: 16 }),
        mat(new THREE.MeshPhysicalMaterial({ color: 0x2c2a26, metalness: 0.5, roughness: 0.4 })),
      );
      plateau.position.set(P.bw / 2 - 100, P.bh / 2 - 100, -FZ - 9);
      g.add(plateau);
      const lensMat = mat(new THREE.MeshPhysicalMaterial({ color: 0x0a0a0c, metalness: 0.2, roughness: 0.05, clearcoat: 1 }));
      const ringMat = mat(new THREE.MeshPhysicalMaterial({ color: 0x5a554d, metalness: 1, roughness: 0.25 }));
      for (const [lx, ly] of [[-36, 36], [-36, -36], [38, 0]]) {
        const ring = new THREE.Mesh(new THREE.CylinderGeometry(27, 27, 12, 32), ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.set(P.bw / 2 - 100 + lx, P.bh / 2 - 100 + ly, -FZ - 16);
        const lens = new THREE.Mesh(new THREE.CircleGeometry(20, 32), lensMat);
        lens.position.set(ring.position.x, ring.position.y, -FZ - 22.2);
        lens.rotation.y = Math.PI;
        g.add(ring, lens);
      }
      const btn = (x, y, h) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(6, h, P.depth * 0.42), frame);
        m.position.set(x, y, 0);
        g.add(m);
      };
      btn(-P.bw / 2 - 2, 250, 64);
      btn(-P.bw / 2 - 2, 160, 64);
      btn(-P.bw / 2 - 2, 330, 30);
      btn(P.bw / 2 + 2, 200, 100);
    }
    const el = document.createElement('div');
    el.className = 'dev-screen dev-phone';
    const obj = new CSS3DObject(el);
    obj.position.z = P.depth / 2 + 1;
    g.add(obj);
    this.scene.add(g);
    const d = new Device(this, { el, group: g, height: P.bh, materials });
    this.devices.push(d);
    return d;
  }

  // --------------------------------------------------------------- laptop
  laptop() {
    const L = LAPTOP;
    const g = new THREE.Group();
    const materials = [];
    const lidW = L.w + L.bezel * 2;
    const lidH = L.h + L.bezel + L.chin;
    const lid = new THREE.Group();
    g.add(lid);
    if (this.gl) {
      const mat = (m) => {
        m.userData.base = 1;
        materials.push(m);
        return m;
      };
      const alu = mat(new THREE.MeshPhysicalMaterial({ color: 0x3d3a35, metalness: 1, roughness: 0.38, clearcoat: 0.2 }));
      const shell = new THREE.Mesh(
        new THREE.ExtrudeGeometry(rr(lidW - 8, lidH - 8, 22), { depth: L.depth - 8, bevelEnabled: true, bevelThickness: 4, bevelSize: 4, bevelSegments: 3, curveSegments: 12 }),
        alu,
      );
      shell.geometry.center();
      lid.add(shell);
      const face = new THREE.Mesh(new THREE.ShapeGeometry(rr(lidW - 4, lidH - 4, 20), 12), mat(new THREE.MeshPhysicalMaterial({ color: 0x070707, roughness: 0.1, clearcoat: 1 })));
      face.position.z = L.depth / 2 + 0.3;
      lid.add(face);
      // the base, folded out towards the viewer
      const baseD = lidH * 0.92;
      const base = new THREE.Mesh(
        new THREE.ExtrudeGeometry(rr(lidW + 20, baseD, 26), { depth: 16, bevelEnabled: true, bevelThickness: 4, bevelSize: 4, bevelSegments: 3, curveSegments: 12 }),
        alu,
      );
      base.geometry.center();
      base.rotation.x = -Math.PI / 2 + 0.02;
      base.position.set(0, -lidH / 2 - 10, baseD / 2 - 4);
      g.add(base);
      const deck = new THREE.Mesh(new THREE.PlaneGeometry(lidW - 120, baseD * 0.42), mat(new THREE.MeshStandardMaterial({ color: 0x141412, roughness: 0.8 })));
      deck.rotation.x = -Math.PI / 2;
      deck.position.set(0, -lidH / 2 - 1, baseD * 0.3);
      g.add(deck);
    }
    const el = document.createElement('div');
    el.className = 'dev-screen dev-laptop';
    const obj = new CSS3DObject(el);
    obj.position.set(0, (L.chin - L.bezel) / 2, L.depth / 2 + 1);
    lid.add(obj);
    this.scene.add(g);
    const d = new Device(this, { el, group: g, height: lidH, materials });
    this.devices.push(d);
    return d;
  }

  // ------------------------------------------------- things beside a phone
  // DOM plates that float round a device, in the device's own coordinates.
  // Their opacity is the caller's to run: they come and go with the hero.
  plate(device, html, { x, y, z, cls = '' }) {
    const el = document.createElement('div');
    el.className = `dev-plate ${cls}`;
    el.dir = document.documentElement.dir || 'ltr';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = html;
    const obj = new CSS3DObject(el);
    obj.position.set(x, y, z);
    el.style.pointerEvents = 'none';
    device.group.add(obj);
    return { el, obj };
  }

  // Dust in the lamp's light, round the hero phone.
  dust(follow) {
    if (!this.gl || this.reduce) return null;
    const N = 260;
    const pos = new Float32Array(N * 3);
    const seed = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      seed[i * 3] = Math.random();
      seed[i * 3 + 1] = Math.random();
      seed[i * 3 + 2] = Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d');
    const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,236,200,1)');
    gr.addColorStop(0.35, 'rgba(255,214,150,0.45)');
    gr.addColorStop(1, 'rgba(255,200,120,0)');
    x.fillStyle = gr;
    x.fillRect(0, 0, 64, 64);
    const mat = new THREE.PointsMaterial({
      size: 7,
      map: new THREE.CanvasTexture(c),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.6,
      toneMapped: false,
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    this.scene.add(pts);
    const s = this;
    const ex = {
      update(dt, t) {
        const f = follow(t);
        if (!f || f.o <= 0.01) {
          pts.visible = false;
          return false;
        }
        pts.visible = true;
        mat.opacity = 0.55 * f.o;
        const W = f.w, H = f.h, Z = f.w * 0.6;
        const cx = f.x - s.vw / 2, cy = s.vh / 2 - f.y;
        for (let i = 0; i < N; i++) {
          const a = seed[i * 3], b = seed[i * 3 + 1], cc = seed[i * 3 + 2];
          const yy = ((b + t * (0.012 + a * 0.02)) % 1) - 0.5;
          pos[i * 3] = cx + (a - 0.5) * W + Math.sin(t * (0.3 + cc) + i) * 18;
          pos[i * 3 + 1] = cy + yy * H;
          pos[i * 3 + 2] = (cc - 0.5) * Z;
        }
        geo.attributes.position.needsUpdate = true;
        return true;
      },
    };
    this.extras.push(ex);
    return ex;
  }
}
