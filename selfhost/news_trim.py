"""Her correction 2026-11-19: Live News gets only the channels that actually do news, not all 28 subscriptions.
Rewrites the channel block in selfhost-channels.js in place (same inode); v2 also takes the dropped ones
back out of browsers that already got v1."""
import re, sys
p = sys.argv[1]
s = open(p).read()
m = re.search(r"    var ADD = (\[\[.*?\]\]);\n", s)
assert m
import json
allc = json.loads(m.group(1))
KEEP = {"PBS NewsHour", "Channel 5", "CHUPPL", "Zeteo", "Yoonj Kim", "Erin In The Morning", "VICE News", "uncivilized", "things your mom should've told you"}
keep = [c for c in allc if c[0] in KEEP]
drop = [c[1] for c in allc if c[0] not in KEEP]
assert len(keep) == len(KEEP), [c[0] for c in keep]
s = s.replace(m.group(0), "    var ADD = %s;\n    var DROP = %s; // v1 added these too; she only wants real news here\n" % (json.dumps(keep), json.dumps(drop)))
old = "    var KEY = 'worldmonitor-live-channels', MARK = 'nvii-selfhost-channels-v1';\n"
assert s.count(old) == 1
s = s.replace(old, "    var KEY = 'worldmonitor-live-channels', MARK = 'nvii-selfhost-channels-v2';\n")
old = "    ['livenow-fox', 'the-guardian'].forEach("
assert s.count(old) == 1
s = s.replace(old, "    DROP.forEach(function (cid) { var id = 'custom-uc-' + cid;\n      order = order.filter(function (x) { return x !== id; });\n      custom = custom.filter(function (x) { return !x || x.id !== id; }); });\n" + old)
s = s.replace("adds her YouTube news channels to Live News once per browser.", "adds the news channels from her YouTube subscriptions to Live News once per browser (only the ones that do news).")
with open(p, 'r+') as f:
    f.seek(0); f.write(s); f.truncate()
print('kept', [c[0] for c in keep], '| dropped', len(drop))
