// The phone's screen: plays the Maintra 2.0 design boards as an app.
//
// Every board is one screen from the design canvases, cut out by
// tools/genboards.mjs into assets/home/b/. A board's links carry data-go,
// and a tap on one moves to that board the way the motion spec says screens
// move: a new screen slides in from the right edge and back out the same way,
// tabs of one screen swap in place, a form with a close button rises from the
// bottom. Sheets and the + plates inside a board animate in on their own.
//
// The player knows nothing about 3D; it fills the element it is given, and
// the stage puts that element on a phone.

const BASE = '/assets/home/b/';

let index = null;
let indexV = '';
const cache = new Map();

export async function loadIndex(v) {
  if (!index) {
    indexV = v || '';
    index = await fetch(`${BASE}index.json?v=${indexV}`).then((r) => r.json());
  }
  return index;
}

export const boardInfo = (id) => index && index[id];

function fetchBoard(id) {
  if (!cache.has(id)) {
    const p = fetch(`${BASE}${id}.html?v=${index[id].v}`).then((r) => {
      if (!r.ok) throw new Error(`${id}: ${r.status}`);
      return r.text();
    });
    p.catch(() => cache.delete(id));
    cache.set(id, p);
  }
  return cache.get(id);
}

export const prefetch = (ids) => ids.forEach((id) => index && index[id] && fetchBoard(id).catch(() => {}));

// Screens that are one place in the app: moving between them swaps in place.
// Tabs of the car, the garage under its sheets and menus, the bottom bar's
// sections, the map tab, the theme and language versions of the garage.
const FAMILIES = {
  garage: ['d/Main', 'd/Main-SE', 'l/Light-Garage', 'd/Add', 'd/Empty-Garage', 'd/State-New-Car', 'd/Whats-New', 'd/Rate-Prompt',
    'd/Odometer-Update', 'd/Sync-Sheet', 'd/State-Offline', 'd/State-Scans-Out', 'd/State-AI-Offline',
    'd/State-Scan-Failed', 'd/Photo-Pick', 'd/Photo-Reading', 'd/Photo-Review', 'd/Photo-Review-Odo',
    'd/Photo-Review-Part', 'd/Photo-Unclear', 'd/Voice-Hold', 'd/Voice-Listen', 'd/Voice-Review',
    'd/Voice-Review-Parking', 'd/Voice-Mic-Off', 'd/Voice-Nothing', 'd/Voice-Unclear', 'd/Siri-Ask', 'd/Siri-Done',
    'd/Places', 'd/Places-Shops', 'd/Places-Empty', 'd/Profile', 'd/Stats-Money', 'd/Stats-Driving', 'd/Stats-Fuel',
    'd/Stats-Care', 'd/Stats-Garage', 'd/Stats-Empty'],
  garageLook: ['d/Garage-Tray', 'd/Garage-Swap', 'd/Garage-Custom', 'd/Garage-Clean', 'd/Garage-List',
    'd/Garage-Fines', 'd/Garage-Charcoal', 'd/Garage-Night', 'd/Garage-Plate', 'd/Garage-Classic',
    'd/Garage-Next-Car', 'd/Garage-Next-Car-Free', 'd/Garage-Search'],
  car: ['d/Car-Services', 'd/Car-Plan', 'd/Car-Fuel', 'd/Car-Money', 'd/Car-Chat', 'd/Car-Shelf',
    'd/Car-Services-Scrolled', 'd/Car-Services-Add', 'd/Car-Plan-Add', 'd/Car-Fuel-Add', 'd/Car-Money-Add',
    'd/Fuel-Empty', 'd/Money-Empty', 'd/Chat-Locked', 'd/Chat-Limit', 'd/Chat-Clear', 'd/State-Plan-Generating',
    'd/Plan-Rebuild', 'd/Plan-Better', 'd/Notify-Permission', 'd/Fuel-Rate', 'd/Fine-Paid', 'd/Plan-From-Reminder',
    'd/Plan-Large-Text', 'd/Plan-Done', 'l/Light-Car-Services', 'l/Light-Car-Plan', 'l/Light-Car-Fuel',
    'l/Light-Car-Money', 'l/Light-Car-Chat', 'n/Field-Car', 'n/Field-Plan', 'n/Red-Plan', 'n/Blue-Car', 'n/Log-Plan',
    'n/Log-Money', 'n/Rose-Car', 'n/Rose-Plan', 'n/Rose-Day-Plan', 'n/Rose-Day-Money'],
  wish: ['d/Wishlist', 'd/Wishlist-Alerts', 'd/Wish-Bought', 'd/Wish-Reveal', 'd/Wish-Share'],
  paywall: ['d/Paywall-Pro', 'd/Paywall-VIP', 'd/Paywall-Current'],
  tyreAge: ['d/Tyre-Made-Month', 'd/Tyre-Made-DOT'],
  keys: ['n/Main', 'n/Handover', 'n/Sheet-Entry'],
  map: ['n/Map', 'n/Map-Places', 'n/Map-Place', 'n/Map-Route', 'n/Map-Parked', 'n/Route-Check', 'n/Map-Region-Edge',
    'n/Map-Search', 'n/Route-Draw', 'n/Route-Points', 'n/Route-Offroad', 'n/Route-Save', 'n/Share-In', 'n/Park-Ask',
    'n/Map-Setup', 'n/Map-Permission'],
  drive: ['n/Map-Trip', 'n/Map-Trip-Speed', 'n/Map-Trip-3D', 'n/Map-Trip-Over', 'n/Map-Free', 'n/Map-Reroute',
    'n/Map-Weak-GPS', 'n/Trip-End'],
  scans: ['n/Scans', 'n/Scans-Empty', 'n/Services-With-Scans'],
  invite: ['n/Invite-QR', 'n/Invite-Contact', 'n/Invite-Contact-New', 'n/Invite-QR-Together'],
  themes: ['n/Field-Garage', 'n/Red-Garage', 'n/Blue-Garage', 'n/Log-Garage', 'n/Rose-Garage', 'n/Rose-Day-Garage'],
  langs: ['n/Lang-English-Garage', 'n/Lang-German-Garage', 'n/Lang-Arabic-Garage', 'n/Lang-Korean-Garage',
    'n/Lang-Japanese-Garage', 'n/Lang-Chinese-Garage'],
};
const familyOf = new Map();
for (const [f, ids] of Object.entries(FAMILIES)) for (const id of ids) if (!familyOf.has(id)) familyOf.set(id, f);
// The garage's looks, themes and languages are still the garage.
const GARAGE = new Set(['garage', 'garageLook', 'themes', 'langs']);
const group = (id) => {
  const f = familyOf.get(id);
  return f && GARAGE.has(f) ? 'garage' : f;
};
const same = (a, b) => {
  const fa = group(a);
  return !!fa && fa === group(b);
};

// Screens that only exist while something happens: the app moves on by itself.
const AUTO_NEXT = {
  'd/AI-Reading': ['d/AI-Review', 2600],
  'd/Photo-Reading': ['d/Photo-Review', 2600],
  'd/State-Plan-Generating': ['d/Car-Plan', 3200],
  'n/Scan-Running': ['n/Scan-Detail', 3400],
  'd/Siri-Ask': ['d/Siri-Done', 2400],
};

const EASE = 'cubic-bezier(.2,.8,.2,1)';
const lum = (hex) => {
  const m = /^#([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return 0;
  const n = parseInt(m[1], 16);
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
};

export class Player {
  constructor(el, { w = 390, h = 844, chrome = true, reduce = false, onchange, onuser } = {}) {
    this.el = el;
    this.w = w;
    this.h = h;
    this.reduce = reduce;
    this.onchange = onchange;
    this.onuser = onuser;
    this.stack = [];
    this.busy = false;
    this.next = null;
    this.timer = 0;
    this.autoplaying = false;
    el.classList.add('mp');
    el.style.width = `${w}px`;
    el.style.height = `${h}px`;
    el.innerHTML = `<div class="mp-stage"></div>${chrome ? CHROME : ''}<div class="mp-fx" aria-hidden="true"></div>`;
    this.stageEl = el.querySelector('.mp-stage');
    this.fx = el.querySelector('.mp-fx');
    el.addEventListener('click', (e) => this.click(e));
    el.addEventListener('pointerdown', (e) => {
      if (e.isTrusted) {
        this.stop();
        this.onuser && this.onuser();
      }
    });
  }

  get id() {
    const top = this.stack[this.stack.length - 1];
    return top ? top.id : null;
  }

  // Move to a board. how: 'push' | 'up' | 'fade' | 'back' | 'reset' | 'none';
  // without it the player works it out from where it is.
  go(id, how) {
    if (!index || !index[id]) return Promise.resolve();
    if (this.busy) {
      this.next = [id, how];
      return Promise.resolve();
    }
    return this.run(id, how);
  }

  async run(id, how) {
    this.busy = true;
    clearTimeout(this.timer);
    try {
      const html = await fetchBoard(id);
      const cur = this.stack[this.stack.length - 1];
      const at = this.stack.findIndex((s) => s.id === id);
      if (!how) {
        if (!cur) how = 'none';
        else if (cur.id === id) how = 'none';
        else if (at >= 0) how = 'back';
        else if (same(cur.id, id)) how = 'fade';
        else if (group(id) === 'garage') how = 'home';
        else if (html.slice(0, 6000).includes('aria-label="Close"')) how = 'up';
        else how = 'push';
      }
      const layer = this.layer(id, html);
      const old = this.stageEl.lastElementChild;
      let enterHow = how;
      let scroll = 0;
      if (how === 'back') {
        enterHow = (this.stack[this.stack.length - 1] || {}).how || 'push';
        this.stack.length = at + 1;
        const entry = this.stack[at];
        entry.layer = layer;
        scroll = entry.scroll || 0;
      } else if (how === 'fade' || how === 'none') {
        if (cur && cur.id !== id) this.stack[this.stack.length - 1] = { id, how: cur.how, layer };
        else if (!cur) this.stack.push({ id, how: 'none', layer });
        else cur.layer = layer;
      } else if (how === 'home' || how === 'swap') {
        // home: back to the garage from anywhere; swap: a fresh start elsewhere
        this.stack = [{ id, how: 'none', layer }];
      } else {
        if (cur && old) cur.scroll = old.firstChild.scrollTop;
        this.stack.push({ id, how, layer });
        if (this.stack.length > 14) this.stack.splice(1, 1);
      }
      this.stageEl.appendChild(layer);
      if (scroll) layer.firstChild.scrollTop = scroll;
      this.paintChrome(html);
      await this.transition(old, layer, how, enterHow);
      // anything left from an interrupted transition goes too
      for (const l of [...this.stageEl.children]) if (l !== layer) l.remove();
      this.enhance(id, layer, how);
      if (this.onchange) this.onchange(id);
      const auto = AUTO_NEXT[id];
      if (auto) this.timer = setTimeout(() => this.id === id && this.go(auto[0], 'fade'), this.reduce ? auto[1] * 0.6 : auto[1]);
    } catch (e) {
      console.warn('player', e);
    } finally {
      this.busy = false;
      if (this.next) {
        const [n, h] = this.next;
        this.next = null;
        this.go(n, h);
      }
    }
  }

  layer(id, html) {
    const info = index[id];
    const layer = document.createElement('div');
    layer.className = 'mp-layer';
    layer.dataset.board = id;
    const scroll = document.createElement('div');
    scroll.className = 'mp-scroll';
    if (info.h > this.h + 4) scroll.classList.add('tall');
    scroll.innerHTML = html;
    layer.appendChild(scroll);
    return layer;
  }

  // Status bar and home indicator follow the board: dark ink on paper themes.
  paintChrome(html) {
    const m = /background: (#[0-9A-Fa-f]{6})/.exec(html.slice(0, 400));
    this.el.classList.toggle('mp-light', lum(m && m[1]) > 0.55);
  }

  transition(old, layer, how, enterHow) {
    if (!old || how === 'none' || this.reduce) {
      if (old && this.reduce && how !== 'none') {
        return layer.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 120 }).finished.catch(() => {});
      }
      return Promise.resolve();
    }
    const opt = (d) => ({ duration: d, easing: EASE, fill: 'both' });
    const shade = (el, from, to, d) => {
      const s = document.createElement('div');
      s.className = 'mp-shade';
      el.appendChild(s);
      return s.animate([{ opacity: from }, { opacity: to }], opt(d)).finished.catch(() => {});
    };
    let a = [];
    if (how === 'push') {
      a = [
        layer.animate([{ transform: 'translateX(100%)' }, { transform: 'translateX(0)' }], opt(320)).finished,
        old.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-28%)' }], opt(320)).finished,
        shade(old, 0, 0.55, 320),
      ];
    } else if (how === 'up') {
      a = [layer.animate([{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }], opt(300)).finished, shade(old, 0, 0.6, 300)];
    } else if (how === 'back' || how === 'home') {
      // the leaving screen goes back the way it came; the one under it was waiting
      this.stageEl.insertBefore(layer, old);
      const down = enterHow === 'up';
      a = [
        old.animate(
          down ? [{ transform: 'translateY(0)' }, { transform: 'translateY(100%)' }] : [{ transform: 'translateX(0)' }, { transform: 'translateX(100%)' }],
          opt(down ? 260 : 300),
        ).finished,
        down ? shade(layer, 0.6, 0, 260) : layer.animate([{ transform: 'translateX(-28%)' }, { transform: 'translateX(0)' }], opt(300)).finished,
        down ? Promise.resolve() : shade(layer, 0.55, 0, 300),
      ];
    } else {
      a = [layer.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 170, easing: 'ease-out', fill: 'both' }).finished];
    }
    return Promise.all(a.map((p) => p.catch(() => {}))).then(() => {
      for (const s of this.stageEl.querySelectorAll('.mp-shade')) s.remove();
      layer.getAnimations().forEach((x) => x.cancel());
    });
  }

  // Motion inside a board, per the spec: plates from the right edge nearest
  // the thumb first, sheets from the bottom, the Moment's stamp, bars that fill.
  enhance(id, layer, how) {
    if (this.reduce) return;
    const root = layer.firstChild.firstElementChild;
    if (!root) return;
    const fresh = how !== 'back';
    const menu = root.querySelector('[role="menu"]');
    if (menu && fresh) {
      const plates = [...menu.children].reverse();
      plates.forEach((p, i) =>
        p.animate([{ transform: 'translateX(110%)' }, { transform: 'translateX(0)' }], { duration: 220, delay: i * 40, easing: EASE, fill: 'backwards' }),
      );
    }
    const dialog = root.querySelector('[role="dialog"]');
    if (dialog && fresh && how === 'fade') {
      dialog.animate([{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }], { duration: 300, easing: EASE, fill: 'backwards' });
      const dim = dialog.previousElementSibling;
      if (dim && dim.getAttribute('aria-hidden') === 'true') dim.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, fill: 'backwards' });
    }
    if (id === 'd/Moment') this.moment(root);
    // slanted segment bars (health, reading progress) fill from the left
    for (const bar of root.querySelectorAll('span[style*="display: flex; gap: 3px; flex: 1"]')) {
      const segs = [...bar.children];
      if (segs.length < 8) continue;
      segs.forEach((s, i) => s.animate([{ opacity: 0.15 }, { opacity: 1 }], { duration: 160, delay: 120 + i * 22, fill: 'backwards' }));
    }
    // the voice wave keeps listening
    for (const wave of root.querySelectorAll('span[aria-hidden="true"][style*="gap: 3px; height: 36px"]')) {
      [...wave.children].forEach((b, i) =>
        b.animate([{ transform: 'scaleY(1)' }, { transform: `scaleY(${0.35 + ((i * 37) % 10) / 14})` }, { transform: 'scaleY(1)' }], {
          duration: 520 + ((i * 53) % 400),
          iterations: Infinity,
          easing: 'ease-in-out',
        }),
      );
    }
  }

  // "SERVICED" lands: scale 1.9 → 0.94 → 1 in 280 ms; health counts up.
  moment(root) {
    const stamp = [...root.querySelectorAll('span')].find((s) => s.textContent.trim().toLowerCase() === 'serviced');
    if (stamp) {
      const base = stamp.style.transform || '';
      stamp.animate(
        [
          { transform: `${base} scale(1.9)`, opacity: 0 },
          { transform: `${base} scale(0.94)`, opacity: 1, offset: 0.7 },
          { transform: `${base} scale(1)`, opacity: 1 },
        ],
        { duration: 280, delay: 380, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'backwards' },
      );
    }
    const plus = [...root.querySelectorAll('span')].find((s) => /^\+\d+$/.test(s.textContent.trim()));
    if (plus) {
      const n = +plus.textContent.trim().slice(1);
      let k = 0;
      const t0 = performance.now() + 700;
      const tick = (t) => {
        if (t < t0) return requestAnimationFrame(tick);
        k = Math.min(n, Math.round(((t - t0) / 420) * n));
        plus.textContent = `+${k}`;
        if (k < n) requestAnimationFrame(tick);
      };
      plus.textContent = '+0';
      requestAnimationFrame(tick);
    }
  }

  click(e) {
    const a = e.target.closest('a,button,[role="switch"]');
    if (!a || !this.el.contains(a)) return;
    e.preventDefault();
    this.ripple(e.clientX, e.clientY, a);
    const go = a.getAttribute('data-go');
    if (go) return this.go(go);
    if (a.matches('[role="switch"]') || a.querySelector('[role="switch"]')) return flip(a.matches('[role="switch"]') ? a : a.querySelector('[role="switch"]'));
    if (a.hasAttribute('aria-pressed')) return press(a);
  }

  // A tap mark where the finger landed, in the screen's own coordinates.
  ripple(cx, cy, target) {
    if (this.reduce) return;
    const r = this.el.getBoundingClientRect();
    let x, y;
    if (cx || cy) {
      // the screen may be turned in 3D: map through the element's box
      x = ((cx - r.left) / r.width) * this.w;
      y = ((cy - r.top) / r.height) * this.h;
    } else {
      const t = target.getBoundingClientRect();
      x = ((t.left + t.width / 2 - r.left) / r.width) * this.w;
      y = ((t.top + t.height / 2 - r.top) / r.height) * this.h;
    }
    const d = document.createElement('span');
    d.className = 'mp-tap';
    d.style.left = `${x}px`;
    d.style.top = `${y}px`;
    this.fx.appendChild(d);
    d.animate([{ transform: 'translate(-50%,-50%) scale(.5)', opacity: 0.55 }, { transform: 'translate(-50%,-50%) scale(1.5)', opacity: 0 }], {
      duration: 420,
      easing: 'ease-out',
    }).finished.then(() => d.remove(), () => d.remove());
  }

  // Autoplay: tap the link to each next board in turn, like a hand on the phone.
  async play(ids, { loop = true, dwell = 1700 } = {}) {
    this.autoplaying = true;
    const run = this.autoRun = {};
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    do {
      for (const step of ids) {
        if (!this.autoplaying || this.autoRun !== run) return;
        const [id, ms] = Array.isArray(step) ? step : [step, dwell];
        if (this.id !== id) {
          const link = this.stageEl.querySelector(`.mp-layer:last-child [data-go="${id}"]`);
          if (link) {
            await this.finger(link);
            if (!this.autoplaying || this.autoRun !== run) return;
          }
          await this.go(id);
        }
        await wait(ms);
      }
    } while (loop && this.autoplaying && this.autoRun === run);
  }

  stop() {
    this.autoplaying = false;
    this.autoRun = null;
    clearTimeout(this.timer);
    const f = this.fx.querySelector('.mp-finger');
    if (f) f.remove();
  }

  finger(el) {
    if (this.reduce) return Promise.resolve();
    const r = this.el.getBoundingClientRect();
    const t = el.getBoundingClientRect();
    if (!r.width) return Promise.resolve();
    const x = ((t.left + t.width / 2 - r.left) / r.width) * this.w;
    const y = ((t.top + t.height / 2 - r.top) / r.height) * this.h;
    const f = document.createElement('span');
    f.className = 'mp-finger';
    f.style.left = `${x}px`;
    f.style.top = `${y}px`;
    this.fx.appendChild(f);
    return f
      .animate(
        [
          { transform: 'translate(-50%,-50%) scale(1.4)', opacity: 0 },
          { transform: 'translate(-50%,-50%) scale(1)', opacity: 0.9, offset: 0.45 },
          { transform: 'translate(-50%,-50%) scale(.82)', opacity: 0.9, offset: 0.7 },
          { transform: 'translate(-50%,-50%) scale(1.1)', opacity: 0 },
        ],
        { duration: 620, easing: 'ease-out' },
      )
      .finished.then(() => f.remove(), () => f.remove());
  }
}

// A switch in the board turns over: the plate and the knob trade places.
function flip(sw) {
  const on = sw.getAttribute('aria-checked') === 'true';
  const track = sw.firstElementChild;
  const knob = track && track.firstElementChild;
  if (!track || !knob) return;
  sw.setAttribute('aria-checked', String(!on));
  track.style.background = on ? '#2A2825' : '#F4B223';
  knob.style.background = on ? '#8F897E' : '#0B0B0A';
  if (on) {
    knob.style.right = '';
    knob.style.left = '6px';
  } else {
    knob.style.left = '';
    knob.style.right = '6px';
  }
}

// Chips in a row: the pressed one takes the gold outline from its neighbours.
function press(btn) {
  const row = btn.parentElement;
  for (const b of row.querySelectorAll(':scope > button[aria-pressed]')) {
    const on = b === btn;
    b.setAttribute('aria-pressed', String(on));
    b.style.background = on ? '#F4B223' : '#67625B';
    const inner = b.firstElementChild;
    if (inner) inner.style.color = on ? '#F4B223' : '#ECE4D6';
  }
}

const CHROME = `<div class="mp-chrome" aria-hidden="true">
<span class="mp-time">9:41</span>
<span class="mp-island"></span>
<span class="mp-icons"><svg viewBox="0 0 18 12" width="18" height="12"><path d="M1 9h3v3H1zM5.5 6.5h3V12h-3zM10 4h3v8h-3zM14.5 1h3v11h-3z" fill="currentColor"/></svg><svg viewBox="0 0 16 12" width="16" height="12"><path d="M8 11.5L5.6 9a3.4 3.4 0 014.8 0zM3.4 6.8a6.5 6.5 0 019.2 0l-1.4 1.4a4.5 4.5 0 00-6.4 0zM1 4.4a10 10 0 0114 0l-1.4 1.4a8 8 0 00-11.2 0z" fill="currentColor"/></svg><svg viewBox="0 0 27 12" width="27" height="12"><rect x=".5" y=".5" width="23" height="11" rx="3" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="17" height="8" rx="1.6" fill="currentColor"/><path d="M25 4v4c.8-.3 1.3-1.1 1.3-2S25.8 4.3 25 4z" fill="currentColor" opacity=".45"/></svg></span>
<span class="mp-home"></span>
</div>`;
