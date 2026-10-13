"""Builds the playable pages from sources. Never edit the generated files by hand.

Sources:   sites/acme-ikeja.json (built-in factory site), src/i18n/*.json (translations),
           src/factory.html (factory game shell + logic), src/engine.js (shared 3D engine),
           src/common.js (shared features), src/kids-game.js (kids games), src/kids-shell.html
Generated: index.html, kids.html, and with three.js paths also site-life-offline.html, kids-offline.html

Usage: python3 src/build.py                                              -> index.html, kids.html
       python3 src/build.py tests/vendor/three.min.js tests/vendor/Sky.js -> also the offline single files
"""
import os, sys
here = os.path.dirname(os.path.abspath(__file__)); root = os.path.dirname(here)
rd = lambda p: open(os.path.join(here, p), encoding='utf8').read()
def wr(p, s): open(os.path.join(root, p), 'w', encoding='utf8').write(s)

import json, glob
engine, common = rd('engine.js'), rd('common.js')
# Translations: src/i18n/<lang>.json (keys are the English strings). strings-en.json is the source list, not a language.
i18n = {}
for f in sorted(glob.glob(os.path.join(here, 'i18n', '*.json'))):
    l = os.path.basename(f)[:-5]
    if l.startswith('strings-'): continue
    i18n[l] = {k: v for k, v in json.load(open(f, encoding='utf8')).items() if not k.startswith('_') and v}
common = 'const SL_I18N = ' + json.dumps(i18n, ensure_ascii=False).replace('</', '<\\/') + ';\n' + common
factory_src = rd('factory.html')
css = factory_src[factory_src.index('<style>') + 7:factory_src.index('</style>')]
CDN = ('<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>\n'
       '<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/objects/Sky.js"></script>')

site = json.load(open(os.path.join(root, 'sites', 'acme-ikeja.json'), encoding='utf8'))
site_js = 'const SITE_DEFAULT = ' + json.dumps(site, ensure_ascii=False).replace('</', '<\\/') + ';'

def factory_page():
    return factory_src.replace('/*@@COMMON@@*/', common).replace('/*@@ENGINE@@*/', engine).replace('/*@@SITE@@*/', site_js)

def kids_page():
    shell = rd('kids-shell.html')
    return (shell.replace('/*@@CSS@@*/', css)
                 .replace('<!--@@CDN@@-->', CDN)
                 .replace('/*@@COMMON@@*/', common)
                 .replace('/*@@ENGINE@@*/', engine)
                 .replace('/*@@KIDS@@*/', rd('kids-game.js')))

idx, kids = factory_page(), kids_page()
wr('index.html', idx); wr('kids.html', kids)
print('built index.html, kids.html')

if len(sys.argv) >= 3:
    three = open(sys.argv[1], encoding='utf8').read().replace('</script', '<\\/script')
    sky = open(sys.argv[2], encoding='utf8').read()
    inline = f"<script>/* three.js r128 (MIT License) */\n{three}\n</script>\n<script>/* three.js Sky (MIT License) */\n{sky}\n</script>"
    off = lambda s: s.replace(CDN, inline)
    wr('site-life-offline.html', off(idx).replace('href="kids.html?world=', 'href="kids-offline.html?world=').replace('href="index.html', 'href="site-life-offline.html').replace('<title>Site Life 3D</title>', '<title>Site Life 3D (offline)</title>'))
    wr('kids-offline.html', off(kids).replace('href="index.html', 'href="site-life-offline.html'))
    print('built offline files')
