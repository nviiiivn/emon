#!/bin/bash
# EMON extra seeders (2026-11-20): jobs the main run-seeders.sh list does not run (it only runs seed-*.mjs)
# or that fail inside their bundle's short time limit. Same environment as run-seeders.sh.
cd ~/projects/worldmonitor || exit 1
set -a; . ./.env; [ -f .env.seeders ] && . ./.env.seeders; set +a
export UPSTASH_REDIS_REST_URL=http://localhost:8079 UPSTASH_REDIS_REST_TOKEN="$REDIS_TOKEN" UPSTASH_ALLOW_INSECURE_HTTP=true
for s in fetch-gpsjam.mjs seed-grid-disruption-clock.mjs; do
  timeout 300 node "scripts/$s" >/dev/null 2>&1 && echo "→ $s ... OK" || echo "→ $s ... FAIL"
done
