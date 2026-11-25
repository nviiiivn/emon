#!/bin/sh
# EMON: build the web app and put it in selfhost/dist, which docker-compose.override.yml mounts into the
# worldmonitor container (no container restart needed; the next page load gets the new build).
# Same steps as the build on EMON's own server (2026-11-24). Run from anywhere:  sh selfhost/build.sh
# Needs: Node.js 22.19+ (the repo's .nvmrc says 24) and `npm ci` done once in the repo root; rsync.
set -e
cd "$(dirname "$0")/.."
export npm_config_install_links=true
# The satellite "evidence" pictures in fire/strike popups. The server half is ORBITAL_WATCH_ENABLED in the override.
VITE_ENABLE_ORBITAL_WATCH="${VITE_ENABLE_ORBITAL_WATCH:-true}"
export VITE_ENABLE_ORBITAL_WATCH

echo "== corpus $(date)";    npm run build:crawlable-corpus && npm run build:sitemap
echo "== inventory $(date)"; node scripts/generate-inventory-facts.mjs
echo "== handlers $(date)";  node docker/build-handlers.mjs
# No `npm run build:pro`: that is World Monitor's Pro pricing page, which EMON does not have.
echo "== tsc+vite $(date)";  npx tsc && npx vite build
test -s dist/500.html && test ! -e dist/pro

# These two are bind-mounted over the build by the override, so the build must not ship its own copies.
touch dist/selfhost-hide-pro.css dist/selfhost-channels.js
mkdir -p selfhost/dist
rsync -a --delete --exclude selfhost-hide-pro.css --exclude selfhost-channels.js dist/ selfhost/dist/
echo "BUILD-OK $(date)  -> selfhost/dist"
