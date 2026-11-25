#!/bin/sh
# World Monitor weather-alert seeder only (NWS + Canada + WMO), same env as run-seeders.sh.
cd "$HOME/projects/worldmonitor" || exit 1
set -a; [ -f .env ] && . ./.env; set +a
UPSTASH_REDIS_REST_URL="${UPSTASH_REDIS_REST_URL:-http://localhost:8079}"
[ -n "${REDIS_TOKEN:-}" ] && UPSTASH_REDIS_REST_TOKEN="$REDIS_TOKEN"
export UPSTASH_REDIS_REST_URL UPSTASH_REDIS_REST_TOKEN
exec timeout -k 30 300 node scripts/seed-weather-alerts.mjs
