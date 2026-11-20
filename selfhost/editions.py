"""EMON editions as paths (her choice, 2026-11-19): emon.alola.lol/tech, /finance, /commodity, /energy,
/good-news (and /happy). Patches src (variant from path; switcher links to the paths), adds the per-edition
storage swap to selfhost-channels.js, and shows the switcher on EMON only."""
import sys
root = sys.argv[1]

# 1. src/config/variant.ts: path decides the edition before the hostname does (web only)
p = f"{root}/src/config/variant.ts"
s = open(p).read()
if 'nvii self-host: edition from path' not in s:
    old = "  const h = window.location?.hostname;\n  if (!h) return buildVariant;\n"
    assert s.count(old) == 1, 'variant anchor'
    s = s.replace(old, """  // nvii self-host: edition from path (emon.alola.lol/tech, /finance, /commodity, /energy, /good-news)
  const pathEdition = ({ tech: 'tech', finance: 'finance', commodity: 'commodity', energy: 'energy',
    happy: 'happy', 'good-news': 'happy' } as Record<string, string>)[
    (window.location?.pathname || '').split('/')[1]?.toLowerCase() || ''];
  if (pathEdition) return pathEdition;
""" + old)
    open(p, 'w').write(s)

# 2. src/app/panel-layout.ts: switcher links go to those paths on the same site
p = f"{root}/src/app/panel-layout.ts"
s = open(p).read()
UP = {'full': 'https://www.worldmonitor.app/dashboard', 'tech': 'https://tech.worldmonitor.app/dashboard',
      'finance': 'https://finance.worldmonitor.app/dashboard', 'commodity': 'https://commodity.worldmonitor.app/dashboard',
      'energy': 'https://energy.worldmonitor.app/dashboard', 'happy': 'https://happy.worldmonitor.app/dashboard'}
NEW = {'full': '/', 'tech': '/tech', 'finance': '/finance', 'commodity': '/commodity', 'energy': '/energy', 'happy': '/good-news'}
if "  tech: '/tech'," not in s:
    for k, v in UP.items():
        old = f"  {k}: '{v}',"
        assert s.count(old) == 1, old
        s = s.replace(old, f"  {k}: '{NEW[k]}',")
    open(p, 'w').write(s)

# 3. selfhost-channels.js: per-edition settings swap, first thing on the page (EMON only)
js_path = f"{root}/selfhost/selfhost-channels.js"
SWAP = """/* EMON editions (2026-11-19): /tech, /finance, /commodity, /energy, /good-news are other editions on the
   same site. Browsers share storage across paths, and World Monitor resets panels when the edition changes,
   so each edition's panels/layers/order are parked and restored here before the app starts. EMON only. */
(function () {
  try {
    if (!/^emon\\./.test(location.hostname)) return;
    document.documentElement.classList.add('nvii-emon');
    var MAP = { tech: 'tech', finance: 'finance', commodity: 'commodity', energy: 'energy', happy: 'happy', 'good-news': 'happy' };
    var v = MAP[(location.pathname.split('/')[1] || '').toLowerCase()] || 'full';
    window.__nviiEmonEdition = v;
    var KEYS = ['worldmonitor-panels', 'worldmonitor-layers', 'panel-order', 'panel-order-bottom-set',
      'worldmonitor-panel-spans', 'worldmonitor-variant', 'worldmonitor-panel-layout-variant',
      'worldmonitor-panel-order-v1.9', 'worldmonitor-layout-reset-v2.5', 'worldmonitor-free-tier-layer-ownership',
      'worldmonitor-free-tier-source-ownership', 'worldmonitor-disabled-feeds', 'worldmonitor-disabled-feeds-schema'];
    var last = localStorage.getItem('nvii-emon-edition') || 'full';
    if (last === v) return;
    var snap = {};
    KEYS.forEach(function (k) { var x = localStorage.getItem(k); if (x !== null) snap[k] = x; });
    localStorage.setItem('nvii-emon-snap-' + last, JSON.stringify(snap));
    var saved = localStorage.getItem('nvii-emon-snap-' + v);
    KEYS.forEach(function (k) { localStorage.removeItem(k); });
    if (saved) { var o = JSON.parse(saved); Object.keys(o).forEach(function (k) { localStorage.setItem(k, o[k]); }); }
    localStorage.setItem('nvii-emon-edition', v);
  } catch (e) { /* storage blocked */ }
})();
"""
j = open(js_path).read()
if 'EMON editions (2026-11-19)' not in j:
    with open(js_path, 'r+') as f:
        f.seek(0); f.write(SWAP + j); f.truncate()

# 4. hide-pro.css: switcher hidden everywhere except EMON (its links are EMON's own paths now)
css_path = f"{root}/selfhost/hide-pro.css"
c = open(css_path).read()
old = '[href*="worldmonitor.app"], .variant-switcher, .site-footer-download-link,'
if old in c:
    c = c.replace(old, '[href*="worldmonitor.app"], html:not(.nvii-emon) .variant-switcher, .site-footer-download-link,')
    with open(css_path, 'r+') as f:
        f.seek(0); f.write(c); f.truncate()
print('editions patched')
