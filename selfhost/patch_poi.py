"""EMON generic point layer for the add-ons in selfhost/selfhost-channels.js (her ask 2026-11-21: social posts as
clickable points on the map). The app only draws; the add-on decides what the points are.
  window event 'nvii-poi-set'  detail = GeoJSON FeatureCollection (point features; properties: color, n, plus anything)
                               -> drawn as dots on the flat map (bigger with n). Send an empty collection to clear.
  click on a dot               -> window event 'nvii-map-pick' { layerId: 'nvii-poi', object: properties, x, y, coordinate }
  map stops moving             -> window event 'nvii-map-view' { lat, lon, zoom }
Plain MapLibre circle layer, same style as patch_planes.py. Needs patch_overlays.py applied first. Re-runnable.
Run from the repo root:  python3 selfhost/patch_poi.py"""
import sys
p = 'src/components/DeckGLMap.ts'
s = open(p).read()
if 'nvii-poi' in s:
    print('already'); sys.exit(0)
if 'nvii-overlays' not in s:
    sys.exit('apply selfhost/patch_overlays.py first')

METHODS = r'''
  // ---- nvii-poi (EMON): points handed in by the selfhost add-on (window event 'nvii-poi-set') ----
  private nviiPoiBound = false;
  private nviiPoiData: unknown = JSON.parse('{"type":"FeatureCollection","features":[]}');

  private nviiPoiDraw(): void {
    const map = this.maplibreMap;
    if (!map) return;
    try {
      const src = map.getSource('nvii-poi') as (maplibregl.GeoJSONSource | undefined);
      if (src) { src.setData(this.nviiPoiData as Parameters<maplibregl.GeoJSONSource['setData']>[0]); return; }
      map.addSource('nvii-poi', { type: 'geojson', data: this.nviiPoiData as Parameters<maplibregl.GeoJSONSource['setData']>[0] });
      map.addLayer({
        id: 'nvii-poi-layer', type: 'circle', source: 'nvii-poi',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['coalesce', ['get', 'n'], 1], 1, 7, 5, 11, 20, 16],
          'circle-color': ['coalesce', ['get', 'color'], '#22d3ee'],
          'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2, 'circle-opacity': 0.92,
        },
      });
    } catch { /* style not ready yet: the next sync draws it */ }
  }

  private syncNviiPoi(map: maplibregl.Map): void {
    if (!this.nviiPoiBound) {
      this.nviiPoiBound = true;
      window.addEventListener('nvii-poi-set', ((e: Event) => { this.nviiPoiData = (e as CustomEvent).detail; this.nviiPoiDraw(); }) as EventListener);
      map.on('click', 'nvii-poi-layer', (e) => {
        const f = e.features?.[0];
        if (!f) return;
        window.dispatchEvent(new CustomEvent('nvii-map-pick', { detail: { layerId: 'nvii-poi', object: f.properties, x: e.point.x, y: e.point.y, coordinate: [e.lngLat.lng, e.lngLat.lat] } }));
      });
      map.on('mouseenter', 'nvii-poi-layer', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'nvii-poi-layer', () => { map.getCanvas().style.cursor = ''; });
      const view = () => { const c = map.getCenter(); window.dispatchEvent(new CustomEvent('nvii-map-view', { detail: { lat: c.lat, lon: c.lng, zoom: map.getZoom() } })); };
      map.on('moveend', view);
      view();
    }
    if (!map.getSource('nvii-poi')) this.nviiPoiDraw();
  }

'''
anchor = "  private startWeatherRadar(): void {\n"
assert s.count(anchor) == 1
s = s.replace(anchor, METHODS + anchor)
hook = "    } catch (err) { console.warn('[DeckGLMap] nvii overlays failed:', (err as Error)?.message); }\n"
assert s.count(hook) == 1
s = s.replace(hook, "      this.syncNviiPoi(map); // nvii-poi\n" + hook)
open(p, 'w').write(s)
print('patched')
