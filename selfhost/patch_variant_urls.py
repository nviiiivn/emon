"""Edition switcher (World / Tech / Finance / Commodity / Energy / Good News) points at her own hosts
instead of *.worldmonitor.app. Host map from session nvii-5a (2026-11-19)."""
import sys
p = f"{sys.argv[1]}/src/app/panel-layout.ts"
s = open(p).read()
MAP = {
    'full': 'https://worldmonitor.alola.lol/dashboard', 'tech': 'https://tech.alola.lol/dashboard',
    'finance': 'https://finance.alola.lol/dashboard', 'commodity': 'https://commodity.alola.lol/dashboard',
    'energy': 'https://energy.alola.lol/dashboard', 'happy': 'https://happy.alola.lol/dashboard',
}
UP = {
    'full': 'https://www.worldmonitor.app/dashboard', 'tech': 'https://tech.worldmonitor.app/dashboard',
    'finance': 'https://finance.worldmonitor.app/dashboard', 'commodity': 'https://commodity.worldmonitor.app/dashboard',
    'energy': 'https://energy.worldmonitor.app/dashboard', 'happy': 'https://happy.worldmonitor.app/dashboard',
}
if MAP['tech'] in s:
    print('already patched'); sys.exit(0)
for k, v in UP.items():
    old = f"  {k}: '{v}',"
    assert s.count(old) == 1, old
    s = s.replace(old, f"  {k}: '{MAP[k]}',")
open(p, 'w').write(s)
print('patched')
