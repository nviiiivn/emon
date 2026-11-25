"""EMON fix (her report 2026-11-20): Fires layer switched on by a link or a saved layout showed nothing until it was
unticked and reticked. Cause: at start-up fire data is loaded only when the Satellite Fires PANEL is on or the
Natural Events layer is on, and the periodic refresh only runs while that panel is near the viewport. The Fires map
layer itself was never a trigger (only the toggle path, loadDataForLayer('fires'), loads it).
Fix: the Fires map layer being on also triggers the start-up load and keeps the refresh running.
Re-runnable. Run from the repo root:  python3 selfhost/patch_fires_boot.py"""
import sys
changed = False

p = 'src/app/data-loader.ts'
s = open(p).read()
old = "(shouldLoad('satellite-fires') || this.ctx.mapLayers.natural)) {"
new = "(shouldLoad('satellite-fires') || this.ctx.mapLayers.natural || this.ctx.mapLayers.fires)) { // nvii-fires-boot"
if 'nvii-fires-boot' not in s:
    assert s.count(old) == 1, 'data-loader anchor'
    open(p, 'w').write(s.replace(old, new)); changed = True

p = 'src/App.ts'
s = open(p).read()
old = "    return this.isPanelNearViewport('satellite-fires');\n"
new = "    return this.isPanelNearViewport('satellite-fires') || this.state.mapLayers.fires; // nvii-fires-boot\n"
if 'nvii-fires-boot' not in s:
    assert s.count(old) == 1, 'App anchor'
    open(p, 'w').write(s.replace(old, new)); changed = True
print('patched' if changed else 'already')
