"""EMON: switch off the panels and map layers she marked 'Hide everywhere' on alola.lol/emon-index.
Appends one block to selfhost-channels.js in place (same inode). Re-runnable."""
import sys
p = sys.argv[1]
BLOCK = r"""
/* nvii-hidden-v1 (2026-11-19): panels and map layers she marked "Hide this everywhere" on alola.lol/emon-index
   (list at /local/hidden.json, written by Pi ~/services/emon-index/api.py). The saved list is applied from this
   browser's copy before the app starts; the fresh list is fetched after, and if it changed the page reloads
   once so the change shows. Un-hiding puts back only what this block switched off. */
(function () {
  var CACHE = 'nvii-hidden', DONE = 'nvii-hidden-applied';
  function read(k, d) { try { return JSON.parse(localStorage.getItem(k) || 'null') || d; } catch (e) { return d; } }
  function apply(list) {
    var done = read(DONE, { panels: [], layers: [] });
    var hp = list.panels || [], hl = list.layers || [];
    var panels = read('worldmonitor-panels', null), layers = read('worldmonitor-layers', null);
    if (panels) {
      done.panels.forEach(function (k) { if (hp.indexOf(k) < 0 && panels[k]) panels[k].enabled = true; });
      hp.forEach(function (k) { if (panels[k]) panels[k].enabled = false; });
      localStorage.setItem('worldmonitor-panels', JSON.stringify(panels));
    }
    if (layers) {
      done.layers.forEach(function (k) { if (hl.indexOf(k) < 0) layers[k] = true; });
      hl.forEach(function (k) { layers[k] = false; });
      localStorage.setItem('worldmonitor-layers', JSON.stringify(layers));
    }
    var q = new URLSearchParams(location.search);
    if (q.has('layers') && hl.length) {
      var kept = q.get('layers').split(',').filter(function (k) { return hl.indexOf(k) < 0; });
      if (kept.length !== q.get('layers').split(',').length) {
        q.set('layers', kept.join(','));
        history.replaceState(null, '', location.pathname + '?' + q.toString() + location.hash);
      }
    }
    localStorage.setItem(DONE, JSON.stringify({ panels: hp, layers: hl }));
  }
  try {
    var cached = read(CACHE, null);
    if (cached) apply(cached);
    fetch('/local/hidden.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (fresh) {
      if (!fresh || !Array.isArray(fresh.panels) || !Array.isArray(fresh.layers)) return;
      var a = JSON.stringify([fresh.panels, fresh.layers]), b = cached ? JSON.stringify([cached.panels, cached.layers]) : JSON.stringify([[], []]);
      localStorage.setItem(CACHE, JSON.stringify({ panels: fresh.panels, layers: fresh.layers }));
      if (a === b) return;
      if (sessionStorage.getItem('nvii-hidden-reloaded') === a) return; // reload only once per change
      sessionStorage.setItem('nvii-hidden-reloaded', a);
      apply(fresh);
      location.reload();
    }).catch(function () { /* no list on this host */ });
  } catch (e) { /* storage blocked */ }
})();
"""
s = open(p).read()
if 'nvii-hidden-v1' in s:
    print('already'); sys.exit(0)
with open(p, 'r+') as f:
    f.seek(0); f.write(s.rstrip('\n') + '\n' + BLOCK); f.truncate()
print('appended')
