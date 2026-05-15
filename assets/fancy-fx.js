// Two ambient effects, gated behind prefers-reduced-motion:
//   1. Drifting "smoke" particles — big blurred blobs floating up.
//      Injected as DOM so no HTML edits per page.
//   2. Scroll-reveal — fade + rise as elements enter the viewport,
//      via IntersectionObserver. Once revealed, the observer unhooks.
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // ─── 1. Smoke ──────────────────────────────────────────────────
  const smoke = document.createElement('div');
  smoke.className = 'smoke';
  smoke.setAttribute('aria-hidden', 'true');

  const PARTICLE_COUNT = 8;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const p = document.createElement('div');
    p.className = 'smoke-particle';
    const size = 240 + Math.random() * 220;
    p.style.width = `${size}px`;
    p.style.height = `${size}px`;
    p.style.left = `${Math.random() * 100}%`;
    p.style.animationDuration = `${45 + Math.random() * 35}s`;
    p.style.animationDelay = `${Math.random() * -80}s`;
    p.style.opacity = (0.5 + Math.random() * 0.4).toFixed(2);
    smoke.appendChild(p);
  }
  document.body.appendChild(smoke);

  // ─── 2. Scroll reveal ──────────────────────────────────────────
  const targets = document.querySelectorAll(
    '.section, .hero, .feature, .step, .tier, .shot, .faq-q'
  );
  targets.forEach(el => el.classList.add('reveal'));

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
  );
  targets.forEach(el => io.observe(el));
})();
