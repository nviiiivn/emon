#!/bin/bash
# EMON Social Velocity from the keyless Reddit archive (2026-11-20). See selfhost/seed-social-velocity-keyless.mjs
cd ~/projects/worldmonitor || exit 1
set -a; . ./.env; set +a
export UPSTASH_REDIS_REST_URL=http://localhost:8079 UPSTASH_REDIS_REST_TOKEN="$REDIS_TOKEN"
exec timeout 120 node selfhost/seed-social-velocity-keyless.mjs
