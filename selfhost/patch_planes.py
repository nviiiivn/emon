"""EMON live aircraft layer (her go, 2026-11-20): light version of God's Eye's planes.
Shown with the Aviation ("flights") map layer. Reads /camproxy/planes.json (Pi: ~/services/emon-feeds/camproxy.py,
a shared 15 s cache in front of adsb.fi, so viewers cannot get the IP throttled) for the area the map is looking at.
Only fetches when zoomed in to 4.5 or closer; refreshes every 20 s and after each map move. Military aircraft are red.
Plain MapLibre symbol layer, same style as patch_overlays.py. Needs patch_overlays.py applied first. Re-runnable.
Run from the repo root:  python3 selfhost/patch_planes.py"""
import sys
p = 'src/components/DeckGLMap.ts'
s = open(p).read()
if 'nvii-planes' in s:
    print('already'); sys.exit(0)
if 'nvii-overlays' not in s:
    sys.exit('apply selfhost/patch_overlays.py first')

METHODS = r'''
  // ---- nvii-planes (EMON): live aircraft near the map centre, shown with the Aviation layer ----
  private nviiPlaneTimer: ReturnType<typeof setInterval> | null = null;
  private nviiPlaneBound = false;

  private nviiPlaneIcons(map: maplibregl.Map): void {
    for (const [name, color] of [['nvii-plane-civ', '#ffd60a'], ['nvii-plane-mil', '#ff3b30']] as const) {
      if (map.hasImage(name)) continue;
      const size = 32;
      const c = document.createElement('canvas');
      c.width = size; c.height = size;
      const g = c.getContext('2d');
      if (!g) continue;
      g.beginPath(); // arrow pointing north; the layer rotates it to the aircraft's track
      g.moveTo(16, 2); g.lineTo(27, 29); g.lineTo(16, 22); g.lineTo(5, 29); g.closePath();
      g.fillStyle = color; g.fill();
      g.lineWidth = 2; g.strokeStyle = 'rgba(0,0,0,0.85)'; g.stroke();
      const img = g.getImageData(0, 0, size, size);
      map.addImage(name, { width: size, height: size, data: new Uint8Array(img.data.buffer) });
    }
  }

  private async nviiPlaneFetch(): Promise<void> {
    const map = this.maplibreMap;
    const src = map?.getSource('nvii-planes') as (maplibregl.GeoJSONSource | undefined);
    if (!map || !src) return;
    if (map.getZoom() < 4.5) { src.setData(JSON.parse('{"type":"FeatureCollection","features":[]}')); return; }
    const c = map.getCenter();
    const r = map.getZoom() >= 7 ? 120 : 250;
    try {
      const resp = await fetch(`/camproxy/planes.json?lat=${c.lat.toFixed(1)}&lon=${c.lng.toFixed(1)}&r=${r}`);
      if (!resp.ok) return;
      const data = await resp.json();
      (this.maplibreMap?.getSource('nvii-planes') as (maplibregl.GeoJSONSource | undefined))?.setData(data);
    } catch { /* keep the last positions */ }
  }

  private syncNviiPlanes(map: maplibregl.Map): void {
    const want = !!this.state.layers.flights;
    if (want && !map.getSource('nvii-planes')) {
      this.nviiPlaneIcons(map);
      map.addSource('nvii-planes', { type: 'geojson', data: JSON.parse('{"type":"FeatureCollection","features":[]}') });
      map.addLayer({
        id: 'nvii-planes-layer', type: 'symbol', source: 'nvii-planes',
        layout: {
          'icon-image': ['case', ['get', 'mil'], 'nvii-plane-mil', 'nvii-plane-civ'],
          'icon-size': ['interpolate', ['linear'], ['zoom'], 4, 0.3, 8, 0.55, 11, 0.8],
          'icon-rotate': ['get', 'track'], 'icon-rotation-alignment': 'map',
          'icon-allow-overlap': true, 'icon-ignore-placement': true,
        },
      });
      if (!this.nviiPlaneBound) {
        this.nviiPlaneBound = true;
        map.on('moveend', () => { void this.nviiPlaneFetch(); });
        map.on('click', 'nvii-planes-layer', (e) => {
          const f = e.features?.[0];
          if (!f) return;
          const pr = f.properties as Record<string, unknown>;
          const box = document.createElement('div');
          const title = document.createElement('strong');
          title.textContent = `${String(pr.flight || pr.reg || pr.hex || 'Aircraft')}${pr.mil ? ' (military)' : ''}`;
          const l1 = document.createElement('div');
          l1.textContent = String(pr.desc || pr.type || 'type unknown');
          const l2 = document.createElement('div');
          l2.textContent = pr.ground ? 'on the ground' : `${Number(pr.alt ?? 0).toLocaleString()} ft · ${String(pr.gs ?? 0)} kt · heading ${String(pr.track ?? 0)}°`;
          box.append(title, l1, l2);
          new maplibregl.Popup({ closeButton: true, maxWidth: '260px' }).setLngLat(e.lngLat).setDOMContent(box).addTo(map);
        });
      }
      if (!this.nviiPlaneTimer) {
        this.nviiPlaneTimer = setInterval(() => { if (!document.hidden) void this.nviiPlaneFetch(); }, 20000);
      }
      void this.nviiPlaneFetch();
    } else if (!want && map.getSource('nvii-planes')) {
      if (map.getLayer('nvii-planes-layer')) map.removeLayer('nvii-planes-layer');
      map.removeSource('nvii-planes');
      if (this.nviiPlaneTimer) { clearInterval(this.nviiPlaneTimer); this.nviiPlaneTimer = null; }
    }
  }

'''
anchor = "  private startWeatherRadar(): void {\n"
assert s.count(anchor) == 1
s = s.replace(anchor, METHODS + anchor)
hook = "    } catch (err) { console.warn('[DeckGLMap] nvii overlays failed:', (err as Error)?.message); }\n"
assert s.count(hook) == 1
s = s.replace(hook, "      this.syncNviiPlanes(map); // nvii-planes\n" + hook)
open(p, 'w').write(s)
print('patched')
