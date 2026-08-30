/* Mobile navigation.
 *
 * The header is a flex row of logo, brand and links with no breakpoint of its
 * own, so on a phone the links ran off the right edge and the last ones could
 * not be reached at all. Below 880px they now collapse behind a button.
 *
 * Adding `js` to <html> is deliberate and has to happen before the CSS can
 * hide anything: without JavaScript there is no way to open the panel, so a
 * visitor would be left with no navigation whatsoever — strictly worse than
 * the overflow this fixes. The stylesheet only collapses the nav under
 * `html.js`, so no-JS keeps the old row.
 *
 * The button is built here rather than pasted into ten static pages: every
 * page carries its own copy of the header with its own set of links, so a
 * markup change means ten near-identical edits and ten chances for them to
 * drift. The nav element itself is untouched.
 */
(function () {
  document.documentElement.classList.add('js');

  document.addEventListener('DOMContentLoaded', function () {
    var header = document.querySelector('header.site-header');
    if (!header) return;
    var nav = header.querySelector('nav');
    if (!nav || header.querySelector('.nav-toggle')) return;

    var button = document.createElement('button');
    button.className = 'nav-toggle';
    button.type = 'button';
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', 'Menu');
    button.appendChild(document.createElement('span'));

    if (!nav.id) nav.id = 'site-nav';
    button.setAttribute('aria-controls', nav.id);
    header.insertBefore(button, nav);

    function setOpen(open) {
      button.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) nav.setAttribute('data-open', 'true');
      else nav.removeAttribute('data-open');
    }

    button.addEventListener('click', function () {
      setOpen(button.getAttribute('aria-expanded') !== 'true');
    });

    // Following a link should not leave the panel hanging open behind the new
    // page — and on the in-page anchors (#features, #pricing) there is no
    // navigation at all, so nothing would close it.
    nav.addEventListener('click', function (event) {
      if (event.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && button.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        button.focus();
      }
    });

    document.addEventListener('click', function (event) {
      if (!header.contains(event.target)) setOpen(false);
    });

    // Crossing the breakpoint with the panel open would otherwise leave the
    // links stacked in a column on a desktop-width header.
    var wide = window.matchMedia('(min-width: 880px)');
    var onChange = function (event) { if (event.matches) setOpen(false); };
    if (wide.addEventListener) wide.addEventListener('change', onChange);
    else wide.addListener(onChange);
  });
})();
