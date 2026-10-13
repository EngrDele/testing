// Collects every translatable English string from the game data (questions, answers, hazards, places...)
// and writes src/i18n/strings-en.json. Combine with GAME_LANG=xx playthrough output for on-screen UI text.
// Usage (from safety-game/): node tests/i18n-collect.js
const path = require('path'), fs = require('fs');
let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(path.join(require('child_process').execSync('npm root -g').toString().trim(), 'playwright'))); }
const ROOT = path.resolve(__dirname, '..'), V = path.join(__dirname, 'vendor');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const all = new Set();
  const walk = `(o)=>{ const out=[]; const seen=new Set(); (function w(v){ if(v==null) return; if(typeof v==='string'){ if(/\\p{L}{2}/u.test(v) && !/^#|^[a-z_]+$|^https?:/.test(v)) out.push(v.trim()); return; } if(typeof v!=='object'||seen.has(v)) return; if(v instanceof HTMLElement||v.isObject3D||ArrayBuffer.isView(v)) return; seen.add(v); for(const k in v){ if(['x','y','id','k','c','e','look','hatColor','skin','top','bottom','shoe','vestColor','sex','hair','outfit','hat','topMap','gele','fallback','fog'].includes(k)) continue; w(v[k]); } })(o); return out; }`;
  for (const [file, expr] of [['index.html', '[SC,EVENTS,HAZARDS,DECOYS,PPE_ITEMS,ROLES,ZONES.map(z=>[z.name,z.hint]),BARS.map(b=>b.l),NPCS.map(n=>n.label),BUILD.map(b=>b.name)]'], ['kids.html?world=home', 'DATA'], ['kids.html?world=school', 'DATA']]) {
    const p = await b.newPage();
    await p.route('**/three.min.js', r => r.fulfill({ body: fs.readFileSync(path.join(V, 'three.min.js')), contentType: 'application/javascript' }));
    await p.route('**/Sky.js', r => r.fulfill({ body: fs.readFileSync(path.join(V, 'Sky.js')), contentType: 'application/javascript' }));
    await p.goto('file://' + ROOT + '/' + file); await p.waitForTimeout(2500);
    (await p.evaluate(`(${walk})(${expr})`)).forEach(x => all.add(x));
    await p.close();
  }
  await b.close();
  const extra = fs.existsSync(path.join(__dirname, 'out')) ? fs.readdirSync(path.join(__dirname, 'out')).filter(f => f.startsWith('missing-')) : [];
  for (const f of extra) JSON.parse(fs.readFileSync(path.join(__dirname, 'out', f))).forEach(x => all.add(x));
  const list = [...all].filter(x => x.length > 1).sort();
  fs.mkdirSync(path.join(ROOT, 'src', 'i18n'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'src', 'i18n', 'strings-en.json'), JSON.stringify(list, null, 1));
  console.log(list.length, 'strings -> src/i18n/strings-en.json');
})();
