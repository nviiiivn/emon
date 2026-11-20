/* EMON editions (2026-11-19): /tech, /finance, /commodity, /energy, /good-news are other editions on the
   same site. Browsers share storage across paths, and World Monitor resets panels when the edition changes,
   so each edition's panels/layers/order are parked and restored here before the app starts. EMON only. */
(function () {
  try {
    if (!/^emon\./.test(location.hostname)) return;
    document.documentElement.classList.add('nvii-emon');
    var MAP = { tech: 'tech', finance: 'finance', commodity: 'commodity', energy: 'energy', happy: 'happy', 'good-news': 'happy' };
    var v = MAP[(location.pathname.split('/')[1] || '').toLowerCase()] || 'full';
    window.__nviiEmonEdition = v;
    var KEYS = ['worldmonitor-panels', 'worldmonitor-layers', 'panel-order', 'panel-order-bottom-set',
      'worldmonitor-panel-spans', 'worldmonitor-variant', 'worldmonitor-panel-layout-variant',
      'worldmonitor-panel-order-v1.9', 'worldmonitor-layout-reset-v2.5', 'worldmonitor-free-tier-layer-ownership',
      'worldmonitor-free-tier-source-ownership', 'worldmonitor-disabled-feeds', 'worldmonitor-disabled-feeds-schema'];
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

/* 2026-11-19 her rule: nothing links to worldmonitor.app. Every such link (including ones the app adds
   later) is pointed at the same page on this site; edition links go to /tech, /finance, /commodity,
   /energy, /good-news. Nothing is hidden. */
(function () {
  var ED = { tech: '/tech', finance: '/finance', commodity: '/commodity', energy: '/energy', happy: '/good-news' };
  function fix(a) {
    var h = a.getAttribute('href');
    if (!h || h.indexOf('worldmonitor.app') === -1) return;
    try {
      var u = new URL(h, location.href);
      var sub = u.hostname.split('.')[0];
      var path = u.pathname + u.search + u.hash;
      if (ED[sub]) path = ED[sub];
      else if (u.pathname === '/dashboard') path = '/' + u.search + u.hash;
      a.setAttribute('href', path);
    } catch (e) { /* leave it */ }
  }
  function sweep() { try { document.querySelectorAll('[href*="worldmonitor.app"]').forEach(fix); } catch (e) {} }
  var queued = false;
  function start() {
    sweep();
    new MutationObserver(function () {
      if (queued) return; queued = true;
      setTimeout(function () { queued = false; sweep(); }, 1500); /* at most every 1.5 s: a per-frame full-page sweep froze the live dashboard */
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['href'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
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

/* nvii-nopro-v1 (2026-11-19 her final rule): hide any button or link whose text asks to sign in, upgrade,
   unlock, subscribe or see pricing, including ones the app adds later. Hides only; never changes links. */
(function () {
  var RE = /^(sign ?in|sign ?up|log ?in|create (an )?account|upgrade|get pro|go pro|unlock|start (a )?free trial|subscribe|see pricing|view pricing|resubscribe)\b/i;
  function sweep() {
    try {
      document.querySelectorAll('a, button, [role="button"]').forEach(function (el) {
        var label = (el.textContent || el.getAttribute('aria-label') || '').trim();
        if (RE.test(label)) el.style.setProperty('display', 'none', 'important');
      });
    } catch (e) { /* never break the page */ }
  }
  var queued = false;
  function start() {
    sweep();
    new MutationObserver(function () {
      if (queued) return; queued = true;
      setTimeout(function () { queued = false; sweep(); }, 1500); /* at most every 1.5 s: a per-frame full-page sweep froze the live dashboard */
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
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
  'body{background:' + v[0] + ' !important;color:' + v[4] + ' !important}';
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
