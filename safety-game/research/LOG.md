# Research log

Newest first. Each entry: date, sources read, ideas added, what was built, test results, next step.

## 2026-10-13: Little Stars (children 3–6)
- Guidance followed: WHO *World report on child injury prevention* (burns, drowning, poisoning, falls, road traffic: supervision, safe storage, covering water containers), WHO hand hygiene (soap and water, about 20 seconds), Red Cross / fire-service "get low and go out", "stop, drop and roll", NSPCC "PANTS" / Underwear Rule (private parts, no body secrets, say no, tell someone), common road-safety advice that children under 7 cannot judge traffic.
- Built `little.html` (`src/little-game.js` + `src/little-shell.html`): a sticker-book menu, 10 dollhouse scenes, tap only, everything spoken (`SL.speak`, captions on) with picture cards, no losing (gentle retry, hint after 2 misses), a sticker per scene saved on the device, a one-line tip for the parent, "Play 5 in a row". The parent's phone number for the sing-along stays in localStorage and is never sent. Full Pidgin. Results post as `game: 'little'`, `result: 'COMPLETE'`; SCORM package `site-life-little.zip`.
- **Review needed:** the body-safety scene ("My body is mine") must be reviewed by a child-protection professional before it is used in schools. The scene, its parent tip card and the code say so.
- Tests: `node tests/playthrough.js little` (all 10 scenes, a deliberate wrong tap, both posted results, screenshots in `tests/out/little-*.png`), also with `GAME_LANG=pcm`; `node tests/playthrough.js home` still passes.
- Next: try it with a nursery class and parents (do 3-year-olds manage the cards?), record real voice-overs in English and Pidgin instead of the device's speech synthesis, and get the body-safety review done.

## 2026-10-13: set-up
- Created the backlog (`IDEAS.md`), the agent (`.claude/agents/game-researcher.md`) and a weekly routine that runs it every Monday morning (Lagos time) in a fresh cloud session.
- Built in this round: market, water and online kids worlds; the factory advanced course; Oga Mode.
- Next: the routine picks the top candidate from `IDEAS.md`.
