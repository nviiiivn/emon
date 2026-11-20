import json, re, sys
path = sys.argv[1]
ALL_PANELS = """map=Global Map;live-news=Live News;live-webcams=Live Webcams;windy-webcams=Windy Live Webcam;insights=AI Insights;threat-timeline=Threat Timeline;strategic-posture=AI Strategic Posture;forecast=AI Forecasts;cii=Country Instability;strategic-risk=Strategic Risk Overview;intel=Intel Feed;gdelt-intel=Live Intelligence;cascade=Infrastructure Cascade;military-correlation=Force Posture;escalation-correlation=Escalation Monitor;economic-correlation=Economic Warfare;disaster-correlation=Disaster Cascade;politics=World News;us=United States;europe=Europe;middleeast=Middle East;africa=Africa;latam=Latin America;asia=Asia-Pacific;energy=Energy & Resources;gov=Government;thinktanks=Think Tanks;polymarket=Predictions;commodities=Metals & Materials;energy-complex=Energy Complex;oil-inventories=Oil Inventories;markets=Markets;stock-analysis=Stock Analysis;stock-backtest=Backtesting;daily-market-brief=Daily Market Brief;chat-analyst=WM Analyst;economic=Macro Stress;global-procurement=Global Procurement;trade-policy=Trade Policy;supply-chain=Supply Chain;china-corridors=China Logistics Corridors;china-activity-nowcast=China Activity Nowcast;finance=Financial;tech=Technology;crypto=Crypto;heatmap=Sector Heatmap;ai=AI/ML;layoffs=Layoffs Tracker;science=Science;monitors=My Monitors;latest-brief=Latest Brief;satellite-fires=Fires;macro-signals=Market Regime;fear-greed=Fear & Greed;aaii-sentiment=AAII Sentiment;market-breadth=Market Breadth;news-market-correlation=News ↔ Markets;macro-tiles=Macro Indicators;fsi=Financial Stress;yield-curve=Yield Curve;earnings-calendar=Earnings Calendar;material-events=SEC Material Events;economic-calendar=Economic Calendar;cot-positioning=COT Positioning;liquidity-shifts=Liquidity Shifts;positioning-247=24/7 Positioning;gold-intelligence=Gold Intelligence;hormuz-tracker=Hormuz Trade Tracker;energy-crisis=Energy Crisis Tracker;pipeline-status=Oil & Gas Pipeline Status;storage-facility-map=Strategic Storage Atlas;fuel-shortages=Global Fuel Shortage Registry;energy-disruptions=Energy Disruptions Log;energy-risk-overview=Global Energy Risk Overview;grid-disruption-clock=US States Grid Disruption Clock;gulf-economies=Gulf Economies;consumer-prices=Consumer Prices;grocery-basket=Grocery Index;bigmac=Big Mac Index;fx=FX Rates;fuel-prices=Fuel Prices;fao-food-price-index=FAO Food Price Index;etf-flows=BTC ETF Tracker;stablecoins=Stablecoins;ucdp-events=UCDP Conflict Events;disease-outbreaks=Disease Outbreaks;social-velocity=Social Velocity;wsb-ticker-scanner=WSB Ticker Scanner;giving=Global Giving;displacement=UNHCR Displacement;ukmto-incidents=UKMTO Incidents;climate=Climate Anomalies;reservoir-levels=Strategic Water Levels;climate-news=Climate News;population-exposure=Population Exposure;security-advisories=Security Advisories;sanctions-pressure=Sanctions Pressure;defense-patents=R&D Signal;toronto-safety=Toronto Safety;radiation-watch=Radiation Watch;thermal-escalation=Thermal Escalation;oref-sirens=Israel Sirens;telegram-intel=Telegram Intel;x-intel=X News Accounts;airline-intel=Airline Intelligence;tech-readiness=Tech Readiness Index;world-clock=World Clock;national-debt=Global Debt Clock;cross-source-signals=Cross-Source Signals;market-implications=AI Market Implications;regional-intelligence=Regional Intelligence;deduction=Deduct Situation;geo-hubs=Geopolitical Hubs;tech-hubs=Hot Tech Hubs"""
# her keep list, in her order (map first)
KEEP = ['map', 'live-news', 'live-webcams', 'windy-webcams', 'threat-timeline', 'social-velocity', 'climate',
        'reservoir-levels', 'population-exposure', 'security-advisories', 'radiation-watch',
        'thermal-escalation', 'oref-sirens', 'telegram-intel', 'x-intel', 'airline-intel', 'cross-source-signals',
        'ucdp-events', 'fao-food-price-index', 'fuel-prices', 'grocery-basket', 'consumer-prices',
        'grid-disruption-clock', 'energy-disruptions', 'economic-calendar', 'positioning-247', 'fear-greed',
        'satellite-fires', 'monitors', 'layoffs', 'supply-chain', 'economic', 'intel', 'gdelt-intel', 'cascade',
        'escalation-correlation', 'economic-correlation', 'disaster-correlation', 'politics', 'us']
ALL_LAYERS = "iranAttacks hotspots conflicts bases nuclear irradiators radiationWatch spaceports satellites cables pipelines datacenters military aircraftEmergencies ais tradeRoutes flights protests ucdpEvents displacement climate weather canadaRoads canadaAlerts outages cyberThreats natural fires waterways economic minerals gpsJamming ciiChoropleth resilienceScore dayNight sanctions no2Activity reservoirLevels startupHubs techHQs accelerators cloudRegions techEvents stockExchanges financialCenters centralBanks commodityHubs gulfInvestments positiveEvents kindness happiness speciesRecovery renewableInstallations miningSites processingPlants commodityPorts webcams diseaseOutbreaks storageFacilities fuelShortages liveTankers".split()
LAYERS_ON = ['protests', 'ucdpEvents', 'displacement', 'ais', 'flights', 'aircraftEmergencies', 'natural', 'fires',
             'weather', 'canadaAlerts', 'climate', 'reservoirLevels', 'outages', 'radiationWatch']
names = dict(x.split('=', 1) for x in ALL_PANELS.split(';'))
assert all(k in names for k in KEEP), [k for k in KEEP if k not in names]
panels = {}
for i, (pid, name) in enumerate(names.items()):
    panels[pid] = {'name': name, 'enabled': pid in KEEP, 'priority': (KEEP.index(pid) + 1) if pid in KEEP else 3}
layers = {l: (l in LAYERS_ON) for l in ALL_LAYERS}
block = """
/* EMON (emon.alola.lol, 2026-11-19): the same World Monitor, set up once per browser for North America
   with only nvii's chosen panels and map layers. Separate settings from worldmonitor.alola.lol because
   browsers keep storage per site. Marker key below; change things in the app afterwards and they stick. */
(function () {
  try {
    if (!/^emon\\./.test(location.hostname)) return;
    if (window.__nviiEmonEdition && window.__nviiEmonEdition !== 'full') return; // /tech, /finance ... keep their own setup
    var MARK = 'nvii-emon-setup-v2';
    var LAYERS_ON = %s;
    var q = new URLSearchParams(location.search);
    if (!q.has('lat')) {
      q.set('lat', '39.5'); q.set('lon', '-98.0'); q.set('zoom', '3.30'); q.set('view', 'global'); q.set('timeRange', '24h');
      if (!q.has('layers')) q.set('layers', LAYERS_ON.join(','));
      history.replaceState(null, '', location.pathname + '?' + q.toString() + location.hash);
    }
    if (localStorage.getItem(MARK)) return;
    // Mark the stock layout as already applied, or World Monitor resets panels to its defaults on first boot.
    localStorage.setItem('worldmonitor-variant', 'full');
    localStorage.setItem('worldmonitor-panel-layout-variant', 'full');
    localStorage.setItem('worldmonitor-panel-order-v1.9', 'done');
    localStorage.setItem('worldmonitor-layout-reset-v2.5', 'done');
    localStorage.setItem('panel-order', JSON.stringify(%s));
    localStorage.setItem('worldmonitor-panels', JSON.stringify(%s));
    localStorage.setItem('worldmonitor-layers', JSON.stringify(%s));
    localStorage.setItem(MARK, '1');
  } catch (e) { /* storage blocked: plain World Monitor */ }
})();
""" % (json.dumps(LAYERS_ON), json.dumps([k for k in KEEP if k != 'map']), json.dumps(panels, ensure_ascii=False), json.dumps(layers))
s = open(path).read()
if '/* EMON (emon.alola.lol' in s:
    s = s[:s.index('\n/* EMON (emon.alola.lol')]
with open(path, 'r+') as f:   # same file (bind-mounted into the container): rewrite in place
    f.seek(0); f.write(s.rstrip('\n') + '\n' + block); f.truncate()
print('ok', len(KEEP), 'panels on,', len(LAYERS_ON), 'layers on')
