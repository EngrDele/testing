# Site Life: guide for agents and developers

Site Life is a set of browser-based 3D **safety training games** that replace the "watch a video, tick a paper quiz" induction. It is written in plain HTML and JavaScript, uses three.js r128 from a CDN, and has **no build tooling or npm dependencies at runtime**.

Read `CONCEPT.md` for the product idea and `ROADMAP.md` for what to build next.

## The games and files

| File | What it is | Edit directly? |
|---|---|---|
| `index.html` | **Factory Site Induction** (the main game) plus the game selector on its start screen. One self-contained file. | ✅ yes |
| `src/kids-game.js` | Source for the two kids games: `?world=home` (Home → School Bus) and `?world=school` (School Safety) | ✅ yes |
| `kids.html` | **Generated** by `src/build.py`: page shell + the 3D engine copied out of `index.html` + `src/kids-game.js` | ❌ rebuild it |
| `site-life-offline.html`, `kids-offline.html` | **Generated** single files with three.js inlined (work offline, e.g. sent on WhatsApp) | ❌ rebuild them |
| `lite.html` | Older 2D version, used as a fallback when WebGL fails | rarely |
| `server/sitelife_server.py` | Python standard-library server: serves the games, `POST /api/result`, HSE dashboard `/hse?key=…`, CSV export | ✅ |
| `server/setup-ubuntu.sh` | One-command VPS install (systemd + Caddy with automatic HTTPS, `sslip.io` or a custom domain) | ✅ |
| `START-SERVER.bat`, `start-server.sh` | Run the game and results server locally (port 8080, key stored in `hse-key.txt`) | ✅ |
| `tests/` | Playwright end-to-end playthroughs plus server checks | ✅ |
| `CONCEPT.md`, `HOSTING-OPTIONS.md`, `TUNNEL-GUIDE.md`, `server/REMOTE-SERVER-GUIDE.md` | Docs for the owner (plain English, Nigerian context) | ✅ |

## Build and test (run these before every commit)

```sh
cd safety-game
bash tests/setup.sh                       # once: fetches three.js r128 + Sky.js from npm into tests/vendor/
python3 src/build.py tests/vendor/three.min.js tests/vendor/Sky.js   # rebuild kids.html + offline files
bash tests/server-test.sh                 # results server: 12 checks
node tests/playthrough.js                 # plays factory, home and school to the end (~5–10 min with software WebGL)
node tests/playthrough.js school          # or only one game
```

All of them must print `PASSED`. If you change `index.html`'s engine section or `src/kids-game.js`, **always rebuild**, because the generated files are committed.

### Testing notes (learned the hard way)
- **Headless WebGL is software rendering (SwiftShader), so it runs at about 1–3 fps.** The test harness therefore calls the game's `update(dt)` / `render3D()` / `drawHUD()` directly through `page.evaluate` instead of waiting for animation frames. Do the same in new tests.
- Teleport the player with `S.p.x = …; S.p.y = …` and then step a couple of updates; that is how the tests visit zones.
- **Some things use real timers**: the factory fire alarm starts 5 s after the last zone, and random events retry every 1 s while a modal is open. Loop with `waitForTimeout(1000)` and resolve modals in between.
- **Headless Chromium has no emoji font**, so emoji in canvas textures and screenshots look blank. That is not a bug; real phones show them.
- The sandbox usually **blocks the CDNs** (cdnjs, jsdelivr). `tests/setup.sh` gets the same files from the npm registry, and the tests route the CDN URLs to them.
- Screenshots: `page.screenshot({path})` after a `render3D` step, then look at the image to check visuals.

## Architecture

### Coordinates
- The world is in **map units: 1 unit = 5 cm** (`K = 0.05`). Map `x` maps to three.js `X(x) = x*K`, and map `y` maps to `Z(y)`.
- People and vehicles **face -Z** by default. To face direction `(dx, dy)` use `rotation.y = atan2(-dx, -dy)`.
- Camera: `yaw = 0` looks north (−y). Movement uses forward `(-sin yaw, -cos yaw)`.
- **Collision** is 2D: axis-aligned rectangles in `SOLIDS` (kids) or `solids()` (factory), with a circle of radius about 10–13 units for the player. Start positions and mission points must **not** be inside a solid, or the player is stuck.

### `index.html` sections (search for the `// ====` banners)
`DATA` (scenarios `SC`, `EVENTS`, hazards) → `WORLD` (buildings, zones, NPCs) → `STATE` → `AUDIO` → `UI` → `INTERACTIONS` → `PPE SELECTION` → `GUIDE / ESCORT` (A* pathfinding on a 20-unit grid; the forklift lane costs more except at the zebra crossings) → `SHARE RESULT` (WhatsApp/email) → `HSE RESULTS` (claude.ai `db` capability, then `postServer()` to `/api/result`) → `COLLISION` → `UPDATE` → **`3D (realistic)` … `world build`** (the shared engine) → `world build` (`initThree`) → render → `LOOP` → `INPUT` → `START`.

**`src/build.py` copies everything between `// ================== 3D (realistic) ==================` and `// ---------- world build ----------` into `kids.html`.** Do not rename those two banner lines. Anything you add between them must not depend on factory-only globals such as `S.forklift` or `ZONES`.

### The shared 3D engine (inside that banner range)
- `std(color, {r, m, map, normalMap, emissive, …})` makes a PBR material. Colours go through `lin()`, because output is sRGB with ACES tone mapping.
- `tex(canvas, rx, ry, srgb)`, `mkCanvas`, `normalFrom` (normal map from a height canvas), and `buildTextures()` → `TX.pavers/asphalt/concrete/grass/plaster/corr/shutter/block`, all procedural.
- `bx/cyl/sph/mesh` helpers; `inst()` + `flushInst()` for instanced meshes (keep `frustumCulled = false`).
- `consolidate(group)` merges child meshes that share a material into one, to cut draw calls. Mark a mesh `userData.keep = true` if it must stay separate (toggled visibility, animated, transparent).
- `makeHuman(opts)` builds an articulated person. Options: `sex, skin, top, bottom, topMap, dress, outfit('shirt'|'dress'|'coverall'|'chef'), hair('low'|'afro'|'bun'|'braids'|'none'), beard, gele(canvas), build('heavy'), hat('hard'|'chef'|'cap'), hatColor, vest, vestColor, goggles, muffs, gloves, boots, label, height`. Animate it with `animHuman(g, step, moving, t, seated)` and toggle PPE with `setPPE(g, {hat, vest, goggles, muffs, gloves, boots})`.
- `latheMesh(profile)` auto-reverses descending profiles. A descending profile renders inside-out.
- Vehicles: `makeCar(color, len, wid, ht, van)` (front is −Z), `makeDanfo()`, `makeOkada()`, `makeForklift()`. Props: `makeProp(emoji)` for factory hazards.

### Kids engine (`src/kids-game.js`)
- `DATA[world]` declares `missions` (ordered, each with an optional `when()` and a question `q`), `hazards` (`h: 1` for a danger, `0` for a safe decoy), `start`, `escort`, `intro`.
- The worlds are built in `buildHome()` and `buildSchool()` using `floorRect`, `wall(…, {gaps})` (cutaway "dollhouse" walls about 1.35 m high, so the camera sees over them), `place(scene, F.furniture(), x, y, rot, [solidW, solidH])`, and `G_NPC.push(...)`.
- Road safety uses `ROADS` and `ZEBRAS` rectangles plus `VEH` on lanes `A` and `B`. Vehicles stop for a child on the zebra; walking on the road anywhere else costs a heart.
- Hearts (3) and stars replace the factory's body bars. Questions are read aloud with `speechSynthesis`.

### Results: three routes, chosen automatically
1. **claude.ai artifact**: the `db` capability writes `results/<userId>`; the HSE Dashboard is in the page (owner and editors only). People outside the organization can only view, so their results cannot be saved there.
2. **Own server** (local, tunnel or VPS): the games `POST /api/result`; the dashboard is at `/hse?key=…`; data goes to `server/data/results.jsonl`.
3. **Anywhere**: the WhatsApp/email button on the end screen (`?hse=<number>&email=<addr>` in the URL pre-fills the recipient).

### Publishing the claude.ai artifact
Publish `index.html` with `files: {"lite.html": …, "kids.html": …}`. Omit `capabilities` to keep the stored db rules (`results` read admin / write owner; `results/{self}` read and write interact). The artifact URL is in the owner's chat history.

## Gotchas
- **Don't kill processes with `pkill -f` or a `ps | grep` pattern that also matches your own shell command.** It kills your shell (exit 144). To stop a test server, use the PID from `$!`, or scan `/proc/*/cmdline` for `argv[0]` ending in `python3`. `ss` is not installed in the sandbox.
- Auto-questions fire within `0.75 × r` of a zone. Keep start points out of that range.
- Keep each start-screen form field ID unique (`#nm`, `#co`, `#spin`, `#start`), because the tests use them.
- Hosting: Vercel Hobby is non-commercial only, and the Netlify free plan pauses all sites when credits run out. See `HOSTING-OPTIONS.md`.
- Personal data (names, companies, results) falls under Nigeria's **NDPA 2023**. Don't add new personal fields without a privacy notice. See ROADMAP P1.

## Conventions
- Keep pages **single-file and dependency-free** (three.js r128 from cdnjs or jsdelivr only). No bundlers.
- The owner wants **existing games left unchanged** when adding new ones. Add new worlds alongside them and link them from the selector.
- User-facing text: plain English, short sentences, with Nigerian context (NEPA, danfo, okada, keke, "Oga", Pidgin lines where natural).
- Commit messages: imperative subject and a short body. Work on the branch you are given; don't open PRs unless asked.
