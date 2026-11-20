#!/usr/bin/env python3
"""EMON feed: current wildfire outlines (NIFC WFIGS, keyless) -> ~/www/emon-local/fire-perimeters.json.
Format agreed with the EMON page: GeoJSON FeatureCollection, properties name, acres, containedPct,
updated (epoch s), plus state, county, cause, started (epoch s). Her ask 2026-11-19."""
import json, os, sys, tempfile, time, urllib.parse, urllib.request

OUT = os.path.expanduser("~/www/emon-local/fire-perimeters.json")
BASE = ("https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/"
        "WFIGS_Interagency_Perimeters_Current/FeatureServer/0/query?")
FIELDS = ["poly_IncidentName", "attr_UniqueFireIdentifier", "attr_IncidentSize", "attr_PercentContained",
          "attr_POOState", "attr_POOCounty", "attr_FireDiscoveryDateTime", "poly_DateCurrent", "attr_FireCause"]

def page(offset):
    q = urllib.parse.urlencode({"where": "1=1", "outFields": ",".join(FIELDS), "maxAllowableOffset": "0.001",
                                "outSR": "4326", "f": "geojson", "resultOffset": offset})
    req = urllib.request.Request(BASE + q, headers={"User-Agent": "emon-feeds/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)

def secs(ms):
    return int(ms / 1000) if isinstance(ms, (int, float)) else None

def main():
    feats, offset = [], 0
    for _ in range(5):  # the service caps a response at 2000 rows
        d = page(offset)
        got = d.get("features") or []
        feats += got
        if not (d.get("exceededTransferLimit") or (d.get("properties") or {}).get("exceededTransferLimit")) or not got:
            break
        offset += len(got)
    out = []
    for f in feats:
        p = f.get("properties") or {}
        if not f.get("geometry"):
            continue
        out.append({"type": "Feature", "geometry": f["geometry"], "properties": {
            "id": p.get("attr_UniqueFireIdentifier"), "name": (p.get("poly_IncidentName") or "").strip() or "Unnamed fire",
            "acres": p.get("attr_IncidentSize"), "containedPct": p.get("attr_PercentContained"),
            "state": (p.get("attr_POOState") or "").replace("US-", ""), "county": p.get("attr_POOCounty"),
            "cause": p.get("attr_FireCause"), "started": secs(p.get("attr_FireDiscoveryDateTime")),
            "updated": secs(p.get("poly_DateCurrent"))}})
    if not out and os.path.exists(OUT):
        sys.exit("no perimeters returned; keeping the existing file")
    doc = {"type": "FeatureCollection", "built": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
           "source": "NIFC WFIGS Interagency Perimeters (Current)", "features": out}
    fd, tmp = tempfile.mkstemp(dir=os.path.dirname(OUT), suffix=".tmp")
    with os.fdopen(fd, "w") as fh:
        json.dump(doc, fh, separators=(",", ":"))
    os.chmod(tmp, 0o644)
    os.replace(tmp, OUT)
    print(f"wrote {len(out)} fire perimeters, {os.path.getsize(OUT)//1024} KB")

if __name__ == "__main__":
    main()
