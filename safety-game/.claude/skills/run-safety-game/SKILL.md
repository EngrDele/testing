---
name: run-safety-game
description: Run, start, launch, drive, play, screenshot or smoke-test the Site Life safety games (safety-game/: factory index.html, kids.html worlds, little.html, warehouse.html, builder.html) and the results server, headlessly in this container. Use to see a change working in the real game, not just the test suite.
---

# Run Site Life (safety-game)

Site Life is a set of static three.js pages, built from `src/` by `src/build.py`, plus a Python results server. The agent path is **`driver.mjs`**: a Playwright REPL that opens a page in headless Chromium with software WebGL, serves three.js from `tests/vendor` (the CDNs are blocked), and takes commands on stdin. All paths below are relative to `safety-game/`.

## Prerequisites (once per container)
Node, Python 3 and a global Playwright with Chromium are already present here (`/opt/pw-browsers`). Fetch three.js:
```bash
bash tests/setup.sh
```

## Build
The pages are generated, so always rebuild after editing `src/`, `sites/` or `src/i18n/`:
```bash
python3 src/build.py tests/vendor/three.min.js tests/vendor/Sky.js
```

## Run (agent path): the driver
Pipe commands in. It prints `$ command` / `> result` and exits non-zero if the page logged errors.
```bash
node .claude/skills/run-safety-game/driver.mjs <<'EOF'
open index.html
start Ada Test
tp 160 1200
step 2
eval document.querySelector('.modal h2') && document.querySelector('.modal h2').innerText
key Digit2
eval document.querySelector('.modal .fb') && document.querySelector('.modal .fb').innerText
ss factory
errors
quit
EOF
```
This opens the factory, starts a shift, teleports to the gate, answers the Security question with key 2, and screenshots `tests/out/drive-factory.png`. **Open the PNG and look at it.**

Through the results server (http://), covering the other games:
```bash
node .claude/skills/run-safety-game/driver.mjs <<'EOF'
serve 8090
open warehouse.html
start Ada
step 60
eval WH.inspect('FL-01')
step 30
eval document.querySelector('#panel h3') && document.querySelector('#panel h3').innerText
ss warehouse
open little.html
fill #pn Mummy Ngozi
start Ada
eval LS.play(['hot'])
step 20
eval LS.state().scene
ss little
open kids.html?world=market
start Ada
step 20
ss kids-market
errors
quit
EOF
```

**Commands:**
- `serve [port]`: start the results server with dashboard key `drive`, and use http from then on.
- `base <url>`: load pages from another address, such as the static Cloudflare copy (`python3 src/package_site.py`, then `python3 -m http.server 8095 -d dist/site`). The full check is in `.claude/skills/site-life-games/references/publishing.md` at the repo root.
- `open <page?query>`
- `start [name]`: fills the name, ticks consent, spins the factory role, then presses Start.
- `step [n] [dt]`: advances the game n frames of dt seconds, then renders.
- `tp x y`: teleports the player.
- `click <css>`, `fill <css> <text>`, `key <Key>`, `size w h`, `wait ms`, `eval <js>`
- `ss [name]`: renders and saves `tests/out/drive-<name>.png`.
- `errors`, `quit`

**Game hooks for `eval`:**
- **Factory and kids:** the globals `S` (state, `S.p` is the player), `ZONES`, `MISS`, `doAct()`.
- **Warehouse:** `WH.*`, i.e. `state()`, `teleport(x, z)` in metres, `inspect(id)`, `correct()`, `hazards()`, `event(type)`.
- **Little Stars:** `LS.*`, i.e. `play(ids)`, `tapId(id)`, `state()`.

## Static copy (what Cloudflare Pages serves)
`python3 src/package_site.py` writes `dist/site/` and marks the pages `SL_STATIC_HOST`. There, `SL.hasServer()` is `false`, so no `api/result` POST and no certificate link. On the results server it is `true`, and `SL.post` returns `{"status":"sent", id}` **once the privacy box is ticked**; without it, the status is `noconsent`.

## Results server (curl)
```bash
D=$(mktemp -d) && HSE_KEY=drive PORT=8091 DATA_DIR=$D python3 server/sitelife_server.py >/dev/null 2>&1 & SP=$!
timeout 20 bash -c 'until curl -sf localhost:8091/ >/dev/null; do sleep .5; done'
curl -s -X POST -H 'Content-Type: application/json' -d '{"game":"warehouse","name":"Ada","result":"PASS","score":92}' localhost:8091/api/result
curl -s "localhost:8091/hse?key=drive" | grep -o "Ada" | head -1
kill $SP
```
The POST returns `{"ok":true,"id":"…"}`. The certificate page is `/cert/<id>`.

## Run (human path)
`START-SERVER.bat` (Windows) or `bash start-server.sh` serves the games on port 8080 and opens the dashboard. Players use a browser. There's no point doing this headless; use the driver.

## Tests
```bash
python3 -m unittest tests/test_server.py && bash tests/server-test.sh
node tests/playthrough.js warehouse      # one game; with no argument, every game (25–35 min)
```

## Gotchas
- **Rendering is very slow headless** (software WebGL, about 1 fps). The driver stops the page's own animation loop (`requestAnimationFrame = () => 0`) and moves time with `step`. Don't wait for frames, and don't `sleep`.
- **Service workers break http runs.** On http the games install `sw.js`, which fetches three.js from the blocked CDN itself and bypasses the driver's routing. Every later page then dies with `THREE is not defined` and `net::ERR_FAILED`. The driver creates its context with `serviceWorkers: 'block'`. Keep that if you write your own script.
- **The factory state `S` is a top-level `let`, not `window.S`.** Test it with `typeof S !== 'undefined'`. (`window.S` is undefined, and an early version of the driver concluded "no game loaded".)
- **Answer order is shuffled in every question.** `key Digit2` picks whatever happens to be second. To pick the right answer, read the options with `eval` first, or use the game's hook (`WH.correct()` in the warehouse).
- **Questions pop up automatically within about 0.75 × the zone radius.** After `tp` you need a `step` before the modal exists.
- **`WH.inspect(id)` returns `undefined`.** The panel fills in after the next `step`.
- **Little Stars has extra start fields** (`#pn` parent name, `#ph` phone). `start` fills only the name; use `fill` for the others.
- **Rebuild before driving.** The driver loads the generated `*.html`, not `src/`.
- **Run one browser at a time.** Two headless WebGL pages at once makes the second one's load time out.

## Troubleshooting
| Symptom | Fix |
|---|---|
| `tests/vendor missing: run bash tests/setup.sh` | Run it (it fetches three.js r128 and Sky.js from npm). |
| `pageerror: THREE is not defined` after `serve` | A service worker from an earlier run took over. Use the driver, which blocks service workers. |
| `page.fill: Timeout 30000ms exceeded` on `#nm` | The page didn't load (see the line above), or you're already past the start screen. |
| `stepped no game loaded` | `open` a game page first. |
| `SyntaxError: Unexpected reserved word` at `for await` in the driver | A stray edit commented out code on the line above. Run `node --check .claude/skills/run-safety-game/driver.mjs`. |
