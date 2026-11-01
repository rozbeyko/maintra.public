/*
 * The /k/ and /t/ pages (tools/genhandover.mjs). Reads the code from the address
 * (/k/<code>, /uk/k/<code>; ?c=<code> on the page itself), asks the anonymous function
 * the app's own screen has a bigger twin of (invite_preview, transfer_page), and draws
 * what it answers in the page's words (#ho-words). Everything a person typed (a car's
 * name, a seller's name, a job) goes in as text, never as markup.
 */
(function () {
  'use strict';
  var root = document.querySelector('.ho');
  if (!root) return;
  var W = JSON.parse(document.getElementById('ho-words').textContent);
  var KIND = root.getAttribute('data-kind');
  var LANG = document.documentElement.lang || 'en';
  var API = 'https://girxnrqwghdarubohncs.supabase.co/rest/v1/rpc/';
  var KEY = 'sb_publishable_l2vb-NocFTY08FQJ5dfHbg_Nv3B64z6';
  var PLAY = 'https://play.google.com/store/apps/details?id=com.maintra.app';
  var ua = navigator.userAgent || '';
  var android = /android/i.test(ua);
  var ios = /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  var phone = android || ios;
  var $ = function (name) { return root.querySelector('[data-ho="' + name + '"]'); };

  function fill(s, vars) {
    return s.replace(/\{\{(\w+)\}\}/g, function (all, k) { return vars && vars[k] != null ? String(vars[k]) : ''; });
  }
  function say(key, vars) { return fill(W[key], vars); }
  // The forms are the app's, one per CLDR category the language has (Arabic has six).
  function plural(key, count) {
    var forms = W[key];
    var cat = 'other';
    try { cat = new Intl.PluralRules(LANG).select(count); } catch (e) {}
    return fill(forms[cat] || forms.other, { count: count });
  }
  function when(iso, withTime) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var o = { day: 'numeric', month: 'long' };
    if (d.getFullYear() !== new Date().getFullYear()) o.year = 'numeric';
    if (withTime) { o.hour = '2-digit'; o.minute = '2-digit'; }
    try { return d.toLocaleString(LANG, o); } catch (e) { return d.toLocaleString(); }
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // ------------------------------------------------------------ the code
  var m = /\/([kt])\/([0-9a-fA-F]{16})\/?$/.exec(location.pathname);
  var token = m && m[1] === KIND ? m[2].toLowerCase() : null;
  if (!token) {
    var q = new URLSearchParams(location.search).get('c');
    if (q && /^[0-9a-fA-F]{16}$/.test(q)) token = q.toLowerCase();
  }
  // The language menu keeps the code: each version of this page lives at /<code>/k/<token>.
  if (token) {
    Array.prototype.forEach.call(document.querySelectorAll('#lang-menu a[data-lang]'), function (a) {
      var l = a.getAttribute('data-lang');
      a.href = (l === 'en' ? '' : '/' + l) + '/' + KIND + '/' + token;
    });
  }

  // ------------------------------------------------------------ the parts
  var msg = $('msg');
  function message(text) { msg.textContent = text; msg.hidden = false; }
  // On a phone, its own store only; on a computer, both, and no Open (nothing there to open).
  if (android) $('appstore').hidden = true;
  if (ios) $('play').hidden = true;
  function cta(title, text, open) {
    var t = $('ctaTitle');
    t.hidden = !title;
    t.textContent = title || '';
    var p = $('ctaText');
    p.hidden = !text;
    p.textContent = text || '';
    var o = $('open');
    o.hidden = !(open && token && phone);
    // Android: the app if it is installed, else Google Play; iOS: the app's own address.
    if (!o.hidden) {
      o.href = android
        ? 'intent://' + KIND + '/' + token + '#Intent;scheme=autocare;package=com.maintra.app;S.browser_fallback_url=' + encodeURIComponent(PLAY) + ';end'
        : 'autocare://' + KIND + '/' + token;
    }
  }
  function fine(text) {
    var f = $('fine');
    f.hidden = !text;
    f.textContent = text || '';
  }
  var CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12.5l5 5 10-11"></path></svg>';
  var LOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 11h11v8.5h-11z"></path><path d="M9 11V8.5a3 3 0 0 1 6 0V11"></path></svg>';
  // mark: 'ok' (a green tick), 'warn' (the amber octagon), 'lock' (something that stays behind)
  function row(mark, title, sub, value) {
    var r = el('div', 'ho-row');
    var i = el('span', 'ho-ico ho-' + mark);
    if (mark === 'warn') i.appendChild(el('span', 'ho-oct'));
    else i.innerHTML = mark === 'lock' ? LOCK : CHECK;
    r.appendChild(i);
    var b = el('span', 'ho-row-body');
    b.appendChild(el('span', 'ho-row-title', title));
    if (sub) b.appendChild(el('span', 'ho-row-sub', sub));
    r.appendChild(b);
    r.appendChild(el('span', 'ho-row-value' + (mark === 'warn' && value ? ' ho-amber' : ''), value || ''));
    return r;
  }
  function card(parts) {
    var c = $('card');
    c.textContent = '';
    c.appendChild(el('p', 'ho-eyebrow', parts.eyebrow));
    c.appendChild(el('h1', 'ho-title', parts.title));
    if (parts.sub) c.appendChild(el('p', 'ho-sub', parts.sub));
    (parts.facts || []).forEach(function (f) {
      var p = el('p', 'ho-fact');
      p.appendChild(el('span', 'ho-fact-label', f[0]));
      p.appendChild(el('span', 'ho-fact-value', f[1]));
      c.appendChild(p);
    });
    if (parts.label) c.appendChild(el('p', 'ho-label', parts.label));
    if (parts.rows && parts.rows.length) {
      var list = el('div', 'ho-rows');
      parts.rows.forEach(function (r) { list.appendChild(r); });
      c.appendChild(list);
    }
    if (parts.goes && parts.goes.length) {
      c.appendChild(el('p', 'ho-label', W['t.goes']));
      var chips = el('p', 'ho-chips');
      parts.goes.forEach(function (g) { chips.appendChild(el('span', 'ho-chip', g)); });
      c.appendChild(chips);
    }
    if (parts.expires) c.appendChild(el('p', 'ho-until', say('until', { date: when(parts.expires, true) })));
    c.hidden = false;
    msg.hidden = true;
  }

  // ------------------------------------------------------------ what it answers
  function invite(p) {
    var from = p.from;
    if (p.role === 'guest') {
      card({
        eyebrow: from ? say('lend.lends', { from: from }) : W['lend.lendsNoName'],
        title: p.car,
        facts: [[W['lend.untilLabel'], p.lend_until ? when(p.lend_until, true) : W['lend.untilOpen']]],
        expires: p.expires_at,
      });
      fine(from ? say('lend.note', { from: from }) : W['lend.noteNoName']);
    } else {
      card({
        eyebrow: from ? say('k.eyebrow', { from: from }) : W['k.eyebrowNoName'],
        title: p.car,
        rows: [
          row('ok', W['k.p1']),
          row('ok', W['k.p2']),
          row('ok', from ? say('k.p3', { from: from }) : W['k.p3NoName']),
          row('lock', from ? say('k.p4', { from: from }) : W['k.p4NoName']),
        ],
        expires: p.expires_at,
      });
      fine(W['k.slot']);
    }
  }

  function transfer(p) {
    var car = [p.car && p.car.make, p.car && p.car.model].filter(Boolean).join(' ');
    var w = p['with'] || {};
    var rows = [];
    // As the buyer's screen in the app: the records only when the history goes with the car.
    if (w.history) {
      rows.push(row('ok', W['t.records'], p.since ? say('t.recordsSince', { year: String(p.since).slice(0, 4) }) : null, String(p.records)));
      if (p.records) rows.push(row('ok', W['t.onTime'], W['t.onTimeSub'], say('t.ofN', { a: p.on_time, b: p.records })));
    }
    if (p.readings) {
      rows.push(p.went_back
        ? row('warn', W['t.odoBack'], W['t.odoSub'], say('t.ofN', { a: p.went_back, b: p.readings }))
        : row('ok', W['t.odoOk'], W['t.odoSub'], String(p.readings)));
    }
    if (w.plan && p.late) rows.push(row('warn', plural('t.late', p.late), p.first_late ? say('t.firstUp', { job: p.first_late }) : null));
    var goes = [];
    if (w.history) goes.push(say('t.history', { n: p.records }));
    if (w.plan) goes.push(W['t.plan']);
    if (w.tyres) goes.push(W['t.tyres']);
    if (w.fuel) goes.push(W['t.fuel']);
    if (w.prices) goes.push(W['t.prices']);
    card({
      eyebrow: p.seller ? say('t.handsYou', { from: p.seller, car: car }) : say('t.handsYouNoName', { car: car }),
      title: car,
      sub: p.car && p.car.year ? String(p.car.year) : null,
      label: rows.length ? W['t.checked'] : null,
      rows: rows,
      goes: goes,
      expires: p.expires_at,
    });
    cta(W['t.takeTitle'], phone ? W['t.takeBody'] : W.desktop, true);
    fine(W['t.fine']);
  }

  // ------------------------------------------------------------ go
  var install = phone ? W.install : W.desktop;
  if (!token) { message(W.noCode); cta(null, install, false); return; }
  cta(null, install, true);

  fetch(API + (KIND === 'k' ? 'invite_preview' : 'transfer_page'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: KEY },
    body: JSON.stringify(KIND === 'k' ? { p_code: token } : { p_token: token }),
  })
    .then(function (res) {
      // 404 PGRST202: the function is not there yet (transfer_page is migration 146). The link
      // still works in the app, so the page says to open it there.
      if (res.status === 404) {
        return res.json().catch(function () { return {}; }).then(function (b) {
          if (b && b.code === 'PGRST202') return { missing: true };
          throw new Error('HTTP 404');
        });
      }
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json().then(function (data) { return { data: data }; });
    })
    .then(function (r) {
      if (r.missing) { message(W.inApp); return; }
      // A dead link: nothing to open and nothing to open again, only the stores.
      if (!r.data) { message(KIND === 'k' ? W['k.gone'] : W['t.gone']); cta(null, null, false); return; }
      if (KIND === 'k') invite(r.data);
      else transfer(r.data);
    })
    .catch(function () { message(W.failed); });
})();
