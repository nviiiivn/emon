#!/usr/bin/env python3
"""Build EMON's webcam list: site/data/cams.json.

Sources (all public, free, no key):
  - Caltrans CCTV, all 12 California districts: cameras that publish a live HLS stream
    (cwwp2.dot.ca.gov/data/dN/cctv/cctvStatusDN.json -> imageData.streamingVideoURL).
  - Seattle DOT traffic cameras (web.seattle.gov/Travelers/api/Map/Data): the ones whose
    HLS stream at 61e0c5d388c2e.streamlock.net answers (probed, ~300 of ~400).
  - Hand-picked YouTube live cams (YOUTUBE below), checked embeddable via oEmbed.

Run: python3 -I ~/projects/emon/build_cams.py   (takes ~1 minute)
"""
import json
import os
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "site", "data", "cams.json")
UA = "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0"

# (name, city, lat, lon, youtube video id)
YOUTUBE = [
    ("Golden Gate Bridge", "San Francisco", 37.8199, -122.4783, "uoIfETBzuSU"),
    ("Downtown skyline (ABC7)", "San Francisco", 37.7946, -122.3999, "G8RIAgPxaMc"),
    ("Pier 39", "San Francisco", 37.8087, -122.4098, "UCQivLGCx9c"),
    ("Pier 23, the Embarcadero", "San Francisco", 37.8035, -122.4016, "PDKGik7Np88"),
    ("Bay view from Treasure Island", "San Francisco", 37.8235, -122.3706, "BSWhGNXxT9A"),
    ("SFO airport", "San Francisco", 37.6213, -122.3790, "sTVM6Sc80X0"),
    ("Pacifica pier and beach", "Pacifica", 37.6331, -122.4950, "3vqiXAw1Km4"),
    ("Mori Point coast", "Pacifica", 37.6180, -122.4920, "iQ7XJDXYSMo"),
    ("Sharp Park beach", "Pacifica", 37.6280, -122.4940, "lmec_rcEIL4"),
    ("Bay Bridge (ABC7)", "Oakland", 37.7983, -122.3778, "CXYr04BWvmc"),
    ("Treasure Island (ABC7)", "San Francisco", 37.8236, -122.3700, "_VqvVJfmyfs"),
    ("Vollmer Peak, East Bay hills (ABC7)", "Berkeley", 37.8836, -122.2186, "FLoSUN_Vrz4"),
    ("I-80 Berkeley / Albany", "Berkeley", 37.8790, -122.3070, "rJ56Y-G4Wco"),
    ("UW, Lake Washington", "Seattle", 47.6510, -122.2970, "NCzKkn0wD30"),
    ("UW campus", "Seattle", 47.6553, -122.3035, "9-hGCRgqMMs"),
    ("SEA-TAC airport", "Seattle", 47.4502, -122.3088, "Ila-kU9I_Nk"),
    ("Seattle Channel (city TV)", "Seattle", 47.6036, -122.3297, "hV8qIEYw54U"),
    ("Seattle Aquarium", "Seattle", 47.6076, -122.3430, "NqOmHpwMUxs"),
    ("Downtown Bellevue", "Bellevue", 47.6145, -122.1950, "CbMhBY5kCDU"),
]


def get(url, timeout=30):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def status(url, timeout=8):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA}, method="GET")
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status
    except Exception as e:  # noqa: BLE001 - any failure means "not usable"
        return getattr(e, "code", 0)


def caltrans():
    cams = []
    for d in range(1, 13):
        dd = f"{d:02d}"
        try:
            data = json.loads(get(f"https://cwwp2.dot.ca.gov/data/d{d}/cctv/cctvStatusD{dd}.json"))
        except Exception as e:  # noqa: BLE001
            print(f"caltrans d{d}: {e}", file=sys.stderr)
            continue
        for row in data.get("data", []):
            c = row.get("cctv", {})
            loc = c.get("location", {})
            url = (c.get("imageData") or {}).get("streamingVideoURL") or ""
            if c.get("inService") != "true" or not url.startswith("https://"):
                continue
            try:
                lat, lon = float(loc["latitude"]), float(loc["longitude"])
            except (KeyError, ValueError):
                continue
            name = (loc.get("locationName") or "").split("--", 1)[-1].strip()
            cams.append({
                "name": name or loc.get("locationName", "Caltrans camera"),
                "city": loc.get("nearbyPlace") or loc.get("county") or "California",
                "lat": lat, "lon": lon, "kind": "traffic", "src": "Caltrans",
                "hls": url,
            })
    return cams


def seattle():
    data = json.loads(get("https://web.seattle.gov/Travelers/api/Map/Data?zoomId=13&type=2"))
    rows = []
    for f in data.get("Features", []):
        lat, lon = f["PointCoordinate"]
        for c in f.get("Cameras", []):
            if c.get("Type") != "sdot":
                continue
            stem = c["ImageUrl"].rsplit(".", 1)[0]
            rows.append({
                "name": c["Description"].strip(), "city": "Seattle", "lat": lat, "lon": lon,
                "kind": "traffic", "src": "Seattle DOT",
                "hls": f"https://61e0c5d388c2e.streamlock.net/live/{stem}.stream/playlist.m3u8",
            })
    with ThreadPoolExecutor(16) as ex:
        ok = list(ex.map(lambda r: status(r["hls"]) == 200, rows))
    return [r for r, good in zip(rows, ok) if good]


def youtube():
    def embeddable(vid):
        return status(f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={vid}&format=json") == 200
    with ThreadPoolExecutor(8) as ex:
        ok = list(ex.map(lambda r: embeddable(r[4]), YOUTUBE))
    return [{"name": n, "city": c, "lat": la, "lon": lo, "kind": "city", "src": "YouTube", "yt": v}
            for (n, c, la, lo, v), good in zip(YOUTUBE, ok) if good]


def main():
    cams = youtube() + seattle() + caltrans()
    for i, c in enumerate(cams):
        c["id"] = i
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    tmp = OUT + ".tmp"
    with open(tmp, "w") as f:
        json.dump({"built": __import__("datetime").datetime.now().astimezone().isoformat(timespec="seconds"),
                   "cams": cams}, f, separators=(",", ":"))
    os.replace(tmp, OUT)
    from collections import Counter
    print(len(cams), "cams", dict(Counter(c["src"] for c in cams)))


if __name__ == "__main__":
    main()
