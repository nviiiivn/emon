"""EMON (her ask 2026-11-20): the white "Live Event Pulse" circles flashed on the map with no way to tell what they
were. Now each flash carries a small label with the news source and headline next to the circle, stays 12 seconds,
and a click on the label opens the article. At most 4 labels at once; they go away when the map is moved.
Marker nvii-flash-label. Re-runnable. Run from the repo root:  python3 selfhost/patch_flash_label.py"""
changed = []

p = 'src/components/DeckGLMap.ts'
s = open(p).read()
if 'nvii-flash-label' not in s:
    a = "  public flashLocation(lat: number, lon: number, durationMs = 2000): void {\n    // Don't pan - project coordinates to screen position\n"
    assert s.count(a) == 1
    s = s.replace(a, "  public flashLocation(lat: number, lon: number, durationMs = 2000, info?: { title: string; source?: string; link?: string }): void { // nvii-flash-label\n    // Don't pan - project coordinates to screen position\n")
    b = "    const wrapper = this.container.querySelector('.deckgl-map-wrapper');\n    if (wrapper) {\n      wrapper.appendChild(flashMarker);\n      setTimeout(() => flashMarker.remove(), durationMs);\n    }\n"
    assert s.count(b) == 1
    s = s.replace(b, """    const wrapper = this.container.querySelector('.deckgl-map-wrapper');
    if (wrapper) {
      wrapper.appendChild(flashMarker);
      setTimeout(() => flashMarker.remove(), durationMs);
      // nvii-flash-label: say what the flash is (news source + headline), clickable
      if (info?.title) {
        const old = wrapper.querySelectorAll('.nvii-flash-label');
        for (let i = 0; i + 3 < old.length; i++) old[i]!.remove();
        const label = document.createElement('div');
        label.className = 'nvii-flash-label';
        const leftSide = screenPos.x > (wrapper as HTMLElement).clientWidth - 330;
        label.style.cssText = `position:absolute;top:${screenPos.y}px;${leftSide ? `right:${(wrapper as HTMLElement).clientWidth - screenPos.x + 28}px` : `left:${screenPos.x + 28}px`};transform:translateY(-50%);max-width:300px;padding:5px 9px;font-size:12px;line-height:1.3;background:var(--bg-secondary,#111);color:var(--text,#eee);border:1px solid var(--accent,#fff);box-shadow:0 2px 10px rgba(0,0,0,.6);z-index:1001;pointer-events:auto;cursor:${info.link ? 'pointer' : 'default'};`;
        const src = document.createElement('strong');
        src.textContent = info.source ? `${info.source}: ` : 'News: ';
        const text = document.createElement('span');
        text.textContent = info.title.length > 140 ? `${info.title.slice(0, 137)}...` : info.title;
        label.append(src, text);
        const link = info.link;
        if (link && /^https?:\\/\\//i.test(link)) {
          label.title = 'Open the article';
          label.addEventListener('click', (ev) => { ev.stopPropagation(); window.open(link, '_blank', 'noopener'); });
        }
        wrapper.appendChild(label);
        const drop = () => label.remove();
        setTimeout(drop, durationMs);
        this.maplibreMap?.once('movestart', drop);
      }
    }
""")
    open(p, 'w').write(s); changed.append(p)

p = 'src/components/MapContainer.ts'
s = open(p).read()
if 'nvii-flash-label' not in s:
    a = "  public flashLocation(lat: number, lon: number, durationMs?: number): void {\n    if (this.useGlobe) { this.globeMap?.flashLocation(lat, lon, durationMs); return; }\n    if (this.useDeckGL) {\n      this.deckGLMap?.flashLocation(lat, lon, durationMs);\n"
    assert s.count(a) == 1
    s = s.replace(a, "  public flashLocation(lat: number, lon: number, durationMs?: number, info?: { title: string; source?: string; link?: string }): void { // nvii-flash-label\n    if (this.useGlobe) { this.globeMap?.flashLocation(lat, lon, durationMs); return; }\n    if (this.useDeckGL) {\n      this.deckGLMap?.flashLocation(lat, lon, durationMs, info);\n")
    open(p, 'w').write(s); changed.append(p)

p = 'src/app/data-loader.ts'
s = open(p).read()
if 'nvii-flash-label' not in s:
    a = "      this.ctx.map.flashLocation(location.lat, location.lon);\n      this.mapFlashCache.set(cacheKey, now);\n"
    assert s.count(a) == 1
    s = s.replace(a, "      this.ctx.map.flashLocation(location.lat, location.lon, 12000, { title: item.title, source: item.source, link: item.link }); // nvii-flash-label\n      this.mapFlashCache.set(cacheKey, now);\n")
    open(p, 'w').write(s); changed.append(p)

print('patched', changed if changed else 'already')
