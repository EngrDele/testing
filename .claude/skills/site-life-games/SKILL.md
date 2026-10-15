---
name: site-life-games
description: Suggest, plan, build and test new Site Life safety games (the 3D browser games in safety-game/), especially for the owner's main players, children aged 4, 8 and 12. Use whenever someone asks to add, suggest, plan, improve or review a Site Life game, world, scene, course or episode, or runs the weekly game research.
---

# Site Life games: how to suggest and build new ones

Site Life (`safety-game/`) is a set of browser 3D safety games for Nigeria: a factory induction, a warehouse episode, kids worlds and Little Stars. This skill is the playbook for **adding more games** so they match what exists, work for the real players, and pass the tests.

**The main players right now are three children: aged 4, 8 and 12.** Design every new kids game for one of those ages on purpose (see `references/ages.md`). Adult/worker games still matter for the business, but kids games come first unless the owner asks otherwise.

## Before you start (always)
1. Read `safety-game/docs/HANDOVER.md` (status, history) and `safety-game/CLAUDE.md` (architecture, build, tests, gotchas).
2. Read `safety-game/research/IDEAS.md` (backlog; don't repeat built or rejected ideas) and the newest entries of `safety-game/research/LOG.md`.
3. Know the owner's rules:
   - **Never change how existing games play.** Add new ones alongside them and link them from the selector cards.
   - Plain English, short sentences, Nigerian context (NEPA, danfo, keke, okada, Mummy/Daddy, Oga, "big person"), and Pidgin for every new line.
   - Realistic or clean-looking 3D, not toy-like (the warehouse episode and the kids worlds set the bar).
   - Work on the branch you were given. No pull requests unless asked. Commit with the attribution lines your session gives you.

## The workflow

### 1. Suggest
- Pick the age band first (4, 8 or 12), then the danger. Use `references/idea-bank.md` and real data (WHO, UNICEF, FRSC, LASEMA, NEMA, Nigerian news) to choose dangers children here actually meet.
- Score each idea with the table in `research/IDEAS.md` and add 3–5 to "Candidates" with an **Age** column (4, 8 or 12) and a source link.
- When the owner asks you for ideas, answer with the short format in `references/suggesting.md` (one line each, age, why, how it plays) and offer to build the top one.

### 2. Plan
Write `safety-game/research/plans/<yyyy-mm-dd>-<slug>.md` covering:
- the age band and why;
- where it lives (a new Little Stars scene, a new kids world, or a new page);
- the 3D layout;
- each mission or scene: the situation, the options, the one correct answer and why, and the source;
- the hazards (real ones plus safe decoys);
- the parent/teacher tip;
- the test steps.

### 3. Build
Follow the matching recipe in `references/build-recipes.md`:

| Age | Usual home | Recipe |
|---|---|---|
| 4 | a new **Little Stars scene** in `src/little-game.js` | A |
| 8 | a new **kids world** in `src/kids-game.js` | B |
| 12 | a kids world with **challenge features**, or a new page for something bigger | C |
| Adults | a site course in `sites/*.json`, or a new page like `warehouse.html` | D |

Check the content against `references/content-safety.md`. Every question needs exactly one correct answer that matches recognised guidance. Sensitive topics (body safety, strangers, online abuse) need extra care and a professional review note.

### 4. Test
- Rebuild: `python3 src/build.py tests/vendor/three.min.js tests/vendor/Sky.js` (run `bash tests/setup.sh` once first).
- Add the new game to `tests/playthrough.js` so it is played to the end, including one deliberate wrong answer.
- Run the new game in English and in Pidgin (`GAME_LANG=pcm`), plus one existing game to prove nothing broke. Browser tests are slow (software WebGL), so run them one at a time.
- Take phone (390×844) and desktop screenshots and **look at them**. Fix anything cramped, hidden or ugly, including the player being hidden behind objects.

### 5. Publish a browser link (always)
The owner shares games by **sending a browser link**, so every new game ends with a link anyone can open. Follow `references/publishing.md`:
- **Cloudflare Pages (main route):** push your branch. The GitHub workflow "Publish games (Cloudflare Pages)" (`.github/workflows/deploy-pages.yml`) uploads the public files (`src/package_site.py` → `dist/site/`) and prints the **Play link** for your branch. Read the link from the run and give it to the owner with the exact page, for example `https://<branch-alias>.site-life-games.pages.dev/kids.html?world=flood`.
- **Before pushing,** check the static copy works: `python3 src/package_site.py`, serve `dist/site` and play the new game with the `run-safety-game` driver (`base http://localhost:8095/`).
- If the run says "Cloudflare not set up", say so and point the owner to Option C in `safety-game/deploy/cloudflare-pages/README.md`. Meanwhile give the claude.ai artifact link if you can publish it, and remind them that `SHARE-LINK.bat` gives a quick Cloudflare link from their PC.

### 6. Record and hand over
- Update `research/IDEAS.md` (move the idea to Built), `research/LOG.md` (dated entry), and the games tables in `CLAUDE.md` and `docs/HANDOVER.md`.
- Commit (including the regenerated pages), push your branch, and tell the owner in plain words: what it is, the age, **the play link**, what was tested, and what still needs a human check.
- If you have the Artifact tool and the owner uses the claude.ai link, republish with every page in `files` (see `CLAUDE.md`).

## References
- `references/ages.md`: what works for a 4, an 8 and a 12-year-old (controls, reading, length, failure, rewards, topics).
- `references/build-recipes.md`: step-by-step code recipes A–D and the integration checklist (selector cards, build, offline, service worker, SCORM, translations, tests, docs).
- `references/content-safety.md`: getting the safety advice right; sensitive topics; privacy (NDPA 2023) and children's data.
- `references/idea-bank.md`: starter ideas by age, with the real danger behind each.
- `references/suggesting.md`: how to present ideas to the owner and score them.
- `references/publishing.md`: getting a browser link (Cloudflare Pages per branch, a quick Cloudflare tunnel from the owner's PC, the claude.ai artifact) and how to verify it.
