// Site Life group sessions (multiplayer). Built into pages by src/build.py after common.js.
// A trainer and up to 30 trainees play the same game with the same group code and see each other.
// The trainer can set off events (fire alarm, NEPA, spill, rain, end) for everyone.
// Two backends, chosen automatically:
//   - our own server (local, tunnel or VPS): POST /api/room/<CODE>/state, GET /api/room/<CODE>?since=, POST /api/room/<CODE>/event
//   - claude.ai artifact: the `room` capability (named room "g-<code>"); only editors can send events.
// Game API:
//   SLRoom.code                                  group code from ?room= or the start screen (null = solo)
//   SLRoom.start({name, game, state, onPlayers, onEvent})   state() -> {x, y, yaw, zone, score}
//   SLRoom.trigger(type)  SLRoom.isTrainer  SLRoom.players  SLRoom.stop()
//   SLRoom.render(scene, t)                      draws the other players (needs the 3D engine)
const SLRoom = (() => {
  const EVENTS = ['fire_alarm', 'nepa', 'spill', 'rain', 'end'];
  const clean = c => { c = String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); return c.length >= 4 && c.length <= 8 ? c : null; };
  const R = { code: clean(SL.QS.get('room')), isTrainer: SL.QS.get('trainer') === '1', players: [], backend: null, EVENTS };
  let opts = null, timers = [], seen = new Set(), since = 0, myId = null, art = null, unsub = [];
  const pid = SL.store.get('pid', null) || (() => { const p = 'p' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36); SL.store.set('pid', p); return p; })();
  R.setCode = c => { R.code = clean(c); return R.code; };
  R.newCode = () => Array.from({ length: 5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');

  function handleEvent(ev) {
    if (!ev || !EVENTS.includes(ev.type) || seen.has(ev.id)) return;
    seen.add(ev.id); if (opts && opts.onEvent) opts.onEvent(ev.type);
  }
  function setPlayers(list) { R.players = list; if (opts && opts.onPlayers) opts.onPlayers(list); }
  const num = (v, d = 0) => (typeof v === 'number' && isFinite(v)) ? v : d;
  const str = (v, n) => String(v == null ? '' : v).slice(0, n);
  function sanitize(p) { return { id: str(p.id, 40), name: str(p.name, 40) || 'Player', role: p.role === 'trainer' ? 'trainer' : 'trainee', x: num(p.x), y: num(p.y), yaw: num(p.yaw), game: str(p.game, 30), zone: str(p.zone, 60), score: num(p.score) }; }

  // ---------- own server ----------
  async function serverStart() {
    R.backend = 'server';
    const base = 'api/room/' + R.code;
    const post = async () => {
      if (!opts) return;
      const s = opts.state();
      try {
        const r = await fetch(base + '/state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pid, name: opts.name, role: R.isTrainer ? 'trainer' : 'trainee', game: opts.game, ...s }) });
        if (r.ok) { const j = await r.json(); myId = j.id; }
      } catch (e) {}
    };
    const poll = async () => {
      try {
        const r = await fetch(base + '?since=' + since); if (!r.ok) return;
        const j = await r.json(); since = j.now || since;
        setPlayers((j.players || []).filter(p => p.id !== myId).map(sanitize));
        (j.events || []).forEach(handleEvent);
      } catch (e) {}
    };
    await post(); since = Date.now() - 1000; await poll();
    timers.push(setInterval(post, 600), setInterval(poll, 1000));
  }
  async function serverTrigger(type) {
    const r = await fetch('api/room/' + R.code + '/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pid, type }) });
    return r.ok;
  }

  // ---------- claude.ai room capability ----------
  async function artifactStart(room) {
    R.backend = 'artifact';
    try { const user = await window.claude.use('user'); if (user && user.canEdit && user.canEdit()) R.isTrainer = true; } catch (e) {}
    art = await room.join('g-' + R.code.toLowerCase());
    const push = () => { if (!opts) return; const s = opts.state(); art.presence({ name: str(opts.name, 40), role: R.isTrainer ? 'trainer' : 'trainee', game: opts.game, x: Math.round(num(s.x)), y: Math.round(num(s.y)), yaw: +num(s.yaw).toFixed(2), zone: str(s.zone, 60), score: num(s.score) }).catch(() => {}); };
    unsub.push(art.onPeers(ch => setPlayers(ch.peers.filter(p => !p.sameTab && p.kind === 'viewer').map(p => sanitize({ ...p.presence, id: p.peer, name: (p.presence.name || 'Player') + (p.guest ? ' (guest)' : '') }))), () => {}));
    unsub.push(art.on('evt', m => { const d = m.data || {}; handleEvent({ id: m.peer + ':' + d.n, type: d.type }); }, () => {}));
    push(); timers.push(setInterval(push, 250));
  }
  let evN = 0;
  async function artifactTrigger(type) { await art.emit('evt', { type, n: Date.now() + ':' + (evN++) }); return true; }

  R.start = async (o) => {
    R.stop(); if (!R.code) return false; opts = o;
    try {
      if (SL.ownSite()) { await serverStart(); return true; }
      const room = (window.claude && window.claude.use) ? await window.claude.use('room') : null;
      if (room) { await artifactStart(room); return true; }
    } catch (e) { console.warn('Group session could not start', e); }
    R.backend = null; return false;
  };
  R.trigger = async (type) => {
    if (!R.isTrainer || !EVENTS.includes(type)) return false;
    try { return R.backend === 'server' ? await serverTrigger(type) : R.backend === 'artifact' ? await artifactTrigger(type) : false; } catch (e) { return false; }
  };
  R.stop = () => { timers.forEach(clearInterval); timers = []; unsub.forEach(u => { try { u(); } catch (e) {} }); unsub = []; if (art) { art.leave().catch(() => {}); art = null; } opts = null; R.players = []; };

  // ---------- drawing the other players (3D engine) ----------
  const avatars = new Map();
  R.render = (scene, t) => {
    const live = new Set();
    for (const p of R.players) {
      live.add(p.id);
      let a = avatars.get(p.id);
      if (!a) {
        const g = makeHuman({ sex: p.id.charCodeAt(1) % 2 ? 'f' : 'm', skin: ['#3b2416', '#5a3825', '#7b4a2e', '#a0663f'][p.id.length % 4], top: p.role === 'trainer' ? '#1f6fd1' : '#3b6fb6', bottom: '#2a2f3a', vest: true, hat: 'hard', hatColor: p.role === 'trainer' ? '#1f6fd1' : '#f6f6f2', boots: true, longSleeve: true, label: (p.role === 'trainer' ? '🎓 ' : '') + p.name });
        scene.add(g); a = { g, x: p.x, y: p.y, step: 0 }; avatars.set(p.id, a);
      }
      const dx = p.x - a.x, dy = p.y - a.y, d = Math.hypot(dx, dy), moving = d > 2;
      a.x += dx * .2; a.y += dy * .2; if (moving) a.step += .3;
      a.g.position.set(a.x * K, 0, a.y * K); a.g.rotation.y = moving ? Math.atan2(-dx, -dy) : a.g.rotation.y;
      animHuman(a.g, a.step, moving, t);
    }
    for (const [id, a] of avatars) if (!live.has(id)) { scene.remove(a.g); avatars.delete(id); }
  };
  R.eventName = type => ({ fire_alarm: '🚨 Fire alarm', nepa: '⚡ NEPA (power cut)', spill: '🛢️ Chemical spill', rain: '🌧️ Heavy rain', end: '🏁 End the session' })[type] || type;
  return R;
})();
