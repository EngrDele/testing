# Site Life: guide for agents and developers

Site Life is a set of browser-based 3D **safety training games** that replace the "watch a video, tick a paper quiz" induction. It is written in plain HTML and JavaScript, uses three.js r128 from a CDN, and has **no npm dependencies at runtime**. A small Python script (`src/build.py`) assembles the pages from sources.

**Adding or suggesting a game? Use the project skill `.claude/skills/site-life-games/`** (age guides for the main players, children aged 4, 8 and 12; build recipes; content rules; idea bank). **New to the project? Start with `docs/HANDOVER.md`** (history, status, direction) and `docs/TRANSCRIPT.md` (the owner's conversation). Read `CONCEPT.md` for the product idea, `ROADMAP.md` for status and what is next, and `research/IDEAS.md` for the game backlog (a weekly routine runs `.claude/agents/game-researcher.md` to research, plan and build new games).

## The games

| Game | URL | Audience |
|---|---|---|
| Factory Site Induction | `index.html` | New workers and visitors |
| Advanced Site Course (height, confined space, hot work, spill, first aid, manual handling, journey) | `index.html?course=advanced` | Workers |
| Oga Mode (supervisor stops unsafe acts against the clock) | `index.html?mode=oga` | Supervisors |
| Home → School Bus, School Safety | `kids.html?world=home`, `?world=school` | Kids 6–12 |
| Market & Road Trip, Beach & Pool, Online Safety | `kids.html?world=market`, `water`, `online` | Kids |
| Little Stars (10 tap-only scenes, sticker book, parent tips) | `little.html` | Children 3–6 with a parent |
| Warehouse Shift (Lagos distribution centre; clean "logistics dashboard" look) | `warehouse.html` | Warehouse staff, drivers, visitors |
| Site Builder (2D editor for a client's compound) | `builder.html` | HSE staff / sales |

Useful URL options: `?lang=pcm|yo|ha|ig`, `?site=sites/<file>.json` (or `?site=local` for the builder draft), `?room=CODE` (group session), `&trainer=1`, `?class=CODE` (kids class/family code), `?hse=<whatsapp number>&email=<addr>`, `?results=<Google Apps Script URL>`.

## Files

| File | What it is | Edit directly? |
|---|---|---|
| `src/factory.html` | Factory game: page shell, CSS and all factory logic (induction, courses, Oga Mode) | ✅ |
| `sites/acme-ikeja.json` | The built-in factory **site file**: layout, zones, NPCs, hazard spots, scenarios, events, hazards, `courses.advanced`, `oga` incidents | ✅ |
| `src/engine.js` | Shared 3D engine (materials, textures, humans, vehicles, props, `XR`, glTF hooks) | ✅ |
| `src/common.js` | Shared `SL` layer: consent, translation, settings, captions, results posting with offline queue, SCORM (`SL.lms`), service worker | ✅ |
| `src/room.js` | `SLRoom`: group sessions (results server polling or the claude.ai `room` capability) | ✅ |
| `src/kids-game.js`, `src/kids-shell.html` | Kids games (all worlds) and their page shell | ✅ |
| `src/little-game.js`, `src/little-shell.html` | Little Stars (ages 3–6) and its page shell | ✅ |
| `src/warehouse-game.js`, `src/warehouse-shell.html` | Warehouse Shift and its page shell (own clean CSS; the factory CSS is not used) | ✅ |
| `src/builder.html` | Site builder source | ✅ |
| `src/i18n/<lang>.json` | Translations, keyed by the exact English text (`strings-en.json` is the collected source list) | ✅ |
| `index.html`, `kids.html`, `little.html`, `warehouse.html`, `builder.html`, `site-life-offline.html`, `kids-offline.html`, `little-offline.html`, `warehouse-offline.html` | **Generated** by `src/build.py` | ❌ rebuild |
| `sw.js`, `manifest.webmanifest`, `icons/` | Installable offline app (service worker) | ✅ |
| `src/scorm.py` | Builds SCORM 1.2 zips into `dist/scorm/` for Moodle/TalentLMS | ✅ |
| `lite.html` | Older 2D version, fallback when WebGL fails | rarely |
| `server/sitelife_server.py` | Python stdlib server: games, `POST /api/result`, dashboard `/hse?key=…`, certificates `/cert/<id>`, `/verify/<id>`, rooms `/api/room/…`, `/trainer?room=` | ✅ |
| `server/setup-ubuntu.sh`, `START-SERVER.bat`, `start-server.sh` | VPS install; local run | ✅ |
| `deploy/google-sheets/`, `deploy/cloudflare-pages/` | No-server option: static hosting + results in a Google Sheet | ✅ |
| `research/` | Game ideas backlog, plans and research log | ✅ |
| `tests/` | Playwright tests and server tests (see below) | ✅ |

## Build and test (run these before every commit)

```sh
cd safety-game
bash tests/setup.sh                       # once: fetches three.js r128 + Sky.js from npm into tests/vendor/
python3 src/build.py tests/vendor/three.min.js tests/vendor/Sky.js   # rebuild every generated page
python3 -m unittest tests/test_server.py  # server unit tests
bash tests/server-test.sh                 # server smoke tests
node tests/playthrough.js                 # plays every game + the builder to the end (slow: 15–25 min with software WebGL)
node tests/playthrough.js oga market      # or only some: factory advanced oga builder home school market water online little warehouse
GAME_LANG=pcm node tests/playthrough.js   # play in Pidgin; untranslated strings go to tests/out/missing-pcm.json
node tests/a11y-test.js; node tests/room-test.js; node tests/offline-test.js; node tests/scorm-test.js; node tests/engine-extras-test.js
```

Everything must print `PASSED`. The generated pages are committed, and CI (`.github/workflows/site-life.yml`) fails if you forget to rebuild.

### Testing notes (learned the hard way)
- **Headless WebGL is software rendering (SwiftShader), so it runs at about 1–3 fps.** Tests call the game's `update(dt)` / `render3D()` / `drawHUD()` through `page.evaluate` instead of waiting for frames. When two pages must run at once (room test), stop their render loops (`requestAnimationFrame = () => 0`) or the second page never loads.
- Teleport the player with `S.p.x = …; S.p.y = …` and step a couple of updates.
- **Some things use real timers**: the factory fire alarm starts 5 s after the last zone; random events retry every 1 s while a modal is open. Oga incidents run on game time (`S.oga.next`), so tests set it to 0.
- **Headless Chromium has no emoji font**: emoji look blank in screenshots. Not a bug.
- The sandbox **blocks the CDNs**. `tests/setup.sh` gets the same files from npm and the tests route the CDN URLs to them.
- Running several browser tests at the same time on a small machine causes click timeouts. Run them one after another.
- Screenshots: `page.screenshot({path})` after a `render3D` step, then look at the image.

## Architecture

### Coordinates
- **Map units: 1 unit = 5 cm** (`K = 0.05`). Map `x` → three.js `X(x) = x*K`, map `y` → `Z(y)`.
- People and vehicles **face −Z**. To face `(dx, dy)` use `rotation.y = atan2(-dx, -dy)`. Camera `yaw = 0` looks north (−y).
- **Collision** is 2D rectangles (`solids()` in the factory, `SOLIDS` in kids) with a player circle of radius 10–13. Start points, zones and incident spots must not be inside a solid.

### Factory (`src/factory.html` + `sites/acme-ikeja.json`)
- `build.py` injects the site file as `SITE_DEFAULT`; `loadSite()` merges `?site=` or the builder draft over it. `MODE` (`induction`/`oga`), `COURSE` and `GAME_ID` (`factory`, `factory-advanced`, `oga`) are decided at load from the URL; the start-screen cards are links.
- `ZONES` comes from the site (or `course.keep` + `course.zones`). Zones with special logic: `gate`, `reception` (PPE picker), `electrical` (role-dependent), `forklift`, `carpark`, `muster`. Guard any new special-case code with `HAS(id)`. A zone's question is `SC[zone.sc || zone.id]`.
- Course zones may have a `prop` (`scaffold`, `manhole`, `welding`, `spill`, `casualty`, `boxes`, `journey`) placed at `px, py` by `buildCourseProps()`.
- Oga Mode: `SITE.oga.incidents` (position, worker look overrides, options, harm). `ogaUpdate()` starts one every `interval` s; each times out after `timeout` s. Workers are built hidden by `buildOgaWorkers()`.
- Sections (search `// ====`): DATA → WORLD → STATE → AUDIO → UI → INTERACTIONS → OGA MODE → PPE SELECTION → GUIDE / ESCORT (A* on a 20-unit grid) → SHARE RESULT → HSE RESULTS → COLLISION → UPDATE → `/*@@ENGINE@@*/` → world build (`initThree`, `buildCourseProps`, `buildOgaWorkers`) → render → LOOP (`loop` / `tick`) → INPUT → START (incl. group session).

### The shared 3D engine (`src/engine.js`)
- `std(color, {r, m, map, normalMap, emissive, …})` PBR material; colours go through `lin()` (sRGB output, ACES tone mapping).
- Procedural textures `buildTextures()` → `TX.*`; `bx/cyl/sph/mesh`; `inst()` + `flushInst()` (keep `frustumCulled = false`); `consolidate(group)` merges meshes (`userData.keep = true` to opt out). Tag decoration `userData.decor = true` so the Low setting can hide it.
- `makeHuman(opts)` / `animHuman()` / `setPPE()`; `makeHumanGLTF(opts)` swaps in a glTF avatar when `opts.gltf` or `SL_AVATAR_URL` loads; `placeSiteModel(scene, url, {x, y, rot, scale})` drops a scanned building.
- Vehicles `makeCar`, `makeDanfo`, `makeOkada`, `makeForklift`; hazard props `makeProp(emoji)`.
- `XR`: WebXR VR mode. Dormant unless a headset is present; modals are mirrored as 3D panels. Pages call `XR.setup(...)` and use `loop` → `tick`.

### Kids engine (`src/kids-game.js`)
- `DATA[world]` declares `missions` (ordered, optional `when()`, question `q`), `hazards` (`h: 1` danger, `0` safe decoy), `start`, `escort`, `intro`. Each world has a `build<World>()`.
- Road safety uses `ROADS`, `ZEBRAS` and `VEH` lanes. Hearts and stars replace the factory's body bars.

### Little Stars (`src/little-game.js`, ages 3–6)
- `SCENES` lists 10 scenes; each has `build()` (one small diorama built into `G.root` and disposed when the scene ends), `steps`, `rule`, `tip` (parent card) and an optional `review` note. A step has `say` (spoken prompt), `ok` (ids to tap, 3D objects registered with `tapObj(id, obj)` or picture `cards`), `decoys`, `yes`/`no` lines, `order`, `need`/`repeat` (scrubbing), an optional `view` (camera zoom) and hooks `enter`, `onOk`, `check` (e.g. "wait, the danfo is coming").
- No losing: a wrong tap is a gentle line plus a soft sound; after 2 misses the right thing pulses (ring on screen). Stickers live in `SL.store('little-stickers')`; the parent's phone number (sing-along) only in `SL.store('little-phone')` and is never posted.
- Results: one `SL.post({game:'little', result:'COMPLETE', scenes, stars, zoneTimes, class, …})` per run (one scene or "Play 5 in a row").
- Timers, speech and animations run on game time (`later()`, `update(dt)`). Test hook `window.LS`: `play(ids)`, `next()`, `tapId(id)`, `flush()`, `step(n, dt)`, `state()`.
- The body-safety scene (`body`) must be reviewed by a child-protection professional before use in schools.

### Warehouse Shift (`src/warehouse-game.js` + `src/warehouse-shell.html`)
- **Look** (the owner asked for "clean like" a logistics-dashboard video; copy the style, never that product's name or brand): light isometric-style 3D — `PerspectiveCamera` FOV 27 from ~41° above, `MeshLambertMaterial` flat colours (`mat()`), no tone mapping, hemisphere + one soft directional light whose PCFSoft shadow box follows the view, lavender fog. White rounded cards on top: top bar, three KPI tiles (`#kpis`), right inspect panel (`#panel`), bottom-left shift stepper (`#tracker`), bottom-right tabbed live list (`#lists`: docks / forklifts / trucks / hazards), zoom/rotate/home buttons (`#zoom`). Icons are inline SVG (`icon()`), not emoji (headless and some phones have no emoji font). At ≤760 px the cards become a bottom sheet (`body.sheet` expands the list). The UI roots carry `data-notr`: the page translates its own text with `tr()`/`L()` so the MutationObserver does not re-translate fragments.
- **World units are metres** (x east, z south; not the factory's 5 cm map units). The map is a set of rectangles: `SOL` (collision), `WALKS` (green walkways), `FA` (forklift aisles, with `cross` crossings), `ROADS`, `ZEBRA`, `REVZ(bay)` reversing zones, `PICK`, `CHARGE`, `AP` (assembly point). `findPath()` is A* on a 0.5 m grid with costs (walkways 1, forklift aisles 30 except crossings, roads 7, reversing zones 35) and string-pulling; it drives click-to-move, the blue ground chevrons and the NPCs.
- **The building** is a cut-away: each wall's upper part and the roof fade out (`camUpdate` → `fade`) when you or the camera target are inside, and only the walls facing the camera fade. Racking, pallets, posts, trees, markings are instanced (`iq()` / `iqFlush()`, per-instance colour); static groups are `consolidate()`d; decor is tagged `userData.decor` (hidden on Low).
- **Stations** (`STATIONS`, 9 stops for 8 `STEPS`) each have a position, a `host` spot for Bisi and question ids in `Q` (who, question, 3 options with one `ok` and a `why` each). `flcheck` opens FL-03's pre-use checklist in the inspect panel (`FLCHECK`, `FLDECIDE`); `emergency` starts the fire alarm, then the target becomes the assembly point. `HZ` lists 6 hazards + 3 decoys; any entity with `hz` gets a "Report hazard / Looks fine" check in its panel.
- **Entities** (`ent()`): anything clickable has an invisible proxy box; `rows()`, `status()`, `prog()` feed the panel. Moving trucks get entities on demand (`truckEnt`).
- **Actors**: forklifts (`FL`, ping-pong routes, stop for anyone within 5 m ahead), trucks per bay (`TRUCKS`: empty → arrive → reverse → docked → depart, one moving at a time, stop for people), people (`NPCS`, routes or A* paths, evacuate on alarm), danfos on the public road. Near misses: walking in a forklift aisle (outside a crossing) near a working forklift, in a reversing zone behind a reversing truck, or on the road near a moving truck.
- **Score**: starts at 100; −8 wrong answer, −10 wrong forklift decision, −4 near miss, −4 wrong hazard call. Pass = score ≥ 70, at least 5 of 6 hazards and the muster. Result: `SL.post({game:'warehouse', name, company, role, result:'PASS'|'REPLAY', score, hazards, mistakes, nearMisses, where, wrong, zoneTimes, missed, lang, room?})` after consent; certificate link via `SL.certLink`.
- Events: an automatic NEPA blackout after the racking stop; trainer events (`fire_alarm` = drill unless it is the last stop, `nepa`, `spill`, `rain`, `end`). Links to other pages go through `PG` so `build.py` can point the offline copy at the offline pages.
- Test hook `window.WH`: `state()`, `station()`, `teleport(x, z)`, `step(n, dt)`, `render()`, `correct()`, `flCorrect()`, `hazards()`, `inspect(id)`, `overview()`, `ents()`, `event(type)`, `end()`, `walk(x, z)`.

### Shared layer `SL` (`src/common.js`)
- **Translation**: `tr()` / `SL.t()`, plus a MutationObserver that translates every text node (exact match → match without the emoji prefix → `{0}` patterns). Add new English UI text and its Pidgin to `src/i18n/pcm.json`. Mark nodes that must not be translated with `data-notr`.
- **Consent** (NDPA 2023) before anything is sent; **settings** (quality with an fps watchdog, text size, captions, voice, colour-blind markers); number keys 1–9 answer questions.
- **Results**: `SL.post(rec, cb)` sends to `api/result` on our own server and/or `?results=` (Google Sheets), queues offline in IndexedDB, reports to an LMS via `SL.lms`, and exposes `SL.lastId` / `SL.certLink(id)`.

### Results: routes chosen automatically
1. **claude.ai artifact**: the `db` capability writes `results/<userId>`; the HSE Dashboard is in the page (owner and editors). People outside the organization can only view, so their results cannot be saved there.
2. **Own server** (local, tunnel or VPS): `POST /api/result` → `{ok, id}`; dashboard `/hse?key=…` with filters, person history, class view, analytics and CSV; certificate `/cert/<id>`; verify `/verify/<id>` (valid for `VALID_MONTHS`, default 12).
3. **Google Sheets** (`?results=<Apps Script URL>`, see `deploy/google-sheets/`).
4. **Anywhere**: the WhatsApp/email button on the end screen.

### Group sessions (`src/room.js`)
Players with the same group code see each other. On our own server it polls `/api/room/<CODE>`; in the claude.ai artifact it uses the `room` capability (named room `g-<code>`; editors are trainers). Trainers (`&trainer=1`, the artifact's editors, or `/trainer?room=CODE` on the server) can send `fire_alarm`, `nepa`, `spill`, `rain`, `end`.

### Publishing the claude.ai artifact
Publish `index.html` with `files: {"lite.html": …, "kids.html": …, "little.html": …, "warehouse.html": …, "builder.html": …}` (add `warehouse.html` so the new selector card works there). Omit `capabilities` to keep the stored declaration (db rules: `results` read admin / write owner; `results/{self}` read and write interact). The `room` capability must be declared (once) for group sessions to work there.

## Gotchas
- **Don't kill processes with `pkill -f` or a `ps | grep` pattern that also matches your own shell command.** It kills your shell (exit 144). Use the PID from `$!`. `ss` is not installed in the sandbox.
- Auto-questions fire within `0.75 × r` of a zone. Keep start points out of that range.
- Keep start-screen IDs stable (`#nm`, `#co`, `#spin`, `#start`, `#slConsent`, `#room`, `#cls`), because the tests use them.
- Never add a static `<link rel="manifest">`: on `file://` it logs a console error and the tests fail. `common.js` adds it on our own server.
- Hosting: Vercel Hobby is non-commercial only; the Netlify free plan pauses sites when credits run out. See `HOSTING-OPTIONS.md`.
- Personal data falls under Nigeria's **NDPA 2023**. Don't add personal fields without updating the privacy notice.

## Conventions
- Keep pages **single-file and dependency-free** (three.js r128 from cdnjs or jsdelivr only). No bundlers.
- The owner wants **existing games left unchanged** when adding new ones. Add new worlds, courses or modes alongside and link them from the selector cards.
- User-facing text: plain English, short sentences, Nigerian context (NEPA, danfo, okada, keke, "Oga", Pidgin where natural). Every question has exactly one correct answer that matches Nigerian law or recognised good practice.
- Commit messages: imperative subject and a short body. Work on the branch you are given; don't open PRs unless asked.
