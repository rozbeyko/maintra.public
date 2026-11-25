/**
 * Every update in detail: https://maintra.me/updates, the page the app's What's new sheet opens
 * from "Every change in detail" (the app's constants/urls.ts UPDATES_URL; OQ-215).
 *
 *   node tools/genupdates.mjs .
 *   node tools/genchrome.mjs .     (the header, footer, section index and language menu)
 *
 * Writes updates.html in English and <code>/updates.html in each language that has a dictionary in
 * tools/updates/i18n/. The words come from the app's RELEASE_NOTES.md, cut down to what a reader
 * would care about; edit them in the dictionaries, never in the HTML, and run both scripts again.
 *
 * A release with no date shows the dictionary's `soon` line. On the day 2.0 ships, give its `date`
 * in every dictionary.
 *
 * The link from the app carries no language, so the English page sends a visitor to theirs once,
 * as /k/ and the wishlist do.
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SITE = process.argv[2] ?? '.';
const read = (p) => readFileSync(join(SITE, p), 'utf8').replace(/\r\n/g, '\n');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const codes = readdirSync(join(SITE, 'tools/updates/i18n'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.slice(0, -5))
  .sort((a, b) => (a === 'en' ? -1 : b === 'en' ? 1 : a.localeCompare(b)));
const dicts = Object.fromEntries(codes.map((c) => [c, JSON.parse(read(`tools/updates/i18n/${c}.json`))]));

// All or nothing, as the site's other dictionaries: the same releases, sections and number of lines.
const shape = (d) =>
  JSON.stringify([
    Object.keys(d).sort(),
    d.releases.map((r) => [r.id, r.date === null, !!r.intro, (r.sections ?? [{ id: '', items: r.items }]).map((s) => [s.id, s.items.length])]),
  ]);
for (const c of codes) {
  if (shape(dicts[c]) !== shape(dicts.en)) throw new Error(`tools/updates/i18n/${c}.json: not the same shape as en.json`);
  if (/[—]/.test(JSON.stringify(dicts[c]))) throw new Error(`tools/updates/i18n/${c}.json: a long dash`);
}

const pick = `<script>
(function () {
  var L = ${JSON.stringify(codes)};
  var go = function (l) {
    if (!l || l === 'en' || L.indexOf(l) < 0) return false;
    location.replace('/' + l + '/updates' + (/\\.html$/.test(location.pathname) ? '.html' : '') + location.search + location.hash);
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

const list = (items) => `      <ul>\n${items.map(([b, t]) => `        <li><strong>${esc(b)}</strong> ${esc(t)}</li>`).join('\n')}\n      </ul>`;

function release(r, d) {
  const out = [`      <h2 id="${r.id}">${esc(r.name)}</h2>`, `      <p class="muted">${esc(r.date ?? d.soon)}</p>`];
  if (r.intro) out.push(`      <p class="lede">${esc(r.intro)}</p>`);
  if (r.sections) {
    out.push(`      <p aria-label="${esc(d.jump)}">${r.sections.map((s) => `<a href="#${r.id}-${s.id}">${esc(s.name)}</a>`).join(' · ')}</p>`);
    for (const s of r.sections) out.push(`      <h3 id="${r.id}-${s.id}" style="scroll-margin-top:calc(var(--nav) + 24px)">${esc(s.name)}</h3>`, list(s.items));
  } else out.push(list(r.items));
  return out.join('\n');
}

function page(code) {
  const d = dicts[code];
  return `<!DOCTYPE html>
<html lang="${code}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(d.title)} · Maintra</title>
  <meta name="description" content="${esc(d.desc)}" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Maintra" />
  <meta property="og:title" content="${esc(d.title)} · Maintra" />
  <meta property="og:description" content="${esc(d.desc)}" />
  <meta property="og:url" content="https://maintra.me/updates.html" />
  <meta property="og:image" content="https://maintra.me/assets/home/og/${code}.jpg" />
  <meta name="twitter:card" content="summary_large_image" />
${code === 'en' ? pick : ''}<meta name="theme-color" content="#0B0B0A" />
<!-- chrome:head --><!-- /chrome:head -->
</head>
<body>
<!-- chrome:top --><!-- /chrome:top -->
<main id="main" class="doc">
  <header class="doc-head">
    <h1 class="h1">${esc(d.title)}</h1>
    <p class="lede">${esc(d.lede)}</p>
  </header>
  <div class="doc-grid">
    <!-- chrome:toc --><!-- /chrome:toc -->
    <article class="doc-body">
${d.releases.map((r) => release(r, d)).join('\n\n')}
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
  const file = code === 'en' ? 'updates.html' : `${code}/updates.html`;
  writeFileSync(join(SITE, file), page(code), 'utf8');
  console.log(file);
}
