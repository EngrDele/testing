#!/bin/sh
# Fetches three.js r128 + Sky.js from npm into tests/vendor/ (gitignored).
# Needed because sandboxes often block the CDNs the games load from; the tests route CDN requests to these files.
set -e
cd "$(dirname "$0")"
mkdir -p vendor && cd vendor
if [ ! -f three.min.js ]; then
  npm pack three@0.128.0 -q >/dev/null
  tar xzf three-0.128.0.tgz package/build/three.min.js package/examples/js/objects/Sky.js
  mv package/build/three.min.js package/examples/js/objects/Sky.js . && rm -rf package three-0.128.0.tgz
fi
ls -1
