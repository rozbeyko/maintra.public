// The landing page: one phone that plays the app in the hero, flies into the
// tour as the page scrolls, and follows the tour's chapters there; a second
// phone, the friend's, joins it on wide screens when you lend the car.

import { Stage } from './stage.js?v=36fdbb8a';
import { Player, loadIndex, prefetch } from './player.js?v=4104dfe0';
import { Room } from './room.js?v=a5c426b9';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const root = document.documentElement;
const cfg = JSON.parse($('#cfg').textContent);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const rtl = root.dir === 'rtl';
const side = rtl ? 1 : -1; // where the extra devices stand, towards the index

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
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
langBtn.addEventListener('click', () => {
  if (langMenu.hidden) sheet(false);
  menu(langMenu.hidden);
});
document.addEventListener('click', (e) => {
  if (!langMenu.hidden && !e.target.closest('.lang')) menu(false);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !langMenu.hidden) {
    menu(false);
    langBtn.focus();
  }
});

// the menu sheet, where the header has no room for its links
const sheetBtn = $('.menu-btn');
const sheetEl = $('#menu');
let sheetAt = 0;
function sheet(open, focusBtn) {
  if (!sheetEl || open === !sheetEl.hidden) return;
  sheetEl.hidden = !open;
  sheetBtn.setAttribute('aria-expanded', String(open));
  top.classList.toggle('open', open);
  sheetEl.classList.toggle('in', open);
  if (open) {
    sheetAt = scrollY;
    menu(false);
    sheetEl.querySelector('a').focus({ preventScroll: true });
  } else if (focusBtn) sheetBtn.focus();
}
sheetBtn?.addEventListener('click', () => sheet(sheetEl.hidden));
sheetEl?.addEventListener('click', (e) => {
  if (e.target.closest('a')) sheet(false);
});
document.addEventListener('click', (e) => {
  if (sheetEl && !sheetEl.hidden && !e.target.closest('.menu, .menu-btn')) sheet(false);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && sheetEl && !sheetEl.hidden) sheet(false, true);
});
// scrolling the page away, or widening it until the links fit, closes it
addEventListener('scroll', () => {
  if (sheetEl && !sheetEl.hidden && Math.abs(scrollY - sheetAt) > 60) sheet(false);
}, { passive: true });
matchMedia('(min-width: 1100px)').addEventListener('change', (e) => {
  if (e.matches) sheet(false);
});
// ------------------------------------------------------------------ theme
// Light or dark: the visitor's choice, remembered, else the system's. The
// head script set it before the first paint; this keeps the switch, the
// browser's bar colour and the 3D garage (it listens for maintra-theme) in step.
const themeBtn = $('.theme-btn');
const themeMeta = $('meta[name="theme-color"]');
let themeChosen = false;
try {
  themeChosen = !!localStorage.getItem('maintra.theme');
} catch (e) {}
const applyTheme = (t) => {
  root.dataset.theme = t;
  themeMeta.setAttribute('content', t === 'light' ? '#EEEAE2' : '#0B0B0A');
  if (themeBtn) themeBtn.setAttribute('aria-label', t === 'light' ? themeBtn.dataset.toDark : themeBtn.dataset.toLight);
  dispatchEvent(new CustomEvent('maintra-theme', { detail: t }));
};
const switchTheme = (t) => {
  if (document.startViewTransition && !reduce) document.startViewTransition(() => applyTheme(t));
  else applyTheme(t);
};
applyTheme(root.dataset.theme === 'light' ? 'light' : 'dark');
themeBtn?.addEventListener('click', () => {
  const t = root.dataset.theme === 'light' ? 'dark' : 'light';
  themeChosen = true;
  try {
    localStorage.setItem('maintra.theme', t);
  } catch (e) {}
  switchTheme(t);
});
matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
  if (!themeChosen) switchTheme(e.matches ? 'light' : 'dark');
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
const navAll = $$('.top-nav a, .menu nav a');
const navIds = [...new Set(navAll.map((a) => a.getAttribute('href').slice(1)))];
const navIO = new IntersectionObserver(
  (es) => {
    for (const e of es) {
      if (!e.isIntersecting) continue;
      for (const a of navAll) {
        if (a.getAttribute('href') === `#${e.target.id}`) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      }
    }
  },
  { rootMargin: '-50% 0px -49% 0px' },
);
for (const id of navIds) {
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
// Two phones. The hero's stays in the hero, a still picture of the app that
// leans with the mouse; it scrolls away with the page. The tour's comes in
// with the tour's phone column and is the app to press: it follows the
// chapters, answers taps and the step buttons, and when left alone walks
// through the chapter's steps by itself.
// arrival(): how far the tour phone has come in, 0 while its column is below
// the screen, 1 once the column has stuck in place.
const arrival = () => {
  const S = tourStage.getBoundingClientRect();
  return clamp01(1 - (S.top - stickTop) / (innerHeight * 0.75));
};
// the tour is on screen: its column has come in and has not yet left
const tourShown = () => arrival() > 0.3 && tourStage.getBoundingClientRect().bottom > innerHeight * 0.25;

const chapters = $$('.ch');
// The hand-over chapter shows the friend's phone beside the main one, when
// the tour column has room for both side by side at a good size. Laid out by
// what each phone measures on screen (the friend's stands further back and
// turned, so it looks smaller), with a clear gap between them: they never
// overlap. Without the room, the main phone stays on its own.
let active = null;
const ASPECT = 414 / 868;
const EXTRA_RY = 0.24;
function duoLayout() {
  if (active !== 'keys' || arrival() < 0.98) return null;
  const S = box(tourStage);
  const T = fit(box(tourSlot));
  const avail = S.w * 0.98;
  const wm = ASPECT * T.h * 0.94;
  const we = ASPECT * T.h * 0.8 * Math.cos(EXTRA_RY);
  const g0 = T.h * 0.05;
  const f = Math.min(1, avail / (wm + we + g0));
  if (f < 0.8) return null;
  const g = f < 1 ? g0 : Math.min(T.h * 0.14, avail - wm - we);
  const W = (wm + we) * f + g;
  return {
    main: { x: S.x - side * (W / 2 - (wm * f) / 2), y: T.y, h: T.h * 0.94 * f },
    extra: { x: S.x + side * (W / 2 - (we * f) / 2), y: T.y + T.h * 0.03, h: T.h * 0.8 * f, z: -T.h * 0.16 * f },
  };
}
function tourTarget() {
  const T = fit(box(tourSlot));
  const L = duoLayout();
  return L ? { ...T, ...L.main, z: 0 } : { ...T, z: 0 };
}
const byBoard = new Map();
for (const b of $$('.steps [data-board]')) {
  if (!byBoard.has(b.dataset.board)) byBoard.set(b.dataset.board, []);
  byBoard.get(b.dataset.board).push(b);
}
let spinAt = -1e9;
let spinDir = 1;

async function boot() {
  await loadIndex(cfg.boards);
  const stage = new Stage({ reduce });
  let introAt = null;
  let lastUser = -1e9;
  const glares = [];
  const glass = (dev) => {
    const g = document.createElement('div');
    g.className = 'mp-glare';
    dev.el.appendChild(g);
    glares.push(g);
  };

  // ---- the hero phone: the garage screen, still; plates round it, the
  // garage behind it (room.js). Nothing to press: the tour's phone is that.
  const heroPhone = stage.phone();
  heroPhone.el.classList.add('dev-still');
  // (three's CSS3DObject sets pointer-events on the element itself)
  heroPhone.el.style.pointerEvents = 'none';
  heroPhone.el.setAttribute('aria-hidden', 'true');
  const heroPlayer = new Player(heroPhone.el, { reduce });
  glass(heroPhone);
  const t = cfg.t;
  const bar = (on, n = 20) => Array.from({ length: n }, (_, i) => `<span${i < on ? ' class="on"' : ''}></span>`).join('');
  const plates = [
    stage.plate(heroPhone, `<span class="pl">${t.plate_oil}</span><span class="pv">4 023<small>km</small></span><span class="pbar">${bar(12)}</span>`, { x: 345 * side, y: 250, z: 130 }),
    stage.plate(heroPhone, `<span class="oct"></span><span class="pt">${t.plate_hose}</span><span class="ps">${t.plate_late}</span>`, { x: -300 * side, y: -20, z: 170, cls: 'late' }),
    stage.plate(heroPhone, `<span class="pl">${t.plate_health}</span><span class="pv">71</span><span class="pbar">${bar(14)}</span>`, { x: 335 * side, y: -280, z: 80 }),
  ];
  for (const p of plates) p.el.style.opacity = '0';
  // a plate the screen edge would cut stays away (checked with the clock below)
  const cut = plates.map(() => false);
  const measure = () => plates.forEach((p, i) => {
    const b = p.el.getBoundingClientRect();
    cut[i] = b.left < 8 || b.right > innerWidth - 8;
  });
  const navH = parseFloat(getComputedStyle(root).getPropertyValue('--nav')) || 64;
  new Room(stage, { hero: $('.hero'), slot: heroSlot, phone: heroPhone, fit, reduce, nav: navH });
  const intro = () => (introAt === null ? 0 : reduce ? 1 : outCubic(Math.min(1, (performance.now() - introAt) / 1700)));

  heroPhone.follow = (time) => {
    if (introAt === null) return null;
    const H = fit(box(heroSlot));
    const ie = intro();
    const m = reduce ? 0 : 1;
    const px = stage.pointer.sx, py = stage.pointer.sy;
    const shown = H.y + H.h / 2 > -60 && H.y - H.h / 2 < innerHeight + 60;
    return {
      x: H.x,
      y: H.y + Math.sin(time * 0.9) * 7 * m + (1 - ie) * 80,
      h: H.h,
      z: 0,
      rx: 0.05 + py * 0.12 * m,
      // turned towards the copy, the way the reader reads
      ry: side * 0.34 + px * 0.26 * m + (1 - ie) * 1.3 * side,
      rz: Math.sin(time * 0.6) * 0.014 * m,
      o: ie,
      // it rides the page: quick to follow the scroll, so it stays on it
      k: 30,
      live: !reduce && shown,
    };
  };

  // ---- the tour phone: the app to press
  const phone = stage.phone();
  phone.el.setAttribute('role', 'application');
  phone.el.setAttribute('aria-label', t.phone);
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
  glass(phone);

  phone.follow = () => {
    if (introAt === null) return null;
    const T = tourTarget();
    // coming in, it stands up into place: from further back, lower, leaning
    // away, to upright as its column sticks
    const a = arrival();
    const e = outCubic(a);
    const m = reduce ? 0 : 1;
    const px = stage.pointer.sx, py = stage.pointer.sy;
    const spin = reduce ? 0 : spinDir * 0.16 * (1 - outCubic(clamp01((performance.now() - spinAt) / 700)));
    return {
      x: T.x,
      y: T.y + (1 - e) * T.h * 0.16 * m,
      h: T.h,
      z: (T.z || 0) - (1 - e) * T.h * 0.4 * m,
      rx: 0.015 + py * 0.05 * m - (1 - e) * 0.55 * m,
      ry: px * 0.1 * m + spin - (1 - e) * side * 0.3 * m,
      rz: 0,
      // solid all the way: it comes in from below the screen, no fading
      // (a see-through phone shows its own back through the glass)
      o: 1,
      k: 16,
      live: !reduce && ((a > 0 && a < 0.999) || performance.now() - spinAt < 800),
    };
  };

  // the plates live with the hero phone; the glass catches the lamp as the
  // phones turn
  stage.extras.push({
    update() {
      const room = heroSlot.parentElement.clientWidth > heroSlot.clientWidth * 1.9;
      const show = introAt !== null && room ? intro() : 0;
      plates.forEach((p, i) => {
        const a = cut[i] ? 0 : clamp01(intro() * 1.6 - 0.4 - i * 0.18);
        p.el.style.opacity = String(Math.round(show * a * 100) / 100);
      });
      for (const g of glares) g.style.backgroundPosition = `${50 + stage.pointer.sx * 40}% 0`;
      return false;
    },
  });

  // ---- the second phone (lending)
  // On a wide screen the tour column takes two devices: the main phone steps
  // aside and the friend's phone stands next to it. (The stage can build a
  // laptop too, for the mechanic's side, which comes with 2.1.)
  {
    const dev = stage.phone();
    const p = new Player(dev.el, { reduce });
    let loaded = false;
    let last = null;
    dev.follow = () => {
      const L = duoLayout();
      if (L && !loaded) {
        loaded = true;
        p.go('n/Lend-Guest');
      }
      if (!loaded) return null;
      if (L) {
        // the layout is what shows on screen; the phone stands further back,
        // so it is placed (and sized) for where the camera sees it
        const E = L.extra;
        const k = (stage.D - E.z) / stage.D;
        last = { x: stage.vw / 2 + (E.x - stage.vw / 2) * k, y: stage.vh / 2 + (E.y - stage.vh / 2) * k, h: E.h * k, z: E.z, rx: 0.03, ry: -side * EXTRA_RY, rz: 0 };
      }
      if (!last) return null;
      return { ...last, ry: last.ry + stage.pointer.sx * 0.06, o: L ? 1 : 0, k: 9 };
    };
  }

  // ---- the chapters
  function setIndex(ch) {
    for (const a of $$('.tour-index a')) {
      if (a.dataset.ch === ch) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    }
  }
  let chapterAt = 0;
  function setChapter(ch) {
    if (ch === active) return;
    const prev = chapters.findIndex((c) => c.dataset.ch === active);
    active = ch;
    chapterAt = performance.now();
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
    if (!tourShown()) return;
    const line = innerHeight * (innerWidth < 900 ? 0.76 : 0.5);
    let best = null;
    for (const c of chapters) {
      const r = c.getBoundingClientRect();
      if (r.top <= line) best = c;
    }
    // just come in: the first chapter
    setChapter((best || chapters[0]).dataset.ch);
  };
  addEventListener('scroll', () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(pick);
    }
  }, { passive: true });

  // Left alone, the phone works through the chapter's steps the way a hand
  // would, tapping the way from one screen to the next, and goes round
  // again. A tap on the phone or a step button hands it over to the visitor;
  // it picks up again after a while left alone. ("Make it yours" plays
  // nothing by itself: its steps recolour the page.)
  const stepsOf = (ch) => {
    const el = chapters.find((c) => c.dataset.ch === ch);
    return el ? $$('.steps:not(.swatches):not(.langs) [data-board]', el).map((b) => b.dataset.board) : [];
  };
  const autoChapter = () => {
    if (reduce || !active || active === 'yours' || player.autoplaying) return;
    const ids = stepsOf(active);
    if (ids.length < 2) return;
    const i = ids.indexOf(player.id);
    const order = i >= 0 ? ids.slice(i + 1).concat(ids.slice(0, i + 1)) : ids;
    player.play(order.map((id) => [id, 2600]), { loop: true });
  };
  setInterval(() => {
    const now = performance.now();
    if (heroSlot.getBoundingClientRect().bottom > 0) measure();
    if (!tourShown()) {
      // gone from the tour: it starts over when it comes back
      if (active !== null) {
        player.stop();
        active = null;
        setIndex(null);
        root.style.removeProperty('--accent');
      }
    } else if (!player.autoplaying && now - lastUser > 9000 && now - chapterAt > 2200) autoChapter();
    stage.wake();
  }, 400);

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
  await Promise.all([heroPlayer.go('d/Main', 'none'), player.go('d/Main', 'none')]);
  prefetch(chapters.map((c) => c.dataset.start));
  stage.wake();
  return {
    reveal() {
      introAt = performance.now();
      pick();
      stage.wake();
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
