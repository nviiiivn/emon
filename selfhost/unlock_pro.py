"""Her rule 2026-11-19: no Pro / sign-in / upgrade anywhere. Unlock every client-side gate on HER copy.
Re-runnable: each edit checks for its own marker. Run from the repo root before a build."""
import sys
EDITS = [
  ('src/services/panel-gating.ts',
   "export function readPremiumAccessGrant(authState?: AuthSession): PremiumAccessGrant {\n",
   "export function readPremiumAccessGrant(authState?: AuthSession): PremiumAccessGrant {\n  return 'pro_user'; // nvii-unlock: her self-hosted copy is Pro\n"),
  ('src/services/widget-store.ts',
   "export function isProUser(): boolean {\n",
   "export function isProUser(): boolean {\n  return true; // nvii-unlock: her self-hosted copy is Pro\n"),
  ('src/services/tab-focus.ts',
   "export function canSetFocus(): boolean {\n",
   "export function canSetFocus(): boolean {\n  return true; // nvii-unlock: Focus works on her copy\n"),
  ('src/services/gates/export.ts',
   "    gateActive: isExportGateActive(),\n",
   "    gateActive: false && isExportGateActive(), // nvii-unlock: Export works on her copy\n"),
]
for path, old, new in EDITS:
    s = open(path, encoding='utf-8').read()
    if 'nvii-unlock' in s and new in s:
        print('already', path); continue
    if s.count(old) != 1:
        sys.exit(f'anchor not found once in {path}')
    open(path, 'w', encoding='utf-8').write(s.replace(old, new))
    print('patched', path)
