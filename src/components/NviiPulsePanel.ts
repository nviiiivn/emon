// nvii-pulse-panel (EMON, 2026-11-24, her ask): what each white flashing circle on the map was, newest first.
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
