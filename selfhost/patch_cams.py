import sys
root = sys.argv[1]
YT = lambda i: f"https://www.youtube.com/watch?v={i}"
CT = lambda n: f"https://wzmedia.dot.ca.gov/D4/{n}.stream/playlist.m3u8"
SD = lambda n: f"https://61e0c5d388c2e.streamlock.net/live/{n}.stream/playlist.m3u8"
# (slot id, label, city, region, [sources])
CAMS = [
  ('sf-golden-gate', 'Golden Gate Bridge', 'San Francisco', 'san-francisco', [YT('uoIfETBzuSU')]),
  ('sf-downtown', 'Downtown skyline (ABC7)', 'San Francisco', 'san-francisco', [YT('G8RIAgPxaMc')]),
  ('sf-bay-bridge', 'Bay Bridge, I-80 (Caltrans)', 'San Francisco', 'san-francisco', [CT('E80_at_SAS_Tower'), CT('W80_at_Fremont_St_Ofr')]),
  ('sf-pier-39', 'Pier 39', 'San Francisco', 'san-francisco', [YT('UCQivLGCx9c')]),
  ('sf-pier-23', 'Pier 23, the Embarcadero', 'San Francisco', 'san-francisco', [YT('PDKGik7Np88')]),
  ('sf-bay-view', 'Bay view from Treasure Island', 'San Francisco', 'san-francisco', [YT('BSWhGNXxT9A')]),
  ('sf-sfo', 'SFO airport', 'San Francisco', 'san-francisco', [YT('sTVM6Sc80X0')]),
  ('sf-pacifica', 'Pacifica pier and beach', 'San Francisco', 'san-francisco', [YT('3vqiXAw1Km4'), YT('lmec_rcEIL4')]),
  ('sf-mori-point', 'Mori Point coast, Pacifica', 'San Francisco', 'san-francisco', [YT('iQ7XJDXYSMo')]),
  ('sf-101-octavia', 'US-101 at Octavia (Caltrans)', 'San Francisco', 'san-francisco', [CT('S101_at_Octavia_St')]),
  ('sf-presidio', 'Presidio tunnel, SR-1 (Caltrans)', 'San Francisco', 'san-francisco', [CT('N1_at_Presidio_Tunnel')]),
  ('sf-i80-6th', 'I-80 at 6th St (Caltrans)', 'San Francisco', 'san-francisco', [CT('E80_at_6th_St')]),
  ('sf-candlestick', 'US-101 at Candlestick (Caltrans)', 'San Francisco', 'san-francisco', [CT('N101_at_Candlestick_Park')]),
  ('oak-bay-bridge', 'Bay Bridge (ABC7)', 'Oakland', 'oakland', [YT('CXYr04BWvmc')]),
  ('oak-lake-merritt', 'I-580 at Lake Merritt (Caltrans)', 'Oakland', 'oakland', [CT('E580_at_Grand_Lakeshore')]),
  ('oak-vollmer', 'Vollmer Peak, East Bay hills (ABC7)', 'Oakland', 'oakland', [YT('FLoSUN_Vrz4')]),
  ('oak-telegraph', 'SR-24 at Telegraph (Caltrans)', 'Oakland', 'oakland', [CT('W24_at_Telegraph'), CT('W24_JEO_JCT_980')]),
  ('oak-treasure-island', 'Treasure Island (ABC7)', 'Oakland', 'oakland', [YT('_VqvVJfmyfs')]),
  ('oak-bridge-incline', 'Bay Bridge incline (Caltrans)', 'Oakland', 'oakland', [CT('W80_at_SFOBB_Incline')]),
  ('oak-webster-tube', 'Webster St tube to Alameda (Caltrans)', 'Oakland', 'oakland', [CT('W260_WEBSTER_ST_TUNNEL_ENTRANCE')]),
  ('oak-580-high', 'I-580 at High St (Caltrans)', 'Oakland', 'oakland', [CT('E580_at_High_St'), CT('W580_at_35th_Av')]),
  ('oak-berkeley-albany', 'I-80 Berkeley / Albany', 'Oakland', 'oakland', [YT('rJ56Y-G4Wco')]),
  ('oak-gilman', 'I-80 at Gilman St, Berkeley (Caltrans)', 'Oakland', 'oakland', [CT('W80_at_Gilman_St')]),
  ('oak-emeryville', 'San Pablo Ave at 40th, Emeryville (Caltrans)', 'Oakland', 'oakland', [CT('N123_at_40th_St_West_View')]),
  ('sea-pike', '2nd Ave & Pike St (SDOT)', 'Seattle', 'seattle', [SD('2_Pike_NS')]),
  ('sea-waterfront', 'Waterfront, Alaskan Way & Spring (SDOT)', 'Seattle', 'seattle', [SD('Alaskan_Spring')]),
  ('sea-uw-lake', 'UW, Lake Washington', 'Seattle', 'seattle', [YT('NCzKkn0wD30')]),
  ('sea-center', 'Seattle Center, 5th & Mercer (SDOT)', 'Seattle', 'seattle', [SD('5_Mercer_NS')]),
  ('sea-uw-campus', 'UW campus', 'Seattle', 'seattle', [YT('9-hGCRgqMMs')]),
  ('sea-airport', 'SEA-TAC airport', 'Seattle', 'seattle', [YT('Ila-kU9I_Nk')]),
  ('sea-city-tv', 'Seattle Channel (city TV)', 'Seattle', 'seattle', [YT('hV8qIEYw54U')]),
  ('sea-aquarium', 'Seattle Aquarium', 'Seattle', 'seattle', [YT('NqOmHpwMUxs')]),
  ('sea-5-pike', '5th Ave & Pike St (SDOT)', 'Seattle', 'seattle', [SD('5_Pike_NS')]),
  ('sea-pioneer', 'Pioneer Square, Alaskan Way & Yesler (SDOT)', 'Seattle', 'seattle', [SD('Alaskan_Yesler_NS')]),
  ('sea-westlake', 'Westlake & Denny (SDOT)', 'Seattle', 'seattle', [SD('Westlake_Denny_NS')]),
  ('sea-west-seattle', 'West Seattle bridge, Harbor Ave (SDOT)', 'Seattle', 'seattle', [SD('Harbor_SW_Spokane_EW')]),
  ('sea-queen-anne', 'Queen Anne Ave & Mercer (SDOT)', 'Seattle', 'seattle', [SD('QAnne_N_Mercer_EW')]),
]
def q(s): return "'" + s.replace("\\", "\\\\").replace("'", "\\'") + "'"

p = f"{root}/src/config/live-video-sources.ts"
s = open(p).read()
anchor = "} as const satisfies Record<string, readonly string[]>;"
i = s.index("export const WEBCAM_SOURCES")
j = s.index(anchor, i)
block = "  // nvii self-host (2026-11-19): San Francisco, Oakland and Seattle cams - city, campus, beach,\n  // airport and public traffic cams (Caltrans D4 and Seattle DOT HLS streams). Later entries are fallbacks.\n"
for sid, label, city, region, srcs in CAMS:
    block += f"  {q(sid)}: [{', '.join(q(x) for x in srcs)}],\n"
assert "'sf-golden-gate'" not in s
s = s[:j] + block + s[j:]
open(p, "w").write(s)

p = f"{root}/src/components/LiveWebcamsPanel.ts"
s = open(p).read()
old = "type WebcamRegion = 'middle-east' | 'europe' | 'asia' | 'americas' | 'space';"
assert s.count(old) == 1
s = s.replace(old, "type WebcamRegion = 'middle-east' | 'europe' | 'asia' | 'americas' | 'space' | 'san-francisco' | 'oakland' | 'seattle';")
old = "  // Space\n  { id: 'iss-earth'"
assert s.count(old) == 1
feeds = "  // nvii self-host: San Francisco, Oakland, Seattle\n"
for sid, label, city, region, srcs in CAMS:
    feeds += f"  {{ id: {q(sid)}, city: {q(label)}, country: {q(city)}, region: {q(region)} }},\n"
s = s.replace(old, feeds + old)
old = "const ALL_REGIONS: RegionFilter[] = ['all', 'middle-east', 'europe', 'americas', 'asia', 'space'];"
assert s.count(old) == 1
s = s.replace(old, "const ALL_REGIONS: RegionFilter[] = ['all', 'middle-east', 'europe', 'americas', 'san-francisco', 'oakland', 'seattle', 'asia', 'space'];")
old = "      { key: 'americas', label: t('components.webcams.regions.americas') },\n"
assert s.count(old) == 1
s = s.replace(old, old + "      { key: 'san-francisco', label: 'SF' },\n      { key: 'oakland', label: 'Oakland' },\n      { key: 'seattle', label: 'Seattle' },\n")
open(p, "w").write(s)
print("patched", len(CAMS), "cams")
