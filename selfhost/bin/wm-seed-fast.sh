#!/bin/sh
# EMON: loaders whose data expires faster than the 30-min seed loop comes round (nvii, 2026-11-20).
# Cross-Source Signals keeps its data for 30 minutes but the full loop takes about an hour, so the box went empty.
# Uses the env set-up lines of scripts/run-seeders.sh (everything before its loop), then runs only these.
cd "$HOME/projects/worldmonitor" || exit 1
N=$(grep -n 'for f in' scripts/run-seeders.sh | head -1 | cut -d: -f1)
T=$(mktemp scripts/.nvii-fast.XXXXXX)
head -n $((N-1)) scripts/run-seeders.sh > "$T"
echo 'node "$SCRIPT_DIR/seed-cross-source-signals.mjs"' >> "$T"
timeout 300 sh "$T" 2>&1 | tail -3
rm -f "$T"
