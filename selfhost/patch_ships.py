"""EMON live ships layer (her complaint 2026-11-21: "I don't see ANY boats"). Upstream's Ship Traffic layer only draws
traffic density and disruptions; individual ships only appear as military "candidates". This draws every ship near the
map centre, shown with the Ship Traffic ("ais") layer, from /camproxy/ships.json (Pi: camproxy.py, a shared 30 s cache in
front of the free Open Waters AIS feed). Only when zoomed in to 6 or closer; refreshes every 30 s and after a map move.
Colours: red military, orange tanker, green cargo, blue passenger, grey other; pale when not moving.
The popup uses the app's popup class names so block nvii-enrich-v1 (selfhost-channels.js) adds flag, registry, photo.
Needs patch_overlays.py applied first. Re-runnable. Run from the repo root:  python3 selfhost/patch_ships.py"""
import sys
p = 'src/components/DeckGLMap.ts'
s = open(p).read()
if 'nvii-ships' in s:
    print('already'); sys.exit(0)
if 'nvii-overlays' not in s:
    sys.exit('apply selfhost/patch_overlays.py first')

METHODS = r'''
  // ---- nvii-ships (EMON): live ships near the map centre, shown with the Ship Traffic layer ----
  private nviiShipTimer: ReturnType<typeof setInterval> | null = null;
  private nviiShipBound = false;

  private nviiShipIcons(map: maplibregl.Map): void {
    const colors: Record<string, string> = { mil: '#ff3b30', tanker: '#ff9f0a', cargo: '#30d158', pass: '#40a9ff', other: '#c7c7cc' };
    for (const [kind, color] of Object.entries(colors)) {
      const name = `nvii-ship-${kind}`;
      if (map.hasImage(name)) continue;
      const size = 28;
      const c = document.createElement('canvas');
      c.width = size; c.height = size;
      const g = c.getContext('2d');
      if (!g) continue;
      g.beginPath(); // hull pointing north; the layer rotates it to the ship's heading
      g.moveTo(14, 2); g.lineTo(21, 11); g.lineTo(21, 25); g.lineTo(7, 25); g.lineTo(7, 11); g.closePath();
      g.fillStyle = color; g.fill();
      g.lineWidth = 2; g.strokeStyle = 'rgba(0,0,0,0.85)'; g.stroke();
      const img = g.getImageData(0, 0, size, size);
      map.addImage(name, { width: size, height: size, data: new Uint8Array(img.data.buffer) });
    }
  }

  private async nviiShipFetch(): Promise<void> {
    const map = this.maplibreMap;
    const src = map?.getSource('nvii-ships') as (maplibregl.GeoJSONSource | undefined);
    if (!map || !src) return;
    if (map.getZoom() < 6) { src.setData(JSON.parse('{"type":"FeatureCollection","features":[]}')); return; }
    const c = map.getCenter();
    try {
      const resp = await fetch(`/camproxy/ships.json?lat=${c.lat.toFixed(2)}&lon=${c.lng.toFixed(2)}&z=${Math.round(map.getZoom())}`);
      if (!resp.ok) return;
      const data = await resp.json();
      (this.maplibreMap?.getSource('nvii-ships') as (maplibregl.GeoJSONSource | undefined))?.setData(data);
    } catch { /* keep the last positions */ }
  }

  private syncNviiShips(map: maplibregl.Map): void {
    const want = !!this.state.layers.ais;
    if (want && !map.getSource('nvii-ships')) {
      this.nviiShipIcons(map);
      map.addSource('nvii-ships', { type: 'geojson', data: JSON.parse('{"type":"FeatureCollection","features":[]}') });
      map.addLayer({
        id: 'nvii-ships-layer', type: 'symbol', source: 'nvii-ships',
        layout: {
          'icon-image': ['concat', 'nvii-ship-', ['get', 'k']],
          'icon-size': ['interpolate', ['linear'], ['zoom'], 6, 0.3, 9, 0.5, 12, 0.8],
          'icon-rotate': ['get', 'dir'], 'icon-rotation-alignment': 'map',
          'icon-allow-overlap': true, 'icon-ignore-placement': true,
        },
        paint: { 'icon-opacity': ['case', ['get', 'moving'], 1, 0.55] },
      });
      if (!this.nviiShipBound) {
        this.nviiShipBound = true;
        map.on('moveend', () => { void this.nviiShipFetch(); });
        map.on('click', 'nvii-ships-layer', (e) => {
          const f = e.features?.[0];
          if (!f) return;
          const pr = f.properties as Record<string, unknown>;
          const wrap = document.createElement('div');
          const header = document.createElement('div');
          header.className = 'popup-header';
          const title = document.createElement('span');
          title.className = 'popup-title';
          title.textContent = String(pr.name || `Ship ${String(pr.mmsi ?? '')}`);
          header.append(title);
          const body = document.createElement('div');
          body.className = 'popup-body';
          const line = (text: string): void => { const d = document.createElement('div'); d.textContent = text; body.append(d); };
          const kinds: Record<string, string> = { mil: 'Military', tanker: 'Tanker', cargo: 'Cargo ship', pass: 'Passenger ship', other: 'Other vessel' };
          line(`${kinds[String(pr.k)] ?? 'Vessel'} · ${pr.moving ? `${String(pr.sog)} kts, heading ${String(pr.dir)}°` : 'not moving'}`);
          if (pr.dest) line(`Going to: ${String(pr.dest)}`);
          line(`Maritime Mobile Service Identity ${String(pr.mmsi ?? '')}`);
          if (pr.seen) line(`Last seen ${new Date(String(pr.seen)).toLocaleString()}`);
          const credit = document.createElement('div');
          credit.style.cssText = 'font-size:10px;opacity:.6;margin-top:3px';
          credit.textContent = 'Position: Open Waters AIS, AISHub';
          body.append(credit);
          wrap.append(header, body);
          new maplibregl.Popup({ closeButton: true, maxWidth: '300px' }).setLngLat(e.lngLat).setDOMContent(wrap).addTo(map);
        });
      }
      if (!this.nviiShipTimer) {
        this.nviiShipTimer = setInterval(() => { if (!document.hidden) void this.nviiShipFetch(); }, 30000);
      }
      void this.nviiShipFetch();
    } else if (!want && map.getSource('nvii-ships')) {
      if (map.getLayer('nvii-ships-layer')) map.removeLayer('nvii-ships-layer');
      map.removeSource('nvii-ships');
      if (this.nviiShipTimer) { clearInterval(this.nviiShipTimer); this.nviiShipTimer = null; }
    }
  }

'''
anchor = "  private startWeatherRadar(): void {\n"
assert s.count(anchor) == 1
s = s.replace(anchor, METHODS + anchor)
hook = "      this.syncNviiPlanes(map); // nvii-planes\n"
assert s.count(hook) == 1, 'apply selfhost/patch_planes.py first'
s = s.replace(hook, hook + "      this.syncNviiShips(map); // nvii-ships\n")
open(p, 'w').write(s)
print('patched')
