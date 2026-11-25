"""EMON (her complaint 2026-11-21: "i still can't click on the conflict items or explosions or fire n shit").
  - Conflict-event dots (UCDP layer) were not clickable at all: now they are.
  - Every click on a map marker also fires the window event 'nvii-map-pick' with {layerId, object, x, y, coordinate},
    so block nvii-pick-v1 in selfhost/selfhost-channels.js can show details for markers that have no popup of their own
    (conflict events, and fires when the build has the satellite fire popup switched off).
Re-runnable. Run from the repo root:  python3 selfhost/patch_pick.py"""
p = 'src/components/DeckGLMap.ts'
s = open(p).read()
if 'nvii-map-pick' in s:
    print('already')
else:
    a = "      radiusMinPixels: 3,\n      radiusMaxPixels: 20,\n      pickable: false,\n    });\n  }\n\n  private createDisplacementArcsLayer"
    assert s.count(a) == 1, s.count(a)
    s = s.replace(a, a.replace("pickable: false", "pickable: true, // nvii-map-pick"))
    b = "    const layerId = rawClickLayerId.endsWith('-ghost') ? rawClickLayerId.slice(0, -6) : rawClickLayerId;\n"
    assert s.count(b) == 1, s.count(b)
    s = s.replace(b, b +
        "    try { // nvii-map-pick: let the EMON add-on show details for markers without their own popup\n"
        "      window.dispatchEvent(new CustomEvent('nvii-map-pick', { detail: { layerId, object: info.object, x: info.x, y: info.y, coordinate: info.coordinate } }));\n"
        "    } catch { /* never block the normal click */ }\n")
    open(p, 'w').write(s)
    print('patched')
