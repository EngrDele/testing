#!/bin/sh
# Site Life - runs the games + results server on this computer (port 8080). Mac/Linux.
cd "$(dirname "$0")"
[ -f hse-key.txt ] || (od -An -N6 -tx1 /dev/urandom | tr -d ' \n' > hse-key.txt)
export HSE_KEY="$(cat hse-key.txt)" PORT=8080
echo "Games:         http://localhost:8080"
echo "HSE dashboard: http://localhost:8080/hse?key=$HSE_KEY"
echo "Share port 8080 with VS Code (PORTS tab > Forward a Port > 8080 > Public). Ctrl+C to stop."
exec python3 server/sitelife_server.py
