// End-to-end playthrough of all three games in headless Chromium.
// Usage (from safety-game/):  bash tests/setup.sh  &&  node tests/playthrough.js [factory|advanced|oga|home|school|market|water|online|little ...]
// Env: BASE_URL (default file://.../index.html dir), HEADED=1 to watch.
// The games are driven by calling update() directly: software WebGL in CI renders ~1 fps,
// so waiting on requestAnimationFrame is far too slow (see CLAUDE.md "Testing").
const path = require('path'), fs = require('fs');
let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(path.join(require('child_process').execSync('npm root -g').toString().trim(), 'playwright'))); }
const ROOT = path.resolve(__dirname, '..');
const VENDOR = path.join(__dirname, 'vendor');
const BASE = process.env.BASE_URL || 'file://' + ROOT + '/';
const KIDS = ['home', 'school', 'market', 'water', 'online'];
const want = process.argv.slice(2).length ? process.argv.slice(2) : ['factory', 'advanced', 'oga', 'builder', ...KIDS, 'little'];
// Screenshots of the newer kids worlds (player x, y, camera yaw), written to tests/out/<world>-<n>.png
const SHOTS = { market: [[120, 500, -0.6], [700, 690, 0.4], [1060, 1060, -1.2]], water: [[150, 480, -0.7], [360, 810, 2.6], [1250, 790, 2.9]], online: [[600, 560, 0.3], [330, 320, 0.2], [700, 760, 2.8]] };
const LANG = process.env.GAME_LANG || '';               // e.g. GAME_LANG=pcm to play in Pidgin
const withLang = (u) => LANG ? u + (u.includes('?') ? '&' : '?') + 'lang=' + LANG : u;
const MISSES = new Set(), RECHECKED = new Set();        // untranslated on-screen strings (written to tests/out/)
// SL.misses also holds text that is already translated: the page's MutationObserver re-reads every node it has just
// translated, and output with an emoji prefix or from a {0} pattern is not recognised as a translation. Split those out.
async function collectMisses(p) {
  if (!LANG) return;
  const r = await p.evaluate(() => {
    const d = (typeof SL_I18N !== 'undefined' && SL_I18N[SL.lang]) || {}, vals = new Set(Object.values(d));
    const esc = x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pats = Object.entries(d).filter(([k]) => k.includes('{0}')).map(([, v]) => new RegExp('^' + v.split(/\{\d\}/).map(esc).join('(.+?)') + '$'));
    const PREFIX = /^([\s\p{Extended_Pictographic}\p{S}\p{P}‍️]*?)([\p{L}"'(].*?)([\s.!?…:]*)$/su;
    const isOut = x => { const m = x.match(PREFIX), forms = m ? [x, m[2] + m[3], m[2]] : [x]; return forms.some(f => vals.has(f) || pats.some(re => re.test(f))); };
    const all = [...SL.misses]; return { miss: all.filter(x => !isOut(x)), done: all.filter(isOut) };
  });
  r.miss.forEach(x => MISSES.add(x)); r.done.forEach(x => RECHECKED.add(x));
}
const fail = (m) => { console.error('FAIL:', m); process.exitCode = 1; };

async function page(browser, url, viewport = { width: 900, height: 620 }) {
  const p = await browser.newPage({ viewport });
  const three = path.join(VENDOR, 'three.min.js'), sky = path.join(VENDOR, 'Sky.js');
  if (fs.existsSync(three)) {
    await p.route('**/three.min.js', r => r.fulfill({ body: fs.readFileSync(three), contentType: 'application/javascript' }));
    await p.route('**/Sky.js', r => r.fulfill({ body: fs.readFileSync(sky), contentType: 'application/javascript' }));
  }
  p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') p.errs.push(m.text().slice(0, 200)); });
  await p.goto(withLang(url)); await p.waitForTimeout(3500);
  return p;
}
const step = (p, n, code) => p.evaluate(([n, code]) => { if (code) (new Function(code))(); for (let i = 0; i < n && !paused && !S.over; i++) update(0.05); render3D(.05); drawHUD(); }, [n, code || null]);

async function factory(browser, q = '') {
  const label = q ? 'factory' + q : 'factory';
  const p = await page(browser, BASE + 'index.html' + q);
  await p.fill('#nm', 'Test Player'); await p.fill('#co', 'QA Ltd'); await p.check('#slConsent'); await p.click('#spin'); await p.waitForTimeout(1500); await p.click('#start'); await p.waitForTimeout(300);
  const okTexts = await p.evaluate(() => [...Object.values(SC), ...Object.values(EVENTS)].flatMap(s => s.o.filter(o => o.ok).flatMap(o => [o.t, SL.t(o.t)])));   // English + translated (GAME_LANG)
  async function resolve() {
    for (let k = 0; k < 8; k++) {
      const bs = await p.$$('.modal [data-i]');
      if (bs.length) { for (const b of bs) if (okTexts.includes(await b.innerText())) { await b.click(); break; } await p.click('#cont'); continue; }
      if (await p.$('.ppe-grid')) { for (const k2 of await p.evaluate(() => requiredPPE())) await p.click(`[data-k="${k2}"]`); await p.click('#wear'); await p.click('#cont'); continue; }
      if (await p.$('#r1')) { const h = await p.evaluate(() => S.near && S.items.find(i => i.x === S.near.x && i.y === S.near.y).hazard); await p.click(h ? '#r1' : '#r2'); await p.click('#cont'); continue; }
      if (await p.$('#b2')) { await p.click('#b2'); continue; }
      if (await p.$('#go')) { await p.click('#go'); continue; }
      break;
    }
  }
  const at = async (x, y) => { await resolve(); await step(p, 2, `S.p.x=${x};S.p.y=${y};`); await resolve(); };
  await at(160, 1200);
  for (const [, x, y] of await p.evaluate(() => ZONES.filter(z => z.r && z.id !== 'gate').map(z => [z.id, z.x, z.y]))) await at(x, y);
  for (const [x, y] of await p.evaluate(() => S.items.map(i => [i.x, i.y]))) { await at(x, y); await p.evaluate(() => doAct()); await resolve(); }
  await at(670, 440); await p.evaluate(() => { S.p.x = 1360; S.p.y = S.van.y - 60; }); await step(p, 2); await resolve(); await at(1470, 1000);
  for (let i = 0; i < 25; i++) { await resolve(); if (await p.evaluate(() => !!S.alarm)) break; await p.waitForTimeout(1000); }   // alarm starts on a real 5 s timer
  await resolve(); await step(p, 2, 'S.p.x=1470;S.p.y=1000;'); await p.waitForTimeout(300);
  const st = await p.evaluate(() => ({ zones: Object.keys(S.results).length, of: ZONES.length, haz: S.hazFound, over: S.over }));
  const title = await p.$eval('.modal h1', e => e.innerText).catch(() => '');
  await collectMisses(p);
  console.log(label, JSON.stringify(st), title);
  const passT = await p.evaluate(() => SL.t('Induction passed!'));
  if (!(/passed/i.test(title) || title.includes(passT)) || st.zones !== st.of) fail(label + ' did not pass');
  if (p.errs.length) fail(label + ' errors: ' + p.errs.join(' | '));
  await p.close();
}

async function oga(browser) {
  const p = await page(browser, BASE + 'index.html?mode=oga');
  await p.fill('#nm', 'Oga Test'); await p.check('#slConsent'); await p.click('#start'); await p.waitForTimeout(300);
  const okT = await p.evaluate(() => SITE.oga.incidents.flatMap(i => i.o.filter(o => o.ok).flatMap(o => [o.t, SL.t(o.t)])));
  async function resolve() {
    for (let k = 0; k < 6; k++) {
      const bs = await p.$$('.modal [data-i]');
      if (bs.length) { for (const b of bs) if (okT.includes(await b.innerText())) { await b.click(); break; } await p.click('#cont'); continue; }
      break;
    }
  }
  for (let i = 0; i < 40 && !(await p.evaluate(() => S.over)); i++) {
    await step(p, 2, 'S.oga.next=0;');
    for (const [x, y] of await p.evaluate(() => S.oga.active.map(a => [a.inc.x, a.inc.y]))) { await step(p, 2, `S.p.x=${x};S.p.y=${y + 20};`); await resolve(); }
  }
  const st = await p.evaluate(() => ({ log: S.oga.log.length, ok: S.oga.log.filter(l => l.ok).length, over: S.over }));
  const title = await p.$eval('.modal h1', e => e.innerText).catch(() => '');
  await collectMisses(p);
  console.log('oga', JSON.stringify(st), title);
  const ogaT = await p.evaluate(() => SL.t('Good Oga!'));
  if (!(/good oga/i.test(title) || title.includes(ogaT)) || st.ok !== st.log) fail('oga did not pass');
  if (p.errs.length) fail('oga errors: ' + p.errs.join(' | '));
  await p.close();
}

// Site builder: add a zone with its own question, press Play test, and check the factory loads the draft.
async function builder(browser) {
  const p = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  await p.goto(BASE + 'builder.html'); await p.evaluate(() => localStorage.removeItem('sl-site-draft')); await p.reload();
  await p.click('#addZ'); await p.fill('#sname', 'Test Site Ltd');
  const before = await p.evaluate(() => site.zones.length);
  p.once('dialog', d => d.accept());
  const three = path.join(VENDOR, 'three.min.js'), sky = path.join(VENDOR, 'Sky.js');
  if (fs.existsSync(three)) { await p.route('**/three.min.js', r => r.fulfill({ body: fs.readFileSync(three), contentType: 'application/javascript' })); await p.route('**/Sky.js', r => r.fulfill({ body: fs.readFileSync(sky), contentType: 'application/javascript' })); }
  await p.click('#play'); await p.waitForTimeout(4000);
  const st = await p.evaluate(() => ({ custom: !!SITE._custom, name: SITE.name, zones: ZONES.length, q: !!zoneScenario(ZONES[ZONES.length - 2].id) }));
  console.log('builder', JSON.stringify(st), before);
  if (!st.custom || st.name !== 'Test Site Ltd' || st.zones !== before || !st.q) fail('builder draft did not load in the game');
  if (p.errs.length) fail('builder errors: ' + p.errs.join(' | '));
  await p.close();
}

async function kids(browser, world) {
  const p = await page(browser, BASE + 'kids.html?world=' + world + '&class=Test-Class_1');
  await p.fill('#nm', 'Ada'); await p.check('#slConsent'); await p.click('#start'); await p.waitForTimeout(300);
  await p.evaluate(() => { const o = SL.post; SL.post = (x, cb) => { window.__res = x; return o(x, cb); }; });   // capture the posted result
  const okT = await p.evaluate(() => MISS.filter(m => m.q).flatMap(m => m.q.o.filter(o => o.ok).flatMap(o => [o.t, SL.t(o.t)])));
  if (SHOTS[world]) {
    fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });
    const s0 = await p.evaluate(() => [S.p.x, S.p.y]);
    for (const [i, [x, y, yw]] of SHOTS[world].entries()) { await step(p, 0, `S.p.x=${x};S.p.y=${y};yaw=${yw};`); await step(p, 0); await p.screenshot({ path: path.join(__dirname, 'out', `${world}-${i + 1}.png`), timeout: 240000 }); }
    await step(p, 0, `S.p.x=${s0[0]};S.p.y=${s0[1]};yaw=0;`);
  }
  async function resolve() {
    for (let k = 0; k < 8; k++) {
      const bs = await p.$$('.modal [data-i]');
      if (bs.length) { for (const b of bs) if (okT.includes(await b.innerText())) { await b.click(); break; } await p.click('#cont'); continue; }
      if (await p.$('#r1')) { const h = await p.evaluate(() => { const it = S.items.find(i => S.near && i.x === S.near.x && i.y === S.near.y); return it && it.h; }); await p.click(h ? '#r1' : '#r2'); await p.click('#cont'); continue; }
      if (await p.$('#b2')) { await p.click('#b2'); continue; }
      if (await p.$('#go')) { await p.click('#go'); continue; }
      break;
    }
  }
  const at = async (x, y) => { await resolve(); await step(p, 2, `S.p.x=${x};S.p.y=${y};`); await resolve(); };
  for (const [x, y] of await p.evaluate(() => S.items.map(i => [i.x, i.y]))) { await at(x, y); await p.evaluate(() => doAct()); await resolve(); }
  for (const [id, x, y] of await p.evaluate(() => MISS.map(m => [m.id, m.x, m.y]))) {
    if (id === 'zebra') { const [zx, zy] = await p.evaluate(() => { const z = ZEBRAS[0]; return [(z.x1 + z.x2) / 2, (z.y1 + z.y2) / 2]; }); await at(zx, zy); continue; }
    if (id === 'board') for (let i = 0; i < 80 && !(await p.evaluate(() => S.bus.state === 'parked')); i++) await step(p, 5);
    await at(x, y);
  }
  if (world !== 'school') { for (let i = 0; i < 150 && !(await p.evaluate(() => S.over)); i++) await step(p, 5); }   // bus ride / end ride
  else { for (let i = 0; i < 12; i++) { await resolve(); if (await p.evaluate(() => !!S.drill)) break; await p.waitForTimeout(1000); } await resolve(); await step(p, 3, 'S.p.x=750;S.p.y=760;'); }
  await p.waitForTimeout(300);
  const st = await p.evaluate(() => ({ done: Object.keys(S.results).length, of: MISS.length, stars: S.stars, hearts: S.hearts, haz: S.hazFound + '/' + S.hazTotal }));
  const title = await p.$eval('.modal h1', e => e.innerText).catch(() => '');
  await collectMisses(p);
  console.log(world, JSON.stringify(st), title);
  const winT = await p.evaluate(() => SL.t('You did it!'));
  if (!(/did it/i.test(title) || title.includes(winT)) || st.done !== st.of) fail(world + ' did not finish');
  const res = await p.evaluate(() => window.__res || null);
  if (!res) fail(world + ' posted no result');
  else {
    console.log('  result: class=' + res.class + ' zoneTimes=' + JSON.stringify(res.zoneTimes) + ' missed=' + JSON.stringify(res.missed));
    if (res.class !== 'Test-Class1') fail(world + ' class code missing or not sanitised');
    if (Object.keys(res.zoneTimes || {}).length !== st.of) fail(world + ' zoneTimes incomplete');
    if (!Array.isArray(res.missed)) fail(world + ' missed list missing');
  }
  if (p.errs.length) fail(world + ' errors: ' + p.errs.join(' | '));
  await p.close();
}

// Little Stars (3–6): plays all 10 scenes as two "Play 5 in a row" runs on a phone-sized page, with one deliberate
// wrong tap (gentle retry + hint, no fail), checks every sticker and the posted results, and takes screenshots of the
// menu and every scene (phone) plus the menu and 5 scenes at desktop size -> tests/out/little-*.png
async function little(browser) {
  const OUT = path.join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true });
  const shot = async (p, name) => { await p.evaluate(() => { if (window.LS && LS.state().scene) LS.render(); }); await p.screenshot({ path: path.join(OUT, 'little-' + name + '.png'), timeout: 240000 }); };
  const p = await page(browser, BASE + 'little.html?class=Test-Class_1', { width: 390, height: 844 });
  await p.evaluate(() => { localStorage.removeItem('sl-little-stickers'); localStorage.removeItem('sl-little-kid'); localStorage.removeItem('sl-little-phone'); });
  await p.reload(); await p.waitForTimeout(3000);
  await p.evaluate(() => { requestAnimationFrame = () => 0; });   // drive frames from the test (software WebGL is slow)
  await p.fill('#nm', 'Ada'); await p.fill('#pn', 'Mummy Ngozi'); await p.fill('#ph', '08031234567'); await p.check('#slConsent');
  await shot(p, 'start-phone');
  await p.click('#start'); await p.waitForTimeout(300);
  await p.evaluate(() => { window.__res = []; const o = SL.post; SL.post = (x, cb) => { window.__res.push(x); return o(x, cb); }; });   // capture posted results
  await shot(p, 'menu-phone');
  const tap = (id) => p.evaluate((id) => { const c = document.querySelector('[data-card="' + id + '"]'); if (c && !(ENT[id] && ENT[id].on)) { c.click(); return 'card'; } return LS.tapId(id); }, id);
  let wrongDone = false;
  async function playScene() {
    const st0 = await p.evaluate(() => LS.state());
    await p.evaluate(() => LS.flush());
    await shot(p, st0.scene + '-phone');
    for (let i = 0; i < 400; i++) {
      const st = await p.evaluate(() => LS.state());
      if (st.modal) break;
      if (st.scene === 'hot' && !wrongDone && st.step === 0 && !st.busy) {   // deliberate wrong taps: gentle retry, then a hint, never a fail
        wrongDone = true;
        const r1 = await tap('banana'); const s1 = await p.evaluate(() => LS.state());
        const want = await p.evaluate(() => SL.t("That is a banana. It is not hot. Let's try again."));
        if (r1 !== 'no' || s1.misses !== 1 || s1.modal || s1.step !== 0) fail('little: wrong tap not handled gently ' + JSON.stringify(s1));
        if (s1.caption !== want) fail('little: wrong-tap line not spoken: ' + s1.caption);
        await tap('teddy'); const s2 = await p.evaluate(() => LS.state());
        if (!s2.hint || s2.misses !== 2) fail('little: no hint after two misses ' + JSON.stringify(s2));
        await p.evaluate(() => LS.step(2, .1)); await shot(p, 'hint-phone');
        console.log('  wrong taps: gentle retry ok, hint ok');
      }
      const n = await p.evaluate(() => LS.next());
      if (n) await tap(n); else await p.evaluate(() => LS.step(5, .2));
      await p.evaluate(() => LS.flush());
    }
    const st = await p.evaluate(() => LS.state());
    const title = await p.$eval('.modal h1', e => e.innerText).catch(() => '');
    if (!st.modal || !st.stickers.includes(st0.scene)) fail('little: scene ' + st0.scene + ' did not finish ' + JSON.stringify(st));
    console.log('  ' + st0.scene, 'sticker:', st.stickers.includes(st0.scene), title);
    return st0.scene;
  }
  async function run(label) {
    await p.click('#five'); await p.waitForTimeout(200);
    const ids = await p.evaluate(() => LS.state().run.ids);
    for (let i = 0; i < ids.length; i++) { await playScene(); if (i < ids.length - 1) await p.click('#next'); }
    await shot(p, 'end-' + label + '-phone');
    await p.click('#toBook'); await p.waitForTimeout(200);
    return ids;
  }
  const ids1 = await run('1'), ids2 = await run('2');
  await shot(p, 'menu-done-phone');
  const res = await p.evaluate(() => window.__res);
  const st = await p.evaluate(() => LS.state());
  console.log('little runs', JSON.stringify(ids1), JSON.stringify(ids2), 'stickers', st.stickers.length);
  if (st.stickers.length !== 10) fail('little: not every sticker earned');
  if (res.length !== 2) fail('little: expected 2 posted results, got ' + res.length);
  for (const [i, r] of res.entries()) {
    console.log('  result:', JSON.stringify(r));
    const want = [ids1, ids2][i];
    if (r.game !== 'little' || r.result !== 'COMPLETE' || r.role !== 'Child 3-6' || r.name !== 'Ada') fail('little: bad result ' + JSON.stringify(r));
    if (JSON.stringify(r.scenes) !== JSON.stringify(want) || r.stars !== 5) fail('little: scenes in result do not match the run');
    if (r.class !== 'Test-Class1') fail('little: class code missing or not sanitised');
    if (Object.keys(r.zoneTimes || {}).length !== 5) fail('little: zoneTimes incomplete');
    if (/0803|1234567/.test(JSON.stringify(r))) fail('little: the phone number must never be sent');
  }
  // desktop screenshots: menu and 5 scenes
  await p.setViewportSize({ width: 1280, height: 800 }); await p.waitForTimeout(200);
  await shot(p, 'menu-desktop');
  for (const id of ['hot', 'medicine', 'road', 'lost', 'hands']) { await p.evaluate((id) => { LS.play([id]); LS.flush(); LS.step(3, .05); }, id); await shot(p, id + '-desktop'); await p.evaluate(() => LS.showBook()); }
  await collectMisses(p);
  if (p.errs.length) fail('little errors: ' + p.errs.join(' | '));
  await p.close();
}

(async () => {
  const browser = await chromium.launch({ headless: !process.env.HEADED, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    if (want.includes('factory')) await factory(browser);
    if (want.includes('advanced')) await factory(browser, '?course=advanced');
    if (want.includes('oga')) await oga(browser);
    if (want.includes('builder')) await builder(browser);
    for (const w of KIDS) if (want.includes(w)) await kids(browser, w);
    if (want.includes('little')) await little(browser);
  } catch (e) { fail(e.stack || e.message); }
  await browser.close();
  if (LANG) { fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true }); fs.writeFileSync(path.join(__dirname, 'out', 'missing-' + LANG + '.json'), JSON.stringify([...MISSES].sort(), null, 1)); console.log('untranslated strings seen:', MISSES.size, '-> tests/out/missing-' + LANG + '.json', '(plus', RECHECKED.size, 'already-translated strings re-checked by the page)'); }
  console.log(process.exitCode ? 'SOME TESTS FAILED' : 'ALL PLAYTHROUGHS PASSED');
})();
