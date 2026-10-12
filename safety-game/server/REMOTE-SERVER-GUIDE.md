# Host Site Life on your own online server (24/7, results collected)

You get a permanent `https://` link for all 3 games, and an **HSE dashboard** where every player's result arrives automatically, from any company and any phone.

## 1. Rent a small server (VPS)
Any provider works, for example Hetzner, DigitalOcean, AWS Lightsail, Vultr or Contabo. The smallest plan is enough, typically from about **$4–6 per month** (check current prices).
- Choose **Ubuntu 24.04** (or 22.04).
- Choose a data centre close to your players (Europe, or South Africa / Lagos if offered).
- You will get an **IP address** and a **root password or SSH key**.

## 2. Copy the games to the server
On your computer (Windows PowerShell, Mac or Linux), from the folder that contains `safety-game`:
```
scp -r safety-game root@YOUR_SERVER_IP:/root/
```
Alternatively, on the server run `git clone -b claude/lagos-safety-game-research-cq4tb4 https://github.com/EngrDele/testing` (private repos need a GitHub token).

## 3. Run the one-time setup
```
ssh root@YOUR_SERVER_IP
cd /root/safety-game          # or /root/testing/safety-game if you used git clone
sudo bash server/setup-ubuntu.sh
```
It installs everything, turns on free HTTPS, and prints your links:
```
Games (send this link):  https://12-34-56-78.sslip.io/
HSE dashboard (private): https://12-34-56-78.sslip.io/hse?key=xxxxxxxx
```
- **No domain needed:** it uses a free `sslip.io` address made from your server's IP.
- **Using your own domain** (for example `induction.yourcompany.com`): first point the domain's **A record** to the server IP, then run `sudo bash server/setup-ubuntu.sh induction.yourcompany.com`.

## 4. Use it
| What | Link |
|---|---|
| All games (selector) | `https://YOUR-ADDRESS/` |
| Kids: Home → School Bus | `https://YOUR-ADDRESS/kids.html?world=home` |
| Kids: School Safety | `https://YOUR-ADDRESS/kids.html?world=school` |
| **HSE dashboard** (keep private) | `https://YOUR-ADDRESS/hse?key=YOUR-KEY` |

The dashboard shows games played, people, pass rate, the most common mistakes and every result, and has a **CSV download** for Excel. It refreshes every minute.

## Useful commands (on the server)
| Task | Command |
|---|---|
| See the HSE key again | `sudo cat /etc/sitelife.env` |
| Restart the games | `sudo systemctl restart sitelife` |
| See if it is running | `sudo systemctl status sitelife` |
| Back up results | `sudo cp /opt/sitelife/server/data/results.jsonl ~/results-backup.jsonl` |
| Update the games | copy the new files again, then run `sudo bash server/setup-ubuntu.sh` again (results and key are kept) |

## Privacy (NDPA 2023)
Results include names and companies. Keep the dashboard link private, back up and delete old results according to your company's retention policy, and tell players what is collected and why.

## Run it on your own PC instead (for testing)
`HSE_KEY=mysecret python3 server/sitelife_server.py`, then open `http://localhost:8080` and `http://localhost:8080/hse?key=mysecret`. You can combine this with a VS Code or Cloudflare tunnel (see `TUNNEL-GUIDE.md`).
