/**
 * Generate the landing page, / and one copy per language: /uk/ /pl/ /fr/
 * /it/ /es/ /de/ /ar/ /ko/ /ja/ /zh/, from tools/home/page.html and the
 * dictionaries in tools/home/i18n/.
 *
 *   {{key}}         a string from the language's dictionary, escaped
 *   {{{key}}}       the same, as HTML (keys ending in _html)
 *   {{icon:name}}   an icon from the design system's Icons board
 *   {{asset:path}}  a site path with a content hash, see the README on caching
 *   {{v:name}}      something this script works out (alternates, menus...)
 *
 * The build FAILS when a dictionary is missing a key English has, carries a
 * key English doesn't, or when anything is left in braces on a page: a page
 * half in one language and half in another is the failure this guards
 * against. A language only gets a page once its dictionary exists.
 *
 * The JS modules import each other with a hash too (they are cached for four
 * hours like any asset), so this script stamps those import lines first,
 * from the leaves up. Run it after any change to assets/home/*.js or *.css:
 *
 *   node tools/genboards.mjs .   (when the design boards changed)
 *   node tools/genhome.mjs .
 *
 * Do not hand-edit index.html or the language folders: they are output.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const SITE = process.argv[2] ?? '.';
const ORIGIN = 'https://maintra.me';
const read = (p) => readFileSync(join(SITE, p), 'utf8');
const hash = (s) => createHash('sha256').update(s.replace(/\r\n/g, '\n')).digest('hex').slice(0, 8);
const hashFile = (p) => hash(read(p));

// The app's languages: the six of 1.6 and the five 2.0 adds.
const LANGS = [
  { code: 'en', name: 'English', og: 'en_US' },
  { code: 'uk', name: 'Українська', og: 'uk_UA' },
  { code: 'pl', name: 'Polski', og: 'pl_PL' },
  { code: 'fr', name: 'Français', og: 'fr_FR' },
  { code: 'it', name: 'Italiano', og: 'it_IT' },
  { code: 'es', name: 'Español', og: 'es_ES' },
  { code: 'de', name: 'Deutsch', og: 'de_DE' },
  { code: 'ar', name: 'العربية', og: 'ar_AR', dir: 'rtl' },
  { code: 'ko', name: '한국어', og: 'ko_KR' },
  { code: 'ja', name: '日本語', og: 'ja_JP' },
  { code: 'zh', name: '简体中文', og: 'zh_CN', html: 'zh-Hans' },
];
const pathOf = (code) => (code === 'en' ? '/' : `/${code}/`);
const htmlLang = (l) => l.html || l.code;

const STORES = {
  ios: 'https://apps.apple.com/app/maintra/id6775876731',
  android: 'https://play.google.com/store/apps/details?id=com.maintra.app',
};

// ------------------------------------------------------------ dictionaries
const dicts = {};
for (const l of LANGS) {
  const p = `tools/home/i18n/${l.code}.json`;
  if (existsSync(join(SITE, p))) dicts[l.code] = JSON.parse(read(p));
}
const en = dicts.en;
if (!en) throw new Error('tools/home/i18n/en.json is missing');
for (const [code, d] of Object.entries(dicts)) {
  const missing = Object.keys(en).filter((k) => !(k in d));
  const extra = Object.keys(d).filter((k) => !(k in en));
  if (missing.length || extra.length) {
    throw new Error(`${code}.json: ${missing.length ? `missing ${missing.join(', ')}` : ''}${extra.length ? ` extra ${extra.join(', ')}` : ''}`);
  }
  for (const [k, v] of Object.entries(d)) if (typeof v !== 'string' || !v.trim()) throw new Error(`${code}.json: ${k} is empty`);
}
const built = LANGS.filter((l) => dicts[l.code]);

// ------------------------------------------------------------------ icons
// The 69 marks of the design system, drawn once on its Icons board.
const iconBoard = read('tools/home/src/d/Icons.dc.html');
const ICONS = {};
for (const m of iconBoard.matchAll(/<svg[^>]*viewBox="0 0 24 24"[^>]*>([\s\S]*?)<\/svg>\s*(?:<\/span>)?\s*<span[^>]*>([a-z]+)<\/span>/g)) {
  if (!ICONS[m[2]]) ICONS[m[2]] = m[1].replace(/\s+/g, ' ').trim();
}
const icon = (name) => {
  if (!ICONS[name]) throw new Error(`no icon "${name}" on the Icons board`);
  return `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;
};

// ------------------------------------------------- module versions, leaf up
// three.js and RoomEnvironment are the journey's, the same r169 file.
const stampImports = (file, deps) => {
  let src = read(file);
  for (const dep of deps) {
    const re = new RegExp(`(from '\\./${dep.replace('.', '\\.')})(\\?v=[0-9a-f]+)?'`, 'g');
    if (!re.test(src)) throw new Error(`${file} no longer imports ./${dep}`);
    src = src.replace(re, `$1?v=${hashFile(`assets/home/${dep}`)}'`);
  }
  writeFileSync(join(SITE, file), src, 'utf8');
};
stampImports('assets/home/stage.js', ['css3d.js']);
stampImports('assets/home/home.js', ['stage.js', 'player.js']);

const asset = (p) => `/${p}?v=${hashFile(p)}`;

// The share card: the hero, 1200x630, rendered per language by
// tools/genog.mjs. A language without one shares English's.
const ogImage = (code) => {
  const p = existsSync(join(SITE, `assets/home/og/${code}.jpg`)) ? `assets/home/og/${code}.jpg` : 'assets/home/og/en.jpg';
  if (!p.endsWith(`/${code}.jpg`)) console.warn(`${code}: no share card yet, using English's`);
  return `${ORIGIN}/${p}?v=${createHash('sha256').update(readFileSync(join(SITE, p))).digest('hex').slice(0, 8)}`;
};
const BOARDS_V = hashFile('assets/home/b/index.json');

// ------------------------------------------------------------- the pieces
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// The final mark (Logo artifact, R16), as the Brand board draws it.
let logoN = 0;
const logo = () => {
  const id = `mtc${++logoN}`;
  return `<svg class="mt" viewBox="0 0 100 57.69" aria-hidden="true"><path d="M26.10,0.00 L35.15,0.00 L35.15,57.69 L26.10,57.69 Z" fill="#8F897E"/><path d="M52.20,0.00 L61.25,0.00 L61.25,57.69 L52.20,57.69 Z" fill="#8F897E"/><path d="M9.26,11.54 L100.00,11.54 L96.51,22.29 L5.76,22.29 Z" fill="#F4B223"/><clipPath id="${id}"><path d="M9.26,11.54 L100.00,11.54 L96.51,22.29 L5.76,22.29 Z"/></clipPath><g clip-path="url(#${id})"><path d="M2.40,57.69 L18.80,57.69 L37.55,0.00 L21.15,0.00 Z" fill="#9A6700"/><path d="M28.50,57.69 L44.90,57.69 L63.65,0.00 L47.24,0.00 Z" fill="#9A6700"/><path d="M54.60,57.69 L71.00,57.69 L89.75,0.00 L73.34,0.00 Z" fill="#9A6700"/></g><path d="M0.00,57.69 L16.40,57.69 L35.15,0.00 L18.75,0.00 Z" fill="#ECE4D6"/><path d="M26.10,57.69 L42.50,57.69 L61.25,0.00 L44.84,0.00 Z" fill="#ECE4D6"/><path d="M52.20,57.69 L68.60,57.69 L87.35,0.00 L70.94,0.00 Z" fill="#F4B223"/></svg>`;
};

// The loading spring, the same one the journey page uses (Logo artifact, R16-Motion).
const LOADER = `<svg viewBox="0 0 100 100" aria-hidden="true">
<g class="ld" style="--dx:-11.48"><path d="M28.97,24.61 L36.93,24.61 L36.93,75.39 L28.97,75.39 Z" fill="#8F897E"/></g>
<g class="ld" style="--dx:-34.45"><path d="M51.93,24.61 L59.90,24.61 L59.90,75.39 L51.93,75.39 Z" fill="#8F897E"/></g>
<path d="M14.14,34.77 L94.00,34.77 L90.93,44.23 L11.07,44.23 Z" fill="#F4B223"/>
<clipPath id="ldBar"><path d="M14.14,34.77 L94.00,34.77 L90.93,44.23 L11.07,44.23 Z"/></clipPath>
<g clip-path="url(#ldBar)">
<g class="ld" style="--dx:0"><path d="M8.40,75.39 L22.83,75.39 L39.33,24.61 L24.90,24.61 Z" fill="#9A6700"/></g>
<g class="ld" style="--dx:-22.97"><path d="M31.37,75.39 L45.80,75.39 L62.30,24.61 L47.86,24.61 Z" fill="#9A6700"/></g>
<g class="ld" style="--dx:-45.93"><path d="M54.33,75.39 L68.77,75.39 L85.26,24.61 L70.83,24.61 Z" fill="#9A6700"/></g>
</g>
<g class="ld" style="--dx:0"><path d="M6.00,75.39 L20.43,75.39 L36.93,24.61 L22.50,24.61 Z" fill="#ECE4D6"/></g>
<g class="ld" style="--dx:-22.97"><path d="M28.97,75.39 L43.40,75.39 L59.90,24.61 L45.46,24.61 Z" fill="#ECE4D6"/></g>
<g class="ld" style="--dx:-45.93"><path d="M51.93,75.39 L66.37,75.39 L82.86,24.61 L68.43,24.61 Z" fill="#F4B223"/></g>
</svg>`;

const APPLE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>';
const PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3.6 1.9c-.4.3-.6.7-.6 1.3v17.5c0 .6.2 1 .6 1.3l9.3-9.5L3.6 1.9z"/><path fill="currentColor" opacity=".72" d="M16.9 8.4 13 12l3.9 3.6 3.7-2.1c1.2-.7 1.2-2.3 0-3l-3.7-2.1z"/><path fill="currentColor" opacity=".86" d="M3.6 1.9 12.9 11l3.5-3.3-9.6-5.5c-.5-.3-1-.4-1.5-.4-.6 0-1.1.2-1.7.1z"/><path fill="currentColor" opacity=".6" d="M3.6 22 12.9 13l3.5 3.3-9.6 5.5c-1 .5-1.7.4-2.7.2z"/></svg>';

const stores = (d) =>
  `<a class="btn btn-gold store" data-store="ios" href="${STORES.ios}" rel="noopener">${APPLE}<span><small>${esc(d['store.ios_small'])}</small>App Store</span></a>` +
  `<a class="btn btn-line store" data-store="android" href="${STORES.android}" rel="noopener">${PLAY}<span><small>${esc(d['store.play_small'])}</small>Google Play</span></a>`;

const ticker = (d) => {
  const items = ['spec.map', 'spec.obd', 'spec.keys', 'spec.mech', 'spec.sheet', 'spec.notice', 'spec.voice', 'spec.themes', 'spec.langs'];
  const once = items.map((k) => `<span>${esc(d[k])}</span><i></i>`).join('');
  return once + once;
};

// The language pick on / (and only there): a language chosen before wins;
// then a browser that reads one of ours other than English; then the country
// Cloudflare sees the visitor in. Search engines stay on the page they asked for.
// Countries split between languages (Belgium) and the Traditional-Chinese ones
// are left out of the map: English beats a guess they would resent.
const LANGPICK = (codes) => `<script>
(function () {
  var L = ${JSON.stringify(codes)};
  var C = {UA:'uk',PL:'pl',FR:'fr',LU:'fr',MC:'fr',SN:'fr',CI:'fr',CM:'fr',ML:'fr',BF:'fr',NE:'fr',TG:'fr',BJ:'fr',GA:'fr',CG:'fr',CD:'fr',MG:'fr',HT:'fr',IT:'it',SM:'it',VA:'it',ES:'es',MX:'es',AR:'es',CO:'es',CL:'es',PE:'es',VE:'es',EC:'es',GT:'es',CU:'es',BO:'es',DO:'es',HN:'es',PY:'es',SV:'es',NI:'es',CR:'es',PA:'es',UY:'es',PR:'es',GQ:'es',DE:'de',AT:'de',CH:'de',LI:'de',SA:'ar',AE:'ar',EG:'ar',MA:'ar',DZ:'ar',TN:'ar',IQ:'ar',JO:'ar',KW:'ar',QA:'ar',BH:'ar',OM:'ar',LB:'ar',SY:'ar',YE:'ar',LY:'ar',SD:'ar',PS:'ar',MR:'ar',KR:'ko',JP:'ja',CN:'zh',SG:'zh'};
  var go = function (l) {
    if (l && l !== 'en' && L.indexOf(l) >= 0) { location.replace('/' + l + '/' + location.search + location.hash); return true; }
    return false;
  };
  var done;
  window.__langPick = new Promise(function (r) { done = r; });
  var saved = null;
  try { saved = localStorage.getItem('maintra.lang'); } catch (e) {}
  if (saved) { if (!go(saved)) done(); return; }
  if (/bot|crawl|spider|slurp|lighthouse|preview/i.test(navigator.userAgent)) { done(); return; }
  var langs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ''];
  for (var i = 0; i < langs.length; i++) {
    var raw = String(langs[i]).toLowerCase(), c = raw.split('-')[0];
    if (c === 'en') break;
    // our Chinese is Simplified: Traditional readers aren't sent to it
    if (c === 'zh' && /-(tw|hk|mo|hant)/.test(raw)) continue;
    if (L.indexOf(c) >= 0) { if (go(c)) return; break; }
  }
  if (!window.fetch) { done(); return; }
  // an answer after the page is up is ignored: no switching under someone reading
  var late = false;
  var t = setTimeout(function () { late = true; done(); }, 1500);
  fetch('/cdn-cgi/trace', { cache: 'no-store' }).then(function (r) { return r.ok ? r.text() : ''; }).then(function (s) {
    if (late) return;
    var m = /(?:^|\\n)loc=([A-Z]{2})/.exec(s);
    if (!(m && go(C[m[1]]))) { clearTimeout(t); done(); }
  }).catch(function () { clearTimeout(t); done(); });
})();
</script>`;

const ARABIC_FONTS = `<style>
@font-face{font-family:'Noto Kufi Arabic';font-style:normal;font-weight:700;font-display:swap;src:url(${asset('assets/home/fonts/noto-kufi-arabic-arabic-700-normal.woff2')}) format('woff2');unicode-range:U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0897-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC}
@font-face{font-family:'Noto Kufi Arabic';font-style:normal;font-weight:800;font-display:swap;src:url(${asset('assets/home/fonts/noto-kufi-arabic-arabic-800-normal.woff2')}) format('woff2');unicode-range:U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0897-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC}
@font-face{font-family:'IBM Plex Sans Arabic';font-style:normal;font-weight:400;font-display:swap;src:url(${asset('assets/home/fonts/ibm-plex-sans-arabic-arabic-400-normal.woff2')}) format('woff2');unicode-range:U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0897-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC}
@font-face{font-family:'IBM Plex Sans Arabic';font-style:normal;font-weight:500;font-display:swap;src:url(${asset('assets/home/fonts/ibm-plex-sans-arabic-arabic-500-normal.woff2')}) format('woff2');unicode-range:U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0897-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC}
@font-face{font-family:'IBM Plex Sans Arabic';font-style:normal;font-weight:600;font-display:swap;src:url(${asset('assets/home/fonts/ibm-plex-sans-arabic-arabic-600-normal.woff2')}) format('woff2');unicode-range:U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0897-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC}
</style>`;

// What the first screen needs, asked for from the head: the modules (exact
// URLs, or the preload is wasted), the board index and the garage, and the
// fonts of the first screen in this script.
const preloads = (l) => {
  const cyr = l.code === 'uk';
  const fonts = ['tektur-400-900', 'firasans-400', 'firasans-600'].flatMap((f) => (cyr ? [`${f}-latin`, `${f}-cyrillic`] : [`${f}-latin`]));
  return [
    `<link rel="modulepreload" href="${asset('assets/home/home.js')}">`,
    `<link rel="modulepreload" href="${asset('assets/home/stage.js')}">`,
    `<link rel="modulepreload" href="${asset('assets/home/player.js')}">`,
    `<link rel="modulepreload" href="/assets/journey/three.module.min.js">`,
    `<link rel="preload" href="/assets/home/b/index.json?v=${BOARDS_V}" as="fetch" crossorigin="anonymous">`,
    `<link rel="preload" href="/assets/home/img/paj.webp" as="image">`,
    ...fonts.map((f) => `<link rel="preload" href="/assets/journey/fonts/${f}.woff2" as="font" type="font/woff2" crossorigin>`),
  ].join('\n');
};

const jsonld = (l, d) =>
  JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'MobileApplication',
    name: 'Maintra',
    url: ORIGIN + pathOf(l.code),
    description: d['meta.description'],
    inLanguage: htmlLang(l),
    operatingSystem: 'iOS, Android',
    applicationCategory: 'UtilitiesApplication',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    author: { '@type': 'Person', name: 'Kyrylo Rozbeiko' },
    downloadUrl: [STORES.ios, STORES.android],
  }).replace(/</g, '\\u003c');

// --------------------------------------------------------------- the build
const template = read('tools/home/page.html');

for (const l of built) {
  const d = dicts[l.code];
  logoN = 0;
  const vars = {
    lang: htmlLang(l),
    dir: l.dir || 'ltr',
    url: ORIGIN + pathOf(l.code),
    home: pathOf(l.code),
    alternates: [
      ...built.map((x) => `<link rel="alternate" hreflang="${htmlLang(x)}" href="${ORIGIN}${pathOf(x.code)}">`),
      `<link rel="alternate" hreflang="x-default" href="${ORIGIN}/">`,
    ].join('\n'),
    langpick: l.code === 'en' ? LANGPICK(built.map((x) => x.code)) : '',
    ogimage: ogImage(l.code),
    preloads: preloads(l),
    fontsextra: l.code === 'ar' ? ARABIC_FONTS : '',
    loader: LOADER,
    logo,
    stores: () => stores(d),
    ticker: ticker(d),
    langcode: l.code.toUpperCase(),
    langmenu: built
      .map((x) => `<li><a href="${pathOf(x.code)}" hreflang="${htmlLang(x)}" lang="${htmlLang(x)}"${x.dir ? ` dir="${x.dir}"` : ''} data-lang="${x.code}"${x.code === l.code ? ' aria-current="true"' : ''}><span class="code">${x.code}</span>${x.name}</a></li>`)
      .join(''),
    langlinks: built
      .map((x) => `<a href="${pathOf(x.code)}" hreflang="${htmlLang(x)}" lang="${htmlLang(x)}"${x.dir ? ` dir="${x.dir}"` : ''} data-lang="${x.code}"${x.code === l.code ? ' aria-current="true"' : ''}>${x.name}</a>`)
      .join(''),
    journey: l.code === 'uk' ? '/journey' : '/journey-en',
    press: l.code === 'uk' ? '/press' : '/press-en',
    jsonld: jsonld(l, d),
    cfg: JSON.stringify({
      lang: l.code,
      boards: BOARDS_V,
      t: { phone: d['a11y.phone'], plate_oil: d['hero.plate_oil'], plate_late: d['hero.plate_late'], plate_hose: d['hero.plate_hose'], plate_health: d['hero.plate_health'] },
    }).replace(/</g, '\\u003c'),
  };
  let html = template
    .replace(/\{\{\{([a-z0-9_.]+)\}\}\}/g, (m, k) => {
      if (!(k in d)) throw new Error(`${l.code}: no ${k}`);
      if (!k.endsWith('_html')) throw new Error(`${k}: only *_html keys go in raw`);
      return d[k];
    })
    .replace(/\{\{icon:([a-z]+)\}\}/g, (m, n) => icon(n))
    .replace(/\{\{asset:([^}]+)\}\}/g, (m, p) => asset(p))
    .replace(/\{\{v:([a-z]+)\}\}/g, (m, k) => {
      if (!(k in vars)) throw new Error(`no variable ${k}`);
      const v = vars[k];
      return typeof v === 'function' ? v() : v;
    })
    .replace(/\{\{([a-z0-9_.]+)\}\}/g, (m, k) => {
      if (!(k in d)) throw new Error(`${l.code}: no ${k}`);
      return esc(d[k]);
    });
  if (/\{\{\{?[a-z]/i.test(html)) throw new Error(`${l.code}: a placeholder was left in braces`);
  const out = l.code === 'en' ? 'index.html' : `${l.code}/index.html`;
  if (l.code !== 'en') mkdirSync(join(SITE, l.code), { recursive: true });
  writeFileSync(join(SITE, out), html, 'utf8');
  console.log(`${out}  ${(html.length / 1024).toFixed(1)} KB`);
}
const waiting = LANGS.filter((l) => !dicts[l.code]).map((l) => l.code);
if (waiting.length) console.log(`no dictionary yet, no page: ${waiting.join(' ')}`);
