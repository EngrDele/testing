# Build recipes

All paths are relative to `safety-game/`. The pages (`index.html`, `kids.html`, `little.html`, `warehouse.html`, `builder.html`, `*-offline.html`) are **generated** by `src/build.py`, so edit the sources in `src/` and rebuild. Read the existing code next to where you add things and copy its patterns; the notes below say where to look.

---

## Recipe A: age 4, a new Little Stars scene (`src/little-game.js`)
Little Stars is tap-only, with no reading and no losing. A scene is one small dollhouse diorama, built when the scene starts and disposed when it ends.

1. Add an object to `SCENES` (copy the shape of an existing scene such as `hands` or `hot`):
   ```js
   { id:'gas', title:'Gas smell', guide:'mummy', view:{x:0,z:0,w:6,d:5,h:2.2},
     intro:'Sniff sniff. Something smells funny in the kitchen!',
     build(){ board({floor:…, wall:…}); /* props via grp/bx/cyl/mt; register tappables: */ tapObj('cooker', at(obj,x,y,z), {r:.7}); guide('mummy',2.6,.6); },
     steps:[
       { say:'Smell gas? Do not touch anything. Tap Mummy to tell her.', ok:['mummy'], decoys:['switch','matches'],
         yes:{mummy:'Good! Always tell a big person.'}, no:{switch:'No! Switches can make a spark.'} },
       …
     ],
     rule:'Gas smell? Don\'t touch. Go out. Tell a big person.',
     tip:'Parents: turn off the cylinder valve at night and teach your child the smell of gas.',
     review: null /* or a note when a professional must check it */ }
   ```
2. Step options (see the `### Little Stars` section in `CLAUDE.md`): `say`, `ok`, `decoys`, `yes`/`no`, `order`, `need`/`repeat` (scrubbing or tapping fast), `view` (camera zoom), and the hooks `enter`, `onOk`, `check`. Picture cards: `cards`.
3. Add a sticker and a menu tile picture. Find how the existing scenes draw their tile icons on canvas, because there is no emoji font in headless tests or on some phones.
4. Keep 3–4 taps, about 30–60 s. Always end on the rule. Write the tip for the parent.
5. Test: `tests/playthrough.js` → `little` uses the `window.LS` hook (`play(ids)`, `tapId(id)`, `step()`, `state()`). Add your scene id and the correct taps.

## Recipe B: age 8, a new kids world (`src/kids-game.js`)
1. Add `DATA.<world>` (copy `water` or `market`):
   ```js
   flood: {
     title:'Flood Day', icon:'🌧️🏠', start:{x,y,face}, final:'<last mission id>', midHint:'<mission id>', extraStars:0,
     guideName:'👩🏾 Mummy', welcome:n=>'🌧️ Good morning, '+n+'! Follow Mummy and the yellow arrows.',
     outroMsg:'…', intro:'…',
     escort:{label:'Mummy · follow me', look:{sex:'f', skin:'#5a3825', …}},   // makeHuman options
     missions:[ {id, name, x, y, r:55, q:{e:'🌊', who, text, o:[{t, ok:false, heart:true, why}, {t, ok:true, why}]}}, … ],   // 6–9 missions; `when:lastMission('id')` for the final one
     hazards:[ {k, e, t, x, y, h:1}, … , {k, e, t, x, y, h:0} ],   // 6 real + 3 decoys
     hazPick:5, decoyPick:2,
   },
   ```
   Map units: 1 unit = 5 cm. Missions, start and hazards must not be inside a solid.
2. Register the world:
   - add it to `KID_WORLDS` (top of the file);
   - add `build<World>(scene)` to `EXTRA_BUILD`;
   - add a card to `KID_CARDS` (start-screen selector).
3. Write `build<World>(scene)` next to `buildWater` / `buildMarket`. Use the shared helpers (`floorRect`, `wall(…,{gaps})`, `place(…)`, `makeHuman`, `makeCar` / `makeDanfo` / `makeOkada`, `std`, `TX.*`, `consolidate`, `inst`), and the `ROADS` / `ZEBRAS` / `VEH` road system if there is a road. Tag decoration `userData.decor = true`. Give each hazard `k` a 3D model, following the existing hazard-model lookup.
4. Add a card to the factory start screen: `src/factory.html`, the `.games` block. Use `href="kids.html?world=<world>"`, which `build.py` already rewrites for offline.
5. Test: `tests/playthrough.js` → the `KIDS` list and `kids()`. Add the world, any world-specific steps, and a `SHOTS[world]` screenshot spot outside the mission rings.

## Recipe C: age 12, challenge features or a bigger game
Prefer extending a kids world with **challenge features**, so 8 and 12-year-olds share the world but the 12-year-old gets more:
- a `?level=12` (or a "Challenge" toggle on the start screen) that switches on harder questions (3–4 options), a timer, and multi-step missions (`when()` chains);
- consequences that play out, for example ignoring a gas smell starts a "smell" event that needs a second decision;
- "teach your sibling": a younger NPC follows the player, and the player must keep them out of danger (holding hands at the road, stopping them touching the pot);
- score, rank and a class/family leaderboard via `?class=` (the server already groups by class at `/hse/class`).

For something bigger (home alone, flood day, first-aid course), make a **new page** like `warehouse.html`:
1. `src/<name>-shell.html` + `src/<name>-game.js`.
2. Add a `<name>_page()` to `src/build.py` like `warehouse_page()`, including the offline copy and link rewriting both ways (look at the `PG` constant trick in the warehouse game).
3. Reuse `SL` (consent, `tr`, settings, `SL.speak`, `SL.post`, `SL.certLink`, `SL.lms`) and `SLRoom` for group play.
4. Clean UI: copy the warehouse card style (white rounded cards, inline SVG icons, bottom sheet on phones).

## Recipe D: adults
- **A new course in the factory:** add `courses.<id>` to `sites/acme-ikeja.json` (zones, scenarios, `keep`, `route`, optional `prop`), load it with `index.html?course=<id>`, and add a start card.
- **A new client site:** make it in `builder.html` and export to `sites/<client>.json`.
- **A new episode:** a new page, as in Recipe C, using `warehouse.html` as the model.

---

## Integration checklist (every new game)
- [ ] Selector cards: factory start (`src/factory.html` `.games`), kids (`KID_CARDS` / `littleCard()` / `warehouseCard()` in `src/kids-game.js`), and the Little Stars and warehouse menus if they list games.
- [ ] `src/build.py`: new page and offline copy, with offline link rewriting for every page that links to it.
- [ ] `sw.js`: add the page to the precache list and **bump the cache version**.
- [ ] `src/package_site.py`: add any new page (and its offline copy) to `PAGES`, so it is published to Cloudflare.
- [ ] `src/scorm.py`: add a package line (`ALWAYS` set and list).
- [ ] `server/sitelife_server.py`: game label and kids-game list, if it has one.
- [ ] `SL.post({game:'<id>', …})` only after consent; for kids, `class` from `?class=`, `zoneTimes`, `missed`, `score`; certificate link via `SL.certLink`.
- [ ] Pidgin for every new string in `src/i18n/pcm.json`; `GAME_LANG=pcm` run shows 0 untranslated.
- [ ] `tests/playthrough.js`: plays to the end, one wrong answer, checks the posted result; no page errors.
- [ ] Phone and desktop screenshots looked at; the player is never hidden (see the warehouse x-ray silhouette in `addXray()`).
- [ ] Docs: `CLAUDE.md` games and files tables plus an architecture note; `docs/HANDOVER.md` games table and timeline; `ROADMAP.md`; `research/IDEAS.md`; `research/LOG.md`.
- [ ] Rebuild, commit the generated pages too (CI fails otherwise), and push.
- [ ] Play link: read it from the "Publish games (Cloudflare Pages)" run for your branch and give it to the owner (`references/publishing.md`).
