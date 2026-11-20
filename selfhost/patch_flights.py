"""EMON: Airline Intelligence > Flights falls back to OpenSky boards from /local/flights.json
(written on the Pi by ~/services/emon-flights/flights.py) when the paid AviationStack board is empty."""
import sys
p = f"{sys.argv[1]}/src/components/AirlineIntelPanel.ts"
s = open(p).read()
if 'openSkyBoards' in s:
    print('already patched'); sys.exit(0)

old = "    private activeTab: Tab = 'ops';\n"
assert s.count(old) == 1
s = s.replace(old, old + """    // nvii self-host (EMON): free OpenSky departure/arrival boards, used when the AviationStack board is empty
    private openSkyBoards: {
        updated: number; windowHours: number;
        airports: Array<{ iata: string; name: string; ok?: boolean;
            departures: Array<{ flight: string; airline: string; to: string; time: number }>;
            arrivals: Array<{ flight: string; airline: string; from: string; time: number }> }>;
    } | null = null;
""")

old = """                    this.flightsData = await fetchAirportFlights(boardAirport, 'both', 30);
                    this.flightsAirport = boardAirport;
"""
assert s.count(old) == 1
s = s.replace(old, old + """                    if (!this.flightsData.length) {
                        try {
                            const r = await fetch('/local/flights.json', { cache: 'no-store' });
                            this.openSkyBoards = r.ok ? await r.json() : null;
                        } catch { this.openSkyBoards = null; }
                    }
""")

old = """    private renderFlights(): void {
        if (!this.flightsData.length) {
"""
assert s.count(old) == 1
s = s.replace(old, """    private renderOpenSkyBoards(): void {
        const b = this.openSkyBoards!;
        this.scopeFilter.hideStrip();
        const ago = Math.max(0, Math.round((Date.now() / 1000 - b.updated) / 60));
        const hhmm = (t: number) => t ? new Date(t * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';
        const row = (num: string, airline: string, place: string, t: number, arrow: string) => `
        <div class="flight-row">
          <div class="flight-num">${escapeHtml(num)}</div>
          <div class="flight-route">${arrow} ${escapeHtml(place)}${airline ? ` <span style="color:#9ca3af">${escapeHtml(airline)}</span>` : ''}</div>
          <div class="flight-time">${escapeHtml(hhmm(t))}</div>
        </div>`;
        const first = b.airports[0]?.iata;
        const sections = b.airports.map(a => `
      <details ${a.iata === first ? 'open' : ''} style="border-bottom:1px solid var(--border);padding:6px 0">
        <summary style="cursor:pointer;font-weight:600">${escapeHtml(a.iata)} · ${escapeHtml(a.name)}
          <span style="color:#9ca3af;font-weight:400">${a.departures.length} out · ${a.arrivals.length} in${a.ok === false ? ' · older data' : ''}</span></summary>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:4px">
          <div><div style="color:#9ca3af;font-size:11px;margin:2px 0">DEPARTED</div>${a.departures.slice(0, 15).map(f => row(f.flight, f.airline, f.to, f.time, '→')).join('') || '<div class="no-data">none</div>'}</div>
          <div><div style="color:#9ca3af;font-size:11px;margin:2px 0">ARRIVED</div>${a.arrivals.slice(0, 15).map(f => row(f.flight, f.airline, f.from, f.time, '←')).join('') || '<div class="no-data">none</div>'}</div>
        </div>
      </details>`).join('');
        this.setTrustedContent(trustedHtml(
            `<div style="color:#9ca3af;font-size:11px;padding:4px 0">Last ${b.windowHours} h of departures and arrivals · OpenSky Network · updated ${ago} min ago</div>${sections}`,
            'EMON OpenSky boards: every value escaped'));
    }

    private renderFlights(): void {
        if (!this.flightsData.length && this.openSkyBoards?.airports?.length) {
            this.renderOpenSkyBoards();
            return;
        }
        if (!this.flightsData.length) {
""")
open(p, 'w').write(s)
print('patched')
