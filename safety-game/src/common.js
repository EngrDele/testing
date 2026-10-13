// Site Life shared features for all games. Built into pages by src/build.py.
// SL.consent  privacy notice and consent (NDPA 2023)
// SL.t        translation with English fallback; SL.lang current language
// SL.settings graphics quality, text size, captions, colour-blind palette
// SL.caption  on-screen captions for spoken text
// SL.post     send a result to our server / Google Sheets with an offline queue (IndexedDB); SL.lastId, SL.certLink(id)
// SL.lms      SCORM 1.2 reporting when the game runs inside an LMS frame
const SL = (() => {
  const QS = new URLSearchParams(location.search);
  const store = {
    get(k, d) { try { const v = localStorage.getItem('sl-' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('sl-' + k, JSON.stringify(v)); } catch (e) {} },
  };
  const escH = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------- language ----------
  const LANGS = [
    { id: 'en', name: 'English', voice: 'en' },
    { id: 'pcm', name: 'Pidgin', voice: 'en' },
    { id: 'yo', name: 'Yorùbá', voice: 'yo' },
    { id: 'ha', name: 'Hausa', voice: 'ha' },
    { id: 'ig', name: 'Igbo', voice: 'ig' },
  ];
  const I18N = (typeof SL_I18N !== 'undefined') ? SL_I18N : {};
  let lang = QS.get('lang') || store.get('lang', 'en');
  if (!LANGS.some(l => l.id === lang)) lang = 'en';
  const misses = new Set();
  function t(s) { return s == null ? '' : trText(String(s)); }
  function setLang(id) { lang = id; store.set('lang', id); }

  // Automatic on-screen translation: every text node added to the page is looked up in the
  // dictionary (exact match, then with a leading emoji/symbol prefix removed, then {0}-patterns).
  const PAT = {}, VALUES = {};
  for (const [l, d] of Object.entries(I18N)) {
    PAT[l] = Object.keys(d).filter(k => k.includes('{0}')).map(k => {
      const parts = k.split(/\{\d\}/).map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      return { re: new RegExp('^' + parts.join('(.+?)') + '$'), out: d[k] };
    });
    VALUES[l] = new Set(Object.values(d));
  }
  const PREFIX = /^([\s\p{Extended_Pictographic}\p{S}\p{P}‍️]*?)((?!\p{Extended_Pictographic})[\p{L}"'(].*?)([\s.!?…:]*)$/su;
  // OUT remembers what we produced, so text we already translated is not looked up (and reported missing) again
  const OUT = new Set();
  function trText(s) {
    if (lang === 'en' || !s) return s;
    if (OUT.has(String(s).trim())) return s;
    const r = trText0(s); if (r !== s) OUT.add(String(r).trim()); return r;
  }
  function trText0(s) {
    if (lang === 'en' || !s || !/\p{L}/u.test(s)) return s;
    const d = I18N[lang] || {}, core = s.trim();
    if (d[core] != null) return s.replace(core, d[core]);
    if (VALUES[lang] && VALUES[lang].has(core)) return s;
    const m = core.match(PREFIX);
    if (m) {
      const body = m[2] + m[3];
      if (d[body] != null) return s.replace(core, m[1] + d[body]);
      if (d[m[2]] != null) return s.replace(core, m[1] + d[m[2]] + m[3]);
    }
    const sub = v => (I18N[lang] || {})[v] != null ? I18N[lang][v] : v.split(', ').map(x => { const d2 = I18N[lang] || {}; return d2[x] != null ? d2[x] : x; }).join(', ');
    for (const p of PAT[lang] || []) {
      const mm = core.match(p.re); if (mm) return s.replace(core, p.out.replace(/\{(\d)\}/g, (_, i) => sub(mm[+i + 1])));
      if (m) { const m2 = (m[2] + m[3]).match(p.re); if (m2) return s.replace(core, m[1] + p.out.replace(/\{(\d)\}/g, (_, i) => sub(m2[+i + 1]))); }
    }
    if (core.length > 2 && core.length < 400) misses.add(core);
    return s;
  }
  function translateTree(root) {
    if (lang === 'en' || !root) return;
    if (root.nodeType === 3) { if (root.parentElement && root.parentElement.closest('[data-notr],textarea')) return; const v = trText(root.data); if (v !== root.data) root.data = v; return; }
    if (root.nodeType !== 1 || root.closest && root.closest('[data-notr],script,style,textarea')) return;
    for (const a of ['placeholder', 'title', 'aria-label']) if (root.hasAttribute && root.hasAttribute(a)) root.setAttribute(a, trText(root.getAttribute(a)));
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      if (n.nodeType === 1) { if (/^(SCRIPT|STYLE|TEXTAREA)$/.test(n.tagName) || n.hasAttribute('data-notr')) continue;
        for (const a of ['placeholder', 'title', 'aria-label']) if (n.hasAttribute(a)) n.setAttribute(a, trText(n.getAttribute(a))); continue; }
      if (n.parentElement && n.parentElement.closest('[data-notr],textarea')) continue;
      const v = trText(n.data); if (v !== n.data) n.data = v;
    }
  }
  if (lang !== 'en') {
    const mo = new MutationObserver(ms => { for (const m of ms) { if (m.type === 'characterData') translateTree(m.target); else m.addedNodes.forEach(translateTree); } });
    const startObs = () => { translateTree(document.body); mo.observe(document.body, { childList: true, subtree: true, characterData: true }); };
    document.body ? startObs() : addEventListener('DOMContentLoaded', startObs);
  }

  // ---------- consent ----------
  const CONSENT_V = 1;
  const consent = {
    ok() { return store.get('consent', 0) >= CONSENT_V; },
    give() { store.set('consent', CONSENT_V); },
    notice(kids) {
      return kids
        ? t('A parent or teacher should read this: the game saves the child\'s first name, stars and answers so parents and teachers can see progress. It is only sent if the game is opened from a school or family link, is kept only as long as the school decides, and is never sold or shared.')
        : t('This induction saves your name, company, role, answers and result so the HSE team can confirm you completed it. Only HSE can see the results. They are kept for the period set by the company (normally 12 months) and then deleted. You can ask HSE to see or delete your record.');
    },
    // Returns HTML for a checkbox block; call bind(modal, startBtn) after rendering.
    html(kids) {
      const ok = this.ok();
      return `<div class="consent"><label><input type="checkbox" id="slConsent" ${ok ? 'checked' : ''}> ${escH(t(kids ? 'A parent or teacher agrees to the privacy notice' : 'I have read and agree to the privacy notice'))}</label>
        <details><summary>${escH(t('Privacy notice'))}</summary><p>${escH(this.notice(kids))}</p></details></div>`;
    },
    bind(m, btn) {
      const cb = m.querySelector('#slConsent'); if (!cb) return;
      const upd = () => { if (btn) btn.disabled = !cb.checked || btn.dataset.waiting === '1'; if (cb.checked) consent.give(); else store.set('consent', 0); };
      cb.onchange = upd; upd();
    },
  };

  // ---------- settings ----------
  const DEF = { quality: 'auto', text: 1, captions: true, cb: false, voice: true };
  const settings = Object.assign({}, DEF, store.get('settings', {}));
  const save = () => store.set('settings', settings);
  function applyCss() {
    document.documentElement.style.setProperty('--fs', settings.text);
    document.documentElement.classList.toggle('cbsafe', !!settings.cb);
  }
  const autoQuality = () => (Math.min(innerWidth, innerHeight) < 700 || /Android|iPhone|iPad/i.test(navigator.userAgent)) ? 'medium' : 'high';
  function quality() { return settings.quality === 'auto' ? (store.get('autoLow', false) ? 'low' : autoQuality()) : settings.quality; }
  const markerColor = () => settings.cb ? '#1f77ff' : '#ffd400';

  // fps watchdog: switch to low quality when the device struggles (auto mode only)
  const fps = { acc: 0, n: 0, low: 0, cb: null,
    tick(dt) {
      if (settings.quality !== 'auto' || quality() === 'low') return;
      this.acc += dt; this.n++;
      if (this.acc >= 2) { const f = this.n / this.acc; this.acc = 0; this.n = 0; this.low = f < 25 ? this.low + 1 : 0;
        if (this.low >= 3) { store.set('autoLow', true); this.cb && this.cb('low'); } }
    } };

  function settingsHtml() {
    const q = settings.quality, opt = (v, l) => `<option value="${v}" ${q === v ? 'selected' : ''}>${escH(t(l))}</option>`;
    return `<h2>⚙️ ${escH(t('Settings'))}</h2>
      <p><b>${escH(t('Language'))}</b></p><div class="row" id="slLangs">${LANGS.map(l => `<button data-lang="${l.id}" class="${l.id === lang ? 'primary' : ''}">${escH(l.name)}</button>`).join('')}</div>
      <p class="muted" style="font-size:.85rem">${escH(t('Yorùbá, Hausa and Igbo are draft translations being reviewed. Untranslated text shows in English.'))}</p>
      <p><b>${escH(t('Graphics quality'))}</b></p><select id="slQ">${opt('auto', 'Automatic')}${opt('low', 'Low (old phones)')}${opt('medium', 'Medium')}${opt('high', 'High')}</select>
      <p><b>${escH(t('Text size'))}</b></p><div class="row">${[[1, 'A'], [1.15, 'A+'], [1.3, 'A++']].map(([v, l]) => `<button data-fs="${v}" class="${settings.text == v ? 'primary' : ''}">${l}</button>`).join('')}</div>
      <p><label><input type="checkbox" id="slCap" ${settings.captions ? 'checked' : ''}> ${escH(t('Show captions for spoken words'))}</label></p>
      <p><label><input type="checkbox" id="slVoice" ${settings.voice ? 'checked' : ''}> ${escH(t('Read questions aloud'))}</label></p>
      <p><label><input type="checkbox" id="slCb" ${settings.cb ? 'checked' : ''}> ${escH(t('Colour-blind friendly markers'))}</label></p>
      <p class="muted" style="font-size:.85rem">${escH(t('Keyboard: WASD or arrows to move, E to interact, 1/2/3 to choose an answer, V to change view.'))}</p>
      <div class="row" style="margin-top:10px"><button class="primary" id="slClose">${escH(t('Done'))}</button></div>`;
  }
  // open the settings modal; onChange(kind) lets the page re-apply (kind: 'quality'|'lang'|'other')
  function openSettings(openModal, closeModal, onChange) {
    const m = openModal(settingsHtml());
    const ch = (k) => { save(); applyCss(); onChange && onChange(k); };
    m.querySelectorAll('[data-lang]').forEach(b => b.onclick = () => { setLang(b.dataset.lang); closeModal(); onChange && onChange('lang'); });
    m.querySelector('#slQ').onchange = e => { settings.quality = e.target.value; store.set('autoLow', false); ch('quality'); };
    m.querySelectorAll('[data-fs]').forEach(b => b.onclick = () => { settings.text = +b.dataset.fs; m.querySelectorAll('[data-fs]').forEach(x => x.classList.toggle('primary', x === b)); ch('other'); });
    m.querySelector('#slCap').onchange = e => { settings.captions = e.target.checked; ch('other'); };
    m.querySelector('#slVoice').onchange = e => { settings.voice = e.target.checked; ch('other'); };
    m.querySelector('#slCb').onchange = e => { settings.cb = e.target.checked; ch('cb'); };
    m.querySelector('#slClose').onclick = () => { closeModal(); };
  }

  // ---------- captions + speech ----------
  let capTimer = 0;
  function caption(text, ms = 4500) {
    if (!settings.captions || !text) return;
    let el = document.getElementById('slCaption');
    if (!el) { el = document.createElement('div'); el.id = 'slCaption'; el.setAttribute('data-notr', ''); document.body.appendChild(el); }
    el.textContent = text; el.classList.add('on'); clearTimeout(capTimer); capTimer = setTimeout(() => el.classList.remove('on'), ms);
  }
  function speak(text) {
    caption(text);
    if (!settings.voice || !window.speechSynthesis) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(String(text).replace(/[\u{1F300}-\u{1FAFF}☀-➿]/gu, ''));
      const want = (LANGS.find(l => l.id === lang) || {}).voice || 'en', vs = speechSynthesis.getVoices();
      u.voice = vs.find(v => v.lang.toLowerCase().startsWith(want)) || vs.find(v => /en-NG/i.test(v.lang)) || vs.find(v => /en-GB/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)) || null;
      u.rate = .95; speechSynthesis.speak(u);
    } catch (e) {}
  }
  const stopSpeak = () => { try { speechSynthesis.cancel(); } catch (e) {} };

  // number keys answer the open question (1 = first option ...)
  addEventListener('keydown', e => {
    if (!/^Digit[1-9]$/.test(e.code) || e.target.tagName === 'INPUT') return;
    const btns = [...document.querySelectorAll('.modal .opts button:not([disabled]), .modal .ppe-grid button:not([disabled])')];
    const b = btns[+e.code.slice(5) - 1]; if (b) { e.preventDefault(); b.click(); }
  }, true);

  // ---------- LMS (SCORM 1.2) ----------
  // When a game runs inside an LMS (TalentLMS, Moodle, ...) the LMS puts a SCORM 1.2 `API` object on a
  // parent (or opener) window. We initialise on load, pre-fill the learner's name, and report the
  // result from SL.post(): score (0-100) and passed/failed. A pass finishes the attempt at once;
  // a fail is committed (so the learner can replay in the same attempt) and finished when the page closes.
  const lms = (() => {
    let api = null, state = 'none', t0 = Date.now(); // state: none | open | finished
    function find(w) {
      for (let i = 0; w && i < 10; i++) {
        try { if (w.API && typeof w.API.LMSInitialize === 'function') return w.API; } catch (e) {} // cross-origin parent
        try { if (!w.parent || w.parent === w) break; w = w.parent; } catch (e) { break; }
      }
      return null;
    }
    try { if (window.parent !== window) api = find(window.parent); } catch (e) {}
    if (!api) try { if (window.opener) api = find(window.opener); } catch (e) {}
    const call = (fn, ...a) => { try { return api[fn](...a); } catch (e) { return ''; } };
    const set = (k, v) => call('LMSSetValue', k, String(v));
    function init() {
      if (!api || state !== 'none') return;
      if (String(call('LMSInitialize', '')) !== 'true') { api = null; return; }
      state = 'open'; t0 = Date.now();
      const st = String(call('LMSGetValue', 'cmi.core.lesson_status') || '');
      if (!st || st === 'not attempted') { set('cmi.core.lesson_status', 'incomplete'); call('LMSCommit', ''); }
    }
    function studentName() {
      if (!api) return '';
      const raw = String(call('LMSGetValue', 'cmi.core.student_name') || '').trim(); // SCORM 1.2: "Last, First"
      const m = raw.match(/^([^,]+),\s*(.+)$/);
      return m ? (m[2] + ' ' + m[1]).trim() : raw;
    }
    const sessionTime = () => { // HHHH:MM:SS.SS
      let s = Math.max(0, (Date.now() - t0) / 1000); const h = Math.floor(s / 3600); s -= h * 3600; const mi = Math.floor(s / 60); s -= mi * 60;
      return String(h).padStart(4, '0') + ':' + String(mi).padStart(2, '0') + ':' + s.toFixed(2).padStart(5, '0');
    };
    const PASS = /^(PASS|PASSED|GOLD|SILVER|BRONZE|COMPLETE|COMPLETED|CLEARED)\b/i;
    function finish() { if (state !== 'open') return; set('cmi.core.session_time', sessionTime()); call('LMSCommit', ''); call('LMSFinish', ''); state = 'finished'; }
    // rec: {result, score?} -> {passed, score} sent to the LMS; false when not in an LMS
    function report(rec) {
      if (!api) return false;
      init(); if (state !== 'open') return false;
      const passed = PASS.test(String(rec && rec.result || ''));
      let score = Number(rec && rec.score);
      score = isFinite(score) && rec.score !== '' && rec.score != null ? Math.round(Math.max(0, Math.min(100, score))) : (passed ? 100 : 0);
      set('cmi.core.score.min', 0); set('cmi.core.score.max', 100); set('cmi.core.score.raw', score);
      set('cmi.core.lesson_status', passed ? 'passed' : 'failed');
      set('cmi.core.exit', passed ? '' : 'suspend');
      call('LMSCommit', '');
      if (passed) finish();
      return { passed, score };
    }
    if (api) { document.readyState === 'loading' ? addEventListener('DOMContentLoaded', init) : init(); addEventListener('pagehide', finish); addEventListener('beforeunload', finish); }
    return { get active() { return !!api; }, get state() { return state; }, init, report, finish, studentName, _api: () => api };
  })();

  // ---------- results: server / Google Sheets / offline queue ----------
  const isClaude = () => /claude\.ai|claudeusercontent/.test(location.hostname);
  const onWeb = () => /^https?:$/.test(location.protocol) && !isClaude();
  const ownSite = () => onWeb() && !lms.active && typeof SL_OFFLINE_FILE === 'undefined'; // our own server (not an LMS, not a copied offline file)
  const sheetsUrl = () => QS.get('results') || '';
  function targets() {
    const t2 = [];
    if (ownSite()) t2.push({ url: 'api/result', mode: 'json' });
    if (sheetsUrl()) t2.push({ url: sheetsUrl(), mode: 'sheets' });
    return t2;
  }
  // -> {status: 'sent'|'retry'|'rejected', json}
  async function sendOne(tg, payload) {
    if (tg.mode === 'sheets') { // Apps Script web apps do not answer CORS; send as simple text and trust it arrived
      await fetch(tg.url, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
      return { status: 'sent', json: null };
    }
    const r = await fetch(tg.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (r.ok) { let json = null; try { json = await r.json(); } catch (e) {} return { status: 'sent', json }; }
    // 4xx (bad data, no such endpoint) will never succeed: do not keep it in the queue. 408/429/5xx: try again later.
    return { status: r.status >= 400 && r.status < 500 && r.status !== 408 && r.status !== 429 ? 'rejected' : 'retry', json: null };
  }

  // Offline queue: IndexedDB ('site-life' / 'queue'), falling back to localStorage when IndexedDB is
  // blocked (private mode, sandboxed frames). Max 50 items; flushed on load and when back online.
  const QMAX = 50;
  const idb = (() => {
    let dbp = null;
    function open() {
      if (!dbp) dbp = new Promise((res, rej) => {
        try {
          const r = indexedDB.open('site-life', 1);
          r.onupgradeneeded = () => r.result.createObjectStore('queue', { keyPath: 'k', autoIncrement: true });
          r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); r.onblocked = () => rej(new Error('blocked'));
        } catch (e) { rej(e); }
      });
      return dbp;
    }
    function run(mode, fn) {
      return open().then(db => new Promise((res, rej) => {
        const tx = db.transaction('queue', mode), st = tx.objectStore('queue'); let out;
        fn(st, v => { out = v; });
        tx.oncomplete = () => res(out); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error);
      }));
    }
    return {
      all: () => run('readonly', (st, done) => { const r = st.getAll(); r.onsuccess = () => done(r.result); }),
      add: (x) => run('readwrite', (st) => {
        st.add(x);
        const c = st.getAllKeys(); c.onsuccess = () => { const ks = c.result; for (let i = 0; i < ks.length - QMAX; i++) st.delete(ks[i]); };
      }),
      del: (keys) => run('readwrite', (st) => keys.forEach(k => st.delete(k))),
    };
  })();
  let useIdb = typeof indexedDB !== 'undefined';
  const lsQueue = { all: () => store.get('queue', []), set: (q) => store.set('queue', q.slice(-QMAX)) };
  const emit = (name, detail) => { try { dispatchEvent(new CustomEvent(name, { detail })); } catch (e) {} };
  let flushing = null;
  const queue = {
    // all queued items: [{tg, p, at}]
    async all() {
      if (useIdb) try { return (await idb.all()).map(({ k, ...x }) => x).concat(lsQueue.all()); } catch (e) { useIdb = false; }
      return lsQueue.all();
    },
    async size() { return (await this.all()).length; },
    async add(x) {
      x = Object.assign({ at: Date.now() }, x);
      if (useIdb) try { await idb.add(x); return; } catch (e) { useIdb = false; }
      const q = lsQueue.all(); q.push(x); lsQueue.set(q);
    },
    // send everything waiting; returns how many were sent. Fires a 'sl-sent' event {id, payload} per sent result.
    flush() {
      if (flushing) return flushing;
      flushing = (async () => {
        let sent = 0;
        const tryItem = async (item) => {
          try { const r = await sendOne(item.tg, item.p); if (r.status === 'sent') { sent++; emit('sl-sent', { id: r.json && r.json.id || null, payload: item.p }); } return r.status !== 'retry'; }
          catch (e) { return false; }
        };
        if (useIdb) try {
          const items = await idb.all(), done = [];
          for (const it of items) if (await tryItem(it)) done.push(it.k);
          if (done.length) await idb.del(done);
        } catch (e) { useIdb = false; }
        // localStorage queue (older versions of the game, or no IndexedDB): move to IndexedDB or retry here
        const old = lsQueue.all();
        if (old.length) { const left = []; for (const it of old) if (!(await tryItem(it))) left.push(it); lsQueue.set(left); }
        return sent;
      })().finally(() => { flushing = null; });
      return flushing;
    },
  };
  let lastId = null, lastResponse = null;
  // Send a game result. Also reports it to the LMS when running inside one (SCORM 1.2).
  // Resolves 'sent' | 'queued' | 'none' (no target configured) | 'noconsent'.
  // The server answers {ok:true, id}: the id is in SL.lastId and is passed to cb({status, id, json}) when given.
  async function post(payload, cb) {
    try { lms.report(payload); } catch (e) {}
    const done = (status, id = null, json = null) => { if (cb) try { cb({ status, id, json }); } catch (e) {} return status; };
    const tg = targets(); if (!tg.length) return done('none');
    if (!consent.ok()) return done('noconsent');
    payload = Object.assign({ lang, client: navigator.userAgent.slice(0, 80) }, payload);
    let any = false, id = null, json = null;
    for (const x of tg) {
      try {
        const r = await sendOne(x, payload);
        if (r.status === 'sent') { any = true; if (r.json) { json = r.json; if (r.json.id != null) id = r.json.id; } }
        else if (r.status === 'retry') await queue.add({ tg: x, p: payload });
      } catch (e) { await queue.add({ tg: x, p: payload }).catch(() => {}); }
    }
    if (any) { lastId = id; lastResponse = json; }
    return done(any ? 'sent' : 'queued', id, json);
  }
  // Link to the printable certificate for a result id from our server; null when there is no server.
  const certLink = (id) => (id != null && id !== '' && ownSite()) ? 'cert/' + encodeURIComponent(id) : null;

  addEventListener('online', () => queue.flush());
  const flushSoon = () => setTimeout(() => queue.flush(), 1500);
  document.readyState === 'complete' ? flushSoon() : addEventListener('load', flushSoon);

  // installable offline app (only on our own web server; not inside an LMS or for the copied offline files)
  if (ownSite()) {
    const head = document.head || document.documentElement;
    const addTag = (tag, attrs) => { if (head.querySelector(`${tag}[${Object.keys(attrs)[0]}="${Object.values(attrs)[0]}"]`)) return; const el = document.createElement(tag); for (const k in attrs) el.setAttribute(k, attrs[k]); head.appendChild(el); };
    if (!head.querySelector('link[rel="manifest"]')) addTag('link', { rel: 'manifest', href: 'manifest.webmanifest' });
    if (!head.querySelector('meta[name="theme-color"]')) addTag('meta', { name: 'theme-color', content: '#0f7a4f' });
    addTag('link', { rel: 'apple-touch-icon', href: 'icons/apple-touch-icon.png' });
    if ('serviceWorker' in navigator) {
      const reg = () => navigator.serviceWorker.register('sw.js').catch(() => {});
      document.readyState === 'complete' ? reg() : addEventListener('load', reg);
    }
  }

  applyCss();
  return { QS, store, t, LANGS, get lang() { return lang; }, setLang, misses, consent, settings, quality, markerColor, fps, openSettings, caption, speak, stopSpeak,
    post, queue, get lastId() { return lastId; }, get lastResponse() { return lastResponse; }, certLink, lms, onWeb, ownSite, isClaude, escH };
})();
const tr = SL.t;
