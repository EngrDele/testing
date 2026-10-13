# Site Life roadmap

## Status (October 2026)
All items below have a first version built, except 13 (real client scans: the `placeSiteModel` hook is ready, but needs a client's Polycam scan) and the native-speaker review of the Yorùbá, Hausa and Igbo drafts. Next steps for each are in **Next** lines. New game ideas live in `research/IDEAS.md`; a weekly routine researches and builds one.

| # | Item | Status |
|---|---|---|
| 1 | Privacy notice, consent, retention | ✅ Done |
| 2 | Languages | ✅ Pidgin full; Yorùbá, Hausa, Igbo drafts (UI + kids) need native review and the factory questions |
| 3 | Site file + builder | ✅ `sites/acme-ikeja.json`, `builder.html`. **Next:** let the builder move the gate, lane, car park and muster point |
| 4 | Dashboard, certificates, verify, expiry | ✅ server; **Next:** same filters in the in-artifact dashboard |
| 5 | Offline app | ✅ `sw.js`, manifest, IndexedDB queue |
| 6 | Graphics settings | ✅ Low/Medium/High + auto; **Next:** low-poly `makeHuman` |
| 7 | Advanced course | ✅ `?course=advanced` |
| 8 | Oga Mode | ✅ `?mode=oga` |
| 9 | Multiplayer | ✅ group code (server polling or artifact `room`); **Next:** voice chat, trainer view of everyone on the map |
| 10 | More kids worlds | ✅ market, water, online |
| 11 | Class / family codes | ✅ `?class=`, `/hse/class` |
| 12 | glTF characters | 🟡 hook ready (`makeHumanGLTF`, `SL_AVATAR_URL`); needs licensed avatar files |
| 13 | Real client sites | 🟡 hook ready (`placeSiteModel`); needs a scan |
| 14 | VR | ✅ `XR` (untested on a real headset) |
| 15 | SCORM | ✅ `python3 src/scorm.py` |
| 16 | Cloudflare + Google Sheets | ✅ `deploy/` |
| – | CI, Python server tests, accessibility, analytics | ✅ |

Each item is written so an agent can pick it up as a task. Read `CLAUDE.md` first. Every task ends with: rebuild (`python3 src/build.py …`), run `bash tests/server-test.sh` and `node tests/playthrough.js`, and add or extend a test for the new behaviour.

## P1: Ready for a real pilot

### 1. Privacy notice and consent (NDPA 2023)
- **What:** before the start screen, show a short notice: what is collected (name, company, results), why, who sees it, and how long it is kept, with a "I understand" button. Make the retention period configurable on the server (`RETENTION_DAYS`) and add a cleanup on start-up.
- **Done when:** results are only sent after consent; the server deletes rows older than `RETENTION_DAYS`; there is a test for both.

### 2. Language switch (English, Pidgin, Yoruba, Hausa, Igbo)
- **What:** move every user-facing string (`SC`, `EVENTS`, `HAZARDS`, UI labels, and the kids `DATA`) into a `TEXT[lang]` table with English as the fallback. Add a language picker on the start screen and use the matching `speechSynthesis` voice where one exists.
- **Done when:** switching language changes all questions and the UI, and the tests pass in each language (run the playthrough with `?lang=pcm`). Translations need review by native speakers, so mark them `// TODO review`.

### 3. Site builder (turn a client's compound into a game quickly)
- **What:** move the factory layout (`BUILD`, `ZONES`, `NPCS`, hazard `SPOTS`, scenarios) into a JSON site file such as `sites/acme-ikeja.json`, loaded with `?site=`. Then build a simple 2D editor page (`builder.html`) to draw buildings and zones on a grid, pick scenarios from a library, and export the JSON.
- **Done when:** the existing factory runs from `sites/acme-ikeja.json` exactly as now, the playthrough test passes, and a new site can be made in the editor without code.
- This is the most important item for the business, because it makes each new client cheap to set up.

### 4. HSE dashboard upgrades (server and artifact)
- **What:** filters by date, company, game and result; a per-person history; a **printable certificate** (HTML print view) with a QR code that verifies at `/verify/<id>`; refresher reminders ("expires in 12 months").
- **Done when:** the filters work on 1,000 or more rows, a certificate prints on one A4 page, and verification shows valid or expired.

### 5. Works on weak networks (installable offline app)
- **What:** add `manifest.webmanifest` and a service worker that caches the pages and three.js. Queue `POST /api/result` in IndexedDB when offline and send it when back online.
- **Done when:** the game loads in airplane mode after one visit, and a result recorded offline arrives at the dashboard later.

### 6. Graphics settings for low-end Android phones
- **What:** a ⚙️ menu with Low, Medium and High quality: shadows off or on, pixel ratio, fewer trees and props, and a lower-detail `makeHuman` (fewer segments). Auto-select Low when the frame rate drops below 25 fps.
- **Done when:** about 30 fps on a ₦100k Android phone (test with Chrome DevTools CPU throttling ×6 as a proxy).

## P2: More content

### 7. More factory scenarios
Work at height (harness and scaffold tag), confined space entry (gas test, standby man), hot work permit (welding near diesel), chemical spill response (spill kit, SDS), first aid (bleeding, burns), manual handling (lifting technique), and journey management (drive to site, seatbelt, phone). Each needs a zone, a question, 3D props and a test.

### 8. Supervisor mode ("Oga Mode")
The player is the supervisor. NPC workers make unsafe choices on a timer, and the player must spot them and intervene (stop work, correct PPE). Score on how fast they react.

### 9. Multiplayer induction session
Use the artifact `room` capability (or WebSockets on the server) so a trainer and up to 20 trainees see each other's avatars in the same compound. The trainer can trigger events (fire alarm, NEPA) for everyone.

### 10. More kids worlds
- Market and road trip: crowds, getting lost, keke and okada safety.
- Beach and swimming pool: water safety.
- Online safety: strangers in chat, sharing photos.
- Each world is a new `DATA[world]` plus a `build<World>()`, linked from the selector cards in `index.html` and `kids.html`.

### 11. Parent and teacher dashboard for the kids games
Group results by class or family code (`?class=JSS1A`), and show progress, stars and the most common mistakes per child.

## P3: Bigger upgrades

### 12. Realistic characters
Replace the procedural `makeHuman` with rigged glTF characters (licensed packs or Ready-Player-Me-style avatars) through `GLTFLoader` and skinned animation (walk, idle, point). Keep `makeHuman` as the low-detail fallback.

### 13. Real client sites
Use photogrammetry or a phone LiDAR scan (Polycam) to capture the client's buildings as glTF and place them in a site JSON from item 3.

### 14. VR mode
Add a WebXR "Enter VR" button for headsets, with teleport movement and pointer selection of answers.

### 15. LMS export
Package each game as SCORM 1.2 (`imsmanifest.xml` + a wrapper that reports score and completion) for TalentLMS and Moodle.

### 16. Cloud deploy option
A Cloudflare Pages deploy plus a Google Sheets adapter for results (Apps Script `doPost`), as an alternative to the VPS server. See `HOSTING-OPTIONS.md`.

## Engineering clean-up
- **CI:** a GitHub Actions workflow that runs `tests/setup.sh`, `tests/server-test.sh` and `node tests/playthrough.js` on every push, with Playwright and SwiftShader.
- **Split the engine:** move the shared 3D engine from `index.html` into `src/engine.js` and build both `index.html` and `kids.html` from it, instead of copying it out by banner comments.
- **Server tests in Python** (`unittest`) for rate limiting and bad input.
- **Accessibility:** captions for all voice, larger text options, a colour-blind-safe palette for the guide arrows and markers, and full keyboard play.
- **Analytics:** time per zone and the most-missed hazards, shown on the dashboard, so clients can see where their workforce struggles.
