#!/usr/bin/env node
// EMON self-host (nvii, 2026-11-20): Climate Anomalies from NASA POWER when Open-Meteo refuses this IP.
// Open-Meteo's archive answers "Daily API request limit exceeded" here, so climate:zone-normals:v1 never got
// written and seed-climate-anomalies.mjs fails on every run. This fills the same two Redis keys in the same
// shapes from NASA POWER (keyless, MERRA-2):
//   normals: /api/temporal/climatology/point  (monthly means, 2001-2025)  -> only if the baseline is missing
//   recent : /api/temporal/daily/point        (last 25 days)              -> the last 7 complete days vs the normal
// Does nothing when climate:anomalies:v2 was refreshed in the last 3 hours (e.g. the Open-Meteo seeder worked).
import { loadEnvFile, runSeed, sleep, verifySeedKey, writeExtraKeyWithMeta } from './_seed-utils.mjs';
import { CLIMATE_ZONES, MIN_CLIMATE_ZONE_COUNT, hasRequiredClimateZones } from './_climate-zones.mjs';
import { indexZoneNormals, buildClimateAnomalyFromResponse, climateAnomaliesContentMeta, declareRecords } from './seed-climate-anomalies.mjs';

loadEnvFile(import.meta.url);

const NORMALS_KEY = 'climate:zone-normals:v1';
const ANOMALIES_KEY = 'climate:anomalies:v2';
const NORMALS_TTL = 95 * 24 * 60 * 60;
const FRESH_MS = 3 * 60 * 60 * 1000;
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const BASE = 'https://power.larc.nasa.gov/api/temporal';
const UA = 'emon-selfhost/1.0 (personal dashboard)';

async function power(path, zone, extra = '') {
  const url = `${BASE}/${path}/point?parameters=T2M,PRECTOTCORR&community=AG&longitude=${zone.lon}&latitude=${zone.lat}&format=JSON${extra}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(40_000) });
      if (r.ok) return (await r.json())?.properties?.parameter ?? null;
      if (r.status !== 429 && r.status < 500) throw new Error(`NASA POWER HTTP ${r.status} for ${zone.name}`);
    } catch (err) {
      if (attempt === 2) throw err;
    }
    await sleep(4000 * (attempt + 1));
  }
  throw new Error(`NASA POWER gave no answer for ${zone.name}`);
}

const ok = (v) => typeof v === 'number' && Number.isFinite(v) && v > -900;

async function fetchNormals() {
  const normals = [];
  for (const zone of CLIMATE_ZONES) {
    try {
      const p = await power('climatology', zone);
      const months = MONTHS.map((m, i) => ({ month: i + 1, tempMean: p?.T2M?.[m], precipMean: p?.PRECTOTCORR?.[m] }))
        .filter((m) => ok(m.tempMean) && ok(m.precipMean));
      if (months.length === 12) normals.push({ zone: zone.name, location: { latitude: zone.lat, longitude: zone.lon }, months });
      else console.warn(`  [NASA] normals incomplete for ${zone.name}`);
    } catch (err) { console.warn(`  [NASA] ${err?.message ?? err}`); }
    await sleep(400);
  }
  if (normals.length < MIN_CLIMATE_ZONE_COUNT || !hasRequiredClimateZones(normals, (z) => z.zone)) {
    throw new Error(`NASA normals: only ${normals.length}/${CLIMATE_ZONES.length} zones`);
  }
  return { referencePeriod: '2001-2025', fetchedAt: Date.now(), normals };
}

const ymd = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');

async function fetchAnomalies() {
  let normalsPayload = await verifySeedKey(NORMALS_KEY).catch(() => null);
  if (!normalsPayload?.normals?.length) {
    console.log('  Baseline missing: building it from NASA POWER climatology');
    normalsPayload = await fetchNormals();
    await writeExtraKeyWithMeta(NORMALS_KEY, normalsPayload, NORMALS_TTL, normalsPayload.normals.length, 'seed-meta:climate:zone-normals');
  }
  const normalsIndex = indexZoneNormals(normalsPayload);
  const extra = `&start=${ymd(new Date(Date.now() - 25 * 86400000))}&end=${ymd(new Date())}`;
  const anomalies = [];
  for (const zone of CLIMATE_ZONES) {
    try {
      const p = await power('daily', zone, extra);
      const days = Object.keys(p?.T2M ?? {}).sort().filter((d) => ok(p.T2M[d]) && ok(p?.PRECTOTCORR?.[d]));
      const daily = {
        time: days.map((d) => `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`),
        temperature_2m_mean: days.map((d) => p.T2M[d]),
        precipitation_sum: days.map((d) => p.PRECTOTCORR[d]),
      };
      const a = buildClimateAnomalyFromResponse(zone, { daily }, normalsIndex);
      if (a) anomalies.push(a);
    } catch (err) { console.warn(`  [NASA] ${err?.message ?? err}`); }
    await sleep(400);
  }
  if (anomalies.length < MIN_CLIMATE_ZONE_COUNT) throw new Error(`NASA daily: only ${anomalies.length}/${CLIMATE_ZONES.length} zones`);
  if (!hasRequiredClimateZones(anomalies, (z) => z.zone)) throw new Error('NASA daily: a required zone is missing');
  return { anomalies, pagination: undefined };
}

const meta = await verifySeedKey('seed-meta:climate:anomalies').catch(() => null);
const data = await verifySeedKey(ANOMALIES_KEY).catch(() => null);
if (data?.anomalies?.length && meta?.fetchedAt && Date.now() - Number(meta.fetchedAt) < FRESH_MS) {
  console.log('climate anomalies are fresh; nothing to do');
  process.exit(0);
}

runSeed('climate', 'anomalies', ANOMALIES_KEY, fetchAnomalies, {
  validateFn: (d) => Array.isArray(d?.anomalies) && d.anomalies.length >= MIN_CLIMATE_ZONE_COUNT && hasRequiredClimateZones(d.anomalies, (z) => z.zone),
  ttlSeconds: 32400,
  sourceVersion: 'nasa-power-merra2-2001-2025-v1',
  declareRecords,
  schemaVersion: 1,
  maxStaleMin: 240,
  contentMeta: climateAnomaliesContentMeta,
  maxContentAgeMin: 14 * 24 * 60,
}).catch((err) => { console.error('FATAL:', err?.message || err); process.exit(1); });
