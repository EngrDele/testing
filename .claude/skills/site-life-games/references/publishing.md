# Publishing a browser link

The owner sends players a link in WhatsApp; nobody installs anything. Every new or changed game should end with a link the owner can forward. There are three routes, and the first is the default.

## 1. Cloudflare Pages via GitHub (default, automatic)
- **What happens:** every push that touches `safety-game/` runs the GitHub workflow **"Publish games (Cloudflare Pages)"** (`.github/workflows/deploy-pages.yml`):
  1. `python3 safety-game/src/package_site.py` copies only the public files into `dist/site/`. It also adds `var SL_STATIC_HOST = true;` to the pages, so the games don't try to send results to a server that isn't there. Results go to Google Sheets (`?results=`), WhatsApp or email instead.
  2. `wrangler pages deploy` uploads them to the Pages project (default name `site-life-games`; the repository variable `CF_PAGES_PROJECT` overrides it).
  3. The run summary and a `::notice` line show the **Play link**.
- **Links:**
  - The `main` branch is the production link, `https://site-life-games.pages.dev`.
  - Every other branch gets a preview link, `https://<branch-alias>.site-life-games.pages.dev`, where Cloudflare makes the branch name lowercase, turns other characters into `-` and shortens it. **Always take the real link from the run; don't guess it.**
- **Reading the link as an agent:**
  1. After `git push`, find the run for your branch: with the GitHub MCP tools, `actions_list` → `list_workflow_runs` with `resource_id: deploy-pages.yml` and `workflow_runs_filter.branch: <your branch>`.
  2. Wait for it to finish (1–2 minutes). Don't poll faster than every 30 s.
  3. Open its job log (`get_job_logs`) and copy the `Play link` line(s).
- **Give the owner the page and the options,** for example `…pages.dev/kids.html?world=flood`, `…/little.html`, `…/warehouse.html`, `…/index.html?course=advanced`. Add `&lang=pcm` for Pidgin.
- **If it says "Cloudflare not set up":** the repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are missing. Only the owner can add them (Option C in `safety-game/deploy/cloudflare-pages/README.md`). Tell them in one or two lines and use route 3 meanwhile.
- **Don't** try to deploy to Cloudflare from the cloud sandbox: Cloudflare hosts are blocked there and there is no token. GitHub Actions does it.

## 2. Quick tunnel from the owner's PC (full features)
`SHARE-LINK.bat` (Windows) or `sh share-link.sh` starts the results server and runs `cloudflared tunnel --url http://localhost:8080`. It prints a random `https://….trycloudflare.com` link. This route has the HSE dashboard, certificates and trainer rooms, because the Python server is behind it. The link lasts only while the window is open. Suggest it when the owner wants results and certificates without a VPS.

## 3. claude.ai artifact (if your session has the Artifact tool)
Republish `safety-game/index.html` with every other page in `files` (see `safety-game/CLAUDE.md`, "Publishing the claude.ai artifact"). The link is private until the owner shares it, and people outside the owner's organization can't save results there.

## Check before you hand over a link
1. Rebuild, then `python3 src/package_site.py`.
2. Serve the static copy and play the new game with the driver. These exact commands work in the sandbox:
   ```bash
   cd safety-game
   python3 -m http.server 8095 -d dist/site >/dev/null 2>&1 & SP=$!
   timeout 20 bash -c 'until curl -sf localhost:8095/ >/dev/null; do sleep .5; done'
   node .claude/skills/run-safety-game/driver.mjs <<'X'
   base http://localhost:8095/
   open index.html
   eval ({static: typeof SL_STATIC_HOST !== 'undefined', hasServer: SL.hasServer()})
   open kids.html?world=water
   start Ada
   step 10
   ss static-kids-water
   errors
   quit
   X
   kill $SP
   ```
   Expect `{"static":true,"hasServer":false}`, `no errors`, and a sensible screenshot in `tests/out/`.
3. After the push, open the Play link from the run with the driver (`base <link>`) **if** the sandbox can reach it. It usually can't (Cloudflare is blocked here); then say the link was published but not opened by you.
