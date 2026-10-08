// The site's other pages: the same header as the homepage (glass once the
// page scrolls, the theme switch, the menu where the links don't fit) and the
// section index that marks where you are. The homepage does the same in
// home.js; nothing here depends on the 3D.

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ------------------------------------------------------------ header
const top = $('.top');
const onScroll = () => top && top.classList.toggle('solid', scrollY > 8);
addEventListener('scroll', onScroll, { passive: true });
onScroll();

// ------------------------------------------------------------- theme
// The head script set it before the first paint; this keeps the switch and
// the browser's bar colour in step, and remembers a choice.
const themeBtn = $('.theme-btn');
const themeMeta = $('meta[name="theme-color"]');
let chosen = false;
try {
  chosen = !!localStorage.getItem('maintra.theme');
} catch (e) {}
const apply = (t) => {
  root.dataset.theme = t;
  if (themeMeta) themeMeta.setAttribute('content', t === 'light' ? '#EEEAE2' : '#0B0B0A');
  if (themeBtn) themeBtn.setAttribute('aria-label', t === 'light' ? themeBtn.dataset.toDark : themeBtn.dataset.toLight);
};
const switchTo = (t) => (document.startViewTransition && !reduce ? document.startViewTransition(() => apply(t)) : apply(t));
apply(root.dataset.theme === 'light' ? 'light' : 'dark');
themeBtn?.addEventListener('click', () => {
  const t = root.dataset.theme === 'light' ? 'dark' : 'light';
  chosen = true;
  try {
    localStorage.setItem('maintra.theme', t);
  } catch (e) {}
  switchTo(t);
});
matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
  if (!chosen) switchTo(e.matches ? 'light' : 'dark');
});

// ---------------------------------------------------- language menu
// this page in the other languages; a choice is remembered, so the next
// visit to the homepage opens in it too
const langBtn = $('.lang-btn');
const langMenu = $('#lang-menu');
function langs(open) {
  if (!langMenu) return;
  langMenu.hidden = !open;
  langBtn.setAttribute('aria-expanded', String(open));
  if (open) (langMenu.querySelector('[aria-current]') || langMenu.querySelector('a')).focus();
}
langBtn?.addEventListener('click', () => {
  if (langMenu.hidden) menu(false);
  langs(langMenu.hidden);
});
document.addEventListener('click', (e) => {
  if (langMenu && !langMenu.hidden && !e.target.closest('.lang')) langs(false);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && langMenu && !langMenu.hidden) {
    langs(false);
    langBtn.focus();
  }
});
for (const a of $$('[data-lang]')) {
  a.addEventListener('click', () => {
    try {
      localStorage.setItem('maintra.lang', a.dataset.lang);
    } catch (e) {}
  });
}

// -------------------------------------------------------------- menu
const btn = $('.menu-btn');
const sheet = $('#menu');
let openedAt = 0;
function menu(open, focusBtn) {
  if (!sheet || open === !sheet.hidden) return;
  sheet.hidden = !open;
  btn.setAttribute('aria-expanded', String(open));
  top.classList.toggle('open', open);
  sheet.classList.toggle('in', open);
  if (open) {
    openedAt = scrollY;
    sheet.querySelector('a').focus({ preventScroll: true });
  } else if (focusBtn) btn.focus();
}
btn?.addEventListener('click', () => menu(sheet.hidden));
sheet?.addEventListener('click', (e) => {
  if (e.target.closest('a')) menu(false);
});
document.addEventListener('click', (e) => {
  if (sheet && !sheet.hidden && !e.target.closest('.menu, .menu-btn')) menu(false);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && sheet && !sheet.hidden) menu(false, true);
});
addEventListener('scroll', () => {
  if (sheet && !sheet.hidden && Math.abs(scrollY - openedAt) > 60) menu(false);
}, { passive: true });
matchMedia('(min-width: 1100px)').addEventListener('change', (e) => {
  if (e.matches) menu(false);
});

// ----------------------------------------------- where you are reading
// The section whose heading last passed a line a third of the way down.
const toc = $$('.doc-toc a');
if (toc.length) {
  const heads = toc.map((a) => document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);
  let queued = false;
  const mark = () => {
    queued = false;
    const line = innerHeight * 0.33;
    let cur = null;
    for (const h of heads) if (h.getBoundingClientRect().top <= line) cur = h.id;
    for (const a of toc) {
      if (cur && a.getAttribute('href') === `#${cur}`) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    }
  };
  addEventListener('scroll', () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(mark);
    }
  }, { passive: true });
  mark();
}
