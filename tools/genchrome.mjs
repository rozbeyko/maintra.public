/**
 * Give the site's other pages the 2.0 design: the homepage's header, menu,
 * theme switch and footer, and the reading layout of assets/home/site.css.
 *
 *   node tools/genpress.mjs .     (the press kit is generated: first that)
 *   node tools/genhome.mjs .      (the header and footer are the homepage's)
 *   node tools/genchrome.mjs .
 *
 * Run it again after any change to the homepage's header or footer, to
 * site.css / site.js / home.css (it stamps their content hashes, see the
 * README on caching), or after editing a page's headings (the section index
 * is built from the <h2>s).
 *
 * The first run on a page moves it out of the 1.x layout (the .container
 * with the old header and footer): the first <h1> and the lede after it
 * become the page's head, everything else its text. Later runs only rewrite
 * what sits between the <!-- chrome:... --> markers and leave the text alone,
 * so the pages stay hand-editable HTML. Labels come from the homepage's
 * dictionaries in tools/home/i18n/, by the page's <html lang>.
 *
 * Languages: a page in TRANSLATED is English at /<page>.html (the Play
 * Console URLs, keep them) and has a translation at /<code>/<page>.html in
 * each language that has the file. Every version gets the others as hreflang
 * alternates and in a language menu, and its links to the site's other pages
 * go to their versions in the same language where those exist. A
 * translation is made once from the English page and then edited by hand
 * like it; this script never writes text into it.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const SITE = process.argv[2] ?? '.';
const read = (p) => readFileSync(join(SITE, p), 'utf8');
const hash = (p) => createHash('sha256').update(readFileSync(join(SITE, p))).digest('hex').slice(0, 8);
const asset = (p) => `/${p}?v=${hash(p)}`;

const ORIGIN = 'https://maintra.me';
const TRANSLATED = ['about', 'faq', 'support', 'privacy', 'terms', 'delete-account', 'confirmed', 'reset-password'];
const PAGES = [...TRANSLATED, 'press', 'press-en', 'wishlist'];

// ------------------------------------------------- parts of the homepage
const home = read('index.html');
const grab = (re, what) => {
  const m = home.match(re);
  if (!m) throw new Error(`index.html: no ${what} (run tools/genhome.mjs first)`);
  return m[0];
};
const headerBrand = grab(/<a class="brand" href="\/" aria-label="Maintra">[\s\S]*?<\/a>/, 'header logo');
const footBrand = home.match(/<div class="foot-brand"><a class="brand"[\s\S]*?<\/a>/)?.[0].replace('<div class="foot-brand">', '') ?? headerBrand;
const themeBtn = grab(/<button class="theme-btn"[\s\S]*?<\/button>/, 'theme switch');
const globe = grab(/<button class="lang-btn"[\s\S]*?(<svg[\s\S]*?<\/svg>)/, 'globe icon').match(/<svg[\s\S]*?<\/svg>/)[0];
const themePick = grab(/<script>\n\(function \(\) \{\n  var t = null;[\s\S]*?<\/script>/, 'theme pick');
// the site's languages, as the homepage's menu lists them
const LANGS = [...home.matchAll(/<li><a href="(\/[a-z]*\/?)" hreflang="([^"]+)" lang="[^"]+"(?: dir="(rtl)")? data-lang="([a-z]+)"[^>]*><span class="code">[a-z]+<\/span>([^<]+)<\/a><\/li>/g)].map(
  (m) => ({ code: m[4], html: m[2], dir: m[3] || 'ltr', name: m[5] }),
);
if (LANGS.length < 2) throw new Error('index.html: no language menu');
const byHtml = (l) => LANGS.find((x) => x.html === l || x.code === l) ?? LANGS[0];
const arabicFonts = existsSync(join(SITE, 'ar/index.html')) ? read('ar/index.html').match(/<style>\n@font-face\{font-family:'Noto Kufi Arabic'[\s\S]*?<\/style>/)?.[0] ?? '' : '';

// where a page lives in a language, and whether it is there
const fileOf = (code, name) => (code === 'en' ? `${name}.html` : `${code}/${name}.html`);
const urlOf = (code, name) => (code === 'en' ? `/${name}.html` : `/${code}/${name}.html`);
const has = (code, name) => existsSync(join(SITE, fileOf(code, name)));
// a link to one of the site's pages, in this language if it is translated
const loc = (code, name) => (has(code, name) ? urlOf(code, name) : urlOf('en', name));
const homeOf = (code) => (code === 'en' ? '/' : `/${code}/`);

const dicts = {};
const dict = (code) => (dicts[code] ??= JSON.parse(read(`tools/home/i18n/${existsSync(join(SITE, `tools/home/i18n/${code}.json`)) ? code : 'en'}.json`)));
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function chromeTop(name, code, versions) {
  const d = dict(code);
  const homePath = homeOf(code);
  const press = code === 'uk' ? '/press' : '/press-en';
  const links = [
    [`${homePath}#tour`, d['nav.tour'], null],
    [loc(code, 'faq'), d['foot.faq'], 'faq'],
    [loc(code, 'support'), d['foot.support'], 'support'],
    [press, d['foot.press'], code === 'uk' ? 'press' : 'press-en'],
    [loc(code, 'about'), d['foot.about'], 'about'],
  ];
  const cur = (p) => (p === name ? ' aria-current="page"' : '');
  const theme = themeBtn
    .replace(/data-to-light="[^"]*"/, `data-to-light="${esc(d['nav.to_light'])}"`)
    .replace(/data-to-dark="[^"]*"/, `data-to-dark="${esc(d['nav.to_dark'])}"`)
    .replace(/aria-label="[^"]*"/, `aria-label="${esc(d['nav.to_light'])}"`);
  // this page in the other languages it exists in
  const langMenu =
    versions.length > 1
      ? `
  <div class="lang">
    <button class="lang-btn" type="button" aria-haspopup="true" aria-expanded="false" aria-controls="lang-menu" aria-label="${esc(d['nav.lang'])}">${globe}<span>${code.toUpperCase()}</span></button>
    <ul class="lang-menu" id="lang-menu" hidden>${versions
      .map((v) => `<li><a href="${v.href}" hreflang="${v.l.html}" lang="${v.l.html}"${v.l.dir === 'rtl' ? ' dir="rtl"' : ''} data-lang="${v.l.code}"${v.l.code === code ? ' aria-current="true"' : ''}><span class="code">${v.l.code}</span>${v.l.name}</a></li>`)
      .join('')}</ul>
  </div>`
      : '\n  <span class="top-gap"></span>';
  return `<!-- chrome:top -->
<a class="skip" href="#main">${esc(d['a11y.skip'])}</a>
<header class="top" id="top">
  ${headerBrand.replace('href="/"', `href="${homePath}"`)}
  <nav class="top-nav" aria-label="Maintra">
${links.map(([h, l, p]) => `    <a href="${h}"${cur(p)}>${esc(l)}</a>`).join('\n')}
  </nav>${langMenu}
  ${theme}
  <a class="btn btn-line btn-sm top-get" href="${homePath}#get">${esc(d['nav.get'])}</a>
  <button class="menu-btn" type="button" aria-expanded="false" aria-controls="menu" aria-label="${esc(d['a11y.menu'])}"><i></i><i></i><i></i></button>
</header>
<div class="menu" id="menu" hidden>
  <nav aria-label="${esc(d['a11y.menu'])}">
${links.map(([h, l, p], i) => `    <a href="${h}"${cur(p)}><span class="n">0${i + 1}</span>${esc(l)}</a>`).join('\n')}
  </nav>
  <a class="btn btn-gold menu-get" href="${homePath}#get">${esc(d['nav.get'])}</a>
</div>
<!-- /chrome:top -->`;
}

function chromeFoot(code) {
  const d = dict(code);
  const homePath = homeOf(code);
  const links = [
    [loc(code, 'about'), d['foot.about']],
    [loc(code, 'faq'), d['foot.faq']],
    [loc(code, 'support'), d['foot.support']],
    [code === 'uk' ? '/press' : '/press-en', d['foot.press']],
    [code === 'uk' ? '/journey' : '/journey-en', d['foot.journey']],
    [loc(code, 'privacy'), d['foot.privacy']],
    [loc(code, 'terms'), d['foot.terms']],
    [loc(code, 'delete-account'), d['foot.delete']],
  ];
  return `<!-- chrome:foot -->
<footer class="foot">
  <div class="foot-in">
    <div class="foot-brand">${footBrand.replace('href="/"', `href="${homePath}"`)}<p>${esc(d['foot.tagline'])}</p></div>
    <nav class="foot-links" aria-label="Maintra">
${links.map(([h, l]) => `      <a href="${h}">${esc(l)}</a>`).join('\n')}
    </nav>
    <p class="copy">© ${new Date().getFullYear()} Maintra</p>
  </div>
</footer>
<!-- /chrome:foot -->`;
}

const chromeHead = (press, code, alts) => `<!-- chrome:head -->
${alts}${themePick}${code === 'ar' && arabicFonts ? `\n${arabicFonts}` : ''}
<link rel="stylesheet" href="${asset('assets/home/fonts.css')}" />
<link rel="stylesheet" href="${asset('assets/home/home.css')}" />
<link rel="stylesheet" href="${asset('assets/home/site.css')}" />${press ? `\n<link rel="stylesheet" href="${asset('assets/press.css')}" />` : ''}
<script type="module" src="${asset('assets/home/site.js')}"></script>
<!-- /chrome:head -->`;

// ------------------------------------------------------- the section index
const slug = (s) =>
  s
    .replace(/<[^>]+>/g, '')
    .toLowerCase()
    .replace(/&[a-z]+;/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'section';

const unesc = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

function withIds(body) {
  const used = new Set();
  const heads = [];
  // the sections are numbered by the page (01, 02...): a number typed into
  // a heading ("1. Who we are") would count twice
  const typed = [...body.matchAll(/<h2[^>]*>\s*\d+\.\s/g)].length;
  const all = [...body.matchAll(/<h2[^>]*>/g)].length;
  if (typed && typed === all) body = body.replace(/(<h2[^>]*>)\s*\d+\.\s+/g, '$1');
  const out = body.replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/g, (all, attrs, inner) => {
    let id = attrs.match(/\sid="([^"]+)"/)?.[1];
    if (!id) {
      id = slug(inner);
      while (used.has(id)) id += '-2';
      attrs += ` id="${id}"`;
    }
    used.add(id);
    heads.push([id, unesc(inner.replace(/<[^>]+>/g, '').trim())]);
    return `<h2${attrs}>${inner}</h2>`;
  });
  return { out, heads };
}
const toc = (heads, code) =>
  heads.length < 3
    ? '<!-- chrome:toc --><!-- /chrome:toc -->'
    : `<!-- chrome:toc -->
    <nav class="doc-toc" aria-label="${esc(dict(code)['a11y.sections'])}">
      <ol>
${heads.map(([id, t], i) => `        <li><a href="#${id}"><span class="n">${String(i + 1).padStart(2, '0')}</span>${esc(t)}</a></li>`).join('\n')}
      </ol>
    </nav>
    <!-- /chrome:toc -->`;

// ------------------------------------------------- a page from 1.x: move it
function migrate(html) {
  const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/)[1];
  const start = body.indexOf('</header>');
  const footAt = body.lastIndexOf('<footer');
  if (start < 0 || footAt < 0) throw new Error('not a 1.x page: no site header or footer');
  let content = body.slice(start + '</header>'.length, footAt);
  const afterFoot = body.slice(body.indexOf('</footer>', footAt) + '</footer>'.length);
  // after the old footer: the container's close, the year script, the page's own scripts
  const tail = afterFoot
    .replace(/^\s*<\/div>/, '')
    .replace(/\s*<script>document\.getElementById\('year'\)[^<]*<\/script>/, '')
    .replace(/^\s*document\.getElementById\('year'\)\.textContent = new Date\(\)\.getFullYear\(\);\s*/m, '');
  // the head of the page: its first <h1>, and the lede right after it
  let headHtml = '';
  const h = content.match(/^\s*<h1([^>]*)>([\s\S]*?)<\/h1>\s*(<p class="lede">[\s\S]*?<\/p>)?/);
  if (h) {
    headHtml = `  <header class="doc-head">\n    <h1${h[1]} class="h1">${h[2]}</h1>${h[3] ? `\n    ${h[3]}` : ''}\n  </header>\n`;
    content = content.slice(h[0].length);
  }
  // 1.x buttons were inline-styled links; the 2.0 button classes take over
  content = content.replace(/<a ([^>]*?)style="display:(inline-block|none);background:var\(--primary\)[^"]*"([^>]*)>/g, (all, a, disp, b) => {
    const attrs = `${a}${b}`.trim();
    const cls = attrs.match(/class="([^"]*)"/);
    const rest = attrs.replace(/\s*class="[^"]*"/, '').trim();
    return `<a ${rest ? `${rest} ` : ''}class="${cls ? `${cls[1]} ` : ''}btn btn-gold"${disp === 'none' ? ' style="display:none"' : ''}>`;
  });
  // the homepage moved: its old anchors
  content = content.replace(/href="index\.html#pricing"/g, 'href="/#plans"').replace(/href="index\.html"/g, 'href="/"');
  const tailOut = tail.replace(/href="index\.html"/g, 'href="/"');
  return `<body>
<!-- chrome:top --><!-- /chrome:top -->
<main id="main" class="doc">
${headHtml}  <div class="doc-grid">
    <!-- chrome:toc --><!-- /chrome:toc -->
    <article class="doc-body">
${content.trim().replace(/^/gm, '      ')}
    </article>
  </div>
</main>
<!-- chrome:foot --><!-- /chrome:foot -->
${tailOut.trim()}
</body>`;
}

// links in a page: root-absolute (a translation lives one folder down), and
// to the site's other pages in the page's language. The link from a
// translation to its own English original (the legal pages' note) stays.
function relink(html, code, name) {
  html = html.replace(/(\s(?:href|src))="(?!\/|#|[a-z][a-z0-9+.-]*:)([^"]+)"/g, '$1="/$2"');
  if (code === 'en') return html;
  return html.replace(/href="\/([a-z-]+)\.html(#[^"]*)?"/g, (all, n, hash = '') =>
    TRANSLATED.includes(n) && n !== name && has(code, n) ? `href="${urlOf(code, n)}${hash}"` : all,
  );
}

// ------------------------------------------------------------------ go
const jobs = [];
for (const name of PAGES) {
  for (const l of TRANSLATED.includes(name) ? LANGS : [LANGS[0]]) if (has(l.code, name)) jobs.push([name, l.code]);
}
for (const [name, fileCode] of jobs) {
  const file = fileOf(fileCode, name);
  let html = read(file);
  const l = byHtml(html.match(/<html lang="([^"]+)"/)?.[1] ?? 'en');
  const code = TRANSLATED.includes(name) ? fileCode : l.code;
  if (!html.includes('<main id="main" class="doc')) html = html.replace(/<body[^>]*>[\s\S]*<\/body>/, migrate(html));
  html = html.replace(/<html[^>]*>/, `<html lang="${byHtml(code).html}"${byHtml(code).dir === 'rtl' ? ' dir="rtl"' : ''}>`);

  // the versions of this page, and its URL
  let versions;
  let alts = '';
  if (TRANSLATED.includes(name)) {
    versions = LANGS.filter((x) => has(x.code, name)).map((x) => ({ l: x, href: urlOf(x.code, name) }));
    const self = `${ORIGIN}${urlOf(code, name)}`;
    html = html
      .replace(/\s*<link rel="canonical"[^>]*>/g, '')
      .replace(/\s*<link rel="alternate" hreflang[^>]*>/g, '')
      .replace(/(<meta property="og:url" content=")[^"]*"/, `$1${self}"`);
    if (versions.length > 1)
      alts = `<link rel="canonical" href="${self}" />\n${versions.map((v) => `<link rel="alternate" hreflang="${v.l.html}" href="${ORIGIN}${v.href}" />`).join('\n')}\n<link rel="alternate" hreflang="x-default" href="${ORIGIN}${urlOf('en', name)}" />\n`;
    else alts = `<link rel="canonical" href="${self}" />\n`;
  } else {
    // the press kit's two languages, from its own alternates
    versions = [...html.matchAll(/<link rel="alternate" hreflang="([a-z]{2})" href="https:\/\/maintra\.me([^"]*)"/g)].map((m) => ({ l: byHtml(m[1]), href: m[2] }));
  }

  // head: the 1.x stylesheet and scripts go, the 2.0 ones come in
  const press = /assets\/press\.css/.test(html);
  html = html
    .replace(/\s*<link rel="stylesheet" href="assets\/(style|press)\.css[^"]*" \/>/g, '')
    .replace(/\s*<script src="assets\/(nav|parallax|fancy-fx)\.js[^"]*" defer><\/script>/g, '')
    .replace(/<meta name="theme-color" content="[^"]*" \/>/, '<meta name="theme-color" content="#0B0B0A" />')
    .replace(/\s*<!-- chrome:head -->[\s\S]*?<!-- \/chrome:head -->/, '')
    .replace('</head>', `${chromeHead(press, code, alts)}\n</head>`);
  // the theme script sets the browser's bar colour: every page needs the tag
  if (!/<meta name="theme-color"/.test(html)) html = html.replace('<!-- chrome:head -->', '<meta name="theme-color" content="#0B0B0A" />\n<!-- chrome:head -->');

  // sections, the index, the header and the footer
  const art = html.match(/(<article class="doc-body">)([\s\S]*?)(<\/article>)/);
  const { out, heads } = withIds(art[2]);
  html = html.replace(art[0], `${art[1]}${out}${art[3]}`);
  html = html
    .replace(/<!-- chrome:top -->[\s\S]*?<!-- \/chrome:top -->/, chromeTop(name, code, versions))
    .replace(/<!-- chrome:toc -->[\s\S]*?<!-- \/chrome:toc -->/, toc(heads, code))
    .replace(/<!-- chrome:foot -->[\s\S]*?<!-- \/chrome:foot -->/, chromeFoot(code))
    .replace(/<main id="main" class="doc[^"]*">/, `<main id="main" class="doc${heads.length < 3 ? ' doc-plain' : ''}">`)
    .replace(/<div class="doc-grid[^"]*">/, `<div class="doc-grid${heads.length < 3 ? '' : ' has-toc'}">`);
  html = relink(html, code, name);
  writeFileSync(join(SITE, file), html, 'utf8');
  console.log(`${file.padEnd(26)} ${heads.length} sections${versions.length > 1 ? `, ${versions.length} languages` : ''}`);
}
