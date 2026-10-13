#!/usr/bin/env python3
"""Site Life game server: serves the games and collects results for HSE.

Standard library only. Run:  HSE_KEY=yourSecret python3 sitelife_server.py
  - Games:        http://HOST:PORT/
  - HSE dashboard: http://HOST:PORT/hse?key=yourSecret
Environment: HSE_KEY (required for the dashboard), PORT (8080), HOST (0.0.0.0),
DATA_DIR (./data next to this file), GAME_DIR (the safety-game folder).
"""
import csv, hmac, html, io, json, os, threading, time
from collections import Counter, defaultdict, deque
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

HERE = os.path.dirname(os.path.abspath(__file__))
GAME_DIR = os.environ.get("GAME_DIR", os.path.dirname(HERE))
DATA_DIR = os.environ.get("DATA_DIR", os.path.join(HERE, "data"))
HSE_KEY = os.environ.get("HSE_KEY", "")
RETENTION_DAYS = int(os.environ.get("RETENTION_DAYS", "365"))  # results older than this are deleted (NDPA 2023)
PORT = int(os.environ.get("PORT", "8080"))
HOST = os.environ.get("HOST", "0.0.0.0")
RESULTS = os.path.join(DATA_DIR, "results.jsonl")
FIELDS = ["received", "game", "name", "company", "role", "result", "hazards", "mistakes", "where", "stars", "date"]
LOCK = threading.Lock()
HITS = defaultdict(deque)  # simple per-IP rate limit for result posts
os.makedirs(DATA_DIR, exist_ok=True)


def clean(v, n=120):
    return str(v if v is not None else "").replace("\n", " ").replace("\r", " ")[:n]


def purge(now=None):
    """Delete results older than RETENTION_DAYS. Returns how many were removed."""
    if RETENTION_DAYS <= 0 or not os.path.exists(RESULTS):
        return 0
    cutoff = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime((now or time.time()) - RETENTION_DAYS * 86400))
    with LOCK:
        rows = load()
        keep = [r for r in rows if str(r.get("received", "")) >= cutoff]
        if len(keep) != len(rows):
            tmp = RESULTS + ".tmp"
            with open(tmp, "w", encoding="utf8") as f:
                for r in keep:
                    f.write(json.dumps(r, ensure_ascii=False) + "\n")
            os.replace(tmp, RESULTS)
        return len(rows) - len(keep)


def purge_loop():
    while True:
        n = purge()
        if n:
            print(f"Retention: deleted {n} result(s) older than {RETENTION_DAYS} days")
        time.sleep(6 * 3600)


def load():
    rows = []
    if os.path.exists(RESULTS):
        with open(RESULTS, encoding="utf8") as f:
            for line in f:
                try:
                    rows.append(json.loads(line))
                except ValueError:
                    pass
    return rows


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=GAME_DIR, **kw)

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()

    def client_ip(self):
        return (self.headers.get("X-Forwarded-For") or self.client_address[0]).split(",")[0].strip()

    def send(self, code, body, ctype="text/html; charset=utf-8", extra=None):
        data = body.encode("utf8") if isinstance(body, str) else body
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(data)

    def authorized(self, q):
        key = (q.get("key") or [""])[0]
        return bool(HSE_KEY) and hmac.compare_digest(key.encode(), HSE_KEY.encode())

    def do_GET(self):
        u = urlparse(self.path)
        if u.path.startswith(("/server/", "/src/", "/.git")) or u.path.endswith(("hse-key.txt", ".bat", ".sh", ".gitignore")):  # never serve server code or data
            return self.send(404, "Not found", "text/plain")
        if u.path in ("/hse", "/hse/"):
            q = parse_qs(u.query)
            return self.send(200, dashboard(load(), (q.get("key") or [""])[0])) if self.authorized(q) else self.send(403, LOGIN)
        if u.path == "/hse/results.csv":
            q = parse_qs(u.query)
            if not self.authorized(q):
                return self.send(403, "Forbidden", "text/plain")
            buf = io.StringIO(); w = csv.writer(buf); w.writerow(FIELDS)
            safe = lambda v: "'" + v if v[:1] in ("=", "+", "-", "@") else v  # stop Excel formula injection
            for r in load():
                w.writerow([safe(str(r.get(f, "") if f != "where" else "; ".join(r.get("where") or []))) for f in FIELDS])
            return self.send(200, buf.getvalue(), "text/csv; charset=utf-8", {"Content-Disposition": "attachment; filename=site-life-results.csv"})
        if u.path == "/api/health":
            return self.send(200, '{"ok":true}', "application/json")
        return super().do_GET()

    def do_POST(self):
        u = urlparse(self.path)
        if u.path != "/api/result":
            return self.send(404, '{"ok":false}', "application/json")
        ip, now = self.client_ip(), time.time()
        q = HITS[ip]
        while q and now - q[0] > 60:
            q.popleft()
        if len(q) >= 20:
            return self.send(429, '{"ok":false,"error":"too many"}', "application/json")
        q.append(now)
        try:
            n = int(self.headers.get("Content-Length", "0"))
            if n <= 0 or n > 20000:
                raise ValueError("size")
            d = json.loads(self.rfile.read(n).decode("utf8"))
            if not isinstance(d, dict):
                raise ValueError("shape")
        except (ValueError, UnicodeDecodeError):
            return self.send(400, '{"ok":false}', "application/json")
        row = {
            "received": time.strftime("%Y-%m-%d %H:%M:%S"),
            "game": clean(d.get("game") or "factory", 20), "name": clean(d.get("name"), 60), "company": clean(d.get("company"), 80),
            "role": clean(d.get("role"), 60), "result": clean(d.get("result"), 20), "hazards": clean(d.get("hazards"), 10),
            "mistakes": clean(d.get("mistakes"), 6), "stars": clean(d.get("stars"), 6), "date": clean(d.get("date"), 40),
            "where": [clean(x, 80) for x in (d.get("where") or [])[:20] if isinstance(x, str)],
        }
        with LOCK, open(RESULTS, "a", encoding="utf8") as f:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")
        return self.send(200, '{"ok":true}', "application/json")

    def log_message(self, fmt, *args):  # quieter logs: only results and errors
        if "/api/result" in (args[0] if args else "") or (len(args) > 1 and str(args[1]).startswith(("4", "5"))):
            super().log_message(fmt, *args)


STYLE = """<style>:root{--bg:#f5f3ee;--panel:#fff;--ink:#1d1f22;--muted:#5d636b;--line:#ddd8cc;--brand:#0f7a4f}
@media (prefers-color-scheme:dark){:root{--bg:#15171a;--panel:#1f2226;--ink:#eceae5;--muted:#a2a8b0;--line:#343940;--brand:#2fb57c}}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.45 system-ui,sans-serif}.w{max-width:1100px;margin:0 auto;padding:16px}
.card{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:14px;margin:12px 0}.pill{display:inline-block;padding:4px 12px;border-radius:999px;border:1px solid var(--line);margin:0 6px 6px 0}
table{width:100%;border-collapse:collapse;font-size:13px}td,th{border-bottom:1px solid var(--line);padding:6px;text-align:left;vertical-align:top}.s{overflow-x:auto}
a.b,button{display:inline-block;background:var(--brand);color:#fff;border:0;border-radius:10px;padding:10px 14px;text-decoration:none;font:inherit}input{font:inherit;padding:10px;border-radius:10px;border:1px solid var(--line);width:100%;box-sizing:border-box}</style>"""
LOGIN = f"""<!doctype html><html><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>HSE Login</title>{STYLE}</head><body><div class=w><div class=card>
<h2>🔒 HSE Dashboard</h2><form method=get action=/hse><p>Enter the HSE key:</p><input name=key type=password autocomplete=current-password><p><button>Open dashboard</button></p></form></div></div></body></html>"""


def dashboard(rows, key):
    e = html.escape
    games = {"factory": "🏭 Factory", "home": "🏠 Home→Bus", "school": "🏫 School"}
    total = len(rows); passed = sum(1 for r in rows if r.get("result") in ("PASS", "GOLD", "SILVER", "BRONZE"))
    people = len({(r.get("name", "").lower(), r.get("company", "").lower()) for r in rows})
    mc = Counter(w for r in rows for w in (r.get("where") or []))
    by_game = Counter(r.get("game", "factory") for r in rows)
    trs = "".join(
        "<tr>" + "".join(f"<td>{e(str(v))}</td>" for v in [r.get("received"), games.get(r.get("game"), r.get("game")), r.get("name"), r.get("company"), r.get("role"), r.get("result"), r.get("hazards"), r.get("mistakes"), "; ".join(r.get("where") or [])]) + "</tr>"
        for r in reversed(rows[-1000:]))
    return f"""<!doctype html><html><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>HSE Dashboard</title>{STYLE}
<meta http-equiv=refresh content=60></head><body><div class=w><h1>📊 Site Life · HSE Dashboard</h1>
<div class=card><span class=pill>🎮 {total} games played</span><span class=pill>👥 {people} people</span><span class=pill>✅ {passed} passed</span><span class=pill>📈 {round(passed/total*100) if total else 0}% pass rate</span>
{''.join(f'<span class=pill>{games.get(g,g)}: {n}</span>' for g,n in by_game.items())}
<p><a class=b href="/hse/results.csv?key={e(key)}">⬇️ Download CSV (Excel)</a></p></div>
<div class=card><h3>Most common mistakes</h3>{'<ol>'+''.join(f'<li>{e(w)} ({n})</li>' for w,n in mc.most_common(8))+'</ol>' if mc else '<p>No mistakes recorded yet.</p>'}</div>
<div class=card><h3>All results (newest first)</h3><div class=s><table><tr><th>Received</th><th>Game</th><th>Name</th><th>Company</th><th>Role</th><th>Result</th><th>Hazards</th><th>Mistakes</th><th>Mistake areas</th></tr>{trs or '<tr><td colspan=9>No results yet.</td></tr>'}</table></div></div>
<p style="color:var(--muted)">Refreshes every minute. Keep this link private: it contains your HSE key.</p></div></body></html>"""


if __name__ == "__main__":
    if not HSE_KEY:
        print("WARNING: HSE_KEY is not set, so the dashboard is disabled. Set HSE_KEY=yourSecret.")
    print(f"Serving {GAME_DIR} on http://{HOST}:{PORT}  (dashboard: /hse?key=...)")
    threading.Thread(target=purge_loop, daemon=True).start()
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
