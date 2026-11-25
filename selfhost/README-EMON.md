# EMON Earth Monitor

EMON Earth Monitor (EMON) is a self-hosted, modified copy of [World Monitor](https://github.com/koala73/worldmonitor) (AGPL-3.0),
focused on North America: planes, ships, weather, floods, fires, cameras and news on one map.
This branch holds the changes; `main` is upstream, untouched. Same license as upstream: AGPL-3.0.

## What is different from upstream

- No Pro banner, sign-in or upgrade prompts. Gated features either work on this copy or are hidden
  (`selfhost/hide-pro.css`, `selfhost/selfhost-channels.js`, `src/services/panel-gating.ts`, the
  `nvii-local-ai` and `nvii-pro` blocks in `selfhost/nginx.conf.template`).
- AI summaries run on a local Ollama model instead of a paid API (`selfhost/extras/local-ai/`:
  a unix-socket bridge so the app container can reach Ollama on the host).
- Local-first weather alerts (`scripts/_weather-alert-select.mjs`), extra webcams and live channels
  (`selfhost/patch_cams*.py`, `src/config/live-video-sources.ts`), flight and map-popup changes.
- All six editions served from one site as paths (`selfhost/editions.py`, `src/config/variant.ts`).
- Follows the theme chosen on alola.lol (block `nvii-alola-theme-v1` in `selfhost/selfhost-channels.js`).
- Extra feeds built outside the app (`selfhost/extras/pi-feeds/`): about 40,000 public traffic cameras
  across North America, wildfire outlines, local headlines, a Texas camera image proxy, flights.

## Layout

- `selfhost/` — everything added for this copy. `selfhost/docker-compose.override.example.yml` is the
  compose override in use (copy it to `docker-compose.override.yml`).
- Secrets live only in `.env`, which is not in the repo. See upstream `.env.example`.
