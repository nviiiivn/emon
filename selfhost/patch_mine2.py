#!/usr/bin/env python3
"""nvii-mine-2 (EMON, 2026-11-24, her order: "this is MINE"): delete World Monitor's sign-in / Pro / upgrade leftovers.
EMON has no accounts and no paid tier, so: no tab limit, no export lock, no follow limit, no Pro banner (or its empty
strip), no account-only Settings pages (Notifications, API keys, Embeds, AI agents: they all need a worldmonitor.app
account), and no PRO badges or "Unlock with Pro" links.
Run from the repo root:  python3 -I selfhost/patch_mine.py first, then  python3 -I selfhost/patch_mine2.py
Prints every change; re-running is a no-op.
"""
import sys

TAG = 'nvii-mine-2'
changed = []


def load(p):
    return open(p, encoding='utf-8').read()


def swap(p, old, new, note):
    s = load(p)
    if s.count(old) == 0 and (new == '' or new in s):
        return  # already applied
    if s.count(old) != 1:
        sys.exit(f'STOP {p}: expected 1 match for {note}, found {s.count(old)}')
    with open(p, 'r+', encoding='utf-8') as f:
        f.seek(0); f.write(s.replace(old, new, 1)); f.truncate()
    changed.append(f'{p}: {note}')


# real locks
swap('src/services/gates/export-resolver.ts',
     "  if (!input.signedIn) return decideTabCap(input, currentTabCount, FREE_TAB_CAP, 'anonymous');",
     f"  if (!input.signedIn) return UNCAPPED; // {TAG}: EMON has no accounts, so tabs are never capped (was 3)",
     'tab limit of 3 removed')
swap('src/components/CountryBriefPage.ts',
     "  private canExportStructuredData(format: 'json' | 'csv'): boolean {\n    const authState = getAuthState();",
     f"  private canExportStructuredData(format: 'json' | 'csv'): boolean {{\n    if (format) return true; // {TAG}: export is never locked on EMON\n    const authState = getAuthState();",
     'Country Brief JSON/CSV export unlocked')
swap('src/services/followed-countries.ts', 'export const FREE_TIER_FOLLOW_LIMIT = 3;',
     f'export const FREE_TIER_FOLLOW_LIMIT = 1000; // {TAG}: no free-plan limit on EMON (was 3)', 'follow limit 3 -> 1000')

# Pro banner and the empty strip it reserves on first paint
swap('src/App.ts', '    showProBanner(this.state.container);\n',
     f'    void showProBanner; // {TAG}: no Pro banner on EMON\n', 'Pro banner not shown')
swap('index.html', ':root{--wm-pro-banner-slot-height:40px;', ':root{--wm-pro-banner-slot-height:0px;', 'first-paint Pro banner strip removed')

# Settings pages that only work with a worldmonitor.app account
p = 'src/config/settings-sections.ts'
swap(p, "        keywordsKey: 'settings.keywords.notifications',\n        available: (f) => !f.isDesktopApp,",
     f"        keywordsKey: 'settings.keywords.notifications',\n        available: () => false, // {TAG}: alerts need a worldmonitor.app account",
     'Notifications page removed')
swap(p, "        id: 'api-keys', labelKey: 'settings.sections.apiKeys', descKey: 'settings.descriptions.apiKeys', owner: 'shell', badge: 'pro',\n        keywordsKey: 'settings.keywords.apiKeys',",
     f"        id: 'api-keys', labelKey: 'settings.sections.apiKeys', descKey: 'settings.descriptions.apiKeys', owner: 'shell',\n        available: () => false, // {TAG}: worldmonitor.app keys / desktop key\n        keywordsKey: 'settings.keywords.apiKeys',",
     'API keys page removed')
swap(p, "        id: 'embeds', labelKey: 'settings.sections.embeds', descKey: 'settings.descriptions.embeds', owner: 'shell', badge: 'pro',\n        available: (f) => f.embedAccess,",
     f"        id: 'embeds', labelKey: 'settings.sections.embeds', descKey: 'settings.descriptions.embeds', owner: 'shell',\n        available: () => false, // {TAG}",
     'Embeds page removed')
swap(p, "        id: 'mcp-clients', labelKey: 'settings.sections.aiAgents', descKey: 'settings.descriptions.aiAgents', owner: 'shell',\n        keywordsKey: 'settings.keywords.aiAgents',",
     f"        id: 'mcp-clients', labelKey: 'settings.sections.aiAgents', descKey: 'settings.descriptions.aiAgents', owner: 'shell',\n        available: () => false, // {TAG}: connects agents to worldmonitor.app/mcp with a World Monitor account\n        keywordsKey: 'settings.keywords.aiAgents',",
     'AI agents page removed')

# PRO badges and unlock links
swap('src/components/UnifiedSettings.ts',
     """            ${(locked || resolvedPanel.premium) ? '<span class="panel-toggle-pro-badge" aria-hidden="true">PRO</span>' : ''}\n""",
     '', 'Settings > Panels PRO badges removed')
swap('src/components/MobilePanelNav.ts',
     """      ...(this.proPanelKeys.size > 0
        ? [{ key: PRO_CATEGORY, label: `⚡ ${t('widgets.proBadge')}` }]
        : []),
""", f'      // {TAG}: no "⚡ PRO" chip (nothing is locked on EMON)\n', 'phone "⚡ PRO" chip removed')
swap('src/components/CountryDeepDivePanel.ts', "'Export evidence bundle as Markdown (PRO)'", "'Export evidence bundle as Markdown'", '(PRO) tooltip')
swap('src/components/OrbitalWatchPage.ts',
     """      h('div', { className: 'ies-alert', dataset: { section: 'alert' } },
        h('span', null, t('orbitalWatch.sheet.alert')),
        h('a', { className: 'ies-alert-cta', href: '/pro#pricing', target: '_blank', rel: 'noopener' }, t('orbitalWatch.sheet.alertCta'))),
""", '', 'orbital "Set alert" Pro upsell removed')
swap('src/components/Panel.ts',
     """    if (options.premium && !getSecretState('WORLDMONITOR_API_KEY').present) {
      const proBadge = h('span', { className: 'panel-pro-badge' }, t('premium.pro'));
      headerLeft.appendChild(proBadge);
    }
""", '', 'panel header PRO badge removed')
p = 'src/app/panel-layout.ts'
swap(p, "    proBlock.appendChild(proBadge);\n", '', 'widget block PRO badge not added')
swap(p, "    const proBadge = document.createElement('span');\n    proBadge.className = 'widget-pro-badge';\n    proBadge.textContent = t('widgets.proBadge');\n", '', 'widget PRO badge element removed')
swap(p, "    mcpBlock.appendChild(mcpBadge);\n", '', 'MCP block PRO badge not added')
swap(p, "    const mcpBadge = document.createElement('span');\n    mcpBadge.className = 'widget-pro-badge';\n    mcpBadge.textContent = t('widgets.proBadge');\n", '', 'MCP PRO badge element removed')
swap('src/components/CustomWidgetPanel.ts', "    if (this.spec.tier === 'pro') {\n      const badge = h('span', { className: 'widget-pro-badge' }",
     f"    if (this.spec.tier === 'pro' && !TAG_NVII) {{\n      const badge = h('span', {{ className: 'widget-pro-badge' }}", 'custom widget PRO badge off')
s = load('src/components/CustomWidgetPanel.ts')
if 'const TAG_NVII' not in s:
    lines = s.split('\n')
    last_import = max(i for i, l in enumerate(lines) if l.startswith('import '))
    lines.insert(last_import + 1, f"const TAG_NVII = true; // {TAG}: EMON shows no PRO badges")
    with open('src/components/CustomWidgetPanel.ts', 'r+', encoding='utf-8') as f:
        f.seek(0); f.write('\n'.join(lines)); f.truncate()
swap('src/components/WidgetChatModal.ts',
     "  const proBadgeHtml = isPro ? `<span class=\"widget-pro-badge\">${escapeHtml(t('widgets.proBadge'))}</span>` : '';",
     f"  const proBadgeHtml = ''; // {TAG}: no PRO badge on EMON", 'widget chat PRO badge removed')
swap('src/components/CountryHistory.ts', """    if (this.days >= data.allowedDays && data.allowedDays < 365) {
      const upsell = this.element('a', t(data.allowedDays <= 7 ? 'countryHistory.unlock90' : 'countryHistory.unlock365'), 'panel-locked-cta');
      upsell.href = '/pro#pricing';
      this.mount.append(upsell);
    }
""", f"    // {TAG}: no 'Unlock 90 days with Pro' link on EMON\n", '"Unlock 90 days with Pro" link removed')
swap('src/components/Panel.ts', "import { getSecretState } from '@/services/runtime-config';\n", '', 'unused import after badge removal')

print('\n'.join(changed))
print(f'DONE {len(changed)} changes')
