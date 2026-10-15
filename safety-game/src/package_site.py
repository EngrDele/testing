"""Collects the public game files into dist/site/ for static hosting (Cloudflare Pages, any web host).

Only what players need is copied: the pages, the offline single files, the service worker, the manifest,
the icons and the site files. Never the server, sources, tests, docs or keys.

Usage (from safety-game/):  python3 src/package_site.py          -> dist/site/
Build the pages first:      python3 src/build.py tests/vendor/three.min.js tests/vendor/Sky.js
"""
import os, shutil, sys

here = os.path.dirname(os.path.abspath(__file__)); root = os.path.dirname(here)
out = os.path.join(root, 'dist', 'site')

PAGES = ['index.html', 'kids.html', 'little.html', 'warehouse.html', 'builder.html', 'lite.html',
         'site-life-offline.html', 'kids-offline.html', 'little-offline.html', 'warehouse-offline.html',
         'sw.js', 'manifest.webmanifest']
DIRS = {'icons': ('.png',), 'sites': ('.json',)}

# Cloudflare Pages reads _headers: always re-check pages and the service worker so players get updates,
# and add basic security headers. Static assets may be cached.
HEADERS = """/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
/*.html
  Cache-Control: no-cache
/
  Cache-Control: no-cache
/sw.js
  Cache-Control: no-cache
/manifest.webmanifest
  Cache-Control: no-cache
"""

missing = [p for p in PAGES if not os.path.exists(os.path.join(root, p))]
if missing:
    sys.exit('Missing ' + ', '.join(missing) + ': run python3 src/build.py tests/vendor/three.min.js tests/vendor/Sky.js first')
shutil.rmtree(out, ignore_errors=True); os.makedirs(out)
for p in PAGES:
    src = os.path.join(root, p)
    if p.endswith('.html') and 'offline' not in p:
        # tell the games there is no results server here (results go to ?results= Google Sheets, WhatsApp or email)
        html = open(src, encoding='utf8').read()
        if 'const SL_I18N = ' in html:
            html = html.replace('const SL_I18N = ', 'var SL_STATIC_HOST = true;\nconst SL_I18N = ', 1)
        open(os.path.join(out, p), 'w', encoding='utf8').write(html)
    else:
        shutil.copy2(src, os.path.join(out, p))
for d, exts in DIRS.items():
    os.makedirs(os.path.join(out, d))
    for f in sorted(os.listdir(os.path.join(root, d))):
        if f.endswith(exts):
            shutil.copy2(os.path.join(root, d, f), os.path.join(out, d, f))
open(os.path.join(out, '_headers'), 'w').write(HEADERS)
n = sum(len(fs) for _, _, fs in os.walk(out)); mb = sum(os.path.getsize(os.path.join(a, f)) for a, _, fs in os.walk(out) for f in fs) / 1e6
print(f'dist/site: {n} files, {mb:.1f} MB')
