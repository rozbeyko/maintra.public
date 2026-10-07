// The hero's garage: a wall behind the phone, a light over it and, by day, a
// window. Drawn by the stage's renderer before the phone, with its own camera
// that scrolls with the page, so the room moves like part of the page while
// the phone (drawn with the page-fixed camera) flies on into the tour.
//
// Night, the dark theme: a light hangs above the page, out of sight. Its warm
// beam comes in from the top with dust in it, washes the wall behind the
// phone and shows the tools painted there. Day, the light theme: the light is
// off, the sun comes through a window and throws the frame's shadow and the
// phone's on the wall. Switching the theme switches the garage's day and night.
//
// World units are CSS pixels, as on the stage. The room's own coordinates are
// the page's with the hero at the top ("unscrolled"); its camera is the stage
// camera with a view offset of however far the hero has scrolled.

import * as THREE from '../journey/three.module.min.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));

function radial(stops) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (const [o, col] of stops) g.addColorStop(o, col);
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
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

// The wall: plaster, with the brand's tools painted on it (the doodle). The
// doodle is gold lines on near black; its brightness is the paint.
function wallTexture(img, theme) {
  const W = img.naturalWidth, H = img.naturalHeight;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(img, 0, 0);
  const id = x.getImageData(0, 0, W, H);
  const p = id.data;
  // plaster: two octaves of value noise on a coarse grid, and a little grain
  const gw = 40, gh = Math.ceil((40 * H) / W);
  const grid = new Float32Array((gw + 1) * (gh + 1)).map(() => Math.random());
  const grid2 = new Float32Array((gw * 4 + 1) * (gh * 4 + 1)).map(() => Math.random());
  const sample = (g, n, m, u, v) => {
    const fx = u * n, fy = v * m;
    const ix = Math.min(n - 1, fx | 0), iy = Math.min(m - 1, fy | 0);
    const tx = fx - ix, ty = fy - iy;
    const a = g[iy * (n + 1) + ix], b = g[iy * (n + 1) + ix + 1];
    const c2 = g[(iy + 1) * (n + 1) + ix], d = g[(iy + 1) * (n + 1) + ix + 1];
    return a + (b - a) * tx + (c2 - a + (a - b - c2 + d) * tx) * ty;
  };
  const dark = theme === 'dark';
  for (let yy = 0; yy < H; yy++) {
    for (let xx = 0; xx < W; xx++) {
      const i = (yy * W + xx) * 4;
      const line = clamp((Math.max(p[i], p[i + 1]) - 34) / 150, 0, 1);
      const u = xx / W, v = yy / H;
      const n = 0.62 * sample(grid, gw, gh, u, v) + 0.38 * sample(grid2, gw * 4, gh * 4, u, v) + (Math.random() - 0.5) * 0.12;
      if (dark) {
        // grey concrete: it is the lamp that makes it dark, not the paint
        const base = 60 + n * 24;
        p[i] = base + line * (205 - base) * 0.3;
        p[i + 1] = base * 0.97 + line * (162 - base) * 0.3;
        p[i + 2] = base * 0.9 + line * (70 - base) * 0.3;
      } else {
        const base = 228 + n * 14;
        const k = 1 - line * 0.075;
        p[i] = base * k;
        p[i + 1] = base * 0.985 * k;
        p[i + 2] = base * 0.955 * k;
      }
      p[i + 3] = 255;
    }
  }
  x.putImageData(id, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

const CONE_VERT = /* glsl */ `
  uniform float uLen;
  varying vec3 vNormalV;
  varying vec3 vViewPos;
  varying vec3 vWorld;
  varying float vT;
  void main() {
    vT = clamp(-position.y / uLen, 0.0, 1.0);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vViewPos = mv.xyz;
    vNormalV = normalize(normalMatrix * normal);
    vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * mv;
  }
`;
const CONE_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOn;
  uniform float uTime;
  varying vec3 vNormalV;
  varying vec3 vViewPos;
  varying vec3 vWorld;
  varying float vT;
  float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
  float noise(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
  }
  void main() {
    // through the middle of the cone the eye crosses the most lit air: the
    // sides fade to nothing, so the beam has no edge to draw
    float facing = abs(dot(normalize(vNormalV), normalize(-vViewPos)));
    float body = pow(facing, 2.2);
    // brightest under the shade, gone before it reaches the floor
    float fall = pow(1.0 - vT, 1.7) * smoothstep(0.0, 0.05, vT);
    // haze drifting through it
    float haze = 0.62 + 0.55 * noise(vWorld * 0.0045 + vec3(0.0, uTime * 0.035, uTime * 0.02))
                      + 0.25 * noise(vWorld * 0.013 + vec3(uTime * 0.05, 0.0, 0.0));
    float a = uOn * body * fall * haze;
    gl_FragColor = vec4(uColor * a, 1.0);
  }
`;

export class Room {
  constructor(stage, { hero, slot, phone, fit, reduce = false, nav = 64 }) {
    this.s = stage;
    this.hero = hero;
    this.slot = slot;
    this.phone = phone;
    this.fit = fit;
    this.reduce = reduce;
    this.nav = nav;
    this.ok = !!stage.gl;
    if (!this.ok) return;
    document.documentElement.classList.add('room');

    const scene = (this.scene = new THREE.Scene());
    this.cam = new THREE.PerspectiveCamera();
    this.theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    this.lampOn = this.theme === 'dark' ? 1 : 0;
    this.sunOn = 1 - this.lampOn;
    this.flick = 0;
    this.textures = {};

    // ambient: the room itself, faint at night, the whole daylight by day
    this.amb = new THREE.HemisphereLight(0xfff2e0, 0x2a2520, 0.3);
    scene.add(this.amb);

    // the lamp's light on the wall behind the phone: a warm scallop
    this.lampLight = new THREE.SpotLight(0xffd3a0, 0, 0, 0.72, 1, 1.25);
    scene.add(this.lampLight, this.lampLight.target);

    // the key: above and in front of the viewer, out of sight. It is what
    // throws the phone's shadow onto the wall at night.
    this.key = new THREE.SpotLight(0xffe7c4, 0, 0, 0.42, 1, 0);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(1024, 1024);
    this.key.shadow.radius = 14;
    this.key.shadow.blurSamples = 20;
    this.key.shadow.bias = -0.0004;
    scene.add(this.key, this.key.target);

    // the sun, by day, through a window frame (an occluder nobody sees)
    this.sun = new THREE.DirectionalLight(0xfff1dc, 0);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.radius = 9;
    this.sun.shadow.blurSamples = 16;
    this.sun.shadow.bias = -0.0005;
    scene.add(this.sun, this.sun.target);
    this.frame = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, side: THREE.DoubleSide }));
    this.frame.castShadow = true;
    scene.add(this.frame);

    // the wall
    this.wallMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.94, metalness: 0 });
    this.wall = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.wallMat);
    this.wall.receiveShadow = true;
    scene.add(this.wall);

    // the phone, as the wall sees it: a slab that only casts the shadow
    const P = stage.PHONE;
    const pg = new THREE.ExtrudeGeometry(rr(P.bw, P.bh, P.br), { depth: P.depth, bevelEnabled: false, curveSegments: 12 });
    pg.translate(0, 0, -P.depth / 2);
    this.proxy = new THREE.Mesh(pg, new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
    this.proxy.castShadow = true;
    scene.add(this.proxy);

    this.buildLamp();
    this.buildDust();

    // the lamp lights the phone too, in the phone's own scene
    this.phoneLamp = new THREE.SpotLight(0xffd29a, 0, 0, 0.85, 1, 0);
    stage.scene.add(this.phoneLamp, this.phoneLamp.target);

    this.loadWall();
    addEventListener('maintra-theme', (e) => {
      this.theme = e.detail === 'light' ? 'light' : 'dark';
      this.useWall();
      // the tube takes a moment to catch, as it does in a garage
      if (this.theme === 'dark' && !this.reduce) this.flick = 1;
      stage.wake();
    });
    stage.backdrops.push(this);
    stage.extras.push(this);
    addEventListener('resize', () => this.layout());
    this.layout();
  }

  // ------------------------------------------------------------- the lamp
  buildLamp() {
    // the light hangs above the page, out of sight: only its beam shows,
    // coming in from the top. The pivot lets it sway a little.
    const pivot = (this.pivot = new THREE.Group());
    this.scene.add(pivot);
    // the beam: built to size in layout()
    this.coneMat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(0.95, 0.72, 0.42) }, uOn: { value: 0 }, uTime: { value: 0 }, uLen: { value: 1 } },
      vertexShader: CONE_VERT,
      fragmentShader: CONE_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    this.cone = new THREE.Mesh(new THREE.BufferGeometry(), this.coneMat);
    this.cone.frustumCulled = false;
    pivot.add(this.cone);
  }

  // dust in the beam, in the phone's scene: some of it floats in front of the
  // phone, and the phone hides what is behind it
  buildDust() {
    const N = (this.N = 220);
    this.dpos = new Float32Array(N * 3);
    this.dcol = new Float32Array(N * 3);
    this.dseed = Array.from({ length: N }, () => [Math.random(), Math.random(), Math.random(), Math.random()]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.dpos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.dcol, 3));
    this.dust = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        size: 6,
        map: radial([[0, 'rgba(255,240,215,1)'], [0.4, 'rgba(255,220,170,.4)'], [1, 'rgba(255,210,150,0)']]),
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    );
    this.dust.frustumCulled = false;
    this.s.scene.add(this.dust);
  }

  // ------------------------------------------------------------- the wall
  loadWall() {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      this.img = img;
      this.useWall();
      this.s.wake();
    };
    img.src = '/assets/home/img/doodle.webp';
    this.useWall();
  }

  useWall() {
    const th = this.theme;
    this.wallMat.color.set(th === 'dark' ? 0x46423c : 0xe8e3d9);
    if (!this.img) return;
    if (!this.textures[th]) this.textures[th] = wallTexture(this.img, th);
    this.wallMat.color.set(0xffffff);
    this.wallMat.map = this.textures[th];
    this.wallMat.needsUpdate = true;
    this.layout();
  }

  // ---------------------------------------------------------------- layout
  layout() {
    if (!this.ok) return;
    const s = this.s;
    const vw = s.vw, vh = s.vh, D = s.D;
    const hr = this.hero.getBoundingClientRect();
    const d = -hr.top;
    this.heroH = hr.height;
    const sb = this.slot.getBoundingClientRect();
    const slot = this.fit({ x: sb.left + sb.width / 2, y: sb.top + sb.height / 2 + d, w: sb.width, h: sb.height });
    this.ph = slot.h;
    this.pxU = slot.x;
    this.pyU = slot.y;
    const wasNarrow = this.narrow;
    this.narrow = vw < 760;
    // a phone's GPU gets the smaller sun shadow map
    if (wasNarrow !== this.narrow) {
      const size = this.narrow ? 1024 : 2048;
      this.sun.shadow.mapSize.set(size, size);
      if (this.sun.shadow.map) {
        this.sun.shadow.map.dispose();
        this.sun.shadow.map = null;
      }
    }
    const W = (cx) => cx - vw / 2; // css x -> world x
    const Y = (cy) => vh / 2 - cy; // unscrolled css y -> world y

    // the wall, far enough behind for the shadow to fall away from the phone
    const zW = (this.zW = -clamp(slot.h * 0.62, 260, 900));
    const k = (D - zW) / D;
    const y0 = Y(0) * k, y1 = Y(this.heroH) * k;
    this.wall.position.set(0, (y0 + y1) / 2, zW);
    const wallW = vw * k * 1.15, wallH = (y0 - y1) * 1.06;
    this.wall.scale.set(wallW, wallH, 1);
    if (this.wallMat.map) {
      // the painted tools at the size the page used for its pattern
      const tile = clamp(vw * 0.3, 380, 760) * k;
      const tileH = (tile * this.img.naturalHeight) / this.img.naturalWidth;
      this.wallMat.map.repeat.set(wallW / tile, wallH / tileH);
    }

    // the light: above the page, over the phone and between it and the
    // wall, so it washes the wall behind the phone. Placed by where it would
    // be on screen, then pushed back to its depth.
    const zL = (this.zL = zW * 0.3);
    const kL = (this.kL = (D - zL) / D); // world units per screen pixel at that depth
    const Rs = clamp(slot.h * 0.085, 36, 120);
    const R = (this.R = Rs * kL);
    // on a phone the copy sits above the phone: the light comes from just
    // over the phone then, and the copy keeps a dark wall
    const top = slot.y - slot.h / 2;
    const bulbS = this.narrow ? Math.max(0, top - slot.h * 0.3) : -Rs * 1.4;
    const bx = W(slot.x) * kL, by = Y(bulbS) * kL;
    const cy = Y(-Rs * 6) * kL;
    this.pivot.position.set(bx, cy, zL);

    // the beam, from the light to just short of the floor
    const L = (this.L = Math.max(200, (this.heroH - bulbS) * kL * 0.98));
    const r0 = R * 0.9, r1 = r0 + L * Math.tan(0.36);
    const cone = new THREE.CylinderGeometry(r0, r1, L, 72, 24, true);
    cone.translate(0, -L / 2, 0);
    this.cone.geometry.dispose();
    this.cone.geometry = cone;
    this.cone.position.set(0, by - cy, 0);
    this.coneMat.uniforms.uLen.value = L;
    this.cone.visible = !this.narrow;

    // the lamp's light: from the bulb, washing the wall from just under it
    this.bulbU = { x: bx, y: by, z: zL };
    this.lampLight.position.set(bx, by, zL);
    this.lampLight.target.position.set(bx, by - slot.h * (this.narrow ? 0.85 : 1.15) * kL, zW);
    this.lampLight.intensity = 0;
    this.lampLight.target.updateMatrixWorld();

    // the key: high above and in front, slightly to the side of the copy
    const side = document.documentElement.dir === 'rtl' ? 1 : -1;
    this.key.position.set(W(slot.x) + side * slot.h * 0.32, Y(top) + slot.h * 0.95, slot.h * 1.25);
    this.key.target.position.set(W(slot.x), Y(slot.y), 0);
    this.key.target.updateMatrixWorld();
    this.key.shadow.camera.near = slot.h * 0.6;
    this.key.shadow.camera.far = slot.h * 4;
    this.key.distance = 0;

    // the sun: low, from the side of the copy, through a window of four panes
    // the patch lands round where the phone's shadow falls, so the shadow
    // sits in the sunlight, beside and under the phone
    const sunDir = new THREE.Vector3(side * 0.45, 0.5, 0.74).normalize();
    const aim = new THREE.Vector3(W(slot.x) - side * slot.h * 0.42, Y(slot.y + slot.h * 0.12), zW);
    this.sun.target.position.copy(aim);
    this.sun.position.copy(aim).addScaledVector(sunDir, slot.h * 3);
    this.sun.target.updateMatrixWorld();
    // the shadow map has to cover the whole wall: anywhere outside it would
    // count as open to the sun, window board or not
    const sc = this.sun.shadow.camera;
    const cover = Math.max(wallW, wallH) * 0.75;
    sc.left = -cover;
    sc.right = cover;
    sc.top = cover;
    sc.bottom = -cover;
    sc.near = 1;
    sc.far = slot.h * 6;
    sc.updateProjectionMatrix();
    // the frame: a big board with a window cut in it, square to the light,
    // between the sun and the room
    const pw = slot.h * 0.36, phh = slot.h * 0.46, bar = slot.h * 0.05;
    const board = new THREE.Shape();
    const B = slot.h * 4;
    board.moveTo(-B, -B);
    board.lineTo(B, -B);
    board.lineTo(B, B);
    board.lineTo(-B, B);
    board.lineTo(-B, -B);
    for (const [cx, cy] of [[-0.5, 0.5], [0.5, 0.5], [-0.5, -0.5], [0.5, -0.5]]) {
      const hole = new THREE.Path();
      const x0 = cx * (pw + bar) - pw / 2, y0h = cy * (phh + bar) - phh / 2;
      hole.moveTo(x0, y0h);
      hole.lineTo(x0, y0h + phh);
      hole.lineTo(x0 + pw, y0h + phh);
      hole.lineTo(x0 + pw, y0h);
      hole.lineTo(x0, y0h);
      board.holes.push(hole);
    }
    this.frame.geometry.dispose();
    this.frame.geometry = new THREE.ShapeGeometry(board);
    this.frame.position.copy(aim).addScaledVector(sunDir, slot.h * 1.7);
    this.frame.lookAt(aim);
    s.wake();
  }

  // ------------------------------------------------------ every frame
  update(dt, t) {
    if (!this.ok) return false;
    const hr = this.hero.getBoundingClientRect();
    this.d = -hr.top;
    this.visible = hr.bottom > 0 && hr.top < this.s.vh;
    if (Math.abs(hr.height - this.heroH) > 1) this.layout();
    // lamp on/off and the sun, eased; a flicker as the lamp catches
    const wantLamp = this.theme === 'dark' ? 1 : 0;
    const k = this.reduce ? 60 : 3.2;
    this.lampOn = damp(this.lampOn, wantLamp, k, dt);
    this.sunOn = damp(this.sunOn, 1 - wantLamp, k, dt);
    let flicker = 1;
    if (this.flick > 0) {
      this.flick = Math.max(0, this.flick - dt * 1.1);
      const f = 1 - this.flick;
      flicker = f < 0.35 ? (Math.sin(t * 90) > 0.2 ? 0.9 : 0.15) : f < 0.5 ? 0.35 : f < 0.62 ? (Math.sin(t * 60) > 0 ? 1 : 0.4) : 1;
    }
    const on = this.lampOn * flicker;
    // the lamp sways a little on its cord
    const sway = this.reduce ? 0 : Math.sin(t * 0.55) * 0.012 + Math.sin(t * 1.27 + 1.3) * 0.004;
    this.pivot.rotation.z = sway;
    this.coneMat.uniforms.uTime.value = t;
    this.coneMat.uniforms.uOn.value = on * 0.2;
    this.cone.visible = !this.narrow && on > 0.005;
    const lit = clamp(this.ph / 700, 0.6, 2.4);
    this.lampLight.intensity = on * 4.2e4 * lit;
    this.key.intensity = 0;
    this.sun.intensity = this.sunOn * 3.4;
    this.amb.intensity = 0.4 + this.sunOn * 3.5;
    this.amb.color.setRGB(1, 0.95 - this.lampOn * 0.04, 0.88 - this.lampOn * 0.06);
    this.key.castShadow = false;
    this.sun.castShadow = this.sunOn > 0.02;

    // the phone in the room, for the shadow
    const c = this.phone.cur;
    if (c && c.o > 0.4) {
      const s = this.s;
      this.proxy.visible = true;
      this.proxy.position.set(c.x - s.vw / 2, s.vh / 2 - (c.y + this.d), c.z);
      this.proxy.rotation.set(c.rx, c.ry, c.rz);
      this.proxy.scale.setScalar(c.h / this.s.PHONE.bh);
    } else this.proxy.visible = false;

    // the lamp on the phone, in the phone's scene (where the page is fixed)
    // (a screen shift of d pixels is d * kL world units at the lamp's depth)
    const bx = this.bulbU.x, by = this.bulbU.y + this.d * this.kL;
    this.phoneLamp.position.set(bx, by, this.bulbU.z);
    if (c) this.phoneLamp.target.position.set(c.x - this.s.vw / 2, this.s.vh / 2 - c.y, 0);
    this.phoneLamp.target.updateMatrixWorld();
    this.phoneLamp.intensity = this.visible ? on * 1.1 : 0;

    this.moveDust(dt, t, on);
    // keep drawing while the hero shows and something moves in it
    return this.visible && (!this.reduce || Math.abs(this.lampOn - wantLamp) > 0.002 || this.flick > 0);
  }

  moveDust(dt, t, on) {
    const show = this.visible && !this.narrow && on > 0.02 && !this.reduce;
    this.dust.visible = show;
    if (!show) return;
    const s = this.s;
    const R = this.R, L = this.L;
    // the beam in the phone's scene: the lamp's position, scrolled
    const ax = this.bulbU.x, ay = this.bulbU.y + this.d * this.kL, az = this.bulbU.z;
    const tilt = this.pivot.rotation.z;
    const ph = this.ph;
    for (let i = 0; i < this.N; i++) {
      const [a, b, c2, e] = this.dseed[i];
      // down the beam, slowly; round it, lazily
      const u = (a + t * (0.004 + e * 0.006)) % 1;
      const along = 0.04 + u * 0.8;
      const rad = (R * 0.9 + along * L * Math.tan(0.36)) * Math.sqrt(b) * 0.92;
      const ang = c2 * Math.PI * 2 + t * (0.05 + e * 0.08) * (i % 2 ? 1 : -1);
      const x = ax + Math.cos(ang) * rad + Math.sin(t * 0.7 + i) * 6 - along * L * tilt;
      const y = ay - along * L;
      const z = az + Math.sin(ang) * rad * 0.8;
      this.dpos[i * 3] = x;
      this.dpos[i * 3 + 1] = y;
      this.dpos[i * 3 + 2] = z;
      // bright near the shade and the middle of the beam, twinkling as they turn
      const core = 1 - Math.sqrt(b) * 0.7;
      const tw = 0.55 + 0.45 * Math.sin(t * (1.2 + e * 2.3) + i * 1.7);
      const v = on * core * tw * Math.pow(1 - along, 1.2) * 0.9;
      this.dcol[i * 3] = v;
      this.dcol[i * 3 + 1] = v * 0.86;
      this.dcol[i * 3 + 2] = v * 0.62;
    }
    this.dust.material.size = clamp(ph / 120, 4, 12);
    this.dust.geometry.attributes.position.needsUpdate = true;
    this.dust.geometry.attributes.color.needsUpdate = true;
    void s;
  }

  // ------------------------------------------------- drawn before the phone
  render(r) {
    if (!this.ok || !this.visible) return;
    const s = this.s, cam = this.cam, sc = s.camera;
    cam.fov = sc.fov;
    cam.aspect = sc.aspect;
    cam.near = sc.near;
    cam.far = sc.far;
    cam.position.copy(sc.position);
    cam.setViewOffset(s.vw, s.vh, 0, this.d, s.vw, s.vh);
    cam.updateProjectionMatrix();
    r.render(this.scene, cam);
  }
}
