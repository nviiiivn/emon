"""Her rule (2026-11-19): nothing on her World Monitor or EMON links to Upgrade to Pro, Sign in, or worldmonitor.app."""
import sys
css_path, js_path = sys.argv[1], sys.argv[2]
CSS = """
/* 2026-11-19 her rule: no links to worldmonitor.app, no Sign in, no Upgrade anywhere. The edition
   switcher (World/Tech/Finance/...) only links to worldmonitor.app until her own editions exist. */
[href*="worldmonitor.app"], .variant-switcher, .site-footer-download-link,
.mobile-auth-fallback, .export-locked-cta, .pro-banner-cta { display: none !important; }
"""
JS = """
/* 2026-11-19 her rule: no Sign in / Upgrade buttons and no worldmonitor.app links, including ones the app
   adds later (menus, popups, settings). Hides them as they appear; runs on every host. */
(function () {
  var RE = /^(sign ?in|sign ?up|log ?in|create (an )?account|upgrade|get pro|go pro|unlock|start (a )?free trial|subscribe)/i;
  function sweep(root) {
    try {
      (root.querySelectorAll ? root : document).querySelectorAll('a, button, [role="button"]').forEach(function (el) {
        var href = el.getAttribute('href') || '';
        var label = (el.textContent || el.getAttribute('aria-label') || '').trim();
        if (href.indexOf('worldmonitor.app') !== -1 || RE.test(label)) {
          el.style.setProperty('display', 'none', 'important');
          if (href) el.setAttribute('href', '#');
        }
      });
    } catch (e) { /* never break the page */ }
  }
  var queued = false;
  function start() {
    sweep(document);
    new MutationObserver(function () {
      if (queued) return; queued = true;
      requestAnimationFrame(function () { queued = false; sweep(document); });
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
"""
c = open(css_path).read()
if 'her rule: no links to worldmonitor.app' not in c:
    with open(css_path, 'a') as f: f.write(CSS)
j = open(js_path).read()
if 'her rule: no Sign in / Upgrade buttons' not in j:
    with open(js_path, 'r+') as f:
        f.seek(0); f.write(j.rstrip('\n') + '\n' + JS); f.truncate()
print('ok')
