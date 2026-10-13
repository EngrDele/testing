"""Tests for server/sitelife_server.py (standard library only).

Usage (from safety-game/):  python3 -m unittest tests/test_server.py -v
Starts the server in a subprocess on a free port with a temporary DATA_DIR seeded with 2,000+ rows.
"""
import csv, io, json, os, random, re, shutil, socket, subprocess, sys, tempfile, time, unittest
import http.client
from datetime import datetime, timedelta
from urllib.parse import quote, urlencode

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SERVER = os.path.join(ROOT, "server", "sitelife_server.py")
KEY = "unit-test-key"
TS = "%Y-%m-%d %H:%M:%S"


def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def ts(days_ago):
    return (datetime.now() - timedelta(days=days_ago)).strftime(TS)


class ServerTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.mkdtemp(prefix="sitelife-test-")
        rnd = random.Random(7)
        rows = []
        games = ["factory", "factory-advanced", "home", "school", "market"]
        for i in range(2000):
            g = rnd.choice(games)
            kid = g in ("home", "school", "market")
            rows.append({"id": f"gen{i:07d}", "received": ts(rnd.randint(40, 300)), "game": g, "name": f"Worker {i}",
                         "company": f"Company {i % 25}", "role": "Pupil" if kid else "Operator", "class": f"JSS{i % 3 + 1}A" if kid else "",
                         "result": rnd.choice(["GOLD", "SILVER", "TRY AGAIN"] if kid else ["PASS", "REPLAY"]), "hazards": "3/5",
                         "mistakes": "1", "stars": str(rnd.randint(0, 5)) if kid else "", "where": [rnd.choice(["Kitchen", "Road", "Gate"])],
                         "missed": [rnd.choice(["Wet floor", "Open socket", "Oil drum"])], "wrong": [rnd.choice(["Q1 PPE", "Q2 Forklift"])],
                         "zoneTimes": {"Gate": rnd.randint(5, 30), "Warehouse": rnd.randint(20, 90)}})
        rows += [
            {"id": "VALIDcert1", "received": ts(10), "game": "factory", "name": "Ngozi Valid", "company": "Acme Ikeja", "role": "SECRETROLE",
             "class": "", "result": "PASS", "hazards": "5/5", "mistakes": "0", "where": [], "missed": [], "zoneTimes": {}},
            {"id": "SOONcert01", "received": ts(350), "game": "factory", "name": "Tunde Soon", "company": "Acme Ikeja", "result": "PASS"},
            {"id": "EXPIRED001", "received": ts(400), "game": "school", "name": "Bola Expired", "company": "Oldco", "result": "GOLD"},
            {"id": "FAILED0001", "received": ts(5), "game": "factory", "name": "Musa Failed", "company": "Acme Ikeja", "result": "REPLAY"},
            {"received": ts(3), "game": "factory", "name": "Legacy NoId", "result": "PASS"},
        ]
        with open(os.path.join(cls.tmp, "results.jsonl"), "w", encoding="utf8") as f:
            for r in rows:
                f.write(json.dumps(r) + "\n")
        cls.port = free_port()
        env = dict(os.environ, HSE_KEY=KEY, PORT=str(cls.port), HOST="127.0.0.1", DATA_DIR=cls.tmp, RETENTION_DAYS="0", VALID_MONTHS="12")
        cls.proc = subprocess.Popen([sys.executable, SERVER], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        for _ in range(100):
            try:
                if cls.req("GET", "/api/health")[0] == 200:
                    break
            except OSError:
                time.sleep(0.1)
        else:
            raise RuntimeError("server did not start: " + cls.proc.stderr.read().decode())

    @classmethod
    def tearDownClass(cls):
        cls.proc.terminate()
        cls.proc.wait(5)
        cls.proc.stderr.close()
        shutil.rmtree(cls.tmp, ignore_errors=True)

    @classmethod
    def req(cls, method, path, body=None, ip="10.0.0.1", headers=None):
        c = http.client.HTTPConnection("127.0.0.1", cls.port, timeout=10)
        h = {"X-Forwarded-For": ip}
        h.update(headers or {})
        if isinstance(body, (dict, list)):
            body = json.dumps(body)
        if isinstance(body, str):
            body = body.encode("utf8")
        if body is not None:
            h.setdefault("Content-Type", "application/json")
        c.request(method, path, body=body, headers=h)
        r = c.getresponse()
        data = r.read().decode("utf8", "replace")
        c.close()
        return r.status, data

    def post(self, path, body, ip="10.0.0.1"):
        st, data = self.req("POST", path, body, ip)
        try:
            return st, json.loads(data)
        except ValueError:
            return st, data

    def get(self, path, ip="10.0.0.2"):
        return self.req("GET", path, ip=ip)

    def hse(self, path="/hse", **params):
        return self.get(path + "?" + urlencode(dict(key=KEY, **params)))

    def csv_rows(self, **params):
        st, data = self.hse("/hse/results.csv", **params)
        self.assertEqual(st, 200)
        return list(csv.DictReader(io.StringIO(data)))

    # ------------------------------------------------------------ results API
    def test_post_returns_id_and_stores_new_fields(self):
        st, d = self.post("/api/result", {"game": "school", "name": "Ada Obi", "company": "Corona School", "result": "GOLD", "stars": 5,
                                          "class": "JSS1B", "course": "Kids safety week", "room": "abcd12", "lang": "pcm",
                                          "zoneTimes": {"Gate": 12.34, "Lab": 40}, "missed": ["Wet floor"], "wrong": ["Q3 Fire exit"]}, ip="10.1.0.1")
        self.assertEqual(st, 200)
        self.assertTrue(d["ok"])
        self.assertRegex(d["id"], r"^[A-Za-z0-9]{10}$")
        rows = [r for r in self.csv_rows(name="Ada Obi") if r["id"] == d["id"]]
        self.assertEqual(len(rows), 1)
        r = rows[0]
        self.assertEqual((r["class"], r["course"], r["room"], r["missed"], r["wrong"], r["lang"]), ("JSS1B", "Kids safety week", "ABCD12", "Wet floor", "Q3 Fire exit", "pcm"))
        self.assertEqual(r["zoneTimes"], "Gate=12.3; Lab=40")
        self.assertRegex(r["received"], r"^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$")
        st, d2 = self.post("/api/result", {"name": "Ada Obi", "result": "PASS"}, ip="10.1.0.1")
        self.assertNotEqual(d["id"], d2["id"])

    def test_validation_and_truncation(self):
        body = {"name": "N" * 300, "company": "C" * 300, "class": "K" * 100, "game": "g" * 100, "result": "PASS\nINJECT",
                "zoneTimes": dict({f"z{i}": i for i in range(60)}, bad="x", neg=-5, flag=True, inf=1e999),
                "missed": [f"h{i}" for i in range(60)] + [{"x": 1}], "where": ["ok", 5, None, ["nested"]], "room": "bad!", "stars": {"a": 1}}
        st, d = self.post("/api/result", json.dumps(body).replace("Infinity", "1e999"), ip="10.1.0.2")
        self.assertEqual(st, 200, d)
        r = [x for x in self.csv_rows(name="NNNN") if x["id"] == d["id"]][0]
        self.assertEqual(len(r["name"]), 60)
        self.assertEqual(len(r["company"]), 80)
        self.assertEqual(len(r["class"]), 40)
        self.assertEqual(len(r["game"]), 30)
        self.assertEqual(r["result"], "PASS INJECT")
        zones = dict(p.split("=") for p in r["zoneTimes"].split("; "))
        self.assertLessEqual(len(zones), 40)
        self.assertNotIn("bad", zones); self.assertNotIn("flag", zones)
        self.assertEqual(zones.get("neg"), None)  # 'neg' is past the 40-key cap here; clamping is tested below
        self.assertEqual(len(r["missed"].split("; ")), 40)
        self.assertEqual(r["where"], "ok; 5")
        self.assertEqual(r["room"], "")
        self.assertEqual(r["stars"], "")
        st, d = self.post("/api/result", {"name": "Clampy", "zoneTimes": {"a": -5, "b": 999999, "c": "7"}, "missed": "notalist"}, ip="10.1.0.2")
        r = [x for x in self.csv_rows(name="Clampy") if x["id"] == d["id"]][0]
        self.assertEqual(r["zoneTimes"], "a=0; b=86400")
        self.assertEqual(r["missed"], "")

    def test_bad_json_and_shapes(self):
        for body in ("not json", "[1,2,3]", '"text"', "\xff"):
            st, _ = self.post("/api/result", body, ip="10.1.0.3")
            self.assertEqual(st, 400, body)
        st, _ = self.req("POST", "/api/result", None, ip="10.1.0.3", headers={"Content-Length": "0"})
        self.assertEqual(st, 400)

    def test_oversize_body(self):
        st, _ = self.post("/api/result", {"name": "x" * 40000}, ip="10.1.0.4")
        self.assertEqual(st, 413)

    def test_rate_limit(self):
        codes = [self.post("/api/result", {"name": "Spam"}, ip="10.9.9.9")[0] for _ in range(25)]
        self.assertIn(429, codes)
        self.assertEqual(codes[0], 200)
        self.assertEqual(self.post("/api/result", {"name": "Other"}, ip="10.9.9.10")[0], 200)  # other clients unaffected

    def test_unknown_post(self):
        self.assertEqual(self.post("/api/nothing", {}, ip="10.1.0.5")[0], 404)

    # ------------------------------------------------------------ security
    def test_hidden_paths_and_key(self):
        for p in ("/server/sitelife_server.py", "/%73erver/sitelife_server.py", "//server/sitelife_server.py", "/./src/build.py",
                  "/src/build.py", "/START-SERVER.bat", "/hse-key.txt", "/.git/config", "/server/data/results.jsonl", "/deploy/google-sheets/Code.gs"):
            self.assertEqual(self.get(p)[0], 404, p)
            self.assertEqual(self.req("HEAD", p)[0], 404, p)
        self.assertEqual(self.get("/hse")[0], 403)
        self.assertEqual(self.get("/hse?key=wrong")[0], 403)
        self.assertEqual(self.get("/hse/person?key=wrong&name=x")[0], 403)
        self.assertEqual(self.get("/hse/class?key=wrong")[0], 403)
        self.assertEqual(self.get("/hse/results.csv?key=wrong")[0], 403)

    def test_html_escaping_and_csv_guard(self):
        st, d = self.post("/api/result", {"name": "<script>alert(1)</script>", "company": "=HYPERLINK(1)", "result": "PASS"}, ip="10.1.0.6")
        self.assertEqual(st, 200)
        for path in ("/hse", "/hse/person"):
            st, page = self.hse(path, name="<script>alert(1)</script>")
            self.assertNotIn("<script>alert(1)</script>", page)
            self.assertIn("&lt;script&gt;alert(1)", page)
        st, page = self.get(f"/cert/{d['id']}")
        self.assertNotIn("<script>alert(1)</script>", page)
        rows = self.csv_rows(name="script")
        self.assertTrue(all(r["company"].startswith("'=") for r in rows if "HYPERLINK" in r["company"]))

    # ------------------------------------------------------------ dashboard
    def test_dashboard_fast_with_2000_rows(self):
        t = time.time()
        st, page = self.hse()
        self.assertEqual(st, 200)
        self.assertLess(time.time() - t, 2.0)
        self.assertIn("Showing the newest 500", page)
        self.assertIn("Average time per zone", page)
        self.assertIn("Warehouse", page)
        self.assertIn("Most-missed hazards", page)
        self.assertIn("Wet floor", page)
        self.assertIn("Q2 Forklift", page)
        t = time.time()
        for params in ({"company": "Company 3"}, {"game": "school", "result": "GOLD"}, {"name": "worker 1", "from": "2000-01-01"}):
            self.assertEqual(self.hse(**params)[0], 200)
        self.assertLess(time.time() - t, 3.0)

    def test_filters(self):
        rows = self.csv_rows(company="company 3")
        self.assertTrue(rows)
        self.assertTrue(all(r["company"] == "Company 3" for r in rows))
        rows = self.csv_rows(game="school", result="GOLD")
        self.assertTrue(rows and all(r["game"] == "school" and r["result"] == "GOLD" for r in rows))
        rows = self.csv_rows(result="PASS*")
        self.assertTrue(rows and all(r["result"] in ("PASS", "GOLD", "SILVER", "BRONZE") for r in rows))
        rows = self.csv_rows(result="FAIL*")
        self.assertTrue(rows and all(r["result"] not in ("PASS", "GOLD", "SILVER", "BRONZE") for r in rows))
        rows = self.csv_rows(**{"class": "jss2a"})
        self.assertTrue(rows and all(r["class"] == "JSS2A" for r in rows))
        rows = self.csv_rows(name="ngozi")
        self.assertEqual([r["id"] for r in rows], ["VALIDcert1"])
        day = (datetime.now() - timedelta(days=100)).strftime("%Y-%m-%d")
        rows = self.csv_rows(**{"from": day, "to": day})
        self.assertTrue(all(r["received"].startswith(day) for r in rows))
        self.assertEqual(len(self.csv_rows(**{"from": "2999-01-01"})), 0)
        self.assertGreater(len(self.csv_rows(**{"from": "not-a-date"})), 2000)  # bad dates are ignored
        st, page = self.hse(company="Company 3")
        self.assertIn("Company 3", page)
        self.assertNotIn(">Company 4<", page)

    def test_expiry_badges_and_filter(self):
        self.assertEqual([r["id"] for r in self.csv_rows(status="expired")], ["EXPIRED001"])
        self.assertEqual([r["id"] for r in self.csv_rows(status="soon")], ["SOONcert01"])
        self.assertIn("VALIDcert1", [r["id"] for r in self.csv_rows(status="valid")])
        st, page = self.hse(name="Bola")
        self.assertIn("b-expired", page)
        st, page = self.hse(name="Tunde")
        self.assertIn("expires soon", page)
        st, page = self.hse()
        self.assertIn("Expiring within 30 days: 1<", page)

    def test_person_history(self):
        self.post("/api/result", {"name": "Chidi Repeat", "company": "Acme", "result": "REPLAY"}, ip="10.1.0.7")
        self.post("/api/result", {"name": "chidi repeat", "company": "Acme", "result": "PASS"}, ip="10.1.0.7")
        st, page = self.hse("/hse/person", name="Chidi Repeat")
        self.assertEqual(st, 200)
        self.assertIn("2 attempts", page)
        self.assertIn("1 passed", page)
        self.assertIn("/cert/", page)
        st, page = self.hse("/hse/person", name="Nobody Here")
        self.assertIn("No results for this name", page)

    def test_class_view(self):
        self.post("/api/result", {"game": "home", "name": "Kemi", "class": "PRY4C", "result": "SILVER", "stars": 4, "where": ["Road"], "missed": ["Hot iron"]}, ip="10.1.0.8")
        self.post("/api/result", {"game": "school", "name": "Kemi", "class": "pry4c", "result": "GOLD", "stars": 5, "where": ["Road"]}, ip="10.1.0.8")
        st, page = self.hse("/hse/class", **{"class": "PRY4C"})
        self.assertEqual(st, 200)
        self.assertIn("PRY4C", page)
        self.assertIn("⭐⭐⭐⭐⭐", page)
        self.assertIn("Road ×2", page)
        self.assertIn("Hot iron", page)
        self.assertNotIn("JSS1A", page.split("</form>", 1)[1])

    # ------------------------------------------------------------ certificates
    def test_certificate(self):
        st, page = self.get("/cert/VALIDcert1")
        self.assertEqual(st, 200)
        for s in ("Ngozi Valid", "Acme Ikeja", "PASS", "Valid until", "@page", "A4", "qrcodejs/1.0.0/qrcode.min.js", "/verify/VALIDcert1"):
            self.assertIn(s, page)
        self.assertNotIn("SECRETROLE", page)  # no other personal data
        self.assertNotIn("5/5", page)
        st, page = self.get("/cert/FAILED0001")
        self.assertEqual(st, 200)
        self.assertIn("No certificate: not passed", page)
        self.assertNotIn("Musa", page)
        self.assertEqual(self.get("/cert/doesNotExist")[0], 404)
        self.assertEqual(self.get("/cert/%3Cscript%3E")[0], 404)

    def test_verify(self):
        st, page = self.get("/verify/VALIDcert1")
        self.assertEqual(st, 200)
        self.assertIn(">VALID<", page)
        self.assertNotIn("SECRETROLE", page)
        st, page = self.get("/verify/EXPIRED001")
        self.assertEqual(st, 200)
        self.assertIn(">EXPIRED<", page)
        st, page = self.get("/verify/nope123456")
        self.assertEqual(st, 404)
        self.assertIn("NOT FOUND", page)
        self.assertEqual(self.get("/verify/FAILED0001")[0], 404)

    def test_legacy_rows_get_ids(self):
        rows = self.csv_rows(name="Legacy NoId")
        self.assertEqual(len(rows), 1)
        self.assertRegex(rows[0]["id"], r"^[A-Za-z0-9]{10}$")
        self.assertEqual(self.get("/verify/" + rows[0]["id"])[0], 200)

    # ------------------------------------------------------------ rooms
    def state(self, room, pid, role="trainee", ip="10.2.0.1", **kw):
        return self.post(f"/api/room/{room}/state", dict({"pid": pid, "name": pid.upper(), "role": role, "x": 100, "y": 200, "yaw": 1.5,
                                                          "game": "factory", "zone": "Gate", "score": 3}, **kw), ip=ip)

    def test_room_state_poll_event(self):
        st, d = self.state("ROOM1", "trainee-1")
        self.assertEqual(st, 200)
        self.assertRegex(d["id"], r"^[0-9a-f]{10}$")
        st, t = self.state("ROOM1", "trainer-1", role="trainer", zone="")
        self.assertEqual(st, 200)
        st, page = self.get("/api/room/ROOM1?since=0")
        self.assertEqual(st, 200)
        poll = json.loads(page)
        self.assertEqual(sorted(p["name"] for p in poll["players"]), ["TRAINEE-1", "TRAINER-1"])
        self.assertNotIn("trainer-1", page)  # private pids never leak
        p = [p for p in poll["players"] if p["name"] == "TRAINEE-1"][0]
        self.assertEqual((p["x"], p["y"], p["yaw"], p["zone"], p["score"], p["role"], p["id"]), (100, 200, 1.5, "Gate", 3, "trainee", d["id"]))
        self.assertIsInstance(poll["now"], int)
        since = poll["now"]
        self.assertEqual(self.post("/api/room/ROOM1/event", {"pid": "trainee-1", "type": "fire_alarm"})[0], 403)
        self.assertEqual(self.post("/api/room/ROOM1/event", {"pid": "stranger-9", "type": "fire_alarm"})[0], 403)
        self.assertEqual(self.post("/api/room/ROOM1/event", {"pid": "trainer-1", "type": "explode"})[0], 400)
        st, ev = self.post("/api/room/ROOM1/event", {"pid": "trainer-1", "type": "fire_alarm"})
        self.assertEqual(st, 200)
        self.assertEqual(ev["event"]["type"], "fire_alarm")
        events = json.loads(self.get(f"/api/room/ROOM1?since={since}")[1])["events"]
        self.assertEqual([(e["type"], e["by"]) for e in events], [("fire_alarm", "TRAINER-1")])
        self.assertEqual(set(events[0]), {"id", "type", "by", "at"})
        later = json.loads(self.get(f"/api/room/ROOM1?since={events[0]['at'] + 1}")[1])["events"]
        self.assertEqual(later, [])
        empty = json.loads(self.get("/api/room/NEWROOM?since=0")[1])
        self.assertEqual((empty["players"], empty["events"]), ([], []))

    def test_room_validation(self):
        self.assertEqual(self.post("/api/room/ab/state", {"pid": "abcd"})[0], 400)
        self.assertEqual(self.post("/api/room/lower1/state", {"pid": "abcd"})[0], 400)
        self.assertEqual(self.get("/api/room/TOOLONGCODE")[0], 400)
        self.assertEqual(self.post("/api/room/ROOM2/state", {"pid": "x"})[0], 400)
        self.assertEqual(self.post("/api/room/ROOM2/state", "nope")[0], 400)
        self.assertEqual(self.post("/api/room/ROOM2/state", {"pid": "abcd", "name": "x" * 5000})[0], 413)
        st, d = self.state("ROOM2", "weird-1", role="admin", x="NaN", name="<b>x</b>")
        p = json.loads(self.get("/api/room/ROOM2")[1])["players"][0]
        self.assertEqual((p["role"], p["x"], p["name"]), ("trainee", 0, "<b>x</b>"))  # trainer page renders names with textContent

    def test_room_full(self):
        for i in range(30):
            self.assertEqual(self.state("FULL1", f"player-{i:02d}", ip=f"10.3.0.{i}")[0], 200)
        self.assertEqual(self.state("FULL1", "player-31", ip="10.3.1.1")[0], 409)
        self.assertEqual(self.state("FULL1", "player-05", ip="10.3.0.5")[0], 200)  # existing players keep updating

    def test_room_rate_limit_allows_normal_play(self):
        for _ in range(6):  # ~2 updates per second for 3 seconds, compressed: never blocked
            self.assertEqual(self.state("RATE1", "steady-1", ip="10.4.0.1")[0], 200)
            self.assertEqual(self.get("/api/room/RATE1?since=0", ip="10.4.0.1")[0], 200)
        codes = [self.state("RATE1", "flood-1", ip="10.4.0.2")[0] for _ in range(40)]
        self.assertIn(429, codes)

    def test_trainer_page(self):
        st, page = self.get("/trainer?room=abcd12")
        self.assertEqual(st, 200)
        self.assertIn('"ABCD12"', page)
        self.assertIn("index.html?room=", page)
        for ev in ("fire_alarm", "nepa", "spill", "rain", "end"):
            self.assertIn(f"data-ev={ev}", page)
        st, page = self.get("/trainer?room=%22%3E%3Cscript%3E")
        self.assertEqual(st, 200)
        self.assertNotIn("<script>alert", page)
        self.assertIn("New random room", page)


if __name__ == "__main__":
    unittest.main()
