#!/usr/bin/env python3
"""nvii-mine-3 step 2 (EMON, 2026-11-24): remove the runtime hides that patch_mine.py / patch_mine2.py / patch_mine3.py
made redundant, now that the leftovers are deleted in the code itself:
  selfhost/selfhost-channels.js: the nolinks block (rewrote worldmonitor.app links), nvii-nopro-v1 (hid Sign in /
  Upgrade / Pricing buttons), nvii-mobile-menu-v1 (rebuilt the phone menu);
  selfhost/hide-pro.css: every rule (file kept, nginx links it into every page).
Both files are bind-mounted into the container, so they are written in place (same inode).
Run from the repo root:  python3 -I selfhost/unhide_mine3.py   (re-running is a no-op)
"""
import sys

TAG = 'nvii-mine-3'
changed = []
BLOCKS = [
    ('/* 2026-11-19 her rule: nothing links to worldmonitor.app.', 'nolinks block'),
    ('/* nvii-nopro-v1 ', 'nvii-nopro-v1'),
    ('/* nvii-mobile-menu-v1 ', 'nvii-mobile-menu-v1'),
]


def save(p, s):
    with open(p, 'r+', encoding='utf-8') as f:
        f.seek(0); f.write(s); f.truncate()


p = 'selfhost/selfhost-channels.js'
s = open(p, encoding='utf-8').read()
for start, note in BLOCKS:
    i = s.find(start)
    if i == -1:
        continue  # already removed
    if s.count(start) != 1:
        sys.exit(f'STOP {p}: {note} start found {s.count(start)} times')
    j = s.find('\n})();\n', i)
    if j == -1:
        sys.exit(f'STOP {p}: end of {note} not found')
    j += len('\n})();\n')
    while s[j:j + 1] == '\n':  # the blank line after the block
        j += 1
    s = s[:i] + s[j:]
    changed.append(f'{p}: {note} removed')
if changed:
    save(p, s)

p = 'selfhost/hide-pro.css'
EMPTY = (f'/* EMON self-host ({TAG}, 2026-11-24): nothing is hidden here any more. The Pro banner, Sign in, Upgrade,\n'
         '   PRO badges and locked buttons are deleted in the code (selfhost/patch_mine*.py). Kept (empty) because nginx\n'
         '   links it into every page. */\n')
s = open(p, encoding='utf-8').read()
if s != EMPTY:
    save(p, EMPTY)
    changed.append(f'{p}: all hide rules removed')

print(f'{TAG} unhide: {len(changed)} change(s)')
for c in changed:
    print('  ' + c)
