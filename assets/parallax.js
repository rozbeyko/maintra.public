// Subtle background parallax: the body::before bg image drifts upward
// at a fraction of scroll speed so it feels alive without competing
// with content.
//
// Cap is paired with the CSS — body::before extends 30vh below the
// viewport (bottom: -30vh in style.css), so we cap the shift at 28vh to
// leave a small safety margin and never expose the page background below
// the image on long pages.
//
// rAF-throttled and gated behind prefers-reduced-motion.
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const PARALLAX_RATE = 0.15;   // 0 = locked, 1 = scrolls with content
  const MAX_SHIFT_VH = 28;      // must stay <= CSS bottom buffer (30vh)
  let ticking = false;

  function update() {
    const maxShift = window.innerHeight * (MAX_SHIFT_VH / 100);
    const shift = Math.min(window.scrollY * PARALLAX_RATE, maxShift);
    document.body.style.setProperty('--bg-shift', `${-shift}px`);
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });

  // Initial position in case the page is reloaded mid-scroll.
  update();
})();
