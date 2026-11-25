#!/usr/bin/env python3
"""EMON camera proxy (her ask 2026-11-19): turns Texas DOT camera snapshots into plain JPEGs.

Also (2026-11-20, her ask: live planes on EMON like God's Eye, but light, and no more throttling):
  GET /camproxy/planes.json?lat=<..>&lon=<..>&r=<nm, max 250>   live aircraft around a point, as GeoJSON
  GET /camproxy/emergencies.json                                 aircraft on squawk 7500/7600/7700 now or in the last 6 h, with last place
  GET /camproxy/sat.json?lat=<..>&lon=<..>&t=<event epoch s>     which Sentinel-2 photo days exist for a point (latest, before)
  GET /camproxy/sat.jpg?lat=<..>&lon=<..>&d=<YYYY-MM-DD>&m=true|heat   6 km Sentinel-2 photo (Copernicus Data Space)
  GET /camproxy/wide.jpg?lat=<..>&lon=<..>&d=<YYYY-MM-DD>        330 km NASA Worldview daily photo
  GET /camproxy/scene.json?lat=&lon=&ed=weather|war|full&h=<hours>&z=<zoom>   public social posts + US storm-spotter reports for that place
  GET /camproxy/spot.json?lat=<..>&lon=<..>                      place + nearest known gas flare (World Bank list) + conflict area
  GET /camproxy/where.json?lat=<..>&lon=<..>                     place name for a point
  GET /camproxy/mil.json                                         military aircraft worldwide, as GeoJSON
  GET /camproxy/ships.json?lat=<..>&lon=<..>&z=<map zoom>        live ships around a point, as GeoJSON (Open Waters AIS,
                                                                 free public beta, no key; shared 30 s cache; credit shown)
  GET /camproxy/aircraft.json?hex=<icao hex>&flight=<callsign>      one aircraft: type, owner, country, photo, route
  GET /camproxy/ship.json?mmsi=<9 digits>&name=<ship name>          one ship: flag country, photo
(details from adsbdb.com and hexdb.io, ship flag from the ITU prefix table in mid-countries.json, ship photos from
Wikimedia Commons; each answer is cached for a day so popups cost the sources almost nothing.)
Both live feeds read the free adsb.fi open data API. ONE shared cache for every viewer: an area is asked upstream at most
once per 15 s (military list once per 60 s), and upstream calls are spaced at least 1.2 s apart, so opening EMON
in several tabs cannot get this IP rate-limited. Only ever fetches https://opendata.adsb.fi.

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


# ---------------- live aircraft (adsb.fi) ----------------
ADSB = "https://opendata.adsb.fi/api"
PLANES_TTL, MIL_TTL, MIN_GAP = 15, 60, 1.2
plane_cache, plane_lock, upstream_lock = {}, threading.Lock(), threading.Lock()
last_upstream = [0.0]


def _adsb(path):
    """One upstream call at a time, spaced MIN_GAP apart."""
    with upstream_lock:
        wait = MIN_GAP - (time.time() - last_upstream[0])
        if wait > 0:
            time.sleep(wait)
        try:
            req = urllib.request.Request(ADSB + path, headers={"User-Agent": "emon-selfhost/1.0 (personal dashboard)"})
            with urllib.request.urlopen(req, timeout=12) as r:
                return json.loads(r.read(8_000_000))
        finally:
            last_upstream[0] = time.time()


# Short memory of each aircraft seen in any fetched area: used for the "worth a look" notes in the popup.
TRACK_KEEP, TRACK_MAX = 20 * 60, 40      # seconds of history, points per aircraft
tracks, latest, track_lock = {}, {}, threading.Lock()


def _remember(a, now):
    hexcode = str(a.get("hex") or "").lower()
    lat, lon = a.get("lat"), a.get("lon")
    if not re.fullmatch(r"[0-9a-f]{6}", hexcode) or not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)):
        return
    with track_lock:
        pts = tracks.setdefault(hexcode, [])
        if not pts or now - pts[-1][0] >= 10:
            pts.append((now, lat, lon, a.get("track") or 0, a.get("alt_baro") if isinstance(a.get("alt_baro"), (int, float)) else 0, a.get("gs") or 0))
            del pts[:-TRACK_MAX]
        latest[hexcode] = {"t": now, "lat": lat, "lon": lon, "track": a.get("track") or 0, "gs": a.get("gs") or 0,
                           "alt": a.get("alt_baro"), "squawk": str(a.get("squawk") or ""), "flight": str(a.get("flight") or "").strip().upper(),
                           "reg": str(a.get("r") or "").upper(), "mil": bool(int(a.get("dbFlags") or 0) & 1) if str(a.get("dbFlags") or "0").isdigit() else False,
                           "emergency": str(a.get("emergency") or "")}
        if len(tracks) > 30000:
            for k in [k for k, v in tracks.items() if now - v[-1][0] > TRACK_KEEP]:
                tracks.pop(k, None)
                latest.pop(k, None)


def _geojson(doc):
    feats = []
    _now = time.time()
    for _a in (doc.get("ac") or doc.get("aircraft") or []):
        try:
            _remember(_a, _now)
        except Exception:  # noqa: BLE001 - never let the memory break the feed
            pass
    for a in (doc.get("ac") or doc.get("aircraft") or []):
        lat, lon = a.get("lat"), a.get("lon")
        if not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)):
            continue
        alt = a.get("alt_baro")
        try:
            mil = bool(int(a.get("dbFlags") or 0) & 1)
        except (TypeError, ValueError):
            mil = False
        feats.append({"type": "Feature", "geometry": {"type": "Point", "coordinates": [round(lon, 4), round(lat, 4)]},
                      "properties": {"hex": str(a.get("hex") or "")[:8], "flight": str(a.get("flight") or "").strip()[:10],
                                     "type": str(a.get("t") or "")[:6], "desc": str(a.get("desc") or "")[:60],
                                     "reg": str(a.get("r") or "")[:12], "alt": alt if isinstance(alt, (int, float)) else 0,
                                     "ground": alt == "ground", "gs": round(a.get("gs") or 0),
                                     "track": round(a.get("track") or a.get("true_heading") or 0),
                                     "squawk": str(a.get("squawk") or "")[:4], "mil": mil}})
    return {"type": "FeatureCollection", "fetched": int(time.time()), "source": "adsb.fi", "features": feats}


mil_raw = [None]


def planes(key, path, ttl):
    now = time.time()
    with plane_lock:
        hit = plane_cache.get(key)
        if hit and now - hit[0] < ttl:
            return hit[1]
    try:
        doc = _adsb(path)
        if key == "mil":  # raw copy for the World Monitor relay's theater posture count (/camproxy/mil-raw.json)
            mil_raw[0] = (now, json.dumps({"ac": doc.get("ac") or [], "now": doc.get("now"), "source": "adsb.fi"}, separators=(",", ":")).encode())
        body = json.dumps(_geojson(doc), separators=(",", ":")).encode()
    except Exception:  # noqa: BLE001 - serve the last good answer for up to 2 minutes, else a 502
        with plane_lock:
            hit = plane_cache.get(key)
        return hit[1] if hit and now - hit[0] < 120 else None
    with plane_lock:
        plane_cache[key] = (now, body)
        if len(plane_cache) > 400:
            for k in sorted(plane_cache, key=lambda k: plane_cache[k][0])[:150]:
                plane_cache.pop(k, None)
    return body


# ---------------- one aircraft / one ship (popup details) ----------------
import os

DETAIL_TTL = 86400
detail_cache, detail_lock = {}, threading.Lock()
try:
    MID = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "mid-countries.json")))
except Exception:  # noqa: BLE001
    MID = {}
DETAIL_HOSTS = ("https://api.adsbdb.com/", "https://hexdb.io/", "https://commons.wikimedia.org/", "https://ais.openwaters.io/",
                "https://query.wikidata.org/", "https://www.marinetraffic.com/", "https://nominatim.openstreetmap.org/")


BROWSER_UA = "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0"


def _final_image(url):
    """Follow a photo link to the picture it redirects to; return that address only if it really is an image."""
    if not url.startswith("https://www.marinetraffic.com/"):
        return None
    try:
        req = urllib.request.Request(url, headers={"User-Agent": BROWSER_UA, "Referer": "https://www.marinetraffic.com/"})
        with urllib.request.urlopen(req, timeout=10) as r:
            final = r.geturl()
            ok = (r.headers.get("Content-Type") or "").startswith("image/")
        return final if ok and final.startswith("https://") and "marinetraffic.com/" in final else None
    except Exception:  # noqa: BLE001 - no photo for this ship
        return None


def _get_json(url, browser=False):
    if not url.startswith(DETAIL_HOSTS):
        return None
    try:
        hdrs = {"User-Agent": "emon-selfhost/1.0 (personal dashboard; https://emon.alola.lol)"}
        if browser:
            hdrs = {"User-Agent": BROWSER_UA, "Accept": "application/json", "X-Requested-With": "XMLHttpRequest", "Referer": "https://www.marinetraffic.com/"}
        req = urllib.request.Request(url, headers=hdrs)
        with urllib.request.urlopen(req, timeout=10) as r:
            return json.loads(r.read(2_000_000))
    except Exception:  # noqa: BLE001 - a missing record is normal (404)
        return None


def _cached(key, build, ttl=None):
    now = time.time()
    with detail_lock:
        hit = detail_cache.get(key)
        if hit and now - hit[0] < (ttl or DETAIL_TTL):
            return hit[1]
    body = json.dumps(build(), separators=(",", ":")).encode()
    with detail_lock:
        detail_cache[key] = (now, body)
        if len(detail_cache) > 5000:
            for k in sorted(detail_cache, key=lambda k: detail_cache[k][0])[:1500]:
                detail_cache.pop(k, None)
    return body


import math

# Hand-kept list of active conflict areas (centre lat, lon, radius km). Rough circles, not borders. Edit as the world changes.
CONFLICT_ZONES = [
    ("Ukraine war zone", 48.5, 35.5, 550), ("Gaza and Israel", 31.5, 34.7, 140), ("Lebanon", 33.8, 35.8, 110),
    ("Syria", 35.0, 38.5, 300), ("Yemen and the southern Red Sea", 15.0, 44.0, 450), ("Strait of Hormuz", 26.5, 56.3, 220),
    ("Iran", 32.5, 53.5, 700), ("Sudan", 15.5, 31.5, 650), ("Taiwan Strait", 24.3, 119.8, 260),
    ("Korean border", 38.0, 127.2, 160), ("Eastern Congo", -1.5, 28.8, 300), ("Myanmar", 21.0, 96.5, 550),
]
SQUAWKS = {"7500": "Squawk 7500: the crew is signalling unlawful interference (hijack code).",
           "7600": "Squawk 7600: the aircraft has lost its radio.", "7700": "Squawk 7700: the crew has declared a general emergency."}


def _km(lat1, lon1, lat2, lon2):
    p1, p2, dl = math.radians(lat1), math.radians(lat2), math.radians(lon2 - lon1)
    a = math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 6371 * 2 * math.asin(min(1, math.sqrt(a)))


def _bearing(lat1, lon1, lat2, lon2):
    p1, p2, dl = math.radians(lat1), math.radians(lat2), math.radians(lon2 - lon1)
    return (math.degrees(math.atan2(math.sin(dl) * math.cos(p2), math.cos(p1) * math.sin(p2) - math.sin(p1) * math.cos(p2) * math.cos(dl))) + 360) % 360


def aircraft_signals(hexcode):
    """Plain notes about what this aircraft is doing right now. Signals to look closer, not conclusions."""
    with track_lock:
        cur = dict(latest.get(hexcode) or {})
        pts = list(tracks.get(hexcode) or [])
    if not cur or time.time() - cur["t"] > 300:
        return [], None
    notes = []
    if cur["squawk"] in SQUAWKS:
        notes.append(SQUAWKS[cur["squawk"]])
    elif cur.get("emergency") and cur["emergency"] not in ("none", ""):
        notes.append("The aircraft is reporting an emergency status: " + cur["emergency"] + ".")
    on_ground = cur.get("alt") == "ground"
    # Conflict-area notes only for military aircraft and aircraft showing no callsign: airliners cross these areas all day.
    for name, zlat, zlon, zr in (CONFLICT_ZONES if (cur.get("mil") or not cur.get("flight")) else []):
        d = _km(cur["lat"], cur["lon"], zlat, zlon)
        if d <= zr:
            notes.append(f"Inside the {name} area.")
            break
        if not on_ground and d <= zr + 900 and (cur.get("gs") or 0) > 120:
            off = abs((_bearing(cur["lat"], cur["lon"], zlat, zlon) - (cur.get("track") or 0) + 180) % 360 - 180)
            half_width = math.degrees(math.atan2(zr, d))
            if off <= max(8, half_width):
                mins = round((d - zr) / ((cur["gs"] * 1.852) / 60)) if cur.get("gs") else None
                notes.append(f"Heading toward the {name} area, about {round(d - zr):,} km from its edge" + (f" ({mins} min at this speed)." if mins else "."))
                break
    recent = [p for p in pts if cur["t"] - p[0] <= 15 * 60]
    if len(recent) >= 6 and not on_ground:
        turned, prev = 0.0, recent[0][3]
        for p in recent[1:]:
            turned += (p[3] - prev + 180) % 360 - 180
            prev = p[3]
        span = _km(recent[0][1], recent[0][2], recent[-1][1], recent[-1][2])
        mins = (recent[-1][0] - recent[0][0]) / 60
        if abs(turned) >= 540 and span < 60:
            notes.append(f"Circling: about {abs(turned) / 360:.1f} full turns in the last {mins:.0f} minutes while staying within {span:.0f} km. Common for surveillance, training, holding or search flights.")
        elif mins >= 4 and (recent[-1][5] or 0) < 60 and (recent[-1][4] or 0) > 300 and span < 3:
            notes.append(f"Hovering or nearly stationary for {mins:.0f} minutes (helicopter or drone behaviour).")
    seen = f"Watched for {(pts[-1][0] - pts[0][0]) / 60:.0f} min" if len(pts) >= 2 else "Only just seen, so there is no flight path yet"
    return notes, seen


def aircraft_detail(hexcode, flight):
    out = {"hex": hexcode, "flight": flight}
    if hexcode:
        a = ((_get_json("https://api.adsbdb.com/v0/aircraft/" + hexcode) or {}).get("response") or {}).get("aircraft") or {}
        if isinstance(a, dict) and a:
            out.update({"type": a.get("type"), "maker": a.get("manufacturer"), "reg": a.get("registration"),
                        "owner": a.get("registered_owner"), "country": a.get("registered_owner_country_name"),
                        "photo": a.get("url_photo_thumbnail") or a.get("url_photo"), "photo_full": a.get("url_photo"),
                        "photo_credit": "airport-data.com" if a.get("url_photo") else None})
        h = _get_json("https://hexdb.io/api/v1/aircraft/" + hexcode) or {}
        if isinstance(h, dict) and h.get("ModeS"):
            out.setdefault("type", None)
            out["type"] = out.get("type") or h.get("Type")
            out["maker"] = out.get("maker") or h.get("Manufacturer")
            out["reg"] = out.get("reg") or h.get("Registration")
            out["owner"] = out.get("owner") or h.get("RegisteredOwners")
    if flight:
        fr = ((_get_json("https://api.adsbdb.com/v0/callsign/" + urllib.parse.quote(flight, safe="")) or {}).get("response") or {}).get("flightroute") or {}
        if isinstance(fr, dict) and fr:
            o, d, al = fr.get("origin") or {}, fr.get("destination") or {}, fr.get("airline") or {}
            out["airline"] = al.get("name")
            out["route"] = {"from": f"{o.get('municipality') or o.get('name') or ''} ({o.get('iata_code') or o.get('icao_code') or '?'}), {o.get('country_name') or ''}".strip(", "),
                            "to": f"{d.get('municipality') or d.get('name') or ''} ({d.get('iata_code') or d.get('icao_code') or '?'}), {d.get('country_name') or ''}".strip(", "),
                            "from_ll": [o.get("latitude"), o.get("longitude")], "to_ll": [d.get("latitude"), d.get("longitude")]}
    return {k: v for k, v in out.items() if v not in (None, "")}


def _resolve_hex(term):
    """Callsign or registration -> ICAO hex, from the live adsb.fi data (cached a few minutes with the rest)."""
    key = ("hexof", term.upper())
    now = time.time()
    with detail_lock:
        hit = detail_cache.get(key)
        if hit and now - hit[0] < 600:
            return hit[1]
    found = ""
    with track_lock:
        for hx, v in latest.items():
            if v["flight"] == term.upper() or v["reg"].replace("-", "") == term.upper().replace("-", ""):
                found = hx
                break
    if found:
        with detail_lock:
            detail_cache[key] = (now, found)
        return found
    for path in ("/v2/callsign/" + urllib.parse.quote(term.upper(), safe=""), "/v2/registration/" + urllib.parse.quote(term.upper(), safe="")):
        try:
            ac = (_adsb(path).get("ac") or [])
        except Exception:  # noqa: BLE001
            ac = []
        if ac and re.fullmatch(r"[0-9a-f]{6}", str(ac[0].get("hex") or "").lower()):
            found = ac[0]["hex"].lower()
            break
    with detail_lock:
        detail_cache[key] = (now, found)
    return found


# What ships broadcast about themselves (callsign, destination, ETA, size). Written every 2 minutes on the Tower by the
# relay addition "nvii-ais-static"; pulled here over ssh every 3 minutes (the Tower firewall has no port for it).
import subprocess

# Published copy: set EMON_AIS_STATIC_SSH to the user@host that runs the worldmonitor stack (key-based ssh), and
# EMON_AIS_STATIC_PATH if your checkout is not ~/projects/worldmonitor. Unset = ship details are skipped.
AIS_STATIC_SSH = os.environ.get("EMON_AIS_STATIC_SSH", "")
AIS_STATIC_PATH = os.environ.get("EMON_AIS_STATIC_PATH", "projects/worldmonitor/selfhost/nvii-data/ais-static.json")
AIS_STATIC_CMD = (["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=8", AIS_STATIC_SSH, "cat " + AIS_STATIC_PATH]
                  if AIS_STATIC_SSH else None)
SHIP_TYPES = {3: "Special craft", 4: "High-speed craft", 5: "Special craft", 6: "Passenger ship", 7: "Cargo ship", 8: "Tanker", 9: "Other"}
ais_static = {}


def _watch_ais_static():
    global ais_static
    while AIS_STATIC_CMD:
        try:
            raw = subprocess.run(AIS_STATIC_CMD, capture_output=True, timeout=40).stdout
            ships = json.loads(raw).get("ships") if raw else None
            if isinstance(ships, dict) and ships:
                ais_static = ships
        except Exception:  # noqa: BLE001 - keep the last good copy
            pass
        time.sleep(180)


def ship_static(mmsi):
    v = ais_static.get(mmsi)
    if not isinstance(v, dict):
        return {}
    out = {"callsign": v.get("c"), "destination": v.get("d"), "imo": v.get("i") or None,
           "length_m": v.get("l") or None, "beam_m": v.get("w") or None, "draught_m": v.get("g") or None,
           "kind": (SHIP_TYPES.get(int(v.get("t") or 0) // 10) if v.get("t") else None), "static_age_min": round((time.time() - (v.get("s") or 0)) / 60)}
    e = v.get("e")
    if isinstance(e, list) and len(e) == 4 and 1 <= e[0] <= 12 and 1 <= e[1] <= 31:
        out["eta"] = f"{['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][e[0]-1]} {e[1]}" + (f", {e[2]:02d}:{e[3]:02d} UTC" if e[2] < 24 and e[3] < 60 else "")
    return {k: x for k, x in out.items() if x not in (None, "", 0)}


def ship_detail(mmsi, name):
    out = {"mmsi": mmsi, "flag": MID.get(mmsi[:3])}
    # Open Waters AIS (free public beta, no key): registry record for the ship. For US ships this is the Coast Guard's
    # documentation record (official number, service, year built, tonnage). Must be credited where shown.
    ow = ((_get_json("https://ais.openwaters.io/v1/vessels/" + mmsi) or {}).get("properties") or {})
    if isinstance(ow, dict) and ow:
        pt = ow.get("particulars") if isinstance(ow.get("particulars"), dict) else {}
        out.update({"reg_name": pt.get("registered_name") or ow.get("name"), "official_number": pt.get("identification"),
                    "service": pt.get("service"), "reg_status": pt.get("status"), "built": pt.get("year_built"),
                    "gross_tonnage": pt.get("gross_tonnage"), "net_tonnage": pt.get("net_tonnage"),
                    "hull": pt.get("hull_material"), "owner": pt.get("owner") or pt.get("managing_owner"),
                    "home_port": pt.get("hailing_port") or pt.get("home_port"), "near": ow.get("near"),
                    "ow_imo": ow.get("imo"), "credit": "Open Waters AIS" + (" · U.S. Coast Guard" if pt else ""),
                    "doing": {0: "Under way (engine)", 1: "At anchor", 2: "Not under command", 3: "Restricted in manoeuvring",
                              4: "Constrained by draught", 5: "Moored", 6: "Aground", 7: "Fishing", 8: "Under way (sail)"}.get(ow.get("nav_status")),
                    "first_seen": str(ow.get("first_seen") or "")[:10] or None})
        name = name or (ow.get("name") or "")
    if name:
        q = urllib.parse.urlencode({"action": "query", "generator": "search", "gsrsearch": f'"{name}" ship', "gsrnamespace": 6, "gsrlimit": 3,
                                    "prop": "imageinfo", "iiprop": "url|extmetadata", "iiurlwidth": 480, "format": "json"})
        pages = ((_get_json("https://commons.wikimedia.org/w/api.php?" + q) or {}).get("query") or {}).get("pages") or {}
        words = [w for w in re.findall(r"[a-z0-9]+", name.lower()) if len(w) > 2]
        for pg in sorted(pages.values(), key=lambda x: x.get("index", 99)):
            title = (pg.get("title") or "").lower()
            ii = (pg.get("imageinfo") or [{}])[0]
            if not ii.get("thumburl") or not title.endswith((".jpg", ".jpeg", ".png")) or not words or not all(w in title for w in words):
                continue
            em = ii.get("extmetadata") or {}
            out.update({"photo": ii["thumburl"], "photo_page": ii.get("descriptionurl"),
                        "photo_credit": re.sub(r"<[^>]+>", "", (em.get("Artist") or {}).get("value") or "")[:60] or "Wikimedia Commons",
                        "photo_license": (em.get("LicenseShortName") or {}).get("value")})
            break
    if not out.get("photo"):
        # Wikidata: an exact match on the ship's MMSI, with its lead picture (free licence).
        q = 'SELECT ?img WHERE { ?s wdt:P587 "%s"; wdt:P18 ?img } LIMIT 1' % mmsi
        rows = (((_get_json("https://query.wikidata.org/sparql?format=json&query=" + urllib.parse.quote(q)) or {}).get("results") or {}).get("bindings") or [])
        img = ((rows[0].get("img") or {}).get("value") or "") if rows else ""
        if img.startswith("http://commons.wikimedia.org/wiki/Special:FilePath/"):
            fname = img.rsplit("/", 1)[-1]
            out.update({"photo": "https://commons.wikimedia.org/wiki/Special:FilePath/" + fname + "?width=480",
                        "photo_page": "https://commons.wikimedia.org/wiki/File:" + fname, "photo_credit": "Wikimedia Commons"})
    if not out.get("photo"):
        # MarineTraffic: its website's own search turns the MMSI into its ship number, and its photo link redirects to the
        # picture. Not an official API (it can change or stop), so: one lookup per ship per day, photo shown from their
        # server with their watermark and a link back to their page.
        hits = _get_json("https://www.marinetraffic.com/en/search/searchAsset?what=vessel&term=" + mmsi, browser=True)
        ship_id = ""
        if isinstance(hits, list):
            for h in hits:
                if isinstance(h, dict) and str(h.get("value")) == mmsi and str(h.get("id") or "").isdigit():
                    ship_id = str(h["id"])
                    break
        if ship_id:
            out["mt_page"] = "https://www.marinetraffic.com/en/ais/details/ships/shipid:" + ship_id
            final = _final_image("https://www.marinetraffic.com/getAssetDefaultPhoto/?asset_id=" + ship_id + "&asset_type_id=0&photo_size=300")
            if final:
                out.update({"photo": final, "photo_page": out["mt_page"], "photo_credit": "MarineTraffic (photographer named on the picture)"})
    return {k: v for k, v in out.items() if v not in (None, "")}


# ---------------- live ships (Open Waters AIS) ----------------
SHIPS_TTL = 30
ships_lock = threading.Lock()
last_ships = [0.0]


def ships_area(lat, lon, zoom):
    half_lat, half_lon = (0.6, 0.9) if zoom >= 9 else (1.3, 2.0) if zoom >= 7 else (2.5, 3.5)
    glat, glon = round(lat * 2) / 2, round(lon * 2) / 2        # half-degree grid so nearby viewers share one answer
    key = ("ships", glat, glon, half_lat)
    now = time.time()
    with plane_lock:
        hit = plane_cache.get(key)
        if hit and now - hit[0] < SHIPS_TTL:
            return hit[1]
    body = None
    try:
        with ships_lock:
            wait = 1.5 - (time.time() - last_ships[0])
            if wait > 0:
                time.sleep(wait)
            try:
                bbox = f"{max(-89, glat - half_lat):.2f},{max(-180, glon - half_lon):.2f},{min(89, glat + half_lat):.2f},{min(180, glon + half_lon):.2f}"
                doc = _get_json("https://ais.openwaters.io/v1/vessels?bbox=" + bbox)
            finally:
                last_ships[0] = time.time()
        feats = []
        for f in ((doc or {}).get("features") or []):
            pr, xy = f.get("properties") or {}, (f.get("geometry") or {}).get("coordinates") or []
            if len(xy) != 2 or not str(pr.get("mmsi") or "").isdigit() or len(str(pr.get("mmsi"))) != 9:
                continue
            t = int(pr.get("type") or 0)
            head = pr.get("heading") if isinstance(pr.get("heading"), (int, float)) and pr.get("heading") < 360 else pr.get("cog")
            feats.append({"type": "Feature", "geometry": {"type": "Point", "coordinates": [round(xy[0], 5), round(xy[1], 5)]},
                          "properties": {"mmsi": str(pr["mmsi"]), "name": str(pr.get("name") or "").strip()[:40], "t": t,
                                         "k": "mil" if t == 35 else "tanker" if 80 <= t <= 89 else "cargo" if 70 <= t <= 79 else "pass" if 60 <= t <= 69 else "other",
                                         "sog": pr.get("sog") or 0, "dir": round(head or 0), "moving": bool((pr.get("sog") or 0) > 0.5),
                                         "flag": str(pr.get("flag") or "")[:3], "dest": str(pr.get("destination") or "").strip()[:30],
                                         "len": pr.get("length") or 0, "seen": str(pr.get("seen") or "")[:20]}})
        if doc is not None:
            body = json.dumps({"type": "FeatureCollection", "fetched": int(time.time()), "source": "Open Waters AIS (openwaters.io/ais), AISHub",
                               "truncated": bool((doc or {}).get("truncated")), "features": feats}, separators=(",", ":")).encode()
    except Exception:  # noqa: BLE001
        body = None
    if body is None:
        with plane_lock:
            hit = plane_cache.get(key)
        return hit[1] if hit and now - hit[0] < 300 else None
    with plane_lock:
        plane_cache[key] = (now, body)
    return body


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        q = urllib.parse.parse_qs(u.query)
        if u.path in ("/camproxy/aircraft.json", "/camproxy/ship.json"):
            if u.path.endswith("aircraft.json"):
                hexcode = re.sub(r"[^0-9a-f]", "", (q.get("hex") or [""])[0].lower())[:6]
                flight = re.sub(r"[^A-Z0-9]", "", (q.get("flight") or [""])[0].upper())[:8]
                hexcode = hexcode if len(hexcode) == 6 else ""
                term = re.sub(r"[^A-Za-z0-9-]", "", (q.get("q") or [""])[0])[:12]  # popup title: callsign, registration or hex
                if term and not hexcode and not flight:
                    if re.fullmatch(r"[0-9A-Fa-f]{6}", term):
                        hexcode = term.lower()
                    else:
                        flight = term.upper().replace("-", "")
                        hexcode = _resolve_hex(term)
                if not hexcode and not flight:
                    self.send_error(400)
                    return
                body = _cached(("ac", hexcode, flight), lambda: aircraft_detail(hexcode, flight))
                if hexcode:
                    try:
                        notes, seen = aircraft_signals(hexcode)
                        doc = json.loads(body)
                        doc["signals"], doc["watched"] = notes, seen
                        body = json.dumps(doc, separators=(",", ":")).encode()
                    except Exception:  # noqa: BLE001
                        pass
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(body)))
                self.send_header("Cache-Control", "no-store")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(body)
                return
            else:
                mmsi = re.sub(r"\D", "", (q.get("mmsi") or [""])[0])[:9]
                name = re.sub(r"[^A-Za-z0-9 .'-]", "", (q.get("name") or [""])[0])[:40].strip()
                if len(mmsi) != 9:
                    self.send_error(400)
                    return
                body = _cached(("ship", mmsi, name.lower()), lambda: ship_detail(mmsi, name))
                st = ship_static(mmsi)
                if st:
                    try:
                        doc = json.loads(body)
                        doc.update(st)
                        body = json.dumps(doc, separators=(",", ":")).encode()
                    except Exception:  # noqa: BLE001
                        pass
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "public, max-age=3600")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(body)
            return
        if u.path == "/camproxy/mil-raw.json":  # worldwide military aircraft in the upstream (adsb) format, at most ~2 minutes old
            hit = mil_raw[0]
            if not hit or time.time() - hit[0] > 180:
                self.send_error(503)
                return
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(hit[1])))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(hit[1])
            return
        if u.path == "/camproxy/emergencies.json":  # aircraft on an emergency code now or in the last 6 hours, newest first
            with emerg_lock:
                rows = sorted(emerg.values(), key=lambda e: -e.get("last", 0))
                body = json.dumps({"now": time.time(), "aircraft": rows}, separators=(",", ":")).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(body)
            return
        if u.path in ("/camproxy/sat.json", "/camproxy/sat.jpg", "/camproxy/wide.jpg"):  # satellite photos of a point
            try:
                lat, lon = float((q.get("lat") or [""])[0]), float((q.get("lon") or [""])[0])
                assert -85 <= lat <= 85 and -180 <= lon <= 180
                day = (q.get("d") or [""])[0]
                if u.path == "/camproxy/sat.json":
                    t = float((q.get("t") or ["0"])[0] or 0)
                    body, ctype, age = json.dumps(sat_scenes(lat, lon, t), separators=(",", ":")).encode(), "application/json", 3600
                else:
                    assert re.fullmatch(r"20\d\d-\d\d-\d\d", day)
                    mode = (q.get("m") or ["true"])[0]
                    assert mode in SAT_SCRIPTS
                    body = wide_image(lat, lon, day) if u.path.endswith("wide.jpg") else sat_image(lat, lon, day, mode)
                    ctype, age = "image/jpeg", 604800
                    if not body:
                        self.send_error(503)
                        return
            except Exception:  # noqa: BLE001
                self.send_error(502)
                return
            self.send_response(200)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "public, max-age=%d" % age)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(body)
            return
        if u.path == "/camproxy/scene.json":  # public social posts and spotter reports about the place the map is on
            try:
                lat, lon = float((q.get("lat") or [""])[0]), float((q.get("lon") or [""])[0])
                assert -85 <= lat <= 85 and -180 <= lon <= 180
                ed = (q.get("ed") or ["full"])[0]
                hours = float((q.get("h") or ["6"])[0])
                zoom = float((q.get("z") or ["7"])[0])
                body = scene(lat, lon, ed if ed in SCENE_KW else "full", hours, zoom)
            except Exception:  # noqa: BLE001
                self.send_error(502)
                return
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "public, max-age=120")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(body)
            return
        if u.path == "/camproxy/spot.json":  # what is at a map point (place, known gas flare, conflict area)
            try:
                lat, lon = float((q.get("lat") or [""])[0]), float((q.get("lon") or [""])[0])
                assert -90 <= lat <= 90 and -180 <= lon <= 180
                body = json.dumps(spot(lat, lon), separators=(",", ":")).encode()
            except Exception:  # noqa: BLE001
                self.send_error(400)
                return
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "public, max-age=3600")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(body)
            return
        if u.path == "/camproxy/where.json":  # plain place name for a point (OpenStreetMap Nominatim, cached)
            try:
                lat, lon = round(float((q.get("lat") or [""])[0]), 2), round(float((q.get("lon") or [""])[0]), 2)
                assert -90 <= lat <= 90 and -180 <= lon <= 180
            except Exception:  # noqa: BLE001
                self.send_error(400)
                return
            body = _where(lat, lon)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "public, max-age=3600")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(body)
            return
        if u.path == "/camproxy/ships.json":
            try:
                lat, lon = float((q.get("lat") or [""])[0]), float((q.get("lon") or [""])[0])
                zoom = float((q.get("z") or ["7"])[0])
            except ValueError:
                self.send_error(400)
                return
            if not (-90 <= lat <= 90 and -180 <= lon <= 180):
                self.send_error(400)
                return
            body = ships_area(lat, lon, zoom)
            if body is None:
                self.send_error(502, "ship source gave no answer")
                return
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "public, max-age=20")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(body)
            return
        if u.path in ("/camproxy/planes.json", "/camproxy/mil.json"):
            if u.path.endswith("mil.json"):
                body = planes("mil", "/v2/mil", MIL_TTL)
            else:
                try:
                    lat, lon = float((q.get("lat") or [""])[0]), float((q.get("lon") or [""])[0])
                    r = min(250, max(25, int(float((q.get("r") or ["250"])[0]))))
                except ValueError:
                    self.send_error(400)
                    return
                if not (-90 <= lat <= 90 and -180 <= lon <= 180):
                    self.send_error(400)
                    return
                lat, lon = round(lat), round(lon)  # 1-degree grid so nearby viewers share one cached answer
                body = planes(("pt", lat, lon, r), f"/v3/lat/{lat}/lon/{lon}/dist/{r}", PLANES_TTL)
            if body is None:
                self.send_error(502, "aircraft source gave no answer")
                return
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "public, max-age=10")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(body)
            return
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


def _where(lat, lon):
    """Plain place name for a point, as cached JSON bytes (OpenStreetMap Nominatim; empty over open sea)."""
    lat, lon = round(lat, 2), round(lon, 2)
    def build():
        d = _get_json("https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&accept-language=en&lat=%s&lon=%s" % (lat, lon)) or {}
        a = d.get("address") or {}
        near = a.get("city") or a.get("town") or a.get("county") or a.get("state_district") or a.get("state") or ""
        parts = [x for x in (near, a.get("state") if a.get("state") != near else "", a.get("country")) if x]
        return {"place": ", ".join(parts), "sea": not parts}
    return _cached(("where", lat, lon), build)


# Known gas flare sites (World Bank Global Gas Flaring Tracker). A satellite "fire" on top of one is almost always the flare.
FLARES, FLARE_GRID = [], {}
try:
    FLARES = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "flares.json")))["sites"]
    for _i, _f in enumerate(FLARES):
        FLARE_GRID.setdefault((int(math.floor(_f[0] * 10)), int(math.floor(_f[1] * 10))), []).append(_i)
except Exception:  # noqa: BLE001
    pass


def spot(lat, lon):
    """What is at this point: place name, nearest known gas flare within 4 km, and the conflict area it sits in (if any)."""
    out = json.loads(_where(lat, lon))
    best = None
    cy, cx = int(math.floor(lat * 10)), int(math.floor(lon * 10))
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            for i in FLARE_GRID.get((cy + dy, cx + dx), ()):
                f = FLARES[i]
                km = _km(lat, lon, f[0], f[1])
                if km <= 4 and (best is None or km < best[0]):
                    best = (km, f)
    if best:
        out["flare"] = {"km": round(best[0], 1), "field": best[1][2], "operator": best[1][3], "country": best[1][4], "location": best[1][5], "year": best[1][7]}
    for name, zlat, zlon, zr in CONFLICT_ZONES:
        if _km(lat, lon, zlat, zlon) <= zr:
            out["zone"] = name
            break
    return out


# ---- Satellite photos of a map point -------------------------------------------------------------------------------
# Close view: Sentinel-2 true colour at 10 m per pixel through her free Copernicus Data Space account
# (CDSE_CLIENT_ID / CDSE_CLIENT_SECRET come from the unit's EnvironmentFile, never from this file).
# Wide view: NASA Worldview daily snapshot (VIIRS, about 375 m per pixel), no key, good for smoke plumes.
SAT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "satcache")
SAT_BOX_KM, SAT_PX, SAT_DAILY_CAP = 6.0, 640, 600
sat_lock, sat_token, sat_calls = threading.Lock(), {"t": 0, "v": ""}, {"day": "", "n": 0}
SAT_SCRIPTS = {
    "true": "//VERSION=3\nfunction setup(){return{input:[\"B02\",\"B03\",\"B04\"],output:{bands:3}}}\nfunction evaluatePixel(s){return[2.5*s.B04,2.5*s.B03,2.5*s.B02]}",
    # shortwave infrared: active fire glows orange-red even through smoke, burnt ground is dark red-brown
    "heat": "//VERSION=3\nfunction setup(){return{input:[\"B12\",\"B8A\",\"B04\"],output:{bands:3}}}\nfunction evaluatePixel(s){return[2.5*s.B12,2.5*s.B8A,2.5*s.B04]}",
}


def _sat_token():
    with sat_lock:
        if time.time() < sat_token["t"]:
            return sat_token["v"]
        data = urllib.parse.urlencode({"grant_type": "client_credentials", "client_id": os.environ.get("CDSE_CLIENT_ID", "").strip("\"'"),
                                       "client_secret": os.environ.get("CDSE_CLIENT_SECRET", "").strip("\"'")}).encode()
        with urllib.request.urlopen(urllib.request.Request("https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token", data=data), timeout=20) as r:
            tok = json.loads(r.read())
        sat_token["v"], sat_token["t"] = tok["access_token"], time.time() + int(tok.get("expires_in", 600)) - 120
        return sat_token["v"]


def _sat_post(url, body, accept):
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers={"Authorization": "Bearer " + _sat_token(), "Content-Type": "application/json", "Accept": accept})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read(12_000_000)


def sat_scenes(lat, lon, event_t):
    """Which clear-enough Sentinel-2 days exist for this point: the newest, and the last one before the event."""
    lat, lon = round(lat, 3), round(lon, 3)
    def build():
        now = time.time()
        body = {"collections": ["sentinel-2-l2a"], "limit": 60, "filter": "eo:cloud_cover < 60", "filter-lang": "cql2-text",
                "datetime": time.strftime("%Y-%m-%dT00:00:00Z", time.gmtime(now - 100 * 86400)) + "/" + time.strftime("%Y-%m-%dT23:59:59Z", time.gmtime(now)),
                "intersects": {"type": "Point", "coordinates": [lon, lat]},
                "fields": {"include": ["properties.datetime", "properties.eo:cloud_cover"], "exclude": ["geometry", "assets", "links"]}}
        feats = json.loads(_sat_post("https://sh.dataspace.copernicus.eu/api/v1/catalog/1.0.0/search", body, "*/*")).get("features") or []
        days = {}
        for f in feats:
            pr = f.get("properties") or {}
            d = str(pr.get("datetime") or "")[:10]
            if d and (d not in days or (pr.get("eo:cloud_cover") or 0) < days[d]):
                days[d] = round(float(pr.get("eo:cloud_cover") or 0))
        return {"days": sorted(days.items(), reverse=True)}
    days = json.loads(_cached(("satdays", lat, lon, int(time.time() // 21600)), build))["days"]
    out = {"lat": lat, "lon": lon, "box_km": SAT_BOX_KM, "days": [d for d, _ in days][:12]}
    if not days:
        return out
    ev = time.strftime("%Y-%m-%d", time.gmtime(event_t)) if event_t else ""
    out["latest"] = {"date": days[0][0], "cloud": days[0][1], "after_event": bool(ev) and days[0][0] >= ev}
    older = [x for x in days if x[0] < (ev or days[0][0]) and x[1] <= 35 and x[0] != days[0][0]] or [x for x in days if x[0] < (ev or days[0][0]) and x[0] != days[0][0]]
    if older:
        out["before"] = {"date": older[0][0], "cloud": older[0][1]}
    return out


def sat_image(lat, lon, day, mode):
    """One 6 km square JPEG for that day, cached on disk."""
    lat, lon = round(lat, 3), round(lon, 3)
    os.makedirs(SAT_DIR, exist_ok=True)
    path = os.path.join(SAT_DIR, "%s_%s_%s_%s.jpg" % (mode, day, lat, lon))
    if os.path.exists(path):
        return open(path, "rb").read()
    today = time.strftime("%Y-%m-%d", time.gmtime())
    with sat_lock:
        if sat_calls["day"] != today:
            sat_calls["day"], sat_calls["n"] = today, 0
        if sat_calls["n"] >= SAT_DAILY_CAP:
            return None
        sat_calls["n"] += 1
    dlat = SAT_BOX_KM / 2 / 111.32
    dlon = dlat / max(0.05, math.cos(math.radians(lat)))
    body = {"input": {"bounds": {"bbox": [lon - dlon, lat - dlat, lon + dlon, lat + dlat], "properties": {"crs": "http://www.opengis.net/def/crs/EPSG/0/4326"}},
                      "data": [{"type": "sentinel-2-l2a", "dataFilter": {"timeRange": {"from": day + "T00:00:00Z", "to": day + "T23:59:59Z"}, "mosaickingOrder": "leastCC"}}]},
            "output": {"width": SAT_PX, "height": SAT_PX, "responses": [{"identifier": "default", "format": {"type": "image/jpeg", "quality": 85}}]},
            "evalscript": SAT_SCRIPTS[mode]}
    img = _sat_post("https://sh.dataspace.copernicus.eu/api/v1/process", body, "image/jpeg")
    tmp = path + ".tmp"
    open(tmp, "wb").write(img)
    os.replace(tmp, path)
    files = sorted((os.path.join(SAT_DIR, f) for f in os.listdir(SAT_DIR)), key=os.path.getmtime)
    for old in files[:-3000]:
        os.remove(old)
    return img


def wide_image(lat, lon, day):
    """NASA Worldview daily snapshot, about 330 km across, cached on disk."""
    lat, lon = round(lat, 2), round(lon, 2)
    os.makedirs(SAT_DIR, exist_ok=True)
    path = os.path.join(SAT_DIR, "wide_%s_%s_%s.jpg" % (day, lat, lon))
    if os.path.exists(path):
        return open(path, "rb").read()
    dlat = 1.5
    dlon = dlat / max(0.05, math.cos(math.radians(lat)))
    url = ("https://wvs.earthdata.nasa.gov/api/v1/snapshot?REQUEST=GetSnapshot&TIME=%s&BBOX=%.3f,%.3f,%.3f,%.3f&CRS=EPSG:4326"
           "&LAYERS=VIIRS_NOAA20_CorrectedReflectance_TrueColor&FORMAT=image/jpeg&WIDTH=640&HEIGHT=640") % (day, lat - dlat, lon - dlon, lat + dlat, lon + dlon)
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "emon-selfhost/1.0 (personal dashboard)"}), timeout=45) as r:
        img = r.read(8_000_000)
    if not img.startswith(b"\xff\xd8"):
        return None
    tmp = path + ".tmp"
    open(tmp, "wb").write(img)
    os.replace(tmp, path)
    return img


# ---- On the scene: public social posts about a place (her ask 2026-11-21) -------------------------------------------
# Only sources that answer without any account or key (checked 2026-11-21): Bluesky search, Mastodon hashtag timelines,
# Reddit city subreddits through the Arctic Shift archive, and US storm-spotter reports (IEM / National Weather Service).
# Snap Map, Citizen and Waze refused; X, Instagram, Facebook and TikTok have no keyless access.
# Bluesky, Mastodon and Reddit posts carry no coordinates: they are found by the place name in the text and pinned on that place.
SCENE_KW = {
    "weather": ["flood", "flooding", "tornado", "waterspout", "storm", "wildfire", "hail", "landslide", "earthquake", "power outage", "hurricane", "snow"],
    "war": ["explosion", "strike", "drone", "missile", "shelling", "air raid", "attack", "bombing"],
    "full": ["breaking", "explosion", "fire", "flooding", "storm", "power outage", "protest", "earthquake"],
}
SCENE_UA = {"User-Agent": "emon-selfhost/1.0 (personal dashboard)", "Accept": "application/json"}
scene_lock = threading.Lock()


def _scene_get(url, timeout=12):
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=SCENE_UA), timeout=timeout) as r:
            return json.loads(r.read(6_000_000))
    except Exception:  # noqa: BLE001
        return None


def _iso_epoch(sv):
    try:
        sv = str(sv).replace("Z", "+00:00")
        import datetime
        return datetime.datetime.fromisoformat(sv).timestamp()
    except Exception:  # noqa: BLE001
        return 0


def _scene_bsky(place, kws, since):
    out = []
    for kw in kws[:6]:
        q = urllib.parse.quote('"%s" %s' % (place, kw))
        d = _scene_get("https://api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=%s&limit=30&sort=latest&since=%s" % (q, urllib.parse.quote(time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(since)))))
        for p in (d or {}).get("posts") or []:
            emb = p.get("embed") or {}
            if "recordWithMedia" in str(emb.get("$type")):
                emb = emb.get("media") or {}
            kind = str(emb.get("$type") or "")
            thumb, video = "", ""
            if "images" in kind and emb.get("images"):
                thumb = emb["images"][0].get("thumb") or ""
            elif "video" in kind:
                thumb, video = emb.get("thumbnail") or "", emb.get("playlist") or ""
            if not thumb and not video:
                continue
            rec, au = p.get("record") or {}, p.get("author") or {}
            t = _iso_epoch(rec.get("createdAt") or p.get("indexedAt"))
            if t < since:
                continue
            out.append({"net": "Bluesky", "t": t, "text": str(rec.get("text") or "")[:400], "by": au.get("handle") or "", "kw": kw,
                        "link": "https://bsky.app/profile/%s/post/%s" % (au.get("handle") or au.get("did"), str(p.get("uri") or "").rsplit("/", 1)[-1]),
                        "thumb": thumb, "video": bool(video)})
        time.sleep(0.25)
    return out


def _scene_masto(place, kws, since):
    out, low = [], place.lower()
    squash = lambda x: re.sub(r"[^a-z0-9]", "", x.lower())
    tags = [(squash(k), True) for k in kws[:5]] + [(squash(place), False)]
    for tag, need_place in tags:
        if not tag:
            continue
        d = _scene_get("https://mastodon.social/api/v1/timelines/tag/%s?limit=30&only_media=true" % urllib.parse.quote(tag))
        for x in d or []:
            t = _iso_epoch(x.get("created_at"))
            text = re.sub(r"<[^>]+>", " ", str(x.get("content") or ""))
            text = re.sub(r"\s+", " ", text.replace("&amp;", "&").replace("&#39;", "'").replace("&quot;", '"')).strip()
            if t < since or (need_place and low not in text.lower()) or (not need_place and not any(k in text.lower() for k in kws)):
                continue
            m = (x.get("media_attachments") or [{}])[0]
            out.append({"net": "Mastodon", "t": t, "text": text[:400], "by": (x.get("account") or {}).get("acct") or "", "kw": tag,
                        "link": x.get("url") or "", "thumb": m.get("preview_url") or "", "video": m.get("type") in ("video", "gifv")})
        time.sleep(0.25)
    return out


def _scene_reddit(place, kws, since, hours):
    sub = re.sub(r"[^A-Za-z0-9]", "", place)
    d = _scene_get("https://arctic-shift.photon-reddit.com/api/posts/search?subreddit=%s&limit=100&sort=desc&after=%dh" % (urllib.parse.quote(sub), max(1, int(hours))), 15)
    out = []
    for p in (d or {}).get("data") or []:
        title = str(p.get("title") or "")
        t = float(p.get("created_utc") or 0)
        low = (title + " " + str(p.get("selftext") or "")[:300]).lower()
        hit = next((k for k in kws if k in low), "")
        if t < since or not hit:
            continue
        thumb = str(p.get("thumbnail") or "")
        out.append({"net": "Reddit", "t": t, "text": title[:400], "by": "r/" + str(p.get("subreddit") or sub), "kw": hit,
                    "link": "https://www.reddit.com" + str(p.get("permalink") or ""), "thumb": thumb if thumb.startswith("https://") else "",
                    "video": bool(p.get("is_video"))})
    return out


def _scene_spotters(lat, lon, radius_km, since, hours):
    doc = json.loads(_cached(("lsr", int(min(48, max(1, hours)))), lambda: _scene_get("https://mesonet.agron.iastate.edu/geojson/lsr.geojson?hours=%d" % min(48, max(1, int(hours))), 20) or {"features": []}, ttl=300))
    out = []
    for f in doc.get("features") or []:
        pr = f.get("properties") or {}
        try:
            la, lo = float(pr["lat"]), float(pr["lon"])
        except Exception:  # noqa: BLE001
            continue
        t = _iso_epoch(pr.get("valid"))
        if t < since or _km(lat, lon, la, lo) > radius_km:
            continue
        mag = (" %s %s" % (pr.get("magnitude"), pr.get("unit") or "")).rstrip() if pr.get("magnitude") not in (None, "", "None") else ""
        out.append({"net": "Storm spotter", "t": t, "text": ("%s%s. %s" % (str(pr.get("typetext") or "").capitalize(), mag, pr.get("remark") or "")).strip()[:400],
                    "by": "%s, %s (%s)" % (pr.get("city") or "", pr.get("st") or "", pr.get("source") or "report"), "kw": str(pr.get("typetext") or "").lower(),
                    "link": "https://mesonet.agron.iastate.edu/lsr/", "thumb": "", "video": False, "lat": la, "lon": lo, "exact": True})
    return out


def scene(lat, lon, ed, hours, zoom):
    w = json.loads(_where(lat, lon))
    parts = [x.strip() for x in str(w.get("place") or "").split(",") if x.strip()]
    latin = [x for x in parts if re.fullmatch(r"[A-Za-z .'\-]+", x)]
    place = ""
    if latin:
        place = latin[0] if zoom >= 6.5 or len(latin) == 1 else latin[1] if zoom >= 4.5 and len(latin) > 2 else latin[-1]
        place = re.sub(r"\s+(County|District|Governorate|Province|Region|Municipality)$", "", place)
    kws = SCENE_KW.get(ed) or SCENE_KW["full"]
    hours = min(48, max(1, hours))
    since = time.time() - hours * 3600
    radius = 60 if zoom >= 8 else 150 if zoom >= 6 else 400
    def build():
        items = _scene_spotters(lat, lon, radius, since, hours)
        if place:
            with scene_lock:   # one place lookup at a time, so several open tabs cannot hammer the networks
                for fn in (lambda: _scene_bsky(place, kws, since), lambda: _scene_masto(place, kws, since), lambda: _scene_reddit(place, kws, since, hours)):
                    try:
                        items += fn()
                    except Exception:  # noqa: BLE001
                        pass
        seen, out = set(), []
        for it in sorted(items, key=lambda i: -i["t"]):
            if it["link"] in seen and it["net"] != "Storm spotter":
                continue
            seen.add(it["link"])
            if "lat" not in it:
                it["lat"], it["lon"], it["exact"] = round(lat, 2), round(lon, 2), False
            out.append(it)
        return {"place": place, "where": w.get("place") or "", "hours": hours, "radius_km": radius, "topics": kws, "built": time.time(), "items": out[:120]}
    return _cached(("scene", place or (round(lat), round(lon)), ed, hours, radius, round(lat, 1 if place else 0), round(lon, 1 if place else 0)), build, ttl=300)


# Aircraft sending an emergency code. Kept for EMERG_KEEP after the signal stops, so "where was it last seen" has an answer.
EMERG_KEEP = 6 * 3600
EMERG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "emergencies-seen.json")
emerg, emerg_lock = {}, threading.Lock()
try:
    emerg.update(json.load(open(EMERG_FILE)))
except Exception:  # noqa: BLE001
    pass


def _watch_emergencies():
    while True:
        now = time.time()
        for code in ("7500", "7600", "7700"):
            try:
                for a in (_adsb("/v2/sqk/" + code) or {}).get("ac") or []:
                    hexcode = str(a.get("hex") or "").lower()
                    if not re.fullmatch(r"[0-9a-f]{6}", hexcode):
                        continue
                    with emerg_lock:
                        e = emerg.setdefault(hexcode, {"hex": hexcode, "first": now})
                        e.update({"last": now, "squawk": code, "flight": str(a.get("flight") or "").strip(), "reg": str(a.get("r") or ""),
                                  "type": str(a.get("desc") or a.get("t") or ""), "ground": a.get("alt_baro") == "ground"})
                        if isinstance(a.get("alt_baro"), (int, float)):
                            e["alt"] = a["alt_baro"]
                        if isinstance(a.get("gs"), (int, float)):
                            e["gs"] = a["gs"]
                        if isinstance(a.get("lat"), (int, float)) and isinstance(a.get("lon"), (int, float)):
                            moved = "lat" not in e or _km(e["lat"], e["lon"], a["lat"], a["lon"]) > 15
                            e.update({"lat": a["lat"], "lon": a["lon"], "pos_t": now - float(a.get("seen_pos") or 0), "track": a.get("track")})
                        else:
                            moved = False
                    if moved or "place" not in e:
                        try:
                            w = json.loads(_where(e["lat"], e["lon"])) if "lat" in e else {}
                            with emerg_lock:
                                e["place"], e["sea"] = w.get("place", ""), bool(w.get("sea"))
                        except Exception:  # noqa: BLE001
                            pass
            except Exception:  # noqa: BLE001
                pass
        with emerg_lock:
            for k in [k for k, v in emerg.items() if now - v.get("last", 0) > EMERG_KEEP]:
                emerg.pop(k, None)
            try:
                tmp = EMERG_FILE + ".tmp"
                json.dump(emerg, open(tmp, "w"))
                os.replace(tmp, EMERG_FILE)
            except Exception:  # noqa: BLE001
                pass
        time.sleep(60)


def _watch_military():
    """Keep the worldwide military list fresh once a minute so circling / heading notes have a flight path to work from."""
    while True:
        try:
            planes("mil", "/v2/mil", 55)
        except Exception:  # noqa: BLE001
            pass
        time.sleep(60)


if __name__ == "__main__":
    threading.Thread(target=_watch_military, daemon=True).start()
    threading.Thread(target=_watch_emergencies, daemon=True).start()
    threading.Thread(target=_watch_ais_static, daemon=True).start()
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
