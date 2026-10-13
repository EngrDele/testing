# Save game results to a Google Sheet (no server needed)

Use this when you do not have your own server. Every player's result arrives as a new row in a Google Sheet that you own. It is free and needs only a Google account. No programming is needed: you copy and paste one file.

## What you need
- A Google account (Gmail is fine).
- The game link, for example `https://your-site.pages.dev/` (see `../cloudflare-pages/README.md`) or any other address where the games are hosted.
- About 10 minutes.

## Step 1: Create the sheet
1. Go to <https://sheets.google.com> and click **Blank spreadsheet**.
2. Give it a name at the top left, for example **Site Life results**.

## Step 2: Add the script
1. In the sheet, click **Extensions → Apps Script**. A new tab opens.
2. You will see a file called `Code.gs` with a few lines in it. Select everything in it and delete it.
3. Open the file `Code.gs` from this folder (`safety-game/deploy/google-sheets/Code.gs`), copy **all** of it, and paste it into the empty editor.
4. Click the **💾 Save** icon. Give the project a name if asked, for example **Site Life results**.

## Step 3: Publish it as a web app
1. Click the blue **Deploy** button (top right) → **New deployment**.
2. Click the ⚙️ gear next to "Select type" and choose **Web app**.
3. Fill in:
   - **Description:** Site Life results
   - **Execute as:** **Me** (your Google account)
   - **Who has access:** **Anyone**
4. Click **Deploy**.
5. Google asks for permission. Click **Authorize access**, choose your account, then **Advanced → Go to Site Life results (unsafe)** → **Allow**. ("Unsafe" only means Google has not reviewed your own script. It only writes to this one sheet.)
6. Copy the **Web app URL**. It looks like `https://script.google.com/macros/s/AKfy…/exec`.

**Check it works:** paste that URL into a new browser tab. You should see `{"ok":true,"results":0}`.

## Step 4: Open the game with your sheet's address
Add `?results=` and the web app URL to the game link:

```
https://your-site.pages.dev/?results=https://script.google.com/macros/s/AKfy…/exec
```

Kids games work the same way (use `&` because they already have a `?`):

```
https://your-site.pages.dev/kids.html?world=school&class=JSS1A&results=https://script.google.com/macros/s/AKfy…/exec
```

Send this full link to your players (WhatsApp, email or a QR code). When a player finishes, a new row appears in the **Results** tab of your sheet. The tab is created automatically with the first result.

## The columns
`received, id, game, course, name, company, role, class, result, stars, hazards, mistakes, where, missed, wrong, zoneTimes, room, lang, date`

- **result**: PASS / REPLAY for the factory; GOLD / SILVER / BRONZE / TRY AGAIN for the kids games.
- **where**: areas where mistakes were made. **missed**: hazards the player did not spot. **wrong**: questions answered wrongly.
- **zoneTimes**: seconds spent in each zone, for example `Gate=12; Warehouse=55`.
- Cells that start with `=`, `+`, `-` or `@` get a `'` in front so nobody can put a formula into your sheet.

## Good to know
- **Changing the script later:** after editing, use **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**. The URL stays the same.
- **Players do not see an error** if the sheet is unreachable: browsers do not let the game read Google's reply. Check the sheet now and then. If a player was offline, the game keeps the result and sends it when they are back online.
- **Limits** (Google's free quotas, check current values): about 20,000 script runs per day and a few minutes of run time, more than enough for hundreds of players a day. A sheet holds up to 10 million cells (about 500,000 results).
- **No certificates or trainer rooms:** the printable certificate with QR code (`/cert/<id>`), the verify page and live trainer rooms need the Python server (`server/REMOTE-SERVER-GUIDE.md`).
- **Privacy (NDPA 2023):** the sheet holds names and companies. Share it only with HSE staff, and delete rows older than your retention period (for example 12 months).
- **Stop collecting:** Deploy → Manage deployments → Archive.
