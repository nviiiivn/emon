#!/bin/sh
# EMON (nvii, 2026-11-24, her ask: fix the empty panels). The full seed loop (run-seeders.sh) takes
# about 3.5 hours, longer than these datasets are kept, so their panels went empty every cycle:
#   correlation cards (Escalation / Economic / Disaster) keep 20 min and need inputs under 30 min old
#   security advisories keep 3 h, radiation keeps 2 h
# Every 10 minutes: correlation inputs + correlation (about 1 minute).
# Once an hour (first run after :00): security advisories + radiation as well (about 1 more minute).
# Uses the env set-up lines of scripts/run-seeders.sh (everything before its loop), like wm-seed-fast.sh.
cd "$HOME/projects/worldmonitor" || exit 1
LIST="earthquakes internet-outages military-flights insights correlation"
MIN=$(date +%M)
if [ "${MIN#0}" -lt 10 ]; then LIST="$LIST security-advisories radiation-watch"; fi
N=$(grep -n 'for f in' scripts/run-seeders.sh | head -1 | cut -d: -f1)
T=$(mktemp scripts/.nvii-quick.XXXXXX)
head -n $((N-1)) scripts/run-seeders.sh > "$T"
for s in $LIST; do
  printf 'echo "-> seed-%s"\nnode "$SCRIPT_DIR/seed-%s.mjs" 2>&1 | tail -2\n' "$s" "$s" >> "$T"
done
timeout 600 sh "$T" 2>&1
rm -f "$T"
