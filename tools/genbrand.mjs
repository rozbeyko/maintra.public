/**
 * The 2.0 mark everywhere a file carries it: the favicon, the home-screen
 * icon, the site logo, and the press kit's icons, logos and Play feature
 * graphic.
 *
 *   node tools/genbrand.mjs .
 *   node tools/press-zip.mjs .      (the press kit's archives carry them too)
 *
 * Everything is drawn from the mark on the brand board
 * (tools/home/src/d/Brand.dc.html): its geometry, the carbon and paper
 * colours, the icon's proportions (a 120 tile carries a 76.3 wide mark), and
 * its rule for small sizes: under 20 px wide the folds blur, so the browser
 * tab gets the one-colour mark, gold on carbon, filling the tile up to the
 * clear space (one stroke on every side).
 *
 * Renders with Playwright's Chromium, the same one the site's checks use.
 */
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';

const SITE = resolve(process.argv[2] || '.');
const PW = process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright/index.mjs';
const { chromium } = await import(PW);

// ------------------------------------------------------------- the mark
const VB = [100, 57.69];
const FOLDS = ['M26.10,0.00 L35.15,0.00 L35.15,57.69 L26.10,57.69 Z', 'M52.20,0.00 L61.25,0.00 L61.25,57.69 L52.20,57.69 Z'];
const BAR = 'M9.26,11.54 L100.00,11.54 L96.51,22.29 L5.76,22.29 Z';
const SHADOWS = ['M2.40,57.69 L18.80,57.69 L37.55,0.00 L21.15,0.00 Z', 'M28.50,57.69 L44.90,57.69 L63.65,0.00 L47.24,0.00 Z', 'M54.60,57.69 L71.00,57.69 L89.75,0.00 L73.34,0.00 Z'];
const STROKES = ['M0.00,57.69 L16.40,57.69 L35.15,0.00 L18.75,0.00 Z', 'M26.10,57.69 L42.50,57.69 L61.25,0.00 L44.84,0.00 Z', 'M52.20,57.69 L68.60,57.69 L87.35,0.00 L70.94,0.00 Z'];
const UNIT = 16.4; // one stroke: the clear space around the mark

const CARBON = { stroke: '#ECE4D6', fold: '#8F897E', gold: '#F4B223', shadow: '#9A6700', ground: '#0B0B0A' };
const PAPER = { stroke: '#1B1A17', fold: '#8C867C', gold: '#EBA817', shadow: '#9A6700', ground: '#F8F6F1' };

let clipN = 0;
// the mark's paths in its own 100 × 57.69 box
function markPaths(c) {
  const id = `c${clipN++}`;
  return [
    ...FOLDS.map((d) => `<path d="${d}" fill="${c.fold}"/>`),
    `<path d="${BAR}" fill="${c.gold}"/>`,
    `<clipPath id="${id}"><path d="${BAR}"/></clipPath>`,
    `<g clip-path="url(#${id})">${SHADOWS.map((d) => `<path d="${d}" fill="${c.shadow}"/>`).join('')}</g>`,
    STROKES.slice(0, 2).map((d) => `<path d="${d}" fill="${c.stroke}"/>`).join(''),
    `<path d="${STROKES[2]}" fill="${c.gold}"/>`,
  ].join('');
}
// one colour: the folds join the bar, a thin cut in the ground keeps each stroke
const markOne = (ink, ground) =>
  [...FOLDS, BAR].map((d) => `<path d="${d}" fill="${ink}"/>`).join('') +
  STROKES.map((d) => `<path d="${d}" fill="${ink}" stroke="${ground}" stroke-width="1.6" paint-order="stroke" stroke-linejoin="miter"/>`).join('');

// the mark placed in a square of side s, `w` wide, centred
const placed = (inner, s, w) => {
  const k = w / VB[0];
  return `<g transform="translate(${((s - w) / 2).toFixed(3)} ${((s - VB[1] * k) / 2).toFixed(3)}) scale(${k.toFixed(5)})">${inner}</g>`;
};
const svg = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;

// the icon: carbon ground, the mark at the board's 76.3 / 120
const icon = (s, { round = false } = {}) =>
  svg(s, s, `<rect width="${s}" height="${s}" ${round ? `rx="${s * 0.225}" ` : ''}fill="${CARBON.ground}"/>${placed(markPaths(CARBON), s, s * (76.3 / 120))}`);
// the tab icon: the one-colour mark in gold, as large as its clear space lets it
const tabWidth = (s) => s / (1 + (2 * UNIT) / VB[0]);
const tabIcon = (s) =>
  svg(s, s, `<rect width="${s}" height="${s}" rx="${s * 0.225}" fill="${CARBON.ground}"/>${placed(markOne(CARBON.gold, CARBON.ground), s, tabWidth(s))}`);
// the mark alone, with its clear space, on nothing
const logo = (c, w) => {
  const pad = (UNIT / VB[0]) * w;
  const W = w + 2 * pad;
  const H = (VB[1] / VB[0]) * w + 2 * pad;
  return svg(+W.toFixed(2), +H.toFixed(2), `<g transform="translate(${pad.toFixed(3)} ${pad.toFixed(3)}) scale(${(w / VB[0]).toFixed(5)})">${markPaths(c)}</g>`);
};

// the Play feature graphic: the lockup on carbon, lit from above like the site
const tektur = pathToFileURL(join(SITE, 'assets/journey/fonts/tektur-400-900-latin.woff2')).href;
const feature = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Tektur;font-weight:400 900;font-stretch:75% 100%;src:url(${tektur}) format('woff2')}
html,body{margin:0;width:1024px;height:500px;overflow:hidden}
body{background:radial-gradient(70% 90% at 50% -10%,rgba(244,178,35,.16),rgba(244,178,35,0) 70%),#0B0B0A;display:grid;place-items:center}
.lock{display:flex;align-items:center;gap:44px}
.lock svg{height:118px;width:auto;display:block;overflow:visible}
.word{font:italic 800 112px/1 Tektur,sans-serif;font-stretch:78%;text-transform:uppercase;letter-spacing:.01em;color:${CARBON.stroke}}
.tag{margin-top:16px;font:600 22px/1 Tektur,sans-serif;font-stretch:78%;letter-spacing:.3em;text-transform:uppercase;color:#8F897E}
</style></head><body><div class="lock"><svg viewBox="0 0 100 57.69">${markPaths(CARBON)}</svg><div><div class="word">Maintra</div><div class="tag">Smart maintenance tracker</div></div></div></body></html>`;

// ------------------------------------------------------------- render
const tmp = join(tmpdir(), `genbrand-${process.pid}`);
mkdirSync(tmp, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
async function png(markup, w, h, out, { transparent = false } = {}) {
  const f = join(tmp, 'p.html');
  const html = markup.startsWith('<!doctype')
    ? markup
    : `<!doctype html><html><body style="margin:0;background:transparent">${markup.replace('<svg ', '<svg style="display:block" ')}</body></html>`;
  writeFileSync(f, html);
  await page.setViewportSize({ width: Math.round(w), height: Math.round(h) });
  await page.goto(pathToFileURL(f).href);
  await page.evaluate(() => document.fonts.ready);
  const buf = await page.screenshot({ omitBackground: transparent, clip: { x: 0, y: 0, width: Math.round(w), height: Math.round(h) } });
  if (out) writeFileSync(join(SITE, out), buf);
  console.log(`${(out || '(ico part)').padEnd(46)} ${Math.round(w)}×${Math.round(h)}`);
  return buf;
}
// an .ico of PNGs (every browser since Vista reads them)
function ico(parts) {
  const head = Buffer.alloc(6 + 16 * parts.length);
  head.writeUInt16LE(0, 0);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(parts.length, 4);
  let at = head.length;
  parts.forEach(([s, buf], i) => {
    const e = 6 + 16 * i;
    head.writeUInt8(s >= 256 ? 0 : s, e);
    head.writeUInt8(s >= 256 ? 0 : s, e + 1);
    head.writeUInt16LE(1, e + 4);
    head.writeUInt16LE(32, e + 6);
    head.writeUInt32LE(buf.length, e + 8);
    head.writeUInt32LE(at, e + 12);
    at += buf.length;
  });
  return Buffer.concat([head, ...parts.map((p) => p[1])]);
}

// the site
writeFileSync(join(SITE, 'assets/favicon.svg'), tabIcon(64));
console.log('assets/favicon.svg');
await png(tabIcon(48), 48, 48, 'assets/favicon.png', { transparent: true });
const parts = [];
for (const s of [16, 32, 48]) parts.push([s, await png(tabIcon(s), s, s, null, { transparent: true })]);
writeFileSync(join(SITE, 'favicon.ico'), ico(parts));
console.log('favicon.ico                                    16, 32, 48');
await png(icon(180), 180, 180, 'apple-touch-icon.png');
await png(icon(512), 512, 512, 'assets/logo.png');

// the press kit
await png(icon(1024), 1024, 1024, 'assets/press/maintra-icon-1024.png');
await png(icon(1024, { round: true }), 1024, 1024, 'assets/press/maintra-icon-1024-transparent.png', { transparent: true });
for (const [name, c] of [['maintra-logo', CARBON], ['maintra-logo-light', PAPER]]) {
  const s = logo(c, 1600);
  const [, w, h] = s.match(/width="([\d.]+)" height="([\d.]+)"/);
  await png(s, +w, +h, `assets/press/${name}.png`, { transparent: true });
  writeFileSync(join(SITE, `assets/press/${name}.svg`), logo(c, 200));
  console.log(`assets/press/${name}.svg`);
}
await png(feature, 1024, 500, 'assets/press/maintra-feature-1024x500.png');

await browser.close();
rmSync(tmp, { recursive: true, force: true });
