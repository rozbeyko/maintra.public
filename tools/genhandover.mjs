/**
 * The two pages the app's handover links open (the app's HANDOVER.md §6; OQ-234, owner
 * 2026-10-29: "як із вішлістом", a static page reading an anonymous function):
 *
 *   /k/<code>   an invite to a car: drive it together, or borrow it
 *   /t/<token>  a car handed over for good: what Maintra checked, and how to take it
 *
 *   node tools/genhandover.mjs .
 *   node tools/genchrome.mjs .     (the header, footer and language menu, as on every other page)
 *
 * Writes k.html and t.html in English and <code>/k.html, <code>/t.html in each language that has
 * a dictionary in tools/handover/i18n/. _redirects serves /k/* and /t/* (and /<code>/k/*, ...)
 * from them with the address kept, and assets/handover.js reads the code from it, calls the
 * function (invite_preview, transfer_page) with the publishable key, as wishlist.html does, and
 * draws what it answers. The English page sends a visitor to their own language once, as the
 * homepage does: a link from the app carries none.
 *
 * The dictionaries are the app's own words for these screens (the invite, the lend, the buyer's
 * side), copied from its i18n files, the site's "Open Maintra", and the few lines only the page
 * says. Edit them there, never the HTML, and run both scripts again.
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const SITE = process.argv[2] ?? '.';
// LF whatever the checkout, as tools/genchrome.mjs reads and hashes: a Windows one has CRLF.
const read = (p) => readFileSync(join(SITE, p), 'utf8').replace(/\r\n/g, '\n');
const hash = (p) => createHash('sha256').update(read(p)).digest('hex').slice(0, 8);
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const PLAY = 'https://play.google.com/store/apps/details?id=com.maintra.app';
const APPSTORE = 'https://apps.apple.com/app/maintra/id6775876731';
const KINDS = ['k', 't'];

const codes = readdirSync(join(SITE, 'tools/handover/i18n'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.slice(0, -5))
  .sort((a, b) => (a === 'en' ? -1 : b === 'en' ? 1 : a.localeCompare(b)));
const dicts = Object.fromEntries(codes.map((c) => [c, JSON.parse(read(`tools/handover/i18n/${c}.json`))]));

// A dictionary is all or nothing, as the homepage's are.
const flat = (d) => Object.keys(d).sort().join(',');
for (const c of codes) if (flat(dicts[c]) !== flat(dicts.en)) throw new Error(`tools/handover/i18n/${c}.json: not the same keys as en.json`);

const script = `/assets/handover.js?v=${hash('assets/handover.js')}`;

// The English page only: a visitor who has not chosen English goes to their language, the code kept.
const pick = (kind) => `<script>
(function () {
  var L = ${JSON.stringify(codes)};
  var m = /^\\/${kind}\\/([0-9a-fA-F]{16})\\/?$/.exec(location.pathname);
  var go = function (l) {
    if (!l || l === 'en' || L.indexOf(l) < 0) return false;
    location.replace('/' + l + '/${kind}' + (m ? '/' + m[1] : '') + location.search + location.hash);
    return true;
  };
  var saved = null;
  try { saved = localStorage.getItem('maintra.lang'); } catch (e) {}
  if (saved) { go(saved); return; }
  if (/bot|crawl|spider|slurp|lighthouse|preview/i.test(navigator.userAgent)) return;
  var langs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ''];
  for (var i = 0; i < langs.length; i++) {
    var raw = String(langs[i]).toLowerCase(), c = raw.split('-')[0];
    if (c === 'en') break;
    if (c === 'zh' && /-(tw|hk|mo|hant)/.test(raw)) continue;
    if (L.indexOf(c) >= 0) { go(c); break; }
  }
})();
</script>
`;

function page(kind, code) {
  const d = dicts[code];
  const title = kind === 'k' ? d.titleK : d.titleT;
  const about = kind === 'k' ? d.ogK : d.ogT;
  const loading = kind === 'k' ? d.loadingK : d.loadingT;
  // Inside a <script> block: nothing in it may close the tag.
  const words = JSON.stringify(d).replace(/</g, '\\u003c');
  return `<!DOCTYPE html>
<html lang="${code}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)} · Maintra</title>
  <meta name="robots" content="noindex" />
  <meta name="description" content="${esc(about)}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Maintra" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(about)}" />
  <meta property="og:url" content="https://maintra.me/${kind}" />
  <meta property="og:image" content="https://maintra.me/assets/home/og/${code}.jpg" />
  <meta name="twitter:card" content="summary_large_image" />
${code === 'en' ? pick(kind) : ''}<meta name="theme-color" content="#0B0B0A" />
<!-- chrome:head --><!-- /chrome:head -->
</head>
<body>
<!-- chrome:top --><!-- /chrome:top -->
<main id="main" class="doc doc-plain">
  <div class="doc-grid">
    <!-- chrome:toc --><!-- /chrome:toc -->
    <article class="doc-body">
      <div class="ho" data-kind="${kind}">
        <p class="ho-msg" data-ho="msg" role="status">${esc(loading)}</p>
        <div class="ho-card" data-ho="card" hidden></div>
        <div class="ho-cta">
          <p class="ho-cta-title" data-ho="ctaTitle" hidden></p>
          <p data-ho="ctaText">${esc(d.install)}</p>
          <p class="ho-actions" data-ho="actions">
            <a class="btn btn-gold" data-ho="open" href="#" hidden>${esc(d.open)}</a>
            <a class="btn btn-line" data-ho="appstore" href="${APPSTORE}" rel="noopener">App Store</a>
            <a class="btn btn-line" data-ho="play" href="${PLAY}" rel="noopener">Google Play</a>
          </p>
        </div>
        <p class="ho-fine" data-ho="fine" hidden></p>
      </div>
      <noscript><style>.ho-msg{display:none}</style></noscript>
      <script type="application/json" id="ho-words">${words}</script>
      <script src="${script}" defer></script>
    </article>
  </div>
</main>
<!-- chrome:foot --><!-- /chrome:foot -->
</body>
</html>
`;
}

for (const code of codes) {
  if (code !== 'en') mkdirSync(join(SITE, code), { recursive: true });
  for (const kind of KINDS) {
    const file = code === 'en' ? `${kind}.html` : `${code}/${kind}.html`;
    writeFileSync(join(SITE, file), page(kind, code), 'utf8');
    console.log(file);
  }
}
