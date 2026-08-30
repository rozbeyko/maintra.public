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
 * The slabs are built here rather than written into the markup because there
 * are DEPTH of them per phone and three phones: ~84 spans of pure decoration
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
  var DEPTH = 34;

  function tone(n, total) {
    if (n < 2) return 'rgb(158,158,170)';              /* front chamfer */
    if (n > total - 4) return 'rgb(74,74,86)';         /* back rail */
    var t = (n - 2) / (total - 6);
    var v = Math.round(108 - 46 * Math.sin(Math.PI * t));
    return 'rgb(' + v + ',' + v + ',' + (v + 8) + ')';
  }

  document.addEventListener('DOMContentLoaded', function () {
    var solids = document.querySelectorAll('.device-solid');
    for (var s = 0; s < solids.length; s++) {
      if (solids[s].querySelector('.device-slab')) continue;
      var frag = document.createDocumentFragment();
      for (var n = 0; n < DEPTH; n++) {
        var slab = document.createElement('span');
        slab.className = 'device-slab';
        slab.setAttribute('aria-hidden', 'true');
        slab.style.transform = 'translateZ(' + -(n + 1) + 'px)';
        slab.style.background = tone(n, DEPTH);
        frag.appendChild(slab);
      }
      /* Behind the body, which is the first child that must stay on top. */
      solids[s].insertBefore(frag, solids[s].firstChild);
    }
  });
})();
