# Getting the content right

## The safety advice must be correct
- Every question has **exactly one correct option**, and it must match recognised guidance. Put the source in the plan file. Good sources:
  - **Children:** WHO *World report on child injury prevention*, UNICEF, Red Cross / IFRC first aid for children, NSPCC "PANTS" (body safety), Royal Life Saving / RLSS (water), FRSC (Nigerian road rules), LASEMA / NEMA (fire, flood, building collapse).
  - **Workers:** ILO, ISO 45001, UK HSE guides (e.g. HSG76 warehousing), Nigeria Factories Act, NUPRC (oil and gas).
- Keep the wrong options **plausible but clearly wrong** once explained. The "why" after each option teaches more than the question does.
- First aid for children = **get a big person, call for help**. Only age 12 learns simple actions (cool a burn under running water for 20 minutes, press on bleeding, recovery position), and always alongside "call 112 / an adult".
- Nigerian emergency number: **112** (also 767 in Lagos for LASEMA). Don't invent numbers.
- Don't teach anything that a child could hurt themselves practising (no "try to put out the fire", no climbing, no touching electrics).

## Sensitive topics
- **Body safety / abuse prevention:** no adult figure acting anything out and no graphic content; use icons, a doll in a swimsuit, "No, go away, tell". Use the rules "private parts are private", "no secrets about your body", "tell a trusted adult". Mark the scene `REVIEW NEEDED: child-protection professional` in the code and the log. (See the `body` scene in `src/little-game.js`.)
- **Strangers / kidnapping:** frame it as "tricky people" (anyone who asks you to keep a secret or go somewhere without Mummy's OK), not "all strangers are bad". Safe helpers: a mummy with children, a police officer, a shop counter, school security.
- **Online harms (age 12):** scams, sharing photos, meeting online friends, sextortion awareness at an age-appropriate level ("if anyone asks for photos of your body, stop, don't pay, tell an adult; it is not your fault"). Professional review before schools use it.
- **Drowning, fire, death:** show danger and consequences without injury images for 4 and 8. For 12, describe the consequence in words, not pictures.
- **Religion, tribe, politics:** keep out. Use mixed names across Nigeria (Ada, Chidi, Musa, Bisi, Tunde, Amina, Emeka, Zainab) and varied skin tones and clothes.

## Privacy (Nigeria's NDPA 2023) and children's data
- Results are sent only after consent (`SL.consent.html(true)` for kids means a **parent or teacher ticks it**).
- Collect the minimum: a first name, an optional class/family code, the results. **Never send** surnames, addresses, phone numbers, photos or the child's location. The Little Stars phone number stays in `localStorage` only.
- Don't add analytics or third-party scripts. Everything runs from the page (three.js from cdnjs/jsdelivr is the only CDN).

## Language
- Every new English string gets a Pidgin entry in `src/i18n/pcm.json`, keyed by the exact English without the leading emoji, with `{0}` patterns for names.
- Yorùbá, Hausa and Igbo are drafts. Add to them only if you are confident, and mark them `DRAFT`.
- Kids' Pidgin: simple and warm ("Mummy", "padi", "big person wey you trust", "no ever …").
