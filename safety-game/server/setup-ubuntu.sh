#!/bin/bash
# One-time setup of the Site Life games on an Ubuntu 22.04/24.04 server, with automatic HTTPS.
# Run as root from inside the unzipped safety-game folder:
#   sudo bash server/setup-ubuntu.sh                         # free address: <your-ip>.sslip.io
#   sudo bash server/setup-ubuntu.sh induction.mycompany.com # your own domain (point its DNS A record here first)
set -euo pipefail
SRC="$(cd "$(dirname "$0")/.." && pwd)"
IP="$(curl -s -4 https://api.ipify.org || hostname -I | awk '{print $1}')"
DOMAIN="${1:-$(echo "$IP" | tr . -).sslip.io}"
KEY_FILE=/etc/sitelife.env

echo "==> Installing Python, Caddy (web server with free HTTPS) and the firewall"
apt-get update -y
apt-get install -y python3 curl debian-keyring debian-archive-keyring apt-transport-https gnupg ufw
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y && apt-get install -y caddy
fi

echo "==> Copying the games to /opt/sitelife"
mkdir -p /opt/sitelife
cp -r "$SRC"/. /opt/sitelife/
id sitelife >/dev/null 2>&1 || useradd --system --home /opt/sitelife --shell /usr/sbin/nologin sitelife
mkdir -p /opt/sitelife/server/data && chown -R sitelife:sitelife /opt/sitelife/server/data

if [ ! -f "$KEY_FILE" ]; then
  echo "HSE_KEY=$(head -c 12 /dev/urandom | od -An -tx1 | tr -d ' \n')" > "$KEY_FILE"
  chmod 600 "$KEY_FILE"
fi
HSE_KEY="$(grep HSE_KEY "$KEY_FILE" | cut -d= -f2)"

echo "==> Creating the background service"
cat > /etc/systemd/system/sitelife.service <<EOF
[Unit]
Description=Site Life safety games
After=network.target
[Service]
User=sitelife
EnvironmentFile=$KEY_FILE
Environment=HOST=127.0.0.1 PORT=8080 GAME_DIR=/opt/sitelife DATA_DIR=/opt/sitelife/server/data
ExecStart=/usr/bin/python3 /opt/sitelife/server/sitelife_server.py
Restart=always
[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload && systemctl enable --now sitelife && systemctl restart sitelife

echo "==> Setting up HTTPS for $DOMAIN"
cat > /etc/caddy/Caddyfile <<EOF
$DOMAIN {
  encode gzip
  reverse_proxy 127.0.0.1:8080
}
EOF
systemctl reload caddy || systemctl restart caddy

ufw allow OpenSSH >/dev/null; ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null; yes | ufw enable >/dev/null || true

echo
echo "================ DONE ================"
echo " Games (send this link):  https://$DOMAIN/"
echo " Kids home -> bus:        https://$DOMAIN/kids.html?world=home"
echo " Kids school:             https://$DOMAIN/kids.html?world=school"
echo " HSE dashboard (private): https://$DOMAIN/hse?key=$HSE_KEY"
echo " Results file:            /opt/sitelife/server/data/results.jsonl"
echo " HTTPS can take a minute to start the first time."
echo "======================================"
