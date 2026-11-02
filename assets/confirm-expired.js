/*
 * confirmed.html, when the link did not confirm anything.
 *
 * Supabase sends every confirmation link here, the good and the expired alike: an expired or
 * used one arrives with `#error=access_denied&error_code=otp_expired` in the address, and the
 * page used to say "Your email is confirmed" all the same (owner, 2026-10-27: the test account
 * believed confirmed was not). With an error in the address the page says the link has expired
 * and sends a new one to the address typed, back to this page in this language.
 *
 * The words are the page's own, in its #expired section (data-title, data-lede and the form);
 * this file only decides which half shows and talks to Supabase's /resend.
 */
(function () {
  var where = (window.location.hash || '') + '&' + (window.location.search || '');
  if (!/(^|[#&?])error(_code)?=/.test(where)) return;

  var SUPABASE = 'https://girxnrqwghdarubohncs.supabase.co';
  var KEY = 'sb_publishable_l2vb-NocFTY08FQJ5dfHbg_Nv3B64z6';

  function show() {
    var box = document.getElementById('expired');
    if (!box) return;
    // The form's look, on the site's own tokens (assets/home/site.css), kept here so the shared
    // stylesheet and its cache stamp stay as they are.
    var css = document.createElement('style');
    css.textContent = '#expired .expired-form{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;margin:8px 0 12px}'
      + '#expired label{flex:1 0 100%;font-family:var(--sans);color:var(--text2);font-size:14px}'
      + '#expired input{flex:1 1 220px;min-height:48px;padding:0 14px;font:inherit;color:var(--text);background:var(--surface);'
      + 'border:1px solid var(--hair);border-radius:0;outline:none}'
      + '#expired input:focus{border-color:var(--accent-line)}'
      + '#expired button{min-height:48px;border:0;cursor:pointer}'
      + '#expired button:disabled{opacity:.5;cursor:default}'
      + '#expired [data-note]{color:var(--text2);min-height:1.5em}';
    document.head.appendChild(css);
    var h1 = document.querySelector('.doc-head .h1') || document.querySelector('h1');
    var lede = document.querySelector('.doc-head .lede') || document.querySelector('.lede');
    if (h1 && box.dataset.title) h1.textContent = box.dataset.title;
    if (lede && box.dataset.lede) lede.textContent = box.dataset.lede;
    // The confirmed half goes: its "open the app" would sign in to nothing.
    var body = box.parentElement;
    Array.prototype.forEach.call(body.children, function (el) { if (el !== box && el.tagName !== 'SCRIPT') el.hidden = true; });
    box.hidden = false;

    var form = box.querySelector('form');
    var input = box.querySelector('input[type=email]');
    var button = box.querySelector('button');
    var note = box.querySelector('[data-note]');
    // Back to this page, in this language, with the .html the allowlist names.
    var path = window.location.pathname.replace(/\/$/, '');
    var back = window.location.origin + (/\.html$/.test(path) ? path : path + '.html');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = (input.value || '').trim();
      if (!email) { input.focus(); return; }
      button.disabled = true;
      note.textContent = '';
      fetch(SUPABASE + '/auth/v1/resend?redirect_to=' + encodeURIComponent(back), {
        method: 'POST',
        headers: { apikey: KEY, 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'signup', email: email }),
      }).then(function (r) {
        // Supabase answers the same for an address it does not know, so nothing here says which.
        note.textContent = r.ok ? box.dataset.sent : box.dataset.failed;
        if (!r.ok) button.disabled = false;
      }).catch(function () {
        note.textContent = box.dataset.failed;
        button.disabled = false;
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show);
  else show();
})();
