#!/usr/bin/env node
// Site Life driver: launches headless Chromium (software WebGL) against the games and runs commands
// from stdin, one per line. Run from safety-game/:
//   node .claude/skills/run-safety-game/driver.mjs <<'EOF'
//   open warehouse.html
//   start Ada
//   step 60
//   ss warehouse
//   quit
//   EOF
// Commands:
//   serve [port]        start the results server (python3 server/sitelife_server.py, HSE_KEY=drive) and use http://localhost:port/
//   open <page?query>   load a page (file:// unless `serve` ran). three.js/Sky.js are served from tests/vendor (CDNs are blocked)
//   start [name]        fill the start screen (#nm, consent, factory role spin) and press #start
//   step [n] [dt]       advance the game n frames of dt seconds (default 30 × 0.05) and render once
//   tp <x> <y>          teleport the player (factory/kids map units; warehouse metres x z)
//   click <css> | fill <css> <text> | key <Key> | size <w> <h> | wait <ms>
//   eval <js>           evaluate an expression in the page and print the JSON result
//   ss [name]           render and screenshot to tests/out/drive-<name>.png
//   errors              print page errors and console errors seen so far
//   quit
import { createRequire } from 'module';
import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'))); }

const ROOT = process.cwd();                       // must be safety-game/
if (!fs.existsSync(path.join(ROOT, 'src/build.py'))) { console.error('Run from safety-game/'); process.exit(2); }
const VENDOR = path.join(ROOT, 'tests/vendor'), OUT = path.join(ROOT, 'tests/out');
fs.mkdirSync(OUT, { recursive: true });
if (!fs.existsSync(path.join(VENDOR, 'three.min.js'))) { console.error('tests/vendor missing: run  bash tests/setup.sh'); process.exit(2); }

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
// serviceWorkers:'block': on http:// the games install sw.js, which then fetches three.js from the (blocked) CDN itself,
// bypassing page.route below, and every later page dies with "THREE is not defined".
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' });
const page = await context.newPage();
for (const f of ['three.min.js', 'Sky.js']) await page.route('**/' + f, r => r.fulfill({ body: fs.readFileSync(path.join(VENDOR, f)), contentType: 'application/javascript' }));
const errs = [];
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });

let base = 'file://' + ROOT + '/', server = null;
const out = (...a) => console.log('>', ...a);

// One stepping function for every game: Warehouse (WH), Little Stars (LS), factory/kids (update/render3D/drawHUD).
const STEP = ([n, dt]) => {
  if (window.WH) { WH.step(n, dt); WH.render(); return 'warehouse'; }
  if (window.LS) { LS.step(n, dt); if (LS.state().scene) LS.render(); return 'little'; }
  // factory/kids: S is a top-level let, so it is not window.S
  if (typeof update === 'function' && typeof S !== 'undefined' && S) { for (let i = 0; i < n && !paused && !S.over; i++) update(dt); render3D(dt); drawHUD(); return 'factory/kids'; }
  return 'no game loaded';
};

const cmds = {
  async serve(port = '8080') {
    server = spawn('python3', ['server/sitelife_server.py'], { cwd: ROOT, env: { ...process.env, HSE_KEY: 'drive', PORT: port }, stdio: 'ignore' });
    for (let i = 0; i < 40; i++) { try { const r = await fetch(`http://localhost:${port}/`); if (r.ok) break; } catch {} await new Promise(r => setTimeout(r, 250)); }
    base = `http://localhost:${port}/`; out('server on', base, '(dashboard: hse?key=drive)');
  },
  async open(p = 'index.html') {
    await page.goto(base + p, { timeout: 120000 });
    await page.waitForFunction(() => !document.getElementById('loading') && (document.querySelector('#start') || window.WH || window.LS), null, { timeout: 120000 }).catch(() => {});
    await page.evaluate(() => { window.requestAnimationFrame = () => 0; });   // frames are driven by `step` (software WebGL ~1 fps)
    out('opened', p, '| title:', await page.title());
  },
  async start(...name) {
    if (await page.$('#nm')) await page.fill('#nm', name.join(' ') || 'Ada');
    if (await page.$('#slConsent')) await page.check('#slConsent');
    if (await page.$('#spin:not(.hidden)')) { await page.click('#spin'); await page.waitForTimeout(1500); }   // factory role lottery
    await page.click('#start'); await page.waitForTimeout(300);
    out('started');
  },
  async step(n = '30', dt = '0.05') { out('stepped', await page.evaluate(STEP, [+n, +dt])); },
  async tp(x, y) {
    out(await page.evaluate(([x, y]) => { if (window.WH) { WH.teleport(x, y); return 'warehouse x,z'; } S.p.x = x; S.p.y = y; return 'map x,y'; }, [+x, +y]));
  },
  async click(...sel) { await page.click(sel.join(' ')); out('clicked'); },
  async fill(sel, ...text) { await page.fill(sel, text.join(' ')); out('filled'); },
  async key(k) { await page.keyboard.press(k); out('pressed', k); },
  async size(w, h) { await page.setViewportSize({ width: +w, height: +h }); await page.evaluate(() => dispatchEvent(new Event('resize'))); out('viewport', w, h); },
  async wait(ms = '1000') { await page.waitForTimeout(+ms); },
  async eval(...js) { out(JSON.stringify(await page.evaluate(js.join(' ')))); },
  async ss(name = 'shot') {
    await page.evaluate(STEP, [1, 0.016]);
    const f = path.join(OUT, `drive-${name}.png`);
    await page.screenshot({ path: f, timeout: 240000 }); out('screenshot', path.relative(ROOT, f));
  },
  async errors() { out(errs.length ? errs.join('\n  ') : 'no errors'); },
  async quit() { await browser.close(); if (server) server.kill(); process.exit(errs.length ? 1 : 0); },
};

const rl = readline.createInterface({ input: process.stdin });
for await (const line of rl) {
  const t = line.trim(); if (!t || t.startsWith('#')) continue;
  const [c, ...a] = t.split(/\s+/);
  if (!cmds[c]) { out('unknown command', c); continue; }
  console.log('$', t);
  try { await cmds[c](...a); } catch (e) { out('ERROR', e.message.split('\n')[0]); }
}
await cmds.quit();
