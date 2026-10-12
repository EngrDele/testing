"""Builds kids.html (and offline copies) from index.html's shared 3D engine + src/kids-game.js.
Usage: python3 src/build.py                       -> kids.html
       python3 src/build.py tests/vendor/three.min.js tests/vendor/Sky.js -> also the offline single files"""
import sys, os, re
here=os.path.dirname(os.path.abspath(__file__)); root=os.path.dirname(here)
idx=open(os.path.join(root,'index.html'),encoding='utf8').read()
a=idx.index('// ================== 3D (realistic) =================='); b=idx.index('// ---------- world build ----------')
core=idx[a:b]
css=idx[idx.index('<style>')+7:idx.index('</style>')]
kids=open(os.path.join(here,'kids-game.js'),encoding='utf8').read()
CDN='<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>\n<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/objects/Sky.js"></script>'
extra_css="""
.qt{font-size:1.1rem;line-height:1.5}
.spk{margin-left:auto;font-size:1.2rem;padding:6px 10px}
.big2{font-size:1.15rem;padding:14px 22px}
.cert{margin-top:10px;padding:16px;border-radius:14px;text-align:center;background:linear-gradient(135deg,#fff6d5,#ffe08a);color:#3a2c00;border:3px solid #e0b800}
.cert .nm{font-size:1.6rem;font-weight:800;margin:6px 0}
#hint2{position:fixed;left:50%;top:84px;transform:translateX(-50%);z-index:6;background:var(--hud);border:1px solid var(--line);border-radius:999px;padding:6px 14px;font-weight:700;font-size:14px}
#kidbar{display:flex;gap:12px;align-items:center;font-size:15px;font-weight:700}
#tasksBtn{right:106px;bottom:30px}#camBtn{right:106px;bottom:86px}#voiceBtn{right:106px;bottom:142px;font-size:13px}#guideBtn{right:106px;bottom:198px;font-size:13px}
.btnlink{display:inline-block;text-decoration:none;border-radius:10px;border:1px solid var(--line);background:var(--chip);color:var(--ink);padding:10px 14px;font-weight:600}
.btnlink.wa{background:#25D366;border-color:#1da851;color:#06290f}
"""
body="""<div id="loading">Loading…</div>
<canvas id="game"></canvas>
<div id="hud" class="hidden"><div class="hbox"><div id="kidbar"><span id="hearts"></span><span id="stars"></span></div><div id="prog" style="font-size:12px;margin-top:4px"></div></div><div class="hbox" style="padding:5px"><canvas id="mini" width="150" height="118"></canvas></div></div>
<div id="toast"></div><div id="hint2" class="hidden"></div>
<div id="prompt" class="hidden"></div><div id="guidePanel" class="hidden"><span id="gArrow">⬆</span><span id="gText"></span></div>
<div id="joy" class="hidden"><i></i></div>
<button id="act" class="hidden">E</button>
<button id="tasksBtn" class="fbtn hidden">📋 Jobs</button><button id="camBtn" class="fbtn hidden">👁️ View</button><button id="voiceBtn" class="fbtn hidden">🗣️ Voice: ON</button><button id="guideBtn" class="fbtn hidden">🧭 Guide: ON</button><button id="muteBtn" class="fbtn hidden">🔊</button>
<div id="timer" class="hidden"></div><div id="alarmv" class="alarmv hidden"></div><div id="ovl"></div>"""
prelude="""const K=0.05;
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const shuffle = a => a.map(v=>[Math.random(),v]).sort((x,y)=>x[0]-y[0]).map(x=>x[1]);
const dist = (a,b,c,d) => Math.hypot(a-c,b-d);
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
"""
def page(scripts,title):
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<title>{title}</title><style>{css}{extra_css}</style></head><body>
{body}
{scripts}
<script>
{prelude}
{core}
{kids}
</script></body></html>"""
open(os.path.join(root,'kids.html'),'w',encoding='utf8').write(page(CDN,'Kids Safety Games'))
print('kids.html built')
if len(sys.argv)>=3:
    three=open(sys.argv[1],encoding='utf8').read().replace('</script','<\\/script'); sky=open(sys.argv[2],encoding='utf8').read()
    inline=f"<script>/* three.js r128 (MIT License) */\n{three}\n</script>\n<script>/* three.js Sky (MIT License) */\n{sky}\n</script>"
    open(os.path.join(root,'kids-offline.html'),'w',encoding='utf8').write(page(inline,'Kids Safety Games (offline)').replace('href="index.html"','href="site-life-offline.html"'))
    o=idx.replace('<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>','<script>/* three.js r128 (MIT License) */\n'+three+'\n</script>').replace('<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/objects/Sky.js"></script>','<script>/* three.js Sky (MIT License) */\n'+sky+'\n</script>').replace('<title>Site Life 3D</title>','<title>Site Life 3D (offline)</title>')
    o=o.replace('href="kids.html?world=','href="kids-offline.html?world=')
    open(os.path.join(root,'site-life-offline.html'),'w',encoding='utf8').write(o)
    print('offline builds done')
