#!/usr/bin/env python3
"""EMON feed: North America camera catalog -> ~/www/emon-local/cams.json  (her ask 2026-11-19:
"why only those cities? ... all north american cities").

Format agreed with the EMON page (umbreality-world session):
  {"built": ISO time, "counts": {src: n}, "cams": [{id, name, city, state, lat, lon, kind, src,
    and exactly ONE of: "hls" (https .m3u8 with CORS *), "yt" (YouTube id), "img" (https JPEG/PNG) + "refresh" seconds}]}

Sources, all public and keyless:
  - ~/projects/emon/build_cams.py (reused as is): YouTube picks, Seattle DOT HLS, Caltrans HLS (12 districts)
  - the shared "511" platform many states and provinces run (HOSTS_511 below): POST /List/GetData/Cameras
  - DriveBC (British Columbia), NYC DOT, WSDOT (Washington State), City of Toronto

Every source fails soft: one broken feed never empties the catalog. For each JPEG source a sample of
its cameras is fetched; a source whose sample mostly fails is dropped (probing every one of ~20,000
images each build would hammer the agencies). If a rebuild returns far fewer cameras than the
existing file, the existing file is kept.

Run: python3 -I ~/services/emon-feeds/cams.py      (a few minutes)
"""
import importlib.util
import json
import math
import os
import random
import re
import sys
import tempfile
import time
import urllib.parse
import urllib.request
from collections import Counter
from concurrent.futures import ThreadPoolExecutor

OUT = os.path.expanduser("~/www/emon-local/cams.json")
BASE_BUILDER = os.path.expanduser("~/projects/emon/build_cams.py")
UA = "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0"

# host -> (source label, state/province code used when a record has none)
HOSTS_511 = {
    "511on.ca": ("Ontario 511", "ON"),
    "511.alberta.ca": ("511 Alberta", "AB"),
    "fl511.com": ("FL511", "FL"),
    "511ga.org": ("Georgia 511", "GA"),
    "az511.com": ("AZ511", "AZ"),
    "511wi.gov": ("511 Wisconsin", "WI"),
    "udottraffic.utah.gov": ("UDOT Traffic", "UT"),
    "511.idaho.gov": ("Idaho 511", "ID"),
    "newengland511.org": ("New England 511", ""),
    "511la.org": ("511 Louisiana", "LA"),
    "511.alaska.gov": ("Alaska 511", "AK"),
    "www.511pa.com": ("511PA", "PA"),
    "www.nvroads.com": ("NV Roads", "NV"),
    "www.511ny.org": ("511NY", "NY"),
    "511.novascotia.ca": ("Nova Scotia 511", "NS"),
    "511.gnb.ca": ("New Brunswick 511", "NB"),
    "www.manitoba511.ca": ("Manitoba 511", "MB"),
    "hotline.gov.sk.ca": ("Saskatchewan Highway Hotline", "SK"),
    "511yukon.ca": ("511 Yukon", "YT"),
    "www.ctroads.org": ("CTroads (Connecticut)", "CT"),
    "www.drivenc.gov": ("DriveNC", "NC"),
}
STATE_CODES = {
    "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR", "California": "CA", "Colorado": "CO",
    "Connecticut": "CT", "Delaware": "DE", "Florida": "FL", "Georgia": "GA", "Hawaii": "HI", "Idaho": "ID",
    "Illinois": "IL", "Indiana": "IN", "Iowa": "IA", "Kansas": "KS", "Kentucky": "KY", "Louisiana": "LA",
    "Maine": "ME", "Maryland": "MD", "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN",
    "Mississippi": "MS", "Missouri": "MO", "Montana": "MT", "Nebraska": "NE", "Nevada": "NV",
    "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY", "North Carolina": "NC",
    "North Dakota": "ND", "Ohio": "OH", "Oklahoma": "OK", "Oregon": "OR", "Pennsylvania": "PA",
    "Rhode Island": "RI", "South Carolina": "SC", "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX",
    "Utah": "UT", "Vermont": "VT", "Virginia": "VA", "Washington": "WA", "West Virginia": "WV",
    "Wisconsin": "WI", "Wyoming": "WY", "Ontario": "ON", "Quebec": "QC", "British Columbia": "BC",
    "Alberta": "AB", "Manitoba": "MB", "Saskatchewan": "SK", "Nova Scotia": "NS", "New Brunswick": "NB",
    "Yukon": "YT",
}


def fetch(url, data=None, timeout=40):
    headers = {"User-Agent": UA, "Accept": "application/json, text/plain, */*"}
    if data is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(data).encode()
    req = urllib.request.Request(url, data=data, headers=headers)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def image_ok(url):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=12) as r:
            return r.status == 200 and (r.headers.get("Content-Type") or "").startswith("image/")
    except Exception:  # noqa: BLE001 - any failure means "not usable"
        return False


def sample_passes(cams, n=8):
    """True when most of a random sample of a source's images load."""
    pick = random.sample(cams, min(n, len(cams)))
    with ThreadPoolExecutor(8) as ex:
        # Texas pictures come through our own proxy: test it on its local address
        ok = sum(ex.map(lambda c: image_ok(c["img"].replace(TXDOT_PUBLIC, TXDOT_LOCAL)), pick))
    return ok * 2 >= len(pick), ok, len(pick)


def base_sources():
    """YouTube, Seattle DOT and Caltrans from the first EMON builder, unchanged."""
    spec = importlib.util.spec_from_file_location("emon_build_cams", BASE_BUILDER)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    out = []
    for fn, state in ((mod.youtube, ""), (mod.seattle, "WA"), (mod.caltrans, "CA")):
        try:
            rows = fn()
        except Exception as e:  # noqa: BLE001
            print(f"base {fn.__name__}: {e}", file=sys.stderr)
            continue
        for r in rows:
            r.setdefault("state", state or ("WA" if r.get("city") in ("Seattle", "Bellevue") else "CA"))
        out += rows
    return out


WKT = re.compile(r"POINT \((-?[0-9.]+) (-?[0-9.]+)\)")


def platform_511(host):
    label, default_state = HOSTS_511[host]
    cams, start, total = [], 0, None
    while total is None or start < total:
        d = None
        for attempt in range(4):  # these sites answer 500 now and then mid-list
            try:
                d = json.loads(fetch(f"https://{host}/List/GetData/Cameras", {"draw": 1, "start": start, "length": 100}))
                break
            except Exception:  # noqa: BLE001
                if attempt == 3:
                    if cams:
                        return cams  # keep what loaded
                    raise
                time.sleep(3 + 3 * attempt)
        rows = d.get("data") or []
        total = d.get("recordsTotal") or 0
        if not rows:
            break
        for r in rows:
            m = WKT.search(json.dumps(r.get("latLng") or {}))
            if not m:
                continue
            lon, lat = float(m.group(1)), float(m.group(2))
            state = STATE_CODES.get(r.get("state") or "", default_state)
            for im in r.get("images") or []:
                if im.get("disabled") or im.get("blocked") or not im.get("imageUrl"):
                    continue
                url = im["imageUrl"]
                if url.startswith("/"):
                    url = f"https://{host}{url}"
                if not url.startswith("https://"):
                    continue
                cams.append({
                    "name": (im.get("description") or r.get("location") or "Camera").strip(),
                    "city": (r.get("city") or r.get("county") or r.get("roadway") or "").strip(),
                    "state": state, "lat": lat, "lon": lon, "kind": "traffic", "src": label,
                    "img": url, "refresh": 60,
                })
        start += len(rows)
        if start > 30000:
            break
    return cams


def drivebc():
    d = json.loads(fetch("https://www.drivebc.ca/api/webcams/?format=json"))
    rows = d.get("results", d) if isinstance(d, dict) else d
    cams = []
    for r in rows:
        if not r.get("is_on") or not r.get("should_appear"):
            continue
        lon, lat = (r.get("location") or {}).get("coordinates") or (None, None)
        if lat is None:
            continue
        cams.append({"name": r.get("name") or "DriveBC camera", "city": r.get("region_name") or "",
                     "state": "BC", "lat": lat, "lon": lon, "kind": "traffic", "src": "DriveBC",
                     "img": f"https://www.drivebc.ca/images/{r['id']}.jpg", "refresh": 120})
    return cams


def nyc():
    rows = json.loads(fetch("https://webcams.nyctmc.org/api/cameras"))
    return [{"name": r["name"], "city": r.get("area") or "New York", "state": "NY", "lat": r["latitude"],
             "lon": r["longitude"], "kind": "traffic", "src": "NYC DOT", "img": r["imageUrl"], "refresh": 10}
            for r in rows if str(r.get("isOnline")).lower() == "true" and str(r.get("imageUrl", "")).startswith("https://")]


def wsdot():
    d = json.loads(fetch("https://data.wsdot.wa.gov/travelcenter/Cameras.json").decode("latin-1"))
    cams = []
    for f in d.get("features") or []:
        a, g = f.get("attributes") or {}, f.get("geometry") or {}
        url = a.get("ImageURL") or ""
        if not url.startswith("https://") or "x" not in g:
            continue
        lon = g["x"] / 20037508.34 * 180  # web mercator -> degrees
        lat = math.degrees(2 * math.atan(math.exp(g["y"] / 20037508.34 * math.pi)) - math.pi / 2)
        state = "OR" if "tripcheck.com" in url else "WA"
        cams.append({"name": a.get("CameraTitle") or "WSDOT camera", "city": "", "state": state, "lat": round(lat, 6),
                     "lon": round(lon, 6), "kind": "traffic", "src": "WSDOT", "img": url, "refresh": 120})
    return cams


def toronto():
    raw = fetch("https://opendata.toronto.ca/transportation/tmc/rescucameraimages/Data/tmcearthcameras.json").decode("utf-8", "replace")
    d = json.loads(raw[raw.index("(") + 1: raw.rindex(")")])
    cams = []
    for r in d.get("Data") or []:
        try:
            lat, lon = float(r["Latitude"]), float(r["Longitude"])
        except (KeyError, ValueError):
            continue
        cams.append({"name": r["Name"].title(), "city": "Toronto", "state": "ON", "lat": lat, "lon": lon,
                     "kind": "traffic", "src": "City of Toronto",
                     "img": f"https://opendata.toronto.ca/transportation/tmc/rescucameraimages/CameraImages/loc{r['Number']}.jpg",
                     "refresh": 120})
    return cams


def maryland():
    """Maryland CHART (covers the DC and Baltimore areas): live HLS, sends CORS *."""
    rows = json.loads(fetch("https://chart.maryland.gov/DataFeeds/GetCamerasJson"))
    cams = []
    for r in rows:
        if r.get("opStatus") != "OK" or r.get("commMode") != "ONLINE" or not r.get("cctvIp"):
            continue
        cats = r.get("cameraCategories") or []
        cams.append({"name": r.get("description") or r.get("name") or "CHART camera",
                     "city": "Washington DC area" if "Wash. DC" in cats else (cats[0] if cats else ""),
                     "state": "MD", "lat": r["lat"], "lon": r["lon"], "kind": "traffic", "src": "Maryland CHART",
                     "hls": f"https://{r['cctvIp']}/rtplive/{r['id']}/playlist.m3u8"})
    return cams


def oregon():
    d = json.loads(fetch("https://www.tripcheck.com/Scripts/map/data/cctvinventory.js"))
    cams = []
    for f in d.get("features") or []:
        a = f.get("attributes") or {}
        if not a.get("filename") or a.get("latitude") is None:
            continue
        cams.append({"name": (a.get("title") or "TripCheck camera").strip(), "city": "", "state": "OR",
                     "lat": a["latitude"], "lon": a["longitude"], "kind": "traffic", "src": "Oregon TripCheck",
                     "img": "https://www.tripcheck.com/RoadCams/cams/" + urllib.parse.quote(a["filename"]), "refresh": 120})
    return cams


def calgary():
    rows = json.loads(fetch("https://data.calgary.ca/resource/k7p9-kppz.json?$limit=1000"))
    cams = []
    for r in rows:
        url = (r.get("camera_url") or {}).get("url") or ""
        xy = (r.get("point") or {}).get("coordinates")
        if not url.startswith("https://") or not xy:
            continue
        cams.append({"name": r.get("camera_location") or "Calgary camera", "city": "Calgary", "state": "AB",
                     "lat": xy[1], "lon": xy[0], "kind": "traffic", "src": "City of Calgary", "img": url, "refresh": 60})
    return cams


CARS_HOSTS = {"co": ("COtrip (Colorado DOT)", "CO"), "ia": ("Iowa 511", "IA"), "mn": ("511 Minnesota", "MN"),
              "ne": ("Nebraska 511", "NE"), "in": ("Indiana TrafficWise", "IN"), "ks": ("KanDrive", "KS"),
              "sd": ("SD511", "SD"), "ma": ("Mass511", "MA")}


def carsprogram(code):
    """The shared "carsprogram" traveler platform: still images (video previews for streaming cameras)."""
    label, state = CARS_HOSTS[code]
    rows = json.loads(fetch(f"https://{code}tg.carsprogram.org/cameras_v1/api/cameras"))
    cams = []
    for r in rows:
        loc = r.get("location") or {}
        if not r.get("active", True) or not r.get("public", True) or loc.get("latitude") is None:
            continue
        for v in r.get("views") or []:
            url = v.get("videoPreviewUrl") if v.get("type") == "WMP" else v.get("url")
            if not url or not url.startswith("https://"):
                continue
            cams.append({"name": (v.get("name") or r.get("name") or "Camera").strip(),
                         "city": (loc.get("cityReference") or "").strip(), "state": state,
                         "lat": loc["latitude"], "lon": loc["longitude"], "kind": "traffic", "src": label,
                         "img": url, "refresh": 120})
    return cams


def michigan():
    rows = json.loads(fetch("https://mdotjboss.state.mi.us/MiDrive/camera/list"))
    cams = []
    for r in rows:
        img = re.search(r'src="(https://[^"]+)"', r.get("image") or "")
        pos = re.search(r"lat=(-?[0-9.]+)&lon=(-?[0-9.]+)", r.get("county") or "")
        if not img or not pos:
            continue
        county = re.sub(r"<.*", "", r.get("county") or "").strip()
        cams.append({"name": f"{(r.get('route') or '').strip()} {(r.get('location') or '').strip()}".strip(),
                     "city": county, "state": "MI", "lat": float(pos.group(1)), "lon": float(pos.group(2)),
                     "kind": "traffic", "src": "Michigan MiDrive", "img": img.group(1).split("?")[0], "refresh": 120})
    return cams


ITERIS = {"sc": ("511 South Carolina", "SC"), "mt": ("Montana 511", "MT")}


def iteris(code):
    label, state = ITERIS[code]
    d = json.loads(fetch(f"https://{code}.cdn.iteris-atis.com/geojson/icons/metadata/icons.cameras.geojson"))
    cams = []
    for f in d.get("features") or []:
        p = f.get("properties") or {}
        xy = (f.get("geometry") or {}).get("coordinates")
        url = p.get("image_url") or ""
        if not xy or not p.get("active", True) or p.get("problem_stream") or not url.startswith("https://"):
            continue
        cams.append({"name": (p.get("description") or p.get("name") or "Camera").strip(),
                     "city": (p.get("jurisdiction") or "").strip(), "state": state, "lat": xy[1], "lon": xy[0],
                     "kind": "traffic", "src": label, "img": url, "refresh": 120})
    return cams


TXDOT_DISTRICTS = ["DAL", "FTW", "AUS", "SAT", "HOU", "ELP"]  # her city Dallas first, then the other big metros
TXDOT_PUBLIC = "https://emon.alola.lol/camproxy/txdot.jpg"   # served by camproxy.py (TxDOT sends base64 JSON, no CORS)
TXDOT_LOCAL = "http://127.0.0.1:8931/camproxy/txdot.jpg"


def texas():
    cams = []
    for dist in TXDOT_DISTRICTS:
        try:
            d = json.loads(fetch(f"https://its.txdot.gov/its/DistrictIts/GetCctvStatusListByDistrict?districtCode={dist}"))
        except Exception as e:  # noqa: BLE001
            print(f"txdot {dist}: {e}", file=sys.stderr)
            continue
        for road in (d.get("roadwayCctvStatuses") or {}).values():
            for c in road or []:
                if not c.get("hasSnapshot") or c.get("statusDescription") != "Device Online" or not c.get("latitude"):
                    continue
                q = urllib.parse.urlencode({"d": dist, "id": c["icd_Id"]})
                cams.append({"name": c.get("name") or c["icd_Id"], "city": {"DAL": "Dallas", "FTW": "Fort Worth",
                             "AUS": "Austin", "SAT": "San Antonio", "HOU": "Houston", "ELP": "El Paso"}[dist],
                             "state": "TX", "lat": c["latitude"], "lon": c["longitude"], "kind": "traffic",
                             "src": "TxDOT", "img": f"{TXDOT_PUBLIC}?{q}", "refresh": 30})
    return cams


def illinois():
    """Illinois DOT statewide cameras (ArcGIS layer behind Getting Around Illinois); covers Chicago. Plain JPEG snapshots."""
    base = ("https://services2.arcgis.com/aIrBD8yn1TDTEXoz/arcgis/rest/services/TrafficCamerasTM_Public/FeatureServer/0/query"
            "?where=1%3D1&outFields=CameraLocation,CameraDirection,SnapShot,TooOld,x,y&f=json&resultRecordCount=2000&resultOffset=")
    cams, offset = [], 0
    while offset < 12000:
        d = json.loads(fetch(base + str(offset)))
        feats = d.get("features") or []
        for f in feats:
            a = f.get("attributes") or {}
            url = a.get("SnapShot") or ""
            if not url.startswith("https://") or a.get("TooOld") == "true" or a.get("y") is None:
                continue
            direction = (a.get("CameraDirection") or "").strip()
            name = (a.get("CameraLocation") or "Illinois camera").strip()
            if direction and direction != "NONE":
                name += f" ({direction})"
            cams.append({"name": name, "city": "", "state": "IL", "lat": a["y"], "lon": a["x"], "kind": "traffic",
                         "src": "Illinois DOT", "img": url, "refresh": 120})
        if not d.get("exceededTransferLimit") or not feats:
            break
        offset += len(feats)
    return cams


def main():
    cams = base_sources()
    report = {}
    jobs = [(HOSTS_511[h][0], (lambda h=h: platform_511(h))) for h in HOSTS_511]
    jobs += [("DriveBC", drivebc), ("NYC DOT", nyc), ("WSDOT", wsdot), ("City of Toronto", toronto),
             ("Oregon TripCheck", oregon), ("City of Calgary", calgary)]
    jobs += [(CARS_HOSTS[c][0], (lambda c=c: carsprogram(c))) for c in CARS_HOSTS]
    jobs += [("Michigan MiDrive", michigan)]
    jobs += [("TxDOT", texas)]
    jobs += [("Illinois DOT", illinois)]
    jobs += [(ITERIS[c][0], (lambda c=c: iteris(c))) for c in ITERIS]
    hls_jobs = [("Maryland CHART", maryland)]

    def run(job):
        label, fn = job
        try:
            rows = fn()
        except Exception as e:  # noqa: BLE001
            return label, [], f"failed: {str(e)[:80]}"
        if not rows:
            return label, [], "no cameras"
        good, ok, n = sample_passes(rows)
        return label, (rows if good else []), f"{len(rows)} cams, sample {ok}/{n}" + ("" if good else " -> DROPPED")

    with ThreadPoolExecutor(6) as ex:
        for label, rows, note in ex.map(run, jobs):
            report[label] = note
            cams += rows
    for label, fn in hls_jobs:  # HLS sources: no image sample; the feed itself lists only online cameras
        try:
            rows = fn()
            report[label] = f"{len(rows)} cams (HLS)"
            cams += rows
        except Exception as e:  # noqa: BLE001
            report[label] = f"failed: {str(e)[:80]}"

    # North America only, de-duplicated by media URL, stable ids
    seen, out = set(), []
    for c in cams:
        key = c.get("hls") or c.get("yt") or c.get("img")
        if not key or key in seen or not (5 <= c["lat"] <= 84 and -170 <= c["lon"] <= -50):
            continue
        seen.add(key)
        c["id"] = re.sub(r"[^a-z0-9]+", "-", f"{c['src']}-{key.split('//')[-1]}".lower()).strip("-")[-90:]
        out.append(c)

    for label, note in sorted(report.items()):
        print(f"  {label}: {note}")
    counts = dict(Counter(c["src"] for c in out))
    try:
        old = len(json.load(open(OUT))["cams"])
    except Exception:  # noqa: BLE001
        old = 0
    if old and len(out) < old * 0.6:
        sys.exit(f"only {len(out)} cams vs {old} in the existing file; keeping the existing file")
    doc = {"built": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "counts": counts, "cams": out}
    fd, tmp = tempfile.mkstemp(dir=os.path.dirname(OUT), suffix=".tmp")
    with os.fdopen(fd, "w") as fh:
        json.dump(doc, fh, separators=(",", ":"))
    os.chmod(tmp, 0o644)
    os.replace(tmp, OUT)
    print(f"wrote {len(out)} cams, {os.path.getsize(OUT) // 1024} KB, {len(counts)} sources")


if __name__ == "__main__":
    main()
