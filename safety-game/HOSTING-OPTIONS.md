# Site Life: Ways to Let Remote Operators Play in a Web Browser

*Research note, October 2026*

## What we need

- A **link that opens in any phone or computer browser**, with nothing to install. In Nigeria about 84–88% of smartphones are Android, and most cost under $200.
- **Results reach HSE** (who played, passed or failed, and their mistakes), including for **contractors and visitors outside the company**.
- Optional: **only invited people** can open it, and it works **offline or on weak network**.

The game is 3 static files: `index.html` (3D), `lite.html` (2D fallback) and `site-life-offline.html` (one file with the 3D engine inside). Any static web host can serve them.

---

## Important limit of the current claude.ai link

The claude.ai link and its built-in HSE Dashboard work well for **staff inside your organization** who are given **Contributor** access. However, **people from outside the organization** (contractors, visitors) only ever get **view** access, so **their results cannot be saved**. Remote operators therefore need one of the options below.

---

## Option comparison

### A. Where to host the game (free tiers)

| Host | Free tier (as reported) | Fit for us | Notes |
|---|---|---|---|
| **Cloudflare Pages** ⭐ | Unlimited static requests; 20,000 files per site; 25 MiB per file | **Best** | Has a data centre in **Lagos (Lekki)** connected to IXPN, so pages load fast in Nigeria. Pairs with Cloudflare Access (below). |
| GitHub Pages | Soft limit of 100 GB/month bandwidth; site ≤ 1 GB | Good for demos | Needs a **public repo** on the free plan. Its terms say it must not be used mainly to run an online business or SaaS. |
| Netlify | 300 credits/month (about 20 credits per GB) | Risky | When credits run out, **all your sites are paused** until the next month. |
| Vercel (Hobby) | About 100 GB/month | ❌ | The free plan is **non-commercial only**. Company training needs the paid Pro plan. |
| Firebase Hosting | About 10 GB/month transfer | OK | Use it if we choose Firestore for results (same Google project). |
| Company website / intranet | n/a | Good | Upload the 3 files to any folder. IT may prefer this for company control. |

### B. Where results go (so HSE sees remote players)

| Option | Cost | Effort | Notes |
|---|---|---|---|
| **Google Sheets via Apps Script** ⭐ | Free (about 20,000 requests/day on a free account) | Low | Each finished game adds a **row to a Google Sheet** HSE already knows how to use (filter, chart, export). Watch for spam; add a simple secret code. |
| Firebase Firestore | Free: about 50,000 reads and 20,000 writes per day | Medium | More robust, with a proper dashboard and login, but needs developer upkeep. |
| Supabase | Free tier **pauses after 7 days idle** | Medium | Not good for occasional use unless on the paid plan ($25/month). |
| Company **LMS via SCORM** ⭐ (for larger companies) | Uses the existing LMS | Medium | The game is packaged as a SCORM 1.2 course, so the **LMS records completion and score** in the official training record. Works with TalentLMS (including its mobile apps) and Moodle. Hosted-URL wrappers mean the game can be updated without re-uploading. |

### C. Who can open it

| Option | Notes |
|---|---|
| Open link + QR code at the gate | Simplest. Anyone with the link can play. |
| **Cloudflare Access with an email one-time PIN** ⭐ | **Free for up to 50 users.** The operator types their email and gets a code, so HSE knows exactly who played (a verified email). It needs no accounts and suits contractors. |
| LMS login | If the company already has an LMS, people log in as normal. |

### D. Phone app feel and offline use

| Option | Notes |
|---|---|
| **Installable web app (PWA)** | Add a manifest and an offline cache so the game can be added to the home screen and opened offline after the first visit. Results are stored and sent when the phone is back online. |
| Play Store app | PWABuilder can wrap the PWA as an Android app (a Trusted Web Activity). The first launch needs internet, and it must follow Google Play rules. |
| One file on WhatsApp | `site-life-offline.html` already works offline. It is good for demos, but results stay on the phone. |

---

## Recommendation

**For remote operators, do this (all free to start):**

1. **Host on Cloudflare Pages.** It is fast in Lagos and gives a link like `site-life.pages.dev`, or your own domain such as `induction.yourcompany.com`.
2. **Send results to a Google Sheet** through Apps Script. HSE gets a live sheet with one row per attempt: name, email, company, role, PASS or REPLAY, hazards, mistakes and date.
3. **Optional:** protect the link with **Cloudflare Access (email PIN)** so only invited operators can open it and each result has a verified email.
4. **Add PWA offline support** for sites with weak network.
5. **For clients with an LMS,** also provide a **SCORM package** so completion goes into their official training records.

**Keep the claude.ai link** for internal staff and demos. Its built-in dashboard already works for them.

## Data protection (Nigeria Data Protection Act 2023)

Results contain personal data (names, emails and training outcomes), so:

- Collect **only what HSE needs**, and show a short **privacy notice** before the game starts that says what is collected, why, and who can see it.
- Keep the results sheet or database **restricted to HSE**, and decide how long to keep records.
- Record the processing in the company's NDPA records. Confirm the exact duties under the NDPA 2023 and the NDPC's GAID 2025 with your data protection officer or lawyer.

## Sources

- [GitHub Pages limits (official)](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
- [Cloudflare Pages file limit change (official changelog)](https://developers.cloudflare.com/changelog/post/2026-01-23-pages-file-limit-increase/) · [Cloudflare Pages free tier 2026 (Temps)](https://temps.sh/blog/cloudflare-pages-free-tier-limits-2026)
- [Cloudflare Lagos data centre (Cloudflare blog)](https://blog.cloudflare.com/lagos) · [tech.africa](https://tech.africa/cloudflare-lagos-nigeria)
- [Netlify free plan 2026](https://netli.fyi/blog/netlify-free-plan-limits-2026) · [Vercel Hobby non-commercial](https://conductatlas.com/platform/vercel/vercel-terms-of-service/provision/CA-P-048642/hobby-plan-personal-non-commercial-use-only/) · [Vercel free tier 2026](https://deploywise.dev/blog/vercel-free-tier-limits-2026)
- [Firebase pricing guide](https://www.verdent.ai/guides/devtools/firebase-pricing) · [Supabase free tier 2026](https://automationatlas.io/answers/supabase-free-tier-limits-2026/)
- [HTML forms to Google Sheets (ListenData)](https://www.listendata.com/2024/10/free-html-forms-with-googlesheets.html)
- [Cloudflare Access (official)](https://www.cloudflare.com/en-gb/products/zero-trust/access) · [One-time PIN setup guide](https://domainindia.com/support/kb/cloudflare-zero-trust-access-internal-apps)
- [HTML to SCORM (iSpring)](https://www.ispringsolutions.com/blog/how-to-convert-html-to-scorm) · [TalentLMS SCORM](https://talentlms.com/features/scorm-lms) · [Supademo SCORM export](https://docs.supademo.com/share/exports/export-to-scorm)
- [PWA in an Android app (web.dev)](https://web.dev/articles/using-a-pwa-in-your-android-app) · [Offline-first TWA (Chrome)](https://developer.chrome.com/docs/android/trusted-web-activity/offline-first)
- [Nigeria smartphone study (KPMG and Orange)](https://www.arise.tv/kpmg-nigerias-smartphone-penetration-climbs-to-75-as-economy-becomes-mobile-first/) · [Phones under $200 (TechCabal)](https://techcabal.com/2026/02/25/in-2025-four-in-five-smartphones-sold-in-africa-cost-under-200/)
- [NDPA 2023 (KPMG)](https://kpmg.com/ng/en/home/insights/2023/09/the-nigeria-data-protection-act--2023.html) · [NDPA controller obligations (TNP)](https://tnp.com.ng/understanding-the-compliance-obligations-of-data-controllers-and-processors-under-the-nigeria-data-protection-act/)
