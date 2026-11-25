// nvii-pulse-panel (EMON, 2026-11-24): remembers every "Live Event Pulse" (the white flashing circle on the map) so the
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
