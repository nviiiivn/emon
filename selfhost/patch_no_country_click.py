"""EMON (her complaint 2026-11-20): any click on empty map slid in the big Country Brief panel.
Fix: a plain click on the map no longer opens it. The country brief is still there by right-clicking the map
("Open country brief"), from search, and from country links in panels.
Re-runnable. Run from the repo root:  python3 selfhost/patch_no_country_click.py"""
p = 'src/app/country-intel.ts'
s = open(p).read()
if 'nvii-no-country-click' in s:
    print('already')
else:
    old = "    this.ctx.map.onCountryClicked((countryClick) => {\n      if (countryClick.code && countryClick.name) {\n"
    assert s.count(old) == 1
    new = ("    this.ctx.map.onCountryClicked((countryClick) => {\n"
           "      // nvii-no-country-click: a plain map click must not open the country panel on this copy (right-click still offers it)\n"
           "      if (/^emon\\./.test(location.hostname)) return;\n"
           "      if (countryClick.code && countryClick.name) {\n")
    open(p, 'w').write(s.replace(old, new))
    print('patched')
