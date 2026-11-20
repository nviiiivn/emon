"""Her correction (2026-11-19): Pro, Sign in and everything worldmonitor.app offers should be HERS, not hidden.
Undo the hiding; point every worldmonitor.app link at the same page on her own site; editions are paths."""
import re, sys
root = sys.argv[1]
css_path = f"{root}/selfhost/hide-pro.css"
js_path = f"{root}/selfhost/selfhost-channels.js"

CSS = """/* nvii self-host. Earlier today this file hid the Pro upsell, Sign in, Focus, Export, Follow and every
   worldmonitor.app link. 2026-11-19 her correction: nothing hidden; those pages and features are hers.
   Kept (empty) because nginx links it into every page. */
"""
with open(css_path, 'r+') as f:
    f.seek(0); f.write(CSS); f.truncate()

REWRITE = """
/* 2026-11-19 her rule: nothing links to worldmonitor.app. Every such link (including ones the app adds
   later) is pointed at the same page on this site; edition links go to /tech, /finance, /commodity,
   /energy, /good-news. Nothing is hidden. */
(function () {
  var ED = { tech: '/tech', finance: '/finance', commodity: '/commodity', energy: '/energy', happy: '/good-news' };
  function fix(a) {
    var h = a.getAttribute('href');
    if (!h || h.indexOf('worldmonitor.app') === -1) return;
    try {
      var u = new URL(h, location.href);
      var sub = u.hostname.split('.')[0];
      var path = u.pathname + u.search + u.hash;
      if (ED[sub]) path = ED[sub];
      else if (u.pathname === '/dashboard') path = '/' + u.search + u.hash;
      a.setAttribute('href', path);
    } catch (e) { /* leave it */ }
  }
  function sweep() { try { document.querySelectorAll('[href*="worldmonitor.app"]').forEach(fix); } catch (e) {} }
  var queued = false;
  function start() {
    sweep();
    new MutationObserver(function () {
      if (queued) return; queued = true;
      requestAnimationFrame(function () { queued = false; sweep(); });
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['href'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
"""
j = open(js_path).read()
# drop the earlier hiding block
m = re.search(r"\n/\* 2026-11-19 her rule: no Sign in / Upgrade buttons.*?\n\}\)\(\);\n", j, re.S)
if m:
    j = j[:m.start()] + "\n" + j[m.end():]
if 'her rule: nothing links to worldmonitor.app' not in j:
    j = j.rstrip('\n') + '\n' + REWRITE
# editions swap: every host keeps per-edition settings, not just EMON
j = j.replace("    if (!/^emon\\\\./.test(location.hostname)) return;\n    document.documentElement.classList.add('nvii-emon');\n",
              "    if (/^emon\\\\./.test(location.hostname)) document.documentElement.classList.add('nvii-emon');\n")
with open(js_path, 'r+') as f:
    f.seek(0); f.write(j); f.truncate()
print('unhidden; rewrite block', 'her rule: nothing links' in j, '; old hide block removed', m is not None)
