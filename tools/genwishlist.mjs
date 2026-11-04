/**
 * The page a shared wishlist opens in a browser: https://maintra.me/wishlist.html?t=<token>, the
 * link the app's share sheet sends (1.x's link, and 2.0's: the app's FEATURES.md §5.16, step 3;
 * BACKEND.md §5.3). A friend sees the list and books a gift with no account, as in the app's
 * guest view, and in the same words.
 *
 *   node tools/genwishlist.mjs .
 *   node tools/genchrome.mjs .     (the header, footer and language menu, as on every other page)
 *
 * Writes wishlist.html in English and <code>/wishlist.html in each language that has a dictionary
 * in tools/wishlist/i18n/. assets/wishlist.js reads the token from ?t=, calls the app's anonymous
 * functions with the publishable key (get_shared_wishlist_v2, reserve_shared_wish_v2: the app's
 * migration 139) and draws what they answer. A link from the app carries no language, so the
 * English page sends a visitor to theirs once, the token kept, as the homepage and /k/ do.
 *
 * The dictionaries are the app's own words for its guest view (sharedWishlist.*, copied from its
 * i18n files), a few of the site's (the handover pages' "missing code" and "couldn't open", the
 * homepage's "Get the app"), and the few lines only the page says. Edit them there, never the HTML,
 * and run both scripts again.
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const SITE = process.argv[2] ?? '.';
// LF whatever the checkout, as tools/genchrome.mjs reads and hashes: a Windows one has CRLF.
const read = (p) => readFileSync(join(SITE, p), 'utf8').replace(/\r\n/g, '\n');
const hash = (p) => createHash('sha256').update(read(p)).digest('hex').slice(0, 8);
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const codes = readdirSync(join(SITE, 'tools/wishlist/i18n'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.slice(0, -5))
  .sort((a, b) => (a === 'en' ? -1 : b === 'en' ? 1 : a.localeCompare(b)));
const dicts = Object.fromEntries(codes.map((c) => [c, JSON.parse(read(`tools/wishlist/i18n/${c}.json`))]));

// A dictionary is all or nothing, as the homepage's are.
const flat = (d) => Object.keys(d).sort().join(',');
for (const c of codes) if (flat(dicts[c]) !== flat(dicts.en)) throw new Error(`tools/wishlist/i18n/${c}.json: not the same keys as en.json`);

const script = `/assets/wishlist.js?v=${hash('assets/wishlist.js')}`;

// The English page only: a visitor who has not chosen English goes to their language, the token
// kept. /wishlist on the site (Pages drops the .html), /wishlist.html on a local server.
const pick = `<script>
(function () {
  var L = ${JSON.stringify(codes)};
  var go = function (l) {
    if (!l || l === 'en' || L.indexOf(l) < 0) return false;
    location.replace('/' + l + '/wishlist' + (/\\.html$/.test(location.pathname) ? '.html' : '') + location.search + location.hash);
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

function page(code) {
  const d = dicts[code];
  // Inside a <script> block: nothing in it may close the tag.
  const words = JSON.stringify(d).replace(/</g, '\\u003c');
  return `<!DOCTYPE html>
<html lang="${code}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(d.title)} · Maintra</title>
  <meta name="robots" content="noindex" />
  <meta name="description" content="${esc(d.og)}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Maintra" />
  <meta property="og:title" content="${esc(d.title)}" />
  <meta property="og:description" content="${esc(d.og)}" />
  <meta property="og:url" content="https://maintra.me/wishlist.html" />
  <meta property="og:image" content="https://maintra.me/assets/home/og/${code}.jpg" />
  <meta name="twitter:card" content="summary_large_image" />
${code === 'en' ? pick : ''}<meta name="theme-color" content="#0B0B0A" />
<!-- chrome:head --><!-- /chrome:head -->
</head>
<body>
<!-- chrome:top --><!-- /chrome:top -->
<main id="main" class="doc doc-plain">
  <div class="doc-grid">
    <!-- chrome:toc --><!-- /chrome:toc -->
    <article class="doc-body">
      <div class="wl">
        <div class="wl-msg" data-wl="msg" role="status">
          <p class="wl-msg-title" data-wl="msgTitle" hidden></p>
          <p data-wl="msgText">${esc(d.loading)}</p>
          <p class="wl-retry" data-wl="retryBox" hidden><button class="btn btn-line btn-sm" type="button" data-wl="retry">${esc(d.retry)}</button></p>
        </div>
        <div data-wl="view" hidden>
          <p class="wl-eyebrow" data-wl="eyebrow"></p>
          <h1 class="wl-heading" data-wl="heading"></h1>
          <p class="wl-hint" data-wl="hint"></p>
          <div class="wl-you" data-wl="you" hidden>
            <label class="wl-label" for="wl-name">${esc(d.nameLabel)}</label>
            <input class="wl-input" id="wl-name" type="text" maxlength="40" autocomplete="given-name" autocapitalize="words" enterkeyhint="done" aria-describedby="wl-name-note" />
            <p class="wl-note" id="wl-name-note" data-wl="nameNote"></p>
          </div>
          <ul class="wl-list" data-wl="list"></ul>
          <p class="wl-snap" data-wl="snapshot" hidden></p>
        </div>
        <p class="wl-cta">
          <a class="btn btn-gold" data-wl="open" href="#" hidden>${esc(d.open)}</a>
          <a class="btn btn-line" data-wl="get" href="${code === 'en' ? '/' : `/${code}/`}#get">${esc(d.get)}</a>
        </p>
        <div class="wl-toast" data-wl="toast" role="status" aria-live="polite"></div>
      </div>
      <noscript><style>.wl-msg{display:none}</style></noscript>
      <script type="application/json" id="wl-words">${words}</script>
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
  const file = code === 'en' ? 'wishlist.html' : `${code}/wishlist.html`;
  writeFileSync(join(SITE, file), page(code), 'utf8');
  console.log(file);
}
