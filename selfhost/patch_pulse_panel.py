#!/usr/bin/env python3
"""nvii-pulse-panel (EMON, 2026-11-24, her ask): a "Pulse" panel in the side panels that lists every white flashing
circle ("Live Event Pulse") newest first: when, source, headline, place, "Show on map", "Open article".

Run from the repo root:  python3 -I selfhost/patch_pulse_panel.py
Re-runnable: every edit checks for the marker 'nvii-pulse-panel' first.

Changes:
  src/services/nvii-pulse.ts        new: keeps the last 300 pulses of the last 24 h in localStorage 'nvii-pulse-list'
  src/components/NviiPulsePanel.ts  new: the panel
  src/app/data-loader.ts            each pulse is recorded (even with the circles switched off) + carries the place name
  src/config/panels.ts              'nvii-pulse' panel in the World edition list (so it exists for every edition)
  src/app/panel-layout.ts           registers the panel
  src/components/DeckGLMap.ts       the old bottom-left 'Live pulse' box (nvii-pulse-log) no longer shows on emon.*
  vite.config.ts                    NviiPulse panel assigned to the 'panels-risk' chunk (the build stops otherwise)
"""
import os
import sys

MARK = 'nvii-pulse-panel'


def edit(path, pairs):
    s = open(path, encoding='utf-8').read()
    if MARK in s:
        print('already patched:', path)
        return
    for old, new in pairs:
        n = s.count(old)
        if n != 1:
            sys.exit(f'STOP: expected 1 match in {path}, found {n}: {old[:80]!r}')
        s = s.replace(old, new, 1)
    open(path, 'w', encoding='utf-8').write(s)
    print('patched:', path)


def write_new(path, text):
    if os.path.exists(path) and MARK in open(path, encoding='utf-8').read():
        print('already there:', path)
        return
    if os.path.exists(path):
        sys.exit(f'STOP: {path} exists and is not ours')
    open(path, 'w', encoding='utf-8').write(text)
    print('created:', path)


STORE = r"""// nvii-pulse-panel (EMON, 2026-11-24): remembers every "Live Event Pulse" (the white flashing circle on the map) so the
// Pulse panel can say what each one was. Last 300 of the last 24 hours, in this browser only (the app fires them in bursts of ~100).
export interface NviiPulse {
  lat: number;
  lon: number;
  place: string;
  title: string;
  source: string;
  link: string;
  at: number;
  circle: boolean;
}

export const NVII_PULSE_EVENT = 'nvii-pulse';
const KEY = 'nvii-pulse-list';
const MAX = 300;
const KEEP_MS = 24 * 60 * 60 * 1000;

export function readNviiPulses(now = Date.now()): NviiPulse[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    return (raw as NviiPulse[])
      .filter((p) => !!p && typeof p.title === 'string' && typeof p.at === 'number' && now - p.at < KEEP_MS)
      .sort((a, b) => b.at - a.at)
      .slice(0, MAX);
  } catch {
    return [];
  }
}

export function recordNviiPulse(pulse: NviiPulse): void {
  const list = readNviiPulses(pulse.at).filter((p) => !(p.title === pulse.title && p.source === pulse.source));
  list.unshift(pulse);
  if (list.length > MAX) list.length = MAX;
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* storage full or blocked */ }
  try { window.dispatchEvent(new CustomEvent(NVII_PULSE_EVENT, { detail: pulse })); } catch { /* no window */ }
}
"""

PANEL = r"""// nvii-pulse-panel (EMON, 2026-11-24, her ask): what each white flashing circle on the map was, newest first.
import { Panel } from './Panel';
import { NVII_PULSE_EVENT, readNviiPulses, type NviiPulse } from '@/services/nvii-pulse';

const STYLE_ID = 'nvii-pulse-style';
const CSS = `
.nvii-pulse-row{padding:8px 2px;border-bottom:1px solid var(--border,rgba(128,128,128,.35));line-height:1.4}
.nvii-pulse-when{font-weight:700;font-size:12px}
.nvii-pulse-title{margin:2px 0;font-size:13px}
.nvii-pulse-place{font-size:12px;opacity:.8}
.nvii-pulse-row button{font:inherit;font-size:12px;color:inherit;background:transparent;border:1px solid var(--border,rgba(128,128,128,.5));padding:3px 8px;margin:5px 6px 0 0;cursor:pointer}
.nvii-pulse-new{animation:nviiPulseNew 1.6s ease-out 3}
@keyframes nviiPulseNew{0%{background:rgba(255,255,255,.22)}100%{background:transparent}}
.nvii-pulse-note{padding:8px 2px;font-size:12px;opacity:.75;line-height:1.4}
`;

const ago = (ms: number): string => {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  return `${(s / 3600).toFixed(1)} hours ago`;
};

const el = (tag: string, cls: string, text?: string): HTMLElement => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};

export class NviiPulsePanel extends Panel {
  public onLocationRequest?: (pulse: NviiPulse) => void;
  private ticker: ReturnType<typeof setInterval> | null = null;
  private readonly onPulse = (): void => this.render(true);

  constructor() {
    super({ id: 'nvii-pulse', title: 'Pulse', showCount: true });
    if (!document.getElementById(STYLE_ID)) {
      const st = document.createElement('style');
      st.id = STYLE_ID;
      st.textContent = CSS;
      document.head.appendChild(st);
    }
    window.addEventListener(NVII_PULSE_EVENT, this.onPulse);
    this.ticker = setInterval(() => this.render(false), 30_000);
    this.render(false);
  }

  private render(newest: boolean): void {
    const now = Date.now();
    const list = readNviiPulses(now);
    this.setCount(list.length);
    const frag = document.createDocumentFragment();
    if (!list.length) {
      frag.append(el('div', 'nvii-pulse-note', 'No white circles yet. When one flashes on the map, its headline shows up here.'));
    }
    list.forEach((p, i) => {
      const row = el('article', newest && i === 0 ? 'nvii-pulse-row nvii-pulse-new' : 'nvii-pulse-row');
      row.append(el('div', 'nvii-pulse-when', `${ago(now - p.at)} · ${p.source || 'News'}`));
      row.append(el('div', 'nvii-pulse-title', p.title));
      row.append(el('div', 'nvii-pulse-place', `Circle on: ${p.place || 'a watched place'}${p.circle ? '' : ' (circles were off)'}`));
      const show = el('button', '', 'Show on map') as HTMLButtonElement;
      show.type = 'button';
      show.addEventListener('click', () => this.onLocationRequest?.(p));
      row.append(show);
      if (/^https?:\/\//i.test(p.link)) {
        const open = el('button', '', 'Open article') as HTMLButtonElement;
        open.type = 'button';
        open.addEventListener('click', () => { window.open(p.link, '_blank', 'noopener'); });
        row.append(open);
      }
      frag.append(row);
    });
    frag.append(el('div', 'nvii-pulse-note',
      'A white circle flashes on the map when a new headline names one of the places the app watches '
      + '(capitals, straits, hotspots, war zones). It means that place is in the news, not that something happened '
      + 'on that exact spot. Each one stays in this list for 24 hours. Circles off or on: gear menu, "Live Event Pulse".'));
    this.content.replaceChildren(frag);
  }

  public override destroy(): void {
    window.removeEventListener(NVII_PULSE_EVENT, this.onPulse);
    if (this.ticker !== null) clearInterval(this.ticker);
    this.ticker = null;
    super.destroy();
  }
}
"""

write_new('src/services/nvii-pulse.ts', STORE)
write_new('src/components/NviiPulsePanel.ts', PANEL)

edit('src/app/data-loader.ts', [
    ("import { INTEL_HOTSPOTS, CONFLICT_ZONES } from '@/config/geo';\n",
     "import { INTEL_HOTSPOTS, CONFLICT_ZONES } from '@/config/geo';\n"
     "import { recordNviiPulse } from '@/services/nvii-pulse'; // nvii-pulse-panel\n"),
    ("  private findFlashLocation(title: string): { lat: number; lon: number } | null {\n",
     "  private findFlashLocation(title: string): { lat: number; lon: number; name?: string } | null { // nvii-pulse-panel: + place name\n"),
    ("    let bestMatch: { lat: number; lon: number; matches: number } | null = null;\n",
     "    let bestMatch: { lat: number; lon: number; matches: number; name?: string } | null = null;\n"),
    ("        bestMatch = { lat: hotspot.lat, lon: hotspot.lon, matches };\n",
     "        bestMatch = { lat: hotspot.lat, lon: hotspot.lon, matches, name: hotspot.name };\n"),
    ("        bestMatch = { lat: conflict.center[1], lon: conflict.center[0], matches };\n",
     "        bestMatch = { lat: conflict.center[1], lon: conflict.center[0], matches, name: conflict.name };\n"),
    ("    if (!getAiFlowSettings().mapNewsFlash) return;\n    const now = Date.now();\n",
     "    const nviiCircles = getAiFlowSettings().mapNewsFlash; // nvii-pulse-panel: the Pulse panel lists them even with the circles off\n    const now = Date.now();\n"),
    ("      this.ctx.map.flashLocation(location.lat, location.lon, 12000, { title: item.title, source: item.source, link: item.link }); // nvii-flash-label\n",
     "      if (nviiCircles) this.ctx.map.flashLocation(location.lat, location.lon, 12000, { title: item.title, source: item.source, link: item.link }); // nvii-flash-label\n"
     "      recordNviiPulse({ lat: location.lat, lon: location.lon, place: location.name || '', title: item.title, source: item.source || '', link: item.link || '', at: now, circle: nviiCircles }); // nvii-pulse-panel\n"),
])

edit('src/config/panels.ts', [
    ("  'live-news': { name: 'Live News', enabled: true, priority: 1 },\n",
     "  'live-news': { name: 'Live News', enabled: true, priority: 1 },\n"
     "  'nvii-pulse': { name: 'Pulse', enabled: true, priority: 1 }, // nvii-pulse-panel (EMON)\n"),
])

edit('src/app/panel-layout.ts', [
    ("    this.lazyDefaultPanel('disease-outbreaks', () => import('@/components/DiseaseOutbreaksPanel'), 'DiseaseOutbreaksPanel');\n",
     "    this.lazyImportedPanel('nvii-pulse', () => import('@/components/NviiPulsePanel'), 'NviiPulsePanel', (NviiPulsePanel) => { // nvii-pulse-panel\n"
     "      const p = new NviiPulsePanel();\n"
     "      p.onLocationRequest = (pulse) => {\n"
     "        if (this.ctx.isMobile) this.revealMobileMap();\n"
     "        this.ctx.map?.setCenter(pulse.lat, pulse.lon, 5);\n"
     "        setTimeout(() => this.ctx.map?.flashLocation(pulse.lat, pulse.lon, 6000, { title: pulse.title, source: pulse.source, link: pulse.link }), 1200);\n"
     "      };\n"
     "      return p;\n"
     "    });\n\n"
     "    this.lazyDefaultPanel('disease-outbreaks', () => import('@/components/DiseaseOutbreaksPanel'), 'DiseaseOutbreaksPanel');\n"),
])

edit('vite.config.ts', [   # the build refuses panel components that are not assigned to a chunk
    ("  DiseaseOutbreaks: 'panels-risk',\n",
     "  DiseaseOutbreaks: 'panels-risk',\n"
     "  NviiPulse: 'panels-risk', // nvii-pulse-panel (EMON)\n"),
])

edit('src/components/DeckGLMap.ts', [
    ("      if (info?.title) this.nviiPulseLogAdd(wrapper as HTMLElement, lat, lon, info);\n",
     "      if (info?.title && !/^emon\\./.test(location.hostname)) this.nviiPulseLogAdd(wrapper as HTMLElement, lat, lon, info); // nvii-pulse-panel: EMON lists them in the Pulse panel\n"),
])
print('DONE')
