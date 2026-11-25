/**
 * Crawlable site surfaces linked from the dashboard chrome (#10461).
 *
 * The dashboard itself is a non-scrolling SPA shell, so these destinations live
 * on marketing/content pages. The compact dashboard footer no longer hosts the
 * full link row; Settings and the mobile More menu do. Keep this list as the
 * single source for both surfaces so desktop and mobile stay in parity.
 */
// nvii-mine-1: World Monitor's site pages (Countries, Chokepoints, Crises, Tools, Accuracy) do not exist on EMON.
export const DASHBOARD_REFERENCE_LINKS: ReadonlyArray<{ label: string; path: string }> = [];

/** Absolute origin used when the dashboard runs on a production hostname. */
export const DASHBOARD_SITE_ORIGIN = 'https://www.worldmonitor.app';

/**
 * Absolute www origin for desktop/public hosts; empty for local and self-hosted
 * installs so Countries/Chokepoints/… resolve against the served corpus.
 */
export function resolveDashboardSiteOrigin(options: {
  isDesktopApp: boolean;
  hostname: string;
}): string {
  return options.isDesktopApp || options.hostname.endsWith('.worldmonitor.app')
    ? DASHBOARD_SITE_ORIGIN
    : '';
}

// nvii-mine-1: only EMON's own source code (AGPL-3.0 asks for a source link); upstream Blog/Docs/Status/GitHub/X removed.
export const DASHBOARD_EXTERNAL_SITE_LINKS: ReadonlyArray<{ label: string; href: string }> = [
  { label: 'Source code', href: 'https://github.com/nviiiivn/emon' },
  { label: 'Built on koala73/worldmonitor (AGPL-3.0)', href: 'https://github.com/koala73/worldmonitor' },
];
