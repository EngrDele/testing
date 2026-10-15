# Designing for the three main players: ages 4, 8 and 12

The owner's children are 4, 8 and 12. Build each kids game for **one** of these ages on purpose, then check it doesn't exclude the others when they play together (siblings often share one phone).

| | Age 4 | Age 8 | Age 12 |
|---|---|---|---|
| Existing games | Little Stars (`little.html`) | Kids worlds (`kids.html?world=…`) | Kids worlds (hardest), Online Safety, Warehouse Shift as a "grown-up" challenge |
| Reading | **None.** Everything spoken; pictures for answers | Short sentences read aloud **and** shown | Reads fine; voice optional; more detail welcome |
| Controls | **Tap only**, big targets (≥ 64 px), no camera control | Joystick/WASD walk, a guide NPC, auto-questions at yellow rings | Free walking, camera control, optional map; may skip the guide |
| Session | 3–5 min, scenes of 30–60 s | 8–12 min world | 10–20 min; replay for a better score |
| Choices | 2–4 picture cards or tap-the-object | 2–3 text options | 3–4 options, some "nearly right"; multi-step decisions and consequences |
| Failure | **No losing.** Gentle "Ouch! Let's try again", then a glowing hint after 2 misses | Hearts (3); a wrong answer explains why; can't really fail the world | Score, timers, near misses; can fail and replay; "why" shown after |
| Rewards | Stickers, confetti, song, parent tip card | Stars, badges, certificate, "Send to Mummy/Daddy" | Score, rank, badges, certificate, class/family leaderboard (`?class=`) |
| Adult role | Parent plays alongside; tip card for the parent | Parent nearby; WhatsApp result to parents | Plays alone; can be the one who teaches younger siblings |
| Tone | Warm, sing-song, Mummy/teacher voice | Friendly guide (Mummy, Teacher, Coach Bisi, Daddy) | Respectful, not babyish; real-life stakes; peer situations |

## Age 4: what works
- One idea per scene ("hot things burn"). Use concrete objects: pot, iron, socket, bucket, medicine, road.
- **Say the rule the same way every time.** Repeat it at the end ("Hot things: don't touch! Call a big person.").
- The right answer is always "stop, don't touch, tell or call a big person, hold hands". Never make a 4-year-old the rescuer.
- Use no frightening images: no blood, no injured people, no fire on people. A gentle "Ouch!" is enough.
- Small hands and screens: one tap target at a time when possible, generous hit areas, nothing near screen edges.
- A sticker book and a parent tip after every scene keep them coming back and teach the parent too.
- Topics: burns (hot pot, iron, tea, kerosene lamp), water at home (bucket, drum, well, bath), medicines and chemicals that look like sweets or drinks, sockets and cables, holding hands at the road, smoke ("get low, go out, tell"), their own name and Mummy's number, body safety (gentle), handwashing, car and keke seat.

## Age 8: what works
- A small world to walk around with a guide (Mummy, Teacher, Coach), yellow rings, auto-questions, 5–6 hidden dangers to find, and stars.
- 2–3 options, with one clearly unsafe answer, one safe answer and sometimes a tempting one ("Run, I'm fast!").
- They like being the hero: "spot the danger before Mummy does", "teach your little brother".
- Road skills are still with an adult (hold hands, cross at the zebra with a big person). Start independence rules: stay where you are if lost, know your address and phone number.
- Topics: road and school bus, school (lab, playground, canteen, fire drill), market and getting lost, beach and pool, online basics (strangers, photos, scams, mean messages), kitchen helper (knife, gas smell), electricity and generator fumes, dogs, rain and flooded gutters, first aid basics (tell an adult, cold water on a burn).

## Age 12: what works
- **More agency and real stakes.** Free roaming, multi-step tasks, timers, consequences that play out ("you didn't check the gas, the kitchen fills with smell; what now?").
- Situations without an adult present: walking to school alone, using a keke, being home alone with a younger sibling, cooking simple food, charging phones, NEPA and generator at home, flood day, peer pressure ("jump in the canal", "ride on the okada", "share your password", "meet this online friend").
- **Teach-back.** Let them guide a younger NPC sibling (the 4 or 8-year-old) through the dangers. That fits the family who will play together.
- Scoring, replay for a better rank, class/family leaderboard (`?class=`), certificate. Keep the explanations ("why") after each answer.
- Topics: first aid (burns, bleeding, choking, calling 112 with a clear address), fire (extinguisher types, gas cylinder leak, stop-drop-roll), road (crossing alone, okada refusal, being seen at night), online (privacy settings, scams, sextortion awareness at an age-appropriate level, cyberbullying, digital footprint), home alone (door rules, gas, generator CO), water (rip currents, canals, floods), electricity (naked wires, wet hands, kites near power lines), puberty-age body autonomy and consent (needs professional review).

## Playing together (4 + 8 + 12)
- Group sessions already exist (`?room=CODE`, `src/room.js`): siblings on two phones can see each other.
- Ideas: the 12-year-old as the "big sibling guide" in a 4-year-old scene; the 8-year-old finds hazards while the 12-year-old answers the harder question; family score on one screen.
- Keep each game playable alone too.
