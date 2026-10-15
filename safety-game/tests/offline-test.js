// Offline app check (ROADMAP 5): on an http://localhost server the service worker registers, caches the
// pages and three.js, and after one visit the games load with the network off. Also checks that a result
// recorded offline waits in the IndexedDB queue and is sent (with the server's id) when back online.
// Usage (from safety-game/): node tests/offline-test.js
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = '1'; // let context.route serve the CDN files to the service worker
const path = require('path'), fs = require('fs'), { spawn, execSync } = require('child_process');
let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'))); }
const ROOT = path.resolve(__dirname, '..'), VENDOR = path.join(__dirname, 'vendor');
const PORT = 8300 + Math.floor(Math.random() * 300), BASE = `http://localhost:${PORT}/`;
let failed = 0; const fail = (m) => { console.error('FAIL:', m); failed = 1; }, ok = (m) => console.log('ok  ', m);
const CDN = { 'three.min.js': path.join(VENDOR, 'three.min.js'), 'Sky.js': path.join(VENDOR, 'Sky.js') };

async function routeCdn(ctx) { // the sandbox blocks the CDNs: serve the same files from tests/vendor
  for (const [name, file] of Object.entries(CDN))
    await ctx.route('**/' + name, r => r.fulfill({ body: fs.readFileSync(file), contentType: 'application/javascript', headers: { 'Access-Control-Allow-Origin': '*' } }));
}
const gameUp = (p) => p.waitForFunction(() => typeof SL !== 'undefined' && typeof G !== 'undefined' && !!G && !!document.querySelector('#start'), null, { timeout: 60000 });

async function swTest(browser, stopServer) {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 620 } }); await routeCdn(ctx);
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
  await p.goto(BASE + 'index.html'); await gameUp(p);
  const head = await p.evaluate(() => ({ manifest: !!document.querySelector('link[rel=manifest]'), theme: (document.querySelector('meta[name=theme-color]') || {}).content }));
  head.manifest && head.theme ? ok('manifest link and theme-color added (' + head.theme + ')') : fail('head tags ' + JSON.stringify(head));
  const scope = await p.evaluate(() => navigator.serviceWorker.ready.then(r => r.scope));
  ok('service worker registered, scope ' + scope);
  // wait for the install step to fill the cache
  let cached = [];
  for (let i = 0; i < 40; i++) {
    cached = await p.evaluate(async () => { const out = []; for (const k of await caches.keys()) for (const r of await (await caches.open(k)).keys()) out.push(r.url); return out; });
    if (cached.some(u => u.endsWith('kids.html')) && cached.some(u => u.endsWith('three.min.js')) && cached.some(u => u.endsWith('Sky.js'))) break;
    await p.waitForTimeout(250);
  }
  const short = cached.map(u => u.replace(BASE, '').replace(/^https:\/\/[^/]+\/.*\//, 'cdn:')).sort();
  for (const need of ['index.html', 'kids.html', 'little.html', 'warehouse.html', 'lite.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'cdn:three.min.js', 'cdn:Sky.js'])
    short.includes(need) ? ok('cached ' + need) : fail('not cached: ' + need + ' (have ' + short.join(', ') + ')');
  const manifest = await p.evaluate(() => fetch('manifest.webmanifest').then(r => r.json()));
  manifest.name === 'Site Life' && manifest.display === 'standalone' && manifest.icons.length >= 2 ? ok('manifest: ' + manifest.name + ', ' + manifest.display) : fail('manifest ' + JSON.stringify(manifest));
  if (errs.length) fail('online page errors: ' + errs.join(' | '));
  // (no page.reload(): reloading a SwiftShader game page under a service worker can stall in headless Chromium)
  await p.close(); await ctx.unrouteAll();

  // network off AND server stopped: the games must still start, from the service worker cache only
  await stopServer(); await ctx.setOffline(true);
  for (const url of ['index.html', 'kids.html?world=home', 'kids.html?world=school', 'little.html', 'warehouse.html']) {
    const q = await ctx.newPage(); const qe = [];
    q.on('pageerror', e => qe.push(e.message)); q.on('console', m => { if (m.type() === 'error') qe.push(m.text().slice(0, 200)); });
    await q.goto(BASE + url);
    try { await gameUp(q); const s = await q.evaluate(() => ({ three: !!window.THREE, sky: !!(window.THREE && THREE.Sky), sw: !!navigator.serviceWorker.controller, title: document.title }));
      s.three && s.sky && s.sw ? ok(`offline: ${url} loads from the service worker with three.js + Sky ("${s.title}")`) : fail('offline ' + url + ' ' + JSON.stringify(s)); }
    catch (e) { fail('offline: ' + url + ' did not start: ' + (await q.evaluate(() => (document.getElementById('loading') || {}).textContent).catch(() => '')) + ' ' + e.message); }
    if (qe.length) fail(url + ' offline errors: ' + qe.join(' | '));
    await q.close();
  }
  await ctx.close();
}

async function queueTest(browser) {
  // service workers blocked here so page.route sees the POSTs; the queue logic is in the page (SL.queue)
  const ctx = await browser.newContext({ serviceWorkers: 'block' }); await routeCdn(ctx);
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE + 'kids.html?world=home'); await gameUp(p);
  await p.evaluate(() => SL.consent.give());
  await ctx.setOffline(true);
  const r1 = await p.evaluate(() => SL.post({ game: 'home', name: 'Ada', role: 'Pupil', result: 'GOLD', stars: 12 }));
  const n1 = await p.evaluate(() => SL.queue.size());
  r1 === 'queued' && n1 === 1 ? ok('offline: result queued (' + n1 + ' in queue)') : fail(`offline post -> ${r1}, queue ${n1}`);
  const where = await p.evaluate(() => new Promise(res => { const r = indexedDB.open('site-life'); r.onsuccess = () => { const t = r.result.transaction('queue').objectStore('queue').count(); t.onsuccess = () => res(t.result); }; r.onerror = () => res(-1); }));
  where === 1 ? ok('queue is stored in IndexedDB') : fail('IndexedDB queue count ' + where);
  // back online: the server answers {ok:true,id}
  const got = [];
  await p.route('**/api/result', r => { got.push(JSON.parse(r.request().postData())); r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, id: 'r' + got.length }) }); });
  const sentEvt = p.evaluate(() => new Promise(res => addEventListener('sl-sent', e => res(e.detail.id), { once: true })));
  await ctx.setOffline(false);
  const id1 = await Promise.race([sentEvt, new Promise(r => setTimeout(() => r('timeout'), 8000))]);
  const n2 = await p.evaluate(() => SL.queue.size());
  got.length === 1 && got[0].name === 'Ada' && n2 === 0 && id1 === 'r1' ? ok('back online: queued result sent automatically (server id ' + id1 + ')') : fail(`flush: sent ${got.length}, left ${n2}, id ${id1}`);
  // online post: returns 'sent', exposes the id and the certificate link
  const r2 = await p.evaluate(() => new Promise(res => { let cbv = null; SL.post({ game: 'home', name: 'Bola', result: 'TRY AGAIN' }, v => cbv = v).then(s => res({ s, cbv, last: SL.lastId, link: SL.certLink(SL.lastId) })); }));
  r2.s === 'sent' && r2.last === 'r2' && r2.cbv && r2.cbv.id === 'r2' && r2.link === 'cert/r2' ? ok(`online: SL.post -> sent, SL.lastId=${r2.last}, SL.certLink -> ${r2.link}`) : fail('online post ' + JSON.stringify(r2));
  if (errs.length) fail('queue page errors: ' + errs.join(' | '));
  await ctx.close();
}

(async () => {
  const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const stopServer = () => new Promise(r => { if (srv.exitCode !== null || srv.signalCode !== null) return r(); srv.once('exit', r); srv.kill(); });
  try { await new Promise(r => setTimeout(r, 1000)); await queueTest(browser); await swTest(browser, stopServer); }
  catch (e) { fail(e.stack || e.message); }
  await browser.close(); await stopServer();
  console.log(failed ? 'OFFLINE TEST FAILED' : 'OFFLINE TEST PASSED'); process.exitCode = failed;
})();
