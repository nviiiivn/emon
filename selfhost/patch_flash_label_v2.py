"""EMON (her ask 2026-11-20), on top of patch_flash_label.py: when many headlines land at once the labels piled up
and the white circles sat on the map for 12 s. Now: circles pulse for 3 s; at most 2 labels beside circles; and a
small "Live pulse" box in the map's bottom-left corner always shows the last headline that flashed. Click it to
open the last 12 (source, headline, time); click a row to open the article, hover a row to flash its place again.
Marker nvii-pulse-log. Re-runnable. Run from the repo root:  python3 selfhost/patch_flash_label_v2.py"""
p = 'src/components/DeckGLMap.ts'
s = open(p).read()
if 'nvii-pulse-log' in s:
    print('already'); raise SystemExit
assert 'nvii-flash-label' in s, 'apply selfhost/patch_flash_label.py first'

a = "      setTimeout(() => flashMarker.remove(), durationMs);\n      // nvii-flash-label: say what the flash is (news source + headline), clickable\n      if (info?.title) {\n        const old = wrapper.querySelectorAll('.nvii-flash-label');\n        for (let i = 0; i + 3 < old.length; i++) old[i]!.remove();\n"
assert s.count(a) == 1
s = s.replace(a, "      setTimeout(() => flashMarker.remove(), info ? 3000 : durationMs); // nvii-pulse-log: short pulse, the log keeps the text\n      // nvii-flash-label: say what the flash is (news source + headline), clickable\n      if (info?.title) this.nviiPulseLogAdd(wrapper as HTMLElement, lat, lon, info);\n      if (info?.title && wrapper.querySelectorAll('.nvii-flash-label').length < 2) {\n")

METHOD = r'''
  // ---- nvii-pulse-log (EMON): what the last "Live Event Pulse" flashes were ----
  private nviiPulses: Array<{ lat: number; lon: number; title: string; source: string; link: string; at: number }> = [];
  private nviiPulseOpen = false;

  private nviiPulseLogAdd(wrapper: HTMLElement, lat: number, lon: number, info: { title: string; source?: string; link?: string }): void {
    const link = info.link && /^https?:\/\//i.test(info.link) ? info.link : '';
    if (this.nviiPulses.some((x) => x.title === info.title)) return;
    this.nviiPulses.unshift({ lat, lon, title: info.title, source: info.source || 'News', link, at: Date.now() });
    this.nviiPulses.length = Math.min(this.nviiPulses.length, 12);
    this.nviiPulseLogRender(wrapper);
  }

  private nviiPulseLogRender(wrapper: HTMLElement): void {
    let box = wrapper.querySelector('.nvii-pulse-log') as HTMLElement | null;
    if (!box) {
      box = document.createElement('div');
      box.className = 'nvii-pulse-log';
      box.style.cssText = 'position:absolute;left:96px;bottom:8px;z-index:1002;max-width:min(460px,60%);font-size:12px;line-height:1.35;background:var(--bg-secondary,#111);color:var(--text,#eee);border:1px solid var(--border,#444);box-shadow:0 2px 10px rgba(0,0,0,.6);pointer-events:auto;';
      wrapper.appendChild(box);
    }
    box.replaceChildren();
    const short = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 3)}...` : t);
    const head = document.createElement('div');
    head.style.cssText = 'padding:5px 9px;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
    head.title = 'Headlines that just flashed on the map. Click to show or hide the list.';
    const tag = document.createElement('strong');
    tag.style.color = 'var(--accent,#fff)';
    tag.textContent = `${this.nviiPulseOpen ? '▾' : '▸'} Live pulse (${this.nviiPulses.length}): `;
    const latest = this.nviiPulses[0];
    head.append(tag, document.createTextNode(latest ? `${latest.source}: ${short(latest.title, 70)}` : ''));
    head.addEventListener('click', (ev) => { ev.stopPropagation(); this.nviiPulseOpen = !this.nviiPulseOpen; this.nviiPulseLogRender(wrapper); });
    box.appendChild(head);
    if (!this.nviiPulseOpen) return;
    const list = document.createElement('div');
    list.style.cssText = 'max-height:240px;overflow-y:auto;border-top:1px solid var(--border,#444);';
    for (const pulse of this.nviiPulses) {
      const row = document.createElement('div');
      row.style.cssText = `padding:5px 9px;border-bottom:1px solid var(--border,#333);cursor:${pulse.link ? 'pointer' : 'default'};`;
      const when = new Date(pulse.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const src = document.createElement('strong');
      src.textContent = `${when} · ${pulse.source}: `;
      row.append(src, document.createTextNode(short(pulse.title, 160)));
      row.title = pulse.link ? 'Click: open the article. Hover: flash the place on the map.' : 'Hover: flash the place on the map.';
      row.addEventListener('mouseenter', () => this.flashLocation(pulse.lat, pulse.lon, 2500));
      if (pulse.link) row.addEventListener('click', (ev) => { ev.stopPropagation(); window.open(pulse.link, '_blank', 'noopener'); });
      list.appendChild(row);
    }
    box.appendChild(list);
  }

'''
anchor = "  public flashLocation(lat: number, lon: number, durationMs = 2000, info?:"
assert s.count(anchor) == 1
s = s.replace(anchor, METHOD + anchor)
open(p, 'w').write(s)
print('patched')
