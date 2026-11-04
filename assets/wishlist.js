/*
 * The shared wishlist page (tools/genwishlist.mjs): wishlist.html?t=<token>, the link the app's
 * share sheet sends. It is the app's guest view in a browser (the app's FEATURES.md §5.16, step 3;
 * BACKEND.md §5.3): the list through get_shared_wishlist_v2, Book it and Cancel my booking through
 * reserve_shared_wish_v2 (the app's migration 139, both callable with the publishable key), in
 * the page's words (#wl-words).
 *
 * Who booked a wish is the list owner's alone, and only on asking (the app's OQ-407): the two
 * functions answer whether a wish is booked and whether by this browser, never by whom, and
 * nothing here reads a name. The guest is a random id kept in this browser (maintra_guest_id; the
 * app keeps its own, which a browser cannot reach), so a browser is a guest of its own, and the id
 * is what lets it cancel its booking later. Everything a person typed (a car, a wish, a shop, a
 * name) goes in as text, never as markup.
 */
(function () {
  'use strict';
  var root = document.querySelector('.wl');
  if (!root) return;
  var W = JSON.parse(document.getElementById('wl-words').textContent);
  var LANG = document.documentElement.lang || 'en';
  // Arabic keeps Western digits, as the app writes numbers (its src/core/numbers.ts).
  var NUM = /^ar(-|$)/i.test(LANG) ? 'ar-u-nu-latn' : LANG;
  var API = 'https://girxnrqwghdarubohncs.supabase.co/rest/v1/rpc/';
  var KEY = 'sb_publishable_l2vb-NocFTY08FQJ5dfHbg_Nv3B64z6';
  var PLAY = 'https://play.google.com/store/apps/details?id=com.maintra.app';
  var APPSTORE = 'https://apps.apple.com/app/maintra/id6775876731';
  var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  var GUEST_KEY = 'maintra_guest_id';
  var NAME_KEY = 'maintra_guest_name';
  var TIMEOUT_MS = 15000;
  // The app's own symbols (its lib/currency.ts), so a price reads here as it does there.
  var SYMBOLS = {
    UAH: '₴', USD: '$', EUR: '€', GBP: '£', PLN: 'zł', CZK: 'Kč', CHF: 'Fr', SEK: 'kr', NOK: 'kr', DKK: 'kr', HUF: 'Ft',
    RON: 'lei', BGN: 'лв', TRY: '₺', GEL: '₾', MDL: 'L', KZT: '₸', CAD: 'C$', MXN: 'MX$', BRL: 'R$', ARS: 'AR$', CLP: 'CLP$',
    COP: 'COL$', PEN: 'S/', DOP: 'RD$', UYU: '$U', AUD: 'A$', NZD: 'NZ$', JPY: '¥', CNY: '¥', INR: '₹', SGD: 'S$', HKD: 'HK$',
    KRW: '₩', TWD: 'NT$', THB: '฿', IDR: 'Rp', MYR: 'RM', PHP: '₱', VND: '₫', PKR: '₨', AED: 'AED', SAR: 'SAR', QAR: 'QAR',
    ILS: '₪', EGP: 'E£', MAD: 'DH', ZAR: 'R', NGN: '₦', KES: 'KSh', GHS: '₵',
  };
  var ua = navigator.userAgent || '';
  var android = /android/i.test(ua);
  var ios = /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  var $ = function (name) { return root.querySelector('[data-wl="' + name + '"]'); };
  var input = document.getElementById('wl-name');

  // ------------------------------------------------------------ words
  function fill(s, vars) {
    return String(s).replace(/\{\{(\w+)\}\}/g, function (all, k) { return vars && vars[k] != null ? String(vars[k]) : ''; });
  }
  function say(key, vars) { return fill(W[key], vars); }
  // One form per CLDR category the language has (Arabic has six), as the app's.
  function plural(key, count, vars) {
    var forms = W[key];
    var cat = 'other';
    try { cat = new Intl.PluralRules(LANG).select(count); } catch (e) {}
    var v = { count: count.toLocaleString(NUM) };
    for (var k in vars) v[k] = vars[k];
    return fill(forms[cat] || forms.other, v);
  }
  // Cents when there are any; a whole price stays whole (the app's wishText.ts). The symbol after
  // the number with a no-break space, as the app writes it.
  function money(n, currency) {
    var whole = Math.round(n * 100) % 100 === 0;
    var s;
    try {
      s = n.toLocaleString(NUM, whole ? { maximumFractionDigits: 0 } : { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } catch (e) {
      s = whole ? String(Math.round(n)) : n.toFixed(2);
    }
    var sym = currency ? SYMBOLS[currency.toUpperCase()] || currency : '';
    return sym ? s + ' ' + sym : s;
  }
  // A shop's name or an amount set apart from the words around it, so a right-to-left page keeps
  // "800 ₴" together and beside its shop (Arabic read "₴ Rozetka · 800" without it).
  function bdi(text) { return el('bdi', null, text); }
  // What the wish costs, all of it: "800 ₴", or "800 ₴ for 2" when there are several (never the
  // unit price beside a ×2, which read as that much each). Nodes, the amount isolated.
  function price(w) {
    if (w.price == null) return null;
    var total = money(w.price * w.quantity, w.currency);
    if (w.quantity < 2) return [bdi(total)];
    var mark = '\u0000';
    return plural('forCount', w.quantity, { total: mark }).split(mark).reduce(function (out, part, i) {
      if (i) out.push(bdi(total));
      if (part) out.push(document.createTextNode(part));
      return out;
    }, []);
  }
  // A day inside a sentence, its month written out, ending on the date itself: Ukrainian's
  // "2025 р." loses its "р." so the sentence's own full stop can follow (the app's sentenceDate.ts).
  function day(iso) {
    var d = iso ? new Date(iso) : null;
    if (!d || isNaN(d.getTime())) return '';
    var o = { day: 'numeric', month: 'long' };
    if (d.getFullYear() !== new Date().getFullYear()) o.year = 'numeric';
    var s;
    try { s = d.toLocaleDateString(NUM, o); } catch (e) { s = d.toLocaleDateString(); }
    return s.replace(/\s[^\s\d.]{1,4}\.$/, '');
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // ------------------------------------------------------------ this browser, as a guest
  function newId() {
    try { if (window.crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) {}
    try {
      var b = crypto.getRandomValues(new Uint8Array(16));
      b[6] = (b[6] & 15) | 64;
      b[8] = (b[8] & 63) | 128;
      var h = Array.prototype.map.call(b, function (x) { return (x + 256).toString(16).slice(1); }).join('');
      return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
    } catch (e) {}
    return 'w' + Date.now().toString(36) + Math.random().toString(36).slice(2, 14);
  }
  var guest = null;
  // Kept, so a booking made today can be cancelled tomorrow. A browser that keeps nothing (storage
  // blocked) is a guest for this visit only.
  function guestId() {
    if (guest) return guest;
    try { guest = localStorage.getItem(GUEST_KEY); } catch (e) {}
    if (!guest || guest.length < 8 || guest.length > 64) {
      guest = newId();
      try { localStorage.setItem(GUEST_KEY, guest); } catch (e) {}
    }
    return guest;
  }
  // The name this browser last booked under, offered again (the app does the same).
  try { input.value = localStorage.getItem(NAME_KEY) || ''; } catch (e) {}
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') input.blur(); });

  // ------------------------------------------------------------ the token
  var raw = new URLSearchParams(location.search).get('t');
  var token = raw && UUID.test(raw.trim()) ? raw.trim().toLowerCase() : null;
  // The language menu keeps the token: each version of this page is /<code>/wishlist?t=<token>.
  if (raw) {
    var ext = /\.html$/.test(location.pathname) ? '.html' : '';
    Array.prototype.forEach.call(document.querySelectorAll('#lang-menu a[data-lang]'), function (a) {
      var l = a.getAttribute('data-lang');
      a.href = (l === 'en' ? '' : '/' + l) + '/wishlist' + ext + location.search;
    });
  }

  // ------------------------------------------------------------ the app and the store
  // Android: the app if it is installed, else Google Play; iOS: the app's own address. Both open
  // the app's guest view of this list (autocare://shared/<token>, 1.x's path, which 2.0 kept).
  if (token && (android || ios)) {
    var open = $('open');
    open.href = android
      ? 'intent://shared/' + token + '#Intent;scheme=autocare;package=com.maintra.app;S.browser_fallback_url=' + encodeURIComponent(PLAY) + ';end'
      : 'autocare://shared/' + token;
    open.hidden = false;
  }
  if (android) $('get').href = PLAY;
  else if (ios) $('get').href = APPSTORE;

  // ------------------------------------------------------------ the server
  // Answers { status, ok, data }; a request that never reached it (offline, timed out) rejects.
  function rpc(name, body) {
    var ctl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, TIMEOUT_MS) : 0;
    return fetch(API + name, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: KEY },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: ctl ? ctl.signal : undefined,
    }).then(function (res) {
      return res.text().then(function (text) {
        clearTimeout(timer);
        var data = null;
        try { data = text ? JSON.parse(text) : null; } catch (e) {}
        return { status: res.status, ok: res.ok, data: data };
      });
    }, function (e) {
      clearTimeout(timer);
      throw e;
    });
  }

  var str = function (v) { return typeof v === 'string' && v.trim() ? v.trim() : null; };
  var num = function (v) {
    var n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v) : NaN;
    return isFinite(n) ? n : null;
  };
  var web = function (v) { var s = str(v); return s && /^https?:\/\//i.test(s) ? s : null; };

  // The share, read defensively (the app's readSharedWishlist); null when there is no such share.
  // canBook is false for 1.x's function, read only when 139's is missing.
  var goneIds = {};
  function readList(data, canBook) {
    if (!data || typeof data !== 'object' || !Array.isArray(data.items)) return null;
    var wishes = [];
    data.items.forEach(function (i) {
      if (!i || typeof i !== 'object') return;
      var title = str(i.title);
      if (!title) return;
      var id = canBook ? str(i.id) : null;
      id = id && UUID.test(id) ? id.toLowerCase() : null;
      var p = num(i.price);
      wishes.push({
        // No id: a wish shared before bookings existed (1.x, 032). It shows, and cannot be booked.
        id: id,
        title: title,
        price: p != null && p >= 0 ? p : null,
        quantity: Math.max(1, Math.round(num(i.quantity) || 1)),
        currency: str(i.currency),
        site: str(i.site_name),
        url: web(i.url),
        image: web(i.image_url),
        booked: canBook && i.booked === true,
        bookedByMe: canBook && i.booked === true && i.booked_by_me === true,
        gone: !!(id && goneIds[id]),
      });
    });
    return {
      car: str(data.vehicle_label) || '',
      owner: canBook ? str(data.owner_name) : null,
      sharedAt: str(data.created_at),
      canBook: canBook,
      wishes: wishes,
    };
  }

  var list = null;
  var busy = null;

  // Reads the share and draws it. 'ok', 'missing' (no such share: a wrong link, or its owner
  // stopped sharing) or 'failed'. A quiet read keeps what is on screen when it fails.
  function load(quiet) {
    if (!quiet) message(null, W.loading, false);
    return rpc('get_shared_wishlist_v2', { p_token: token, p_guest_id: guestId() })
      .then(function (r) {
        // 404 PGRST202: 139 is not there. 1.x's function still reads the list (it cannot book).
        if (r.status === 404 && r.data && r.data.code === 'PGRST202') {
          return rpc('get_shared_wishlist', { p_token: token }).then(function (r1) {
            if (!r1.ok) throw new Error('HTTP ' + r1.status);
            return readList(r1.data, false);
          });
        }
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return readList(r.data, true);
      })
      .then(function (l) {
        list = l;
        if (!l) { message(W.missingTitle, W.goneBody, false); return 'missing'; }
        draw();
        return 'ok';
      })
      .catch(function () {
        if (!quiet || !list) message(null, W.failed, true);
        return 'failed';
      });
  }

  // ------------------------------------------------------------ drawing
  function message(title, text, retry) {
    $('view').hidden = true;
    var t = $('msgTitle');
    t.hidden = !title;
    t.textContent = title || '';
    $('msgText').textContent = text || '';
    $('retryBox').hidden = !retry;
    $('msg').hidden = false;
  }

  function draw() {
    var owner = list.owner;
    $('eyebrow').textContent = owner ? say('eyebrowBy', { name: owner }) : W.title;
    $('heading').textContent = list.car ? say('heading', { car: list.car }) : W.title;
    var hint = $('hint');
    hint.hidden = !list.canBook;
    hint.textContent = owner ? say('hintBy', { name: owner }) : W.hint;
    $('nameNote').textContent = owner ? say('nameNoteBy', { name: owner }) : W.nameNote;
    var ul = $('list');
    ul.textContent = '';
    list.wishes.forEach(function (w) { ul.appendChild(row(w)); });
    var snap = $('snapshot');
    var when = day(list.sharedAt);
    snap.hidden = !when;
    snap.textContent = when ? say('snapshot', { date: when }) : '';
    you();
    $('msg').hidden = true;
    $('view').hidden = false;
  }

  // The name goes with a booking: asked for while there is something left to book.
  function you() {
    $('you').hidden = !list.wishes.some(function (w) { return w.id && !w.booked && !w.gone; });
  }

  var BAG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8.5h14l-1.2 11.5H6.2z"></path><path d="M9 8.5V7a3 3 0 0 1 6 0v1.5"></path></svg>';
  var OUT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 4.5h6v6"></path><path d="M19.5 4.5l-9 9"></path><path d="M17.5 14v5.5h-13v-13H10"></path></svg>';

  function row(w) {
    var li = el('li', 'wl-item' + (w.gone ? ' is-gone' : ''));
    li.tabIndex = -1;
    var th = el('span', 'wl-thumb');
    var bag = function () { th.textContent = ''; th.innerHTML = BAG; th.className = 'wl-thumb ph'; };
    if (w.image) {
      var img = document.createElement('img');
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      // The page's address carries the token: a shop's picture server never sees it.
      img.referrerPolicy = 'no-referrer';
      img.onerror = bag;
      img.src = w.image;
      th.appendChild(img);
    } else bag();
    li.appendChild(th);

    var body = el('div', 'wl-body');
    var t;
    if (w.url) {
      t = el('a', 'wl-title');
      t.href = w.url;
      t.target = '_blank';
      t.rel = 'noopener noreferrer nofollow';
      t.appendChild(document.createTextNode(w.title));
      t.insertAdjacentHTML('beforeend', OUT);
    } else t = el('span', 'wl-title', w.title);
    body.appendChild(t);
    var cost = price(w);
    if (w.site || cost) {
      var line = el('span', 'wl-line');
      if (w.site) line.appendChild(bdi(w.site));
      if (w.site && cost) line.appendChild(document.createTextNode(' · '));
      (cost || []).forEach(function (n) { line.appendChild(n); });
      body.appendChild(line);
    }
    li.appendChild(body);

    // Book it, or Booked, or Booked by you and Cancel my booking. Never who (OQ-407).
    var act = el('div', 'wl-act');
    if (w.id && w.gone) act.appendChild(el('span', 'wl-state wl-gone', W.goneToast));
    else if (w.id && w.bookedByMe) {
      act.appendChild(el('span', 'wl-state wl-mine', W.bookedByYou));
      var rel = el('button', 'wl-release', W.release);
      rel.type = 'button';
      rel.addEventListener('click', function () { book(w, false, rel); });
      act.appendChild(rel);
    } else if (w.id && w.booked) act.appendChild(el('span', 'wl-state', W.booked));
    else if (w.id) {
      var b = el('button', 'btn btn-line btn-sm wl-book', W.book);
      b.type = 'button';
      b.setAttribute('aria-label', say('bookLabel', { title: w.title }));
      b.addEventListener('click', function () { book(w, true, b); });
      act.appendChild(b);
    }
    li.appendChild(act);
    w.li = li;
    return li;
  }

  // The wish as the server now says it is, in place; the focus stays on its row.
  function redraw(w) {
    if (!w.li || !w.li.parentNode) return;
    var had = w.li.contains(document.activeElement);
    var old = w.li;
    old.parentNode.replaceChild(row(w), old);
    if (had) w.li.focus({ preventScroll: true });
    you();
  }

  var toastTimer = 0;
  function toast(title, detail) {
    var t = $('toast');
    t.textContent = '';
    t.appendChild(el('span', 'wl-toast-title', title));
    if (detail) t.appendChild(el('span', 'wl-toast-detail', detail));
    t.classList.add('in');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      t.classList.remove('in');
      toastTimer = setTimeout(function () { t.textContent = ''; }, 400);
    }, 4500);
  }

  // ------------------------------------------------------------ booking
  // One tap: the name, if one was typed, goes with it and is kept for next time. First come
  // (032): someone who booked a moment earlier keeps it, and this says so.
  function book(w, yes, button) {
    if (!w.id || busy || !list || !list.canBook) return;
    busy = w.id;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    var name = yes ? (input.value || '').trim().slice(0, 40) : '';
    rpc('reserve_shared_wish_v2', { p_token: token, p_item_id: w.id, p_guest_id: guestId(), p_name: name || null, p_book: yes })
      .then(function (r) {
        if (!r.ok) return { said: W.wrong };
        var d = r.data || {};
        if (d.ok === true) {
          w.booked = d.booked === true;
          w.bookedByMe = w.booked && d.booked_by_me === true;
          if (yes && w.bookedByMe) {
            if (name) {
              try { localStorage.setItem(NAME_KEY, name); } catch (e) {}
            }
            return { said: W.bookedToast, detail: w.title };
          }
          if (!yes && !w.bookedByMe) return { said: W.releasedToast, detail: w.title };
          if (yes && w.booked) return { said: W.takenToast };
          return { said: W.wrong };
        }
        // Deleted from the list since it was shared.
        if (d.reason === 'gone') {
          goneIds[w.id] = true;
          w.gone = true;
          return { said: W.goneToast };
        }
        // 'invalid': the share is no more (its owner stopped sharing): read it again, which says so.
        if (d.reason === 'invalid') return { reload: true };
        return { said: W.wrong };
      }, function () {
        return { said: W.offline };
      })
      .catch(function () { return { said: W.wrong }; })
      .then(function (out) {
        busy = null;
        if (out.reload) {
          return load(true).then(function (state) { if (state !== 'missing') toast(W.wrong); });
        }
        redraw(w);
        toast(out.said, out.detail);
      });
  }

  // ------------------------------------------------------------ go
  $('retry').addEventListener('click', function () { load(false); });
  if (!token) {
    message(null, W.noCode, false);
    return;
  }
  load(false);
  // Back on the page after a while: what others booked meanwhile, or a list no longer shared.
  var hiddenAt = 0;
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { hiddenAt = Date.now(); return; }
    if (list && !busy && Date.now() - hiddenAt > 15000) load(true);
  });
})();
