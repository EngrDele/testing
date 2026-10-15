#!/bin/sh
# Site Life - run the games + results server and get a public Cloudflare link (https://<random>.trycloudflare.com).
# Needs cloudflared: macOS `brew install cloudflared`; Linux: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
cd "$(dirname "$0")"
command -v cloudflared >/dev/null || { echo "Install cloudflared first (see the comment at the top of this file)."; exit 1; }
sh ./start-server.sh & SERVER=$!
trap 'kill $SERVER 2>/dev/null' EXIT INT TERM
sleep 3
echo "Look below for https://<something>.trycloudflare.com and send it to the players. Ctrl+C stops both."
cloudflared tunnel --url http://localhost:8080
