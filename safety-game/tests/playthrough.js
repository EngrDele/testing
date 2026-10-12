// End-to-end playthrough of all three games in headless Chromium.
// Usage (from safety-game/):  bash tests/setup.sh  &&  node tests/playthrough.js [factory|home|school ...]
// Env: BASE_URL (default file://.../index.html dir), HEADED=1 to watch.
// The games are driven by calling update() directly: software WebGL in CI renders ~1 fps,
// so waiting on requestAnimationFrame is far too slow (see CLAUDE.md "Testing").
const path = require('path'), fs = require('fs');
let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(path.join(require('child_process').execSync('npm root -g').toString().trim(), 'playwright'))); }
const ROOT = path.resolve(__dirname, '..');
const VENDOR = path.join(__dirname, 'vendor');
const BASE = process.env.BASE_URL || 'file://' + ROOT + '/';
const want = process.argv.slice(2).length ? process.argv.slice(2) : ['factory', 'home', 'school'];
const fail = (m) => { console.error('FAIL:', m); process.exitCode = 1; };

async function page(browser, url) {
  const p = await browser.newPage({ viewport: { width: 900, height: 620 } });
  const three = path.join(VENDOR, 'three.min.js'), sky = path.join(VENDOR, 'Sky.js');
  if (fs.existsSync(three)) {
    await p.route('**/three.min.js', r => r.fulfill({ body: fs.readFileSync(three), contentType: 'application/javascript' }));
    await p.route('**/Sky.js', r => r.fulfill({ body: fs.readFileSync(sky), contentType: 'application/javascript' }));
  }
  p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') p.errs.push(m.text().slice(0, 200)); });
  await p.goto(url); await p.waitForTimeout(3500);
  return p;
}
const step = (p, n, code) => p.evaluate(([n, code]) => { if (code) (new Function(code))(); for (let i = 0; i < n && !paused && !S.over; i++) update(0.05); render3D(.05); drawHUD(); }, [n, code || null]);

async function factory(browser) {
  const p = await page(browser, BASE + 'index.html');
  await p.fill('#nm', 'Test Player'); await p.fill('#co', 'QA Ltd'); await p.click('#spin'); await p.waitForTimeout(1500); await p.click('#start'); await p.waitForTimeout(300);
  const okTexts = await p.evaluate(() => [...Object.values(SC), ...Object.values(EVENTS)].flatMap(s => s.o.filter(o => o.ok).map(o => o.t)));
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
  console.log('factory', JSON.stringify(st), title);
  if (!/passed/i.test(title) || st.zones !== st.of) fail('factory did not pass');
  if (p.errs.length) fail('factory errors: ' + p.errs.join(' | '));
  await p.close();
}

async function kids(browser, world) {
  const p = await page(browser, BASE + 'kids.html?world=' + world);
  await p.fill('#nm', 'Ada'); await p.click('#start'); await p.waitForTimeout(300);
  const okT = await p.evaluate(() => MISS.filter(m => m.q).flatMap(m => m.q.o.filter(o => o.ok).map(o => o.t)));
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
    if (id === 'zebra') { await at(930, 880); continue; }
    if (id === 'board') for (let i = 0; i < 80 && !(await p.evaluate(() => S.bus.state === 'parked')); i++) await step(p, 5);
    await at(x, y);
  }
  if (world === 'home') { for (let i = 0; i < 150 && !(await p.evaluate(() => S.over)); i++) await step(p, 5); }
  else { for (let i = 0; i < 12; i++) { await resolve(); if (await p.evaluate(() => !!S.drill)) break; await p.waitForTimeout(1000); } await resolve(); await step(p, 3, 'S.p.x=750;S.p.y=760;'); }
  await p.waitForTimeout(300);
  const st = await p.evaluate(() => ({ done: Object.keys(S.results).length, of: MISS.length, stars: S.stars, hearts: S.hearts, haz: S.hazFound + '/' + S.hazTotal }));
  const title = await p.$eval('.modal h1', e => e.innerText).catch(() => '');
  console.log(world, JSON.stringify(st), title);
  if (!/did it/i.test(title) || st.done !== st.of) fail(world + ' did not finish');
  if (p.errs.length) fail(world + ' errors: ' + p.errs.join(' | '));
  await p.close();
}

(async () => {
  const browser = await chromium.launch({ headless: !process.env.HEADED, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    if (want.includes('factory')) await factory(browser);
    for (const w of ['home', 'school']) if (want.includes(w)) await kids(browser, w);
  } catch (e) { fail(e.stack || e.message); }
  await browser.close();
  console.log(process.exitCode ? 'SOME TESTS FAILED' : 'ALL PLAYTHROUGHS PASSED');
})();
