#!/usr/bin/env python3
"""nvii-mine-1 (EMON, 2026-11-24, her order: "this is MINE"): delete World Monitor leftovers from the page's CODE
instead of hiding them at runtime. Credit stays, as one "Built on koala73/worldmonitor (AGPL-3.0)" link.

Phase 1 (this script): header, phone menu, footer, link lists, Settings > About, desktop-app / GitHub-star prompts,
and the product name in visible text (English strings, export/share text and file names, embeds, boot/offline pages).
Run from the repo root:  python3 -I selfhost/patch_mine.py      (prints every changed line; re-run is a no-op)
"""
import json
import re
import sys

TAG = 'nvii-mine-1'
SOURCE = 'https://github.com/nviiiivn/emon'
changed = []


def load(path):
    return open(path, encoding='utf-8').read()


def save(path, text):
    with open(path, 'r+', encoding='utf-8') as f:
        f.seek(0); f.write(text); f.truncate()


def swap(path, old, new, note):
    s = load(path)
    if s.count(old) == 0 and (new == '' or new in s):
        return  # already applied
    if s.count(old) != 1:
        sys.exit(f'STOP {path}: expected 1 match for {note}, found {s.count(old)}')
    save(path, s.replace(old, new, 1))
    changed.append(f'{path}: {note}')


def cut_between(path, start, end, new, note, keep_end=True):
    s = load(path)
    a = s.find(start)
    if a < 0:
        if new == '' or (new.strip() and new.strip()[:60] in s):
            return  # already applied
        sys.exit(f'STOP {path}: start marker missing for {note}')
    b = s.find(end, a)
    if b < 0:
        sys.exit(f'STOP {path}: end marker missing for {note}')
    if not keep_end:
        b += len(end)
    save(path, s[:a] + new + s[b:])
    changed.append(f'{path}: {note}')


# ---------------------------------------------------------------- link lists
p = 'src/config/dashboard-reference-links.ts'
cut_between(p, 'export const DASHBOARD_REFERENCE_LINKS = [', '\n\n',
            f"// {TAG}: World Monitor's site pages (Countries, Chokepoints, Crises, Tools, Accuracy) do not exist on EMON.\n"
            "export const DASHBOARD_REFERENCE_LINKS: ReadonlyArray<{ label: string; path: string }> = [];",
            'reference links emptied')
cut_between(p, 'export const DASHBOARD_EXTERNAL_SITE_LINKS = [', '] as const;',
            f"// {TAG}: only EMON's own source code (AGPL-3.0 asks for a source link); upstream Blog/Docs/Status/GitHub/X removed.\n"
            "export const DASHBOARD_EXTERNAL_SITE_LINKS: ReadonlyArray<{ label: string; href: string }> = [\n"
            f"  {{ label: 'Source code', href: '{SOURCE}' }},\n"
            "  { label: 'Built on koala73/worldmonitor (AGPL-3.0)', href: 'https://github.com/koala73/worldmonitor' },\n"
            "];", 'external links -> EMON source + credit', keep_end=False)

p = 'src/utils/dashboard-site-links.ts'
swap(p, """  const pricing = `<a class="dashboard-site-links-item" href="${escapeHtml(`${base}/pro#pricing`)}"`
    + ` target="_blank" rel="noopener noreferrer">Pricing</a>`;
""", '', 'Pricing link removed')
swap(p, """  return `<nav aria-label="World Monitor site" class="dashboard-site-links-row">`
    + `${reference}${pricing}${external}</nav>`;""",
     """  return `<nav aria-label="EMON Earth Monitor links" class="dashboard-site-links-row">` // nvii-mine-1
    + `${reference}${external}</nav>`;""", 'nav label + no pricing')

# ---------------------------------------------------------------- header / phone menu / footer
p = 'src/app/panel-layout.ts'
swap(p, "    const pricingHref = `${referenceOrigin}/pro#pricing`;\n", '', 'pricingHref removed')
cut_between(p, """            <span class="variant-divider"></span>
            <a href="${vHref('happy')}\"""", '`;\n      })()}</div>', '', 'Good News edition link removed')
swap(p, '<span class="logo">MONITOR</span><span class="logo-mobile">World Monitor</span><span class="version">v${__APP_VERSION__}</span>',
     '<span class="logo">EMON EARTH MONITOR</span><span class="logo-mobile">EMON</span>', 'logo text, upstream version removed')
cut_between(p, '<a href="https://x.com/eliehabib" target="_blank" rel="noopener" class="credit-link">',
            '<button class="mobile-settings-btn"', '', 'header @eliehabib + upstream GitHub links removed')
swap(p, '<span class="mobile-menu-title">WORLD MONITOR</span>', '<span class="mobile-menu-title">EMON EARTH MONITOR</span>', 'phone menu title')
cut_between(p, '<div class="mobile-menu-account" aria-label="Account">', '<button class="mobile-menu-item" id="mobileMenuRegion">',
            """${(() => { // nvii-mine-1: EMON's own editions; no sign-in block, no Good News
        const nviiEd = ({ war: 'war', weather: 'weather', tech: 'tech', finance: 'finance', commodity: 'commodity', energy: 'energy' } as Record<string, string>)[(location.pathname.split('/')[1] || '').toLowerCase()] || 'full';
        const eds: Array<[string, string, string, string]> = [
          ['full', '🌍', 'World', '/'], ['war', '⚔️', 'War', '/war'], ['weather', '⛈️', 'Weather', '/weather'],
          ['tech', '💻', 'Tech', '/tech'], ['finance', '📈', 'Finance', '/finance'],
          ['commodity', '⛏️', 'Commodity', '/commodity'], ['energy', '⚡', 'Energy', '/energy'],
        ];
        return eds.map(([key, icon, label, href]) =>
          `<a class="mobile-menu-item nvii-mm-ed ${key === nviiEd ? 'active' : ''}" href="${href}">
            <span class="mobile-menu-item-icon">${icon}</span>
            <span class="mobile-menu-item-label">${label}</span>
            ${key === nviiEd ? '<span class="mobile-menu-check">✓</span>' : ''}
          </a>`).join('');
      })()}
        <div class="mobile-menu-divider"></div>
        """, 'phone menu: sign-in + six upstream editions -> EMON editions')
cut_between(p, '<button class="mobile-menu-item" id="mobileMenuMission">',
            '<div class="mobile-menu-divider"></div>\n        <button class="mobile-menu-item" id="mobileMenuSettings">', '',
            'phone menu Mission button removed (missions are tabs)')
cut_between(p, '<a class="mobile-menu-item" href="https://x.com/eliehabib"', '</nav>\n      <div class="region-sheet-backdrop"',
            """<div class="mobile-menu-divider"></div>
        <div class="mobile-menu-footer-links">
          ${referenceLinksHtml}
          ${externalSiteLinksHtml}
        </div>
      """, 'phone menu: @eliehabib, Pricing, upstream links, version -> EMON source + credit')
swap(p, """      <footer class="site-footer" aria-label="World Monitor status">
        <span class="site-footer-meta">
          <span class="site-footer-version">v${__APP_VERSION__}</span>
          <span class="site-footer-copy">&copy; ${new Date().getFullYear()} World Monitor</span>
          ${this.ctx.isDesktopApp ? '' : `<span id="footerDownloadMount"></span>`}
""", """      <footer class="site-footer" aria-label="EMON Earth Monitor status">
        <span class="site-footer-meta">
          <span class="site-footer-copy">&copy; ${new Date().getFullYear()} EMON Earth Monitor</span>
""", 'footer: upstream version, name and Download App removed')
swap(p, '    this.destroyGitHubStarPrompt = bootGitHubStarPrompt().destroy;\n',
     '    void bootGitHubStarPrompt; // nvii-mine-1: no "Star World Monitor on GitHub" toast on EMON\n', 'GitHub star toast off')

# ---------------------------------------------------------------- Settings
p = 'src/components/UnifiedSettings.ts'
swap(p, '          ${legalLinksHtml(WEB_APP_ORIGIN)}\n', '', 'About: upstream legal links removed')
swap(p, "import { checkoutConsentHtml, legalLinksHtml, LEGAL_LINK_ATTR } from '@/utils/legal-links';",
     "import { checkoutConsentHtml, LEGAL_LINK_ATTR } from '@/utils/legal-links';", 'unused import')
p = 'src/services/preferences-content.ts'
swap(p, "const DESKTOP_RELEASES_URL = 'https://github.com/koala73/worldmonitor/releases';\n", '', 'desktop releases URL')
s = load(p)
m = re.search(r"\n *<a href=\"\$\{DESKTOP_RELEASES_URL\}\"[^\n]*\n", s)
if m:
    save(p, s[:m.start()] + '\n' + s[m.end():]); changed.append(f'{p}: "Download Desktop App" link removed')
elif 'DESKTOP_RELEASES_URL' in s:
    sys.exit('STOP preferences-content: link line not found')

# ---------------------------------------------------------------- the name in visible text (listed lines only)
LINES = {
    'src/components/CountryDeepDivePanel.ts': [3648],
    'src/components/CountryBriefOutput.ts': [131, 413],
    'src/components/OperationalExposureForm.ts': [31],
    'src/services/story-renderer.ts': [78, 445],
    'src/services/story-share.ts': [73, 95],
    'src/components/StoryModal.ts': [146],
    'src/utils/export.ts': [44, 58, 62, 346, 620, 855],
    'src/utils/export-report.ts': [288, 289],
    'src/utils/settings-persistence.ts': [244],
    'src/components/LatestBriefPanel.ts': [553, 593, 609],
    'src/services/referral.ts': [112, 116],
    'src/components/RouteExplorer/tabs/CountryImpactTab.ts': [85, 99, 106],
    'src/components/RouteExplorer/tabs/CurrentRouteTab.ts': [55],
    'src/components/claim-card.ts': [20],
    'src/components/SearchModal.ts': [553],
    'src/bootstrap/boot-failure.ts': [64, 86, 118],
    'src/embed/embed-url.ts': [355],
    'src/embed/panels/map.ts': [54],
    'src/embed/panels/fear-greed.ts': [116],
    'src/embed/panels/chokepoint-strip.ts': [117],
    'src/embed-main.ts': [28, 64, 73, 80, 81, 101, 102, 109],
    'src/components/OrbitalWatchPage.ts': [1187],
    'src/app/event-handlers.ts': [1841],
    'src/services/pwa-install.ts': [100],
}
SUBS = [('WORLDMONITOR.APP', 'EMON.ALOLA.LOL'), ('WORLD MONITOR', 'EMON EARTH MONITOR'), ('World Monitor', 'EMON Earth Monitor'),
        ("WorldMonitor's", "EMON's"), ('WorldMonitor', 'EMON'), ('worldmonitor-', 'emon-')]
for path, nums in LINES.items():
    lines = load(path).split('\n')
    hit = False
    for n in nums:
        line = lines[n - 1]
        if 'X-WorldMonitor' in line or 'worldmonitor.app' in line.replace('WORLDMONITOR.APP', ''):
            print(f'SKIP (functional) {path}:{n}: {line.strip()[:120]}'); continue
        new = line
        for a, b in SUBS:
            new = new.replace(a, b)
        if new != line:
            lines[n - 1] = new; hit = True
            changed.append(f'{path}:{n}: {line.strip()[:110]}  =>  {new.strip()[:110]}')
        elif 'EMON' not in line:
            print(f'NOTE no change {path}:{n}: {line.strip()[:120]}')
    if hit:
        save(path, '\n'.join(lines))

# ---------------------------------------------------------------- English strings (values only)
p = 'src/locales/en.json'
s = load(p)
data = json.loads(s)
bad = []
def walk(o, keypath):
    if isinstance(o, dict):
        for k, v in o.items():
            if any(x in k for x in ('World Monitor', 'WorldMonitor', 'WORLD MONITOR')): bad.append(keypath + k)
            walk(v, keypath + k + '.')
walk(data, '')
if bad:
    sys.exit(f'STOP en.json keys contain the name: {bad[:5]}')
count = 0
def fix_value(m):
    global count
    v = m.group(0)
    if 'WorldMonitorBot' in v or 'X-WorldMonitor' in v:
        return v
    n = v
    for a, b in SUBS[:5]:
        n = n.replace(a, b)
    if n != v:
        count += 1
    return n
# only touch JSON string values: ": "...."
s2 = re.sub(r'(?<=": )"(?:[^"\\]|\\.)*"', fix_value, s)
if s2 != s:
    json.loads(s2)  # still valid JSON
    save(p, s2)
    changed.append(f'{p}: {count} English strings renamed to EMON')

# ---------------------------------------------------------------- loading skeleton, error and offline pages
for path in ['index.html', 'public/500.html', 'public/404.html', 'public/offline.html']:
    s = load(path)
    n = s
    if path == 'index.html':
        n = n.replace('aria-label="World Monitor dashboard loading"', 'aria-label="EMON Earth Monitor dashboard loading"')
        n = n.replace('<span>World Monitor</span>', '<span>EMON Earth Monitor</span>')
    else:
        n = n.replace('https://www.worldmonitor.app/docs/documentation', '/').replace('https://www.worldmonitor.app', '/')
        n = re.sub(r'href="/(countries|crises|chokepoints|docs/documentation)/?"', 'href="/"', n)
        n = n.replace('World Monitor', 'EMON Earth Monitor')
    if n != s:
        save(path, n); changed.append(f'{path}: name/links -> EMON')

print('\n'.join(changed))
print(f'DONE {len(changed)} changes')
