// Accessibility checks on the factory game: text size, colour-blind markers, captions,
// answering with number keys, and walking with the keyboard.
// Usage (from safety-game/): node tests/a11y-test.js
const path = require('path'), fs = require('fs');
let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(path.join(require('child_process').execSync('npm root -g').toString().trim(), 'playwright'))); }
const ROOT = path.resolve(__dirname, '..'), VENDOR = path.join(__dirname, 'vendor');
const fail = (m) => { console.error('FAIL:', m); process.exitCode = 1; };
const ok = (m) => console.log('ok  ', m);
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await browser.newPage({ viewport: { width: 900, height: 620 } });
  for (const f of ['three.min.js', 'Sky.js']) await p.route('**/' + f, r => r.fulfill({ body: fs.readFileSync(path.join(VENDOR, f)), contentType: 'application/javascript' }));
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  try {
    await p.goto('file://' + ROOT + '/index.html'); await p.waitForTimeout(3500);
    await p.click('#stSet'); await p.click('[data-fs="1.3"]');
    const fs13 = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--fs').trim());
    fs13 === '1.3' ? ok('text size A++ sets --fs 1.3') : fail('text size: ' + fs13);
    await p.check('#slCb');
    (await p.evaluate(() => SL.markerColor())) === '#1f77ff' ? ok('colour-blind marker colour') : fail('colour-blind marker colour');
    await p.check('#slCap');
    await p.evaluate(() => { closeModal(); showStart(); });
    await p.fill('#nm', 'Keyboard Test'); await p.check('#slConsent'); await p.click('#spin'); await p.waitForTimeout(1500); await p.click('#start');
    await p.evaluate(() => { S.p.x = 160; S.p.y = 1200; update(.05); });
    const cap = await p.evaluate(() => { const c = document.getElementById('slCaption'); return c && c.classList.contains('on') ? c.textContent : ''; });
    cap.length > 20 ? ok('caption shown for the question') : fail('no caption');
    await p.keyboard.press('Digit1'); await p.waitForTimeout(200);
    (await p.$('.modal .fb')) ? ok('number key 1 answered the question') : fail('number key did not answer');
    await p.keyboard.press('Enter').catch(() => {}); await p.evaluate(() => { if (document.getElementById('cont')) document.getElementById('cont').click(); });
    const y0 = await p.evaluate(() => S.p.y);
    await p.keyboard.down('KeyW'); await p.evaluate(() => { yaw = 0; for (let i = 0; i < 10; i++) update(.05); }); await p.keyboard.up('KeyW');
    const y1 = await p.evaluate(() => S.p.y);
    y1 < y0 - 20 ? ok('W key walks forward') : fail(`W key did not move the player (${y0} -> ${y1})`);
    errs.length ? fail('page errors: ' + errs.join(' | ')) : ok('no page errors');
  } catch (e) { fail(e.stack || e.message); }
  await browser.close();
  console.log(process.exitCode ? 'A11Y TEST FAILED' : 'A11Y TEST PASSED');
})();
