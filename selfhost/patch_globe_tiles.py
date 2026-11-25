"""EMON 3D view (her complaint 2026-11-21: "it looks super bad"): the 3D globe wraps ONE fixed picture around the Earth,
so it turns to mush when you zoom in. This switches the globe to real satellite imagery loaded as map tiles, sharp at
every zoom: "Sentinel-2 cloudless" by EOX (free for non-commercial use with credit; credit line added on the globe).
Uses the tile engine already built into the installed globe library (three-globe 2.45). EMON host only.
Re-runnable. Run from the repo root:  python3 selfhost/patch_globe_tiles.py"""
p = 'src/components/GlobeMap.ts'
s = open(p).read()
if 'nvii-globe-tiles' in s:
    print('already')
else:
    anchor = "    // Globe attribution (texture + OpenStreetMap data)\n"
    assert s.count(anchor) == 1
    add = r"""    // nvii-globe-tiles (EMON): real satellite imagery as map tiles instead of one stretched picture
    const nviiTiles = /^emon\./.test(location.hostname);
    try {
      if (nviiTiles) {
        const g = globe as unknown as {
          globeTileEngineUrl?: (fn: (x: number, y: number, l: number) => string) => unknown;
          globeTileEngineMaxLevel?: (n: number) => unknown;
        };
        g.globeTileEngineUrl?.((x, y, l) => `https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/${l}/${y}/${x}.jpg`);
        g.globeTileEngineMaxLevel?.(13);
      }
    } catch { /* keep the single-picture globe */ }

"""
    s = s.replace(anchor, add + anchor)
    old = "    this.container.appendChild(attribution);\n\n    // Upgrade material to MeshStandardMaterial"
    assert s.count(old) == 1
    s = s.replace(old, "    if (nviiTiles) { const eox = document.createElement('span'); eox.textContent = ' · Imagery: Sentinel-2 cloudless by EOX (contains modified Copernicus Sentinel data 2020)'; attribution.appendChild(eox); } // nvii-globe-tiles\n" + old)
    open(p, 'w').write(s)
    print('patched')
