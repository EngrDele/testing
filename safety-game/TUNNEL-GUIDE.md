# Share the Site Life games through a tunnel

The games are plain web files. You run a small web server on your computer and a **tunnel** gives it a public `https://` link.

**Important:** the link only works while your computer is on, the server window is open and the tunnel is running.

## Step 1: Get the files and start the server

1. Download the files: on GitHub, open `EngrDele/testing`, switch to the branch `claude/lagos-safety-game-research-cq4tb4`, then choose **Code → Download ZIP**. Unzip it.
2. Open the `safety-game` folder.
3. **Windows:** double-click **`START-SERVER.bat`**. **Mac/Linux:** run `./start-server.sh`.
4. Your browser opens the **HSE dashboard** (`http://localhost:8080/hse?key=…`). Bookmark it: every player's result arrives here. The key is saved in `hse-key.txt` and is never shared online.
5. Check the games: open `http://localhost:8080`. You should see the game selector.

If it says Python is missing, install Python from python.org and tick **"Add python.exe to PATH"** during setup.

## Step 2: Open a tunnel (choose one)

### Option A: Cloudflare quick tunnel (no account, the simplest)
1. Install **cloudflared**:
   - Windows: open PowerShell and run `winget install --id Cloudflare.cloudflared`
   - Mac: `brew install cloudflared`
2. In a **new** window, run:
   ```
   cloudflared tunnel --url http://localhost:8080
   ```
3. It prints a link like `https://random-words.trycloudflare.com`. **That is your public link.**
4. Keep that window open. You get a new random link each time you run it.

### Option B: VS Code port forwarding
1. Open the `safety-game` folder in VS Code (the server from Step 1 must be running).
2. Open the **Ports** panel (View → Open View → Ports), then click **Forward a Port** and type `8080`.
3. Sign in with GitHub or Microsoft when asked.
4. **Right-click the port → Port Visibility → Public.** It is private by default.
5. Copy the **Forwarded Address**. That is your public link.
6. The first time someone opens it, they may see a "developer tunnel" notice. They click **Continue**.

## Step 3: Send the links

| Game | Link to send |
|---|---|
| Choose any game (factory, home, school) | `https://YOUR-LINK/` |
| Home → School Bus (kids) | `https://YOUR-LINK/kids.html?world=home` |
| School Safety (kids) | `https://YOUR-LINK/kids.html?world=school` |
| Factory, with results sent to your WhatsApp and email | `https://YOUR-LINK/?hse=2348012345678&email=hse@company.com` |

Write the WhatsApp number in international format without the `+`.

## Good to know
- **Results:** every finished game is saved on your PC automatically and shows on your HSE dashboard (`http://localhost:8080/hse?key=…`). Players also get the WhatsApp/email button. Results are stored in `server/data/results.jsonl`.
- **Many players at once:** every player downloads about 1 MB from your computer, so a slow office upload speed will be slow for big groups. For a full rollout, use Cloudflare Pages (see `HOSTING-OPTIONS.md`).
- **Security:** anyone with the link can open the games, so share it only with the people who need it. Stop the tunnel when testing is finished.
- **Power:** use a UPS or keep the PC on the generator, because a power cut stops the link.
