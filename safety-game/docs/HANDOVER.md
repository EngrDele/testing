# Site Life: project handover

**Read this first if you are picking up the project** (human or AI agent). It explains what Site Life is, what has been built, how it was built, where it stands today and where it is heading. Then read, in this order:

1. `../CLAUDE.md`: the technical guide (files, architecture, build, tests, gotchas). It is the source of truth for *how* to work on the code.
2. `../ROADMAP.md`: status table and the next steps for each feature.
3. `../research/IDEAS.md`: the backlog of new game ideas, and `../research/LOG.md`.
4. `TRANSCRIPT.md` (this folder): the owner's conversation with Claude that produced everything, with the owner's words verbatim.
5. `../CONCEPT.md`: the original product idea and pitch.

Last updated: 13 October 2026. Branch: `claude/lagos-safety-game-research-cq4tb4` in `EngrDele/testing`. **Not merged to `main` yet, and no pull request has been opened.** The owner has not asked for one.

---

## 1. The idea in one paragraph

Company safety inductions in Nigeria are usually "watch a video, then tick a paper quiz". The owner wanted to replace the paper quiz with a game where people **play real-life scenarios of the actual compound**. The inspiration is **Lagos Life**, a viral Sims-style browser game by Shalom Rayhamen / Vatar Inc. (launched 1 October 2026; see the Vanguard and Techpoint articles in the transcript). The result is **Site Life**: free, browser-based, realistic 3D safety games for workers, supervisors and children. They run on a phone with no install, in English, Pidgin, Yorùbá, Hausa and Igbo. Every decision is recorded, and HSE managers get a dashboard and printable certificates.

## 2. What exists today

### Games

| Game | URL | Who | Notes |
|---|---|---|---|
| Factory Site Induction | `index.html` | New workers, visitors | Role lottery (like Lagos Life's birth lottery). 14 zones, hidden hazards, PPE picker, forklift lane, reversing van, NEPA/rain events, fire alarm and muster |
| Advanced Site Course | `index.html?course=advanced` | Workers | Work at height, confined space, hot work, chemical spill, first aid, manual handling, journey management, each with 3D props |
| Oga Mode | `index.html?mode=oga` | Supervisors | Workers start unsafe acts on a timer; walk there and stop them. Scored on reaction time |
| Home → School Bus | `kids.html?world=home` | Kids 6–12 | Morning at home, the road and the school bus |
| School Safety | `kids.html?world=school` | Kids 6–12 | Classrooms, lab, canteen, playground, fire drill |
| Market & Road Trip | `kids.html?world=market` | Kids 6–12 | Crowds, getting lost, keke/okada, gutters, zebra crossing |
| Beach & Pool | `kids.html?world=water` | Kids 6–12 | Buddy system, red flag, lifeguard, drowning response, life jackets |
| Online Safety | `kids.html?world=online` | Kids 6–14 | Strangers, photo requests, scams, cyberbullying, passwords |
| Little Stars | `little.html` | Children 3–6 with a parent | Tap-only, no reading, no losing. 10 scenes, sticker book, parent tips |
| Site Builder | `builder.html` | HSE staff / sales | Draw a client's compound and write its questions, then play it in 3D |
| Lite (2D) | `lite.html` | Fallback | Old 2D version when WebGL fails |

All the games are linked from cards on the start screens. The owner insisted that **existing games stay unchanged** when new ones are added, and that rule has been kept.

### Features across the games
- **Realistic 3D** (three.js r128): PBR materials, procedural textures, articulated people with PPE that appears on the body, vehicles, weather, day/NEPA/rain lighting.
- **Auto questions** when you reach an area, and an **HSE escort / guide** who walks ahead with yellow ground arrows (A* pathfinding). A light beam was removed at the owner's request because it blocked the view.
- **Languages**: English and full Pidgin (about 1,350 entries). Yorùbá, Hausa and Igbo are drafts that need native-speaker review; the factory questions show in English in those three.
- **Privacy** (Nigeria's NDPA 2023): consent before anything is sent, and server retention (`RETENTION_DAYS`).
- **Accessibility**: captions, text size, colour-blind-friendly markers, number keys to answer, keyboard play, and Low/Medium/High graphics with automatic Low on slow phones.
- **Results** go to whichever route is available:
  - the claude.ai artifact's database;
  - our own Python server (HSE dashboard with filters, person history, class view, analytics, CSV, A4 certificates with QR codes, verify pages, 12-month expiry);
  - a Google Sheet;
  - WhatsApp or email.
- **Group sessions**: a group code shows everyone in the same compound, and the trainer triggers a fire alarm, NEPA, a spill, rain or the end of the session.
- **Offline**: the installable app (service worker plus IndexedDB result queue) and single-file offline copies to send on WhatsApp.
- **LMS**: SCORM 1.2 packages for Moodle and TalentLMS.
- **VR** (WebXR) mode and **glTF hooks** for real avatars and scanned buildings. Both are untested with real hardware or assets.
- **Weekly research routine**: every Monday at 08:52 Lagos time, a fresh cloud session researches safety problems, adds ideas, builds one new game, tests it and pushes a `research/<date>-<slug>` branch. It never opens PRs and never changes existing games. The routine is a claude.ai Routine named "Site Life weekly game research", and its agent instructions are in `.claude/agents/game-researcher.md`.

### Where it runs
- **claude.ai artifact**: https://claude.ai/artifact/JMb4DRzswUXTT1hCFWf4T6. It is private, so the owner shares it from the page's Share menu. Only people in the owner's organization, or people invited to it, can open it, and outsiders can view but not save results.
- **Owner's own PC**: `START-SERVER.bat` (Windows) or `start-server.sh`, then a public link through a VS Code port-forward / dev tunnel (see `TUNNEL-GUIDE.md`).
- **VPS**: `server/setup-ubuntu.sh` (Caddy with automatic HTTPS, systemd). See `server/REMOTE-SERVER-GUIDE.md`.
- **No server**: Cloudflare Pages plus Google Sheets (`deploy/`).
- `HOSTING-OPTIONS.md` compares Cloudflare Tunnel, Tailscale Funnel, VS Code tunnels, ngrok, Netlify, Vercel and others for this use.

## 3. How we got here (timeline)

Each step was a request from the owner (see `TRANSCRIPT.md`), implemented, tested and pushed.

| Step | Owner asked for | What was done | Commit(s) |
|---|---|---|---|
| 1 | Research "the Lagos game" and turn inductions into play | Researched Lagos Life; wrote `CONCEPT.md` | 4086694, da866fe |
| 2 | "Make it like Lagos Life", a playable game | Top-down 2D walkable game (now `lite.html`) | 82732c7 |
| 3 | "Immersive 3D" | three.js 3D version | dc58088 |
| 4 | "They look like toys; make people, houses and PPE real" | PBR materials, textures, detailed humans | b2cd304, b892d5f |
| 5 | Questions should pop up automatically; better PPE | Auto-trigger, PPE picker, PPE visible on the body | b892d5f |
| 6 | First-time visitors need direction; remote play by link | HSE escort, arrows, guide panel; hosting research | 8349b95, b5da861 |
| 7 | Results to HSE; share from other companies | Artifact database, offline file, WhatsApp/email | 32cba84, 3b1fd2d |
| 8 | "The light beam blocks details" | Beam removed, ground arrows kept | 5a451ec |
| 9 | Selectable kids games (home, school bus, school); don't change the factory | `kids.html` with two worlds and selector cards | 28c6968 |
| 10 | Host from my PC with a VS Code random public link | Start scripts, results server, tunnel guide, Ubuntu setup | 1a423aa, 488aebb, 49abcef |
| 11 | "Suggest more additions and tutorials for agents" | `CLAUDE.md`, `ROADMAP.md`, automated tests | 0a1c828 |
| 12 | "Implement all", plus research that keeps adding games | The whole roadmap (below), weekly routine, research backlog | b519060 … 5a1e876 |
| 13 | Games for 3–6 year olds, "implement all" | Little Stars (10 scenes) | a4e7e6d |
| 14 | Comprehensive documentation for handover | This folder | (this commit) |

Step 12 in detail:
- engine split into `src/`;
- consent and retention;
- translations;
- site JSON and builder;
- advanced course and Oga Mode;
- dashboard, certificates and verify;
- offline app;
- graphics settings;
- multiplayer;
- three kids worlds;
- class codes;
- glTF hooks, VR and SCORM;
- Cloudflare and Google Sheets;
- CI, Python server tests, accessibility and analytics.

## 4. How it was built (methods that worked)

- **Single-file pages, no bundler.** The owner hosts from a laptop, WhatsApp or claude.ai, so every page is one HTML file with three.js from a CDN. Sources live in `src/`, and `src/build.py` (Python, standard library only) assembles them:
  - it injects `sites/acme-ikeja.json` as `SITE_DEFAULT`;
  - it injects `src/i18n/*.json` as `SL_I18N`;
  - it adds `common.js` + `room.js` + `engine.js` to every page;
  - it writes offline copies with three.js inlined.
- **Data-driven content.** The factory's layout, zones, questions, the advanced course and the Oga incidents are JSON (`sites/acme-ikeja.json`), so a new client site is a JSON file made in `builder.html`. Kids worlds are `DATA[world]` objects, and Little Stars is a `SCENES` list.
- **Automatic translation layer.** Instead of rewriting every string, a MutationObserver translates every text node from dictionaries keyed by the exact English text: exact match, then with the emoji prefix stripped, then `{0}` patterns. `tests/i18n-collect.js` and `GAME_LANG=pcm node tests/playthrough.js` list anything untranslated.
- **Testing a 3D game headlessly.** Playwright with SwiftShader software WebGL runs at about 1 fps, so the tests call the game's `update()` and `render3D()` directly, teleport the player, answer with the correct option and check the end screen. CDNs are blocked in the sandbox, so `tests/setup.sh` pulls three.js from npm and the tests route the CDN URLs to it. Every feature has a test, and screenshots were inspected by eye.
- **Parallel helper agents.** Large steps were split across sub-agents working in separate git worktrees on separate files (translations; server and CI; kids worlds; offline/SCORM/VR; Little Stars), then merged and re-tested by the main session. Conflicts were only ever in `tests/playthrough.js` and `src/build.py`.
- **Owner preferences followed throughout:**
  - plain English with Nigerian context (NEPA, danfo, okada, keke, Oga, Pidgin);
  - realistic look;
  - phone-first;
  - existing games never changed;
  - work on the given branch and no PRs unless asked;
  - privacy under NDPA 2023.

## 5. Where we are (honest status)

**Done and tested.** GitHub CI (`.github/workflows/site-life.yml`) runs on every push to the branch and passed on the latest commit (13 Oct 2026). All of these play to the end in the automated tests with no page errors:
- the factory, advanced, Oga, builder, five kids worlds and Little Stars games;
- the server unit tests and smoke tests;
- the accessibility, group-session, offline, SCORM and engine-extras tests.

**Not yet verified in the real world:**
- **Real phones**: performance has not been measured on a low-end Android (the target is about 30 fps; there is an auto-Low watchdog).
- **VR**: never tried on a headset.
- **Group sessions in the claude.ai artifact**: only the server route has been tested.
- **Google Sheets adapter**: not deployed to a real Google account.
- **Translations**: Yorùbá, Hausa and Igbo are machine drafts, and the Pidgin should also be read by a native speaker.
- **Little Stars "My body is mine" scene** must be reviewed by a child-protection professional before schools use it.
- **Voice**: the games use the device's built-in voice (`speechSynthesis`). Recorded Nigerian voice-overs would be much better, especially for small children.
- **glTF avatars and scanned sites**: the hooks are ready, but no licensed models or client scans exist yet.

**Known limitations:**
- The builder cannot move the gate, forklift lane, car park or muster point.
- Software-WebGL tests are slow (the full run takes 25–35 minutes) and flaky when several run at once.
- The in-artifact dashboard does not have the server dashboard's filters.

## 6. Where we are heading

Business direction (from `CONCEPT.md` and the conversation): a sellable induction product for Nigerian companies and schools. Each new client gets their own compound as a site file, with the results dashboard and certificates, and kids games for schools and parents.

Suggested next steps, in priority order:
1. **Pilot with one real client.** Build their compound in `builder.html`, host on a VPS, run 20–50 inductions, and collect feedback and dashboard data.
2. **Native-speaker review** of Pidgin, Yorùbá, Hausa and Igbo, and child-protection review of the Little Stars body-safety scene.
3. **Recorded voice-overs** (Nigerian voices) for the kids games and Little Stars.
4. **Real-device performance pass** on a cheap Android phone; a lower-poly `makeHuman` if needed.
5. **Merge to `main`**. CI already passes on the branch. Open a PR only when the owner asks.
6. **Builder v2**: movable gate, lane, car park and muster point; a library of scenarios by industry (oil and gas, construction, FMCG, hospitals).
7. **New games** from `research/IDEAS.md`: gas cylinder at home, flood day, building site walk, tanker and petrol station, okada/keke rider course, hospital infection control, permit-to-work/H2S, office safety. The weekly routine builds one per week on its own branch, and the owner reviews and merges.
8. **Realistic avatars and scans**: licensed glTF characters (`SL_AVATAR_URL`) and a Polycam scan of a client site (`placeSiteModel`).
9. **Commercial features**: company accounts, a per-seat licence, refresher reminders by WhatsApp/email when certificates near expiry, and in-artifact dashboard filters.

## 7. How to continue (for the next agent)

```sh
git checkout claude/lagos-safety-game-research-cq4tb4   # or the branch you were given
cd safety-game
bash tests/setup.sh
python3 src/build.py tests/vendor/three.min.js tests/vendor/Sky.js
python3 -m unittest tests/test_server.py && bash tests/server-test.sh
node tests/playthrough.js little        # quick check; the full run takes 25–35 min
```

Rules of thumb:
- Edit `src/`, `sites/`, `src/i18n/`, `server/` and `tests/`. Never edit the generated pages (`index.html`, `kids.html`, `little.html`, `builder.html`, the `*-offline.html` files); rebuild them and commit them.
- New user-facing English text needs a Pidgin entry in `src/i18n/pcm.json`.
- New games go alongside the old ones, with a selector card.
- Every question must have exactly one correct answer that matches Nigerian law or recognised good practice (ILO, ISO 45001, FRSC, WHO).
- Republish the artifact with `files: {lite.html, kids.html, little.html, builder.html}` and omit `capabilities` to keep the stored database rules and the room capability.
- The owner writes by voice: expect transcription errors ("TDD" meant 3D, "GT6" probably meant GTA, "tailcat" meant Tailscale) and read for intent.
- Talk to the owner in plain English, short sentences, practical steps. They host on their own Windows PC and share links by WhatsApp.

## 8. File map (quick)

```
safety-game/
  docs/HANDOVER.md       ← this file
  docs/TRANSCRIPT.md     ← owner ↔ Claude conversation
  CLAUDE.md              ← technical guide (read next)
  ROADMAP.md CONCEPT.md HOSTING-OPTIONS.md TUNNEL-GUIDE.md
  src/                   ← all sources (factory.html, engine.js, common.js, room.js, kids-*, little-*, builder.html, build.py, scorm.py, i18n/)
  sites/acme-ikeja.json  ← the built-in factory site (layout, questions, advanced course, Oga incidents)
  server/                ← results server + VPS setup + guide
  deploy/                ← Google Sheets + Cloudflare Pages option
  research/              ← IDEAS.md (backlog), LOG.md, plans/
  tests/                 ← Playwright + server tests
  index.html kids.html little.html builder.html *-offline.html   ← generated
  sw.js manifest.webmanifest icons/                              ← installable app
../.claude/agents/game-researcher.md   ← weekly research agent instructions
../.github/workflows/site-life.yml     ← CI
```
