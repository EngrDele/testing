# Host the games free on Cloudflare Pages

Cloudflare Pages hosts the game files on a fast worldwide network with free HTTPS, for example `https://site-life.pages.dev`. It costs nothing on the free plan and allows commercial use. Pages only serves files, so results go to a **Google Sheet** (see `../google-sheets/README.md`) instead of the Python server.

## What gets uploaded
Only the static game files from the `safety-game` folder:

| File or folder | What it is |
|---|---|
| `index.html` | Factory induction, advanced course, Oga Mode and the game selector |
| `kids.html` | Kids games (`?world=home`, `school`, `market`, `water`, `online`) |
| `little.html` | Little Stars (ages 3–6) |
| `warehouse.html` | Warehouse Shift |
| `lite.html` | 2D fallback for phones without WebGL |
| `*-offline.html` | Single-file copies people can download and play without internet |
| `sw.js`, `manifest.webmanifest`, `icons/` | Offline app (install to home screen) |
| `builder.html`, `sites/` | Site builder and the site layouts |

**Easiest way to get exactly these files:** run `python3 src/package_site.py` in the `safety-game` folder. It puts them in `dist/site/` (plus a `_headers` file so players always get the latest version). **Do not upload** `server/`, `src/`, `tests/`, `deploy/`, `hse-key.txt` or any `.bat`/`.sh` files.

## Option C: automatic, a new link every time a game is added (recommended)
GitHub publishes the games to Cloudflare for you on every change. The main branch gets the permanent link (`https://site-life-games.pages.dev`), and **every branch an agent works on gets its own preview link**, so you can play a new game before you accept it. The workflow is `.github/workflows/deploy-pages.yml` ("Publish games (Cloudflare Pages)" in the Actions tab). You set it up once (about 10 minutes):

1. **Cloudflare account:** sign up free at <https://dash.cloudflare.com>.
2. **Account ID:** in the dashboard, open **Workers & Pages**. The **Account ID** is on the right side (it is also the long code in the browser address after `dash.cloudflare.com/`). Copy it.
3. **API token:** click your profile icon → **My Profile → API Tokens → Create Token → Create Custom Token**. Name it `site-life-pages`, and under **Permissions** choose **Account → Cloudflare Pages → Edit**. Under **Account Resources** choose your account. Click **Continue → Create Token**, then copy the token (it is shown only once).
4. **GitHub secrets:** open the repository on GitHub → **Settings → Secrets and variables → Actions → New repository secret**. Add:
   - `CLOUDFLARE_API_TOKEN`: the token from step 3
   - `CLOUDFLARE_ACCOUNT_ID`: the ID from step 2
5. **First publish:** go to the **Actions** tab → **Publish games (Cloudflare Pages)** → **Run workflow**, and pick a branch. When it finishes (about 1–2 minutes), the **Play link** is shown at the top of the run.
6. Send the link to the players, for example `https://site-life-games.pages.dev/kids.html?world=water`.

Notes:
- If the name `site-life-games` is taken on Cloudflare, Cloudflare adds a few letters to it; the run summary shows the real link. To choose another name, add a repository **variable** (not secret) `CF_PAGES_PROJECT` with the name you want.
- Until the two secrets exist, the workflow does nothing and shows "Cloudflare not set up".
- Results: as in Options A and B, add `?results=<Google Sheet link>` to send results to a sheet. For the HSE dashboard and certificates, use your own server (below).

## Quick link from your own PC (Cloudflare tunnel, like the VS Code link)
Double-click **`SHARE-LINK.bat`** in the `safety-game` folder (Mac/Linux: `sh share-link.sh`). It starts the games and the results server, installs `cloudflared` the first time (with `winget`), and prints a random link like `https://blue-river-123.trycloudflare.com`. Send that link: the full HSE dashboard, certificates and trainer rooms work, because the results server is running on your PC. The link stops when you close the window, and it changes every time. No Cloudflare account is needed.

## Option A: drag and drop (easiest)
1. Run `python3 src/package_site.py` in the `safety-game` folder and use the `dist/site` folder it makes (or copy the files from the table into a new folder, keeping `sites/` and `icons/` as folders).
2. Go to <https://dash.cloudflare.com>, sign up or log in (free).
3. Click **Workers & Pages → Create → Pages → Upload assets** (the button may be named "Use direct upload").
4. Give the project a name, for example `site-life`. This becomes `https://site-life.pages.dev`.
5. Drag the folder onto the page and click **Deploy site**.
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
