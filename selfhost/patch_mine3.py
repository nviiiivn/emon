#!/usr/bin/env python3
"""nvii-mine-3 (EMON, 2026-11-24, her order: "this is MINE", delete World Monitor leftovers at the source, not hide them).
Phase 3 after patch_mine.py (nvii-mine-1) and patch_mine2.py (nvii-mine-2):
  - links to worldmonitor.app's docs site (/docs/methodology/..., the source-tier table, the /accuracy/ record page).
    EMON has none of those pages, so each link only reloaded the dashboard. The text stays, the link goes.
  - the page head: title, description, link-preview cards, search-engine data (JSON-LD), hidden heading, summary and
    the no-JavaScript page now describe EMON at emon.alola.lol. The install name (PWA manifest) is EMON Earth Monitor.
    The AGPL credit stays: "Built on koala73/worldmonitor (AGPL-3.0)" + source code github.com/nviiiivn/emon.
  - the header slot for the Sign In button, the Latest Brief panel (it only ever said "Sign in to view your brief":
    it needs a worldmonitor.app account), and "(PRO)" in the 27 non-English language files.
  - the runtime hides this makes redundant (selfhost-channels.js nvii-nopro-v1, the nolinks block, nvii-mobile-menu-v1,
    and the rules in hide-pro.css) are removed by the separate step in selfhost/unhide_mine3.py, after a live check.
Run from the repo root, after the other two:  python3 -I selfhost/patch_mine3.py
Prints every change; re-running is a no-op.
"""
import json
import re
import sys

TAG = 'nvii-mine-3'
EMON_NAME = 'EMON Earth Monitor'
EMON_URL = 'https://emon.alola.lol/'
EMON_DESC = 'EMON Earth Monitor: planes, ships, weather, floods, fires, cameras and news on one live map, North America first.'
EMON_SUBJECT = 'Live map of North America and the world'
CREDIT = 'Built on koala73/worldmonitor (AGPL-3.0).'
SOURCE = 'https://github.com/nviiiivn/emon'
changed = []


def load(p):
    return open(p, encoding='utf-8').read()


def save(p, s):
    with open(p, 'r+', encoding='utf-8') as f:  # in place: keeps the inode of bind-mounted files
        f.seek(0); f.write(s); f.truncate()


def swap(p, old, new, note, count=1):
    s = load(p)
    n = s.count(old)
    if n == 0 and (new == '' or new in s):
        return  # already applied
    if n != count:
        sys.exit(f'STOP {p}: expected {count} match(es) for {note}, found {n}')
    save(p, s.replace(old, new))
    changed.append(f'{p}: {note}')


def resub(p, pattern, repl, note, count=1, flags=0):
    s = load(p)
    new, n = re.subn(pattern, repl, s, flags=flags)
    if new == s:
        return  # already applied (or the replacement equals the original)
    if n != count:
        sys.exit(f'STOP {p}: expected {count} match(es) for {note}, found {n}')
    save(p, new)
    changed.append(f'{p}: {note}')


# ---------------------------------------------------------------- links to pages EMON does not have
swap('src/components/CIIPanel.ts',
     """    return h('div', { className: 'cii-methodology-footer' },
      h('a', {
        href: CII_METHODOLOGY_HREF,
        target: '_blank',
        rel: 'noopener noreferrer',
      }, t('components.cii.methodologyLink')),
    );""",
     f"""    // {TAG}: the methodology page is on worldmonitor.app's docs site, which EMON does not have
    return h('div', {{ className: 'cii-methodology-footer' }});""",
     'Country Instability methodology link removed')

p = 'src/components/CountryDeepDivePanel.ts'
swap(p, "import { IMAGERY_CONTEXT_EXCLUSION, IMAGERY_CONTEXT_METHODOLOGY_HREF, imageryChangeSummary } from './_risk-imagery-context';",
     "import { IMAGERY_CONTEXT_EXCLUSION, imageryChangeSummary } from './_risk-imagery-context';", 'imagery methodology import')
swap(p, """    const link = this.el('a', '', 'Methodology');
    link.setAttribute('href', IMAGERY_CONTEXT_METHODOLOGY_HREF);
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
    const exclusion = this.el('p', 'cdp-imagery-exclusion', `${IMAGERY_CONTEXT_EXCLUSION} `);
    exclusion.append(link);
""", f"""    const exclusion = this.el('p', 'cdp-imagery-exclusion', IMAGERY_CONTEXT_EXCLUSION); // {TAG}: no upstream docs link
""", 'satellite-context Methodology link removed')
swap(p, """    const link = this.el('a', 'cdp-vulnerability-methodology', data.methodologyVersion);
    link.href = '/docs/methodology/supply-vulnerability';
    link.target = '_blank';
    link.rel = 'noopener';
    footer.append(link);
""", f"""    footer.append(this.el('span', 'cdp-vulnerability-methodology', data.methodologyVersion)); // {TAG}: plain text, no upstream docs link
""", 'supply-vulnerability methodology link -> plain text')

swap('src/components/CountryDeepDivePanel-five-factor-scorecard.ts',
     """      translate('countryBrief.fiveFactorScorecard.methodologyVersion', { version: scorecard.methodologyVersion }),
      ' · ',
      h('a', {
        href: '/docs/methodology/five-factor-scorecard',
        target: '_blank',
        rel: 'noopener noreferrer',
      }, translate('countryBrief.fiveFactorScorecard.methodologyLink')),
    ),""",
     """      translate('countryBrief.fiveFactorScorecard.methodologyVersion', { version: scorecard.methodologyVersion }),
    ),""", 'five-factor scorecard methodology link removed')

p = 'src/components/EnergyDisruptionsPanel.ts'
swap(p, "        'highlighted. See /docs/methodology/disruptions for the schema.',", "        'highlighted.',", 'tooltip docs mention')
swap(p, "      creditUrl: '/docs/methodology/disruptions',\n", '', 'credit link to upstream docs removed')
p = 'src/components/FuelShortagePanel.ts'
swap(p, """        'carries the full evidence source list — see /docs/methodology/shortages for the ' +
        'threshold spec + classifier version.',""", "        'carries the full evidence source list.',", 'tooltip docs mention')
swap(p, "      creditUrl: '/docs/methodology/shortages',\n", '', 'credit link to upstream docs removed')
swap('src/components/PipelineStatusPanel.ts',
     """        'evidence (operator statements, sanction refs, commercial state, physical signals) — ' +
        'see /docs/methodology/pipelines for the classifier spec.',""",
     "        'evidence (operator statements, sanction refs, commercial state, physical signals).',", 'tooltip docs mention')
swap('src/components/StorageFacilityMapPanel.ts',
     """        'evidence (operator statements, sanction refs, commercial state, physical signals) — ' +
        'see /docs/methodology/storage for the classifier spec.',""",
     "        'evidence (operator statements, sanction refs, commercial state, physical signals).',", 'tooltip docs mention')
swap('src/utils/brief-sources.ts',
     "const BRIEF_SOURCES_METHODOLOGY_HREF = '/docs/methodology/news-digest-and-briefing';",
     f"const BRIEF_SOURCES_METHODOLOGY_HREF = ''; // {TAG}: was an upstream docs page; empty = no Methodology link",
     'brief sources Methodology link removed')

# forecast record: /accuracy/ is an upstream page EMON does not build
p = 'src/components/forecast-record.ts'
swap(p, "import { isDesktopRuntime } from '@/services/runtime';\n", '', 'runtime import (no longer used)')
swap(p, """    return `<a class="fc-reliability" data-fc-reliability-state="under-audit" href="${escapeHtml(recordHref(isDesktopRuntime()))}" aria-label="${escapeHtml(`${text}. ${auditHint(audit)}`)}">${escapeHtml(text)}</a>`;""",
     """    return `<span class="fc-reliability" data-fc-reliability-state="under-audit" aria-label="${escapeHtml(`${text}. ${auditHint(audit)}`)}">${escapeHtml(text)}</span>`;""",
     'audit badge: no link to /accuracy/')
swap(p, """  return `<a class="fc-reliability" data-fc-reliability-state="${r.kind}" href="${escapeHtml(reliabilityHref(isDesktopRuntime()))}" aria-label="${escapeHtml(`${text}. ${hint}`)}">${escapeHtml(text)}</a>`;""",
     """  return `<span class="fc-reliability" data-fc-reliability-state="${r.kind}" aria-label="${escapeHtml(`${text}. ${hint}`)}">${escapeHtml(text)}</span>`;""",
     'reliability badge: no link to /accuracy/')
swap(p, """  return `<a class="fc-record-link" href="${escapeHtml(recordHref(isDesktopRuntime()))}">${escapeHtml(t('components.forecast.record.fullRecord'))}</a>`;""",
     f"""  return ''; // {TAG}: the "full record" page (/accuracy/) is upstream's""", '"full record" link removed')

# source-tier table on worldmonitor.app
p = 'src/components/claim-card.ts'
swap(p, "import { TIER_DOCS_HREF } from '@/utils/tier-docs';\n", '', 'tier docs import (no longer used)')
swap(p, """Tiers rank sources; they do not judge this claim. <a href="${escapeHtml(TIER_DOCS_HREF)}" target="_blank" rel="noopener">How tiers are assigned</a></p>""",
     "Tiers rank sources; they do not judge this claim.</p>", '"How tiers are assigned" link (worldmonitor.app) removed')
p = 'src/components/news/publisher-roster.ts'
swap(p, """    + `<p class="tier-legend">${escapeHtml(view.legend)} `
    + `<a href="${escapeHtml(view.docsHref)}" target="_blank" rel="noopener noreferrer">${escapeHtml(view.docsLabel)}</a></p></details>`;""",
     """    + `<p class="tier-legend">${escapeHtml(view.legend)}</p></details>`;""", 'tier docs link (worldmonitor.app) removed, html')
swap(p, """    h('p', { className: 'tier-legend' }, `${view.legend} `,
      h('a', { href: view.docsHref, target: '_blank', rel: 'noopener noreferrer' }, view.docsLabel)));""",
     """    h('p', { className: 'tier-legend' }, view.legend));""", 'tier docs link (worldmonitor.app) removed, nodes')

p = 'src/locales/en.json'
swap(p, '"methodologyLink": "Includes per-country baseline + event multiplier — see /docs/methodology/cii-risk-scores for the published table"',
     '"methodologyLink": "Includes per-country baseline + event multiplier"', 'en text: CII docs mention')
swap(p, '"methodologyNote": "Alert / Warning / Watch levels come from an editorial keyword classifier — see /docs/methodology/disease-alert-level for the keyword table and limitations."',
     '"methodologyNote": "Alert / Warning / Watch levels come from an editorial keyword classifier."', 'en text: disease docs mention')
swap(p, 'ship tracking observations. See /docs/methodology/chokepoints for methodology."', 'ship tracking observations."', 'en text: chokepoint docs mention')

# ---------------------------------------------------------------- page head, search-engine data, no-JavaScript page
p = 'src/config/variant-meta.ts'
swap(p, """    title: 'Live World Map: Conflicts, Flights and Ships | World Monitor',
    description: 'Real-time global intelligence: conflicts, markets, military, OSINT signals — live in 190+ countries; structural resilience ranked for 169 of 196 countries.',""",
     f"""    title: '{EMON_NAME}', // {TAG}
    description: '{EMON_DESC}',""", 'World edition title + description')
swap(p, """    url: 'https://www.worldmonitor.app/dashboard',
    siteName: 'World Monitor',
    shortName: 'World Monitor',
    subject: 'AI-Powered Global Intelligence and Situation Awareness',""",
     f"""    url: '{EMON_URL}',
    siteName: '{EMON_NAME}',
    shortName: 'EMON',
    subject: '{EMON_SUBJECT}',""", 'World edition address, name, install name')
for sub, path in (('tech', 'tech'), ('happy', 'good-news'), ('finance', 'finance'), ('commodity', 'commodity'), ('energy', 'energy')):
    swap(p, f"    url: 'https://{sub}.worldmonitor.app/dashboard',", f"    url: '{EMON_URL}{path}',", f'{sub} edition address')

p = 'vite.config.ts'
swap(p, "label: 'World Monitor desktop dashboard with conflict zones, intelligence hotspots, and live news',",
     f"label: '{EMON_NAME} on a desktop',", 'install screenshot label (desktop)')
swap(p, "label: 'World Monitor mobile map with conflict zones and intelligence hotspots',",
     f"label: '{EMON_NAME} on a phone',", 'install screenshot label (phone)')

p = 'src/config/variant-seo-summaries.ts'
resub(p, r'World Monitor', 'EMON', 'hidden summaries: World Monitor -> EMON', count=len(re.findall(r'World Monitor', load(p))) or 1)

p = 'src/config/variant-dashboard-html.ts'
swap(p, """        <p>Visit the <a href="${CANONICAL_ORIGIN}">World Monitor homepage</a> for the platform overview, or use the indexable reference pages below without enabling JavaScript.</p>
        <nav aria-label="${escHtml(meta.siteName)} references">
          <ul>
            <li><a href="${CANONICAL_ORIGIN}countries/">Country intelligence</a></li>
            <li><a href="${CANONICAL_ORIGIN}chokepoints/">Maritime chokepoints</a></li>
            <li><a href="${CANONICAL_ORIGIN}crises/">Crisis trackers</a></li>
            <li><a href="${CANONICAL_ORIGIN}tools/">Live tools</a></li>
            <li><a href="${CANONICAL_ORIGIN}research/">Research reports</a></li>
            <li><a href="${CANONICAL_ORIGIN}blog/">Blog</a></li>
            <li><a href="${CANONICAL_ORIGIN}docs/documentation">Documentation</a></li>
            <li><a href="${CANONICAL_ORIGIN}pro#pricing">Pricing</a></li>
            <li><a href="https://github.com/koala73/worldmonitor">GitHub</a></li>
          </ul>
        </nav>
""", f"""        <p>Source code: <a href="{SOURCE}">github.com/nviiiivn/emon</a>. {CREDIT}</p>
""", 'edition no-JavaScript page: upstream links -> source + credit')
swap(p, """        name: 'World Monitor',
        item: CANONICAL_ORIGIN,""", f"""        name: '{EMON_NAME}',
        item: '{EMON_URL}',""", 'edition breadcrumb name')
swap(p, r'''/(<link rel="alternate" hreflang="[^"]+" href=")https:\/\/www\.worldmonitor\.app\/dashboard((?:\?[^"]*)?" \/>)/g,''',
     r'''/(<link rel="alternate" hreflang="[^"]+" href=")https:\/\/emon\.alola\.lol\/((?:\?[^"]*)?" \/>)/g,''', 'hreflang anchor follows index.html')
# CANONICAL_ORIGIN is now unused in the noscript/breadcrumb; keep the import valid only if still referenced
s = load(p)
if 'CANONICAL_ORIGIN' in s and s.count('CANONICAL_ORIGIN') == 1:
    swap(p, '  CANONICAL_ORIGIN,\n', '', 'unused import')


def emon_jsonld(d):
    def walk(x):
        if isinstance(x, dict):
            return {k: walk(v) for k, v in x.items()}
        if isinstance(x, list):
            return [walk(v) for v in x]
        if isinstance(x, str):
            x = x.replace('https://www.worldmonitor.app/dashboard', EMON_URL).replace('https://www.worldmonitor.app/', EMON_URL)
            return x.replace('World Monitor', EMON_NAME)
        return x
    d = walk(d)
    t = d.get('@type')
    if t in ('SoftwareApplication', 'WebSite', 'WebPage'):
        if 'description' in d:
            d['description'] = EMON_DESC
    if t == 'SoftwareApplication':
        d['name'] = EMON_NAME
        d['alternateName'] = ['EMON']
        d['isBasedOn'] = {'@type': 'SoftwareSourceCode', 'name': 'koala73/worldmonitor (AGPL-3.0)',
                          'codeRepository': 'https://github.com/koala73/worldmonitor',
                          'license': 'https://www.gnu.org/licenses/agpl-3.0.html'}
        d.pop('offers', None)
        d.pop('author', None)
        d['sameAs'] = [SOURCE]
    if t == 'WebSite':
        d['name'] = EMON_NAME
        d['alternateName'] = 'EMON'
        pa = d.get('potentialAction')
        if isinstance(pa, dict) and isinstance(pa.get('target'), dict):
            pa['target']['urlTemplate'] = EMON_URL + '?q={search_term_string}'
    if t == 'WebPage':
        d['name'] = EMON_NAME
    return d


def page_head(s):
    s = re.sub(r'(<title>)[^<]*(</title>)', rf'\g<1>{EMON_NAME}\g<2>', s, count=1)
    for attr in ('name="title"', 'property="og:title"', 'name="twitter:title"'):
        s = re.sub(rf'(<meta {attr} content=")[^"]*(" />)', rf'\g<1>{EMON_NAME}\g<2>', s, count=1)
    for attr in ('name="description"', 'property="og:description"', 'name="twitter:description"'):
        s = re.sub(rf'(<meta {attr} content=")[^"]*(" />)', rf'\g<1>{EMON_DESC}\g<2>', s, count=1)
    for attr in ('name="application-name"', 'property="og:site_name"'):
        s = re.sub(rf'(<meta {attr} content=")[^"]*(" />)', rf'\g<1>{EMON_NAME}\g<2>', s, count=1)
    s = re.sub(r'(<link rel="canonical" href=")[^"]*(" />)', rf'\g<1>{EMON_URL}\g<2>', s, count=1)
    s = re.sub(r'(<link rel="alternate" hreflang="[^"]+" href=")https://www\.worldmonitor\.app/dashboard(" />)', rf'\g<1>{EMON_URL}\g<2>', s)
    for attr in ('property="og:url"', 'name="twitter:url"'):
        s = re.sub(rf'(<meta {attr} content=")[^"]*(" />)', rf'\g<1>{EMON_URL}\g<2>', s, count=1)
    s = s.replace('https://www.worldmonitor.app/favico/og-image.png', EMON_URL + 'favico/og-image.png')
    s = re.sub(r'(<meta property="og:image:alt" content=")[^"]*(" />)', rf'\g<1>{EMON_NAME} live map\g<2>', s, count=1)
    s = re.sub(r'[ \t]*<meta name="twitter:(?:site|creator)" content="@worldmonitorai" />\n', '', s)
    s = s.replace('<meta name="author" content="Elie Habib" />', '<meta name="author" content="EMON" />')

    def ld(m):
        d = emon_jsonld(json.loads(m.group(2)))
        body = '\n'.join('    ' + line for line in json.dumps(d, indent=2, ensure_ascii=False).split('\n'))
        return f'{m.group(1)}\n{body}\n    </script>'
    s = re.sub(r'(<script type="application/ld\+json"[^>]*>)\s*(\{.*?\})\s*</script>', ld, s, flags=re.S)

    s = re.sub(r'(<h1 class="app-heading">)[^<]*(</h1>)', rf'\g<1>{EMON_NAME}: live map of North America and the world\g<2>', s, count=1)
    about = ('EMON Earth Monitor is a live map of what is happening, North America first: planes and ships, severe weather '
             'and floods, wildfires, earthquakes, traffic cameras and local news, with the rest of the world one zoom away.')
    s = re.sub(r'<section class="app-seo-summary">[\s\S]*?</section>',
               f'<section class="app-seo-summary">\n      <p>{about}</p>\n      <p>{CREDIT} Source code: {SOURCE}</p>\n    </section>',
               s, count=1)
    s = re.sub(r'<main id="dashboard-noscript" class="dashboard-noscript">[\s\S]*?</main>',
               '<main id="dashboard-noscript" class="dashboard-noscript">\n'
               f'        <h2>{EMON_NAME} needs JavaScript for the live map</h2>\n'
               f'        <p>{about}</p>\n'
               f'        <p>Source code: <a href="{SOURCE}">github.com/nviiiivn/emon</a>. {CREDIT}</p>\n'
               '      </main>', s, count=1)
    return s


s = load('index.html')
new = page_head(s)
if new != s:
    for must in ('"@type": "SoftwareApplication"', '"@type": "WebSite"', '"@type": "WebPage"', '"@type": "BreadcrumbList"',
                 '\n      "screenshot": ', '"featureList": [', '<section class="app-seo-summary">', '<main id="dashboard-noscript"'):
        if must not in new:
            sys.exit(f'STOP index.html: lost {must!r} (variant-dashboard-html.ts needs it)')
    save('index.html', new)
    changed.append('index.html: title, description, preview cards, canonical, JSON-LD, hidden heading + summary, no-JavaScript page -> EMON')

# ---------------------------------------------------------------- sign-in leftovers
swap('src/app/panel-layout.ts', '          <span id="authWidgetMount" class="auth-widget-mount"></span>\n', '',
     'header Sign In slot removed (EMON has no accounts)')
swap('src/styles/main.css', '  .header-right > :not(#authWidgetMount),\n', '  .header-right > *,\n', 'phone header rule no longer keeps a Sign In slot')

# Latest Brief: a worldmonitor.app account service; on EMON it could only say "Sign in to view your brief"
p = 'src/config/panels.ts'
swap(p, "  'latest-brief': { name: 'Latest Brief', enabled: true, priority: 1, premium: 'locked' as const },\n", '',
     'Latest Brief panel removed from every edition', count=5)
swap(p, "'strategic-posture', 'latest-brief'],", "'strategic-posture'],", 'Latest Brief removed from a preset')
swap('src/app/panel-layout.ts',
     "    this.lazyDefaultPanel('latest-brief', () => import('@/components/LatestBriefPanel'), 'LatestBriefPanel');\n",
     f"    // {TAG}: Latest Brief is not built on EMON (it needs a worldmonitor.app account)\n", 'Latest Brief panel not built')
s = load('src/config/commands.ts')
m = re.search(r"  \{ id: 'panel:latest-brief',[^\n]*\n", s)
if m:
    swap('src/config/commands.ts', m.group(0), '', 'Latest Brief command removed')

# "(PRO)" in the non-English language files (English was done in nvii-mine-2)
import glob
for f in sorted(glob.glob('src/locales/*.json')):
    if f.endswith('/en.json'):
        continue
    s = load(f)
    new, n = re.subn(r'\s?[(（]PRO[)）]', '', s)
    if n == 0:
        continue
    if n != 1:
        sys.exit(f'STOP {f}: expected 1 "(PRO)", found {n}')
    save(f, new)
    changed.append(f'{f}: "(PRO)" removed')

print(f'{TAG}: {len(changed)} change(s)')
for c in changed:
    print('  ' + c)
