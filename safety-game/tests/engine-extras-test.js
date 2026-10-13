// Checks the optional engine hooks without changing any game: glTF avatars/site models (ROADMAP 12/13)
// and the dormant WebXR mode (ROADMAP 14). Runs on kids.html from file://.
// Needs tests/vendor/GLTFLoader.js + SkeletonUtils.js (fetched from npm three@0.128.0 when missing).
// Usage (from safety-game/): node tests/engine-extras-test.js
const path = require('path'), fs = require('fs'), { execSync } = require('child_process');
let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'))); }
const ROOT = path.resolve(__dirname, '..'), V = path.join(__dirname, 'vendor');
let failed = 0; const fail = (m) => { console.error('FAIL:', m); failed = 1; }, ok = (m) => console.log('ok  ', m);

if (!fs.existsSync(path.join(V, 'GLTFLoader.js'))) {
  execSync('npm pack three@0.128.0 -q && tar xzf three-0.128.0.tgz package/examples/js/loaders/GLTFLoader.js package/examples/js/utils/SkeletonUtils.js && mv package/examples/js/loaders/GLTFLoader.js package/examples/js/utils/SkeletonUtils.js . && rm -rf package three-0.128.0.tgz', { cwd: V });
}

// A tiny glTF: one triangle node "Body" 1.6 m tall, with "Idle" and "Walk" clips (node translation).
function tinyGLTF() {
  const f = (a) => Buffer.from(new Float32Array(a).buffer);
  const pos = f([-.3, 0, 0, .3, 0, 0, 0, 1.6, 0]), times = f([0, 1]), idle = f([0, 0, 0, 0, .02, 0]), walk = f([0, 0, 0, 0, 0, .3]);
  const buf = Buffer.concat([pos, times, idle, walk]);
  const bv = (o, l) => ({ buffer: 0, byteOffset: o, byteLength: l });
  return 'data:model/gltf+json;base64,' + Buffer.from(JSON.stringify({
    asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ name: 'Body', mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    buffers: [{ byteLength: buf.length, uri: 'data:application/octet-stream;base64,' + buf.toString('base64') }],
    bufferViews: [bv(0, 36), bv(36, 8), bv(44, 24), bv(68, 24)],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', min: [-.3, 0, 0], max: [.3, 1.6, 0] },
      { bufferView: 1, componentType: 5126, count: 2, type: 'SCALAR', min: [0], max: [1] },
      { bufferView: 2, componentType: 5126, count: 2, type: 'VEC3' }, { bufferView: 3, componentType: 5126, count: 2, type: 'VEC3' }],
    animations: [
      { name: 'Idle', samplers: [{ input: 1, output: 2 }], channels: [{ sampler: 0, target: { node: 0, path: 'translation' } }] },
      { name: 'Walk', samplers: [{ input: 1, output: 3 }], channels: [{ sampler: 0, target: { node: 0, path: 'translation' } }] }],
  })).toString('base64');
}

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await browser.newPage({ viewport: { width: 900, height: 620 } });
  const js = (f) => ({ body: fs.readFileSync(path.join(V, f)), contentType: 'application/javascript' });
  await p.route('**/three.min.js', r => r.fulfill(js('three.min.js'))); await p.route('**/Sky.js', r => r.fulfill(js('Sky.js')));
  let loaderHits = 0;
  await p.route('**/GLTFLoader.js', r => { loaderHits++; r.fulfill(js('GLTFLoader.js')); }); await p.route('**/SkeletonUtils.js', r => r.fulfill(js('SkeletonUtils.js')));
  const errs = [], warns = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); if (m.type() === 'warning') warns.push(m.text()); });
  await p.goto('file://' + ROOT + '/kids.html?world=home'); await p.waitForFunction(() => typeof G !== 'undefined' && !!G, null, { timeout: 60000 });
  try {
    // WebXR: dormant without a headset
    const xr = await p.evaluate(async () => ({ r: await XR.setup(G.renderer, G.scene, G.camera, {}), btn: !!document.getElementById('xrBtn'), active: XR.active, panel: XR.showPanel('Q', ['a', 'b'], () => {}) }));
    !xr.r && !xr.btn && !xr.active && xr.panel === null ? ok('XR: no VR device -> no button, not active, showPanel is a no-op') : fail('XR ' + JSON.stringify(xr));

    // makeHumanGLTF without a URL is exactly makeHuman
    const plain = await p.evaluate(() => { const g = makeHumanGLTF({ sex: 'f', skin: '#5a3825' }); return { legs: !!g.userData.legs, gltf: !!g.userData.gltf }; });
    plain.legs && !plain.gltf ? ok('makeHumanGLTF() without a URL returns the procedural person') : fail('plain ' + JSON.stringify(plain));

    // with a glTF avatar: procedural body hidden, model + mixer added, animHuman drives Idle/Walk
    const url = tinyGLTF();
    const av = await p.evaluate(async (url) => {
      const g = makeHumanGLTF({ sex: 'm', skin: '#3b2416', label: 'Test', gltf: url }); G.scene.add(g);
      const before = !!g.userData.gltf;
      for (let i = 0; i < 100 && !g.userData.gltf; i++) await new Promise(r => setTimeout(r, 50));
      const u = g.userData; if (!u.gltf) return { before, loaded: false };
      animHuman(g, 0, false, 0); animHuman(g, 0, false, .5); const idle = u._act;
      animHuman(g, 1, true, 1); animHuman(g, 2, true, 1.5); const walk = u._act;
      const visible = g.children.filter(c => c.visible).map(c => c === u.gltf ? 'gltf' : c === u.label ? 'label' : c.userData.blob ? 'blob' : 'other');
      const h = new THREE.Box3().setFromObject(u.gltf); render3D(.05);
      return { before, loaded: true, mixer: !!u.mixer, idle, walk, visible, height: +(h.max.y - h.min.y).toFixed(2), setPPE: (setPPE(g, { hat: true, vest: true }), 'ok') };
    }, url);
    av.loaded && !av.before && av.mixer && av.idle === 'idle' && av.walk === 'walk' && !av.visible.includes('other') && av.visible.includes('gltf') && Math.abs(av.height - 1.75) < .1
      ? ok(`makeHumanGLTF: fallback first, then glTF swapped in (height ${av.height} m, mixer Idle -> Walk, visible: ${av.visible.join(', ')})`) : fail('avatar ' + JSON.stringify(av));

    // SL_AVATAR_URL global + placeSiteModel at map coordinates; the loader script is fetched only once
    const site = await p.evaluate(async (url) => {
      window.SL_AVATAR_URL = url; const g = makeHumanGLTF({ sex: 'f', skin: '#5a3825' });
      const m = await placeSiteModel(G.scene, url, { x: 400, y: 300, rot: Math.PI / 2, scale: 2 });
      for (let i = 0; i < 100 && !g.userData.gltf; i++) await new Promise(r => setTimeout(r, 50));
      delete window.SL_AVATAR_URL;
      return { global: !!g.userData.gltf, pos: m && [m.position.x, m.position.z, +m.rotation.y.toFixed(3), m.scale.x], inScene: !!(m && m.parent === G.scene) };
    }, url);
    site.global && site.inScene && JSON.stringify(site.pos) === JSON.stringify([20, 15, 1.571, 2]) ? ok('SL_AVATAR_URL works; placeSiteModel puts the model at map (400,300) -> three.js (20, 15)') : fail('site ' + JSON.stringify(site));
    loaderHits === 1 ? ok('GLTFLoader.js loaded once, lazily') : fail('GLTFLoader requests: ' + loaderHits);

    // failure: a bad URL keeps the fallback, warns once, throws nothing
    const bad = await p.evaluate(async () => {
      const a = makeHumanGLTF({ sex: 'm', skin: '#3b2416', gltf: 'data:model/gltf+json;base64,bm90IGdsdGY=' }), b = makeHumanGLTF({ sex: 'm', skin: '#3b2416', gltf: 'data:model/gltf+json;base64,bm90IGdsdGY=' });
      const s = await placeSiteModel(G.scene, 'data:model/gltf+json;base64,bm90IGdsdGY=', {}); await new Promise(r => setTimeout(r, 300));
      animHuman(a, 1, true, 1); return { a: !a.userData.gltf && a.userData.legs[0].hp.visible !== false, b: !b.userData.gltf, s };
    });
    const nWarn = warns.filter(w => /glTF .* not loaded/.test(w)).length;
    bad.a && bad.b && bad.s === null && nWarn === 1 ? ok('bad glTF: procedural fallback kept, one warning, placeSiteModel -> null') : fail('bad ' + JSON.stringify(bad) + ' warnings ' + nWarn);
    await p.screenshot({ path: path.join(__dirname, 'out', 'engine-extras.png') }).catch(() => {});
  } catch (e) { fail(e.stack || e.message); }
  errs.length ? fail('page errors: ' + errs.join(' | ')) : ok('no page errors');
  await browser.close();
  console.log(failed ? 'ENGINE EXTRAS TEST FAILED' : 'ENGINE EXTRAS TEST PASSED'); process.exitCode = failed;
})();
