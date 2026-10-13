// Site Life shared features for all games. Built into pages by src/build.py.
// SL.consent  privacy notice and consent (NDPA 2023)
// SL.t        translation with English fallback; SL.lang current language
// SL.settings graphics quality, text size, captions, colour-blind palette
// SL.caption  on-screen captions for spoken text
// SL.post     send a result to our server / Google Sheets with an offline queue
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
  const PREFIX = /^([\s\p{Extended_Pictographic}\p{S}\p{P}‍️]*?)([\p{L}"'(].*?)([\s.!?…:]*)$/su;
  function trText(s) {
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
    const sub = v => v.split(', ').map(x => { const d2 = I18N[lang] || {}; return d2[x] != null ? d2[x] : x; }).join(', ');
    for (const p of PAT[lang] || []) {
      const mm = core.match(p.re); if (mm) return s.replace(core, p.out.replace(/\{(\d)\}/g, (_, i) => sub(mm[+i + 1])));
      if (m) { const m2 = (m[2] + m[3]).match(p.re); if (m2) return s.replace(core, m[1] + p.out.replace(/\{(\d)\}/g, (_, i) => sub(m2[+i + 1]))); }
    }
    if (core.length > 2 && core.length < 400) misses.add(core);
    return s;
  }
  function translateTree(root) {
    if (lang === 'en' || !root) return;
    if (root.nodeType === 3) { const v = trText(root.data); if (v !== root.data) root.data = v; return; }
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
    if (!el) { el = document.createElement('div'); el.id = 'slCaption'; document.body.appendChild(el); }
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

  // ---------- results: server / Google Sheets / offline queue ----------
  const isClaude = () => /claude\.ai|claudeusercontent/.test(location.hostname);
  const onWeb = () => /^https?:$/.test(location.protocol) && !isClaude();
  const sheetsUrl = () => QS.get('results') || '';
  function targets() {
    const t2 = [];
    if (onWeb()) t2.push({ url: 'api/result', mode: 'json' });
    if (sheetsUrl()) t2.push({ url: sheetsUrl(), mode: 'sheets' });
    return t2;
  }
  async function sendOne(tg, payload) {
    if (tg.mode === 'sheets') { // Apps Script web apps do not answer CORS; send as simple text and trust it arrived
      await fetch(tg.url, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
      return true;
    }
    const r = await fetch(tg.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    return r.ok;
  }
  const queue = {
    all() { return store.get('queue', []); },
    add(x) { const q = this.all(); q.push(x); store.set('queue', q.slice(-50)); },
    async flush() {
      const q = this.all(); if (!q.length) return 0; const left = []; let sent = 0;
      for (const item of q) { try { (await sendOne(item.tg, item.p)) ? sent++ : left.push(item); } catch (e) { left.push(item); } }
      store.set('queue', left); return sent;
    },
  };
  // returns 'sent' | 'queued' | 'none' (no target configured) | 'noconsent'
  async function post(payload) {
    const tg = targets(); if (!tg.length) return 'none';
    if (!consent.ok()) return 'noconsent';
    payload = Object.assign({ lang, client: navigator.userAgent.slice(0, 80) }, payload);
    let any = false;
    for (const x of tg) {
      try { if (await sendOne(x, payload)) any = true; else queue.add({ tg: x, p: payload }); }
      catch (e) { queue.add({ tg: x, p: payload }); }
    }
    return any ? 'sent' : 'queued';
  }
  addEventListener('online', () => queue.flush());
  setTimeout(() => queue.flush(), 3000);

  // installable offline app (only when served from our own web server)
  if (onWeb() && 'serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));

  applyCss();
  return { QS, store, t, LANGS, get lang() { return lang; }, setLang, misses, consent, settings, quality, markerColor, fps, openSettings, caption, speak, stopSpeak, post, queue, onWeb, isClaude, escH };
})();
const tr = SL.t;
