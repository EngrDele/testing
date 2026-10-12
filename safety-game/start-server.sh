#!/bin/sh
# Site Life - starts a local web server for the games on port 8080 (Mac/Linux).
cd "$(dirname "$0")"
echo "Site Life games are running at: http://localhost:8080  (Ctrl+C to stop)"
if command -v python3 >/dev/null 2>&1; then exec python3 -m http.server 8080
elif command -v npx >/dev/null 2>&1; then exec npx --yes http-server -p 8080 -c-1
else echo "Install Python 3 first: https://www.python.org/downloads/"; fi
