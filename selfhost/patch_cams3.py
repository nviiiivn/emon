"""EMON cams, part 3 (2026-11-19): LA and Santa Cruz tabs. Apply after patch_cams.py and patch_cams2.py."""
import sys
root = sys.argv[1]
YT = lambda i: f"https://www.youtube.com/watch?v={i}"
CT = lambda d, n: f"https://wzmedia.dot.ca.gov/{d}/{n}.stream/playlist.m3u8"
CAMS = [
  ('la-hollywood', 'Hollywood (LA Times)', 'Los Angeles', 'la', [YT('YHWJd_DNgKY')]),
  ('la-venice', 'Venice Beach', 'Los Angeles', 'la', [YT('EO_1LWqsCNE'), YT('98jOtUeM3m8')]),
  ('la-santa-monica', 'Santa Monica beach and pier', 'Santa Monica', 'la', [YT('v97JpT3ZA0w')]),
  ('la-malibu', 'Malibu beach (LA Times)', 'Malibu', 'la', [YT('E0TZTmTK-Ws')]),
  ('la-lax', 'LAX airport', 'Los Angeles', 'la', [YT('9qs8ERnANBw'), YT('n4I0d44oBEs')]),
  ('la-101-hollywood', 'US-101 through Hollywood (Caltrans)', 'Los Angeles', 'la',
   [CT('D7', 'CCTV-607'), CT('D7', 'CCTV-609'), CT('D7', 'CCTV-605'), CT('D7', 'CCTV-606')]),
  ('la-downtown', 'US-101 downtown (Caltrans)', 'Los Angeles', 'la',
   [CT('D7', 'CCTV-595'), CT('D7', 'CCTV-594'), CT('D7', 'CCTV-156')]),
  ('la-5-10', 'I-5 south of I-10 (Caltrans)', 'Los Angeles', 'la', [CT('D7', 'CCTV-17'), CT('D7', 'CCTV-2')]),
  ('la-405-lax', 'I-405 / I-105 by LAX (Caltrans)', 'Los Angeles', 'la', [CT('D7', 'CCTV-359'), CT('D7', 'CCTV-301')]),
  ('sc-ocean-st', 'SR-1 at Ocean St (Caltrans)', 'Santa Cruz', 'santa-cruz', [CT('D5', '17atOceanSt')]),
  ('sc-hwy17', 'Hwy 17 at the Fishhook (Caltrans)', 'Santa Cruz', 'santa-cruz', [CT('D5', '17atPasatiempoDr'), CT('D5', '17atLaurelRd')]),
  ('sc-41st', 'SR-1 at 41st Ave (Caltrans)', 'Capitola', 'santa-cruz', [CT('D5', '1atWof41stAve')]),
  ('sc-morrissey', 'SR-1 at Morrissey Blvd (Caltrans)', 'Santa Cruz', 'santa-cruz',
   [CT('D5', '1atEastofMorriseyBlvd'), CT('D5', '1atWofMorriseyBlvd')]),
  ('sc-monterey-bay', 'Monterey Bay (aquarium bay cam)', 'Monterey', 'santa-cruz', [YT('fVa6-zCBR7A')]),
  ('sc-surf', 'Surf cams (Surfline, rotating)', 'California coast', 'santa-cruz', [YT('hm9iAviOZ20')]),
]
REGIONS = [('la', 'LA'), ('santa-cruz', 'Santa Cruz')]
def q(s): return "'" + s.replace("\\", "\\\\").replace("'", "\\'") + "'"

p = f"{root}/src/config/live-video-sources.ts"
s = open(p).read()
if "'la-hollywood'" in s:
    print('already patched'); sys.exit(0)
anchor = "} as const satisfies Record<string, readonly string[]>;"
i = s.index("export const WEBCAM_SOURCES"); j = s.index(anchor, i)
block = "  // nvii self-host (2026-11-19): LA and Santa Cruz.\n"
for sid, label, city, region, srcs in CAMS:
    block += f"  {q(sid)}: [{', '.join(q(x) for x in srcs)}],\n"
s = s[:j] + block + s[j:]
open(p, 'w').write(s)

p = f"{root}/src/components/LiveWebcamsPanel.ts"
s = open(p).read()
old = "| 'seattle' | "
assert s.count(old) == 1, s.count(old)
s = s.replace(old, "| 'seattle' | " + " | ".join(q(r) for r, _ in REGIONS) + " | ")
old = "  // Space\n  { id: 'iss-earth'"
assert s.count(old) == 1
feeds = "  // nvii self-host: LA, Santa Cruz\n"
for sid, label, city, region, srcs in CAMS:
    feeds += f"  {{ id: {q(sid)}, city: {q(label)}, country: {q(city)}, region: {q(region)} }},\n"
s = s.replace(old, feeds + old)
old = "'san-francisco', 'oakland', 'seattle', "
assert s.count(old) == 1
s = s.replace(old, old + ", ".join(q(r) for r, _ in REGIONS) + ", ")
old = "      { key: 'seattle', label: 'Seattle' },\n"
assert s.count(old) == 1
s = s.replace(old, old + "".join(f"      {{ key: {q(r)}, label: {q(l)} }},\n" for r, l in REGIONS))
open(p, 'w').write(s)
print('patched', len(CAMS), 'cams')
