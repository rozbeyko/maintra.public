/* Extruded device chassis.
 *
 * The showcase phones are a real CSS-3D extrusion, not a rotated flat card:
 * DEPTH copies of the body outline are stacked backwards along Z, so when the
 * device turns there is an actual rounded side wall to see. tone() shades that
 * stack — a bright chamfer at the front, a dark trough through the middle, a
 * softer back rail — which is what reads as machined metal instead of a flat
 * grey band. Ported from the phone on the portfolio's Maintra case study —
 * but the TONES are deliberately not the portfolio's. That site has a cream
 * background, so a dark side wall reads strongly against it. The same numbers
 * here put the middle of the wall at grey 24 against a page background of grey
 * 10: fourteen levels of contrast, and the extrusion was invisible. It looked
 * like a flat card even though every slab was present and correct in the DOM.
 * On a dark ground the wall has to be LIGHTER than the page, not darker.
 *
 * The slabs sit STEP px apart rather than every pixel. At the 22 degrees these
 * lean, a 2px gap in Z projects to 0.75px on screen — under one pixel, so the
 * wall still reads as solid while costing half the elements to composite. 3px
 * projects to 1.12px and starts to band, so 2 is the floor, not a free dial.
 *
 * The slabs are built here rather than written into the markup because there
 * are 17 of them per phone across four phones: 68 spans of pure decoration
 * that would bury the one line of each figure that actually says anything.
 * They carry no meaning, so nothing is lost when this does not run — without
 * JavaScript the phone keeps its bezel, screen and glare and simply sits flat,
 * which is the same thing every visitor below 720px sees anyway.
 *
 * Note for anyone touching the CSS: `overflow: hidden` anywhere between
 * .device and .device-slab silently forces `transform-style: flat` and the
 * whole extrusion collapses into a flat card with no warning. Clipping belongs
 * on .device-screen and nowhere else.
 */
(function () {
  /* Same handshake nav.js uses: mark that scripting is live so the stylesheet
   * can hide the hero until its chassis exists. Set here as well as in nav.js
   * so this file does not quietly depend on that one having loaded first. */
  document.documentElement.classList.add('js');

  var THICKNESS = 34;   /* px of chassis depth — what you see edge-on */
  var STEP = 2;         /* px between slabs (see the note above about banding) */
  var DEPTH = THICKNESS / STEP;

  function tone(n, total) {
    if (n < 2) return 'rgb(158,158,170)';              /* front chamfer */
    if (n > total - 4) return 'rgb(74,74,86)';         /* back rail */
    var t = (n - 2) / (total - 6);
    var v = Math.round(108 - 46 * Math.sin(Math.PI * t));
    return 'rgb(' + v + ',' + v + ',' + (v + 8) + ')';
  }

  function build() {
    var solids = document.querySelectorAll('.device-solid');
    for (var s = 0; s < solids.length; s++) {
      if (solids[s].querySelector('.device-slab')) continue;
      var frag = document.createDocumentFragment();
      for (var n = 0; n < DEPTH; n++) {
        var slab = document.createElement('span');
        slab.className = 'device-slab';
        slab.setAttribute('aria-hidden', 'true');
        slab.style.transform = 'translateZ(' + -(n + 1) * STEP + 'px)';
        slab.style.background = tone(n, DEPTH);
        frag.appendChild(slab);
      }
      /* Behind the body, which is the first child that must stay on top. */
      solids[s].insertBefore(frag, solids[s].firstChild);
    }

    /* Only now may the hero animate. The CSS animation would otherwise start
     * the moment the element rendered — before any of this ran — so the phone
     * swung in as a bare card and grew its side wall halfway through. */
    document.documentElement.classList.add('devices-ready');
  }

  document.addEventListener('DOMContentLoaded', function () {
    /* Below 720px nothing is tilted: the showcase tilt is gated on that width
     * and the hero is hidden below 880px entirely. With every phone square-on
     * the chassis is directly behind the body and cannot be seen, so building
     * it there is 68 spans of invisible decoration on exactly the hardware
     * least able to carry them. Build when the viewport is wide enough to show
     * it, and if it never is, never at all. */
    var wide = window.matchMedia('(min-width: 720px)');
    if (wide.matches) { build(); return; }

    var onChange = function (event) { if (event.matches) { build(); stop(); } };
    var stop = function () {
      if (wide.removeEventListener) wide.removeEventListener('change', onChange);
      else wide.removeListener(onChange);
    };
    if (wide.addEventListener) wide.addEventListener('change', onChange);
    else wide.addListener(onChange);
  });
})();
