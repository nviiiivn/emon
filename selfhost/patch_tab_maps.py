"""EMON: every dashboard tab remembers its own map (her ask 2026-11-20: missions become tabs inside their edition,
and she adds her own). Upstream tabs hold panels only; this adds the map layers, position and time range.
  - src/services/tab-store.ts : PanelTab gets optional `nviiMap`.
  - src/app/panel-layout.ts   : leaving a tab saves its map into nviiMap; entering a tab with nviiMap fires the
                                window event 'nvii-tab-map'.
  - src/app/event-handlers.ts : listens for 'nvii-tab-map' and applies layers / position / time range through the same
                                calls the Mission picker uses (so newly switched-on layers load their data).
Tabs are seeded per edition by block nvii-mission-tabs-v1 in selfhost/selfhost-channels.js.
Re-runnable. Run from the repo root:  python3 selfhost/patch_tab_maps.py"""
import sys

def edit(path, pairs, marker):
    s = open(path).read()
    if marker in s:
        return False
    for old, new in pairs:
        assert s.count(old) == 1, (path, old[:60], s.count(old))
        s = s.replace(old, new)
    open(path, 'w').write(s)
    return True

done = []
done.append(edit('src/services/tab-store.ts', [(
    "  panelFilters?: PanelFilters;\n}\n",
    "  panelFilters?: PanelFilters;\n"
    "  /** nvii-tab-map (EMON): the map layers, position and time range this tab shows. */\n"
    "  nviiMap?: { layers?: Record<string, boolean>; lat?: number; lon?: number; zoom?: number; view?: string; timeRange?: string };\n}\n",
)], 'nvii-tab-map'))

done.append(edit('src/app/panel-layout.ts', [
    ("    Object.assign(active, snapshot);\n",
     "    Object.assign(active, snapshot);\n"
     "    try { // nvii-tab-map: each tab remembers its own map\n"
     "      const c = this.ctx.map?.getCenter();\n"
     "      active.nviiMap = {\n"
     "        layers: { ...this.ctx.mapLayers } as unknown as Record<string, boolean>,\n"
     "        lat: c?.lat, lon: c?.lon, zoom: this.ctx.map?.getState().zoom, timeRange: this.ctx.map?.getTimeRange(),\n"
     "      };\n"
     "    } catch { /* keep the map it had */ }\n"),
    ("    this.applyTabPanelState(target.panelSettings, target.panelOrder, target.bottomSet);\n",
     "    this.applyTabPanelState(target.panelSettings, target.panelOrder, target.bottomSet);\n"
     "    if (target.nviiMap) window.dispatchEvent(new CustomEvent('nvii-tab-map', { detail: target.nviiMap })); // nvii-tab-map\n"),
], 'nvii-tab-map'))

METHOD = r'''
  // nvii-tab-map (EMON): apply the map a dashboard tab carries (layers, position, time range).
  private applyNviiTabMap(m: { layers?: Record<string, boolean>; lat?: number; lon?: number; zoom?: number; view?: string; timeRange?: string } | null | undefined): void {
    if (!m || this.ctx.isDestroyed) return;
    try {
      if (m.layers) {
        const next = { ...this.getMissionDefaultLayers() } as unknown as Record<string, boolean>;
        for (const k of Object.keys(next)) next[k] = m.layers[k] === true;
        const mapLayers = this.filterMissionLayersForCurrentRenderer(next as unknown as MapLayers);
        const previous = { ...this.ctx.mapLayers };
        this.ctx.mapLayers = mapLayers;
        saveToStorage(STORAGE_KEYS.mapLayers, mapLayers);
        this.ctx.map?.setLayers(mapLayers);
        this.applyMissionMapLayerTransitions(previous, mapLayers);
      }
      if (typeof m.lat === 'number' && typeof m.lon === 'number') this.ctx.map?.setCenter(m.lat, m.lon, m.zoom);
      else if (m.view) this.ctx.map?.setView(m.view as MapView, m.zoom);
      if (m.timeRange) this.ctx.map?.setTimeRange(m.timeRange as Parameters<NonNullable<typeof this.ctx.map>['setTimeRange']>[0]);
      this.callbacks.syncDataFreshnessWithLayers();
      this.scheduleMissionDataRefresh();
      this.syncUrlState();
    } catch (err) { console.warn('[nvii-tab-map] failed:', (err as Error)?.message); }
  }

'''
done.append(edit('src/app/event-handlers.ts', [
    ("  private applyMissionPreset(presetId: MissionPresetId, source: 'user' | 'agent' = 'user'): boolean {\n",
     METHOD + "  private applyMissionPreset(presetId: MissionPresetId, source: 'user' | 'agent' = 'user'): boolean {\n"),
    ("    this.setupSearchControls();\n    this.setupEventListeners();\n",
     "    this.setupSearchControls();\n    this.setupEventListeners();\n"
     "    window.addEventListener('nvii-tab-map', ((e: Event) => { this.applyNviiTabMap((e as CustomEvent).detail); }) as EventListener); // nvii-tab-map\n"),
], 'nvii-tab-map'))
print('patched' if any(done) else 'already', done)
