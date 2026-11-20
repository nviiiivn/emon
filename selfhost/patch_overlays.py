"""EMON map overlays from God's Eye (her go, 2026-11-19), stage 1 + 3:
  - Lightning strike density (NOAA nowCOAST WMS, keyless) shown with the Weather Alerts layer, next to the rain radar.
  - Wildfire outlines (her feed /local/fire-perimeters.json: name, acres, containedPct) shown with the Fires layer;
    click an outline for its name, size and containment.
Both are plain MapLibre layers under the app's own markers. Re-runnable. Run from the repo root."""
import sys
p = 'src/components/DeckGLMap.ts'
s = open(p).read()
if 'nvii-overlays' in s:
    print('already'); sys.exit(0)

METHODS = r'''
  // ---- nvii-overlays (EMON): lightning with Weather Alerts, wildfire outlines with Fires ----
  private nviiFireTimer: ReturnType<typeof setInterval> | null = null;
  private nviiFireClickBound = false;
  private nviiRetries = 0;

  private syncNviiOverlays(): void {
    const map = this.maplibreMap;
    // The map may not exist yet at startup, and isStyleLoaded() is also false while tiles are still loading
    // (after 'style.load' already fired), so retry on a timer instead of waiting for an event.
    if (!map || !map.isStyleLoaded()) { if (this.nviiRetries++ < 60) setTimeout(() => this.syncNviiOverlays(), 1500); return; }
    this.nviiRetries = 0;
    const beforeId = map.getLayer('country-interactive') ? 'country-interactive' : undefined;
    try {
      // Lightning
      const wantLightning = !!this.state.layers.weather;
      if (wantLightning && !map.getSource('nvii-lightning')) {
        map.addSource('nvii-lightning', {
          type: 'raster',
          tiles: ['https://nowcoast.noaa.gov/geoserver/observations/lightning_detection/ows?service=WMS&version=1.1.1&request=GetMap&layers=ldn_lightning_strike_density&styles=&format=image/png&transparent=true&srs=EPSG:3857&width=256&height=256&bbox={bbox-epsg-3857}'],
          tileSize: 256,
          attribution: 'Lightning: NOAA nowCOAST',
        });
        map.addLayer({ id: 'nvii-lightning-layer', type: 'raster', source: 'nvii-lightning', paint: { 'raster-opacity': 0.8 } }, beforeId);
      } else if (!wantLightning && map.getSource('nvii-lightning')) {
        if (map.getLayer('nvii-lightning-layer')) map.removeLayer('nvii-lightning-layer');
        map.removeSource('nvii-lightning');
      }
      // Wildfire outlines
      const wantFires = !!this.state.layers.fires;
      if (wantFires && !map.getSource('nvii-fire-perimeters')) {
        map.addSource('nvii-fire-perimeters', { type: 'geojson', data: '/local/fire-perimeters.json' });
        map.addLayer({ id: 'nvii-fire-fill', type: 'fill', source: 'nvii-fire-perimeters', paint: { 'fill-color': '#ff5a1f', 'fill-opacity': 0.22 } }, beforeId);
        map.addLayer({ id: 'nvii-fire-line', type: 'line', source: 'nvii-fire-perimeters', paint: { 'line-color': '#ff5a1f', 'line-width': 1.5 } }, beforeId);
        if (!this.nviiFireClickBound) {
          this.nviiFireClickBound = true;
          map.on('click', 'nvii-fire-fill', (e) => {
            const f = e.features?.[0];
            if (!f) return;
            const pr = f.properties as Record<string, unknown>;
            const box = document.createElement('div');
            const title = document.createElement('strong');
            title.textContent = `${String(pr.name ?? 'Wildfire')} fire`;
            const line = document.createElement('div');
            const acres = Number(pr.acres ?? 0).toLocaleString();
            const pct = pr.containedPct == null || pr.containedPct === '' ? 'containment unknown' : `${String(pr.containedPct)}% contained`;
            line.textContent = `${acres} acres · ${pct}${pr.county ? ` · ${String(pr.county)}, ${String(pr.state ?? '')}` : ''}`;
            box.append(title, line);
            new maplibregl.Popup({ closeButton: true, maxWidth: '280px' }).setLngLat(e.lngLat).setDOMContent(box).addTo(map);
          });
        }
        if (!this.nviiFireTimer) {
          this.nviiFireTimer = setInterval(() => {
            const src = this.maplibreMap?.getSource('nvii-fire-perimeters') as (maplibregl.GeoJSONSource | undefined);
            src?.setData(`/local/fire-perimeters.json?t=${Date.now()}`);
          }, 30 * 60 * 1000);
        }
      } else if (!wantFires && map.getSource('nvii-fire-perimeters')) {
        if (map.getLayer('nvii-fire-fill')) map.removeLayer('nvii-fire-fill');
        if (map.getLayer('nvii-fire-line')) map.removeLayer('nvii-fire-line');
        map.removeSource('nvii-fire-perimeters');
        if (this.nviiFireTimer) { clearInterval(this.nviiFireTimer); this.nviiFireTimer = null; }
      }
    } catch (err) { console.warn('[DeckGLMap] nvii overlays failed:', (err as Error)?.message); }
  }

'''
anchor = "  private startWeatherRadar(): void {\n"
assert s.count(anchor) == 1
s = s.replace(anchor, METHODS + anchor)

EDITS = [
  ("    if (this.state.layers.weather) {\n      this.startWeatherRadar();\n    }\n",
   "    if (this.state.layers.weather) {\n      this.startWeatherRadar();\n    }\n    this.syncNviiOverlays(); // nvii-overlays\n"),
  ("          else if (!this.state.layers.weather && prevRadar) this.stopWeatherRadar();\n",
   "          else if (!this.state.layers.weather && prevRadar) this.stopWeatherRadar();\n          this.syncNviiOverlays(); // nvii-overlays\n"),
  ("\n    else if (!this.state.layers.weather && prevRadar) this.stopWeatherRadar();\n",
   "\n    else if (!this.state.layers.weather && prevRadar) this.stopWeatherRadar();\n    this.syncNviiOverlays(); // nvii-overlays\n"),
  ("      if (layer === 'weather') this.startWeatherRadar();\n",
   "      if (layer === 'weather') this.startWeatherRadar();\n      this.syncNviiOverlays(); // nvii-overlays\n"),
]
for old, new in EDITS:
    assert s.count(old) in (1, 2), old  # the 4-space radar line appears in two setters
    s = s.replace(old, new)
open(p, 'w').write(s)
print('patched')
