// Group session test: two players join the same group code through the results server;
// they must see each other, and a trainer event (NEPA) must reach the trainee.
// Usage (from safety-game/): node tests/room-test.js   (starts its own server on port 8099)
const path = require('path'), fs = require('fs'), { spawn } = require('child_process'), os = require('os');
let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(path.join(require('child_process').execSync('npm root -g').toString().trim(), 'playwright'))); }
const ROOT = path.resolve(__dirname, '..'), VENDOR = path.join(__dirname, 'vendor'), PORT = 8099;
const fail = (m) => { console.error('FAIL:', m); process.exitCode = 1; };
(async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'slroom-'));
  const srv = spawn('python3', ['server/sitelife_server.py'], { cwd: ROOT, env: { ...process.env, HSE_KEY: 'k', PORT: String(PORT), DATA_DIR: data }, stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 1500));
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const open = async (name, extra) => {
    const p = await browser.newPage({ viewport: { width: 800, height: 600 } });
    for (const f of ['three.min.js', 'Sky.js']) await p.route('**/' + f, r => r.fulfill({ body: fs.readFileSync(path.join(VENDOR, f)), contentType: 'application/javascript' }));
    p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
    await p.goto(`http://localhost:${PORT}/index.html?room=TEST1${extra}`, { timeout: 120000 }); await p.waitForTimeout(3500);
    await p.fill('#nm', name); await p.check('#slConsent'); await p.click('#spin'); await p.waitForTimeout(1500); await p.click('#start'); await p.waitForTimeout(2500);
    await p.evaluate(() => { window.requestAnimationFrame = () => 0; });   // stop rendering: software WebGL is slow, and the room runs on timers
    return p;
  };
  try {
    const a = await open('Trainee Ada', ''), b = await open('Trainer Bola', '&trainer=1');
    await a.evaluate(() => { S.p.x = 300; S.p.y = 1000; }); await a.waitForTimeout(2500);
    const seenA = await a.evaluate(() => SLRoom.players.map(p => p.name)), seenB = await b.evaluate(() => SLRoom.players.map(p => p.name + '@' + Math.round(p.x)));
    console.log('trainee sees', seenA, '· trainer sees', seenB);
    if (!seenA.includes('Trainer Bola') || !seenB.some(s => s.startsWith('Trainee Ada@300'))) fail('players do not see each other');
    if (!(await b.evaluate(() => SLRoom.isTrainer && !$('roomBtn').classList.contains('hidden')))) fail('trainer button missing');
    if (await a.evaluate(() => SLRoom.trigger('nepa'))) fail('trainee was able to send an event');
    await b.evaluate(() => SLRoom.trigger('nepa')); await a.waitForTimeout(3000);
    const nepa = await a.evaluate(() => S.nepa > 0 || !!document.querySelector('.modal'));
    console.log('trainee got NEPA event:', nepa);
    if (!nepa) fail('event did not reach the trainee');
    for (const p of [a, b]) if (p.errs.length) fail('page errors: ' + p.errs.join(' | '));
    await a.close(); await b.close();
    // Warehouse Shift: same server, its own group code; the trainer sends a spill
    const openW = async (name, extra) => {
      const p = await browser.newPage({ viewport: { width: 800, height: 600 } });
      for (const f of ['three.min.js', 'Sky.js']) await p.route('**/' + f, r => r.fulfill({ body: fs.readFileSync(path.join(VENDOR, f)), contentType: 'application/javascript' }));
      p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
      await p.goto(`http://localhost:${PORT}/warehouse.html?room=WARE1${extra}`, { timeout: 120000 }); await p.waitForTimeout(3500);
      await p.evaluate(() => { window.requestAnimationFrame = () => 0; });
      await p.fill('#nm', name); await p.check('#slConsent'); await p.click('#start'); await p.waitForTimeout(2500);
      return p;
    };
    const wa = await openW('Trainee Chidi', ''), wb = await openW('Trainer Bisi', '&trainer=1');
    await wa.evaluate(() => WH.teleport(-20, 10)); await wa.waitForTimeout(2500);
    const wsa = await wa.evaluate(() => SLRoom.players.map(p => p.name + '@' + p.game)), wsb = await wb.evaluate(() => SLRoom.players.map(p => p.name + '@' + Math.round(p.x)));
    console.log('warehouse trainee sees', wsa, '· trainer sees', wsb);
    if (!wsa.includes('Trainer Bisi@warehouse') || !wsb.includes('Trainee Chidi@-400')) fail('warehouse players do not see each other');
    if (!(await wb.evaluate(() => !!document.getElementById('trainBtn')))) fail('warehouse trainer button missing');
    await wb.evaluate(() => SLRoom.trigger('spill')); await wa.waitForTimeout(3000);
    const spill = await wa.evaluate(() => S.spill);
    console.log('warehouse trainee got the spill event:', spill);
    if (!spill) fail('warehouse event did not reach the trainee');
    await wa.evaluate(() => WH.step(2, .05));   // draws the other player
    for (const p of [wa, wb]) if (p.errs.length) fail('warehouse page errors: ' + p.errs.join(' | '));
  } catch (e) { fail(e.stack || e.message); }
  await browser.close(); srv.kill(); fs.rmSync(data, { recursive: true, force: true });
  console.log(process.exitCode ? 'ROOM TEST FAILED' : 'ROOM TEST PASSED');
})();
