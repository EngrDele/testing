"""Packages each game as a SCORM 1.2 zip for an LMS (TalentLMS, Moodle, ...). ROADMAP 15.

Usage (from safety-game/):
    python3 src/scorm.py              # rebuilds the offline files first when tests/vendor/ has three.js
    python3 src/scorm.py --no-build   # package the offline files as they are

Output: dist/scorm/site-life-factory.zip, site-life-kids-home.zip, site-life-kids-school.zip, one
per extra kids world found in kids.html (market, water, online), site-life-little.zip (Little Stars, 3-6) and
site-life-warehouse.zip (Warehouse Shift).

Each zip holds imsmanifest.xml (SCORM 1.2, one SCO), a launch index.html that opens the offline single
file (three.js inlined, so the LMS needs no internet access to our server or the CDNs) with the right
?world=, and that offline file. In the LMS the game finds the SCORM API (SL.lms in src/common.js),
pre-fills the learner's name, and reports score and passed/failed when the game ends.
"""
import os, re, subprocess, sys, zipfile
from xml.sax.saxutils import escape

here = os.path.dirname(os.path.abspath(__file__)); root = os.path.dirname(here)
P = lambda *a: os.path.join(root, *a)

GAMES = [  # (package id, title, offline file, world)
    ('factory', 'Site Life: Factory Site Induction', 'site-life-offline.html', None),
    ('kids-home', 'Site Life Kids: Home to School Bus Safety', 'kids-offline.html', 'home'),
    ('kids-school', 'Site Life Kids: School Safety', 'kids-offline.html', 'school'),
    ('kids-market', 'Site Life Kids: Market Safety', 'kids-offline.html', 'market'),
    ('kids-water', 'Site Life Kids: Water Safety', 'kids-offline.html', 'water'),
    ('kids-online', 'Site Life Kids: Online Safety', 'kids-offline.html', 'online'),
    ('little', 'Site Life: Little Stars (ages 3-6)', 'little-offline.html', None),
    ('warehouse', 'Site Life: Warehouse Shift', 'warehouse-offline.html', None),
]
ALWAYS = {'factory', 'kids-home', 'kids-school', 'little', 'warehouse'}


def has_world(kids_src, world):
    """A kids world exists when its DATA entry (`market: {` / `'market': {`) is in the page."""
    return re.search(r"""(^|[\s,{])['"]?%s['"]?\s*:\s*\{""" % re.escape(world), kids_src, re.M) is not None


def manifest(ident, title, files):
    t = escape(title)
    fl = '\n      '.join('<file href="%s"/>' % escape(f) for f in files)
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="site-life-{ident}" version="1.0"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd http://www.imsglobal.org/xsd/imsmd_rootv1p2p1 imsmd_rootv1p2p1.xsd http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="site-life-org">
    <organization identifier="site-life-org">
      <title>{t}</title>
      <item identifier="item-1" identifierref="res-1" isvisible="true">
        <title>{t}</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="res-1" type="webcontent" adlcp:scormtype="sco" href="index.html">
      {fl}
    </resource>
  </resources>
</manifest>
'''


def launch(title, target):
    t, u = escape(title), escape(target, {'"': '&quot;'})
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{t}</title>
<meta http-equiv="refresh" content="1; url={u}">
<style>body{{font:16px system-ui,sans-serif;background:#121c22;color:#fff;display:grid;place-items:center;min-height:90vh;margin:0}}a{{color:#ffd400}}</style>
</head><body><p>Loading {t}… <a href="{u}">Open the game</a></p>
<script>location.replace({target!r});</script>
</body></html>
'''


def main():
    if '--no-build' not in sys.argv and os.path.exists(P('tests', 'vendor', 'three.min.js')):
        subprocess.check_call([sys.executable, os.path.join(here, 'build.py'), P('tests', 'vendor', 'three.min.js'), P('tests', 'vendor', 'Sky.js')], cwd=root)
    for f in ('site-life-offline.html', 'kids-offline.html', 'little-offline.html', 'warehouse-offline.html'):
        if not os.path.exists(P(f)):
            sys.exit(f'{f} is missing: run  python3 src/build.py tests/vendor/three.min.js tests/vendor/Sky.js  first')
    kids_src = open(P('kids.html'), encoding='utf8').read()
    out = P('dist', 'scorm'); os.makedirs(out, exist_ok=True)
    made = []
    for ident, title, page, world in GAMES:
        if ident not in ALWAYS and not has_world(kids_src, world):
            continue
        target = page + ('?world=' + world if world else '')
        zp = os.path.join(out, f'site-life-{ident}.zip')
        with zipfile.ZipFile(zp, 'w', zipfile.ZIP_DEFLATED) as z:
            z.writestr('imsmanifest.xml', manifest(ident, title, ['index.html', page]))
            z.writestr('index.html', launch(title, target))
            z.write(P(page), page)
        made.append(zp)
        print('built', os.path.relpath(zp, root), f'({os.path.getsize(zp) // 1024} KB)')
    return made


if __name__ == '__main__':
    main()
