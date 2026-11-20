#!/usr/bin/env python3
"""EMON camera proxy (her ask 2026-11-19): turns Texas DOT camera snapshots into plain JPEGs.

TxDOT answers  GetCctvSnapshotByIcdId  with JSON {"snippet": <base64 JPEG>} and no CORS header, so a
browser cannot show it as an <img>. This serves   GET /camproxy/txdot.jpg?d=<district>&id=<camera id>
as image/jpeg.

Safety: it only ever fetches https://its.txdot.gov, only for a fixed list of district codes; the id is
length-capped and URL-quoted; answers are cached 20 s (so many viewers cost one upstream request);
at most 8 upstream fetches run at once; it listens on 127.0.0.1 only (Caddy fronts it).
"""
import base64
import json
import re
import threading
import time
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = 8931
DISTRICTS = {"ABL", "AMA", "ATL", "AUS", "BMT", "BWD", "BRY", "CHS", "CRP", "DAL", "ELP", "FTW", "HOU", "LRD",
             "LBB", "LFK", "ODA", "PAR", "PHR", "SJT", "SAT", "TYL", "WAC", "WFS", "YKM"}
UA = "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0"
TTL = 20
cache, cache_lock, slots = {}, threading.Lock(), threading.BoundedSemaphore(8)


def snapshot(district, cam_id):
    key = (district, cam_id)
    now = time.time()
    with cache_lock:
        hit = cache.get(key)
        if hit and now - hit[0] < TTL:
            return hit[1]
    if not slots.acquire(timeout=5):
        return None
    try:
        url = ("https://its.txdot.gov/its/DistrictIts/GetCctvSnapshotByIcdId?icdId="
               + urllib.parse.quote(cam_id, safe="") + "&districtCode=" + district)
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=12) as r:
            payload = json.loads(r.read(3_000_000))
        snippet = re.sub(r"^data:image/jpeg;base64,", "", (payload.get("snippet") or "").strip(), flags=re.I)
        img = base64.b64decode(snippet, validate=True) if snippet else None
        if img and not img.startswith(b"\xff\xd8"):
            img = None
    except Exception:  # noqa: BLE001 - any upstream problem is a 502 for the viewer
        img = None
    finally:
        slots.release()
    with cache_lock:
        cache[key] = (now, img)
        if len(cache) > 3000:
            for k in sorted(cache, key=lambda k: cache[k][0])[:1000]:
                cache.pop(k, None)
    return img


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        q = urllib.parse.parse_qs(u.query)
        district, cam_id = (q.get("d") or [""])[0].upper(), (q.get("id") or [""])[0]
        if u.path != "/camproxy/txdot.jpg" or district not in DISTRICTS or not (0 < len(cam_id) <= 160):
            self.send_error(404)
            return
        img = snapshot(district, cam_id)
        if not img:
            self.send_error(502, "camera gave no picture")
            return
        self.send_response(200)
        self.send_header("Content-Type", "image/jpeg")
        self.send_header("Content-Length", str(len(img)))
        self.send_header("Cache-Control", "public, max-age=20")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(img)

    def log_message(self, *args):  # quiet: no per-request log lines
        pass


if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
