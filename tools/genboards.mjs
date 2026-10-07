/**
 * Turn the Maintra 2.0 design boards into screens the landing page's phones
 * can show and click through.
 *
 * The app is designed as claude.ai Design artifacts: every screen is a board,
 * a self-contained 390-wide HTML file, and the boards link to each other with
 * plain hrefs, which is what makes Paj clickable in the design. Two canvases
 * feed the site:
 *
 *   d/  "Maintra 2.0 · Dark"          https://claude.ai/artifact/9jfuaXi5kX6S3kQmzhbuX1
 *   n/  "Maintra 2.0 · New features"  https://claude.ai/artifact/KdmELimVXiRjXCUiYBDtyv
 *   l/  "Maintra 2.0 · Light"         https://claude.ai/artifact/MUb7CPQaQbLTLwdYbb87jd
 *       (only the garage, the car's tabs and the Moment: the Workshop theme)
 *
 * Their project/*.dc.html files are committed verbatim under tools/home/src/
 * (one folder per canvas, because both canvases have a Main.dc.html), and
 * this script writes assets/home/b/<set>/<Board>.html plus an index:
 *
 *   - only the board itself is kept: the <helmet> (Google Fonts, base CSS) and
 *     the canvas runtime go, the page supplies self-hosted fonts and the base
 *   - /_blob/<id> images become files in assets/home/img/ (BLOBS below); the
 *     build FAILS on an image it doesn't know, so a new photo in the design
 *     can't ship as a broken link
 *   - href="X.dc.html" becomes data-go="<set>/X", which the player turns into
 *     a transition instead of a page load; a link to a board that doesn't
 *     exist is made inert and reported
 *
 * Re-sync after the design changes:
 *
 *   1. Artifact read of project/*.dc.html from both canvases
 *   2. -> tools/home/src/d/ and tools/home/src/n/
 *   3. node tools/genboards.mjs .   then   node tools/genhome.mjs .
 *
 * Do not hand-edit assets/home/b/: it is output.
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const SITE = process.argv[2] ?? '.';
const SETS = ['d', 'n', 'l'];
const SRC = 'tools/home/src';
const OUT = 'assets/home/b';
const IMG = '/assets/home/img/';

// Blob ids from the artifacts' asset stores, and the file each one became.
// The two canvases uploaded the same Paj photo and wallpaper under their own ids.
const BLOBS = {
  a84b5758dc5c56c1057e97082f1d3c6b: 'paj.webp',
  abcb7730e43eb546ec96f4f7a9630a50: 'paj.webp',
  c776edb9454dbf3a574c8dc453027b8b: 'doodle.webp',
  ab101e75945e0ae32d548f2fcd8beed0: 'doodle.webp',
  fcbced0ca8139aa6830666011eae7577: 'camo.webp',
  '899702607086bacab024dbb04402aebb': 'paj.webp',
  '46dc6f74153312c8cd252af61e4e157b': 'doodle.webp',
};

// Boards that are canvas runtimes or presentation sheets, not app screens.
const SKIP = new Set(['d/Brand', 'd/Icons', 'd/System', 'd/Splash', 'd/Motion-Voice', 'd/Date-Pick-Spec']);

// The themes were drawn as stills, without links. Wire the picker's cards to
// each theme's garage, and each theme's garage, car, plan and money screens to
// one another, so the demo walks through a theme like through the default one.
// name on the picker card: [garage, car, plan, money]
const THEMES = {
  Garage: ['d/Main'],
  Workshop: ['l/Light-Garage', 'l/Light-Car-Services', 'l/Light-Car-Plan', 'l/Light-Car-Money'],
  'Red light': ['n/Red-Garage', null, 'n/Red-Plan'],
  Field: ['n/Field-Garage', 'n/Field-Car', 'n/Field-Plan'],
  Blueprint: ['n/Blue-Garage', 'n/Blue-Car'],
  Logbook: ['n/Log-Garage', null, 'n/Log-Plan', 'n/Log-Money'],
  Rose: ['n/Rose-Garage', 'n/Rose-Car', 'n/Rose-Plan'],
  'Rose by day': ['n/Rose-Day-Garage', null, 'n/Rose-Day-Plan', 'n/Rose-Day-Money'],
};

// Give an <a href="#"> with this aria-label, or with this text, somewhere to go.
function wire(html, { labels = {}, texts = {} }) {
  for (const [label, to] of Object.entries(labels)) {
    if (!to) continue;
    html = html.replace(new RegExp(`<a href="#"((?: (?!data-go)[a-z-]+="[^"]*")* aria-label="${label}")`, 'g'), `<a href="#" data-go="${to}"$1`);
  }
  for (const [text, to] of Object.entries(texts)) {
    if (!to) continue;
    html = html.replace(new RegExp(`<a href="#"((?: (?!data-go)[a-z-]+="[^"]*")*)>${text}(?=<)`, 'g'), `<a href="#" data-go="${to}"$1>${text}`);
  }
  return html;
}

const EXTRA = {};
for (const [, [garage, car, plan, money]] of Object.entries(THEMES)) {
  if (garage.startsWith('d/') || garage.startsWith('l/')) continue; // these have their own links
  EXTRA[garage] = { labels: { 'Open Paj': car || plan, '12 in the plan, 5 late. Most urgent below. Open the plan': plan || car } };
  for (const screen of [car, plan, money].filter(Boolean)) {
    EXTRA[screen] = {
      labels: { 'Back to garage': garage, 'Paj, show the photo': car || garage },
      texts: { Services: car, Plan: plan, Money: money },
    };
  }
}
function wirePicker(html) {
  return html.replace(/<button aria-pressed="(true|false)"([\s\S]*?)<\/button>/g, (m, pressed, rest) => {
    const name = (rest.match(/font-weight: 600; font-size: 14px; color: #[0-9A-Fa-f]{6}; white-space: nowrap;">([^<]+)</) || [])[1];
    const to = name && THEMES[name] && THEMES[name][0];
    if (!to) return m;
    return `<button data-go="${to}" aria-pressed="${pressed}"${rest}</button>`;
  });
}

const sha = (s) => createHash('sha256').update(s).digest('hex').slice(0, 10);

const index = {};
const problems = [];
const boards = [];

for (const set of SETS) {
  const dir = join(SITE, SRC, set);
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.dc.html')).sort()) {
    const name = file.slice(0, -'.dc.html'.length);
    const id = `${set}/${name}`;
    if (SKIP.has(id)) continue;
    const src = readFileSync(join(dir, file), 'utf8').replace(/\r\n/g, '\n');
    const title = (src.match(/<title>([\s\S]*?)<\/title>/) ?? [, name])[1].trim();
    const a = src.indexOf('</helmet>');
    const b = src.lastIndexOf('</x-dc>');
    if (a < 0 || b < 0) throw new Error(`${id}: no <helmet> / </x-dc>, the board format changed`);
    let html = src.slice(a + '</helmet>'.length, b).trim();
    // The language boards carry lang (and dir) on the root before the style.
    const size = html.match(/^<div(?: [a-z-]+="[^"]*")* style="width: (\d+)px; height: (\d+)px;/);
    if (!size) throw new Error(`${id}: the board does not open with its sized root div`);
    boards.push({ set, name, id, title, html, w: +size[1], h: +size[2] });
  }
}

const ids = new Set(boards.map((b) => b.id));

rmSync(join(SITE, OUT), { recursive: true, force: true });
for (const set of SETS) mkdirSync(join(SITE, OUT, set), { recursive: true });

for (const bd of boards) {
  let html = bd.html.replace(/\/_blob\/([0-9a-f]{32})/g, (m, blob) => {
    if (!BLOBS[blob]) throw new Error(`${bd.id}: unknown image ${blob}; download it and add it to BLOBS`);
    return IMG + BLOBS[blob];
  });
  const links = new Set();
  html = html.replace(/href="([^"#][^"]*?)\.dc\.html"/g, (m, target) => {
    const to = `${bd.set}/${target}`;
    if (!ids.has(to)) {
      problems.push(`${bd.id} links to ${to}, which is not a board`);
      return 'href="#" data-inert=""';
    }
    links.add(to);
    return `href="#" data-go="${to}"`;
  });
  if (EXTRA[bd.id]) html = wire(html, EXTRA[bd.id]);
  if (bd.id === 'n/Theme-Picker') html = wirePicker(html);
  for (const m of html.matchAll(/data-go="([^"]+)"/g)) {
    if (!ids.has(m[1])) throw new Error(`${bd.id}: wired to ${m[1]}, which is not a board`);
    links.add(m[1]);
  }
  // Newlines between tags only cost bytes; the boards have no <pre>.
  html = html.replace(/>\s*\n\s*</g, '><');
  if (/\/_blob\/|\.dc\.html/.test(html)) throw new Error(`${bd.id}: a canvas path survived the rewrite`);
  writeFileSync(join(SITE, OUT, bd.set, `${bd.name}.html`), html + '\n', 'utf8');
  index[bd.id] = { w: bd.w, h: bd.h, t: bd.title, v: sha(html), go: [...links].sort() };
}

for (const blob of new Set(Object.values(BLOBS))) {
  if (!existsSync(join(SITE, 'assets/home/img', blob))) throw new Error(`assets/home/img/${blob} is missing`);
}

writeFileSync(join(SITE, OUT, 'index.json'), JSON.stringify(index) + '\n', 'utf8');
const count = (set) => Object.keys(index).filter((k) => k.startsWith(`${set}/`)).length;
console.log(`${boards.length} boards -> ${OUT}/ (${count('d')} dark, ${count('n')} new features, ${count('l')} light)`);
// The light canvas is only here for the Workshop theme, so most of its links
// lead out of what was copied; count those, list the rest.
const light = problems.filter((p) => p.startsWith('l/'));
const other = [...new Set(problems.filter((p) => !p.startsWith('l/')))];
if (light.length) console.log(`${light.length} links from the light boards lead outside the Workshop screens and are inert`);
if (other.length) console.log(`inert links:\n  ${other.join('\n  ')}`);
