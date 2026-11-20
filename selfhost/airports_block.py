import sys
path = sys.argv[1]
block = """
/* Airline Intelligence airports (2026-11-19, EMON only): her cities' main airports, top cities first
   (the app keeps 20 max). Set once per browser; edits in the panel afterwards stick. On any other host
   (worldmonitor.alola.lol) an earlier copy of this setting is taken back out so it keeps the app default. */
(function () {
  try {
    var MARK = 'nvii-airports-v1', KEY = 'aviation:watchlist:v1';
    if (!/^emon\\./.test(location.hostname)) {
      if (localStorage.getItem(MARK)) { localStorage.removeItem(KEY); localStorage.removeItem(MARK); }
      return;
    }
    if (localStorage.getItem(MARK)) return;
    var wl = {};
    try { wl = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { wl = {}; }
    wl.airports = ['SFO', 'OAK', 'SEA', 'MIA', 'FLL', 'JFK', 'LGA', 'EWR', 'DCA', 'IAD',
                   'ORD', 'MDW', 'PDX', 'YVR', 'YQB', 'DFW', 'DEN', 'MEX', 'LAS', 'CLT'];
    if (!Array.isArray(wl.airlines)) wl.airlines = ['TK'];
    if (!Array.isArray(wl.routes)) wl.routes = ['IST-LHR', 'IST-FRA'];
    localStorage.setItem(KEY, JSON.stringify(wl));
    localStorage.setItem(MARK, '1');
  } catch (e) { /* storage blocked */ }
})();
"""
s = open(path).read()
marker = '\n/* Airline Intelligence airports'
if marker in s:
    a = s.index(marker); b = s.index('})();\n', a) + len('})();\n')
    s = s[:a] + s[b:]
with open(path, 'r+') as f:
    f.seek(0); f.write(s.rstrip('\n') + '\n' + block); f.truncate()
print('ok')
