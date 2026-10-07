// The landing page: one phone that plays the app in the hero, flies into the
// tour as the page scrolls, and follows the tour's chapters there; a second
// phone for lending and a laptop for the mechanic join it on wide screens.

import { Stage } from './stage.js?v=c12b03ea';
import { Player, loadIndex, prefetch } from './player.js?v=4104dfe0';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const root = document.documentElement;
const cfg = JSON.parse($('#cfg').textContent);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const rtl = root.dir === 'rtl';
const side = rtl ? 1 : -1; // where the extra devices stand, towards the index

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const mix = (a, b, t) => a + (b - a) * t;
const inOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const outCubic = (t) => 1 - Math.pow(1 - t, 3);

// ------------------------------------------------------------ header, menu
const top = $('.top');
const onScroll = () => top.classList.toggle('solid', scrollY > 8);
addEventListener('scroll', onScroll, { passive: true });
onScroll();

const langBtn = $('.lang-btn');
const langMenu = $('#lang-menu');
function menu(open) {
  langMenu.hidden = !open;
  langBtn.setAttribute('aria-expanded', String(open));
  if (open) (langMenu.querySelector('[aria-current]') || langMenu.querySelector('a')).focus();
}
langBtn.addEventListener('click', () => menu(langMenu.hidden));
document.addEventListener('click', (e) => {
  if (!langMenu.hidden && !e.target.closest('.lang')) menu(false);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !langMenu.hidden) {
    menu(false);
    langBtn.focus();
  }
});
// a chosen language is remembered, so the next visit to / goes straight there
for (const a of $$('[data-lang]')) {
  a.addEventListener('click', () => {
    try {
      localStorage.setItem('maintra.lang', a.dataset.lang);
    } catch (e) {}
  });
}

// the store a visitor can actually use goes first and gold
(() => {
  const ua = navigator.userAgent;
  const android = /Android/i.test(ua);
  if (!android) return;
  for (const box of $$('.stores')) {
    const ios = box.querySelector('[data-store="ios"]');
    const play = box.querySelector('[data-store="android"]');
    if (!ios || !play) continue;
    box.insertBefore(play, ios);
    ios.classList.replace('btn-gold', 'btn-line');
    play.classList.replace('btn-line', 'btn-gold');
  }
})();

// section in view lights its link in the header
const navLinks = new Map($$('.top-nav a').map((a) => [a.getAttribute('href').slice(1), a]));
const navIO = new IntersectionObserver(
  (es) => {
    for (const e of es) {
      const a = navLinks.get(e.target.id);
      if (!a) continue;
      if (e.isIntersecting) {
        navLinks.forEach((x) => x.removeAttribute('aria-current'));
        a.setAttribute('aria-current', 'true');
      }
    }
  },
  { rootMargin: '-50% 0px -49% 0px' },
);
for (const id of navLinks.keys()) {
  const s = document.getElementById(id);
  if (s) navIO.observe(s);
}

// ---------------------------------------------------------------- reveals
const rvIO = new IntersectionObserver(
  (es, o) => {
    for (const e of es) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('in');
      o.unobserve(e.target);
    }
  },
  { rootMargin: '0px 0px -12% 0px' },
);
for (const group of [$$('.sec-head'), $$('.tile'), $$('.plan'), $$('.qa details'), $$('.maker-copy > *'), [$('.maker-pol')], [$('.get-copy')], [$('.get-pol')]]) {
  group.forEach((el, i) => {
    if (!el) return;
    if (!el.classList.contains('get-pol')) el.classList.add('rv');
    el.style.setProperty('--i', String(i % 6));
    rvIO.observe(el);
  });
}

// ------------------------------------------------------------------ stage
const heroSlot = $('[data-slot="hero"]');
const tourSlot = $('[data-slot="tour"]');
const tourStage = $('.tour-stage');
const box = (el) => {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, top: r.top };
};
// a slot holds a phone: as tall as it is, unless that makes the phone wider
const fit = (b) => ({ ...b, h: Math.min(b.h, (b.w * 868) / 414) });
let stickTop = 0;
const measure = () => (stickTop = parseFloat(getComputedStyle(tourStage).top) || 0);
addEventListener('resize', measure);
measure();
// The hero phone scrolls with the page until it reaches the middle of the
// screen, holds there while the hero leaves, and glides into the tour as the
// tour's phone column arrives. flight() is that glide: 0 in the hero, 1 once
// the tour phone has stuck in place.
const holdY = () => innerHeight * (innerWidth < 900 ? 0.55 : 0.5) + 16;
function flight() {
  const H = heroSlot.getBoundingClientRect();
  const s0 = H.top + H.height / 2 + scrollY - holdY();
  const s1 = tourStage.getBoundingClientRect().top + scrollY - stickTop;
  return s1 > s0 ? clamp01((scrollY - Math.max(0, s0)) / (s1 - Math.max(0, s0))) : 1;
}

const chapters = $$('.ch');
// The chapter with a companion device, when the tour column has room for two.
let active = null;
const duoOf = () => {
  if (active !== 'keys' && active !== 'mech') return null;
  const S = tourStage.getBoundingClientRect();
  const T = fit(box(tourSlot));
  return flight() > 0.98 && S.width >= ((T.h * 414) / 868) * 2.1 ? active : null;
};
function tourTarget() {
  const T = fit(box(tourSlot));
  const duo = duoOf();
  if (!duo) return { ...T, z: 0 };
  const S = box(tourStage);
  return duo === 'mech'
    ? { ...T, x: S.x - side * S.w * 0.27, h: T.h * 0.84, z: T.h * 0.05 }
    : { ...T, x: S.x - side * S.w * 0.19, h: T.h * 0.94, z: 0 };
}
const byBoard = new Map();
for (const b of $$('.steps [data-board]')) {
  if (!byBoard.has(b.dataset.board)) byBoard.set(b.dataset.board, []);
  byBoard.get(b.dataset.board).push(b);
}
let spinAt = -1e9;
let spinDir = 1;

const HERO = [
  ['d/Main', 2400],
  ['d/Add', 1500],
  ['d/Photo-Pick', 1200],
  ['d/Photo-Camera', 1700],
  ['d/Photo-Reading', 2900],
  ['d/Photo-Review', 1900],
  ['d/AI-Review', 2100],
  ['d/Moment', 2700],
  ['d/Main', 1900],
  ['d/Car-Services', 1900],
  ['d/Car-Plan', 2100],
  ['d/Car-Money', 1900],
];

async function boot() {
  await loadIndex(cfg.boards);
  const stage = new Stage({ reduce });
  const phone = stage.phone();
  phone.el.setAttribute('role', 'application');
  phone.el.setAttribute('aria-label', cfg.t.phone);
  const glare = document.createElement('div');
  glare.className = 'mp-glare';
  let introAt = null;
  let lastUser = -1e9;
  let inHero = true;

  const player = new Player(phone.el, {
    reduce,
    onchange: (id) => {
      for (const [, btns] of byBoard) btns.forEach((b) => b.removeAttribute('aria-current'));
      (byBoard.get(id) || []).forEach((b) => b.setAttribute('aria-current', 'true'));
      const sw = $(`.swatches [data-board="${id}"]`);
      if (sw) root.style.setProperty('--accent', sw.dataset.accent);
      else if (active !== 'yours') root.style.removeProperty('--accent');
    },
    onuser: () => {
      lastUser = performance.now();
    },
  });
  phone.el.appendChild(glare);

  // ---- the hero phone: plates, dust, an intro, the hand that works the app
  const t = cfg.t;
  const bar = (on, n = 20) => Array.from({ length: n }, (_, i) => `<span${i < on ? ' class="on"' : ''}></span>`).join('');
  const plates = [
    stage.plate(phone, `<span class="pl">${t.plate_oil}</span><span class="pv">4 023<small>km</small></span><span class="pbar">${bar(12)}</span>`, { x: 345 * side, y: 250, z: 130 }),
    stage.plate(phone, `<span class="oct"></span><span class="pt">${t.plate_hose}</span><span class="ps">${t.plate_late}</span>`, { x: -360 * side, y: -20, z: 170, cls: 'late' }),
    stage.plate(phone, `<span class="pl">${t.plate_health}</span><span class="pv">71</span><span class="pbar">${bar(14)}</span>`, { x: 335 * side, y: -280, z: 80 }),
  ];
  for (const p of plates) p.el.style.opacity = '0';
  const dust = stage.dust(() => {
    if (introAt === null) return null;
    const H = box(heroSlot);
    return { x: H.x, y: Math.max(H.y, holdY()) - H.h * 0.1, w: H.w * 2.6, h: H.h * 1.25, o: (1 - inOut(flight())) * intro() };
  });
  void dust;
  const intro = () => (introAt === null ? 0 : reduce ? 1 : outCubic(Math.min(1, (performance.now() - introAt) / 1700)));

  phone.follow = (time) => {
    if (introAt === null) return null;
    const H = fit(box(heroSlot));
    H.y = Math.max(H.y, holdY());
    const T = tourTarget();
    const f = inOut(flight());
    const ie = intro();
    const m = reduce ? 0 : 1;
    const px = stage.pointer.sx, py = stage.pointer.sy;
    const spin = reduce ? 0 : spinDir * 0.16 * (1 - outCubic(clamp01((performance.now() - spinAt) / 700)));
    const heroRy = -side * 0.34 + px * 0.26 * m;
    const tourRy = px * 0.1 * m + spin;
    return {
      x: mix(H.x, T.x, f),
      y: mix(H.y, T.y, f) + Math.sin(time * 0.9) * 7 * m * (1 - f) + (1 - ie) * 80,
      h: mix(H.h, T.h, f),
      z: T.z * f,
      rx: mix(0.05 + py * 0.12 * m, 0.015 + py * 0.05 * m, f),
      ry: mix(heroRy, tourRy, f) + (1 - ie) * 1.3 * side,
      rz: mix(Math.sin(time * 0.6) * 0.014 * m, 0, f),
      o: ie,
      k: 16,
      // the hero phone breathes; in the tour it holds still for reading
      live: !reduce && (f < 0.999 || ie < 1 || performance.now() - spinAt < 800),
    };
  };

  // the plates live with the hero, and leave as the phone flies on
  stage.extras.push({
    update() {
      const room = heroSlot.parentElement.clientWidth > heroSlot.clientWidth * 1.9;
      const show = introAt !== null && room ? (1 - clamp01(flight() * 2.2)) * intro() : 0;
      plates.forEach((p, i) => {
        const a = clamp01(intro() * 1.6 - 0.4 - i * 0.18);
        p.el.style.opacity = String(Math.round(show * a * 100) / 100);
      });
      // the glass catches the lamp as the phone turns
      glare.style.backgroundPosition = `${50 + stage.pointer.sx * 40}% 0`;
      return false;
    },
  });

  // ---- the second phone (lending) and the laptop (the mechanic's side)
  // On a wide screen the tour column takes two devices: the main phone steps
  // aside and the friend's phone, or the mechanic's laptop, stands next to it.
  const extra = (kind, chapter, board, at) => {
    const dev = kind === 'laptop' ? stage.laptop() : stage.phone();
    const p = new Player(dev.el, kind === 'laptop' ? { w: 1280, h: 800, chrome: false, reduce } : { reduce });
    let loaded = false;
    dev.follow = () => {
      const want = duoOf() === chapter;
      if (want && !loaded) {
        loaded = true;
        p.go(board);
      }
      if (!loaded) return null;
      return { ...at(box(tourStage), fit(box(tourSlot))), o: want ? 1 : 0, k: 9 };
    };
    return dev;
  };
  extra('phone', 'keys', 'n/Lend-Guest', (S, T) => ({ x: S.x + side * S.w * 0.2, y: T.y + T.h * 0.03, h: T.h * 0.86, z: -T.h * 0.16, rx: 0.03, ry: -side * 0.24 + stage.pointer.sx * 0.06, rz: 0 }));
  extra('laptop', 'mech', 'n/Mech-Desktop', (S, T) => {
    const w = Math.min(S.w * 0.6, T.h * 1.25);
    return { x: S.x + side * S.w * 0.17, y: T.y + T.h * 0.05, h: (w * 860) / 1332, z: -T.h * 0.18, rx: 0.1, ry: -side * 0.16 + stage.pointer.sx * 0.05, rz: 0 };
  });

  // ---- what the main phone shows
  // asked for less motion: the phone holds still on the garage until tapped
  const heroLoop = () => {
    if (reduce || !inHero || player.autoplaying) return;
    player.play(HERO, { loop: true });
  };
  setInterval(() => {
    const f = flight();
    const was = inHero;
    inHero = f < 0.45;
    if (inHero && !was) {
      active = null;
      setIndex(null);
      root.style.removeProperty('--accent');
      player.go('d/Main', 'swap');
    }
    if (!inHero && was) {
      player.stop();
      pick();
    }
    if (inHero && !player.autoplaying && performance.now() - lastUser > 9000) heroLoop();
    stage.wake();
  }, 400);

  function setIndex(ch) {
    for (const a of $$('.tour-index a')) {
      if (a.dataset.ch === ch) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    }
  }
  function setChapter(ch) {
    if (ch === active) return;
    const prev = chapters.findIndex((c) => c.dataset.ch === active);
    active = ch;
    setIndex(ch);
    const el = chapters.find((c) => c.dataset.ch === ch);
    if (!el) return;
    player.stop();
    if (ch !== 'yours') root.style.removeProperty('--accent');
    spinDir = chapters.indexOf(el) > prev ? 1 : -1;
    spinAt = performance.now();
    player.go(el.dataset.start, 'swap');
    prefetch($$('[data-board]', el).map((b) => b.dataset.board));
    stage.wake();
  }
  // The chapter is the one under a line across the screen: the middle, or
  // under the phone on a narrow screen where the phone takes the top half.
  // Worked out from positions on every scroll, so a fast fling can't skip one.
  let queued = false;
  const pick = () => {
    queued = false;
    if (flight() < 0.45) return;
    const line = innerHeight * (innerWidth < 900 ? 0.76 : 0.5);
    let best = null;
    for (const c of chapters) {
      const r = c.getBoundingClientRect();
      if (r.top <= line) best = c;
    }
    if (best) setChapter(best.dataset.ch);
  };
  addEventListener('scroll', () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(pick);
    }
  }, { passive: true });

  // steps and the chapter index drive the phone
  for (const b of $$('.steps [data-board]')) {
    b.addEventListener('click', () => {
      const ch = b.closest('.ch').dataset.ch;
      if (ch !== active) setChapter(ch);
      player.stop();
      lastUser = performance.now();
      player.go(b.dataset.board);
      if (b.dataset.accent) root.style.setProperty('--accent', b.dataset.accent);
    });
  }
  for (const a of $$('.tour-index a')) a.addEventListener('click', () => setChapter(a.dataset.ch));

  // ---- go
  await player.go('d/Main', 'none');
  prefetch(HERO.map((s) => s[0]).concat(chapters.map((c) => c.dataset.start)));
  stage.wake();
  return {
    reveal() {
      introAt = performance.now();
      stage.wake();
      setTimeout(heroLoop, reduce ? 400 : 1900);
    },
  };
}

// ----------------------------------------------------------------- loader
const fonts = document.fonts
  ? Promise.all(['italic 800 40px Tektur', '400 17px "Fira Sans"', '600 16px "Fira Sans"'].map((f) => document.fonts.load(f, $('.hero-copy').textContent))).catch(() => {})
  : Promise.resolve();
// On / the language pick may still be asking where the visitor is; a page
// about to be replaced should not start the 3D.
const picked = window.__langPick ? Promise.race([window.__langPick, new Promise((r) => setTimeout(r, 1600))]) : Promise.resolve();
const booted = picked.then(boot).catch((e) => {
  console.error(e);
  return null;
});
const cap = new Promise((r) => setTimeout(r, 6000));
Promise.race([Promise.all([fonts, booted]), cap]).then(async () => {
  const app = await Promise.race([booted, Promise.resolve(null)]);
  const loader = $('#loader');
  root.classList.remove('loading');
  if (loader) {
    loader.classList.add('out');
    setTimeout(() => loader.remove(), 500);
  }
  if (app) app.reveal();
  else booted.then((a) => a && a.reveal());
});
