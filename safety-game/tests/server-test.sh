#!/bin/bash
# Checks the results server: pages, key protection, hidden files, result storage, CSV, HTML escaping,
# certificates (/cert, /verify) and the trainer room (/trainer, /api/room). Python unit tests: tests/test_server.py.
# Usage (from safety-game/): bash tests/server-test.sh
set -u
cd "$(dirname "$0")/.."
TMP="$(mktemp -d)"; PORT=8097; BASE="http://localhost:$PORT"; FAIL=0
echo '{"received": "2000-01-01 00:00:00", "game": "factory", "name": "Old Record", "result": "PASS"}' > "$TMP/results.jsonl"
HSE_KEY=testkey PORT=$PORT DATA_DIR="$TMP" RETENTION_DAYS=30 python3 server/sitelife_server.py >"$TMP/log" 2>&1 &
PID=$!; trap 'kill $PID 2>/dev/null; rm -rf "$TMP"' EXIT; sleep 1.5
check(){ local code; code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE$2"); if [ "$code" = "$1" ]; then echo "ok   $1 $2"; else echo "FAIL $2 expected $1 got $code"; FAIL=1; fi; }
has(){ if curl -s "$BASE$1" | grep -q -- "$2"; then echo "ok   $1 contains $2"; else echo "FAIL $1 should contain $2"; FAIL=1; fi; }
check 200 "/"; check 200 "/kids.html?world=home"; check 403 "/hse"; check 403 "/hse?key=wrong"; check 200 "/hse?key=testkey"
check 404 "/server/sitelife_server.py"; check 404 "/src/build.py"; check 404 "/START-SERVER.bat"; check 404 "/hse-key.txt"; check 404 "/%73erver/sitelife_server.py"
RES=$(curl -s -X POST -H 'Content-Type: application/json' -d '{"game":"school","name":"<b>Ada</b>","company":"=CMD()","result":"GOLD","hazards":"5/5","mistakes":0,"where":["Lab"],"class":"JSS1A","zoneTimes":{"Lab":30},"missed":["Wet floor"]}' "$BASE/api/result")
echo "$RES" | grep -q '"ok":true' && echo "ok   POST /api/result" || { echo "FAIL POST"; FAIL=1; }
ID=$(echo "$RES" | sed -n 's/.*"id":"\([A-Za-z0-9]*\)".*/\1/p')
[ -n "$ID" ] && echo "ok   result id $ID" || { echo "FAIL no id in $RES"; FAIL=1; ID=none; }
curl -s "$BASE/hse?key=testkey" | grep -q '&lt;b&gt;Ada' && echo "ok   dashboard escapes HTML" || { echo "FAIL escaping"; FAIL=1; }
curl -s "$BASE/hse/results.csv?key=testkey" | grep -q "'=CMD()" && echo "ok   CSV formula guard" || { echo "FAIL csv guard"; FAIL=1; }
grep -q "Old Record" "$TMP/results.jsonl" && { echo "FAIL retention kept old record"; FAIL=1; } || echo "ok   retention deleted old record"
check 400 "/api/room/bad"; check 404 "/cert/nosuchid12"; check 404 "/verify/nosuchid12"
check 200 "/cert/$ID"; has "/cert/$ID" "qrcode.min.js"; has "/cert/$ID" "/verify/$ID"
check 200 "/verify/$ID"; has "/verify/$ID" ">VALID<"
check 200 "/trainer"; check 200 "/trainer?room=ABCD"; has "/trainer?room=ABCD" "index.html?room="
check 200 "/hse/class?key=testkey"; has "/hse/class?key=testkey" "JSS1A"
curl -s -X POST -d '{"pid":"trainer-1","name":"T","role":"trainer"}' "$BASE/api/room/ABCD/state" >/dev/null
curl -s -X POST -d '{"pid":"trainee-1","name":"P","role":"trainee"}' "$BASE/api/room/ABCD/state" >/dev/null
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -d '{"pid":"trainee-1","type":"nepa"}' "$BASE/api/room/ABCD/event")
[ "$code" = 403 ] && echo "ok   trainee cannot trigger events" || { echo "FAIL trainee event got $code"; FAIL=1; }
curl -s -X POST -d '{"pid":"trainer-1","type":"nepa"}' "$BASE/api/room/ABCD/event" | grep -q '"ok":true' && echo "ok   trainer triggers event" || { echo "FAIL trainer event"; FAIL=1; }
has "/api/room/ABCD?since=0" '"type":"nepa"'
[ $FAIL = 0 ] && echo "SERVER TESTS PASSED" || { echo "SERVER TESTS FAILED"; exit 1; }
