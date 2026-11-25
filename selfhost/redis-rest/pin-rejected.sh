#!/bin/bash
# EMON (nvii, 2026-11-20): pins the app's own Lua scripts that the Redis REST helper refused.
# The helper only runs scripts on its fixed list; this image's server and relay use a few that are not on it.
# Reads the refused scripts from the helper's log ([nvii-reject-log] lines), adds them to nvii-eval-allow.json and
# restarts the helper if anything new was found. Usage: bash selfhost/redis-rest/pin-rejected.sh [since, default 30m]
cd "$(dirname "$0")" || exit 1
docker logs --since "${1:-30m}" worldmonitor-redis-rest 2>&1 | grep 'nvii-reject-log' | sed 's/^\[nvii-reject-log\] //' | sort -u > .rejected.tmp
python3 - .rejected.tmp <<'PY'
import json,sys
p='nvii-eval-allow.json'
d=json.load(open(p)); n0=len(d)
for line in open(sys.argv[1]):
    line=line.strip()
    if not line: continue
    try: s=json.loads(line)
    except ValueError: continue
    if isinstance(s,str) and len(s) < 60000 and s not in d:
        d.append(s); print('new:', s.strip().split('\n')[0][:70])
with open(p,'r+') as f:
    f.write(json.dumps(d)); f.truncate()
print('pinned', n0, '->', len(d))
sys.exit(0 if len(d)>n0 else 3)
PY
rc=$?
unlink .rejected.tmp
[ $rc -eq 0 ] && docker restart worldmonitor-redis-rest >/dev/null && echo restarted
exit 0
