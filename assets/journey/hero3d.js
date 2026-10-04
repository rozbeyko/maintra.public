// Hero: a phone in 3D playing the garage, the + menu, the swipe and the polaroid-to-hero motion.
import * as THREE from './three.module.min.js';
import { RoomEnvironment } from './RoomEnvironment.js';

const wrap = document.getElementById('hero3d');
const vid = document.getElementById('heroVid');
const canvas = wrap.querySelector('canvas');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

function glOK() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
}

async function init() {
  if (!glOK()) { wrap.classList.add('nogl'); vid.play().catch(() => {}); return; }
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);

  const gold = new THREE.PointLight(0xF4B223, 40, 14, 2); gold.position.set(2.6, 1.8, -2.2); scene.add(gold);
  const warm = new THREE.PointLight(0xFFE2B0, 10, 12, 2); warm.position.set(-3, 3, 4); scene.add(warm);

  // ---- phone ----
  const W = 1.85, H = 4.0, R = 0.27;
  const BW = W + 0.2, BH = H + 0.2, BR = R + 0.08;
  const rr = (w, h, r) => {
    const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0);
    s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2);
    s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
    s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
    return s;
  };
  const uvFit = (g, w, h) => {
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + w / 2) / w, (p.getY(i) + h / 2) / h);
    uv.needsUpdate = true; return g;
  };

  const phone = new THREE.Group();
  const frameMat = new THREE.MeshPhysicalMaterial({ color: 0x45413b, metalness: 1, roughness: 0.3, clearcoat: 0.4, clearcoatRoughness: 0.2 });
  const bodyG = new THREE.ExtrudeGeometry(rr(BW - 0.08, BH - 0.08, BR - 0.04), { depth: 0.22, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 6, curveSegments: 28 });
  bodyG.center();
  const body = new THREE.Mesh(bodyG, frameMat); phone.add(body);
  const FZ = 0.161;
  const backMat = new THREE.MeshPhysicalMaterial({ color: 0x1b1a18, metalness: 0.2, roughness: 0.55 });
  const back = new THREE.Mesh(new THREE.ShapeGeometry(rr(BW - 0.06, BH - 0.06, BR - 0.03), 28), backMat);
  back.position.z = -FZ - 0.001; back.rotation.y = Math.PI; phone.add(back);
  const glass = new THREE.Mesh(new THREE.ShapeGeometry(rr(BW - 0.05, BH - 0.05, BR - 0.03), 28),
    new THREE.MeshPhysicalMaterial({ color: 0x030303, metalness: 0, roughness: 0.06, clearcoat: 1 }));
  glass.position.z = FZ + 0.001; phone.add(glass);

  const poster = await new THREE.TextureLoader().loadAsync(new URL('hero-poster.webp', import.meta.url).href);
  poster.colorSpace = THREE.SRGBColorSpace;
  const screenMat = new THREE.MeshBasicMaterial({ map: poster, toneMapped: false });
  const screen = new THREE.Mesh(uvFit(new THREE.ShapeGeometry(rr(W, H, R), 28), W, H), screenMat);
  screen.position.z = FZ + 0.003; phone.add(screen);

  // soft moving glare on the glass
  const gc = document.createElement('canvas'); gc.width = 256; gc.height = 512;
  const gx = gc.getContext('2d'); const gg = gx.createLinearGradient(0, 0, 256, 512);
  gg.addColorStop(0, 'rgba(255,255,255,0)'); gg.addColorStop(0.42, 'rgba(255,255,255,0)'); gg.addColorStop(0.5, 'rgba(255,255,255,1)');
  gg.addColorStop(0.58, 'rgba(255,255,255,0)'); gg.addColorStop(1, 'rgba(255,255,255,0)');
  gx.fillStyle = gg; gx.fillRect(0, 0, 256, 512);
  const glareTex = new THREE.CanvasTexture(gc); glareTex.wrapS = glareTex.wrapT = THREE.RepeatWrapping; glareTex.repeat.set(1, 0.6);
  const glare = new THREE.Mesh(uvFit(new THREE.ShapeGeometry(rr(W, H, R), 28), W, H),
    new THREE.MeshBasicMaterial({ map: glareTex, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  glare.position.z = FZ + 0.006; phone.add(glare);

  const island = new THREE.Mesh(new THREE.ShapeGeometry(rr(0.54, 0.155, 0.0775), 16), new THREE.MeshBasicMaterial({ color: 0x000000 }));
  island.position.set(0, H / 2 - 0.16, FZ + 0.007); phone.add(island);
  const btn = (x, y, h) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.035, h, 0.12), frameMat); m.position.set(x, y, 0); phone.add(m); };
  btn(-BW / 2 - 0.012, 1.05, 0.34); btn(-BW / 2 - 0.012, 0.6, 0.34); btn(-BW / 2 - 0.012, 1.5, 0.16); btn(BW / 2 + 0.012, 0.9, 0.5);
  const cam = new THREE.Mesh(new THREE.ExtrudeGeometry(rr(0.7, 0.7, 0.18), { depth: 0.04, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3 }),
    new THREE.MeshPhysicalMaterial({ color: 0x24221f, metalness: 0.6, roughness: 0.35 }));
  cam.position.set(BW / 2 - 0.55, BH / 2 - 0.55, -FZ - 0.04); cam.rotation.y = Math.PI; phone.add(cam);

  // ---- floating plates, drawn in the app's own style ----
  await Promise.all([document.fonts.load('italic 800 40px Tektur'), document.fonts.load('700 40px Tektur'), document.fonts.load('500 30px "Fira Sans"')]).catch(() => {});
  const C = { bg: 'rgba(21,21,19,0.94)', edge: '#3A3732', text: '#ECE4D6', muted: '#8F897E', gold: '#F4B223', red: '#EE4F37' };
  const S = 3;
  function plate(w, h, draw) {
    const c = document.createElement('canvas'); c.width = w * S; c.height = h * S;
    const x = c.getContext('2d'); x.scale(S, S);
    try { x.fontStretch = 'condensed'; } catch (e) {}
    const cut = 10;
    x.beginPath(); x.moveTo(cut, 0); x.lineTo(w, 0); x.lineTo(w, h - cut); x.lineTo(w - cut, h); x.lineTo(0, h); x.lineTo(0, cut); x.closePath();
    x.fillStyle = C.bg; x.fill(); x.strokeStyle = C.edge; x.lineWidth = 1.2; x.stroke();
    draw(x, w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    const k = 0.0105;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w * k, h * k), new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false, depthWrite: false }));
    return m;
  }
  const oct = (x, cx, cy, r, col) => { x.beginPath(); for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; x.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a)); } x.closePath(); x.fillStyle = col; x.fill(); };
  const label = (x, s, px, py, col) => { x.font = '700 11px Tektur'; x.fillStyle = col || C.muted; if ('letterSpacing' in x) x.letterSpacing = '1.5px'; x.fillText(s, px, py); if ('letterSpacing' in x) x.letterSpacing = '0px'; };
  const pOil = plate(170, 74, (x, w) => {
    label(x, 'OIL + FILTERS', 16, 24);
    x.font = 'italic 800 30px Tektur'; x.fillStyle = C.text; x.fillText('4 023', 16, 56);
    const kw = x.measureText('4 023').width;
    x.font = '500 14px "Fira Sans"'; x.fillStyle = C.muted; x.fillText('km', 16 + kw + 6, 56);
    x.fillStyle = '#2A2825'; x.fillRect(16, 63, w - 32, 4); x.fillStyle = C.gold; x.fillRect(16, 63, (w - 32) * 0.58, 4);
  });
  const pLate = plate(210, 56, (x, w) => {
    oct(x, 22, 28, 6, C.red);
    x.font = '500 16px "Fira Sans"'; x.fillStyle = C.text; x.fillText('Coolant hose', 38, 25);
    x.font = '500 13px "Fira Sans"'; x.fillStyle = C.red; x.fillText('5 days late', 38, 43);
  });
  const pHealth = plate(186, 50, (x, w) => {
    label(x, 'HEALTH', 16, 31);
    x.font = '700 11px Tektur'; const lw = x.measureText('HEALTH').width + 6 * 1.5;
    x.font = 'italic 800 24px Tektur'; x.fillStyle = C.text; x.fillText('71', 16 + lw + 8, 34);
    const nx = 16 + lw + 8 + x.measureText('71').width + 10;
    for (let i = 0; i < 10; i++) { x.fillStyle = i < 7 ? C.gold : '#3A3732'; x.beginPath(); const bx = nx + i * 6.4; x.moveTo(bx + 2, 22); x.lineTo(bx + 5.4, 22); x.lineTo(bx + 3.4, 30); x.lineTo(bx, 30); x.closePath(); x.fill(); }
  });
  const plates = [
    { m: pOil, base: new THREE.Vector3(-2.05, 1.25, 0.7), ph: 0.0, d: 0.35 },
    { m: pLate, base: new THREE.Vector3(2.15, 0.25, 0.9), ph: 1.7, d: 0.75 },
    { m: pHealth, base: new THREE.Vector3(-1.95, -1.35, 0.5), ph: 3.1, d: 1.1 },
  ];
  const rig = new THREE.Group(); rig.add(phone); plates.forEach(p => { p.m.material.opacity = 0; rig.add(p.m); }); scene.add(rig);

  // soft floor shadow
  const sc = document.createElement('canvas'); sc.width = sc.height = 256;
  const sx = sc.getContext('2d'); const sg = sx.createRadialGradient(128, 128, 0, 128, 128, 128);
  sg.addColorStop(0, 'rgba(0,0,0,0.55)'); sg.addColorStop(1, 'rgba(0,0,0,0)'); sx.fillStyle = sg; sx.fillRect(0, 0, 256, 256);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.0), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -BH / 2 - 0.35; scene.add(shadow);


  // ---- video ----
  let vtex = null;
  const useVideo = () => {
    if (vtex) return;
    vtex = new THREE.VideoTexture(vid); vtex.colorSpace = THREE.SRGBColorSpace; vtex.minFilter = THREE.LinearFilter; vtex.generateMipmaps = false;
    screenMat.map = vtex; screenMat.needsUpdate = true;
  };
  vid.addEventListener('playing', useVideo);
  if (!reduce) vid.play().catch(() => {});
  wrap.addEventListener('pointerdown', () => { if (vid.paused && !reduce) vid.play().catch(() => {}); });

  // ---- layout ----
  let narrow = false;
  function resize() {
    const r = wrap.getBoundingClientRect(); const w = Math.max(1, r.width), h = Math.max(1, r.height);
    renderer.setSize(w, h, false); camera.aspect = w / h;
    narrow = w < 600;
    const needH = BH * 1.22, needW = narrow ? 3.8 : 6.6;
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    camera.position.set(0, 0, Math.max(needH / 2 / t, needW / 2 / t / camera.aspect));
    camera.updateProjectionMatrix();
    plates.forEach(p => { p.k = narrow ? 0.5 : 1; });
  }
  new ResizeObserver(resize).observe(wrap); resize();

  // ---- input ----
  const pt = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
  addEventListener('pointermove', e => { pt.x = e.clientX / innerWidth * 2 - 1; pt.y = e.clientY / innerHeight * 2 - 1; }, { passive: true });

  // ---- loop ----
  let visible = true, start = performance.now();
  addEventListener('journey:reveal', () => { start = performance.now(); try { vid.currentTime = 0; } catch (e) {} });
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) loop(); }, { threshold: 0 }).observe(wrap);
  const ease = t => 1 - Math.pow(1 - t, 3);
  function frame(now) {
    const t = (now - start) / 1000;
    const intro = reduce ? 1 : ease(Math.min(1, t / 1.6));
    cur.x += (pt.x - cur.x) * 0.06; cur.y += (pt.y - cur.y) * 0.06;
    const r = wrap.getBoundingClientRect();
    const sp = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height)));
    const fl = reduce ? 0 : 1;
    rig.rotation.y = -0.34 + (1 - intro) * -1.1 + cur.x * 0.22 * fl + sp * 0.5;
    rig.rotation.x = 0.05 + cur.y * 0.1 * fl - sp * 0.15;
    rig.rotation.z = Math.sin(t * 0.6) * 0.012 * fl;
    rig.position.y = Math.sin(t * 0.9) * 0.06 * fl + (1 - intro) * -0.5 + sp * 0.6;
    glareTex.offset.y = 0.2 + rig.rotation.y * 0.5;
    plates.forEach(p => {
      const a = reduce ? 1 : ease(Math.min(1, Math.max(0, (t - 1.0 - p.d * 0.5) / 0.7)));
      p.m.material.opacity = a;
      p.m.position.set(p.base.x * p.k + (1 - a) * (p.base.x > 0 ? 0.6 : -0.6), p.base.y + Math.sin(t * 1.1 + p.ph) * 0.05 * fl, p.base.z);
      p.m.scale.setScalar(narrow ? 0.64 : 1);
      p.m.lookAt(camera.position.x * 0.3, camera.position.y, camera.position.z);
    });
    renderer.render(scene, camera);
  }
  let raf = 0;
  function loop() {
    cancelAnimationFrame(raf);
    const step = now => { if (!visible || document.hidden) return; frame(now); raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) loop(); });
  wrap.classList.add('ready');
  loop();
}
init().catch(e => { console.error(e); wrap.classList.add('nogl'); });
