// SCORM 1.2 end-to-end check: unpacks the packages from src/scorm.py, serves them over http, and opens
// each one inside a fake LMS page whose window has a SCORM 1.2 `API`. The game runs in an iframe (as in
// Moodle/TalentLMS); we call its result path SL.post({...}) directly and check what reached the LMS.
// Usage (from safety-game/): python3 src/build.py tests/vendor/three.min.js tests/vendor/Sky.js && node tests/scorm-test.js
const path = require('path'), fs = require('fs'), { spawn, execFileSync } = require('child_process');
let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(path.join(execFileSync('npm', ['root', '-g']).toString().trim(), 'playwright'))); }
const ROOT = path.resolve(__dirname, '..'), RUN = path.join(__dirname, 'out', 'scorm-run');
const PORT = 8600 + Math.floor(Math.random() * 300), BASE = `http://localhost:${PORT}/`;
let failed = 0; const fail = (m) => { console.error('FAIL:', m); failed = 1; }, ok = (m) => console.log('ok  ', m);

// 1) build the zips (and check their manifests), 2) unpack each into its own folder
execFileSync('python3', [path.join(__dirname, 'scorm-check.py')], { cwd: ROOT, stdio: 'inherit' });
fs.rmSync(RUN, { recursive: true, force: true }); fs.mkdirSync(RUN, { recursive: true });
execFileSync('python3', ['-c', `import zipfile,sys,os
for f in os.listdir(sys.argv[1]):
    if f.endswith('.zip'): zipfile.ZipFile(os.path.join(sys.argv[1], f)).extractall(os.path.join(sys.argv[2], f[:-4]))`, path.join(ROOT, 'dist', 'scorm'), RUN]);

// the fake LMS: logs every API call; the course frame loads the package's launch page
fs.writeFileSync(path.join(RUN, 'lms.html'), `<!doctype html><meta charset="utf-8"><title>Fake LMS</title>
<script>
window.calls = []; window.cmi = { 'cmi.core.student_name': 'Okafor, Ada', 'cmi.core.lesson_status': 'not attempted' };
window.API = {
  LMSInitialize: (a) => (calls.push(['LMSInitialize']), 'true'),
  LMSFinish: (a) => (calls.push(['LMSFinish']), 'true'),
  LMSGetValue: (k) => (calls.push(['LMSGetValue', k]), cmi[k] || ''),
  LMSSetValue: (k, v) => (calls.push(['LMSSetValue', k, v]), cmi[k] = v, 'true'),
  LMSCommit: (a) => (calls.push(['LMSCommit']), 'true'),
  LMSGetLastError: () => '0', LMSGetErrorString: () => '', LMSGetDiagnostic: () => '',
};
</script>
<body style="margin:0"><iframe id="course" style="width:900px;height:620px;border:0" src="about:blank"></iframe>
<script>document.getElementById('course').src = new URLSearchParams(location.search).get('src');</script>`);

async function run(browser, pkg, rec, expect) {
  const page = await browser.newPage({ viewport: { width: 920, height: 640 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
  await page.goto(BASE + 'lms.html?src=' + encodeURIComponent(pkg + '/index.html'));
  let fr = null;
  for (let i = 0; i < 60 && !fr; i++) { fr = page.frames().find(f => /offline\.html/.test(f.url())); if (!fr) await page.waitForTimeout(250); }
  if (!fr) { fail(pkg + ': launch page did not open the offline game'); return page.close(); }
  await fr.waitForFunction(() => typeof SL !== 'undefined' && typeof G !== 'undefined' && !!G, null, { timeout: 60000 });
  const info = await fr.evaluate(() => ({ active: SL.lms.active, name: SL.lms.studentName(), state: SL.lms.state, url: location.search, web: SL.ownSite() }));
  info.active && info.state === 'open' ? ok(`${pkg}: found the LMS API and initialised (${info.url || 'no query'})`) : fail(pkg + ': LMS not initialised ' + JSON.stringify(info));
  info.name === 'Ada Okafor' ? ok(pkg + ': SL.lms.studentName() = "Ada Okafor"') : fail(pkg + ': student name ' + info.name);
  info.web === false ? ok(pkg + ': no /api/result or service worker inside the LMS') : fail(pkg + ': ownSite() should be false in an LMS');
  const status = await fr.evaluate((r) => SL.post(r), rec);
  status === 'none' ? ok(pkg + ': SL.post -> ' + status) : fail(pkg + ': SL.post returned ' + status);
  if (expect.removeFrame) await page.evaluate(() => document.getElementById('course').remove()); // learner closes the course
  await page.waitForTimeout(300);
  const calls = await page.evaluate(() => window.calls);
  const set = (k) => calls.filter(c => c[0] === 'LMSSetValue' && c[1] === k).map(c => c[2]).pop();
  const has = (n) => calls.some(c => c[0] === n);
  has('LMSInitialize') ? ok(pkg + ': LMSInitialize') : fail(pkg + ': no LMSInitialize');
  set('cmi.core.lesson_status') === expect.status ? ok(`${pkg}: lesson_status = ${expect.status}`) : fail(`${pkg}: lesson_status ${set('cmi.core.lesson_status')}`);
  set('cmi.core.score.raw') === String(expect.score) ? ok(`${pkg}: score.raw = ${expect.score}`) : fail(`${pkg}: score.raw ${set('cmi.core.score.raw')}`);
  has('LMSCommit') ? ok(pkg + ': LMSCommit') : fail(pkg + ': no LMSCommit');
  has('LMSFinish') ? ok(pkg + ': LMSFinish') : fail(pkg + ': no LMSFinish');
  /^\d{4}:\d\d:\d\d\.\d\d$/.test(set('cmi.core.session_time') || '') ? ok(pkg + ': session_time ' + set('cmi.core.session_time')) : fail(pkg + ': session_time ' + set('cmi.core.session_time'));
  errs.length ? fail(pkg + ' page errors: ' + errs.join(' | ')) : ok(pkg + ': no page errors');
  await page.close();
}

(async () => {
  const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: RUN, stdio: 'ignore' });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    await new Promise(r => setTimeout(r, 1000));
    await run(browser, 'site-life-kids-home', { game: 'home', name: 'Ada', role: 'Pupil', result: 'GOLD', stars: 14 }, { status: 'passed', score: 100 });
    await run(browser, 'site-life-little', { game: 'little', name: 'Ada', role: 'Child 3-6', result: 'COMPLETE', stars: 5, scenes: ['hot'] }, { status: 'passed', score: 100 });
    await run(browser, 'site-life-factory', { game: 'factory', name: 'Ada Okafor', company: 'QA Ltd', result: 'REPLAY', score: 42.4 }, { status: 'failed', score: 42, removeFrame: true });
  } catch (e) { fail(e.stack || e.message); }
  await browser.close(); srv.kill();
  console.log(failed ? 'SCORM TEST FAILED' : 'SCORM TEST PASSED'); process.exitCode = failed;
})();
