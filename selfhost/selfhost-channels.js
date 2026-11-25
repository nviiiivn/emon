/* EMON editions (2026-11-19): /tech, /finance, /commodity, /energy, /good-news are other editions on the
   same site. Browsers share storage across paths, and World Monitor resets panels when the edition changes,
   so each edition's panels/layers/order are parked and restored here before the app starts. EMON only. */
(function () {
  try {
    if (!/^emon\./.test(location.hostname)) return;
    document.documentElement.classList.add('nvii-emon');
    var MAP = { tech: 'tech', finance: 'finance', commodity: 'commodity', energy: 'energy', happy: 'happy', 'good-news': 'happy', war: 'war', weather: 'weather' };   // war, weather: nvii-views-v2 (the app itself runs them as World)
    var v = MAP[(location.pathname.split('/')[1] || '').toLowerCase()] || 'full';
    window.__nviiEmonEdition = v;
    var KEYS = ['worldmonitor-panels', 'worldmonitor-layers', 'panel-order', 'panel-order-bottom-set',
      'worldmonitor-panel-spans', 'worldmonitor-variant', 'worldmonitor-panel-layout-variant',
      'worldmonitor-panel-order-v1.9', 'worldmonitor-layout-reset-v2.5', 'worldmonitor-free-tier-layer-ownership',
      'worldmonitor-free-tier-source-ownership', 'worldmonitor-disabled-feeds', 'worldmonitor-disabled-feeds-schema'];
    // nvii-views-v2: World, War and Weather all run on the app's World edition, which keeps ONE tab list. Park that list
    // per edition too, so each of the three has its own tabs.
    try {
      var FAM = { full: 1, war: 1, weather: 1 }, TK = 'worldmonitor-tabs-v1:full';
      if (FAM[v]) {
        var cur = localStorage.getItem('nvii-emon-fullfam') || 'full';
        if (cur !== v) {
          var live = localStorage.getItem(TK); if (live !== null) localStorage.setItem('nvii-emon-tabs-' + cur, live);
          var mine = localStorage.getItem('nvii-emon-tabs-' + v);
          if (mine !== null) localStorage.setItem(TK, mine); else localStorage.removeItem(TK);
          localStorage.setItem('nvii-emon-fullfam', v);
        }
      }
    } catch (e2) { /* leave the tabs alone */ }
    var last = localStorage.getItem('nvii-emon-edition') || 'full';
    if (last === v) return;
    var snap = {};
    KEYS.forEach(function (k) { var x = localStorage.getItem(k); if (x !== null) snap[k] = x; });
    localStorage.setItem('nvii-emon-snap-' + last, JSON.stringify(snap));
    var saved = localStorage.getItem('nvii-emon-snap-' + v);
    KEYS.forEach(function (k) { localStorage.removeItem(k); });
    if (saved) { var o = JSON.parse(saved); Object.keys(o).forEach(function (k) { localStorage.setItem(k, o[k]); }); }
    localStorage.setItem('nvii-emon-edition', v);
  } catch (e) { /* storage blocked */ }
})();
/* nvii's copy (2026-11-19): adds the news channels from her YouTube subscriptions to Live News once per browser (only the ones that do news).
   Runs before the app reads its saved channel list. If she removes one later it stays removed
   (marker key below). Served at /selfhost-channels.js, linked by selfhost/nginx.conf.template. */
(function () {
  try {
    var KEY = 'worldmonitor-live-channels', MARK = 'nvii-selfhost-channels-v2';
    if (localStorage.getItem(MARK)) return;
    var ADD = [["PBS NewsHour", "UC6ZFN9Tx6xh-skXCuRHCDpQ"], ["Channel 5", "UC-AQKm7HUNMmxjdS371MSwg"], ["CHUPPL", "UCizJl3TxBunh-LzpwyPYg0w"], ["Zeteo", "UCVG72F2Q5yCmLQfctNK6M2A"], ["Yoonj Kim", "UCTR1ZDG4Ahy2AZXFc7-s4XQ"], ["Erin In The Morning", "UCSTIjtXqhAeUPWulw8rF0TQ"], ["uncivilized", "UCGglb26hdG81eW08n4dagUw"], ["things your mom should've told you", "UC5fMNwnRN8_Fb6jGfRUVeZw"], ["VICE News", "UCZaT_X_mc0BI-djXOlfhqWQ"]];
    var DROP = ["UCS-rn3PHxRmk8rGz5DVSPJg", "UCUNOwz9KTDIhhTTN3_ptUDA", "UCRFJclFblUdyXGdKLuWsfGQ", "UCbtV5L8TVB0zQ9khThGApLw", "UCn8zNIfYAQNdrFRrr8oibKw", "UCB6PV0cvJpzlcXRG7nz6PpQ", "UCK0z0_5uL7mb9IjntOKi5XQ", "UCUMZ7gohGI9HcU9VNsr2FJQ", "UC_-hYjoNe4PJNFa9iZ4lraA", "UCftwRNsjfRo08xYE31tkiyw", "UCwWhs_6x42TyRM4Wstoq8HA", "UCpa-Zb0ZcQjTCPP1Dx_1M8Q", "UC11aHtNnc5bEPLI4jf6mnYg", "UCeeFfhMcJa1kjtfZAGskOCA", "UCsBjURrPoezykLs9EqgamOA", "UCIFk2uvCNcEmZ77g0ESKLcQ", "UCvwo7Z0eSMpbyMSBE4Iryrg", "UCXFuoyXlvsKyOY2gPwtDFhA", "UCEOXxzW2vU0P-0THehuIIeg"]; // v1 added these too; she only wants real news here
    var s = {};
    try { s = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { s = {}; }
    var order = (s.order && s.order.length) ? s.order.slice() : ['bloomberg', 'sky', 'euronews', 'dw', 'cnn', 'france24', 'alarabiya', 'aljazeera'];
    var custom = Array.isArray(s.custom) ? s.custom.slice() : [];
    DROP.forEach(function (cid) { var id = 'custom-uc-' + cid;
      order = order.filter(function (x) { return x !== id; });
      custom = custom.filter(function (x) { return !x || x.id !== id; }); });
    ['livenow-fox', 'the-guardian'].forEach(function (id) { if (order.indexOf(id) < 0) order.push(id); });
    ADD.forEach(function (c) {
      var id = 'custom-uc-' + c[1];
      if (order.indexOf(id) < 0) order.push(id);
      if (!custom.some(function (x) { return x && x.id === id; })) custom.push({ id: id, name: c[0], channelId: c[1] });
    });
    s.order = order; s.custom = custom;
    localStorage.setItem(KEY, JSON.stringify(s));
    localStorage.setItem(MARK, '1');
  } catch (e) { /* storage blocked: the app just shows its normal list */ }
})();

/* EMON (emon.alola.lol, 2026-11-19): the same World Monitor, set up once per browser for North America
   with only nvii's chosen panels and map layers. Separate settings from worldmonitor.alola.lol because
   browsers keep storage per site. Marker key below; change things in the app afterwards and they stick. */
(function () {
  try {
    if (!/^emon\./.test(location.hostname)) return;
    if (window.__nviiEmonEdition && window.__nviiEmonEdition !== 'full') return; // /tech, /finance ... keep their own setup
    var MARK = 'nvii-emon-setup-v2';
    var LAYERS_ON = ["military", "bases", "iranAttacks", "conflicts", "hotspots", "protests", "ucdpEvents", "displacement", "ais", "flights", "aircraftEmergencies", "natural", "fires", "weather", "canadaAlerts", "climate", "reservoirLevels", "outages", "radiationWatch"];
    var q = new URLSearchParams(location.search);
    if (!q.has('lat')) {
      q.set('lat', '39.5'); q.set('lon', '-98.0'); q.set('zoom', '3.30'); q.set('view', 'global'); q.set('timeRange', '24h');
      if (!q.has('layers')) q.set('layers', LAYERS_ON.join(','));
      history.replaceState(null, '', location.pathname + '?' + q.toString() + location.hash);
    }
    /* nvii-emon-layers-v3 (2026-11-20 her ask): Military, Bases, Iran Attacks, Conflict Zones and Hotspots on.
       Browsers that already ran the v2 setup get the five switched on once. */
    if (localStorage.getItem(MARK) && !localStorage.getItem('nvii-emon-layers-v3')) {
      try { var L3 = JSON.parse(localStorage.getItem('worldmonitor-layers') || '{}');
        ['military', 'bases', 'iranAttacks', 'conflicts', 'hotspots'].forEach(function (k) { L3[k] = true; });
        localStorage.setItem('worldmonitor-layers', JSON.stringify(L3)); } catch (e3) {}
    }
    localStorage.setItem('nvii-emon-layers-v3', '1');
    if (localStorage.getItem(MARK)) return;
    // Mark the stock layout as already applied, or World Monitor resets panels to its defaults on first boot.
    localStorage.setItem('worldmonitor-variant', 'full');
    localStorage.setItem('worldmonitor-panel-layout-variant', 'full');
    localStorage.setItem('worldmonitor-panel-order-v1.9', 'done');
    localStorage.setItem('worldmonitor-layout-reset-v2.5', 'done');
    localStorage.setItem('panel-order', JSON.stringify(["live-news", "live-webcams", "windy-webcams", "threat-timeline", "social-velocity", "climate", "reservoir-levels", "population-exposure", "security-advisories", "radiation-watch", "thermal-escalation", "oref-sirens", "telegram-intel", "x-intel", "airline-intel", "cross-source-signals", "ucdp-events", "fao-food-price-index", "fuel-prices", "grocery-basket", "consumer-prices", "grid-disruption-clock", "energy-disruptions", "economic-calendar", "positioning-247", "fear-greed", "satellite-fires", "monitors", "layoffs", "supply-chain", "economic", "intel", "gdelt-intel", "cascade", "escalation-correlation", "economic-correlation", "disaster-correlation", "politics", "us"]));
    localStorage.setItem('worldmonitor-panels', JSON.stringify({"map": {"name": "Global Map", "enabled": true, "priority": 1}, "live-news": {"name": "Live News", "enabled": true, "priority": 2}, "live-webcams": {"name": "Live Webcams", "enabled": true, "priority": 3}, "windy-webcams": {"name": "Windy Live Webcam", "enabled": true, "priority": 4}, "insights": {"name": "AI Insights", "enabled": false, "priority": 3}, "threat-timeline": {"name": "Threat Timeline", "enabled": true, "priority": 5}, "strategic-posture": {"name": "AI Strategic Posture", "enabled": false, "priority": 3}, "forecast": {"name": "AI Forecasts", "enabled": false, "priority": 3}, "cii": {"name": "Country Instability", "enabled": false, "priority": 3}, "strategic-risk": {"name": "Strategic Risk Overview", "enabled": false, "priority": 3}, "intel": {"name": "Intel Feed", "enabled": true, "priority": 33}, "gdelt-intel": {"name": "Live Intelligence", "enabled": true, "priority": 34}, "cascade": {"name": "Infrastructure Cascade", "enabled": true, "priority": 35}, "military-correlation": {"name": "Force Posture", "enabled": false, "priority": 3}, "escalation-correlation": {"name": "Escalation Monitor", "enabled": true, "priority": 36}, "economic-correlation": {"name": "Economic Warfare", "enabled": true, "priority": 37}, "disaster-correlation": {"name": "Disaster Cascade", "enabled": true, "priority": 38}, "politics": {"name": "World News", "enabled": true, "priority": 39}, "us": {"name": "United States", "enabled": true, "priority": 40}, "europe": {"name": "Europe", "enabled": false, "priority": 3}, "middleeast": {"name": "Middle East", "enabled": false, "priority": 3}, "africa": {"name": "Africa", "enabled": false, "priority": 3}, "latam": {"name": "Latin America", "enabled": false, "priority": 3}, "asia": {"name": "Asia-Pacific", "enabled": false, "priority": 3}, "energy": {"name": "Energy & Resources", "enabled": false, "priority": 3}, "gov": {"name": "Government", "enabled": false, "priority": 3}, "thinktanks": {"name": "Think Tanks", "enabled": false, "priority": 3}, "polymarket": {"name": "Predictions", "enabled": false, "priority": 3}, "commodities": {"name": "Metals & Materials", "enabled": false, "priority": 3}, "energy-complex": {"name": "Energy Complex", "enabled": false, "priority": 3}, "oil-inventories": {"name": "Oil Inventories", "enabled": false, "priority": 3}, "markets": {"name": "Markets", "enabled": false, "priority": 3}, "stock-analysis": {"name": "Stock Analysis", "enabled": false, "priority": 3}, "stock-backtest": {"name": "Backtesting", "enabled": false, "priority": 3}, "daily-market-brief": {"name": "Daily Market Brief", "enabled": false, "priority": 3}, "chat-analyst": {"name": "WM Analyst", "enabled": false, "priority": 3}, "economic": {"name": "Macro Stress", "enabled": true, "priority": 32}, "global-procurement": {"name": "Global Procurement", "enabled": false, "priority": 3}, "trade-policy": {"name": "Trade Policy", "enabled": false, "priority": 3}, "supply-chain": {"name": "Supply Chain", "enabled": true, "priority": 31}, "china-corridors": {"name": "China Logistics Corridors", "enabled": false, "priority": 3}, "china-activity-nowcast": {"name": "China Activity Nowcast", "enabled": false, "priority": 3}, "finance": {"name": "Financial", "enabled": false, "priority": 3}, "tech": {"name": "Technology", "enabled": false, "priority": 3}, "crypto": {"name": "Crypto", "enabled": false, "priority": 3}, "heatmap": {"name": "Sector Heatmap", "enabled": false, "priority": 3}, "ai": {"name": "AI/ML", "enabled": false, "priority": 3}, "layoffs": {"name": "Layoffs Tracker", "enabled": true, "priority": 30}, "science": {"name": "Science", "enabled": false, "priority": 3}, "monitors": {"name": "My Monitors", "enabled": true, "priority": 29}, "latest-brief": {"name": "Latest Brief", "enabled": false, "priority": 3}, "satellite-fires": {"name": "Fires", "enabled": true, "priority": 28}, "macro-signals": {"name": "Market Regime", "enabled": false, "priority": 3}, "fear-greed": {"name": "Fear & Greed", "enabled": true, "priority": 27}, "aaii-sentiment": {"name": "AAII Sentiment", "enabled": false, "priority": 3}, "market-breadth": {"name": "Market Breadth", "enabled": false, "priority": 3}, "news-market-correlation": {"name": "News ↔ Markets", "enabled": false, "priority": 3}, "macro-tiles": {"name": "Macro Indicators", "enabled": false, "priority": 3}, "fsi": {"name": "Financial Stress", "enabled": false, "priority": 3}, "yield-curve": {"name": "Yield Curve", "enabled": false, "priority": 3}, "earnings-calendar": {"name": "Earnings Calendar", "enabled": false, "priority": 3}, "material-events": {"name": "SEC Material Events", "enabled": false, "priority": 3}, "economic-calendar": {"name": "Economic Calendar", "enabled": true, "priority": 25}, "cot-positioning": {"name": "COT Positioning", "enabled": false, "priority": 3}, "liquidity-shifts": {"name": "Liquidity Shifts", "enabled": false, "priority": 3}, "positioning-247": {"name": "24/7 Positioning", "enabled": true, "priority": 26}, "gold-intelligence": {"name": "Gold Intelligence", "enabled": false, "priority": 3}, "hormuz-tracker": {"name": "Hormuz Trade Tracker", "enabled": false, "priority": 3}, "energy-crisis": {"name": "Energy Crisis Tracker", "enabled": false, "priority": 3}, "pipeline-status": {"name": "Oil & Gas Pipeline Status", "enabled": false, "priority": 3}, "storage-facility-map": {"name": "Strategic Storage Atlas", "enabled": false, "priority": 3}, "fuel-shortages": {"name": "Global Fuel Shortage Registry", "enabled": false, "priority": 3}, "energy-disruptions": {"name": "Energy Disruptions Log", "enabled": true, "priority": 24}, "energy-risk-overview": {"name": "Global Energy Risk Overview", "enabled": false, "priority": 3}, "grid-disruption-clock": {"name": "US States Grid Disruption Clock", "enabled": true, "priority": 23}, "gulf-economies": {"name": "Gulf Economies", "enabled": false, "priority": 3}, "consumer-prices": {"name": "Consumer Prices", "enabled": true, "priority": 22}, "grocery-basket": {"name": "Grocery Index", "enabled": true, "priority": 21}, "bigmac": {"name": "Big Mac Index", "enabled": false, "priority": 3}, "fx": {"name": "FX Rates", "enabled": false, "priority": 3}, "fuel-prices": {"name": "Fuel Prices", "enabled": true, "priority": 20}, "fao-food-price-index": {"name": "FAO Food Price Index", "enabled": true, "priority": 19}, "etf-flows": {"name": "BTC ETF Tracker", "enabled": false, "priority": 3}, "stablecoins": {"name": "Stablecoins", "enabled": false, "priority": 3}, "ucdp-events": {"name": "UCDP Conflict Events", "enabled": true, "priority": 18}, "disease-outbreaks": {"name": "Disease Outbreaks", "enabled": false, "priority": 3}, "social-velocity": {"name": "Social Velocity", "enabled": true, "priority": 6}, "wsb-ticker-scanner": {"name": "WSB Ticker Scanner", "enabled": false, "priority": 3}, "giving": {"name": "Global Giving", "enabled": false, "priority": 3}, "displacement": {"name": "UNHCR Displacement", "enabled": false, "priority": 3}, "ukmto-incidents": {"name": "UKMTO Incidents", "enabled": false, "priority": 3}, "climate": {"name": "Climate Anomalies", "enabled": true, "priority": 7}, "reservoir-levels": {"name": "Strategic Water Levels", "enabled": true, "priority": 8}, "climate-news": {"name": "Climate News", "enabled": false, "priority": 3}, "population-exposure": {"name": "Population Exposure", "enabled": true, "priority": 9}, "security-advisories": {"name": "Security Advisories", "enabled": true, "priority": 10}, "sanctions-pressure": {"name": "Sanctions Pressure", "enabled": false, "priority": 3}, "defense-patents": {"name": "R&D Signal", "enabled": false, "priority": 3}, "toronto-safety": {"name": "Toronto Safety", "enabled": false, "priority": 3}, "radiation-watch": {"name": "Radiation Watch", "enabled": true, "priority": 11}, "thermal-escalation": {"name": "Thermal Escalation", "enabled": true, "priority": 12}, "oref-sirens": {"name": "Israel Sirens", "enabled": true, "priority": 13}, "telegram-intel": {"name": "Telegram Intel", "enabled": true, "priority": 14}, "x-intel": {"name": "X News Accounts", "enabled": true, "priority": 15}, "airline-intel": {"name": "Airline Intelligence", "enabled": true, "priority": 16}, "tech-readiness": {"name": "Tech Readiness Index", "enabled": false, "priority": 3}, "world-clock": {"name": "World Clock", "enabled": false, "priority": 3}, "national-debt": {"name": "Global Debt Clock", "enabled": false, "priority": 3}, "cross-source-signals": {"name": "Cross-Source Signals", "enabled": true, "priority": 17}, "market-implications": {"name": "AI Market Implications", "enabled": false, "priority": 3}, "regional-intelligence": {"name": "Regional Intelligence", "enabled": false, "priority": 3}, "deduction": {"name": "Deduct Situation", "enabled": false, "priority": 3}, "geo-hubs": {"name": "Geopolitical Hubs", "enabled": false, "priority": 3}, "tech-hubs": {"name": "Hot Tech Hubs", "enabled": false, "priority": 3}}));
    localStorage.setItem('worldmonitor-layers', JSON.stringify({"iranAttacks": true, "hotspots": true, "conflicts": true, "bases": true, "nuclear": false, "irradiators": false, "radiationWatch": true, "spaceports": false, "satellites": false, "cables": false, "pipelines": false, "datacenters": false, "military": true, "aircraftEmergencies": true, "ais": true, "tradeRoutes": false, "flights": true, "protests": true, "ucdpEvents": true, "displacement": true, "climate": true, "weather": true, "canadaRoads": false, "canadaAlerts": true, "outages": true, "cyberThreats": false, "natural": true, "fires": true, "waterways": false, "economic": false, "minerals": false, "gpsJamming": false, "ciiChoropleth": false, "resilienceScore": false, "dayNight": false, "sanctions": false, "no2Activity": false, "reservoirLevels": true, "startupHubs": false, "techHQs": false, "accelerators": false, "cloudRegions": false, "techEvents": false, "stockExchanges": false, "financialCenters": false, "centralBanks": false, "commodityHubs": false, "gulfInvestments": false, "positiveEvents": false, "kindness": false, "happiness": false, "speciesRecovery": false, "renewableInstallations": false, "miningSites": false, "processingPlants": false, "commodityPorts": false, "webcams": false, "diseaseOutbreaks": false, "storageFacilities": false, "fuelShortages": false, "liveTankers": false}));
    localStorage.setItem(MARK, '1');
  } catch (e) { /* storage blocked: plain World Monitor */ }
})();

/* Airline Intelligence airports (2026-11-19, EMON only): her cities' main airports, top cities first
   (the app keeps 20 max). Set once per browser; edits in the panel afterwards stick. On any other host
   (worldmonitor.alola.lol) an earlier copy of this setting is taken back out so it keeps the app default. */
(function () {
  try {
    var MARK = 'nvii-airports-v1', KEY = 'aviation:watchlist:v1';
    if (!/^emon\./.test(location.hostname)) {
      if (localStorage.getItem(MARK)) { localStorage.removeItem(KEY); localStorage.removeItem(MARK); }
      return;
    }
    if (localStorage.getItem(MARK)) return;
    var wl = {};
    try { wl = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { wl = {}; }
    wl.airports = ['SFO', 'OAK', 'SEA', 'MIA', 'FLL', 'JFK', 'LGA', 'EWR', 'DCA', 'IAD',
                   'ORD', 'MDW', 'PDX', 'YVR', 'YQB', 'DFW', 'DEN', 'MEX', 'LAS', 'CLT'];
    if (!Array.isArray(wl.airlines)) wl.airlines = ['TK'];
    if (!Array.isArray(wl.routes)) wl.routes = ['IST-LHR', 'IST-FRA'];
    localStorage.setItem(KEY, JSON.stringify(wl));
    localStorage.setItem(MARK, '1');
  } catch (e) { /* storage blocked */ }
})();

/* nvii-hidden-v1 (2026-11-19): panels and map layers she marked "Hide this everywhere" on alola.lol/emon-index
   (list at /local/hidden.json, written by Pi ~/services/emon-index/api.py). The saved list is applied from this
   browser's copy before the app starts; the fresh list is fetched after, and if it changed the page reloads
   once so the change shows. Un-hiding puts back only what this block switched off. */
(function () {
  var CACHE = 'nvii-hidden', DONE = 'nvii-hidden-applied';
  function read(k, d) { try { return JSON.parse(localStorage.getItem(k) || 'null') || d; } catch (e) { return d; } }
  function apply(list) {
    var done = read(DONE, { panels: [], layers: [] });
    var hp = list.panels || [], hl = list.layers || [];
    var panels = read('worldmonitor-panels', null), layers = read('worldmonitor-layers', null);
    if (panels) {
      done.panels.forEach(function (k) { if (hp.indexOf(k) < 0 && panels[k]) panels[k].enabled = true; });
      hp.forEach(function (k) { if (panels[k]) panels[k].enabled = false; });
      localStorage.setItem('worldmonitor-panels', JSON.stringify(panels));
    }
    if (layers) {
      done.layers.forEach(function (k) { if (hl.indexOf(k) < 0) layers[k] = true; });
      hl.forEach(function (k) { layers[k] = false; });
      localStorage.setItem('worldmonitor-layers', JSON.stringify(layers));
    }
    var q = new URLSearchParams(location.search);
    if (q.has('layers') && hl.length) {
      var kept = q.get('layers').split(',').filter(function (k) { return hl.indexOf(k) < 0; });
      if (kept.length !== q.get('layers').split(',').length) {
        q.set('layers', kept.join(','));
        history.replaceState(null, '', location.pathname + '?' + q.toString() + location.hash);
      }
    }
    localStorage.setItem(DONE, JSON.stringify({ panels: hp, layers: hl }));
  }
  try {
    var cached = read(CACHE, null);
    if (cached) apply(cached);
    fetch('/local/hidden.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (fresh) {
      if (!fresh || !Array.isArray(fresh.panels) || !Array.isArray(fresh.layers)) return;
      var a = JSON.stringify([fresh.panels, fresh.layers]), b = cached ? JSON.stringify([cached.panels, cached.layers]) : JSON.stringify([[], []]);
      localStorage.setItem(CACHE, JSON.stringify({ panels: fresh.panels, layers: fresh.layers }));
      if (a === b) return;
      if (sessionStorage.getItem('nvii-hidden-reloaded') === a) return; // reload only once per change
      sessionStorage.setItem('nvii-hidden-reloaded', a);
      apply(fresh);
      location.reload();
    }).catch(function () { /* no list on this host */ });
  } catch (e) { /* storage blocked */ }
})();

/* nvii-alola-theme-v1 (2026-11-20, her ask): EMON follows the theme picked on alola.lol.
   Theme = the alola-theme cookie shared across *.alola.lol (or ?alola=<name> to try one).
   No cookie and no ?alola= -> EMON keeps its own look. Sets EMON's own color variables only; the map and
   webcam tiles keep their own dark look. Remove this block to turn it off. */
(function () {
  'use strict';
  var T = {
    alola: ['#0a0014', '#120025', '#1a0033', '#3a1a5a', '#d4c8ff', '#9a8abb', '#ffcc00', '#00ff88'], /* alola.lol home page colors (added by nvii-alola-ui-v1) */
    white: ['#ffffff', '#f5f5f5', '#ececec', '#d4d4d4', '#0a0a0a', '#555555', '#e11d48', '#111111'],
    red: ['#1a0004', '#2a0008', '#3a0010', '#7a2030', '#ffe0e4', '#cc9999', '#ff2a44', '#ff7a66'],
    black: ['#000000', '#0a0a0a', '#161616', '#2e2e2e', '#f5f5f5', '#888888', '#ff2a44', '#e5e5e5'],
    dark: ['#0a0a0a', '#111', '#1a1a1a', '#2a2a2a', '#e0e0e0', '#666', '#888', '#0f0'],
    light: ['#fafafa', '#f0f0f4', '#e6e6ea', '#d4d4da', '#1a1a1e', '#6b7280', '#4f46e5', '#16a34a'],
    sepia: ['#fdf6e3', '#f5e6c8', '#efe0b8', '#d8c8a0', '#433422', '#7a6a5a', '#b58900', '#589500'],
    cyberpunk: ['#0a0020', '#120030', '#1a0045', '#6633cc', '#f0e0ff', '#8877bb', '#ff00ff', '#00ffaa'],
    ocean: ['#0a1628', '#0f1f3a', '#152a4a', '#1e3a5f', '#e0f0ff', '#6080b0', '#4fc3ff', '#4caf88'],
    dracula: ['#282a36', '#1e1f2b', '#21222c', '#44475a', '#f8f8f2', '#6272a4', '#bd93f9', '#50fa7b'],
    gruvbox: ['#282828', '#1d2021', '#32302f', '#504945', '#ebdbb2', '#928374', '#fabd2f', '#b8bb26'],
    tokyo: ['#1a1b26', '#16161e', '#1f2335', '#363b54', '#c0d0ff', '#565f89', '#7aa2f7', '#9ece6a'],
    matrix: ['#000', '#001100', '#002200', '#003300', '#00ff00', '#006600', '#00ff00', '#00ff00'],
    solarized: ['#002b36', '#073642', '#093b46', '#1a5a6a', '#d0d0a0', '#586e75', '#b58900', '#859900'],
    pastel: ['#1a1a2e', '#16213e', '#1f2a47', '#3a4a6a', '#f0e0ff', '#a0a0c0', '#ff88cc', '#88dd88'],
    catppuccin: ['#1e1e2e', '#181825', '#232340', '#45475a', '#cdd6f4', '#6c7086', '#89b4fa', '#a6e3a1']
  };
  function lum(hex) { hex = hex.replace('#', ''); if (hex.length === 3) hex = hex.replace(/(.)/g, '$1$1'); var n = parseInt(hex, 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; }
  function build(v) {
  var isLight = lum(v[0]) > 0.5;
  var veil = isLight ? '0,0,0' : '255,255,255';
  return 'html, html[data-theme] {' + [
    '--bg:' + v[0], '--bg-secondary:' + v[1], '--surface:' + v[2], '--surface-hover:' + v[3], '--surface-active:' + v[3],
    '--panel-bg:' + v[2], '--input-bg:' + v[1], '--border:' + v[3], '--panel-border:' + v[3], '--border-strong:' + v[5],
    '--border-subtle:' + v[2], '--border-color:' + v[3], '--text:' + v[4], '--text-primary:' + v[4], '--text-secondary:' + v[4],
    '--text-dim:' + v[5], '--text-muted:' + v[5], '--text-faint:' + v[5], '--text-ghost:' + v[5], '--accent:' + v[6],
    '--overlay-subtle:rgba(' + veil + ',0.03)', '--overlay-light:rgba(' + veil + ',0.05)', '--overlay-medium:rgba(' + veil + ',0.1)',
    '--overlay-heavy:rgba(' + veil + ',0.2)', '--scrollbar-thumb:' + v[3], '--scrollbar-thumb-hover:' + v[5],
    '--map-bg:' + v[0], '--map-grid:' + v[2], '--map-country:' + v[1], '--map-stroke:' + v[3],
    '--green:' + v[7]
  ].map(function (d) { return d + ' !important'; }).join(';') + '}' +
  'body{background:' + v[0] + ' !important;color:' + v[4] + ' !important}' + contrastFix(v);
  }
  /* nvii-contrast (2026-11-21, her report: the active "2D" button was black on black): EMON hard-codes dark text on
     buttons filled with the theme's green / accent / text color. Where a theme makes that fill dark too (or light on
     light), give those buttons black or white text, whichever can be read. */
  var ON_GREEN = '.cdp-export-primary,.update-toast-action,.map-dim-btn.active,.map-pin-btn.active,.playback-btn.playback-live,.time-btn.active,.monitor-add-btn,.panel-toggle-item.active .panel-toggle-checkbox,.source-toggle-item.active .source-toggle-checkbox,.popup-imagery-open,.new-tag,.cascade-analyze-btn,.deckgl-time-slider .time-btn.active,.live-indicator,.oiv-tab[aria-selected="true"],.oiv-date[aria-pressed="true"],.oiv-toggle[aria-pressed="true"],.focus-editor-btn.primary,[data-variant="happy"] .hero-card-location-btn:hover';
  var ON_ACCENT = '.embed-copy-btn,.source-count,.signal-modal-header,.signal-dismiss-btn,.playback-btn:hover,.wl-pill.active,.panel-new-badge,.mobile-warning-btn,.risk-source-enable:hover,.risk-action-primary,.status-filter-btn.active,.pwa-install-done,.telegram-follow-btn:hover,.x-intel-follow-btn:hover,.widget-chat-action-btn,.widget-chat-send,.btn-primary,.chat-chip.active,.ecp-filter-active,.mobile-panel-nav-chip.active,.ow-tl-now-label,.price-mode-btn.active,.sc-scenario-btn';
  var ON_TEXT = '.grid-clock-selector button[aria-pressed="true"],.copy-link-btn.copied,.live-news-manage-add-btn:hover,.debt-tab.active';
  function contrastFix(v) {
    var out = '', rule = function (sel, fill, text) {
      if (Math.abs(lum(fill) - lum(text)) >= 0.35) return;
      out += sel + '{color:' + (lum(fill) > 0.5 ? '#0a0a0a' : '#ffffff') + ' !important}';
    };
    rule(ON_GREEN, v[7], '#0a0a0a'); rule(ON_ACCENT, v[6], v[0]); rule(ON_TEXT, v[4], v[0]);
    return out;
  }
  function pick() {
    var q = new URLSearchParams(location.search).get('alola');
    var c = (document.cookie.match(/(?:^| )alola-theme=([^;]+)/) || [])[1];
    return T[q] ? q : (T[c] ? c : null);
  }
  var current = null;
  function apply() {
    var name = pick();
    var s = document.getElementById('alola-bridge');
    if (!name) { if (s) s.remove(); document.documentElement.removeAttribute('data-alola-theme'); current = null; return; }
    if (name === current && s) return;
    if (!s) { s = document.createElement('style'); s.id = 'alola-bridge'; (document.head || document.documentElement).appendChild(s); }
    s.textContent = build(T[name]);
    document.documentElement.setAttribute('data-alola-theme', name);
    current = name;
  }
  try { apply(); } catch (e) {}
  document.addEventListener('DOMContentLoaded', function () { try { apply(); } catch (e) {} });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { try { apply(); } catch (e) {} } });
})();

/* nvii-video-paused-v1 (2026-11-20, her ask): live video starts PAUSED on this copy.
   Sets EMON's own two switches once per browser (Live News autoplay off, Live Webcams "always on" off).
   After that, whatever is chosen in EMON's settings sticks. Remove this block to go back to autoplay. */
(function () {
  try {
    if (localStorage.getItem('nvii-video-paused-v1')) return;
    localStorage.setItem('wm-live-news-autoplay', 'false');
    localStorage.setItem('wm-live-streams-always-on', 'false');
    localStorage.setItem('nvii-video-paused-v1', '1');
  } catch (e) {}
})();

/* nvii-pulse-panel-v1 (2026-11-24, her ask): the white flashing circles are back, and a "Pulse" panel in the side panels
   lists every one, newest first: when, source, headline, which place the circle was on, "Show on map", "Open article".
   The panel is app code (selfhost/patch_pulse_panel.py: src/components/NviiPulsePanel.ts, src/services/nvii-pulse.ts).
   This block: once per browser turns "Live Event Pulse" back on (the short-lived nvii-pulse-off-v1 had turned it off),
   and puts the Pulse panel FIRST in each saved layout and tab it has not handled yet. Tabs are remembered by id, so if
   she removes Pulse from a tab it stays removed. EMON only. Remove this block to stop adding it to new tabs. */
(function () {
  try {
    if (!/^emon\./.test(location.hostname)) return;
    var ID = 'nvii-pulse', CFG = { name: 'Pulse', enabled: true, priority: 1 }, DONE = 'nvii-pulse-panel-done';
    if (!localStorage.getItem('nvii-pulse-panel-v1')) {
      localStorage.setItem('wm-map-news-flash', 'true');
      localStorage.setItem('nvii-pulse-panel-v1', '1');
    }
    var done = {};
    try { done = JSON.parse(localStorage.getItem(DONE) || '{}') || {}; } catch (e) { done = {}; }
    var parse = function (raw) { try { return raw ? JSON.parse(raw) : null; } catch (e) { return null; } };
    var addTo = function (settings, order) {
      if (settings && typeof settings === 'object') settings[ID] = Object.assign({}, settings[ID] || {}, CFG);
      if (Array.isArray(order)) { var i = order.indexOf(ID); if (i >= 0) order.splice(i, 1); order.unshift(ID); }
    };
    // 1) the layout of the edition being opened (the edition block above has already swapped it in)
    var ed = window.__nviiEmonEdition || 'full';
    if (!done['live:' + ed]) {
      var ps = parse(localStorage.getItem('worldmonitor-panels')), po = parse(localStorage.getItem('panel-order'));
      if (ps) {
        addTo(ps, po);
        localStorage.setItem('worldmonitor-panels', JSON.stringify(ps));
        if (po) localStorage.setItem('panel-order', JSON.stringify(po));
        done['live:' + ed] = 1;
      }
    }
    // 2) the parked layouts of the other editions
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i), m = /^nvii-emon-snap-(.+)$/.exec(k || '');
      if (!m || done['live:' + m[1]] || m[1] === ed) continue;
      var snap = parse(localStorage.getItem(k));
      if (!snap || !snap['worldmonitor-panels']) continue;
      var sps = parse(snap['worldmonitor-panels']), spo = parse(snap['panel-order']);
      if (!sps) continue;
      addTo(sps, spo);
      snap['worldmonitor-panels'] = JSON.stringify(sps);
      if (spo) snap['panel-order'] = JSON.stringify(spo);
      localStorage.setItem(k, JSON.stringify(snap));
      done['live:' + m[1]] = 1;
    }
    // 3) every saved tab (live tab lists and the ones parked per edition)
    for (var j = 0; j < localStorage.length; j++) {
      var tk = localStorage.key(j);
      if (!/^(worldmonitor-tabs-v1:|nvii-emon-tabs-)/.test(tk || '')) continue;
      var st = parse(localStorage.getItem(tk)), changed = false;
      if (!st || !Array.isArray(st.tabs)) continue;
      st.tabs.forEach(function (t) {
        if (!t || !t.id || done['tab:' + t.id]) return;
        addTo(t.panelSettings, t.panelOrder);
        done['tab:' + t.id] = 1; changed = true;
      });
      if (changed) localStorage.setItem(tk, JSON.stringify(st));
    }
    localStorage.setItem(DONE, JSON.stringify(done));
  } catch (e) { /* storage blocked: the panel can still be switched on in the gear menu */ }
})();

/* nvii-setups-v1 (2026-11-20, her ask): one-link EMON setups.
   Open  https://emon.alola.lol/?setup=<name>  and this switches on that setup's panels and map layers, then
   flies the map there. The layout you had before is kept:  ?setup=back  puts it back.
   Setups live in the SETUPS object below (panel and layer keys are EMON's own). Remove this block to turn it off. */
(function () {
  try {
    if (!/^emon\./.test(location.hostname)) return;
    var q = new URLSearchParams(location.search);
    var want = q.get('setup');
    if (!want) return;
    var ALL_LAYERS = ["iranAttacks", "hotspots", "conflicts", "bases", "nuclear", "irradiators", "radiationWatch", "spaceports", "satellites", "cables", "pipelines", "datacenters", "military", "aircraftEmergencies", "ais", "tradeRoutes", "flights", "protests", "ucdpEvents", "displacement", "climate", "weather", "canadaRoads", "canadaAlerts", "outages", "cyberThreats", "natural", "fires", "waterways", "economic", "minerals", "gpsJamming", "ciiChoropleth", "resilienceScore", "dayNight", "sanctions", "no2Activity", "reservoirLevels", "startupHubs", "techHQs", "accelerators", "cloudRegions", "techEvents", "stockExchanges", "financialCenters", "centralBanks", "commodityHubs", "gulfInvestments", "positiveEvents", "kindness", "happiness", "speciesRecovery", "renewableInstallations", "miningSites", "processingPlants", "commodityPorts", "webcams", "diseaseOutbreaks", "storageFacilities", "fuelShortages", "liveTankers"];
    var SETUPS = {
     "conflict-watch": {
      "label": "Conflict Watch",
      "lat": 26.5,
      "lon": 56.3,
      "zoom": 6,
      "timeRange": "7d",
      "panels": [
       "map",
       "middleeast",
       "military-correlation",
       "escalation-correlation",
       "thermal-escalation",
       "chokepoint-strip",
       "hormuz-tracker",
       "strategic-posture",
       "gdelt-intel",
       "ucdp-events",
       "live-news",
       "insights",
       "cii",
      "satellite-fires"
      ],
      "layers": [
       "military",
       "flights",
       "fires",
       "conflicts",
       "iranAttacks",
       "ais",
       "waterways",
       "gpsJamming",
       "bases",
       "hotspots",
       "ucdpEvents",
       "nuclear"
      ],
      "names": {
       "map": "Global Map",
       "middleeast": "Middle East",
       "military-correlation": "Force Posture",
       "escalation-correlation": "Escalation Monitor",
       "thermal-escalation": "Thermal Escalation",
       "chokepoint-strip": "Chokepoint Status",
       "hormuz-tracker": "Hormuz Trade Tracker",
       "strategic-posture": "AI Strategic Posture",
       "gdelt-intel": "Live Intelligence",
       "ucdp-events": "UCDP Conflict Events",
       "live-news": "Live News",
       "insights": "AI Insights",
       "cii": "Country Instability",
       "satellite-fires": "Fires"
      }
     }
    };
    var KEYS = ['worldmonitor-panels', 'panel-order', 'worldmonitor-layers', 'panel-order-bottom-set'];
    var clean = function (extra) { q.delete('setup'); var s = q.toString(); location.replace(location.pathname + (extra || (s ? '?' + s : ''))); };
    if (want === 'back') {
      var prev = localStorage.getItem('nvii-setup-prev');
      if (prev) { var o = JSON.parse(prev); KEYS.forEach(function (k) { if (o[k] == null) localStorage.removeItem(k); else localStorage.setItem(k, o[k]); }); localStorage.removeItem('nvii-setup-prev'); }
      localStorage.removeItem('nvii-setup-active');
      return clean();
    }
    var S = SETUPS[want];
    if (!S) return clean();
    if (!localStorage.getItem('nvii-setup-prev')) {
      var snap = {}; KEYS.forEach(function (k) { snap[k] = localStorage.getItem(k); });
      localStorage.setItem('nvii-setup-prev', JSON.stringify(snap));
    }
    var panels = {};
    try { panels = JSON.parse(localStorage.getItem('worldmonitor-panels') || '{}') || {}; } catch (e) { panels = {}; }
    Object.keys(panels).forEach(function (k) { if (panels[k] && typeof panels[k] === 'object') panels[k].enabled = false; });
    S.panels.forEach(function (k, i) { panels[k] = { name: (panels[k] && panels[k].name) || S.names[k] || k, enabled: true, priority: i < 6 ? 1 : 2 }; });
    localStorage.setItem('worldmonitor-panels', JSON.stringify(panels));
    localStorage.setItem('panel-order', JSON.stringify(S.panels.filter(function (k) { return k !== 'map'; })));
    var layers = {};
    ALL_LAYERS.forEach(function (k) { layers[k] = S.layers.indexOf(k) !== -1; });
    localStorage.setItem('worldmonitor-layers', JSON.stringify(layers));
    localStorage.setItem('nvii-setup-active', want);
    clean('?lat=' + S.lat + '&lon=' + S.lon + '&zoom=' + S.zoom + '&timeRange=' + S.timeRange);
  } catch (e) { /* storage blocked: leave the page as it is */ }
})();

/* nvii-brand-v1 (2026-11-20, her ask): this copy is called EMON Earth Monitor.
   The page <title> and meta tags are renamed by nginx (selfhost/nginx.conf.template, block nvii-brand). This renames
   what the app draws itself: the header logo, the tab title when the app changes it, and "World Monitor" in visible
   text such as the footer. Cheap on purpose: a few timed passes, not a constant watcher. EMON only. */
(function () {
  try {
    if (!/^emon\./.test(location.hostname)) return;
    var NAME = 'EMON Earth Monitor';
    var fixTitle = function () {
      var t = document.title || '';
      if (/^Live World Map:/i.test(t)) { if (t !== NAME) document.title = NAME; return; }
      var n = /World Monitor/i.test(t) ? t.replace(/World Monitor/gi, NAME) : (t.indexOf(NAME) === -1 ? (t ? t + ' | ' + NAME : NAME) : t);
      if (n !== t) document.title = n;
    };
    var pass = function () {
      try {
        fixTitle();
        var logo = document.querySelector('.logo');
        if (logo && logo.textContent !== 'EMON EARTH MONITOR') logo.textContent = 'EMON EARTH MONITOR';
        var mob = document.querySelector('.logo-mobile');
        if (mob && mob.textContent !== NAME) mob.textContent = NAME;
        if (!document.body) return;
        var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null), node, hits = [];
        while ((node = w.nextNode())) {
          if (node.nodeValue && node.nodeValue.indexOf('World Monitor') !== -1) {
            var p = node.parentNode && node.parentNode.nodeName;
            if (p !== 'SCRIPT' && p !== 'STYLE' && p !== 'TEXTAREA') hits.push(node);
          }
        }
        hits.forEach(function (x) { x.nodeValue = x.nodeValue.replace(/World Monitor/g, NAME); });
      } catch (e) { /* leave the page as it is */ }
    };
    [800, 2500, 6000, 15000, 40000].forEach(function (ms) { setTimeout(pass, ms); });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) pass(); });
    var titleEl = document.querySelector('title');
    if (titleEl && window.MutationObserver) new MutationObserver(fixTitle).observe(titleEl, { childList: true });
  } catch (e) { /* ignore */ }
})();

/* nvii-alola-ui-v1 (2026-11-20, her ask): her Alola look on EMON's interface + a theme picker on EMON itself.
   - THEME button in the top bar (next to the gear): pick any Alola theme, or "plain EMON" to switch all of this off.
   - Her fonts (VT323 for titles, Share Tech Mono for text; files at /local/fonts/) and her alola.css element
     styling (square bordered boxes, uppercase spaced buttons, accent hover/active) on the top bar, boxes, buttons,
     tabs and inputs. The map is left alone.
   Colors come from the nvii-alola-theme-v1 block above (same alola-theme cookie as alola.lol).
   Remove this block to turn it off. */
(function () {
  'use strict';
  try {
    if (!/^emon\./.test(location.hostname)) return;
    var THEMES = ['alola', 'dark', 'black', 'red', 'white', 'light', 'sepia', 'cyberpunk', 'ocean', 'dracula', 'gruvbox', 'tokyo', 'matrix', 'solarized', 'pastel', 'catppuccin'];
    var root = document.documentElement;
    var ls = function (k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} return null; };
    var cookie = function () { return (document.cookie.match(/(?:^| )alola-theme=([^;]+)/) || [])[1] || null; };
    var setCookie = function (name) { document.cookie = 'alola-theme=' + (name || '') + ';domain=.alola.lol;path=/;max-age=' + (name ? 31536000 : 0) + ';SameSite=Lax'; };
    var refresh = function () { try { document.dispatchEvent(new Event('visibilitychange')); } catch (e) {} };
    var off = function () { return ls('nvii-alola-ui') === 'off'; };

    if (!off() && !cookie()) setCookie('alola');   // first visit: her own Alola colors

    var CSS = [
      "@font-face{font-family:'VT323';src:url('/local/fonts/VT323.woff2') format('woff2');font-display:swap}",
      "@font-face{font-family:'Share Tech Mono';src:url('/local/fonts/ShareTechMono.woff2') format('woff2');font-display:swap}",
      "html[data-alola-ui]{--font-body:'Share Tech Mono','VT323',monospace;--font-mono:'Share Tech Mono','VT323',monospace}",
      "html[data-alola-ui] body,html[data-alola-ui] button,html[data-alola-ui] input,html[data-alola-ui] select,html[data-alola-ui] textarea,html[data-alola-ui] kbd{font-family:'Share Tech Mono','VT323','Courier New',monospace !important}",
      "html[data-alola-ui] ::selection{background:var(--accent);color:var(--bg)}",
      /* top bar */
      "html[data-alola-ui] .header{border-bottom:2px solid var(--accent) !important}",
      "html[data-alola-ui] .header .logo,html[data-alola-ui] .header .logo-mobile{font-family:'VT323','Courier New',monospace !important;font-size:1.3rem !important;line-height:1 !important;white-space:nowrap !important;font-weight:normal !important;letter-spacing:2px !important;color:var(--accent) !important;text-shadow:0 0 10px var(--accent);text-transform:uppercase}",
      /* boxes */
      "html[data-alola-ui] .panel{border:1px solid var(--border) !important;border-radius:0 !important}",
      "html[data-alola-ui] .panel:hover{border-color:var(--accent) !important}",
      "html[data-alola-ui] .panel-header{border-bottom:1px solid var(--border) !important;border-radius:0 !important}",
      "html[data-alola-ui] .panel-title{font-family:'VT323','Courier New',monospace !important;font-size:1.15rem !important;font-weight:normal !important;letter-spacing:2px !important;text-transform:uppercase;color:var(--accent) !important}",
      /* buttons, tabs, inputs (not inside the map) */
      "html[data-alola-ui] .header button,html[data-alola-ui] .header select,html[data-alola-ui] .panel button:not(.icon-btn):not(.panel-move-btn),html[data-alola-ui] .panel select,html[data-alola-ui] .panel input[type=text],html[data-alola-ui] .panel input[type=search],html[data-alola-ui] [role=tab],html[data-alola-ui] [class*=tab-btn],html[data-alola-ui] [class*=-tab]:not([class*=table]){border-radius:0 !important;text-transform:uppercase;letter-spacing:1px;transition:all .15s}",
      "html[data-alola-ui] .header button:hover,html[data-alola-ui] .header select:hover,html[data-alola-ui] .panel button:not(.icon-btn):not(.panel-move-btn):hover,html[data-alola-ui] [role=tab]:hover{border-color:var(--accent) !important;color:var(--accent) !important}",
      "html[data-alola-ui] .live-channel-btn.active,html[data-alola-ui] .variant-option.active,html[data-alola-ui] [role=tab][aria-selected=true]{background:var(--accent) !important;color:var(--bg) !important;border-color:var(--accent) !important}",
      "html[data-alola-ui] .panel input:focus,html[data-alola-ui] .panel select:focus,html[data-alola-ui] .header select:focus{border-color:var(--accent) !important;outline:none}",
      /* the picker itself (always styled) */
      ".nvii-theme-wrap{position:relative;display:inline-flex}",
      ".nvii-theme-btn{background:var(--surface,#1a1a1a);color:var(--text,#e0e0e0);border:1px solid var(--border,#444);padding:4px 12px;font-size:12px;cursor:pointer;letter-spacing:1px;text-transform:uppercase;height:28px}",
      ".nvii-theme-btn:hover{border-color:var(--accent,#fc0);color:var(--accent,#fc0)}",
      ".nvii-theme-menu{position:absolute;right:0;top:calc(100% + 6px);z-index:100000;width:300px;display:flex;flex-wrap:wrap;gap:4px;padding:10px;background:var(--bg-secondary,#111);border:1px solid var(--accent,#fc0);box-shadow:0 2px 12px rgba(0,0,0,.5)}",
      ".nvii-theme-menu[hidden]{display:none}",
      ".nvii-theme-menu .t{background:var(--bg-secondary,#111);color:var(--text-dim,#999);border:1px solid var(--border,#444);padding:4px 10px;font-size:12px;cursor:pointer;letter-spacing:1px;text-transform:uppercase}",
      ".nvii-theme-menu .t:hover{color:var(--accent,#fc0);border-color:var(--accent,#fc0)}",
      ".nvii-theme-menu .t.active,.nvii-theme-menu .t.active:hover{background:var(--accent,#fc0) !important;color:var(--bg,#000) !important;border-color:var(--accent,#fc0) !important}",
      ".nvii-theme-menu .t.plain{flex-basis:100%;margin-top:6px}"
    ].join('\n');

    function applyUi() {
      if (!document.getElementById('nvii-alola-ui-css')) {
        var s = document.createElement('style'); s.id = 'nvii-alola-ui-css'; s.textContent = CSS;
        (document.head || root).appendChild(s);
      }
      if (off()) root.removeAttribute('data-alola-ui'); else root.setAttribute('data-alola-ui', '1');
    }

    function choose(name) {
      try { var u = new URL(location.href); if (u.searchParams.has('alola')) { u.searchParams.delete('alola'); history.replaceState(null, '', u); } } catch (e) {}
      if (name) { ls('nvii-alola-ui', null); setCookie(name); } else { ls('nvii-alola-ui', 'off'); setCookie(null); }
      applyUi(); refresh(); mark();
    }

    function mark() {
      var cur = off() ? null : (root.getAttribute('data-alola-theme') || cookie());
      var bs = document.querySelectorAll('.nvii-theme-menu .t');
      for (var i = 0; i < bs.length; i++) bs[i].classList.toggle('active', (bs[i].getAttribute('data-t') || null) === cur);
    }

    function mount() {
      if (document.getElementById('nviiThemeBtn')) return;
      var right = document.querySelector('.header .header-right');
      if (!right) return;
      var wrap = document.createElement('span'); wrap.className = 'nvii-theme-wrap';
      var btn = document.createElement('button'); btn.id = 'nviiThemeBtn'; btn.className = 'nvii-theme-btn'; btn.type = 'button';
      btn.textContent = 'Theme'; btn.title = 'Pick an Alola theme for EMON';
      var menu = document.createElement('div'); menu.className = 'nvii-theme-menu'; menu.hidden = true;
      THEMES.forEach(function (n) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 't'; b.setAttribute('data-t', n); b.textContent = n;
        b.addEventListener('click', function (e) { e.stopPropagation(); choose(n); });
        menu.appendChild(b);
      });
      var p = document.createElement('button'); p.type = 'button'; p.className = 't plain'; p.setAttribute('data-t', ''); p.textContent = 'plain EMON (theme off)';
      p.addEventListener('click', function (e) { e.stopPropagation(); choose(null); });
      menu.appendChild(p);
      btn.addEventListener('click', function (e) { e.stopPropagation(); menu.hidden = !menu.hidden; mark(); });
      document.addEventListener('click', function (e) { if (!wrap.contains(e.target)) menu.hidden = true; });
      wrap.appendChild(btn); wrap.appendChild(menu);
      var gear = document.getElementById('unifiedSettingsMount');
      if (gear && gear.parentNode === right) right.insertBefore(wrap, gear); else right.appendChild(wrap);
    }

    applyUi(); refresh();
    var tries = 0;
    var iv = setInterval(function () { try { applyUi(); mount(); } catch (e) {} if (++tries > 240) clearInterval(iv); }, 500);
    document.addEventListener('DOMContentLoaded', function () { try { applyUi(); mount(); refresh(); } catch (e) {} });
  } catch (e) {}
})();

/* nvii-mission-tabs-v1 (2026-11-20, her ask): Missions become TABS inside the edition they belong to, next to "Main".
   World: Conflict Watch, Crisis Desk, News Seeker, Country Watcher, Protective Travel, Supply-Chain Risk.
   Finance: Stock Geek, NQ Day Trader. Energy: Energy Security. Tech: Tech / AI Watcher. Good News: Good News Explorer.
   Added once per edition per browser (marker key below), before the app reads its tabs, and only when the edition
   already has its "Main" tab (so a first visit is left alone and gets them on the next load). After that the tabs
   are hers: rename, delete, add. Each tab carries its panels AND its map (layers, position, time range); the map
   part is applied by the app patch selfhost/patch_tab_maps.py. To add a tab for everyone, add it to TABS below and
   bump the marker to -v2. EMON only. */
(function () {
  try {
    if (!/^emon\./.test(location.hostname)) return;
    var ed = window.__nviiEmonEdition || 'full';
    var TABS = {"full":[{"key":"conflict-watch","name":"Conflict Watch","panels":["map","middleeast","military-correlation","escalation-correlation","thermal-escalation","chokepoint-strip","hormuz-tracker","strategic-posture","gdelt-intel","ucdp-events","live-news","insights","cii","satellite-fires"],"names":{"middleeast":"Middle East","military-correlation":"Force Posture","escalation-correlation":"Escalation Monitor","thermal-escalation":"Thermal Escalation","chokepoint-strip":"Chokepoint Status","hormuz-tracker":"Hormuz Trade Tracker","strategic-posture":"AI Strategic Posture","gdelt-intel":"Live Intelligence","ucdp-events":"UCDP Conflict Events","live-news":"Live News","insights":"AI Insights","cii":"Country Instability","satellite-fires":"Fires"},"map":{"layers":{"military":true,"flights":true,"fires":true,"conflicts":true,"iranAttacks":true,"ais":true,"waterways":true,"gpsJamming":true,"bases":true,"hotspots":true,"ucdpEvents":true,"nuclear":true},"lat":26.5,"lon":56.3,"zoom":6,"timeRange":"7d"}},{"key":"crisis-desk","name":"Crisis Desk","panels":["map","live-news","insights","strategic-posture","cii","strategic-risk","gdelt-intel","cascade","military-correlation","escalation-correlation","ucdp-events","security-advisories","airline-intel"],"names":{"live-news":"Live News","insights":"AI Insights","strategic-posture":"AI Strategic Posture","cii":"Country Instability","strategic-risk":"Strategic Risk Overview","gdelt-intel":"Live Intelligence","cascade":"Infrastructure Cascade","military-correlation":"Force Posture","escalation-correlation":"Escalation Monitor","ucdp-events":"UCDP Conflict Events","security-advisories":"Security Advisories","airline-intel":"Airline Intelligence"},"map":{"layers":{"conflicts":true,"hotspots":true,"military":true,"bases":true,"iranAttacks":true,"ucdpEvents":true,"protests":true,"sanctions":true,"outages":true,"weather":true,"natural":true,"ciiChoropleth":true},"view":"mena","zoom":3.6,"timeRange":"24h"}},{"key":"supply-chain-risk","name":"Supply-Chain Risk","panels":["map","supply-chain","hormuz-tracker","cascade","strategic-risk","cii","commodities","energy-complex","markets","consumer-prices"],"names":{"supply-chain":"Supply Chain","hormuz-tracker":"Hormuz Trade Tracker","cascade":"Infrastructure Cascade","strategic-risk":"Strategic Risk Overview","cii":"Country Instability","commodities":"Metals & Materials","energy-complex":"Energy Complex","markets":"Markets","consumer-prices":"Consumer Prices"},"map":{"layers":{"tradeRoutes":true,"waterways":true,"ais":true,"cables":true,"pipelines":true,"commodityHubs":true,"commodityPorts":true,"minerals":true,"economic":true,"sanctions":true,"weather":true,"natural":true,"resilienceScore":true},"view":"global","zoom":2.3,"timeRange":"7d"}},{"key":"osint-newsroom","name":"News Seeker","panels":["map","live-news","gdelt-intel","intel","politics","middleeast","europe","africa","latam","asia","us","social-velocity","live-webcams","security-advisories"],"names":{"live-news":"Live News","gdelt-intel":"Live Intelligence","intel":"Intel Feed","politics":"World News","middleeast":"Middle East","europe":"Europe","africa":"Africa","latam":"Latin America","asia":"Asia-Pacific","us":"United States","social-velocity":"Social Velocity","live-webcams":"Live Webcams","security-advisories":"Security Advisories"},"map":{"layers":{"hotspots":true,"conflicts":true,"protests":true,"ucdpEvents":true,"displacement":true,"outages":true,"cyberThreats":true,"webcams":true,"weather":true,"natural":true,"fires":true},"view":"global","zoom":2.1,"timeRange":"24h"}},{"key":"country-watcher","name":"Country Watcher","panels":["map","live-news","cii","strategic-risk","sanctions-pressure","security-advisories","gdelt-intel","displacement","population-exposure","economic"],"names":{"live-news":"Live News","cii":"Country Instability","strategic-risk":"Strategic Risk Overview","sanctions-pressure":"Sanctions Pressure","security-advisories":"Security Advisories","gdelt-intel":"Live Intelligence","displacement":"UNHCR Displacement","population-exposure":"Population Exposure","economic":"Macro Stress"},"map":{"layers":{"conflicts":true,"hotspots":true,"protests":true,"sanctions":true,"ucdpEvents":true,"ciiChoropleth":true,"outages":true,"natural":true},"view":"global","zoom":2.2,"timeRange":"48h"}},{"key":"protective-travel","name":"Protective Travel","panels":["map","live-news","security-advisories","airline-intel","disease-outbreaks","live-webcams","cii","monitors"],"names":{"live-news":"Live News","security-advisories":"Security Advisories","airline-intel":"Airline Intelligence","disease-outbreaks":"Disease Outbreaks","live-webcams":"Live Webcams","cii":"Country Instability","monitors":"My Monitors"},"map":{"layers":{"protests":true,"weather":true,"natural":true,"flights":true,"outages":true,"hotspots":true},"view":"global","zoom":2.2,"timeRange":"24h"}}],"tech":[{"key":"tech-ai-watch","name":"Tech / AI Watcher","panels":["map","live-news","insights","ai","tech","startups","security","policy","hardware","cloud","github","tech-readiness","funding","unicorns","accelerators","events","markets","internet-disruptions","service-status","monitors"],"names":{"live-news":"Live News","insights":"AI Insights","ai":"AI/ML","tech":"Technology","startups":"Startups & VC","security":"Cybersecurity","policy":"AI Policy & Regulation","hardware":"Semiconductors & Hardware","cloud":"Cloud & Infrastructure","github":"GitHub Trending","tech-readiness":"Tech Readiness Index","funding":"Funding & VC","unicorns":"Unicorn Tracker","accelerators":"Accelerators & Demo Days","events":"Tech Events","markets":"Markets","internet-disruptions":"Internet Disruptions","service-status":"Service Status","monitors":"My Monitors"},"map":{"layers":{"datacenters":true,"startupHubs":true,"techHQs":true,"techEvents":true,"cloudRegions":true,"cables":true,"outages":true,"cyberThreats":true,"natural":true},"view":"global","zoom":2.4,"timeRange":"7d"}}],"finance":[{"key":"macro-market-watch","name":"Stock Geek","panels":["map","markets","heatmap","market-breadth","earnings-calendar","macro-signals","fear-greed","economic","liquidity-shifts","positioning-247","commodities","energy-complex","consumer-prices","gold-intelligence","etf-flows","stablecoins","crypto","economic-calendar"],"names":{"markets":"Markets","heatmap":"Sector Heatmap","market-breadth":"Market Breadth","earnings-calendar":"Earnings Calendar","macro-signals":"Market Regime","fear-greed":"Fear & Greed","economic":"Macro Stress","liquidity-shifts":"Liquidity Shifts","positioning-247":"24/7 Positioning","commodities":"Metals & Materials","energy-complex":"Energy Complex","consumer-prices":"Consumer Prices","gold-intelligence":"Gold Intelligence","etf-flows":"BTC ETF Tracker","stablecoins":"Stablecoins","crypto":"Crypto","economic-calendar":"Economic Calendar"},"map":{"layers":{"stockExchanges":true,"financialCenters":true,"centralBanks":true,"commodityHubs":true,"gulfInvestments":true,"economic":true,"tradeRoutes":true,"pipelines":true,"waterways":true,"sanctions":true,"outages":true,"weather":true,"natural":true},"view":"america","zoom":3,"timeRange":"7d"}},{"key":"nq-day-trader","name":"NQ Day Trader","panels":["map","nq-pulse","nq-catalysts","nq-news","live-news","heatmap","economic","fear-greed","fsi","yield-curve","markets"],"names":{"nq-pulse":"NQ Pulse","nq-catalysts":"NQ Catalysts","nq-news":"NQ News","live-news":"Live News","heatmap":"Sector Heatmap","economic":"Macro Stress","fear-greed":"Fear & Greed","fsi":"Financial Stress","yield-curve":"Yield Curve","markets":"Markets"},"map":{"layers":{"stockExchanges":true,"financialCenters":true,"centralBanks":true,"economic":true,"outages":true},"view":"america","zoom":3.4,"timeRange":"24h"}}],"commodity":[],"energy":[{"key":"energy-security","name":"Energy Security","panels":["map","energy-complex","oil-inventories","energy-crisis","pipeline-status","storage-facility-map","fuel-shortages","energy-disruptions","energy-risk-overview","hormuz-tracker","chokepoint-strip","supply-chain"],"names":{"energy-complex":"Energy Complex","oil-inventories":"Oil Inventories","energy-crisis":"Energy Crisis Tracker","pipeline-status":"Oil & Gas Pipeline Status","storage-facility-map":"Strategic Storage Atlas","fuel-shortages":"Global Fuel Shortage Registry","energy-disruptions":"Energy Disruptions Log","energy-risk-overview":"Global Energy Risk Overview","hormuz-tracker":"Hormuz Trade Tracker","chokepoint-strip":"Chokepoint Status","supply-chain":"Supply Chain"},"map":{"layers":{"pipelines":true,"storageFacilities":true,"fuelShortages":true,"liveTankers":true,"ais":true,"tradeRoutes":true,"waterways":true,"commodityPorts":true,"commodityHubs":true,"sanctions":true,"fires":true,"weather":true,"outages":true,"natural":true},"view":"mena","zoom":3.2,"timeRange":"7d"}}],"happy":[{"key":"good-news-explorer","name":"Good News Explorer","panels":["map","positive-feed","progress","counters","spotlight","breakthroughs","digest","species","renewable"],"names":{"positive-feed":"Good News Feed","progress":"Human Progress","counters":"Live Counters","spotlight":"Today's Hero","breakthroughs":"Breakthroughs","digest":"5 Good Things","species":"Conservation Wins","renewable":"Renewable Energy"},"map":{"layers":{"positiveEvents":true,"kindness":true,"happiness":true,"speciesRecovery":true,"renewableInstallations":true},"view":"global","zoom":2.2,"timeRange":"7d"}}]};
    var want = TABS[ed] || [];
    var KEY = 'worldmonitor-tabs-v1:' + ed, MARK = 'nvii-mission-tabs-v1:' + ed;
    if (!want.length || localStorage.getItem(MARK)) return;
    var st = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!st || !Array.isArray(st.tabs) || !st.tabs.length) return;
    var tpl = st.tabs[0].panelSettings || {};
    var have = {}; st.tabs.forEach(function (t) { have[String(t.name).toLowerCase()] = 1; });
    want.forEach(function (w, i) {
      if (have[w.name.toLowerCase()]) return;
      var ps = JSON.parse(JSON.stringify(tpl));
      Object.keys(ps).forEach(function (k) { if (ps[k] && typeof ps[k] === 'object') ps[k].enabled = false; });
      w.panels.forEach(function (k, n) {
        if (ps[k] && typeof ps[k] === 'object') { ps[k].enabled = true; }
        else { ps[k] = { name: k === 'map' ? 'Global Map' : (w.names[k] || k), enabled: true, priority: n < 6 ? 1 : 2 }; }
      });
      st.tabs.push({ id: 'tab-' + (Date.now() + i).toString(36) + '-' + Math.random().toString(36).slice(2, 8),
        name: w.name, panelSettings: ps, panelOrder: w.panels.filter(function (k) { return k !== 'map'; }), bottomSet: [], nviiMap: w.map });
    });
    localStorage.setItem(KEY, JSON.stringify(st));
    localStorage.setItem(MARK, '1');
  } catch (e) { /* storage blocked or unexpected shape: leave the tabs alone */ }
})();

/* nvii-enrich-v1 (2026-11-20, her ask): more in the ship and plane popups.
   Plane popup (the live aircraft arrows): photo, exact type, owner and country, airline, where it is flying from and to,
   and plain "worth a look" notes (military, no callsign, no published route).
   Ship popup: flag country (from the ship's ID number) and a photo when Wikimedia Commons has one.
   Data comes from this site's own /camproxy/aircraft.json and /camproxy/ship.json (cached a day). Runs only after a
   click, never as a constant watcher. EMON only. Remove this block to turn it off. */
(function () {
  try {
    if (!/^emon\./.test(location.hostname)) return;
    var el = function (tag, css, text) { var n = document.createElement(tag); if (css) n.style.cssText = css; if (text != null) n.textContent = text; return n; };
    var row = function (box, label, value) { if (!value) return; var r = el('div', 'margin-top:3px'); r.append(el('span', 'opacity:.65', label + ': '), el('span', '', value)); box.append(r); };
    var photo = function (box, src, creditText, link) {
      if (!src || !/^https:\/\//.test(src)) return;
      var img = el('img', 'display:block;width:100%;max-width:260px;height:auto;margin:6px 0 2px;border-radius:4px;background:#000'); img.loading = 'lazy'; img.alt = ''; img.referrerPolicy = 'no-referrer'; img.src = src;
      img.onerror = function () { img.remove(); };
      box.append(img);
      if (creditText) { var c = el('div', 'font-size:10px;opacity:.6'); if (link && /^https:\/\//.test(link)) { var a = el('a', 'color:inherit', 'Photo: ' + creditText); a.href = link; a.target = '_blank'; a.rel = 'noopener noreferrer'; c.append(a); } else c.textContent = 'Photo: ' + creditText; box.append(c); }
    };
    var note = function (box, text) { box.append(el('div', 'margin-top:4px;padding:3px 6px;border-left:3px solid #ff9f0a;font-size:11px', text)); };
    var get = function (url) { return fetch(url).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); };

    function plane(pop) {
      var strong = pop.querySelector('strong'); if (!strong) return;
      var txt = pop.textContent || '';
      if (!/ kt · heading |on the ground/.test(txt)) return;          // only the live-aircraft popup
      pop.dataset.nviiEnriched = '1';
      var mil = /\(military\)/.test(strong.textContent);
      var title = strong.textContent.replace(/\s*\(military\)\s*/, '').trim();
      var box = el('div', 'margin-top:6px;padding-top:6px;border-top:1px solid rgba(128,128,128,.4);font-size:12px;line-height:1.35;max-width:260px');
      box.append(el('div', 'opacity:.6', 'Looking it up…'));
      strong.parentNode.append(box);
      get('/camproxy/aircraft.json?q=' + encodeURIComponent(title)).then(function (d) {
        box.textContent = '';
        if (!d) { box.append(el('div', 'opacity:.6', 'No extra details found.')); return; }
        photo(box, d.photo, d.photo_credit, d.photo_full);
        row(box, 'Aircraft', [d.maker, d.type].filter(Boolean).join(' '));
        row(box, 'Registration', d.reg);
        row(box, 'Owner', [d.owner, d.country].filter(Boolean).join(', '));
        row(box, 'Airline', d.airline);
        if (d.route) { row(box, 'From', d.route.from); row(box, 'To', d.route.to); }
        if (mil) note(box, 'Military aircraft.');
        (d.signals || []).forEach(function (t) { note(box, String(t)); });
        if (/^[0-9a-f]{6}$/i.test(title)) note(box, 'Flying with no callsign shown.');
        if (!d.route) note(box, mil ? 'No published route, which is normal for military flights.' : 'No published route for this callsign (normal for private, cargo and charter flights).');
        if (d.route) box.append(el('div', 'font-size:10px;opacity:.6;margin-top:3px', 'Route is the usual one for this callsign, not a live flight plan.'));
        if (d.watched) box.append(el('div', 'font-size:10px;opacity:.6;margin-top:3px', d.watched + '. Notes are signals to look closer, not conclusions.'));
      });
    }

    function ship(body) {
      var m = (body.textContent || '').match(/Maritime Mobile Service Identity\s*(\d{9})/); if (!m) return;
      body.dataset.nviiEnriched = '1';
      var wrap = body.parentNode;   // .popup-header (with the name) and .popup-body are siblings
      var t = wrap && wrap.querySelector('.popup-title'); var name = t ? t.textContent.trim() : '';
      var box = el('div', 'margin-top:8px;padding-top:6px;border-top:1px solid rgba(128,128,128,.4);font-size:12px;line-height:1.35');
      body.append(box);
      get('/camproxy/ship.json?mmsi=' + m[1] + '&name=' + encodeURIComponent(name)).then(function (d) {
        if (!d) return;
        row(box, 'Flag', d.flag);
        row(box, 'Kind', d.service || d.kind);
        row(box, 'Built', d.built ? String(d.built) : '');
        row(box, 'Tonnage', d.gross_tonnage ? (d.gross_tonnage + ' gross' + (d.net_tonnage ? ', ' + d.net_tonnage + ' net' : '')) : '');
        row(box, 'Owner', d.owner);
        row(box, 'Home port', d.home_port);
        row(box, 'Official number', d.official_number ? (d.official_number + (d.reg_status ? ' (' + d.reg_status + ')' : '')) : '');
        row(box, 'Near', d.near);
        row(box, 'Doing', d.doing);
        row(box, 'Callsign', d.callsign);
        row(box, 'Going to', d.destination);
        row(box, 'Expected', d.eta);
        row(box, 'Size', d.length_m ? (d.length_m + ' m long' + (d.beam_m ? ', ' + d.beam_m + ' m wide' : '') + (d.draught_m ? ', sits ' + d.draught_m + ' m deep' : '')) : '');
        row(box, 'IMO number', d.imo ? String(d.imo) : '');
        if (d.destination) box.append(el('div', 'font-size:10px;opacity:.6;margin-top:3px', 'Destination and arrival are typed in by the crew, so they can be old or vague.'));
        photo(box, d.photo, [d.photo_credit, d.photo_license].filter(Boolean).join(', '), d.photo_page);
        if (!d.photo) box.append(el('div', 'font-size:10px;opacity:.6;margin-top:3px', 'No photo found for this ship.'));
        // look this ship up elsewhere (these sites block automatic lookups, so they are plain links)
        var slug = (d.reg_name || name || 'ship').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'ship';
        var more = el('div', 'font-size:11px;margin-top:6px'); more.append(el('span', 'opacity:.65', 'More on: '));
        [['VesselFinder', 'https://www.vesselfinder.com/vessels/details/' + m[1]], ['MarineTraffic', d.mt_page || ('https://www.marinetraffic.com/en/ais/details/ships/mmsi:' + m[1])],
         ['MyShipTracking', 'https://www.myshiptracking.com/vessels/' + slug + '-mmsi-' + m[1] + '-imo-' + (d.imo || d.ow_imo || 0)], ['Wingo', 'https://wingo-marine.com/ship/' + slug + '-' + m[1]],
         ['Open Waters', 'https://openwaters.io/ais/vessels/' + m[1] + '-' + slug]].forEach(function (x, i) {
          var a = el('a', 'color:inherit;text-decoration:underline', x[0]); a.href = x[1]; a.target = '_blank'; a.rel = 'noopener noreferrer';
          if (i) more.append(document.createTextNode(' · ')); more.append(a);
        });
        box.append(more);
        if (d.credit) { var cr = el('div', 'font-size:10px;opacity:.6;margin-top:3px'); var a = el('a', 'color:inherit', 'Registry details: ' + d.credit); a.href = 'https://openwaters.io/ais/'; a.target = '_blank'; a.rel = 'noopener noreferrer'; cr.append(a); box.append(cr); }
      });
    }

    function scan() {
      try {
        document.querySelectorAll('.maplibregl-popup-content').forEach(function (p) { if (!p.dataset.nviiEnriched) plane(p); });
        document.querySelectorAll('.popup-body').forEach(function (b) { if (!b.dataset.nviiEnriched) ship(b); });
      } catch (e) { /* leave popups as they are */ }
    }
    document.addEventListener('click', function () { [350, 1200, 2600].forEach(function (ms) { setTimeout(scan, ms); }); }, true);
  } catch (e) { /* ignore */ }
})();

/* nvii-editions-menu-v1 (2026-11-20, her ask): the Mission button is gone (missions are tabs now), and the row of six
   edition links becomes ONE drop-down that says what each edition is for and which tabs it holds.
   Uses the app's own edition links underneath (they stay in the page, hidden), so navigation is unchanged.
   EMON only. Remove this block to get the row and the Mission button back. */
(function () {
  try {
    if (!/^emon\./.test(location.hostname)) return;
    var INFO = {
      full: ['World', 'The main monitor. North America first: weather, floods, fires, flights, ships, outages and news, plus world conflicts.', 'Conflict Watch, Crisis Desk, Supply-Chain Risk, News Seeker, Country Watcher, Protective Travel'],
      war: ['War', 'Active fighting, one tab per area: strikes, fires, military aircraft and ships, GPS jamming, sirens and live reports.', 'Ukraine / Russia, Middle East, Red Sea & Hormuz, Africa, Asia-Pacific', '\u2694\ufe0f', '/war'],
      weather: ['Weather', 'Storms, fires, floods, quakes and water levels, and what they knock out: power, flights, shipping, supply.', 'Water & Coasts, Weather Impact, North America', '\u26c8\ufe0f', '/weather'],
      tech: ['Tech', 'The technology industry: AI, startups, data centres, cloud outages and tech events.', 'Outages & Comms, Cyber & Cables, Tech / AI Watcher'],
      finance: ['Finance', 'Money: markets, central banks, stock exchanges and the economic calendar.', 'Crisis Watch, Indexes & Big Moves, Stock Geek, NQ Day Trader'],
      commodity: ['Commodity', 'Raw materials: mines, processing plants, commodity ports, metals and prices.', 'Flow Disruptions, Market Stress'],
      energy: ['Energy', 'Energy: pipelines, storage, tankers, fuel shortages, grid and energy disruptions.', 'Dangers, Energy Security']
    };
    var css = document.createElement('style');
    css.textContent = '.mission-preset-mount,#mobileMenuMission{display:none!important}' +
      /* nvii-header-rows (her layout, 2026-11-20): three left-aligned lines at every width.
         1: EMON EARTH MONITOR + LIVE   2: edition + region   3: search, DEFCON, findings, download, playback, theme, settings */
      '.header{display:flex!important;flex-wrap:wrap!important;justify-content:flex-start!important;align-items:center!important;height:auto!important;min-height:0;row-gap:6px;column-gap:8px;padding-top:6px;padding-bottom:6px}' +
      '.header .header-left,.header .header-right{display:contents!important}' +
      '.header .nvii-hbreak{flex-basis:100%;height:0;margin:0;padding:0;border:0}' +
      '.header .logo{display:inline-block!important;order:1;white-space:nowrap}.header .logo-mobile{display:none!important}' +
      '.header .status-indicator{order:2;display:inline-flex!important;align-items:center;gap:6px;width:auto!important;height:auto!important}' +
      '.header .status-indicator .status-dot,.header .status-indicator span{display:inline-block!important}' +
      '.header #nviiHb1{order:3}.header #nviiEdBtn{order:4}.header .region-selector{order:5;display:inline-block!important}.header #nviiHb2{order:6}' +
      '.header #searchBtn{order:7;display:inline-flex!important}.header .pizzint-indicator{order:8;display:inline-flex!important}' +
      '.header .intel-findings-badge{order:9;display:inline-flex!important}.header .export-panel-container{order:10;display:inline-block!important}' +
      '.header .playback-control{order:11;display:inline-block!important}.header .nvii-theme-wrap{order:12;display:inline-block!important}' +
      '.header #unifiedSettingsMount{order:13}.header .auth-widget-mount{display:none!important}.header > *,.header .header-left > *,.header .header-right > *{margin-left:0!important;margin-right:0!important}' +
      /* nvii-tabs-wrap (her report: tabs cut off): the tab row wraps onto more lines instead of hiding tabs */
      '.dashboard-tabs-bar,.dashboard-tabs-mount{flex-wrap:wrap!important;overflow:visible!important;height:auto!important;max-height:none!important;row-gap:4px}' +
      '.dashboard-tabs-bar .dashboard-tablist{flex-wrap:wrap!important;flex:0 1 auto!important;min-width:0!important;width:auto!important;max-width:100%!important;overflow:visible!important;row-gap:4px}.dashboard-tabs-bar{justify-content:flex-start!important}' +
      '.nvii-ed-btn{font:inherit;font-weight:700;letter-spacing:.06em;padding:5px 12px;border:1px solid var(--border,#444);background:var(--surface,#111);color:var(--text,#eee);cursor:pointer;border-radius:4px;white-space:nowrap}' +
      '.nvii-ed-btn:hover,.nvii-ed-btn[aria-expanded="true"]{border-color:var(--accent,#4fc3ff)}' +
      '.nvii-ed-menu{position:fixed;z-index:10000;width:min(430px,calc(100vw - 24px));max-height:80vh;overflow:auto;background:var(--surface,#111);color:var(--text,#eee);border:1px solid var(--border,#444);border-radius:6px;box-shadow:0 12px 40px rgba(0,0,0,.5);padding:6px}' +
      '.nvii-ed-item{display:block;padding:9px 11px;border-radius:4px;color:inherit;text-decoration:none;border:1px solid transparent}' +
      '.nvii-ed-item:hover,.nvii-ed-item:focus-visible{border-color:var(--accent,#4fc3ff);outline:none}' +
      '.nvii-ed-item[aria-current="true"]{background:var(--overlay-light,rgba(128,128,128,.15))}' +
      '.nvii-ed-name{font-weight:700;letter-spacing:.05em}.nvii-ed-what{font-size:12px;opacity:.85;margin-top:2px;line-height:1.35}.nvii-ed-tabs{font-size:11px;opacity:.65;margin-top:3px;line-height:1.3}';
    (document.head || document.documentElement).appendChild(css);

    var menu = null, btn = null;
    var keepers = [], toolsMem = true;
    function toolsCollapsed() { try { var v = localStorage.getItem('nvii-tools-collapsed'); return v === null ? true : v === '1'; } catch (e) { return toolsMem; } }   // folded by default (her ask)
    function paintTools() { var b = document.getElementById('nviiToolsBtn'); if (b) { var c = toolsCollapsed(); b.textContent = 'TOOLS ' + (c ? '▸' : '▾'); b.setAttribute('aria-expanded', String(!c)); } }
    function close() { if (menu) { menu.remove(); menu = null; } if (btn) btn.setAttribute('aria-expanded', 'false'); }
    function open(links) {
      close();
      menu = document.createElement('div'); menu.className = 'nvii-ed-menu'; menu.setAttribute('role', 'menu'); menu.setAttribute('aria-label', 'Editions');
      links.forEach(function (a) {
        var v = a.getAttribute('data-variant'); var inf = INFO[v]; if (!inf) return;
        var it = document.createElement('a'); it.className = 'nvii-ed-item'; it.href = a.getAttribute('href') || '/'; it.setAttribute('role', 'menuitem');
        if (v === (window.__nviiEmonEdition || 'full')) it.setAttribute('aria-current', 'true');
        var icon = a.querySelector('.variant-icon');
        var n = document.createElement('div'); n.className = 'nvii-ed-name'; n.textContent = (icon ? icon.textContent + ' ' : '') + inf[0] + (it.getAttribute('aria-current') ? '  (you are here)' : '');
        var w = document.createElement('div'); w.className = 'nvii-ed-what'; w.textContent = inf[1];
        var t = document.createElement('div'); t.className = 'nvii-ed-tabs'; t.textContent = inf[2] ? 'Tabs: Main, ' + inf[2] : 'Tabs: Main only, add your own with +';
        it.append(n, w, t); menu.append(it);
      });
      // nvii-views-v2: War and Weather are EMON's own editions (no link from the app), listed right after World.
      ['weather', 'war'].forEach(function (v) {
        var inf = INFO[v], it = document.createElement('a'); it.className = 'nvii-ed-item'; it.href = inf[4]; it.setAttribute('role', 'menuitem');
        if (v === window.__nviiEmonEdition) it.setAttribute('aria-current', 'true');
        var n = document.createElement('div'); n.className = 'nvii-ed-name'; n.textContent = inf[3] + ' ' + inf[0] + (it.getAttribute('aria-current') ? '  (you are here)' : '');
        var w = document.createElement('div'); w.className = 'nvii-ed-what'; w.textContent = inf[1];
        var t = document.createElement('div'); t.className = 'nvii-ed-tabs'; t.textContent = 'Tabs: Main, ' + inf[2];
        it.append(n, w, t);
        var firstItem = menu.querySelector('.nvii-ed-item'); if (firstItem) firstItem.after(it); else menu.append(it);
      });
      document.body.append(menu);
      var r = btn.getBoundingClientRect();
      menu.style.top = Math.round(r.bottom + 6) + 'px';
      menu.style.left = Math.max(12, Math.min(Math.round(r.left), window.innerWidth - menu.offsetWidth - 12)) + 'px';
      btn.setAttribute('aria-expanded', 'true');
      var first = menu.querySelector('a'); if (first) first.focus();
    }
    // The app draws the edition row more than once and moves it around by screen width (header, a tablet slot beside the
    // tabs, mobile menu). So all of its copies are hidden, and ONE drop-down button of ours sits in the header right
    // after the title at every width.
    function build() {
      var links = [].slice.call(document.querySelectorAll('a.variant-option[data-variant]'));
      if (!links.length) return false;
      [].slice.call(document.querySelectorAll('.variant-switcher')).forEach(function (r) { r.style.setProperty('display', 'none', 'important'); });
      var left = document.querySelector('.header .header-left');
      if (!left) return false;
      keepers = [];
      var hb2 = document.getElementById('nviiHb2'); if (hb2) hb2.style.setProperty('display', toolsCollapsed() ? 'none' : 'block', 'important');
      var hdr0 = document.querySelector('.header');
      if (hdr0 && !document.getElementById('nviiToolsBtn')) {
        var tb = document.createElement('button'); tb.type = 'button'; tb.id = 'nviiToolsBtn'; tb.className = 'nvii-ed-btn';
        tb.title = 'Show or hide search, alerts, download, playback, theme and settings';
        tb.style.setProperty('order', '5', 'important');
        tb.addEventListener('click', function (e) {
          e.stopPropagation();
          try { localStorage.setItem('nvii-tools-collapsed', toolsCollapsed() ? '0' : '1'); } catch (err) { toolsMem = !toolsCollapsed(); }
          paintTools(); keepers.forEach(function (k) { k(); });
          var h = document.getElementById('nviiHb2'); if (h) h.style.setProperty('display', toolsCollapsed() ? 'none' : 'block', 'important');
        });
        hdr0.appendChild(tb);
      }
      paintTools();
      // Things the app hides below certain widths with rules a stylesheet cannot beat: keep them, they wrap to line two.
      if (true) {
        [['.header .pizzint-indicator', 'inline-flex'], ['.header .region-selector', 'inline-block'], ['.header #searchBtn', 'inline-flex'],
         ['.header .nvii-theme-wrap', 'inline-block'], ['.header .intel-findings-badge', 'inline-flex'], ['.header .export-panel-container', 'inline-block'],
         ['.header .playback-control', 'inline-block'], ['.header #unifiedSettingsMount', 'inline-block']].forEach(function (x) {
          var e = document.querySelector(x[0]); if (!e) return;
          // line 3 (search to settings) can be folded away with the TOOLS button; the region menu is line 2 and always stays
          var keep = function () { var want = (toolsCollapsed() && x[0] !== '.header .region-selector') ? 'none' : x[1]; if ((e.style.display !== want || e.style.getPropertyPriority('display') !== 'important')) e.style.setProperty('display', want, 'important'); };
          keepers.push(keep);
          keep();
          // the app re-hides some of these from script when the window is resized: put them back when it does
          if (!e.dataset.nviiKeep && window.MutationObserver) { e.dataset.nviiKeep = '1'; new MutationObserver(keep).observe(e, { attributes: true, attributeFilter: ['style', 'class', 'hidden'] }); }
        });
      }
      // Line order, set on the elements themselves so the app's phone-width rules cannot reshuffle them.
      [].slice.call(document.querySelectorAll('.header .header-left, .header .header-right')).forEach(function (e) { e.style.setProperty('display', 'contents', 'important'); });
      if (hdr) { [['display', 'flex'], ['flex-wrap', 'wrap'], ['justify-content', 'flex-start'], ['align-items', 'center'], ['height', 'auto'], ['flex-direction', 'row']].forEach(function (kv) { hdr.style.setProperty(kv[0], kv[1], 'important'); }); }
      [['.header .logo', 1], ['.header .status-indicator', 2], ['#nviiHb1', 3], ['#nviiEdBtn', 4], ['.header .region-selector', 5], ['#nviiHb2', 6],
       ['.header #searchBtn', 7], ['.header .pizzint-indicator', 8], ['.header .intel-findings-badge', 9], ['.header .export-panel-container', 10],
       ['.header .playback-control', 11], ['.header .nvii-theme-wrap', 12], ['.header #unifiedSettingsMount', 13]].forEach(function (x) {
        var e = document.querySelector(x[0]); if (!e) return;
        e.style.setProperty('order', String(x[1]), 'important');
        if (x[1] !== 3 && x[1] !== 6) { e.style.setProperty('position', 'relative', 'important'); ['top', 'left', 'right', 'bottom'].forEach(function (k) { e.style.setProperty(k, 'auto', 'important'); }); e.style.setProperty('margin', '0', 'important'); e.style.setProperty('translate', 'none', 'important'); e.style.setProperty('transform', 'none', 'important'); }
      });
      [].slice.call(document.querySelectorAll('.header .mobile-settings-btn, .header .mobile-search-btn')).forEach(function (e) { e.style.setProperty('display', 'none', 'important'); });
      // the original author's handle and GitHub link in the header: not shown on this copy (credit stays in the repo README)
      [].slice.call(document.querySelectorAll('.header .credit-link, .header .github-link, .header .version')).forEach(function (e) { e.style.setProperty('display', 'none', 'important'); });
      var hdr = document.querySelector('.header');
      ['nviiHb1', 'nviiHb2'].forEach(function (id) { if (hdr && !document.getElementById(id)) { var d = document.createElement('div'); d.id = id; d.className = 'nvii-hbreak'; d.setAttribute('aria-hidden', 'true'); hdr.appendChild(d); } });
      if (!document.getElementById('nviiEdBtn')) {
        var cur = INFO[window.__nviiEmonEdition || 'full'] || INFO.full;
        var b = document.createElement('button'); b.type = 'button'; b.id = 'nviiEdBtn'; b.className = 'nvii-ed-btn';
        b.setAttribute('aria-haspopup', 'menu'); b.setAttribute('aria-expanded', 'false'); b.title = 'Choose an edition';
        b.textContent = cur[0].toUpperCase() + ' ▾';
        b.addEventListener('click', function (e) {
          e.stopPropagation(); e.preventDefault();
          if (menu) { close(); return; }
          var seen = {}, uniq = [];
          [].slice.call(document.querySelectorAll('a.variant-option[data-variant]')).forEach(function (x) { var v = x.getAttribute('data-variant'); if (!seen[v]) { seen[v] = 1; uniq.push(x); } });
          btn = b; open(uniq);
        });
        var status = left.querySelector('.status-indicator');
        left.insertBefore(b, status ? status.nextSibling : left.firstChild);
      }
      return true;
    }
    var tries = 0, timer = setInterval(function () { build(); if (++tries > 40) clearInterval(timer); }, 750);
    var rz = null; window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(build, 400); });
    document.addEventListener('click', function (e) { if (menu && !menu.contains(e.target)) close(); setTimeout(build, 600); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu) { close(); if (btn) btn.focus(); } });
    window.addEventListener('resize', close);
  } catch (e) { /* leave the header as it is */ }
})();

/* nvii-tabs-menu-v1 (2026-11-21, her ask): the row of tabs becomes ONE drop-down, like the edition one: the button
   shows the tab you are on; opening it lists every tab with a line on what it is for. No close (x) buttons in the list.
   The app's own tab buttons stay in the page, hidden, and are what actually gets clicked, so switching is unchanged.
   The app's "+", options and Focus buttons stay beside the drop-down. EMON only. Remove this block to get the row back. */
(function () {
  try {
    if (!/^emon\./.test(location.hostname)) return;
    var DESC = {
     "Crisis Desk": "Conflict, posture, instability, and live intelligence.",
     "Supply-Chain Risk": "Routes, chokepoints, country risk, and commodities.",
     "Energy Security": "Pipelines, storage, tankers, outages, and disruption logs.",
     "News Seeker": "Breaking news, source context, webcams, advisories, and social signal.",
     "Stock Geek": "Stocks, market breadth, earnings, macro signals, and event context.",
     "Tech / AI Watcher": "AI labs, startups, chips, cloud, cyber, and regulation signals.",
     "Good News Explorer": "Progress, breakthroughs, conservation wins, and clean-energy momentum.",
     "NQ Day Trader": "E-mini Nasdaq-100 context, catalysts, and curated NQ news.",
     "Country Watcher": "Track the countries you care about — instability, sanctions, displacement, and risk in one view.",
     "Protective Travel": "Security, health, aviation and connectivity signals for a trip. Choose the countries and dates.",
     "Conflict Watch": "The Strait of Hormuz and the Gulf: military and civilian aircraft, ships, fires, strikes, GPS jamming and bases.",
     "Outages & Comms": "Internet and phone-network outages, cloud and service status, undersea cables, and what they are hitting.",
     "Cyber & Cables": "Cyber attacks, cable faults and repair ships, data centres and chip supply.",
     "Crisis Watch": "Signs of money trouble: financial stress, bank and bond strain, yield curve, cash moving to gold, dollars or crypto.",
     "Indexes & Big Moves": "The main indexes, which sectors are rising or falling, big price jumps, and the news behind them.",
     "Flow Disruptions": "Anything in the way of raw materials: blocked routes, ports, pipelines, sanctions, strikes, fires and storms.",
     "Market Stress": "Commodity prices under strain: metals, gold, energy, positioning and what people are paying.",
     "Dangers": "Threats to energy: attacks and fires near pipelines and tankers, grid failures, fuel shortages, chokepoints.",
     "Storms & Hazards": "Storms, quakes, fires, floods and weather alerts worldwide, with who is in the way.",
     "Water & Coasts": "Reservoir and water levels, coasts, ships at sea and coastal cameras.",
     "Weather Impact": "What the weather is breaking: power, flights, shipping, fuel and supply.",
     "North America": "US and Canada: alerts, fires, roads, power, reservoirs and flights.",
     "Overview": "Every active fight on one map, with the escalation and posture read-outs.",
     "Ukraine / Russia": "The Ukraine war zone: strikes, fires, aircraft, power and radiation watch.",
     "Middle East": "Israel, Gaza, Lebanon, Syria, Iraq, Iran: strikes, sirens, aircraft and ships.",
     "Red Sea & Hormuz": "Shipping under threat: Yemen, the Red Sea, the Gulf and the Strait of Hormuz.",
     "Africa": "Sudan, the Sahel, eastern Congo, Somalia: fighting, displacement and disease.",
     "Asia-Pacific": "Taiwan Strait, Korea, South China Sea, Myanmar: forces, ships and flare-ups.",
     "Main": "Your everyday layout for this edition."
    };
    var css = document.createElement('style');
    css.textContent = '.dashboard-tabs-bar .dashboard-tablist{display:none!important}' +
      '#nviiTabBtn{font:inherit;font-weight:700;letter-spacing:.06em;padding:5px 12px;border:1px solid var(--border,#444);background:var(--surface,#111);color:var(--text,#eee);cursor:pointer;border-radius:4px;white-space:nowrap}' +
      '#nviiTabBtn:hover,#nviiTabBtn[aria-expanded="true"]{border-color:var(--accent,#4fc3ff)}';
    (document.head || document.documentElement).appendChild(css);
    var menu = null, btn = null;
    var tabs = function () { return [].slice.call(document.querySelectorAll('#panelTabsMount .dashboard-tab')); };
    var nameOf = function (t) { var l = t.querySelector('.dashboard-tab-label'); return l ? l.textContent.trim() : ''; };
    var label = function () { var a = tabs().filter(function (t) { return t.classList.contains('active'); })[0]; if (btn) btn.textContent = ((a && nameOf(a)) || 'Tabs').toUpperCase() + ' ▾'; };
    function close() { if (menu) { menu.remove(); menu = null; } if (btn) btn.setAttribute('aria-expanded', 'false'); }
    function open() {
      close();
      menu = document.createElement('div'); menu.className = 'nvii-ed-menu'; menu.setAttribute('role', 'menu'); menu.setAttribute('aria-label', 'Tabs');
      tabs().forEach(function (t) {
        var nm = nameOf(t); if (!nm) return;
        var it = document.createElement('button'); it.type = 'button'; it.className = 'nvii-ed-item'; it.setAttribute('role', 'menuitem');
        it.style.cssText = 'width:100%;text-align:left;font:inherit;background:none;cursor:pointer';
        var on = t.classList.contains('active'); if (on) it.setAttribute('aria-current', 'true');
        var n = document.createElement('div'); n.className = 'nvii-ed-name'; n.textContent = nm + (on ? '  (you are here)' : '');
        var w = document.createElement('div'); w.className = 'nvii-ed-what'; w.textContent = DESC[nm] || 'Your own tab.';
        it.append(n, w);
        it.addEventListener('click', function () { var l = t.querySelector('.dashboard-tab-label'); close(); if (l) l.click(); setTimeout(label, 300); setTimeout(label, 1500); });
        menu.append(it);
      });
      document.body.append(menu);
      var r = btn.getBoundingClientRect();
      menu.style.top = Math.round(r.bottom + 6) + 'px';
      menu.style.left = Math.max(12, Math.min(Math.round(r.left), window.innerWidth - menu.offsetWidth - 12)) + 'px';
      btn.setAttribute('aria-expanded', 'true');
      var first = menu.querySelector('[aria-current]') || menu.querySelector('button'); if (first) first.focus();
    }
    function build() {
      var bar = document.querySelector('#panelTabsMount .dashboard-tabs-bar');
      if (!bar || !tabs().length) return false;
      // Her layout: the tab drop-down and the app's own +, options and Focus buttons sit on header line 2, between the
      // edition button and the region menu. The whole tab mount is moved there (the app keeps drawing inside it).
      var mount = document.getElementById('panelTabsMount'), hdr = document.querySelector('.header');
      if (mount && hdr && mount.parentNode !== hdr) hdr.appendChild(mount);
      if (mount) {
        [['order', '4'], ['display', 'inline-flex'], ['width', 'auto'], ['margin', '0'], ['padding', '0'], ['border', '0'], ['background', 'none'], ['flex', '0 0 auto'], ['min-height', '0']].forEach(function (kv) { mount.style.setProperty(kv[0], kv[1], 'important'); });
        [['display', 'inline-flex'], ['flex-wrap', 'nowrap'], ['align-items', 'center'], ['gap', '6px'], ['margin', '0'], ['padding', '0'], ['border', '0'], ['background', 'none'], ['box-shadow', 'none'], ['min-height', '0'], ['height', 'auto']].forEach(function (kv) { bar.style.setProperty(kv[0], kv[1], 'important'); });
        if (!mount.dataset.nviiWatch && window.MutationObserver) { mount.dataset.nviiWatch = '1'; new MutationObserver(function () { setTimeout(build, 50); }).observe(mount, { childList: true, subtree: true }); }
      }
      if (!document.getElementById('nviiTabBtn')) {
        btn = document.createElement('button'); btn.type = 'button'; btn.id = 'nviiTabBtn';
        btn.setAttribute('aria-haspopup', 'menu'); btn.setAttribute('aria-expanded', 'false'); btn.title = 'Choose a tab';
        btn.addEventListener('click', function (e) { e.stopPropagation(); if (menu) close(); else open(); });
        bar.insertBefore(btn, bar.firstChild);
      } else { btn = document.getElementById('nviiTabBtn'); }
      label();
      return true;
    }
    var tries = 0, timer = setInterval(function () { build(); if (++tries > 40) clearInterval(timer); }, 750);
    document.addEventListener('click', function (e) { if (menu && !menu.contains(e.target) && e.target !== btn) close(); setTimeout(build, 500); setTimeout(build, 1800); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu) { close(); if (btn) btn.focus(); } });
    window.addEventListener('resize', close);
  } catch (e) { /* leave the tab row as it is */ }
})();

/* nvii-emerg-v1 (2026-11-21, her ask: "where the hell is the aircraft even, or where was it last seen").
   Replaces the built-in "Aircraft emergencies" box with a plain one: who it is, what the code means, whether the signal is
   still on, the place it was last seen, and a button that moves the map there. Aircraft stay listed for 6 hours after the
   signal stops (the built-in box dropped the position after 90 seconds). Shows only while the "Aircraft emergencies" layer
   is on. Data: this site's /camproxy/emergencies.json (adsb.fi, checked once a minute). EMON only. Remove this block to
   get the built-in box back. */
(function () {
  try {
    if (!/^emon\./.test(location.hostname)) return;
    var st = document.createElement('style');
    st.textContent = '.aircraft-emergency-layer{display:none !important}' +
      '#nviiEmerg{position:absolute;top:58px;right:46px;z-index:12;width:min(320px,calc(100% - 60px));max-height:calc(100% - 120px);overflow:auto;box-sizing:border-box;' +
      'padding:8px 10px;border:1px solid #f59e0b;border-radius:6px;background:var(--panel-bg,#121820);color:var(--text-primary,#eef2f7);font-size:12px;line-height:1.4;pointer-events:auto}' +
      '#nviiEmerg button{font:inherit;color:inherit;background:transparent;border:1px solid rgba(128,128,128,.5);border-radius:4px;padding:3px 8px;cursor:pointer}' +
      '#nviiEmerg .nvii-em-head{display:block;width:100%;text-align:left;border:0;padding:0;font-weight:700}' +
      '#nviiEmerg .nvii-em-ac{margin-top:8px;padding-top:8px;border-top:1px solid rgba(128,128,128,.35)}' +
      '#nviiEmerg .nvii-em-dim{opacity:.7}' +
      '#nviiEmergPulse{position:absolute;left:50%;top:50%;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;border:3px solid #f59e0b;z-index:11;pointer-events:none;animation:nviiEmPulse 1.2s ease-out infinite}' +
      '@keyframes nviiEmPulse{0%{box-shadow:0 0 0 0 rgba(245,158,11,.8)}100%{box-shadow:0 0 0 28px rgba(245,158,11,0)}}';
    document.head.appendChild(st);
    var MEAN = { '7700': 'The crew declared a general emergency', '7600': 'The aircraft lost its radio', '7500': 'The crew set the hijack code' };
    var data = null, skew = 0, box = null;
    var el = function (tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
    var ago = function (sec) { sec = Math.max(0, Math.round(sec)); return sec < 90 ? 'just now' : sec < 5400 ? Math.round(sec / 60) + ' min ago' : (sec / 3600).toFixed(1) + ' hours ago'; };
    var layerOn = function () { try { return JSON.parse(localStorage.getItem('worldmonitor-layers') || '{}').aircraftEmergencies === true; } catch (e) { return false; } };
    var collapsed = function () { try { return localStorage.getItem('nvii-emerg-collapsed') === '1'; } catch (e) { return false; } };

    function show(a) {
      window.dispatchEvent(new CustomEvent('nvii-tab-map', { detail: { lat: a.lat, lon: a.lon, zoom: 8 } }));
      var host = document.getElementById('mapContainer'); if (!host) return;
      var old = document.getElementById('nviiEmergPulse'); if (old) old.remove();
      setTimeout(function () {
        var p = el('div'); p.id = 'nviiEmergPulse'; host.appendChild(p);
        var gone = function () { p.remove(); host.removeEventListener('pointerdown', gone, true); host.removeEventListener('wheel', gone, true); };
        host.addEventListener('pointerdown', gone, true); host.addEventListener('wheel', gone, true);
        setTimeout(gone, 30000);
      }, 900);
    }

    function render() {
      var host = document.getElementById('mapContainer');
      var list = data && data.aircraft || [];
      if (!host || !layerOn() || !list.length) { if (box) box.hidden = true; return; }
      if (!box || !box.isConnected) { box = el('section'); box.id = 'nviiEmerg'; box.setAttribute('aria-label', 'Aircraft emergencies'); host.appendChild(box); }
      box.hidden = false;
      var now = Date.now() / 1000 + skew, isShut = collapsed();
      var live = list.filter(function (a) { return now - a.last < 180; }).length;
      var frag = document.createDocumentFragment();
      var head = el('button', 'nvii-em-head', (isShut ? '▸ ' : '▾ ') + 'Aircraft emergencies: ' + live + ' now, ' + (list.length - live) + ' earlier');
      head.type = 'button'; head.setAttribute('aria-expanded', String(!isShut));
      head.onclick = function () { try { localStorage.setItem('nvii-emerg-collapsed', isShut ? '0' : '1'); } catch (e) {} render(); };
      frag.append(head);
      if (!isShut) {
        list.forEach(function (a) {
          var d = el('div', 'nvii-em-ac');
          d.append(el('div', '', [a.flight || a.reg || a.hex.toUpperCase(), a.flight && a.reg ? a.reg : '', a.type].filter(Boolean).join(' · ')));
          d.lastChild.style.fontWeight = '700';
          d.append(el('div', '', (MEAN[a.squawk] || 'Emergency code') + ' (code ' + a.squawk + ').'));
          d.append(el('div', '', now - a.last < 180 ? 'The signal is on now.' : 'The signal stopped ' + ago(now - a.last) + '.'));
          if (typeof a.lat === 'number' && typeof a.lon === 'number') {
            var where = a.place ? 'near ' + a.place : 'over open sea (' + a.lat.toFixed(1) + ', ' + a.lon.toFixed(1) + ')';
            var height = a.ground ? 'on the ground' : typeof a.alt === 'number' ? Math.round(a.alt).toLocaleString() + ' ft up' : '';
            d.append(el('div', '', 'Last seen ' + where + (height ? ', ' + height : '') + ', ' + ago(now - a.pos_t) + '.'));
            var b = el('button', '', 'Show on map'); b.type = 'button'; b.style.marginTop = '4px'; b.onclick = function () { show(a); };
            d.append(b);
          } else d.append(el('div', 'nvii-em-dim', 'It has not sent a position, so it cannot be placed on the map.'));
          frag.append(d);
        });
        var foot = el('div', 'nvii-em-ac nvii-em-dim', 'A code shows what the crew set on the transponder, not what happened. Kept here 6 hours. Source: adsb.fi.');
        frag.append(foot);
      }
      box.replaceChildren(frag);
    }

    function poll() {
      if (document.hidden || !layerOn()) { render(); return; }
      fetch('/camproxy/emergencies.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
        if (d) { data = d; skew = d.now - Date.now() / 1000; }
        render();
      }).catch(function () {});
    }
    setTimeout(poll, 4000);
    setInterval(poll, 60000);
    setInterval(render, 20000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) poll(); });
    document.addEventListener('change', function () { setTimeout(poll, 400); });   // a layer tick box changed
  } catch (e) { /* the built-in box stays hidden; nothing else is affected */ }
})();

/* nvii-pick-v1 (2026-11-21, her ask: click the conflict dots and fires and see what is going on).
   Listens for the window event 'nvii-map-pick' (added to the map by selfhost/patch_pick.py) and shows a plain popup for:
     - conflict-event dots (UCDP): who fought whom, where, when, deaths, the original report.
     - fire dots: where, when, how hot, and whether it sits on a known gas flare (World Bank flare list) or inside a
       conflict area, from this site's /camproxy/spot.json. Fire, conflict-event, strike, hotspot and natural-event popups
       also get real satellite photos of the spot (Sentinel-2 close-up, heat view, NASA wide view) from /camproxy/sat.*. If the build's own fire popup opens, the same verdict is
       added to it instead.
   EMON only. Remove this block to turn it off. */
(function () {
  try {
    if (!/^emon\./.test(location.hostname)) return;
    var st = document.createElement('style');
    st.textContent = '#nviiPick{position:absolute;z-index:1000;width:min(300px,calc(100% - 20px));box-sizing:border-box;padding:10px 12px;border:1px solid rgba(128,128,128,.6);border-radius:6px;' +
      'background:var(--panel-bg,#121820);color:var(--text-primary,#eef2f7);font-size:12px;line-height:1.4;box-shadow:0 6px 24px rgba(0,0,0,.45);pointer-events:auto;overflow-wrap:anywhere}' +
      '#nviiPick h4{margin:0 22px 6px 0;font-size:13px}#nviiPick .x{position:absolute;top:4px;right:6px;border:0;background:transparent;color:inherit;font-size:16px;cursor:pointer;line-height:1}' +
      '.map-popup:not(.map-popup-sheet){max-height:calc(100% - 16px);overflow-y:auto}' +
      '#nviiPick .dim{opacity:.7}#nviiPick a{color:inherit}.nvii-verdict{margin-top:6px;padding:4px 7px;border-left:3px solid #f59e0b;font-size:12px;line-height:1.4}';
    document.head.appendChild(st);
    var el = function (tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
    var row = function (box, label, value) { if (value == null || value === '') return; var r = el('div'); r.append(el('span', 'dim', label + ': '), el('span', '', String(value))); box.append(r); };
    var close = function () { var o = document.getElementById('nviiPick'); if (o) o.remove(); };

    function open(x, y, title) {
      close();
      var host = document.getElementById('mapContainer'); if (!host) return null;
      var box = el('div'); box.id = 'nviiPick';
      var w = host.clientWidth, h = host.clientHeight;
      box.style.left = Math.max(8, Math.min((x || 0) + 12, w - 312)) + 'px';
      if ((y || 0) > h * 0.55) box.style.bottom = Math.max(8, h - (y || 0) + 12) + 'px'; else box.style.top = Math.max(8, (y || 0) + 12) + 'px';
      var xb = el('button', 'x', '×'); xb.type = 'button'; xb.setAttribute('aria-label', 'Close'); xb.onclick = close;
      box.append(xb, el('h4', '', title));
      host.appendChild(box);
      return box;
    }
    document.addEventListener('pointerdown', function (e) { var o = document.getElementById('nviiPick'); if (o && !o.contains(e.target)) close(); }, true);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

    function verdict(s) {
      if (!s) return '';
      if (s.flare) return 'Most likely a gas flare, not an attack: it is ' + s.flare.km + ' km from the ' + (s.flare.field || 'listed') + ' ' + (s.flare.location === 'offshore' ? 'offshore ' : '') + 'flare' +
        (s.flare.operator ? ' (' + s.flare.operator + ')' : '') + ', which the World Bank lists as burning in ' + s.flare.year + '. Flares burn day and night.';
      if (s.zone) return 'Inside the ' + s.zone + ' area and not on any listed gas flare. A satellite sees heat only: it cannot tell a strike from a brush fire, so check the news and strike dots around it.';
      return 'Not on any listed gas flare. Usually a wildfire, a farm burn or an industrial fire.';
    }
    var spot = function (lat, lon) { return fetch('/camproxy/spot.json?lat=' + lat + '&lon=' + lon).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); };

    function fire(d) {
      var f = d.object || {}; if (typeof f.lat !== 'number' || typeof f.lon !== 'number') return;
      setTimeout(function () {
        var builtIn = document.querySelector('.popup-header.fire-detection');
        var body = builtIn && builtIn.parentNode && builtIn.parentNode.querySelector('.popup-body');
        var box = null, whereLine = null, v;
        if (body) { whereLine = el('div', '', 'Looking up the place…'); whereLine.style.cssText = 'font-weight:700;margin-bottom:2px'; v = el('div', 'nvii-verdict', 'Checking what is at this spot…'); v.style.marginBottom = '8px'; body.prepend(whereLine, v); }
        else {
          box = open(d.x, d.y, 'Fire seen by satellite'); if (!box) return;
          whereLine = el('div', '', 'Looking up the place…'); box.append(whereLine);
          row(box, 'Seen', [f.acq_date, f.daynight === 'N' ? 'night pass' : f.daynight === 'D' ? 'day pass' : ''].filter(Boolean).join(', '));
          row(box, 'Satellite', f.satellite);
          row(box, 'Heat output', f.frp > 0 ? Math.round(f.frp * 10) / 10 + ' MW' : '');
          row(box, 'Confidence', f.confidence > 0 ? Math.round(f.confidence) + '%' : '');
          v = el('div', 'nvii-verdict', 'Checking what is at this spot…'); box.append(v);
          box.append(el('div', 'dim', 'Source: NASA FIRMS. Position: ' + f.lat.toFixed(3) + ', ' + f.lon.toFixed(3)));
          box.lastChild.style.marginTop = '6px';
        }
        photos(body || box, f.lat, f.lon, f.detected_at ? f.detected_at / 1000 : 0);
        spot(f.lat, f.lon).then(function (s) {
          if (whereLine) whereLine.textContent = s ? (s.place ? 'Near ' + s.place : 'Over open sea') : 'Place lookup failed.';
          v.textContent = s ? verdict(s) : 'Could not check this spot.';
        });
      }, 300);
    }

    // Real satellite photos of the clicked spot: Sentinel-2 close-up (6 km box, 10 m per pixel), heat view, and NASA's wide daily photo.
    var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var nice = function (d) { return Number(d.slice(8, 10)) + ' ' + MON[Number(d.slice(5, 7)) - 1]; };
    function photos(host, lat, lon, tSec) {
      if (!host || typeof lat !== 'number' || typeof lon !== 'number' || host.querySelector('.nvii-photos')) return;
      var wrap = el('div', 'nvii-photos'); wrap.style.cssText = 'margin-top:8px;padding-top:8px;border-top:1px solid rgba(128,128,128,.35)';
      var status = el('div', 'dim', 'Looking for satellite photos of this spot…'); wrap.append(status); host.append(wrap);
      fetch('/camproxy/sat.json?lat=' + lat + '&lon=' + lon + (tSec ? '&t=' + Math.round(tSec) : '')).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }).then(function (s) {
        var today = new Date().toISOString().slice(0, 10), evDay = tSec ? new Date(tSec * 1000).toISOString().slice(0, 10) : '';
        var state = { day: s && s.latest ? s.latest.date : '', mode: s && s.latest ? 'true' : 'wide' };
        var frame = el('a'); frame.target = '_blank'; frame.rel = 'noopener noreferrer'; frame.style.cssText = 'display:block;position:relative;aspect-ratio:1;background:#000;border-radius:4px;overflow:hidden';
        var img = el('img'); img.alt = ''; img.style.cssText = 'display:block;width:100%;height:100%;object-fit:cover';
        var ring = el('div'); ring.style.cssText = 'position:absolute;left:50%;top:50%;width:26px;height:26px;margin:-13px 0 0 -13px;border:2px solid #fff;border-radius:50%;box-shadow:0 0 0 1px #000;pointer-events:none';
        frame.append(img, ring);
        var cap = el('div', 'dim'); cap.style.marginTop = '4px';
        var bar = el('div'); bar.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin-top:6px';
        var draw = function () {
          var wide = state.mode === 'wide', day = wide ? (state.day || evDay || today) : state.day;
          var url = wide ? '/camproxy/wide.jpg?lat=' + lat + '&lon=' + lon + '&d=' + day : '/camproxy/sat.jpg?lat=' + lat + '&lon=' + lon + '&d=' + day + '&m=' + state.mode;
          img.style.opacity = '.35'; img.onload = function () { img.style.opacity = '1'; }; img.onerror = function () { cap.textContent = 'That picture could not be loaded.'; };
          img.src = url; frame.href = url;
          cap.textContent = wide ? 'NASA daily photo, ' + nice(day) + '. About 330 km across: good for smoke plumes, too coarse for buildings or ships. Ring = this spot.'
            : (state.mode === 'heat' ? 'Heat view' : 'Photo') + ' from Sentinel-2, ' + nice(day) + (evDay ? (day < evDay ? ' (before this event)' : day === evDay ? ' (same day as this event)' : ' (after this event)') : '') +
              '. 6 km across, 10 m per pixel' + (state.mode === 'heat' ? '. Active fire glows orange, burnt ground is dark red-brown.' : '.') + ' Ring = this spot.';
          Array.prototype.forEach.call(bar.children, function (b) { b.style.borderColor = b.dataset.on === state.mode + '|' + (b.dataset.day || '') || (b.dataset.kind === state.mode && !b.dataset.day) ? '#f59e0b' : 'rgba(128,128,128,.5)'; });
        };
        var btn = function (label, fn, kind, day) { var b = el('button', '', label); b.type = 'button'; b.dataset.kind = kind; if (day) b.dataset.day = day; b.dataset.on = kind + '|' + (day || ''); b.style.cssText = 'font:inherit;color:inherit;background:transparent;border:1px solid rgba(128,128,128,.5);border-radius:4px;padding:2px 7px;cursor:pointer'; b.onclick = function () { fn(); draw(); }; bar.append(b); };
        status.remove();
        if (s && s.latest) {
          btn('Photo ' + nice(s.latest.date), function () { state.mode = 'true'; state.day = s.latest.date; }, 'true', s.latest.date);
          if (s.before) btn('Earlier ' + nice(s.before.date), function () { state.mode = 'true'; state.day = s.before.date; }, 'true', s.before.date);
          btn('Heat view', function () { if (state.mode === 'wide') state.day = s.latest.date; state.mode = 'heat'; }, 'heat');
        } else wrap.append(el('div', 'dim', 'No close-up photo exists for this spot (the open sea is not photographed, and cloudy days are skipped).'));
        btn('Wide view', function () { state.mode = 'wide'; }, 'wide');
        wrap.append(frame, cap, bar);
        if (s && s.latest && evDay && s.latest.date < evDay) wrap.append(el('div', 'dim', 'No clear close-up has been taken since this event yet; the satellite passes about every 5 days.'));
        draw();
      });
    }

    var KIND = { 'state-based': 'Fighting involving a government', 'non-state': 'Fighting between armed groups', 'one-sided': 'Attack on civilians' };
    function clash(d) {
      var e = d.object || {};
      var box = open(d.x, d.y, KIND[e.type_of_violence] || 'Armed clash'); if (!box) return;
      if (e.side_a || e.side_b) { box.append(el('div', '', [e.side_a, e.side_b].filter(Boolean).join('  vs  '))); box.lastChild.style.fontWeight = '700'; }
      row(box, 'Where', [e.locationName, e.country].filter(Boolean).join(', ') + (e.hasPreciseLocation === false ? ' (spot is approximate)' : ''));
      row(box, 'When', e.date_start && e.date_end && e.date_end !== e.date_start ? String(e.date_start).slice(0, 10) + ' to ' + String(e.date_end).slice(0, 10) : String(e.date_start || '').slice(0, 10));
      if (typeof e.deaths_best === 'number') row(box, 'Deaths', e.deaths_best + (e.deaths_high > e.deaths_low ? ' (reports range ' + e.deaths_low + ' to ' + e.deaths_high + ')' : ''));
      if (e.source_original) row(box, 'First reported by', String(e.source_original).slice(0, 180));
      box.append(el('div', 'dim', 'Source: UCDP conflict records, Uppsala University.'));
      box.lastChild.style.marginTop = '6px';
      photos(box, e.latitude, e.longitude, e.date_start ? Date.parse(e.date_start) / 1000 : 0);
    }

    // Warships from the weekly US Navy tracker have no live position: every ship in a region is drawn at one rough point.
    function navy(d) {
      var o = d.object || {}, list = o.vessels || o.items || [o];
      var weekly = list.filter(function (v) { return v && v.usniSource; });
      if (!weekly.length) return;
      var v0 = weekly[0], day = v0.usniArticleDate ? String(v0.usniArticleDate).slice(0, 10) : '';
      setTimeout(function () {
        var pops = document.querySelectorAll('.map-popup .popup-body'), body = pops[pops.length - 1];
        if (!body || body.querySelector('.nvii-verdict')) return;
        var n = el('div', 'nvii-verdict', (weekly.length === list.length ? 'Not a live position. ' : weekly.length + ' of these are not live positions. ') +
          'The US Naval Institute weekly fleet report' + (day ? ' of ' + day : '') + ' only says "' + (v0.usniRegion || 'this region') +
          '", so every ship listed there is drawn on one rough spot. It says where the ship was that week, not what it is doing now, and things drawn near it are not really near it.');
        n.style.marginBottom = '8px';
        body.prepend(n);
      }, 300);
    }

    function other(d) {
      var c = d.coordinate || [], o = d.object || {};
      var lat = typeof o.latitude === 'number' ? o.latitude : typeof o.lat === 'number' ? o.lat : c[1], lon = typeof o.longitude === 'number' ? o.longitude : typeof o.lon === 'number' ? o.lon : c[0];
      var t = Number(o.timestamp) || 0; if (t > 1e12) t = t / 1000;
      setTimeout(function () { var pops = document.querySelectorAll('.map-popup .popup-body'); photos(pops[pops.length - 1], lat, lon, t); }, 350);
    }

    window.addEventListener('nvii-map-pick', function (ev) {
      try {
        var d = ev.detail || {};
        if (d.layerId === 'ucdp-events-layer') clash(d);
        else if (d.layerId === 'fires-layer') fire(d);
        else if (d.layerId === 'iran-events-layer' || d.layerId === 'natural-events-layer' || d.layerId === 'conflict-zones-layer' || d.layerId === 'hotspots-layer') other(d);
        else if (d.layerId === 'military-vessels-layer' || d.layerId === 'military-vessel-clusters-layer') navy(d);
      } catch (e) { /* leave the map alone */ }
    });
  } catch (e) { /* nothing else is affected */ }
})();

/* nvii-views-v2 (2026-11-21, her ask): views honed on vital information.
   New tabs, put right after "Main":  Tech: Outages & Comms, Cyber & Cables.  Finance: Crisis Watch, Indexes & Big Moves
   (ahead of Stock Geek / NQ Day Trader).  Commodity: Flow Disruptions, Market Stress.  Energy: Dangers.
   Two new editions built on the World app, each with its own tab list (parked by the first block in this file):
     /weather  Storms & Hazards, Water & Coasts, Weather Impact, North America   (replaces Good News in the edition menu)
     /war      Overview, Ukraine / Russia, Middle East, Red Sea & Hormuz, Africa, Asia-Pacific
   Added once per edition per browser (marker nvii-views-v2:<edition>); after that the tabs are hers to rename, delete
   or add to. A tab carries its panels and its map (layers, position, time range). To change what everyone gets, edit
   TABS and bump the marker to -v3. EMON only. */
(function () {
  try {
    if (!/^emon\./.test(location.hostname)) return;
    var ed = window.__nviiEmonEdition || 'full';
    var TABS = {"tech":[{"name":"Outages & Comms","panels":["map","internet-disruptions","service-status","cloud","security","live-news","insights","airline-intel"],"map":{"layers":{"outages":true,"cables":true,"cyberThreats":true,"datacenters":true,"cloudRegions":true,"natural":true,"weather":true,"gpsJamming":true},"view":"global","zoom":2.2,"timeRange":"24h"}},{"name":"Cyber & Cables","panels":["map","security","internet-disruptions","service-status","policy","hardware","cloud","live-news"],"map":{"layers":{"cyberThreats":true,"cables":true,"outages":true,"datacenters":true,"cloudRegions":true},"view":"global","zoom":2.2,"timeRange":"7d"}}],"finance":[{"name":"Crisis Watch","panels":["map","fsi","economic","yield-curve","liquidity-shifts","centralbanks","bonds","fear-greed","macro-signals","gold-intelligence","stablecoins","etf-flows","fx","sanctions-pressure","live-news","insights"],"map":{"layers":{"centralBanks":true,"financialCenters":true,"stockExchanges":true,"economic":true,"sanctions":true,"outages":true},"view":"global","zoom":2.2,"timeRange":"48h"}},{"name":"Indexes & Big Moves","panels":["map","markets","heatmap","market-breadth","macro-tiles","news-market-correlation","positioning-247","cot-positioning","derivatives","crypto","commodities","energy-complex","consumer-prices","economic-calendar","daily-market-brief","polymarket"],"map":{"layers":{"stockExchanges":true,"financialCenters":true,"centralBanks":true,"commodityHubs":true,"economic":true},"view":"global","zoom":2.2,"timeRange":"24h"}}],"commodity":[{"name":"Flow Disruptions","panels":["map","supply-chain","china-corridors","pipeline-status","sanctions-pressure","trade-policy","oil-inventories","commodities","energy-complex","news-market-correlation","live-news","insights","airline-intel"],"map":{"layers":{"tradeRoutes":true,"waterways":true,"ais":true,"commodityPorts":true,"commodityHubs":true,"miningSites":true,"processingPlants":true,"pipelines":true,"sanctions":true,"conflicts":true,"fires":true,"natural":true,"weather":true,"outages":true},"view":"global","zoom":2.2,"timeRange":"7d"}},{"name":"Market Stress","panels":["map","markets","commodities","gold-silver","base-metals","critical-minerals","gold-intelligence","liquidity-shifts","positioning-247","macro-signals","economic","consumer-prices","polymarket","commodity-news"],"map":{"layers":{"commodityHubs":true,"commodityPorts":true,"miningSites":true,"processingPlants":true,"sanctions":true},"view":"global","zoom":2.2,"timeRange":"48h"}}],"energy":[{"name":"Dangers","panels":["map","energy-disruptions","energy-risk-overview","grid-disruption-clock","fuel-shortages","chokepoint-strip","hormuz-tracker","pipeline-status","energy-crisis","sanctions-pressure","climate","live-news","insights"],"map":{"layers":{"pipelines":true,"storageFacilities":true,"fuelShortages":true,"liveTankers":true,"ais":true,"waterways":true,"conflicts":true,"iranAttacks":true,"military":true,"fires":true,"natural":true,"weather":true,"outages":true,"nuclear":true,"radiationWatch":true,"sanctions":true},"view":"global","zoom":2.2,"timeRange":"7d"}}],"weather":[{"name":"Storms & Hazards","panels":["map","disaster-correlation","climate","climate-news","satellite-fires","population-exposure","live-news","insights","live-webcams"],"map":{"layers":{"weather":true,"natural":true,"fires":true,"climate":true,"canadaAlerts":true,"outages":true,"dayNight":true},"view":"global","zoom":2.2,"timeRange":"48h"}},{"name":"Water & Coasts","panels":["map","reservoir-levels","climate","disaster-correlation","population-exposure","live-webcams","windy-webcams","climate-news"],"map":{"layers":{"reservoirLevels":true,"natural":true,"weather":true,"waterways":true,"ais":true,"webcams":true},"view":"global","zoom":2.2,"timeRange":"7d"}},{"name":"Weather Impact","panels":["map","grid-disruption-clock","energy-disruptions","airline-intel","supply-chain","cascade","fuel-shortages","commodities","energy-complex","markets","disaster-correlation"],"map":{"layers":{"weather":true,"natural":true,"outages":true,"flights":true,"ais":true,"pipelines":true,"tradeRoutes":true,"canadaRoads":true,"fires":true},"view":"global","zoom":2.2,"timeRange":"48h"}},{"name":"North America","panels":["map","grid-disruption-clock","climate","satellite-fires","reservoir-levels","airline-intel","us","live-webcams","disaster-correlation"],"map":{"layers":{"weather":true,"natural":true,"fires":true,"canadaAlerts":true,"canadaRoads":true,"outages":true,"reservoirLevels":true,"flights":true,"webcams":true},"lat":42,"lon":-98,"zoom":3.4,"timeRange":"24h"}}],"war":[{"name":"Overview","panels":["map","strategic-posture","military-correlation","escalation-correlation","thermal-escalation","ucdp-events","gdelt-intel","telegram-intel","cii","strategic-risk","displacement","live-news","insights"],"map":{"layers":{"conflicts":true,"hotspots":true,"military":true,"bases":true,"iranAttacks":true,"ucdpEvents":true,"fires":true,"gpsJamming":true,"aircraftEmergencies":true,"flights":true,"nuclear":true,"displacement":true},"view":"global","zoom":2.2,"timeRange":"7d"}},{"name":"Ukraine / Russia","panels":["map","europe","military-correlation","escalation-correlation","thermal-escalation","ucdp-events","gdelt-intel","telegram-intel","satellite-fires","energy-disruptions","radiation-watch","displacement","live-news","live-webcams"],"map":{"layers":{"conflicts":true,"hotspots":true,"military":true,"bases":true,"iranAttacks":true,"ucdpEvents":true,"fires":true,"gpsJamming":true,"aircraftEmergencies":true,"flights":true,"nuclear":true,"radiationWatch":true,"pipelines":true,"outages":true},"lat":48.5,"lon":35.5,"zoom":5,"timeRange":"48h"}},{"name":"Middle East","panels":["map","middleeast","oref-sirens","thermal-escalation","military-correlation","strategic-posture","gdelt-intel","telegram-intel","ucdp-events","hormuz-tracker","satellite-fires","live-news","live-webcams"],"map":{"layers":{"conflicts":true,"hotspots":true,"military":true,"bases":true,"iranAttacks":true,"ucdpEvents":true,"fires":true,"gpsJamming":true,"aircraftEmergencies":true,"flights":true,"nuclear":true,"ais":true,"waterways":true},"lat":31.5,"lon":42,"zoom":4.4,"timeRange":"48h"}},{"name":"Red Sea & Hormuz","panels":["map","hormuz-tracker","chokepoint-strip","ukmto-incidents","supply-chain","energy-complex","military-correlation","thermal-escalation","gdelt-intel","live-news"],"map":{"layers":{"conflicts":true,"hotspots":true,"military":true,"bases":true,"iranAttacks":true,"ucdpEvents":true,"fires":true,"gpsJamming":true,"aircraftEmergencies":true,"flights":true,"nuclear":true,"ais":true,"waterways":true,"tradeRoutes":true},"lat":20,"lon":50,"zoom":4.3,"timeRange":"7d"}},{"name":"Africa","panels":["map","africa","ucdp-events","displacement","cii","gdelt-intel","disease-outbreaks","population-exposure","live-news"],"map":{"layers":{"conflicts":true,"ucdpEvents":true,"displacement":true,"hotspots":true,"protests":true,"fires":true,"natural":true,"military":true},"lat":8,"lon":25,"zoom":3.4,"timeRange":"7d"}},{"name":"Asia-Pacific","panels":["map","asia","strategic-posture","military-correlation","escalation-correlation","gdelt-intel","ucdp-events","sanctions-pressure","cii","live-news"],"map":{"layers":{"conflicts":true,"hotspots":true,"military":true,"bases":true,"iranAttacks":true,"ucdpEvents":true,"fires":true,"gpsJamming":true,"aircraftEmergencies":true,"flights":true,"nuclear":true,"ais":true,"waterways":true},"lat":24,"lon":118,"zoom":3.6,"timeRange":"7d"}}]};
    var want = TABS[ed] || [];
    var own = ed === 'war' || ed === 'weather';
    var KEY = 'worldmonitor-tabs-v1:' + (own ? 'full' : ed), MARK = 'nvii-views-v2:' + ed;
    if (!want.length || localStorage.getItem(MARK)) return;
    var st = JSON.parse(localStorage.getItem(KEY) || 'null');
    var fresh = false, tpl = null;
    if (own && (!st || !Array.isArray(st.tabs) || !st.tabs.length)) {   // first visit to War / Weather: build its tab list from scratch
      var world = JSON.parse(localStorage.getItem('nvii-emon-tabs-full') || 'null');
      tpl = world && world.tabs && world.tabs[0] && world.tabs[0].panelSettings;
      if (!tpl) return;                                                 // open World once first; then this fills in
      st = { activeTabId: '', tabs: [] }; fresh = true;
    }
    if (!st || !Array.isArray(st.tabs) || (!st.tabs.length && !fresh)) return;
    tpl = tpl || st.tabs[0].panelSettings || {};
    var have = {}; st.tabs.forEach(function (t) { have[String(t.name).toLowerCase()] = 1; });
    var made = [];
    want.forEach(function (w, i) {
      var name = fresh && i === 0 ? 'Main' : w.name;
      if (have[name.toLowerCase()]) return;
      var ps = JSON.parse(JSON.stringify(tpl));
      Object.keys(ps).forEach(function (k) { if (ps[k] && typeof ps[k] === 'object') ps[k].enabled = false; });
      w.panels.forEach(function (k, n) {
        if (ps[k] && typeof ps[k] === 'object') ps[k].enabled = true;
        else ps[k] = { name: k === 'map' ? 'Global Map' : k, enabled: true, priority: n < 6 ? 1 : 2 };
      });
      made.push({ id: 'tab-' + (Date.now() + i).toString(36) + '-' + Math.random().toString(36).slice(2, 8),
        name: name, panelSettings: ps, panelOrder: w.panels.filter(function (k) { return k !== 'map'; }), bottomSet: [], nviiMap: w.map });
    });
    if (!made.length) { localStorage.setItem(MARK, '1'); return; }
    if (fresh) {
      st.tabs = made; st.activeTabId = made[0].id;
      // The open tab reads the app's live settings, not its own copy, so write those too for the first tab.
      // Start from World's saved settings (edition marker, one-time migration flags), or the app sees a brand-new
      // edition and resets the panels to its defaults.
      try { var snap = JSON.parse(localStorage.getItem('nvii-emon-snap-full') || '{}'); Object.keys(snap).forEach(function (k) { localStorage.setItem(k, snap[k]); }); } catch (e0) {}
      localStorage.setItem('worldmonitor-variant', 'full');
      var all = { hotspots: false };
      try { Object.keys(JSON.parse(localStorage.getItem('worldmonitor-layers') || '{}')).forEach(function (k) { all[k] = false; }); } catch (e1) {}
      Object.keys(want[0].map.layers).forEach(function (k) { all[k] = true; });
      localStorage.setItem('worldmonitor-panels', JSON.stringify(made[0].panelSettings));
      localStorage.setItem('panel-order', JSON.stringify(made[0].panelOrder));
      localStorage.setItem('worldmonitor-layers', JSON.stringify(all));
      try { var u = new URL(location.href); u.searchParams.set('view', want[0].map.view || 'global'); u.searchParams.set('zoom', String(want[0].map.zoom || 2.2)); u.searchParams.set('timeRange', want[0].map.timeRange || '7d'); u.searchParams.delete('layers'); history.replaceState(null, '', u); } catch (e2) {}
    } else {
      st.tabs.splice.apply(st.tabs, [1, 0].concat(made));
    }
    localStorage.setItem(KEY, JSON.stringify(st));
    localStorage.setItem(MARK, '1');
  } catch (e) { /* storage blocked or unexpected shape: leave the tabs alone */ }
})();

/* nvii-timerange-v1 (2026-11-21, her ask: "i DO want to always see that"): the 1h / 6h / 24h / 48h / 7d / all bar is drawn
   only by the flat map, so it vanished in 3D. When the map's own bar is not on screen, this shows the same six buttons
   at the top left of the map. They set the range through the app's own call (window event nvii-tab-map). EMON only. */
(function () {
  try {
    if (!/^emon\./.test(location.hostname)) return;
    var R = ['1h', '6h', '24h', '48h', '7d', 'all'], bar = null, picked = '';
    var st = document.createElement('style');
    st.textContent = '#nviiRange{position:absolute;top:10px;left:10px;z-index:20;display:flex;gap:2px;align-items:center;padding:4px 6px;border:1px solid var(--border,#444);border-radius:6px;background:var(--panel-bg,#121820);color:var(--text,#eee);font-size:11px;pointer-events:auto}' +
      '#nviiRange span{opacity:.7;margin-right:4px;letter-spacing:.06em}#nviiRange button{font:inherit;color:inherit;background:transparent;border:1px solid transparent;border-radius:4px;padding:2px 6px;cursor:pointer}' +
      '#nviiRange button[aria-pressed="true"]{border-color:var(--accent,#f59e0b);font-weight:700}';
    document.head.appendChild(st);
    var shown = function (e) { return !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden'; };
    function tick() {
      var host = document.getElementById('mapContainer'); if (!host) return;
      var own = [].slice.call(host.querySelectorAll('.time-slider, .deckgl-time-slider')).some(shown);
      if (own) { if (bar) bar.hidden = true; return; }
      if (!bar || !bar.isConnected) {
        bar = document.createElement('div'); bar.id = 'nviiRange'; bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', 'Time range');
        var lab = document.createElement('span'); lab.textContent = 'TIME RANGE'; bar.append(lab);
        R.forEach(function (r) {
          var b = document.createElement('button'); b.type = 'button'; b.textContent = r === 'all' ? 'ALL' : r.toUpperCase(); b.dataset.r = r;
          b.onclick = function () { picked = r; window.dispatchEvent(new CustomEvent('nvii-tab-map', { detail: { timeRange: r } })); paint(); };
          bar.append(b);
        });
        host.appendChild(bar);
      }
      bar.hidden = false; paint();
    }
    function paint() {
      if (!bar) return;
      var now = picked || new URLSearchParams(location.search).get('timeRange') || '7d';
      [].slice.call(bar.querySelectorAll('button')).forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.r === now)); });
    }
    setInterval(tick, 1500);
  } catch (e) { /* nothing else is affected */ }
})();

/* nvii-scene-v1 (2026-11-21, her ask): "ON THE SCENE" - what people are posting from the place the map is on, newest
   first, before the news has it. A button on the map opens a list; the same posts are dots on the map (click a dot).
   What it looks for follows the edition (Weather: floods, tornadoes, waterspouts...; War: explosions, strikes, drones...)
   and the time window follows the map's time range (capped at 48 h).
   Sources, all without any account or key: Bluesky, Mastodon, the city's subreddit, and US storm-spotter reports.
   Only spotter reports have real coordinates; the rest are found by the place name in the post and pinned on that place.
   Data: this site's /camproxy/scene.json (5-minute cache). Dots need the app patch selfhost/patch_poi.py; the list works
   without it. EMON only. Remove this block to turn it off. */
(function () {
  try {
    if (!/^emon\./.test(location.hostname)) return;
    var st = document.createElement('style');
    st.textContent = '#nviiSceneBtn{position:absolute;top:10px;left:350px;z-index:21;font:inherit;font-size:11px;font-weight:700;letter-spacing:.06em;padding:5px 10px;border:1px solid var(--accent,#f59e0b);border-radius:6px;background:var(--panel-bg,#121820);color:var(--text,#eee);cursor:pointer;pointer-events:auto}' +
      '#nviiScene{position:absolute;top:44px;left:350px;z-index:21;width:min(340px,calc(100% - 20px));max-height:calc(100% - 60px);display:flex;flex-direction:column;box-sizing:border-box;border:1px solid var(--border,#444);border-radius:6px;background:var(--panel-bg,#121820);color:var(--text,#eee);font-size:12px;line-height:1.4;pointer-events:auto;box-shadow:0 6px 24px rgba(0,0,0,.45)}' +
      '#nviiScene .hd{padding:8px 10px;border-bottom:1px solid var(--border,#444)}#nviiScene .hd b{display:block;font-size:13px}#nviiScene .dim{opacity:.7}' +
      '#nviiScene .chips{display:flex;gap:4px;margin-top:6px;flex-wrap:wrap}#nviiScene .chips button{font:inherit;color:inherit;background:transparent;border:1px solid rgba(128,128,128,.5);border-radius:4px;padding:1px 7px;cursor:pointer}#nviiScene .chips button[aria-pressed="true"]{border-color:var(--accent,#f59e0b);font-weight:700}' +
      '#nviiScene .list{overflow:auto;padding:4px 6px 8px}#nviiScene a.it{display:flex;gap:8px;padding:7px 4px;border-bottom:1px solid rgba(128,128,128,.25);color:inherit;text-decoration:none}#nviiScene a.it:hover,#nviiScene a.it.on{background:var(--overlay-light,rgba(128,128,128,.15))}' +
      '#nviiScene .th{flex:0 0 76px;height:76px;border-radius:4px;background:#000 center/cover no-repeat;position:relative}#nviiScene .th.v::after{content:"\\25B6";position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px;text-shadow:0 0 6px #000}' +
      '#nviiScene .tx{display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}#nviiScene .net{font-weight:700}';
    st.textContent += '@media (max-width:900px){#nviiSceneBtn{left:10px;top:auto;bottom:12px}#nviiScene{left:10px;top:auto;bottom:44px;max-height:calc(100% - 110px)}}';   /* beside the layer list on wide screens, bottom-left on narrow ones */
    document.head.appendChild(st);
    var el = function (tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
    var ed = window.__nviiEmonEdition === 'war' ? 'war' : window.__nviiEmonEdition === 'weather' ? 'weather' : 'full';
    var COLORS = { 'Bluesky': '#38bdf8', 'Mastodon': '#a78bfa', 'Reddit': '#fb923c', 'Storm spotter': '#facc15' };
    var view = null, data = null, lastKey = '', videoOnly = false, busy = false, btn = null, box = null, timer = null;
    var isOpen = function () { try { return localStorage.getItem('nvii-scene-open') === '1'; } catch (e) { return false; } };
    var ago = function (sec) { sec = Math.max(0, sec); return sec < 3600 ? Math.max(1, Math.round(sec / 60)) + ' min ago' : sec < 172800 ? Math.round(sec / 3600) + ' h ago' : Math.round(sec / 86400) + ' days ago'; };
    function readView() {
      var q = new URLSearchParams(location.search), lat = parseFloat(q.get('lat')), lon = parseFloat(q.get('lon')), z = parseFloat(q.get('zoom'));
      if (view && view.fromMap) return view;
      return isFinite(lat) && isFinite(lon) ? { lat: lat, lon: lon, zoom: isFinite(z) ? z : 3 } : null;
    }
    function hours() { var r = new URLSearchParams(location.search).get('timeRange') || '24h'; return { '1h': 1, '6h': 6, '24h': 24, '48h': 48 }[r] || 48; }

    function dots() {
      var feats = [];
      if (isOpen() && data && data.items.length) {
        var loose = data.items.filter(function (i) { return !i.exact && (!videoOnly || i.video); });
        if (loose.length) feats.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [loose[0].lon, loose[0].lat] }, properties: { color: '#22d3ee', n: loose.length, group: 1 } });
        data.items.forEach(function (i, n) { if (i.exact && !videoOnly) feats.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [i.lon, i.lat] }, properties: { color: COLORS[i.net] || '#facc15', n: 1, idx: n } }); });
      }
      window.dispatchEvent(new CustomEvent('nvii-poi-set', { detail: { type: 'FeatureCollection', features: feats } }));
    }

    function paint(note) {
      var host = document.getElementById('mapContainer'); if (!host) return;
      if (!btn || !btn.isConnected) { btn = el('button', '', ''); btn.id = 'nviiSceneBtn'; btn.type = 'button'; btn.onclick = function () { try { localStorage.setItem('nvii-scene-open', isOpen() ? '0' : '1'); } catch (e) {} lastKey = ''; load(); paint(); }; host.appendChild(btn); }
      btn.textContent = 'ON THE SCENE ' + (isOpen() ? '\u25BE' : '\u25B8'); btn.setAttribute('aria-expanded', String(isOpen()));
      if (!isOpen()) { if (box) box.remove(); box = null; dots(); return; }
      if (!box || !box.isConnected) { box = el('section'); box.id = 'nviiScene'; box.setAttribute('aria-label', 'On the scene'); host.appendChild(box); }
      var hd = el('div', 'hd'), list = el('div', 'list');
      if (!note && !data) note = 'Looking for posts\u2026';
      if (note) { hd.append(el('b', '', 'On the scene'), el('div', 'dim', note)); box.replaceChildren(hd); dots(); return; }
      var items = (data ? data.items : []).filter(function (i) { return !videoOnly || i.video; });
      hd.append(el('b', '', 'On the scene: ' + (data.place || 'this area')), el('div', 'dim', items.length + ' post' + (items.length === 1 ? '' : 's') + ' in the last ' + data.hours + ' h, newest first. Looking for: ' + data.topics.slice(0, 6).join(', ') + '.'));
      var chips = el('div', 'chips');
      [['All', false], ['Video only', true]].forEach(function (c) { var b = el('button', '', c[0]); b.type = 'button'; b.setAttribute('aria-pressed', String(videoOnly === c[1])); b.onclick = function () { videoOnly = c[1]; paint(); }; chips.append(b); });
      hd.append(chips);
      var now = Date.now() / 1000;
      items.forEach(function (i) {
        var a = el('a', 'it'); a.href = i.link; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.dataset.idx = String(data.items.indexOf(i));
        if (i.thumb && /^https:\/\//.test(i.thumb)) { var th = el('div', 'th' + (i.video ? ' v' : '')); th.style.backgroundImage = 'url("' + i.thumb.replace(/["\\)]/g, '') + '")'; a.append(th); }
        var body = el('div'); body.style.minWidth = '0';
        var top = el('div'); var net = el('span', 'net', i.net); net.style.color = COLORS[i.net] || 'inherit';
        top.append(net, el('span', 'dim', ' \u00b7 ' + ago(now - i.t) + (i.video && !i.thumb ? ' \u00b7 video' : '') + (i.exact ? ' \u00b7 exact spot' : '')));
        body.append(top, el('div', 'tx', i.text || '(no text)'), el('div', 'dim', i.by));
        a.append(body); list.append(a);
      });
      if (!items.length) list.append(el('div', 'dim', videoOnly ? 'No video posts found. Try "All".' : 'Nothing found for this place in this time window. Posts are matched by the place name, so try zooming in on a city or widening the time range.'));
      list.lastChild && (list.lastChild.style.padding = items.length ? '' : '10px 6px');
      list.append(el('div', 'dim', 'Bluesky, Mastodon and Reddit posts have no coordinates: they mention ' + (data.place || 'this place') + ' and are pinned on it. Storm-spotter reports are exact.'));
      list.lastChild.style.padding = '8px 4px 0';
      box.replaceChildren(hd, list);
      dots();
    }

    function load() {
      if (!isOpen()) return;
      var v = readView();
      if (!v) { paint('Move the map to a place first.'); return; }
      if (v.zoom < 4.5) { data = null; paint('Zoom in on a city or region to see what people there are posting.'); return; }
      var key = [v.lat.toFixed(1), v.lon.toFixed(1), v.zoom >= 8 ? 8 : v.zoom >= 6 ? 6 : 4, hours(), ed].join('|');
      if (key === lastKey || busy) return;
      lastKey = key; busy = true;
      if (!data) paint('Looking for posts\u2026 (first look at a place takes up to a minute)');
      fetch('/camproxy/scene.json?lat=' + v.lat.toFixed(3) + '&lon=' + v.lon.toFixed(3) + '&ed=' + ed + '&h=' + hours() + '&z=' + v.zoom.toFixed(1))
        .then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
        .then(function (d) { busy = false; if (d) { data = d; paint(); } else { lastKey = ''; paint('The post lookup failed. It retries when the map moves.'); } });
    }

    window.addEventListener('nvii-map-view', function (e) { view = { lat: e.detail.lat, lon: e.detail.lon, zoom: e.detail.zoom, fromMap: true }; clearTimeout(timer); timer = setTimeout(load, 1500); });
    window.addEventListener('nvii-map-pick', function (e) {
      var d = e.detail || {}; if (d.layerId !== 'nvii-poi' || !box) return;
      var o = d.object || {};
      [].slice.call(box.querySelectorAll('a.it.on')).forEach(function (a) { a.classList.remove('on'); });
      if (o.idx != null) { var a = box.querySelector('a.it[data-idx="' + Number(o.idx) + '"]'); if (a) { a.classList.add('on'); a.scrollIntoView({ block: 'nearest' }); } }
      else { var l = box.querySelector('.list'); if (l) l.scrollTop = 0; }
    });
    setInterval(function () { if (isOpen() && data && !busy) paint(); }, 60000);   // keeps the "x min ago" labels honest
    setInterval(function () { if (!document.hidden) load(); }, 4000);                                // picks up map moves when the app patch is not there
    setInterval(function () { if (!document.hidden && isOpen()) { lastKey = ''; load(); } }, 300000);
    setInterval(function () { if (!btn || !btn.isConnected || (isOpen() && (!box || !box.isConnected))) { paint(); load(); } }, 2000);   // the app builds the map late and rebuilds it on 2D/3D switches
  } catch (e) { /* nothing else is affected */ }
})();
