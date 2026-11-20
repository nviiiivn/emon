import sys
root = sys.argv[1]
YT = lambda i: f"https://www.youtube.com/watch?v={i}"
CAMS = [
  ('mia-skyline', 'Skyline, MacArthur Causeway', 'Miami', 'miami', [YT('GkBMgHwSIV0')]),
  ('mia-south-beach', 'South Beach', 'Miami Beach', 'miami', [YT('NHv3lZ7eYt8')]),
  ('mia-port', 'PortMiami cruise terminals', 'Miami', 'miami', [YT('m1R-LmvVt30')]),
  ('mia-river', 'Miami River', 'Miami', 'miami', [YT('FHzIIYECzmM')]),
  ('mia-airport', 'MIA airport runway 9/27', 'Miami', 'miami', [YT('_GUsXnlVJmo'), YT('q2Dxx5704fQ')]),
  ('mia-sunny-isles', 'Sunny Isles Beach', 'Miami-Dade', 'miami', [YT('H91O7OQudcc')]),
  ('mia-hollywood', 'Hollywood Beach Broadwalk (city cam)', 'Broward', 'miami', [YT('cmkAbDUEoyA')]),
  ('keys-duval', 'Duval Street, Key West', 'Key West', 'keys', [YT('GYEdeLtxz6c'), YT('lcVm-Izrpa0')]),
  ('keys-harbor', 'Key West harbor', 'Key West', 'keys', [YT('iHJbTrQSZys')]),
  ('keys-cruise', 'Key West cruise port', 'Key West', 'keys', [YT('8Rw-tZTeBjU')]),
  ('keys-bight', 'Key West Bight marina', 'Key West', 'keys', [YT('Y5ypYTZs-7o')]),
  ('keys-fort-zach', 'Fort Zachary Taylor beach', 'Key West', 'keys', [YT('lxaM_gmYz_o')]),
  ('keys-islamorada', 'Islamorada, Robbie\'s marina', 'Islamorada', 'keys', [YT('zfSst64NFcE'), YT('8ShFKuTCmhQ')]),
  ('keys-key-largo', 'Jewfish Creek Bridge, Key Largo', 'Key Largo', 'keys', [YT('W01huIwqSEo')]),
  ('car-san-juan', 'San Juan beach', 'Puerto Rico', 'caribbean', [YT('taI7GiyvDxE')]),
  ('car-maho', 'Maho Beach airport, St Maarten', 'Sint Maarten', 'caribbean', [YT('2IQmpCXbOmM'), YT('iSeH45R-8R0')]),
  ('car-cayman', 'Seven Mile Beach', 'Grand Cayman', 'caribbean', [YT('ngTSRF7Co2c')]),
  ('car-aruba', 'Eagle Beach', 'Aruba', 'caribbean', [YT('_ZXMjk5K0_s')]),
  ('car-curacao', 'Willemstad harbor', 'Curacao', 'caribbean', [YT('28U-t3fA9ks'), YT('loHbMM9JfCs')]),
  ('car-bvi', 'White Bay, Jost Van Dyke', 'British Virgin Islands', 'caribbean', [YT('V_I168MM-ik')]),
  ('nyc-times-sq', 'Times Square', 'New York', 'nyc', [YT('ZxCeWQ3Lcig'), YT('KHy_n-EMWY8')]),
  ('nyc-fox5', 'FOX 5 city cams', 'New York', 'nyc', [YT('VGnFLdQW39A')]),
  ('nyc-brooklyn-bridge', 'Brooklyn Bridge and harbor', 'New York', 'nyc', [YT('1kvGNR_A3DY')]),
  ('nyc-bryant-park', 'Bryant Park', 'New York', 'nyc', [YT('hMWSUCXkj6w')]),
  ('nyc-vanderbilt', 'SUMMIT One Vanderbilt', 'New York', 'nyc', [YT('2_PDaUJbfuI')]),
  ('nyc-broadway', '1560 Broadway', 'New York', 'nyc', [YT('VXo0VqVcbK4')]),
  ('nyc-surveillance', 'Times Square street level', 'New York', 'nyc', [YT('mkX71WMAmNI')]),
  ('dc-md-1', 'Bradley Blvd (MD 191) at Connecticut Ave (MD 185) (MDOT)', 'Washington DC area', 'dc', ['https://strmr5.sha.maryland.gov/rtplive/a1008d3b00020075004d823633235daa/playlist.m3u8']),
  ('dc-md-2', 'Bradley Blvd (MD 191) at Wisconsin Ave (MD 355) (MDOT)', 'Washington DC area', 'dc', ['https://strmr5.sha.maryland.gov/rtplive/f70054e703e00077004d823633235daa/playlist.m3u8']),
  ('dc-md-3', 'East West Hwy (MD 410) at Georgia Ave (US 29) (MDOT)', 'Washington DC area', 'dc', ['https://strmr5.sha.maryland.gov/rtplive/ae01694b01220075004d823633235daa/playlist.m3u8']),
  ('dc-md-4', 'I-295 N. OF I-495 (MDOT)', 'Washington DC area', 'dc', ['https://strmr5.sha.maryland.gov/rtplive/8c00118a004b00a0004e3536c4235c0a/playlist.m3u8']),
  ('dc-md-5', 'I-95/495 N of MD 210 (MDOT)', 'Washington DC area', 'dc', ['https://strmr5.sha.maryland.gov/rtplive/c0000328018c0055005dd336c4235c0a/playlist.m3u8']),
  ('dc-md-6', 'Georgia Ave (US 29) at Sligo Ave (MDOT)', 'Washington DC area', 'dc', ['https://strmr5.sha.maryland.gov/rtplive/0601f50e012b0075004d823633235daa/playlist.m3u8']),
  ('dc-md-7', 'I-95/495 AT MD 210 (MDOT)', 'Washington DC area', 'dc', ['https://strmr5.sha.maryland.gov/rtplive/6900ed9d0021000a005ed336c4235c0a/playlist.m3u8']),
  ('dc-md-8', 'Connecticut Ave (MD 185) at East West Hwy (MD 410) (MDOT)', 'Washington DC area', 'dc', ['https://strmr5.sha.maryland.gov/rtplive/0b01b57900060075004d823633235daa/playlist.m3u8']),
  ('dc-md-9', 'MD 295 AT MD 202 (MDOT)', 'Washington DC area', 'dc', ['https://strmr3.sha.maryland.gov/rtplive/a800e67c000b0089005cd336c4235c0a/playlist.m3u8']),
  ('dc-md-10', 'I-95/495 AT MD 414 (MDOT)', 'Washington DC area', 'dc', ['https://strmr5.sha.maryland.gov/rtplive/9d00119e00770051004de33696235daa/playlist.m3u8']),
  ('dc-md-11', 'I-95/495 AT I-295 (MDOT)', 'Washington DC area', 'dc', ['https://strmr5.sha.maryland.gov/rtplive/3301a05801f700d700437a45351f0214/playlist.m3u8']),
  ('dc-md-12', 'East West Hwy (MD 410) at Wisconsin Ave (MD 355) (MDOT)', 'Washington DC area', 'dc', ['https://strmr5.sha.maryland.gov/rtplive/efff918500020075004d823633235daa/playlist.m3u8']),
  ('chi-skydeck', 'Skydeck, Willis Tower', 'Chicago', 'chicago', [YT('O0UGT7AT3aw')]),
  ('chi-ohare', "O'Hare airport", 'Chicago', 'chicago', [YT('G34jYcWBmnE')]),
  ('chi-midway', 'Midway airport', 'Chicago', 'chicago', [YT('67BCsiW-1Io')]),
  ('chi-rail', 'Rail yard, Power House', 'Chicago', 'chicago', [YT('DcbDohUnv6c')]),
]
REGIONS = [('miami', 'Miami'), ('keys', 'Keys'), ('caribbean', 'Caribbean'), ('nyc', 'NYC'), ('dc', 'DC'), ('chicago', 'Chicago')]
def q(s): return "'" + s.replace("\\", "\\\\").replace("'", "\\'") + "'"

p = f"{root}/src/config/live-video-sources.ts"
s = open(p).read()
if "'mia-skyline'" in s:
    print('already patched'); sys.exit(0)
anchor = "} as const satisfies Record<string, readonly string[]>;"
i = s.index("export const WEBCAM_SOURCES"); j = s.index(anchor, i)
block = "  // nvii self-host (2026-11-19): Miami, Florida Keys, Caribbean, NYC, DC area (Maryland DOT HLS), Chicago.\n"
for sid, label, city, region, srcs in CAMS:
    block += f"  {q(sid)}: [{', '.join(q(x) for x in srcs)}],\n"
s = s[:j] + block + s[j:]
open(p, 'w').write(s)

p = f"{root}/src/components/LiveWebcamsPanel.ts"
s = open(p).read()
old = "| 'san-francisco' | 'oakland' | 'seattle';"
assert s.count(old) == 1
s = s.replace(old, "| 'san-francisco' | 'oakland' | 'seattle' | " + " | ".join(q(r) for r, _ in REGIONS) + ";")
old = "  // Space\n  { id: 'iss-earth'"
assert s.count(old) == 1
feeds = "  // nvii self-host: Miami, Keys, Caribbean, NYC, DC, Chicago\n"
for sid, label, city, region, srcs in CAMS:
    feeds += f"  {{ id: {q(sid)}, city: {q(label)}, country: {q(city)}, region: {q(region)} }},\n"
s = s.replace(old, feeds + old)
old = "'san-francisco', 'oakland', 'seattle', 'asia', 'space'];"
assert s.count(old) == 1
s = s.replace(old, "'san-francisco', 'oakland', 'seattle', " + ", ".join(q(r) for r, _ in REGIONS) + ", 'asia', 'space'];")
old = "      { key: 'seattle', label: 'Seattle' },\n"
assert s.count(old) == 1
s = s.replace(old, old + "".join(f"      {{ key: {q(r)}, label: {q(l)} }},\n" for r, l in REGIONS))
open(p, 'w').write(s)
print('patched', len(CAMS), 'cams')
