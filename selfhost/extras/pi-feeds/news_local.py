#!/usr/bin/env python3
"""EMON feed: local headlines per city -> ~/www/emon-local/news-local.json  (her ask 2026-11-19, stage 6).
Source: Google News RSS search, last 24 h, one query per city in her priority order.
Note: Google's feed text says it is for personal, non-commercial feed-reader use.
Format: {"built": ISO, "cities": [{"city","state","lat","lon","items":[{"title","source","url","published"(epoch s)}]}]}"""
import email.utils, json, os, sys, tempfile, time, urllib.parse, urllib.request
import xml.etree.ElementTree as ET

OUT = os.path.expanduser("~/www/emon-local/news-local.json")
# her city priority, most important first (memory note 2026-11-19 15:45)
CITIES = [("San Francisco", "CA", 37.7749, -122.4194, "San Francisco"), ("Oakland", "CA", 37.8044, -122.2712, "Oakland California"),
          ("Seattle", "WA", 47.6062, -122.3321, "Seattle"), ("Miami", "FL", 25.7617, -80.1918, "Miami"),
          ("New York", "NY", 40.7128, -74.0060, "New York City"), ("Washington", "DC", 38.9072, -77.0369, "Washington DC"),
          ("Chicago", "IL", 41.8781, -87.6298, "Chicago"), ("Portland", "OR", 45.5152, -122.6784, "Portland Oregon"),
          ("Vancouver", "BC", 49.2827, -123.1207, "Vancouver BC"), ("Quebec City", "QC", 46.8139, -71.2080, "Quebec City"),
          ("Dallas", "TX", 32.7767, -96.7970, "Dallas"), ("Denver", "CO", 39.7392, -104.9903, "Denver"),
          ("Mexico City", "MX", 19.4326, -99.1332, "Mexico City"), ("Las Vegas", "NV", 36.1699, -115.1398, "Las Vegas"),
          ("Charlotte", "NC", 35.2271, -80.8431, "Charlotte NC")]

def headlines(query):
    url = "https://news.google.com/rss/search?" + urllib.parse.urlencode(
        {"q": f"{query} when:1d", "hl": "en-US", "gl": "US", "ceid": "US:en"})
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) emon-feeds/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        root = ET.fromstring(r.read())
    items = []
    for it in root.iter("item"):
        title = (it.findtext("title") or "").strip()
        src = (it.findtext("source") or "").strip()
        if src and title.endswith(" - " + src):
            title = title[: -len(src) - 3]
        try:
            ts = int(email.utils.parsedate_to_datetime(it.findtext("pubDate")).timestamp())
        except Exception:  # noqa: BLE001
            ts = None
        if title and it.findtext("link"):
            items.append({"title": title, "source": src, "url": it.findtext("link"), "published": ts})
    items.sort(key=lambda x: -(x["published"] or 0))
    return items[:25]

def main():
    try:
        prev = {c["city"]: c["items"] for c in json.load(open(OUT))["cities"]}
    except Exception:  # noqa: BLE001
        prev = {}
    cities, bad = [], 0
    for city, state, lat, lon, q in CITIES:
        try:
            items = headlines(q)
        except Exception as e:  # noqa: BLE001 - Google rate-limits now and then: keep that city's last headlines
            print(f"{city}: {e}", file=sys.stderr); items = prev.get(city, []); bad += 1
        cities.append({"city": city, "state": state, "lat": lat, "lon": lon, "items": items})
        time.sleep(6)
    if bad > len(CITIES) // 2 and os.path.exists(OUT):
        sys.exit("most cities failed; keeping the existing file")
    doc = {"built": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "source": "Google News", "cities": cities}
    fd, tmp = tempfile.mkstemp(dir=os.path.dirname(OUT), suffix=".tmp")
    with os.fdopen(fd, "w") as fh:
        json.dump(doc, fh, separators=(",", ":"))
    os.chmod(tmp, 0o644); os.replace(tmp, OUT)
    print("wrote", sum(len(c["items"]) for c in cities), "headlines for", len(cities), "cities")

if __name__ == "__main__":
    main()
