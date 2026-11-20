#!/usr/bin/env python3
"""EMON flight boards: recent departures and arrivals for her airports, from OpenSky (free, no account).

Writes ~/www/emon-local/flights.json, served at https://emon.alola.lol/local/flights.json and shown in
EMON's Airline Intelligence > Flights tab (patched in ~/projects/worldmonitor via selfhost/patch_flights.py).

OpenSky anonymous quota is ~400 requests/day per IP (shared with World Monitor's own OpenSky calls), so this
runs every 2 hours from emon-flights.timer: 7 airports x 2 calls = 14 requests a run (84/day).
Run by hand: python3 -I ~/services/emon-flights/flights.py
"""
import json
import os
import sys
import time
import urllib.request

OUT = os.path.expanduser("~/www/emon-local/flights.json")
WINDOW = 3 * 3600  # look back 3 hours
AIRPORTS = [  # (IATA, ICAO, name) - her order
    ("SFO", "KSFO", "San Francisco"),
    ("SEA", "KSEA", "Seattle-Tacoma"),
    ("MIA", "KMIA", "Miami"),
    ("LGA", "KLGA", "New York LaGuardia"),
    ("LAX", "KLAX", "Los Angeles"),
    ("DCA", "KDCA", "Washington Reagan"),
    ("IAD", "KIAD", "Washington Dulles"),
]
# ICAO airline prefix -> (IATA code, name). Unknown prefixes show the raw callsign.
AIRLINES = {
    "UAL": ("UA", "United"), "AAL": ("AA", "American"), "DAL": ("DL", "Delta"), "SWA": ("WN", "Southwest"),
    "ASA": ("AS", "Alaska"), "JBU": ("B6", "JetBlue"), "NKS": ("NK", "Spirit"), "FFT": ("F9", "Frontier"),
    "SKW": ("OO", "SkyWest"), "RPA": ("YX", "Republic"), "ENY": ("MQ", "Envoy"), "QXE": ("QX", "Horizon"),
    "EDV": ("9E", "Endeavor"), "JIA": ("OH", "PSA"), "PDT": ("PT", "Piedmont"), "GJS": ("G7", "GoJet"),
    "AAY": ("G4", "Allegiant"), "SCX": ("SY", "Sun Country"), "HAL": ("HA", "Hawaiian"), "MXY": ("MX", "Breeze"),
    "ACA": ("AC", "Air Canada"), "WJA": ("WS", "WestJet"), "AMX": ("AM", "Aeromexico"), "VOI": ("Y4", "Volaris"),
    "VIV": ("VB", "VivaAerobus"), "AVA": ("AV", "Avianca"), "CMP": ("CM", "Copa"), "LAN": ("LA", "LATAM"),
    "BAW": ("BA", "British Airways"), "VIR": ("VS", "Virgin Atlantic"), "DLH": ("LH", "Lufthansa"),
    "AFR": ("AF", "Air France"), "KLM": ("KL", "KLM"), "IBE": ("IB", "Iberia"), "UAE": ("EK", "Emirates"),
    "QTR": ("QR", "Qatar"), "ETD": ("EY", "Etihad"), "THY": ("TK", "Turkish"), "ANA": ("NH", "ANA"),
    "JAL": ("JL", "Japan Airlines"), "KAL": ("KE", "Korean Air"), "CPA": ("CX", "Cathay"), "EVA": ("BR", "EVA Air"),
    "SIA": ("SQ", "Singapore"), "QFA": ("QF", "Qantas"), "ANZ": ("NZ", "Air New Zealand"), "EIN": ("EI", "Aer Lingus"),
    "FDX": ("FX", "FedEx"), "UPS": ("5X", "UPS"), "GTI": ("5Y", "Atlas Air"), "ABX": ("GB", "ABX Air"),
    "BAH": ("BA", "Bahamasair"), "CAY": ("KX", "Cayman Airways"), "AJT": ("", "Amerijet (cargo)"),
}
# a few non-US ICAO airport codes worth showing as IATA
AIRPORT_ICAO = {
    "CYVR": "YVR", "CYYZ": "YYZ", "CYUL": "YUL", "CYYC": "YYC", "CYQB": "YQB", "MMMX": "MEX", "MMUN": "CUN",
    "MMGL": "GDL", "MUHA": "HAV", "MKJP": "KIN", "MDSD": "SDQ", "MDPC": "PUJ", "TJSJ": "SJU", "MYNN": "NAS",
    "TNCA": "AUA", "TNCC": "CUR", "SKBO": "BOG", "SEQM": "UIO", "SPJC": "LIM", "SBGR": "GRU", "SAEZ": "EZE",
    "MPTO": "PTY", "MROC": "SJO", "MGGT": "GUA", "EGLL": "LHR", "LFPG": "CDG", "EDDF": "FRA", "EHAM": "AMS",
    "LEMD": "MAD", "LIRF": "FCO", "EIDW": "DUB", "OMDB": "DXB", "OTHH": "DOH", "RJTT": "HND", "RJAA": "NRT",
    "RKSI": "ICN", "VHHH": "HKG", "WSSS": "SIN", "YSSY": "SYD", "PHNL": "HNL", "PANC": "ANC",
}


def iata_airport(icao):
    if not icao:
        return "?"
    if icao in AIRPORT_ICAO:
        return AIRPORT_ICAO[icao]
    if len(icao) == 4 and icao.startswith("K"):
        return icao[1:]
    return icao


def flight(callsign):
    cs = (callsign or "").strip()
    pre, num = cs[:3], cs[3:]
    if pre in AIRLINES and num and num[0].isdigit():
        code, name = AIRLINES[pre]
        return (f"{code}{num}" if code else cs), name
    return cs or "?", ""


def get(url):
    time.sleep(4)  # OpenSky answers 429 to quick bursts
    req = urllib.request.Request(url, headers={"User-Agent": "emon.alola.lol personal dashboard"})
    with urllib.request.urlopen(req, timeout=40) as r:
        return json.loads(r.read() or b"[]")


def main():
    now = int(time.time())
    begin = now - WINDOW
    out = {"updated": now, "windowHours": WINDOW // 3600, "source": "OpenSky Network", "airports": []}
    try:
        old = {a["iata"]: a for a in json.load(open(OUT)).get("airports", [])}
    except Exception:  # noqa: BLE001 - first run or unreadable
        old = {}
    for iata, icao, name in AIRPORTS:
        entry = {"iata": iata, "name": name, "departures": [], "arrivals": [], "ok": True}
        try:
            for f in get(f"https://opensky-network.org/api/flights/departure?airport={icao}&begin={begin}&end={now}"):
                num, airline = flight(f.get("callsign"))
                dest = f.get("estArrivalAirport")  # OpenSky fills this in after the plane lands
                entry["departures"].append({"flight": num, "airline": airline,
                                            "to": iata_airport(dest) if dest else "in the air",
                                            "time": f.get("firstSeen")})
            for f in get(f"https://opensky-network.org/api/flights/arrival?airport={icao}&begin={begin}&end={now}"):
                num, airline = flight(f.get("callsign"))
                entry["arrivals"].append({"flight": num, "airline": airline, "from": iata_airport(f.get("estDepartureAirport")),
                                          "time": f.get("lastSeen")})
        except Exception as e:  # noqa: BLE001 - keep the last good board for this airport
            print(f"{iata}: {e}", file=sys.stderr)
            entry = dict(old.get(iata, entry), ok=False)
        for k in ("departures", "arrivals"):
            entry[k].sort(key=lambda x: x.get("time") or 0, reverse=True)
        out["airports"].append(entry)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    tmp = OUT + ".tmp"
    with open(tmp, "w") as fh:
        json.dump(out, fh, separators=(",", ":"))
    os.replace(tmp, OUT)
    print(" ".join(f"{a['iata']}:{len(a['departures'])}d/{len(a['arrivals'])}a" for a in out["airports"]))


if __name__ == "__main__":
    main()
