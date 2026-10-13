# Host the games free on Cloudflare Pages

Cloudflare Pages hosts the game files on a fast worldwide network with free HTTPS, for example `https://site-life.pages.dev`. It costs nothing on the free plan and allows commercial use. Pages only serves files, so results go to a **Google Sheet** (see `../google-sheets/README.md`) instead of the Python server.

## What gets uploaded
Only the static game files from the `safety-game` folder:

| File or folder | What it is |
|---|---|
| `index.html` | Factory induction and the game selector |
| `kids.html` | Kids games (`?world=home`, `?world=school`, …) |
| `lite.html` | 2D fallback for phones without WebGL |
| `sw.js`, `manifest.webmanifest` | Offline app (install to home screen) |
| `builder.html`, `sites/` | Site builder and the site layouts |

Some of these files may not exist yet in your copy; upload the ones that do. **Do not upload** `server/`, `src/`, `tests/`, `deploy/`, `hse-key.txt` or any `.bat`/`.sh` files.

## Option A: drag and drop (easiest)
1. Make a new folder on your computer, for example `site-life-upload`, and copy the files from the table into it (keep `sites/` as a folder).
2. Go to <https://dash.cloudflare.com>, sign up or log in (free).
3. Click **Workers & Pages → Create → Pages → Upload assets** (the button may be named "Use direct upload").
4. Give the project a name, for example `site-life`. This becomes `https://site-life.pages.dev`.
5. Drag the `site-life-upload` folder onto the page and click **Deploy site**.
6. Open the link. The game selector should appear.

To update later: open the project → **Create deployment** → drag the folder again.

## Option B: connect GitHub (updates itself)
1. **Workers & Pages → Create → Pages → Connect to Git**, pick the repository and the branch.
2. Build settings: **Framework preset:** None. **Build command:** leave empty. **Build output directory:** `safety-game`.
3. Click **Save and Deploy**. Every push to that branch redeploys.

With option B the whole `safety-game` folder is published, including the server code, tests and docs. They hold no secrets (the HSE key file `hse-key.txt` is never committed), but if you prefer to keep them private, use option A.

## Send results to Google Sheets
Pages cannot run the Python results server, so:
1. Set up the sheet with `../google-sheets/README.md` and copy its web app URL.
2. Share the game with `?results=` added:
   `https://site-life.pages.dev/?results=https://script.google.com/macros/s/AKfy…/exec`

The WhatsApp/email result button on the end screen still works too.

## Limits of this option
- **Free plan** (check current values on Cloudflare's site): unlimited bandwidth and requests for static files, 500 builds per month, up to 20,000 files and 25 MB per file. The game files are far below these.
- **No HSE dashboard, certificates, verify page or trainer rooms.** Those need the Python server (`server/REMOTE-SERVER-GUIDE.md`). With Sheets you filter and chart results in Google Sheets itself.
- **Results are "fire and forget":** the game cannot confirm the sheet received a result (Google does not allow it). Check the sheet.
- The `.pages.dev` address works in Nigeria without a domain. A custom domain (for example `induction.yourcompany.com`) can be added under **Custom domains**.
- **Privacy (NDPA 2023):** names and results are stored in your Google account; keep the sheet private and delete old rows on schedule.
