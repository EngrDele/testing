#!/usr/bin/env python3
"""Site Life game server: serves the games, collects results for HSE, certificates and live rooms.

Standard library only. Run:  HSE_KEY=yourSecret python3 sitelife_server.py
  - Games:            http://HOST:PORT/
  - HSE dashboard:    http://HOST:PORT/hse?key=yourSecret   (+ /hse/person, /hse/class, /hse/results.csv)
  - Certificate:      http://HOST:PORT/cert/<id>      (printable A4, QR code -> /verify/<id>)
  - Verify:           http://HOST:PORT/verify/<id>
  - Trainer room:     http://HOST:PORT/trainer?room=CODE
Environment: HSE_KEY (required for the dashboard), PORT (8080), HOST (0.0.0.0),
DATA_DIR (./data next to this file), GAME_DIR (the safety-game folder),
RETENTION_DAYS (365, 0 = keep forever), VALID_MONTHS (12: how long a certificate is valid).

API (JSON):
  POST /api/result                 game result -> {"ok":true,"id":"<10 chars>"}
  POST /api/room/<CODE>/state      {pid,name,role,x,y,yaw,game,zone,score} -> {"ok":true,"id":<public id>,"now":ms}
  POST /api/room/<CODE>/event      {pid,type} (trainer only) -> {"ok":true,"event":{...}}
  GET  /api/room/<CODE>?since=ms   -> {"ok":true,"room":CODE,"players":[...],"events":[...],"now":ms}
"""
import calendar, csv, hashlib, hmac, html, io, json, math, os, posixpath, re, secrets, string, threading, time
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, unquote, urlencode, urlparse

HERE = os.path.dirname(os.path.abspath(__file__))
GAME_DIR = os.environ.get("GAME_DIR", os.path.dirname(HERE))
DATA_DIR = os.environ.get("DATA_DIR", os.path.join(HERE, "data"))
HSE_KEY = os.environ.get("HSE_KEY", "")
RETENTION_DAYS = int(os.environ.get("RETENTION_DAYS", "365"))  # results older than this are deleted (NDPA 2023)
VALID_MONTHS = int(os.environ.get("VALID_MONTHS", "12"))  # certificate validity
PORT = int(os.environ.get("PORT", "8080"))
HOST = os.environ.get("HOST", "0.0.0.0")
RESULTS = os.path.join(DATA_DIR, "results.jsonl")
TS = "%Y-%m-%d %H:%M:%S"
MAX_BODY = 32 * 1024
PASSING = {"PASS", "PASSED", "GOLD", "SILVER", "BRONZE", "COMPLETE"}   # COMPLETE: Little Stars (no pass/fail for ages 3-6)
GAMES = {"factory": "🏭 Factory induction", "factory-advanced": "🏗️ Factory (advanced)", "oga": "🦺 Oga Mode (supervisor)",
         "home": "🏠 Home → School Bus", "school": "🏫 School Safety", "market": "🛒 Market & Road", "water": "🏊 Water Safety",
         "online": "📱 Online Safety", "little": "⭐ Little Stars (3–6)", "warehouse": "📦 Warehouse Shift"}
KIDS_GAMES = {"home", "school", "market", "water", "online", "little"}
CSV_FIELDS = ["id", "received", "game", "course", "name", "company", "role", "class", "result", "stars", "hazards", "mistakes",
              "where", "missed", "wrong", "zoneTimes", "room", "lang", "date", "expires", "status"]
ID_CHARS = string.ascii_letters + string.digits
ID_RE = re.compile(r"^[A-Za-z0-9_-]{4,20}$")
ROOM_RE = re.compile(r"^[A-Z0-9]{4,8}$")
PID_RE = re.compile(r"^[A-Za-z0-9_-]{4,40}$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
LOCK = threading.RLock()
os.makedirs(DATA_DIR, exist_ok=True)


# ---------------------------------------------------------------- helpers
def clean(v, n=120):
    if isinstance(v, (dict, list)):
        v = ""
    return str(v if v is not None else "").replace("\n", " ").replace("\r", " ").strip()[:n]


def clean_list(v, n_items=40, n=80):
    return [clean(x, n) for x in (v if isinstance(v, list) else [])[:n_items] if isinstance(x, (str, int, float)) and not isinstance(x, bool) and clean(x, n)]


def num(v, lo=-1e7, hi=1e7):
    """A finite number clamped to [lo, hi], or None."""
    if isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v):
        return None
    return max(lo, min(hi, v))


def new_id(taken):
    while True:
        i = "".join(secrets.choice(ID_CHARS) for _ in range(10))
        if i not in taken:
            return i


def now_ms():
    return int(time.time() * 1000)


def parse_ts(s):
    try:
        return datetime.strptime(str(s)[:19], TS)
    except ValueError:
        return None


def add_months(d, m):
    y, mo = divmod(d.month - 1 + m, 12)
    y += d.year; mo += 1
    return d.replace(year=y, month=mo, day=min(d.day, calendar.monthrange(y, mo)[1]))


def passed(r):
    return str(r.get("result", "")).upper() in PASSING


def expiry(r):
    """Certificate expiry (datetime) for a passing result, else None. Memoised on the cached row."""
    if "_exp" not in r:
        d = parse_ts(r.get("received")) if passed(r) else None
        r["_exp"] = add_months(d, VALID_MONTHS) if d else None
    return r["_exp"]


def cert_status(r, now=None):
    """None (no certificate) | 'valid' | 'soon' (expires within 30 days) | 'expired'."""
    e = expiry(r)
    if not e:
        return None
    now = now or datetime.now()
    return "expired" if e < now else "soon" if e - now <= timedelta(days=30) else "valid"


def game_label(g):
    return GAMES.get(g, g or "?")


def csv_safe(v):
    return "'" + v if v[:1] in ("=", "+", "-", "@", "\t", "\r") else v  # stop Excel formula injection


# ---------------------------------------------------------------- storage
def load():
    rows = []
    if os.path.exists(RESULTS):
        with open(RESULTS, encoding="utf8") as f:
            for line in f:
                try:
                    r = json.loads(line)
                    if isinstance(r, dict):
                        rows.append(r)
                except ValueError:
                    pass
    return rows


class Store:
    """Caches results.jsonl in memory and reloads when the file changes (size or mtime)."""

    def __init__(self):
        self.sig, self.rows, self.by_id = None, [], {}

    def get(self):
        with LOCK:
            try:
                st = os.stat(RESULTS); sig = (st.st_mtime_ns, st.st_size)
            except FileNotFoundError:
                sig = None
            if sig != self.sig:
                self.rows = load()
                self.by_id = {r["id"]: r for r in self.rows if r.get("id")}
                self.sig = sig
            return self.rows, self.by_id


STORE = Store()


def rewrite(rows):
    tmp = RESULTS + ".tmp"
    with open(tmp, "w", encoding="utf8") as f:
        for r in rows:
            f.write(json.dumps({k: v for k, v in r.items() if not k.startswith("_")}, ensure_ascii=False) + "\n")
    os.replace(tmp, RESULTS)


def purge(now=None):
    """Delete results older than RETENTION_DAYS and give old rows (from before ids existed) an id. Returns how many were removed."""
    if not os.path.exists(RESULTS):
        return 0
    with LOCK:
        rows = load()
        keep = rows
        if RETENTION_DAYS > 0:
            cutoff = time.strftime(TS, time.localtime((now or time.time()) - RETENTION_DAYS * 86400))
            keep = [r for r in rows if str(r.get("received", "")) >= cutoff]
        taken = {r.get("id") for r in keep}
        missing = [r for r in keep if not r.get("id")]
        for r in missing:
            r["id"] = new_id(taken); taken.add(r["id"])
        if len(keep) != len(rows) or missing:
            rewrite(keep)
        return len(rows) - len(keep)


def purge_loop():
    while True:
        n = purge()
        if n:
            print(f"Retention: deleted {n} result(s) older than {RETENTION_DAYS} days")
        time.sleep(6 * 3600)


def make_row(d, taken):
    zt = {}
    if isinstance(d.get("zoneTimes"), dict):
        for k, v in list(d["zoneTimes"].items())[:40]:
            v = num(v, 0, 86400)
            if v is not None and clean(k, 60):
                zt[clean(k, 60)] = round(v, 1)
    room = clean(d.get("room"), 8).upper()
    return {
        "id": new_id(taken), "received": time.strftime(TS),
        "game": clean(d.get("game") or "factory", 30), "course": clean(d.get("course"), 80),
        "name": clean(d.get("name"), 60), "company": clean(d.get("company"), 80), "role": clean(d.get("role"), 60),
        "class": clean(d.get("class"), 40), "result": clean(d.get("result"), 20), "hazards": clean(d.get("hazards"), 10),
        "mistakes": clean(d.get("mistakes"), 6), "stars": clean(d.get("stars"), 6), "date": clean(d.get("date"), 40),
        "where": clean_list(d.get("where"), 20, 80), "missed": clean_list(d.get("missed"), 40, 80),
        "wrong": clean_list(d.get("wrong"), 40, 120), "zoneTimes": zt,
        "room": room if ROOM_RE.match(room) else "", "lang": clean(d.get("lang"), 8),
    }


# ---------------------------------------------------------------- rate limits (token buckets)
BUCKETS = {}
BUCKET_LOCK = threading.Lock()


def limited(key, limit, per):
    """True if this request is over the limit (`limit` requests per `per` seconds, bursts up to `limit`)."""
    t = time.monotonic()
    with BUCKET_LOCK:
        if len(BUCKETS) > 20000:  # forget idle clients
            for k in [k for k, (_, last, p) in BUCKETS.items() if t - last > p]:
                del BUCKETS[k]
        tokens, last, _ = BUCKETS.get(key, (float(limit), t, per))
        tokens = min(float(limit), tokens + (t - last) * limit / per)
        if tokens < 1:
            BUCKETS[key] = (tokens, t, per)
            return True
        BUCKETS[key] = (tokens - 1, t, per)
        return False


# ---------------------------------------------------------------- rooms (multiplayer by polling)
ROOMS = {}
ROOM_LOCK = threading.Lock()
ROOM_IDLE, SEEN_MS, MAX_PLAYERS, MAX_ROOMS = 2 * 3600, 15000, 30, 500
EVENT_TYPES = {"fire_alarm", "nepa", "spill", "rain", "end"}
_last_sweep = [0.0]


def public_id(code, pid):
    return hashlib.sha256(f"{code}:{pid}".encode()).hexdigest()[:10]  # never reveal pids: they authorise trainer events


def sweep_rooms():
    t = time.time()
    if t - _last_sweep[0] < 30:
        return
    _last_sweep[0] = t
    for c in [c for c, r in ROOMS.items() if t - r["last"] > ROOM_IDLE]:
        del ROOMS[c]


def room_state(code, d):
    pid = d.get("pid")
    if not isinstance(pid, str) or not PID_RE.match(pid):
        return 400, {"ok": False, "error": "bad pid"}
    role = d.get("role") if d.get("role") in ("trainer", "trainee") else "trainee"
    ms = now_ms()
    with ROOM_LOCK:
        sweep_rooms()
        room = ROOMS.get(code)
        if room is None:
            if len(ROOMS) >= MAX_ROOMS:
                return 503, {"ok": False, "error": "too many rooms"}
            room = ROOMS[code] = {"players": {}, "events": [], "seq": 0, "last": time.time()}
        players = room["players"]
        for p in [p for p, v in players.items() if ms - v["t"] > 600000]:  # forget players gone for 10 min
            del players[p]
        if pid not in players and sum(1 for v in players.values() if ms - v["t"] <= SEEN_MS) >= MAX_PLAYERS:
            return 409, {"ok": False, "error": "room full"}
        old = players.get(pid, {})
        players[pid] = {
            "id": public_id(code, pid), "name": clean(d.get("name"), 40) or "Player", "role": role,
            "x": num(d.get("x")) or 0, "y": num(d.get("y")) or 0, "yaw": num(d.get("yaw"), -100, 100) or 0,
            "game": clean(d.get("game"), 30), "zone": clean(d.get("zone"), 60), "score": num(d.get("score")) or 0,
            "t": ms, "since": old.get("since", ms),
        }
        room["last"] = time.time()
        return 200, {"ok": True, "id": players[pid]["id"], "now": ms}


def room_event(code, d):
    pid, typ = d.get("pid"), d.get("type")
    if not isinstance(pid, str) or not PID_RE.match(pid) or typ not in EVENT_TYPES:
        return 400, {"ok": False, "error": "bad event"}
    with ROOM_LOCK:
        room = ROOMS.get(code)
        p = room and room["players"].get(pid)
        if not p or p["role"] != "trainer":
            return 403, {"ok": False, "error": "only the trainer can trigger events"}
        room["seq"] += 1
        ev = {"id": room["seq"], "type": typ, "by": p["name"], "at": now_ms()}
        room["events"] = (room["events"] + [ev])[-100:]
        room["last"] = time.time()
        return 200, {"ok": True, "event": ev}


def room_poll(code, since):
    ms = now_ms()
    with ROOM_LOCK:
        room = ROOMS.get(code) or {"players": {}, "events": []}
        players = [{k: v for k, v in p.items()} for p in room["players"].values() if ms - p["t"] <= SEEN_MS]
        events = [dict(e) for e in room["events"] if e["at"] >= since]
    return {"ok": True, "room": code, "players": players, "events": events, "now": ms}


# ---------------------------------------------------------------- filters + analytics
FILTER_KEYS = ("from", "to", "company", "game", "result", "class", "name", "status")


def get_filters(q):
    f = {k: (q.get(k) or [""])[0].strip()[:80] for k in FILTER_KEYS}
    for k in ("from", "to"):
        if not DATE_RE.match(f[k]):
            f[k] = ""
    return f


def apply_filters(rows, f, now=None):
    now = now or datetime.now()
    co, nm, cl, res, st = f["company"].lower(), f["name"].lower(), f["class"].lower(), f["result"].upper(), f["status"]
    out = []
    for r in rows:
        day = str(r.get("received", ""))[:10]
        if (f["from"] and day < f["from"]) or (f["to"] and day > f["to"]):
            continue
        if f["game"] and r.get("game", "factory") != f["game"]:
            continue
        if co and co not in str(r.get("company", "")).lower():
            continue
        if nm and nm not in str(r.get("name", "")).lower():
            continue
        if cl and cl != str(r.get("class", "")).lower():
            continue
        if res and not ((res == "PASS*" and passed(r)) or (res == "FAIL*" and not passed(r)) or str(r.get("result", "")).upper() == res):
            continue
        if st and cert_status(r, now) != st:
            continue
        out.append(r)
    return out


def analytics(rows):
    tot, cnt = defaultdict(float), Counter()
    for r in rows:
        zt = r.get("zoneTimes")
        if isinstance(zt, dict):
            for z, s in zt.items():
                if isinstance(s, (int, float)):
                    tot[z] += s; cnt[z] += 1
    zones = sorted(((z, tot[z] / cnt[z], cnt[z]) for z in cnt), key=lambda x: -x[1])
    lst = lambda k: Counter(x for r in rows for x in (r.get(k) or []) if isinstance(x, str))
    return {"zones": zones, "missed": lst("missed"), "wrong": lst("wrong"), "where": lst("where")}


# ---------------------------------------------------------------- HTTP
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
        if self.command != "HEAD":
            self.wfile.write(data)

    def json(self, code, obj):
        return self.send(code, json.dumps(obj, ensure_ascii=False, separators=(",", ":")), "application/json")

    def authorized(self, q):
        key = (q.get("key") or [""])[0]
        return bool(HSE_KEY) and hmac.compare_digest(key.encode(), HSE_KEY.encode())

    def hidden(self, _path=None):
        raw = self.path.split("?", 1)[0].split("#", 1)[0]  # not urlparse: it reads "//server/x" as a host name
        p = posixpath.normpath(re.sub(r"/+", "/", "/" + unquote(raw)))
        return (p.startswith(("/server", "/src/", "/deploy/")) or p in ("/src",) or any(s.startswith(".") for s in p.split("/") if s)
                or p.endswith(("hse-key.txt", ".bat", ".sh", ".py", ".gs", ".jsonl")))

    def read_json(self, limit=MAX_BODY):
        """Returns (dict, None) or (None, (status, body))."""
        if self.headers.get("Transfer-Encoding"):
            self.close_connection = True
            return None, (411, {"ok": False, "error": "length required"})
        try:
            n = int(self.headers.get("Content-Length", ""))
        except ValueError:
            return None, (400, {"ok": False, "error": "bad length"})
        if n > limit:
            self.close_connection = True  # do not read a huge body
            return None, (413, {"ok": False, "error": "too large"})
        if n <= 0:
            return None, (400, {"ok": False, "error": "empty"})
        try:
            d = json.loads(self.rfile.read(n).decode("utf8"))
        except (ValueError, UnicodeDecodeError):
            return None, (400, {"ok": False, "error": "bad json"})
        if not isinstance(d, dict):
            return None, (400, {"ok": False, "error": "expected an object"})
        return d, None

    def do_HEAD(self):
        if self.hidden(urlparse(self.path).path):
            return self.send(404, "Not found", "text/plain")
        return super().do_HEAD()

    def do_GET(self):
        u = urlparse(self.path)
        q = parse_qs(u.query)
        if self.hidden(u.path):  # never serve server code, data or keys
            return self.send(404, "Not found", "text/plain")
        if u.path in ("/hse", "/hse/", "/hse/person", "/hse/class", "/hse/results.csv"):
            if not self.authorized(q):
                return self.send(403, LOGIN if u.path != "/hse/results.csv" else "Forbidden", "text/html; charset=utf-8" if u.path != "/hse/results.csv" else "text/plain")
            rows, _ = STORE.get()
            key, f = (q.get("key") or [""])[0], get_filters(q)
            if u.path == "/hse/results.csv":
                return self.send(200, csv_export(apply_filters(rows, f)), "text/csv; charset=utf-8",
                                 {"Content-Disposition": "attachment; filename=site-life-results.csv"})
            if u.path == "/hse/person":
                return self.send(200, person_page(rows, key, (q.get("name") or [""])[0][:60], (q.get("company") or [""])[0][:80]))
            if u.path == "/hse/class":
                return self.send(200, class_page(rows, key, f))
            return self.send(200, dashboard(rows, key, f))
        m = re.match(r"^/(cert|verify)/([^/]+)/?$", u.path)
        if m:
            rid = m.group(2)
            r = STORE.get()[1].get(rid) if ID_RE.match(rid) else None
            return self.send(*(cert_page(r, rid) if m.group(1) == "cert" else verify_page(r)))
        if u.path in ("/trainer", "/trainer/"):
            code = (q.get("room") or [""])[0].strip().upper()
            return self.send(200, trainer_page(code if ROOM_RE.match(code) else ""))
        m = re.match(r"^/api/room/([^/]+)/?$", u.path)
        if m:
            if not ROOM_RE.match(m.group(1)):
                return self.json(400, {"ok": False, "error": "bad room code"})
            if limited(("roomget", self.client_ip()), 6000, 60):
                return self.json(429, {"ok": False, "error": "too many"})
            try:
                since = int(float((q.get("since") or ["0"])[0]))
            except ValueError:
                since = 0
            return self.json(200, room_poll(m.group(1), since))
        if u.path == "/api/health":
            return self.send(200, '{"ok":true}', "application/json")
        return super().do_GET()

    def do_POST(self):
        u = urlparse(self.path)
        ip = self.client_ip()
        if u.path == "/api/result":
            if limited(("result", ip), 20, 60):
                return self.json(429, {"ok": False, "error": "too many"})
            d, err = self.read_json()
            if err:
                return self.json(*err)
            with LOCK:
                _, by_id = STORE.get()
                row = make_row(d, by_id)
                with open(RESULTS, "a", encoding="utf8") as f:
                    f.write(json.dumps(row, ensure_ascii=False) + "\n")
                by_id[row["id"]] = row  # visible at once even if the file mtime did not tick
            return self.json(200, {"ok": True, "id": row["id"]})
        m = re.match(r"^/api/room/([^/]+)/(state|event)$", u.path)
        if m:
            code, kind = m.group(1), m.group(2)
            if not ROOM_RE.match(code):
                return self.json(400, {"ok": False, "error": "bad room code"})
            if limited(("room", ip), 6000, 60):  # a whole class behind one office Wi-Fi shares an IP
                return self.json(429, {"ok": False, "error": "too many"})
            d, err = self.read_json(2048)
            if err:
                return self.json(*err)
            pid = d.get("pid") if isinstance(d.get("pid"), str) else ""
            if kind == "state":
                if limited(("state", code, pid), 10, 1):  # ~2/s expected; allow bursts up to 10/s
                    return self.json(429, {"ok": False, "error": "too many"})
                return self.json(*room_state(code, d))
            if limited(("event", code, pid), 20, 60):
                return self.json(429, {"ok": False, "error": "too many"})
            return self.json(*room_event(code, d))
        return self.json(404, {"ok": False})

    def log_message(self, fmt, *args):  # quieter logs: only results and errors
        if "/api/result" in (args[0] if args else "") or (len(args) > 1 and str(args[1]).startswith(("4", "5"))):
            super().log_message(fmt, *args)


# ---------------------------------------------------------------- pages
e = html.escape
STYLE = """<style>:root{color-scheme:light dark;--bg:#f5f3ee;--panel:#fff;--ink:#1d1f22;--muted:#5d636b;--line:#ddd8cc;--brand:#0f7a4f;--ok:#0f7a4f;--bad:#b42318;--warn:#a15c00}
@media (prefers-color-scheme:dark){:root{--bg:#15171a;--panel:#1f2226;--ink:#eceae5;--muted:#a2a8b0;--line:#343940;--brand:#2fb57c;--ok:#2fb57c;--bad:#f0645a;--warn:#e7a33e}}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.45 system-ui,sans-serif}.w{max-width:1100px;margin:0 auto;padding:16px}
.card{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:14px;margin:12px 0}.pill{display:inline-block;padding:4px 12px;border-radius:999px;border:1px solid var(--line);margin:0 6px 6px 0}
table{width:100%;border-collapse:collapse;font-size:13px}td,th{border-bottom:1px solid var(--line);padding:6px;text-align:left;vertical-align:top}.s{overflow-x:auto}
a{color:var(--brand)}a.b,button{display:inline-block;background:var(--brand);color:#fff;border:0;border-radius:10px;padding:10px 14px;text-decoration:none;font:inherit;cursor:pointer}
input,select{font:inherit;padding:8px;border-radius:10px;border:1px solid var(--line);width:100%;box-sizing:border-box;background:var(--panel);color:var(--ink)}
.f{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;align-items:end}.f label{font-size:12px;color:var(--muted)}
.g3{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}.g3 .card{margin:0}
.badge{display:inline-block;font-size:11px;padding:1px 8px;border-radius:999px;color:#fff;margin-left:4px}.b-expired{background:var(--bad)}.b-soon{background:var(--warn)}
.muted{color:var(--muted)}</style>"""
def head(t):
    return f'<!doctype html><html><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>{e(t)}</title>' + STYLE
LOGIN = head("HSE Login") + """</head><body><div class=w><div class=card>
<h2>🔒 HSE Dashboard</h2><form method=get action=/hse><p>Enter the HSE key:</p><input name=key type=password autocomplete=current-password><p><button>Open dashboard</button></p></form></div></div></body></html>"""


def link(path, **params):
    return e(path + "?" + urlencode({k: v for k, v in params.items() if v}))


def badge(r, now):
    st = cert_status(r, now)
    return {"expired": " <span class='badge b-expired'>expired</span>", "soon": " <span class='badge b-soon'>expires soon</span>"}.get(st, "")


def ol(counter, n=10, empty="Nothing recorded yet."):
    return "<ol>" + "".join(f"<li>{e(k)} ({v})</li>" for k, v in counter.most_common(n)) + "</ol>" if counter else f"<p class=muted>{empty}</p>"


def filter_form(rows, key, f, action="/hse"):
    games = sorted({str(r.get("game", "factory")) for r in rows} | {f["game"]} - {""})
    classes = sorted({str(r.get("class", "")) for r in rows if r.get("class")})
    opt = lambda val, label, cur: f"<option value='{e(val)}'{' selected' if val == cur else ''}>{e(label)}</option>"
    results = [("", "Any result"), ("PASS*", "Passed (any)"), ("FAIL*", "Not passed (any)")] + [(x, x) for x in sorted({str(r.get("result", "")).upper() for r in rows} - {""})]
    return f"""<form class="card f" method=get action="{action}"><input type=hidden name=key value="{e(key)}">
<div><label>From</label><input type=date name=from value="{e(f['from'])}"></div><div><label>To</label><input type=date name=to value="{e(f['to'])}"></div>
<div><label>Name contains</label><input name=name value="{e(f['name'])}"></div><div><label>Company contains</label><input name=company value="{e(f['company'])}"></div>
<div><label>Game</label><select name=game>{opt('', 'All games', f['game'])}{''.join(opt(g, game_label(g), f['game']) for g in games)}</select></div>
<div><label>Result</label><select name=result>{''.join(opt(v, l, f['result'].upper()) for v, l in results)}</select></div>
<div><label>Class / family</label><select name=class>{opt('', 'All', f['class'])}{''.join(opt(c, c, f['class']) for c in classes)}</select></div>
<div><label>Certificate</label><select name=status>{opt('', 'Any', f['status'])}{opt('valid', 'Valid', f['status'])}{opt('soon', 'Expires within 30 days', f['status'])}{opt('expired', 'Expired', f['status'])}</select></div>
<div><button>Filter</button> <a href="{link(action, key=key)}">Clear</a></div></form>"""


def dashboard(rows, key, f, limit=500):
    now = datetime.now()
    sel = apply_filters(rows, f, now)
    total = len(sel); npass = sum(1 for r in sel if passed(r))
    people = len({(str(r.get("name", "")).lower(), str(r.get("company", "")).lower()) for r in sel})
    by_game = Counter(r.get("game", "factory") for r in sel)
    stat = Counter(cert_status(r, now) for r in rows)
    a = analytics(sel)
    fq = {k: v for k, v in f.items() if v}
    trs = []
    for r in reversed(sel[-limit:]):
        cert = f"<a href='/cert/{e(r['id'])}' target=_blank>Certificate</a>" if passed(r) and r.get("id") else ""
        cells = [e(str(r.get("received", ""))), e(game_label(r.get("game"))),
                 f"<a href='{link('/hse/person', key=key, name=r.get('name', ''))}'>{e(str(r.get('name', '')))}</a>",
                 e(str(r.get("company", ""))), e(str(r.get("role", ""))), e(str(r.get("class", ""))),
                 e(str(r.get("result", ""))) + badge(r, now), e(str(r.get("stars", ""))), e(str(r.get("hazards", ""))), e(str(r.get("mistakes", ""))),
                 e("; ".join(r.get("where") or [])), e("; ".join(r.get("missed") or [])), cert]
        trs.append("<tr>" + "".join(f"<td>{c}</td>" for c in cells) + "</tr>")
    more = f"<p class=muted>Showing the newest {limit} of {total}. Narrow the filters or download the CSV for all rows.</p>" if total > limit else ""
    zones = "<table><tr><th>Zone</th><th>Average time</th><th>Players</th></tr>" + "".join(
        f"<tr><td>{e(z)}</td><td>{s:.0f} s</td><td>{n}</td></tr>" for z, s, n in a["zones"][:20]) + "</table>" if a["zones"] else "<p class=muted>No zone times recorded yet.</p>"
    return head("HSE Dashboard") + f"""<meta http-equiv=refresh content=120></head><body><div class=w><h1>📊 Site Life · HSE Dashboard</h1>
{filter_form(rows, key, f)}
<div class=card><span class=pill>🎮 {total} games played</span><span class=pill>👥 {people} people</span><span class=pill>✅ {npass} passed</span><span class=pill>📈 {round(npass/total*100) if total else 0}% pass rate</span>
{''.join(f'<span class=pill>{e(game_label(g))}: {n}</span>' for g, n in by_game.most_common())}
<br><a class=pill href="{link('/hse', key=key, status='soon')}">⏳ Expiring within 30 days: {stat['soon']}</a><a class=pill href="{link('/hse', key=key, status='expired')}">⛔ Expired, refresher due: {stat['expired']}</a>
<p><a class=b href="{link('/hse/results.csv', key=key, **fq)}">⬇️ Download CSV (Excel, filtered)</a> <a class=b href="{link('/hse/class', key=key, **fq)}">👪 Class / family view</a></p></div>
<h2>Where people struggle</h2><div class=g3>
<div class=card><h3>Average time per zone</h3>{zones}</div>
<div class=card><h3>Most-missed hazards</h3>{ol(a['missed'])}</div>
<div class=card><h3>Most-missed questions</h3>{ol(a['wrong'])}<h3>Mistake areas</h3>{ol(a['where'], 8)}</div></div>
<div class=card><h3>Results (newest first)</h3>{more}<div class=s><table><tr><th>Received</th><th>Game</th><th>Name</th><th>Company</th><th>Role</th><th>Class</th><th>Result</th><th>Stars</th><th>Hazards</th><th>Mistakes</th><th>Mistake areas</th><th>Missed hazards</th><th></th></tr>
{''.join(trs) or '<tr><td colspan=13>No results match.</td></tr>'}</table></div></div>
<p class=muted>Refreshes every 2 minutes. Keep this link private: it contains your HSE key. Certificates are valid for {VALID_MONTHS} months.</p></div></body></html>"""


def person_page(rows, key, name, company=""):
    now = datetime.now()
    nm, co = name.strip().lower(), company.strip().lower()
    mine = [r for r in rows if nm and str(r.get("name", "")).strip().lower() == nm and (not co or str(r.get("company", "")).strip().lower() == co)]
    best = max((r for r in mine if passed(r)), key=lambda r: str(r.get("received", "")), default=None)
    latest = f"Latest certificate: <a href='/cert/{e(best['id'])}' target=_blank>{e(best.get('received', '')[:10])}</a>, valid until {expiry(best):%Y-%m-%d}{badge(best, now)}" if best and best.get("id") and expiry(best) else "No passing result yet."
    trs = "".join("<tr>" + "".join(f"<td>{c}</td>" for c in [
        e(str(r.get("received", ""))), e(game_label(r.get("game"))), e(str(r.get("company", ""))), e(str(r.get("class", ""))),
        e(str(r.get("result", ""))) + badge(r, now), e(str(r.get("stars", ""))), e(str(r.get("hazards", ""))), e(str(r.get("mistakes", ""))),
        e("; ".join(r.get("where") or [])), e("; ".join(r.get("missed") or [])),
        e(", ".join(f"{z} {s:.0f}s" for z, s in (r.get("zoneTimes") or {}).items() if isinstance(s, (int, float)))),
        f"<a href='/cert/{e(r['id'])}' target=_blank>Certificate</a>" if passed(r) and r.get("id") else ""]) + "</tr>" for r in reversed(mine))
    return head("Person history") + f"""</head><body><div class=w><p><a href="{link('/hse', key=key)}">← Dashboard</a></p>
<h1>👤 {e(name) or 'Person'}</h1><div class=card><span class=pill>🎮 {len(mine)} attempts</span><span class=pill>✅ {sum(1 for r in mine if passed(r))} passed</span><p>{latest}</p></div>
<div class=card><div class=s><table><tr><th>Received</th><th>Game</th><th>Company</th><th>Class</th><th>Result</th><th>Stars</th><th>Hazards</th><th>Mistakes</th><th>Mistake areas</th><th>Missed hazards</th><th>Time per zone</th><th></th></tr>
{trs or '<tr><td colspan=12>No results for this name.</td></tr>'}</table></div></div></div></body></html>"""


def class_page(rows, key, f):
    sel = [r for r in apply_filters(rows, f) if r.get("class")]
    groups = defaultdict(lambda: defaultdict(list))
    for r in sel:
        groups[str(r["class"]).upper()][str(r.get("name", "")).strip() or "?"].append(r)
    stars = lambda r: int(num(float(r["stars"])) or 0) if re.match(r"^\d+(\.\d+)?$", str(r.get("stars", ""))) else 0
    cards = []
    for cls in sorted(groups):
        kids = groups[cls]; cm = Counter()
        trs = []
        for kid in sorted(kids, key=str.lower):
            rs = kids[kid]
            mis = Counter(x for r in rs for x in (r.get("where") or []) + (r.get("missed") or []) + (r.get("wrong") or []))
            cm.update(mis)
            last = rs[-1]
            trs.append("<tr>" + "".join(f"<td>{c}</td>" for c in [
                f"<a href='{link('/hse/person', key=key, name=kid)}'>{e(kid)}</a>", str(len(rs)), "⭐" * min(max(stars(r) for r in rs), 10) or "0",
                str(sum(stars(r) for r in rs)), e(str(last.get("result", ""))) + f" <span class=muted>({e(game_label(last.get('game')))})</span>",
                e(", ".join(f"{k} ×{v}" for k, v in mis.most_common(3))) or "—"]) + "</tr>")
        cards.append(f"""<div class=card><h2>👪 {e(cls)}</h2><span class=pill>{len(kids)} children</span><span class=pill>{sum(len(v) for v in kids.values())} games</span>
<p><b>Most common mistakes in this group:</b> {e(', '.join(f'{k} ×{v}' for k, v in cm.most_common(5))) or 'none yet'}</p>
<div class=s><table><tr><th>Child</th><th>Games</th><th>Best stars</th><th>Total stars</th><th>Latest result</th><th>Most common mistakes</th></tr>{''.join(trs)}</table></div></div>""")
    return head("Class and family view") + f"""</head><body><div class=w><p><a href="{link('/hse', key=key)}">← Dashboard</a></p><h1>👪 Class / family view</h1>
<p class=muted>Kids results grouped by the class or family code in the game link, for example <code>kids.html?world=school&amp;class=JSS1A</code>.</p>
{filter_form(rows, key, f, '/hse/class')}{''.join(cards) or '<div class=card>No results with a class or family code yet.</div>'}</div></body></html>"""


def csv_export(rows):
    buf = io.StringIO(); w = csv.writer(buf); w.writerow(CSV_FIELDS)
    now = datetime.now()

    def val(r, k):
        v = r.get(k, "")
        if k == "zoneTimes":
            return "; ".join(f"{z}={s}" for z, s in (v or {}).items()) if isinstance(v, dict) else ""
        if k == "expires":
            x = expiry(r); return f"{x:%Y-%m-%d}" if x else ""
        if k == "status":
            return cert_status(r, now) or ""
        return "; ".join(map(str, v)) if isinstance(v, list) else str(v)

    for r in rows:
        w.writerow([csv_safe(val(r, k)) for k in CSV_FIELDS])
    return buf.getvalue()


def cert_page(r, rid):
    if not r:
        return 404, head("Certificate not found") + "</head><body><div class=w><div class=card><h1>Certificate not found</h1><p>Check the link.</p></div></div></body></html>"
    if not passed(r) or not expiry(r):
        return 200, head("No certificate") + "</head><body><div class=w><div class=card><h1>No certificate: not passed</h1><p>Play the training again to earn a certificate.</p></div></div></body></html>"
    exp, d = expiry(r), parse_ts(r.get("received"))
    company = f"<p class=sub>of <b>{e(str(r.get('company')))}</b></p>" if r.get("company") else ""
    rid_js = json.dumps(r["id"])
    return 200, f"""<!doctype html><html><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>Site Life Certificate</title>
<style>@page{{size:A4 portrait;margin:0}}*{{box-sizing:border-box}}
body{{margin:0;background:#e9e6df;color:#1d1f22;font:15px/1.5 Georgia,'Times New Roman',serif}}
.bar{{max-width:210mm;margin:12px auto;padding:0 16px;font-family:system-ui,sans-serif;display:flex;gap:8px;flex-wrap:wrap}}
.bar button{{background:#0f7a4f;color:#fff;border:0;border-radius:10px;padding:10px 14px;font:inherit;cursor:pointer}}
.page{{width:210mm;max-width:100%;min-height:297mm;margin:0 auto 24px;background:#fff;padding:14mm;box-shadow:0 2px 12px rgba(0,0,0,.15)}}
.frame{{border:3px double #0f7a4f;min-height:269mm;padding:16mm 14mm;text-align:center;display:flex;flex-direction:column;align-items:center}}
.brand{{font:600 14px system-ui,sans-serif;letter-spacing:.2em;color:#0f7a4f;text-transform:uppercase}}
h1{{font-size:34px;margin:10mm 0 4mm;font-weight:normal}}.name{{font-size:30px;font-weight:bold;margin:6mm 0 2mm;border-bottom:1px solid #999;padding:0 10mm 2mm}}
.sub{{margin:2mm 0;font-size:17px}}.res{{font-size:22px;color:#0f7a4f;font-weight:bold;margin:6mm 0}}
.meta{{display:flex;gap:16mm;justify-content:center;margin:6mm 0;font-family:system-ui,sans-serif}}.meta div{{text-align:center}}.meta b{{display:block;font-size:17px}}
#qr{{margin:8mm auto 3mm;width:128px;height:128px}}#qr img,#qr canvas{{width:128px;height:128px}}.vu{{font:12px monospace;word-break:break-all;color:#333}}
.foot{{margin-top:auto;font:12px system-ui,sans-serif;color:#555}}
@media print{{body{{background:#fff}}.bar{{display:none}}.page{{box-shadow:none;margin:0;width:210mm;height:297mm;min-height:0;overflow:hidden;page-break-after:avoid}}.frame{{min-height:0;height:269mm}}}}</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script></head>
<body><div class=bar><button onclick="print()">🖨️ Print or save as PDF</button></div>
<div class=page><div class=frame><div class=brand>Site Life · Safety Training</div><h1>Certificate of Completion</h1>
<p class=sub>This certifies that</p><div class=name>{e(str(r.get('name') or 'Participant'))}</div>{company}
<p class=sub>has completed</p><p class=sub><b>{e(game_label(r.get('game')))}</b></p><div class=res>Result: {e(str(r.get('result')))}</div>
<div class=meta><div>Date<b>{d:%d %b %Y}</b></div><div>Valid until<b>{exp:%d %b %Y}</b></div></div>
<div id=qr></div><div>Scan or visit to verify:</div><div class=vu id=vu>/verify/{e(r['id'])}</div>
<div class=foot>Certificate ID {e(r['id'])}. A certificate is only valid if the verify page shows VALID.</div></div></div>
<script>(function(){{var u=location.origin+"/verify/"+{rid_js};document.getElementById("vu").textContent=u;
try{{new QRCode(document.getElementById("qr"),{{text:u,width:128,height:128,correctLevel:QRCode.CorrectLevel.M}});}}catch(err){{document.getElementById("qr").style.display="none";}}}})();</script>
</body></html>"""


def verify_page(r):
    body = lambda col, word, inner: head("Verify certificate") + f"""</head><body><div class=w><div class=card style="border-top:8px solid {col};text-align:center">
<h1 style="color:{col};font-size:44px;margin:8px 0">{word}</h1>{inner}</div><p class=muted style="text-align:center">Site Life certificate check</p></div></body></html>"""
    if not r or not expiry(r):
        return 404, body("var(--muted)", "NOT FOUND", "<p>No valid certificate has this ID. Check the link or QR code.</p>")
    exp, d, expired = expiry(r), parse_ts(r.get("received")), cert_status(r) == "expired"
    info = "".join(f"<tr><th>{k}</th><td>{e(str(v))}</td></tr>" for k, v in [
        ("Name", r.get("name") or ""), ("Company", r.get("company") or ""), ("Training", game_label(r.get("game"))),
        ("Result", r.get("result")), ("Date", f"{d:%d %b %Y}"), ("Valid until", f"{exp:%d %b %Y}")])
    return 200, body("var(--bad)" if expired else "var(--ok)", "EXPIRED" if expired else "VALID",
                     f"<p>{'This certificate has expired. A refresher is due.' if expired else 'This certificate is genuine and in date.'}</p><table style='max-width:420px;margin:0 auto'>{info}</table>")


def trainer_page(code):
    if not code:
        return head("Trainer room") + """</head><body><div class=w><div class=card><h1>🧑‍🏫 Trainer room</h1>
<p>Run a live induction: trainees join your room and you can trigger events for everyone.</p>
<form method=get action=/trainer><label>Room code (4–8 letters or numbers)</label><input name=room pattern="[A-Za-z0-9]{4,8}" required style="text-transform:uppercase">
<p><button>Open room</button> <button type=button onclick="var c='';for(var i=0;i<5;i++)c+='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random()*32)];location.search='?room='+c">New random room</button></p></form></div></div></body></html>"""
    cj = json.dumps(code)
    return head(f"Trainer room {code}") + f"""</head><body><div class=w><h1>🧑‍🏫 Trainer room <span id=code>{e(code)}</span></h1>
<div class=card><p>Send this link to trainees:</p><p><input id=share readonly onclick="this.select()"></p><p class=muted>Kids games: <span id=kshare></span></p><p class=muted>Warehouse Shift: <span id=wshare></span></p>
<label>Your name (shown to trainees)</label><input id=tname value="Trainer" maxlength=40></div>
<div class=card><h3>Trigger an event for everyone</h3><p>
<button data-ev=fire_alarm>🔥 Fire alarm</button> <button data-ev=nepa>💡 NEPA (power cut)</button> <button data-ev=spill>🛢️ Spill</button> <button data-ev=rain>🌧️ Rain</button> <button data-ev=end style="background:var(--bad)">⏹️ End session</button></p><p id=msg class=muted></p></div>
<div class=card><h3>Players (<span id=count>0</span>)</h3><div class=s><table><thead><tr><th>Name</th><th>Role</th><th>Game</th><th>Zone</th><th>Score</th><th>Last seen</th></tr></thead><tbody id=pl></tbody></table></div></div>
<div class=card><h3>Event log</h3><ul id=log></ul></div></div>
<script>(function(){{
var ROOM={cj}, pid=null, since=0, seen={{}};
try{{pid=localStorage.getItem("sl_trainer_pid");}}catch(e){{}}
if(!pid){{pid="t"+Math.random().toString(36).slice(2)+Date.now().toString(36);try{{localStorage.setItem("sl_trainer_pid",pid);}}catch(e){{}}}}
var base=location.origin+location.pathname.replace(/trainer\\/?$/,"");
document.getElementById("share").value=base+"index.html?room="+ROOM;
document.getElementById("kshare").textContent=base+"kids.html?world=school&room="+ROOM;
document.getElementById("wshare").textContent=base+"warehouse.html?room="+ROOM;
function msg(t){{document.getElementById("msg").textContent=t;}}
function post(path,body){{return fetch("/api/room/"+ROOM+"/"+path,{{method:"POST",headers:{{"Content-Type":"application/json"}},body:JSON.stringify(body)}}).then(function(r){{return r.json();}});}}
function hello(){{return post("state",{{pid:pid,name:document.getElementById("tname").value||"Trainer",role:"trainer",x:0,y:0,yaw:0,game:"trainer",zone:"",score:0}}).catch(function(){{}});}}
function cell(tr,t){{var td=document.createElement("td");td.textContent=t;tr.appendChild(td);}}
function poll(){{fetch("/api/room/"+ROOM+"?since="+since).then(function(r){{return r.json();}}).then(function(d){{
  var tb=document.getElementById("pl");tb.textContent="";
  d.players.sort(function(a,b){{return (b.role==="trainer")-(a.role==="trainer")||String(a.name).localeCompare(b.name);}}).forEach(function(p){{
    var tr=document.createElement("tr");[p.name,p.role,p.game,p.zone,p.score,Math.round((d.now-p.t)/1000)+" s ago"].forEach(function(t){{cell(tr,t);}});tb.appendChild(tr);}});
  document.getElementById("count").textContent=d.players.length;
  d.events.forEach(function(ev){{if(seen[ev.id])return;seen[ev.id]=1;var li=document.createElement("li");
    li.textContent=new Date(ev.at).toLocaleTimeString()+"  "+ev.type+"  (by "+ev.by+")";document.getElementById("log").prepend(li);}});
  since=d.now;}}).catch(function(){{}});}}
document.querySelectorAll("[data-ev]").forEach(function(b){{b.onclick=function(){{
  var t=b.getAttribute("data-ev");if(t==="end"&&!confirm("End the session for everyone?"))return;
  hello().then(function(){{return post("event",{{pid:pid,type:t}});}}).then(function(r){{msg(r&&r.ok?"Sent: "+t:"Could not send: "+(r&&r.error||"error"));poll();}}).catch(function(){{msg("No connection");}});}};}});
hello();poll();setInterval(hello,3000);setInterval(poll,1500);
}})();</script></body></html>"""


if __name__ == "__main__":
    if not HSE_KEY:
        print("WARNING: HSE_KEY is not set, so the dashboard is disabled. Set HSE_KEY=yourSecret.")
    print(f"Serving {GAME_DIR} on http://{HOST}:{PORT}  (dashboard: /hse?key=...  trainer: /trainer)")
    purge()
    threading.Thread(target=purge_loop, daemon=True).start()
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
