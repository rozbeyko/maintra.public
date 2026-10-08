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
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const SITE = process.argv[2] ?? '.';
const read = (p) => readFileSync(join(SITE, p), 'utf8');
const hash = (p) => createHash('sha256').update(readFileSync(join(SITE, p))).digest('hex').slice(0, 8);
const asset = (p) => `/${p}?v=${hash(p)}`;

const PAGES = ['about', 'faq', 'support', 'privacy', 'terms', 'delete-account', 'press', 'press-en', 'wishlist', 'confirmed', 'reset-password'];

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

const dicts = {};
const dict = (lang) => (dicts[lang] ??= JSON.parse(read(`tools/home/i18n/${lang === 'uk' ? 'uk' : 'en'}.json`)));
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function chromeTop(name, lang, alt) {
  const d = dict(lang);
  const homePath = lang === 'uk' ? '/uk/' : '/';
  const press = lang === 'uk' ? '/press' : '/press-en';
  const links = [
    [`${homePath}#tour`, d['nav.tour'], null],
    ['/faq.html', d['foot.faq'], 'faq'],
    ['/support.html', d['foot.support'], 'support'],
    [press, d['foot.press'], lang === 'uk' ? 'press' : 'press-en'],
    ['/about.html', d['foot.about'], 'about'],
  ];
  const cur = (p) => (p === name ? ' aria-current="page"' : '');
  const theme = themeBtn
    .replace(/data-to-light="[^"]*"/, `data-to-light="${esc(d['nav.to_light'])}"`)
    .replace(/data-to-dark="[^"]*"/, `data-to-dark="${esc(d['nav.to_dark'])}"`)
    .replace(/aria-label="[^"]*"/, `aria-label="${esc(d['nav.to_light'])}"`);
  // the same page in its other language, where there is one (the press kit)
  const other = alt ? `\n  <a class="lang-btn" href="${alt.href}" hreflang="${alt.lang}" lang="${alt.lang}">${globe}<span>${alt.lang.toUpperCase()}</span></a>` : '';
  return `<!-- chrome:top -->
<a class="skip" href="#main">${esc(d['a11y.skip'])}</a>
<header class="top" id="top">
  ${headerBrand.replace('href="/"', `href="${homePath}"`)}
  <nav class="top-nav" aria-label="Maintra">
${links.map(([h, l, p]) => `    <a href="${h}"${cur(p)}>${esc(l)}</a>`).join('\n')}
  </nav>
  <span class="top-gap"></span>${other}
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

function chromeFoot(lang) {
  const d = dict(lang);
  const homePath = lang === 'uk' ? '/uk/' : '/';
  const links = [
    ['/about.html', d['foot.about']],
    ['/faq.html', d['foot.faq']],
    ['/support.html', d['foot.support']],
    [lang === 'uk' ? '/press' : '/press-en', d['foot.press']],
    [lang === 'uk' ? '/journey' : '/journey-en', d['foot.journey']],
    ['/privacy.html', d['foot.privacy']],
    ['/terms.html', d['foot.terms']],
    ['/delete-account.html', d['foot.delete']],
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

const chromeHead = (press) => `<!-- chrome:head -->
${themePick}
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
const toc = (heads, lang) =>
  heads.length < 3
    ? '<!-- chrome:toc --><!-- /chrome:toc -->'
    : `<!-- chrome:toc -->
    <nav class="doc-toc" aria-label="${lang === 'uk' ? 'Розділи' : 'Sections'}">
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

// ------------------------------------------------------------------ go
for (const name of PAGES) {
  const file = `${name}.html`;
  let html = read(file);
  const lang = html.match(/<html lang="([^"]+)"/)?.[1] ?? 'en';
  if (!html.includes('<main id="main" class="doc')) html = html.replace(/<body[^>]*>[\s\S]*<\/body>/, migrate(html));

  // head: the 1.x stylesheet and scripts go, the 2.0 ones come in
  const press = /assets\/press\.css/.test(html);
  html = html
    .replace(/\s*<link rel="stylesheet" href="assets\/(style|press)\.css[^"]*" \/>/g, '')
    .replace(/\s*<script src="assets\/(nav|parallax|fancy-fx)\.js[^"]*" defer><\/script>/g, '')
    .replace(/<meta name="theme-color" content="[^"]*" \/>/, '<meta name="theme-color" content="#0B0B0A" />')
    .replace(/\s*<!-- chrome:head -->[\s\S]*?<!-- \/chrome:head -->/, '')
    .replace('</head>', `${chromeHead(press)}\n</head>`);
  // the theme script sets the browser's bar colour: every page needs the tag
  if (!/<meta name="theme-color"/.test(html)) html = html.replace('<!-- chrome:head -->', '<meta name="theme-color" content="#0B0B0A" />\n<!-- chrome:head -->');

  // the page in its other language, from its own alternates
  const altM = [...html.matchAll(/<link rel="alternate" hreflang="([a-z]{2})" href="https:\/\/maintra\.me([^"]*)"/g)].find((m) => m[1] !== lang);
  const alt = altM ? { lang: altM[1], href: altM[2] } : null;

  // sections, the index, the header and the footer
  const art = html.match(/(<article class="doc-body">)([\s\S]*?)(<\/article>)/);
  const { out, heads } = withIds(art[2]);
  html = html.replace(art[0], `${art[1]}${out}${art[3]}`);
  html = html
    .replace(/<!-- chrome:top -->[\s\S]*?<!-- \/chrome:top -->/, chromeTop(name, lang, alt))
    .replace(/<!-- chrome:toc -->[\s\S]*?<!-- \/chrome:toc -->/, toc(heads, lang))
    .replace(/<!-- chrome:foot -->[\s\S]*?<!-- \/chrome:foot -->/, chromeFoot(lang))
    .replace(/<main id="main" class="doc[^"]*">/, `<main id="main" class="doc${heads.length < 3 ? ' doc-plain' : ''}">`)
    .replace(/<div class="doc-grid[^"]*">/, `<div class="doc-grid${heads.length < 3 ? '' : ' has-toc'}">`);
  writeFileSync(join(SITE, file), html, 'utf8');
  console.log(`${file}  ${heads.length} sections`);
}
