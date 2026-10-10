/**
 * Generate /journey (uk) and /journey-en from the "Шлях Maintra 2.0" design.
 *
 * The page is designed as a claude.ai artifact, not written here, and the
 * owner keeps editing it there. So the artifact's index.html is committed
 * verbatim as tools/journey-source.html and its i/ folder as assets/journey/,
 * and this script turns that into two site pages:
 *
 *   - a real <head> (lang, canonical, hreflang, Open Graph) instead of the
 *     artifact's skeleton
 *   - fonts from tools/journey-fonts.css, self-hosted, because the site
 *     promises no external fonts (README) and the design loads Google Fonts
 *   - i/ paths rewritten to assets/journey/
 *   - a UA / EN switch
 *   - the English page made by replacing every Ukrainian string through EN
 *     below. The build FAILS if a string is no longer in the source (the
 *     design changed under it) or if any Cyrillic is left on the English
 *     page (the design gained text nobody translated). Both are the point:
 *     a silently half-translated page is the failure this guards against.
 *
 * Re-sync after the design changes:
 *
 *   1. Artifact read of index.html and every i/ file
 *   2. index.html  -> tools/journey-source.html
 *      i/*         -> assets/journey/
 *   3. node tools/genjourney.mjs .
 *
 * Do not hand-edit journey.html or journey-en.html: they are output.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const SITE = process.argv[2] ?? '.';
const ASSETS = 'assets/journey';
const read = (p) => readFileSync(join(SITE, p), 'utf8');
// Line endings normalised first: git checks this repo out as CRLF, the build
// writes LF, and raw bytes would make the URL depend on who touched it last
// (the lesson genpress.mjs already paid for).
const hash = (p) => createHash('sha256').update(read(p).replace(/\r\n/g, '\n')).digest('hex').slice(0, 8);

const source = read('tools/journey-source.html');
const fonts = read('tools/journey-fonts.css');

// hero3d.js loads its texture from a path relative to the PAGE, which was the
// artifact root. Resolve it next to the script instead so the page can live
// anywhere. Idempotent, and re-applied when a fresh copy comes from the design.
const heroPath = join(SITE, ASSETS, 'hero3d.js');
// The intro (the phone swinging in, the plates landing) is timed from init,
// which now happens under the loader; restart it, and the screen video, when
// the loader leaves, or the visitor arrives to an intro that already played.
const REVEAL = "addEventListener('journey:reveal', () => { start = performance.now(); try { vid.currentTime = 0; } catch (e) {} });";
const hero = readFileSync(heroPath, 'utf8');
let heroFixed = hero.replace(
  "loadAsync('i/hero-poster.webp')",
  "loadAsync(new URL('hero-poster.webp', import.meta.url).href)",
);
if (!heroFixed.includes(REVEAL)) {
  heroFixed = heroFixed.replace(
    'let visible = true, start = performance.now();',
    `let visible = true, start = performance.now();\n  ${REVEAL}`,
  );
}
if (!heroFixed.includes("new URL('hero-poster.webp', import.meta.url)")) {
  throw new Error('hero3d.js: the poster load moved, update the patch above');
}
if (!heroFixed.includes(REVEAL)) throw new Error('hero3d.js: the intro clock moved, update the reveal patch above');
if (heroFixed !== hero) writeFileSync(heroPath, heroFixed, 'utf8');

const toAssets = (s) => s.replace(/(["(])i\//g, `$1${ASSETS}/`);

const styles = [...source.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
const pageCss = toAssets(styles.find((s) => s.includes('--gold')) ?? '');
if (!pageCss) throw new Error('page CSS not found in the source');
if (/["(]i\//.test(pageCss)) throw new Error('an i/ path survived the rewrite in the CSS');
const start = source.indexOf('<div class="wall"');
const end = source.lastIndexOf('</body>');
if (start < 0 || end < 0) throw new Error('page body not found in the source');

const HERO_JS = `${ASSETS}/hero3d.js?v=${hash(`${ASSETS}/hero3d.js`)}`;
// The hero video is 1 MB and preload="auto" pulled it in parallel with the 3D
// code the loader waits for, on every connection. hero3d.js calls play() once
// the phone is up, which loads it then, after what the first screen needs.
const HERO_VIDEO_AUTO = 'id="heroVid" src="assets/journey/hero.mp4" poster="assets/journey/hero-poster.webp" muted loop playsinline preload="auto"';
// A poster is fetched at once even with preload="none", so the eight motion
// clips' posters (340 KB) and the hidden fallback's copy of the hero poster
// all raced the 3D code. They become data-poster, and LOADER_JS sets them:
// the clips' as they come near, the hero's only if the fallback is shown.
const POSTERS = 9;
const withSrc = toAssets(source.slice(start, end));
if ((withSrc.match(/ poster="/g) ?? []).length !== POSTERS) {
  throw new Error(`expected ${POSTERS} video posters, the design changed; recount and check LOADER_JS`);
}
const body = withSrc
  .replace(`src="${ASSETS}/hero3d.js"`, `src="${HERO_JS}"`)
  .replace(HERO_VIDEO_AUTO, HERO_VIDEO_AUTO.replace('preload="auto"', 'preload="none"'))
  .replaceAll(' poster="', ' data-poster="');
if (/["(]i\//.test(body)) throw new Error('an i/ path survived the rewrite');
if (!body.includes('id="heroVid"') || body.includes('preload="auto"')) {
  throw new Error('the hero video markup moved, update HERO_VIDEO_AUTO');
}

// What the loader waits for, requested from the head instead of whenever the
// parser reaches it: the 3D code (exact URLs, or the preload is wasted), the
// screen texture (crossorigin, because three.js loads it in cors mode and a
// mismatched preload is fetched twice), and the fonts of the first screen in
// this language: Tektur and Fira 400 for the words, Fira 500 for the plates
// hero3d.js draws (always Latin). Nothing below the fold: preloads are the
// highest priority there is, and every extra one delays the phone.
const preloads = (lang) => {
  const fontFiles = ['tektur-400-900', 'firasans-400']
    .flatMap((f) => (lang === 'uk' ? [`${f}-latin`, `${f}-cyrillic`] : [`${f}-latin`]))
    .concat('firasans-500-latin');
  return [
    `<link rel="modulepreload" href="${HERO_JS}">`,
    `<link rel="modulepreload" href="${ASSETS}/three.module.min.js">`,
    `<link rel="modulepreload" href="${ASSETS}/RoomEnvironment.js">`,
    `<link rel="preload" href="${ASSETS}/hero-poster.webp" as="image" crossorigin="anonymous" fetchpriority="high">`,
    ...fontFiles.map((f) => `<link rel="preload" href="${ASSETS}/fonts/${f}.woff2" as="font" type="font/woff2" crossorigin>`),
  ].join('\n');
};

// The design lays the page out as one centred column (720px, 1180px for the
// wide sections). The site runs it from the gutter like the homepage, and on
// a wide screen gives each section two columns: its heading and words on the
// left, sticky while its pictures go by on the right. Type grows with the
// screen. Phones keep the design's own single column.
const LAYOUT_CSS = `
/* layout (site only, see genjourney.mjs) */
:root{--gut:clamp(20px,3.6vw,140px)}
main{padding-inline:var(--gut)}
main .col,main .wide{max-width:none;margin-inline:0}
.lang{right:var(--gut)}
@media (min-width:1100px){
  body{font-size:clamp(17px,.22vw + 14px,22px)}
  h2{font-size:clamp(44px,3.2vw,104px)}
  h3{font-size:clamp(22px,.7vw + 14px,32px)}
  .eyebrow{font-size:clamp(13px,.2vw + 10px,17px)}
  .lede{font-size:clamp(19px,.5vw + 13px,28px)}
  .hero{min-height:min(100svh,1500px);grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:clamp(20px,4vw,140px)}
  .hero h1{font-size:clamp(52px,4.4vw,150px)}
  .hero-3d{height:min(84svh,1300px)}
  main>section{display:grid;grid-template-columns:minmax(300px,30%) minmax(0,1fr);column-gap:clamp(48px,5vw,180px);align-items:start;padding-block:clamp(72px,12vh,220px) 8px}
  /* the left column: the stripe and the heading share one area, so the
     first picture's row can't push the heading down */
  main>section.col>.hazard,main>section.col>.head{grid-column:1;grid-row:1/span 60;align-self:start;position:sticky;top:calc(var(--gut) + 6vh)}
  main>section.col>.head{margin-top:30px}
  main>section.col>:not(.hazard):not(.head){grid-column:2}
  main>section.wide>.col:first-child{grid-column:1;grid-row:1/span 60;align-self:start;position:sticky;top:calc(var(--gut) + 6vh)}
  main>section.wide>:not(.col:first-child){grid-column:2}
  main>section.wide>.col~.col{position:static}
  main>footer{padding-inline:0}
}
/* an ultrawide: the design's small print (13px plates) grows with it; the
   hero, with its 3D, keeps its own scale */
@media (min-width:2600px){main>section,main>footer{zoom:1.2}}
@media (min-width:3400px){main>section,main>footer{zoom:1.35}}
`;

const SWITCH_CSS = `
/* language switch (site only, not in the design) */
.lang{position:absolute;top:10px;right:max(10px,calc((100% - 1180px) / 2));z-index:3;display:flex;align-items:center;font-family:var(--display);font-stretch:78%;font-weight:700;font-size:14px;letter-spacing:.14em}
.lang a{display:inline-flex;align-items:center;min-height:44px;padding:0 10px;color:var(--muted);text-decoration:none}
.lang a:hover{color:var(--text)}
.lang a[aria-current]{color:var(--gold)}
.lang span{color:var(--dim)}

/* loader (site only): the mark's spring from the Logo artifact, R16-Motion,
   "Loading · 2.4 s a cycle", keyframes copied as drawn. Only with JS, so a
   visitor without it gets the page, not a cover that never lifts. */
.loader{display:none}
html.js .loader{position:fixed;inset:0;z-index:100;display:grid;place-items:center;background:var(--bg);transition:opacity .35s ease}
html.js .loader.out{opacity:0;pointer-events:none}
html.loading{overflow:hidden}
.loader svg{width:min(120px,30vw);height:auto;overflow:visible}
.loader .ld{animation:mtLoad 2400ms linear infinite both}
.loader .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@keyframes mtLoad{0%{transform:translateX(0px);animation-timing-function:cubic-bezier(.45,0,.55,1)}46%{transform:translateX(calc(var(--dx)*-0.26px));animation-timing-function:cubic-bezier(.6,0,.9,.4)}53%{transform:translateX(calc(var(--dx)*0.42px));animation-timing-function:cubic-bezier(.2,.7,.4,1)}62%{transform:translateX(calc(var(--dx)*-0.14px));animation-timing-function:ease-in-out}70%{transform:translateX(calc(var(--dx)*0.06px));animation-timing-function:ease-in-out}77%{transform:translateX(calc(var(--dx)*-0.02px))}83%,100%{transform:translateX(0px)}}
@media (prefers-reduced-motion:reduce){.loader .ld{animation:none}}
`;

// The R16 mark, loading variant, as the board draws it.
const LOADER_SVG = `<svg viewBox="0 0 100 100" aria-hidden="true">
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

// Lift the cover once the page can be shown as designed: the fonts in, and
// the 3D hero drawn (hero3d.js marks #hero3d .ready, or .nogl when it falls
// back to the video). Never mid-bounce: the snap and the two bounces (46-83%
// of the cycle) are the fast part, so a cover that fades then reads as a cut;
// ready inside them waits for the rest. Ready during the slow pull leaves at
// once, which is what a warm cache sees, so a return visit is not held for a
// whole cycle. Capped, so a slow or broken network still gets the page.
const LOADER_JS = `<script>
(function(){
  var root = document.documentElement, el = document.getElementById('loader');
  if (!el) return;
  var CYCLE = 2400, SNAP = 0.46 * CYCLE, REST = 0.83 * CYCLE, CAP = 8000, gone = false;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // The first screen's own words as the sample, so only the subsets this
  // page draws are fetched: an invented sample pulled every Cyrillic file
  // onto the English page, at the highest priority, ahead of the phone.
  var first = document.querySelector('.hero-txt');
  var sample = (first && first.textContent.replace(/\\s+/g, ' ')) || 'Aa';
  var faces = ['italic 800 40px Tektur', '400 17px "Fira Sans"'];
  var fonts = document.fonts ? Promise.all(faces.map(function (f) { return document.fonts.load(f, sample); })) : Promise.resolve();
  var w = document.getElementById('hero3d'), vid = document.getElementById('heroVid');
  var hero = new Promise(function (done) {
    if (!w) return done();
    var check = function () {
      if (w.classList.contains('nogl') && vid && !vid.poster && vid.dataset.poster) vid.poster = vid.dataset.poster;
      return w.classList.contains('ready') || w.classList.contains('nogl');
    };
    if (check()) return done();
    new MutationObserver(function (m, o) { if (check()) { o.disconnect(); done(); } }).observe(w, { attributes: true, attributeFilter: ['class'] });
  });
  function posters() {
    var vs = [].slice.call(document.querySelectorAll('.mv video[data-poster]'));
    var set = function (v) { if (!v.poster) v.poster = v.dataset.poster; };
    if (!('IntersectionObserver' in window)) return vs.forEach(set);
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { set(e.target); io.unobserve(e.target); } }); }, { rootMargin: '900px 0px' });
    vs.forEach(function (v) { io.observe(v); });
  }
  function leave() {
    if (gone) return; gone = true;
    root.classList.remove('loading');
    el.classList.add('out');
    dispatchEvent(new Event('journey:reveal'));
    posters();
    setTimeout(function () { el.remove(); }, 400);
  }
  function atRest() {
    if (reduce) return leave();
    var a = el.querySelector('.ld').getAnimations ? el.querySelector('.ld').getAnimations()[0] : null;
    var t = a && a.currentTime != null ? a.currentTime % CYCLE : 0;
    if (t >= SNAP && t < REST) setTimeout(leave, REST - t); else leave();
  }
  Promise.all([fonts, hero]).then(atRest, atRest);
  setTimeout(leave, CAP);
})();
</script>`;

const PAGES = {
  uk: {
    file: 'journey.html',
    url: 'https://maintra.me/journey',
    ogLocale: 'uk_UA',
    title: 'Шлях Maintra 2.0',
    description: 'Як Maintra прийшла від першої версії до 2.0: що не влаштовувало, звідки натхнення, які ідеї не вижили і з чого склалась нова мова дизайну.',
    switchLabel: 'Мова',
    loading: 'Завантаження',
  },
  en: {
    file: 'journey-en.html',
    url: 'https://maintra.me/journey-en',
    ogLocale: 'en_US',
    title: 'The road to Maintra 2.0',
    description: "How Maintra got from its first version to 2.0: what bothered me, where the inspiration came from, which ideas didn't survive, and what the new design language is made of.",
    switchLabel: 'Language',
    loading: 'Loading',
  },
};

function page(lang, content) {
  const p = PAGES[lang];
  const cur = (l) => (l === lang ? ' aria-current="page"' : '');
  const langSwitch =
    `<nav class="lang" aria-label="${p.switchLabel}">` +
    `<a href="/journey" lang="uk" hreflang="uk"${cur('uk')}>UA</a>` +
    `<span aria-hidden="true">/</span>` +
    `<a href="/journey-en" lang="en" hreflang="en"${cur('en')}>EN</a></nav>`;
  return `<!DOCTYPE html>
<!-- Generated by tools/genjourney.mjs from tools/journey-source.html. Edit those, not this file. -->
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<script>document.documentElement.classList.add('js','loading')</script>
<title>${p.title}</title>
<meta name="description" content="${p.description}">
<meta name="theme-color" content="#0B0B0A">
<link rel="canonical" href="${p.url}">
<link rel="alternate" hreflang="uk" href="${PAGES.uk.url}">
<link rel="alternate" hreflang="en" href="${PAGES.en.url}">
<link rel="alternate" hreflang="x-default" href="${PAGES.en.url}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Maintra">
<meta property="og:locale" content="${p.ogLocale}">
<meta property="og:title" content="${p.title}">
<meta property="og:description" content="${p.description}">
<meta property="og:url" content="${p.url}">
<meta property="og:image" content="https://maintra.me/assets/press/maintra-feature-1024x500.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
${preloads(lang)}
<style>
${fonts}</style>
<style>${pageCss}${SWITCH_CSS}${LAYOUT_CSS}</style>
</head>
<body>
<div class="loader" id="loader" role="status">${LOADER_SVG}<span class="sr">${p.loading}</span></div>
${content.replace('<main>', `<main>\n${langSwitch}`)}${LOADER_JS}
</body>
</html>
`;
}

// [Ukrainian as it appears in the source, English]. Applied longest first, so
// a short string never eats part of a longer one; short words carry their
// markup so they match only where they are meant to.
const EN = [
  // hero
  ['Maintra 2.0 на телефоні: гараж, меню плюса, свайп між авто і полароїд, що стає шапкою', 'Maintra 2.0 on a phone: the garage, the plus menu, swiping between cars, and the polaroid turning into the header'],
  ['Переосмислити все.', 'Rethink everything.'],
  ['Зберегти коріння.', 'Keep the roots.'],
  ['Як Maintra прийшла від першої версії до 2.0. Що мене не влаштовувало, де я брав натхнення, які ідеї не вижили і з чого склалась нова мова дизайну.', "How Maintra got from its first version to 2.0. What bothered me, where I looked for inspiration, which ideas didn't survive, and what the new design language is made of."],

  // 01
  ['<b>01</b> Початок', '<b>01</b> The start'],
  ['Три Maintra<br><span class="g">до 2.0</span>', 'Three Maintras<br><span class="g">before 2.0</span>'],
  ["Maintra з'явилась, бо я постійно забував, яку оливу, скільки і коли заливав у свою VW Jetta. Ексельки, паперові чеки, чати з GPT теж постійно губились. Далі застосунок ріс разом із фічами, і кожна нова фіча діставала собі місце на екрані.", "Maintra exists because I kept forgetting which oil I'd put in my VW Jetta, how much, and when. Spreadsheets, paper receipts and GPT chats kept getting lost too. Then the app grew feature by feature, and every new feature claimed its own spot on the screen."],
  ['Перша версія</span>', 'First version</span>'],
  ['Перша версія Maintra: гараж з однією карткою авто', "Maintra's first version: a garage with one car card"],
  ['<b>Гараж</b>Картка авто, кнопка «додати» і золота шестерня з мандалою в навбарі.', '<b>Garage</b>A car card, an “add” button and a gold gear with a mandala in the nav bar.'],
  ['Перша версія Maintra: екран авто зі списком сервісів', "Maintra's first version: the car screen with a list of services"],
  ['<b>Авто</b>Список робіт, вкладки, ціни. Чисто, але дефолтно і без власного стилю.', '<b>Car</b>A list of jobs, tabs, prices. Clean, but stock, with no style of its own.'],
  ['Maintra 1.5: гараж з двома авто, документами і шинами', 'Maintra 1.5: a garage with two cars, documents and tyres'],
  ['<b>Гараж</b>Два авто, план, документи, шини. Все потрібне, але все однакової ваги.', '<b>Garage</b>Two cars, a plan, documents, tyres. All of it needed, all of it the same weight.'],
  ['Maintra 1.5: екран авто з вішлистом і олива-фільтрами', 'Maintra 1.5: the car screen with a wishlist and oil and filters'],
  ['<b>Авто</b>Вішлист, полиця, інтервали. Кнопок більше, ніж відповідей.', '<b>Car</b>Wishlist, shelf, intervals. More buttons than answers.'],
  ['1.6, перед редизайном', '1.6, before the redesign'],
  ['Maintra 1.6: гараж з полароїдом і лічильником пробігу', 'Maintra 1.6: a garage with a polaroid and an odometer'],
  ["<b>Гараж</b>З'явився полароїд. І ще здоров'я, сервіс, вішлист, витрати, наступні роботи.", '<b>Garage</b>The polaroid arrived. So did health, service, wishlist, costs and upcoming jobs.'],
  ['Maintra 1.6: екран авто', 'Maintra 1.6: the car screen'],
  ['<b>Авто</b>Історія робіт уже головна, але тоне серед плашок.', '<b>Car</b>Service history is already the main thing, but it drowns among the cards.'],
  ['Maintra 1.6: план обслуговування', 'Maintra 1.6: the maintenance plan'],
  ['<b>План</b>AI-план робить свою справу, а виглядає як усе інше. Плюс згенеровані AI іконки, які помічає кожен і каже «слоп, фу».', '<b>Plan</b>The AI plan does its job, but looks like everything else. Plus AI-generated icons that everyone spots and calls “slop, ew”.'],
  ['Користувачі писали прямо: перевантажено, і виглядає як AI slop. Це і стало стартом.', 'Users said it straight: too busy, and it looks like AI slop. That was the starting point.'],

  // 02
  ['<b>02</b> Що мало лишитись', '<b>02</b> What had to stay'],
  ['Шість правил<br><span class="g">до першого наброску</span>', 'Six rules<br><span class="g">before the first sketch</span>'],
  ['Історія авто в центрі', "The car's history at the centre"],
  ['Таймлайн обслуговування і є застосунок. Нові фічі не мають виштовхувати його з екрана.', 'The service timeline is the app. New features must not push it off the screen.'],
  ['Гараж, а не блокнот', 'A garage, not a notebook'],
  ['Фото авто висить на стіні, жовтий малярний скотч, наліпки на коробках із запчастинами.', "The car's photo hangs on the wall, yellow masking tape, stickers on boxes of parts."],
  ['<h3>Полароїд лишається</h3>', '<h3>The polaroid stays</h3>'],
  ['Перші 1000+ користувачів отримали свою рамку. Її не можна було просто викинути.', "The first 1000+ users got their own frame. It couldn't just be thrown away."],
  ['Відповіді, не кнопки', 'Answers, not buttons'],
  ['Краще щільний екран з цифрами, ніж екран з кнопками і картинками.', 'A dense screen of numbers beats a screen of buttons and pictures.'],
  ['Нічого не викидати', 'Throw nothing away'],
  ['Усі наявні фічі лишаються. Те, що потрібно часто, на відстані одного тапу.', 'Every existing feature stays. What you need often is one tap away.'],
  ['Екран під себе', 'Your screen, your way'],
  ['Користувач сам вирішує, що буде на екранах: які блоки під полароїдом, що в куті, яка рамка.', "You decide what goes on your screens: which blocks sit under the polaroid, what's in the corner, which frame."],

  // 03
  ['<b>03</b> Звідки натхнення', '<b>03</b> Where the inspiration came from'],
  ['Ігри, студії<br><span class="g">і справжній бокс</span>', 'Games, studios<br><span class="g">and a real garage</span>'],
  ['Я збирав мудборди, дивився на ігри й інтерфейси, які люблю. Брав відчуття жанру, а не конкретну гру. Нижче перші наброски і проби пера, які з цього вийшли. Сирі, як є, без поліровки.', 'I collected moodboards and looked at games and interfaces I love. I took the feel of a genre, not any one game. Below are the first sketches and trial runs that came out of it. Raw, as they were, no polish.'],
  ['Рейсінг-ігри', 'Racing games'],
  ['Гараж як колекція: кожне авто має свою сторінку, клас і стан.', 'The garage as a collection: every car has its own page, class and condition.'],
  ['Стан по вузлах: двигун, гальма, шини, рідини, кузов.', 'Condition by system: engine, brakes, tyres, fluids, body.'],
  ['Спокійні меню, де кожна дія приємна, як звук механіки.', 'Calm menus where every action feels as good as a mechanical click.'],
  ['Набросок: авто як колекційна картка з класом і станом по вузлах', 'Sketch: the car as a collectible card with class and condition by system'],
  ['Набросок v4: гараж як у гоночній грі', 'Sketch v4: a garage like in a racing game'],
  ['Набросок v5: рейтинг серед власників Pajero', 'Sketch v5: a ranking among Pajero owners'],
  ['Індустріальний UI', 'Industrial UI'],
  ['Вузький шрифт для назв і цифр, як на табличках та маркуванні.', 'A narrow typeface for names and numbers, like on signs and labels.'],
  ['Зрізані кути замість заокруглень.', 'Cut corners instead of rounded ones.'],
  ['Темний фон і один яскравий колір, який означає «натисни тут».', 'A dark background and one bright colour that means “press here”.'],
  ['Набросок v12: чорне, золото, шестикутники', 'Sketch v12: black, gold, hexagons'],
  ['Набросок v19: вішлист, документи і шини як меню гри', 'Sketch v19: wishlist, documents and tyres as a game menu'],
  ['Нативне відчуття', 'A native feel'],
  ['Матове скло для панелей, які пливуть над контентом.', 'Frosted glass for panels that float over the content.'],
  ['Один-два шрифти, чітка ієрархія, великі цілі для пальця.', 'One or two typefaces, a clear hierarchy, big tap targets.'],
  ['Темна і світла тема з першого дня.', 'Dark and light themes from day one.'],
  ['Набросок v2: преміальний гараж', 'Sketch v2: a premium garage'],
  ['Набросок v24: скляний трей над навбаром', 'Sketch v24: a glass tray above the nav bar'],
  ['Свій бокс · Pajero 2008', 'My own garage · Pajero 2008'],
  ['<h3>Справжній гараж</h3>', '<h3>A real garage</h3>'],
  ['Шпалери з дрібних інструментів були в застосунку й раніше. Лишили, бо це вже впізнаваний фон Maintra.', "The wallpaper of small tools was already in the app. It stayed, because it's become Maintra's recognisable background."],
  ['Полароїд теж був. Тепер на ньому тільки фото, пробіг і найближча робота. Рамку можна обрати: класична, вугільна, дудл для перших 1000 користувачів, плюс рамки, які вже є в застосунку. Колекція далі поповнюватиметься.', 'The polaroid was there too. Now it holds only the photo, the mileage and the next job. You can pick the frame: classic, charcoal, the doodle for the first 1000 users, plus the frames already in the app. More will keep coming.'],
  ['Іконки з одного аркуша для всього застосунку: прямі лінії, восьмикутники, зрізані кути.', 'Icons from a single sheet for the whole app: straight lines, octagons, cut corners.'],
  ['3D-модель кожної автівки майже нереальна: тисячі моделей, років, комплектацій і тюнінгу. Тому в центрі реальне фото саме твого авто.', 'A 3D model of every car is close to impossible: thousands of models, years, trims and tuning jobs. So the centre of it all is a real photo of your own car.'],
  ['alt="Шпалери з дрібних інструментів"', 'alt="Wallpaper of small tools"'],
  ['Фон · був і лишився', 'Background · was there, stayed'],
  ['Полароїд у попередній версії', 'The polaroid in the previous version'],
  ['Полароїд · було', 'Polaroid · before'],
  ['Полароїд у 2.0', 'The polaroid in 2.0'],
  ['Полароїд · стало', 'Polaroid · after'],
  ['Рамки полароїда: класична, вугільна, дудл', 'Polaroid frames: classic, charcoal, doodle'],
  ['<figcaption>Рамки</figcaption>', '<figcaption>Frames</figcaption>'],
  ['Іконки речей і категорій', 'Icons for items and categories'],
  ['Іконки · один аркуш', 'Icons · one sheet'],
  ['Рамка: метал з заклепками', 'Frame: riveted metal'],
  ['Рамка: топографічна карта', 'Frame: topographic map'],
  ['Рамка: перламутр', 'Frame: mother of pearl'],
  ['Рамка: білий карбон', 'Frame: white carbon'],

  // 04
  ['<b>04</b> Наброски', '<b>04</b> Sketches'],
  ['Один екран,<br><span class="g">29 спроб</span>', 'One screen,<br><span class="g">29 attempts</span>'],
  ['Головний екран гаража я переробляв найчастіше. Ось частина шляху, від першого підходу до майже фіналу. Гортайте вбік.', 'The garage screen is the one I redid most. Here is part of the road, from the first attempt to almost final. Scroll sideways.'],
  ['<span>Початок</span><i></i><span>Фінал</span>', '<span>Start</span><i></i><span>Final</span>'],
  ['Ітерації головного екрана', 'Iterations of the main screen'],
  ['alt="Перший підхід"', 'alt="First attempt"'],
  ['<span class="v">Старт</span><span class="t">Цех</span>', '<span class="v">Start</span><span class="t">Workshop</span>'],
  ['Прибрати зайве, лишити суть.', 'Cut the clutter, keep the core.'],
  ['<span class="t">Преміальний гараж</span>', '<span class="t">Premium garage</span>'],
  ['Скло, Apple, спокій.', 'Glass, Apple, calm.'],
  ['<span class="t">Справжній бокс</span>', '<span class="t">A real garage bay</span>'],
  ['Лампа над авто, табличка на воротах.', 'A lamp over the car, a sign on the door.'],
  ['<span class="t">Гараж як у грі</span>', '<span class="t">A garage from a game</span>'],
  ['Шоурум, клас B, стан по вузлах.', 'Showroom, class B, condition by system.'],
  ['<span class="t">Піт-стоп</span>', '<span class="t">Pit stop</span>'],
  ['Схема авто з балами по системах.', 'A car diagram with a score for each system.'],
  ['<span class="t">Енергія гри</span>', '<span class="t">Game energy</span>'],
  ['Той самий настрій на весь застосунок.', 'The same mood across the whole app.'],
  ['<span class="t">Авто як картка</span>', '<span class="t">The car as a card</span>'],
  ['Колекційна картка зі спеками і класом.', 'A collectible card with specs and class.'],
  ['<span class="t">Полароїд повертається</span>', '<span class="t">The polaroid returns</span>'],
  ['Гра поверх, але фото знову на стіні.', 'Game on top, but the photo is back on the wall.'],
  ['<span class="t">Чорне і золото</span>', '<span class="t">Black and gold</span>'],
  ['Шестикутники, гоночний HUD.', 'Hexagons, a racing HUD.'],
  ['<span class="t">Забрати все зайве</span>', '<span class="t">Strip it all back</span>'],
  ['Матовий чорний, жовтий тільки для акценту.', 'Matte black, yellow only as an accent.'],
  ['<span class="t">Меню як у грі</span>', '<span class="t">A game-style menu</span>'],
  ['<span class="n">Вішлист, документи, шини, полиця.</span>', '<span class="n">Wishlist, documents, tyres, shelf.</span>'],
  ['<span class="t">Один зріз для всього</span>', '<span class="t">One cut for everything</span>'],
  ['Скляний трей, контраст повернувся.', 'A glass tray, and the contrast is back.'],
  ['<span class="t">Одна мова</span>', '<span class="t">One language</span>'],
  ['Ті самі правила на кожному екрані.', 'The same rules on every screen.'],
  ['<span class="t">Майже фінал</span>', '<span class="t">Almost final</span>'],
  ['Ледь нахилений полароїд, рамки, тихий вішлист.', 'A slightly tilted polaroid, frames, a quiet wishlist.'],
  ['Що не вижило: рейтинг серед інших власників, картки-колекції, шестикутники і великий HUD. Що лишилось від ігор: клас і стан авто, меню-смуга, жовтий як головна дія.', "What didn't survive: rankings against other owners, collectible cards, hexagons and the big HUD. What stayed from games: the car's class and condition, the menu strip, yellow as the main action."],

  // 05
  ['<b>05</b> Мова дизайну', '<b>05</b> Design language'],
  ['Зріз, восьмикутник<br><span class="g">і жовтий для дії</span>', 'A cut, an octagon<br><span class="g">and yellow for action</span>'],
  ['Спочатку я взяв Barlow, той самий, що в ARC Raiders. Потім перейшов на Tektur: його зрізані кути збігаються з картками, кнопками й іконками. Для тексту Fira Sans. Статуси замість кружечків стали восьмикутниками. Жовтий лише там, де треба натиснути або глянути першим.', 'I started with Barlow, the same typeface ARC Raiders uses. Then I moved to Tektur: its cut corners match the cards, buttons and icons. Fira Sans for text. Status dots became octagons instead of circles. Yellow only where you need to tap or look first.'],
  ['<span class="num">ШРИФТ</span>', '<span class="num">TYPE</span>'],
  ['Tektur для назв і цифр, Fira Sans для всього, що читаєш.', 'Tektur for names and numbers, Fira Sans for everything you read.'],
  ['<span class="num">КНОПКИ</span>', '<span class="num">BUTTONS</span>'],
  ['<span class="btn">Зберегти</span>', '<span class="btn">Save</span>'],
  ['<span>Пізніше</span>', '<span>Later</span>'],
  ['Той самий скіс на кнопках, чипах і вкладках, той самий зріз на кутах карток.', 'The same slant on buttons, chips and tabs, the same cut on card corners.'],
  ['<span class="num">СТАТУСИ</span>', '<span class="num">STATUSES</span>'],
  ['Патрубок охолодження', 'Coolant hose'],
  ['>5 днів<', '>5 days<'],
  ['Повітряний фільтр', 'Air filter'],
  ['>900 км<', '>900 km<'],
  ['Олива + фільтри', 'Oil + filters'],
  ['>4 023 км<', '>4 023 km<'],
  ["<span class=\"num\">ЗДОРОВ'Я 71</span>", '<span class="num">HEALTH 71</span>'],
  ["Здоров'я 71 зі 100", 'Health 71 out of 100'],
  ['Скошені сегменти, як шкала на приладці.', 'Slanted segments, like a gauge on the dashboard.'],
  ['Фон #0B0B0A', 'Background #0B0B0A'],
  ['Плашка #151513', 'Card #151513'],
  ['Текст #ECE4D6', 'Text #ECE4D6'],
  ['Другорядне #8F897E', 'Secondary #8F897E'],
  ['Дія #F4B223', 'Action #F4B223'],

  // 06
  ['<b>06</b> Рух', '<b>06</b> Motion'],
  ['Спокійно,<br><span class="g">поки не час</span>', "Calm,<br><span class=\"g\">until it's time</span>"],
  ['Анімація тут частина мови, а не прикраса. Вона показує, звідки взялась річ і куди пішла: полароїд стає шапкою, плашки їдуть з-під пальця, штамп ставиться, коли роботу закрито. Усе коротше за 320 мс, крім Моменту.', 'Animation here is part of the language, not decoration. It shows where a thing came from and where it went: the polaroid becomes the header, cards slide out from under your finger, a stamp lands when a job is done. Everything is under 320 ms, except the Moment.'],
  ['Спокійно за замовчуванням', 'Calm by default'],
  ['До 320 мс. Приходить швидко, йде ще швидше.', 'Up to 320 ms. Arrives fast, leaves faster.'],
  ['Ближче до пальця першим', 'Nearest the finger first'],
  ['Меню розкривається знизу вгору, з кроком 40 мс.', 'Menus open from the bottom up, 40 ms apart.'],
  ['З-за краю, не з повітря', 'From the edge, not thin air'],
  ['Плашки виїжджають справа і ніколи не проявляються на місці.', 'Cards slide in from the right and never just fade in on the spot.'],
  ['Гучно тільки в Моменті', 'Loud only in the Moment'],
  ['Відскок, масштаб і вібрація лише тоді, коли закрив роботу.', 'Bounce, scale and haptics only when you finish a job.'],
  ['aria-label="+ меню"', 'aria-label="+ menu"'],
  ['<b>+ меню</b>Плашки виїжджають з-за правого краю, ближня до пальця перша. Плюс повертається в хрестик.', '<b>+ menu</b>Cards slide in from the right edge, the one nearest your finger first. The plus turns into a cross.'],
  ['aria-label="Свайп по гаражу"', 'aria-label="Swiping the garage"'],
  ['<b>Свайп по гаражу</b>Полароїд іде за пальцем і сідає на місце пружиною. Наприкінці місце для ще однієї машини.', '<b>Swiping the garage</b>The polaroid follows your finger and springs into place. At the end, room for one more car.'],
  ['aria-label="Полароїд у шапку"', 'aria-label="Polaroid to header"'],
  ['<b>Полароїд у шапку</b>Фото з гаража стає шапкою екрана авто, а не відкривається з нуля.', "<b>Polaroid to header</b>The photo from the garage becomes the car screen's header instead of opening from scratch."],
  ['aria-label="З гаража в авто"', 'aria-label="Garage to car"'],
  ['<b>З гаража в авто</b>Екран авто заїжджає збоку і так само повертається, гараж лишається під ним.', '<b>Garage to car</b>The car screen slides in from the side and back out the same way, with the garage staying underneath.'],
  ['aria-label="Момент"', 'aria-label="The Moment"'],
  ["<b>Момент</b>Роботу закрито: штамп SERVICED, потім +8 до здоров'я. Єдине місце, де анімація гучна.", '<b>The Moment</b>A job is done: the SERVICED stamp, then +8 health. The only place where animation gets loud.'],
  ['aria-label="AI пише план"', 'aria-label="AI writes the plan"'],
  ['<b>AI пише план</b>Видно, що саме зараз робиться і скільки ще чекати.', "<b>AI writes the plan</b>You can see what's happening right now and how long is left."],
  ['aria-label="Витрату збережено"', 'aria-label="Expense saved"'],
  ['<b>Витрату збережено</b>Лист закривається, запис лягає в список, де його й шукатимеш.', "<b>Expense saved</b>The sheet closes and the entry drops into the list, right where you'll look for it."],
  ['aria-label="Вкладки авто"', 'aria-label="Car tabs"'],
  ['<b>Вкладки авто</b>Сервіси, план, пальне, гроші. Шапка лишається, міняється тільки зміст.', '<b>Car tabs</b>Services, plan, fuel, money. The header stays, only the content changes.'],
  ['З увімкненим «Зменшити рух» у системі все те саме, але без руху: прості проявлення або миттєва зміна.', 'With “Reduce motion” turned on in the system, everything is the same but without movement: simple fades or an instant change.'],

  // 07
  ['<b>07</b> Логотип', '<b>07</b> Logo'],
  ['Від мандали<br><span class="g">до штриха</span>', 'From mandala<br><span class="g">to stroke</span>'],
  ['Назва складена з maintenance і tracker, а звучить як «мантра». Звідси стара шестерня з мандалою всередині. У нову мову вона не лягала: круглий, детальний знак серед зрізаних форм. Перебрав усе: шестерні, одометри, значки з ігор, гаражні ритуали. На це пішла не одна безсонна ніч, а коли я все ж спав, мені снилися логотипи.', "The name is made of maintenance and tracker, and it sounds like “mantra”. Hence the old gear with a mandala inside. It didn't fit the new language: a round, detailed mark among cut shapes. I tried everything: gears, odometers, game badges, garage rituals. It cost more than one sleepless night, and when I did sleep, I dreamed of logos."],
  ['Старий логотип: шестерня з мандалою', 'The old logo: a gear with a mandala'],
  ['<b>Було.</b> Шестерня і мандала.', '<b>Before.</b> A gear and a mandala.'],
  ['Ескізи нового логотипа в блокноті', 'Sketches of the new logo in a notebook'],
  ['<b>Блокнот.</b> Пошук ритму з трьох похилих штрихів.', '<b>Notebook.</b> Looking for a rhythm in three slanted strokes.'],
  ['Новий знак Maintra', 'The new Maintra mark'],
  ['<b>Стало.</b> M і t з трьох скошених штрихів.', '<b>After.</b> M and t from three slanted strokes.'],
  ['Дві літери', 'Two letters'],
  ['M і t одразу: maintenance tracker в одному знаку.', 'M and t at once: maintenance tracker in one mark.'],
  ['<span class="k">Пружина</span>', '<span class="k">A spring</span>'],
  ['Похилі штрихи читаються як пружина амортизатора. Це про машину, а не про абстракцію.', "The slanted strokes read as a shock absorber's spring. It's about the car, not an abstraction."],
  ['Простір для руху', 'Room to move'],
  ['Штрихи можуть стискатись і відбивати, як підвіска на ямі. Готова анімація для запуску, синхронізації й завантаження.', 'The strokes can compress and rebound like suspension over a pothole. A ready-made animation for launch, sync and loading.'],
  ['<span class="k">Мова 2.0</span>', '<span class="k">The 2.0 language</span>'],
  ['Ті самі скошені лінії й зрізи, що в кнопках, картках, іконках і шрифті Tektur.', 'The same slanted lines and cuts as the buttons, cards, icons and the Tektur typeface.'],

  // 08
  ['<b>08</b> До і після', '<b>08</b> Before and after'],
  ['<h2>1.6 проти 2.0</h2>', '<h2>1.6 vs 2.0</h2>'],
  ['Ті самі дані, той самий Pajero. Різниця в тому, що екран тепер відповідає на питання, а не перелічує все.', 'Same data, same Pajero. The difference is that the screen now answers a question instead of listing everything.'],
  ['Гараж у версії 1.6', 'The garage in 1.6'],
  ['1.6 · Гараж', '1.6 · Garage'],
  ['Гараж у версії 2.0', 'The garage in 2.0'],
  ['2.0 · Гараж', '2.0 · Garage'],
  ['Полароїд більший, під ним одна цифра: скільки до заміни оливи. Далі тільки найтерміновіше. Вішлист, документи, шини і полиця переїхали в смугу внизу.', "The polaroid is bigger, with one number under it: how long until the oil change. Then only what's most urgent. Wishlist, documents, tyres and the shelf moved to a strip at the bottom."],
  ['Екран авто у версії 1.6', 'The car screen in 1.6'],
  ['1.6 · Авто', '1.6 · Car'],
  ['Екран авто у версії 2.0', 'The car screen in 2.0'],
  ['2.0 · Авто', '2.0 · Car'],
  ['Роботи згруповані по візитах на СТО, з сумою за візит. Зроблене і куплене на полицю розділені.', 'Jobs are grouped by visit to the shop, with a total for each visit. Work done and parts bought for the shelf are kept apart.'],
  ['План у версії 1.6', 'The plan in 1.6'],
  ['1.6 · План', '1.6 · Plan'],
  ['План у версії 2.0', 'The plan in 2.0'],
  ['2.0 · План', '2.0 · Plan'],
  ['Прострочене, скоро і пізніше. Кожен рядок каже, коли і чому. Менше іконок і тексту, стриманіші кольори, більше повітря.', 'Overdue, soon and later. Every row says when and why. Fewer icons and less text, calmer colours, more room to breathe.'],

  // 09
  ['<b>09</b> Куди дійшли', '<b>09</b> Where we got to'],
  ['Темна і світла теми, класичний вигляд гаража, телефон і планшет, офлайн-мапа зі статистикою поїздок, сейф для документів, шини. Скріншоти для сторів уже готові дванадцятьма мовами.', 'Dark and light themes, a classic garage view, phone and tablet, an offline map with trip stats, a vault for documents, tyres. The store screenshots are already done in twelve languages.'],
  ['Скріншот стору: Service book on autopilot', 'Store screenshot: Service book on autopilot'],
  ['Скріншот стору: 50+ інструментів', 'Store screenshot: 50+ tools'],
  ['Скріншот стору: офлайн-навігація', 'Store screenshot: offline navigation'],
  ['Скріншот стору: налаштування гаража', 'Store screenshot: garage settings'],
  ['Скріншот стору для iPad', 'Store screenshot for iPad'],
  ['alt="Підсумок поїздки"', 'alt="Trip summary"'],
  ['<b>Після поїздки</b>Швидкість, час, найшвидша ділянка. Трек не покидає телефон.', '<b>After a drive</b>Speed, time, the fastest stretch. The track never leaves your phone.'],
  ['alt="Шини"', 'alt="Tyres"'],
  ['<b>Шини</b>Протектор по кожному колесу, вік, ротація.', '<b>Tyres</b>Tread on every wheel, age, rotation.'],
  ['alt="Документи"', 'alt="Documents"'],
  ['<b>Документи</b>Шифруються на телефоні ще до завантаження.', "<b>Documents</b>Encrypted on your phone before they're uploaded."],

  // 10
  ['<b>10</b> Під себе', '<b>10</b> Make it yours'],
  ['Темна, світла<br><span class="g">або як у телефоні</span>', 'Dark, light<br><span class="g">or like your phone</span>'],
  ['Тему обираєш у профілі: темна, світла або за системою. Правила ті самі, змінюється тільки світло. Гараж теж можна перемкнути: полароїд з фото або класичний список карток. А далі власні теми, нижче.', 'You pick the theme in your profile: dark, light or system. The rules stay the same, only the light changes. The garage can switch too: a polaroid with a photo, or a classic list of cards. Then come our own themes, below.'],
  ['Гараж, темна тема', 'Garage, dark theme'],
  ['Гараж, світла тема', 'Garage, light theme'],
  ['<span class="tl">Гараж</span>', '<span class="tl">Garage</span>'],
  ['План, темна тема', 'Plan, dark theme'],
  ['План, світла тема', 'Plan, light theme'],
  ['<span class="tl">План</span>', '<span class="tl">Plan</span>'],
  ['Витрати, темна тема', 'Costs, dark theme'],
  ['Витрати, світла тема', 'Costs, light theme'],
  ['<span class="tl">Витрати</span>', '<span class="tl">Costs</span>'],
  ['Класичний гараж, темна тема', 'Classic garage, dark theme'],
  ['Класичний гараж, світла тема', 'Classic garage, light theme'],
  ['<span class="tl">Класичний гараж</span>', '<span class="tl">Classic garage</span>'],
  ['Теми на вибір', 'Themes to choose from'],
  ['Три безкоштовні і чотири в Pro. Тема змінює тільки фон і акцент. Текст, іконки і статуси лишаються: червоне прострочене, бурштинове скоро, зелене все гаразд. Будь-яку можна приміряти на хвилину, а Red light може вмикатись сам після заходу сонця.', 'Three free and four in Pro. A theme changes only the background and the accent. Text, icons and statuses stay put: red is overdue, amber is soon, green is all good. You can try any of them on for a minute, and Red light can switch itself on after sunset.'],
  ['Екран вибору теми', 'Theme picker screen'],
  ['<b>Вибір теми</b>Профіль → Вигляд', '<b>Theme picker</b>Profile → Appearance'],
  ['Тема Garage', 'Garage theme'],
  ['Темна, знайома', 'Dark, familiar'],
  ['Тема Workshop', 'Workshop theme'],
  ['Світла, на день', 'Light, for daytime'],
  ['Тема Red light', 'Red light theme'],
  ['Червоний акцент на ніч', 'A red accent for night'],
  ['Тема Field', 'Field theme'],
  ['Олива і тан, камуфляж на +', 'Olive and tan, camo on the +'],
  ['Тема Blueprint', 'Blueprint theme'],
  ['Креслення, блакитні лінії', 'Technical drawing, blue lines'],
  ['Тема Logbook', 'Logbook theme'],
  ['Стара сервісна книжка, синє чорнило', 'An old service book, blue ink'],
  ['Тема Rose, ніч', 'Rose theme, night'],
  ['Сливова вночі', 'Plum at night'],
  ['Тема Rose, день', 'Rose theme, day'],
  ['Рожева вдень', 'Pink by day'],

  // footer
  ['Смарт-трекер обслуговування для твого гаража.', 'A smart maintenance tracker for your garage.'],
];

function translate(html) {
  let out = html;
  const missing = [];
  for (const [uk, en] of [...EN].sort((a, b) => b[0].length - a[0].length)) {
    if (!out.includes(uk)) { missing.push(uk); continue; }
    out = out.split(uk).join(en);
  }
  if (missing.length) {
    throw new Error(`not in the source any more (the design changed?):\n  ${missing.join('\n  ')}`);
  }
  const left = [...new Set(out.match(/[^<>"]*[Ѐ-ӿ][^<>"]*/g) ?? [])];
  if (left.length) throw new Error(`untranslated on the English page:\n  ${left.join('\n  ')}`);
  return out;
}

const dashes = /[–—]/;
for (const [, en] of EN) if (dashes.test(en)) throw new Error(`long dash in English copy: ${en}`);

writeFileSync(join(SITE, PAGES.uk.file), page('uk', body), 'utf8');
writeFileSync(join(SITE, PAGES.en.file), page('en', translate(body)), 'utf8');
console.log(`wrote ${PAGES.uk.file} and ${PAGES.en.file}`);
