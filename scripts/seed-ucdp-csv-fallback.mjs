#!/usr/bin/env node
// EMON self-host (nvii, 2026-11-20): UCDP Events without an API token.
// The UCDP API (ucdpapi.pcr.uu.se) needs a token that is granted by email. UCDP also publishes the same data as
// public files on https://ucdp.uu.se/downloads/ : the GED Candidate CSV (this year, monthly releases) and the
// annual GED zip (last year). This reads those files and fills the same Redis keys, in the same shapes, as
// seed-ucdp-events.mjs. Does nothing when UCDP_ACCESS_TOKEN is set (the real seeder works then) or when the
// stored data is under 12 hours old.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadEnvFile } from './_seed-utils.mjs';
import { unwrapEnvelope } from './_seed-envelope-source.mjs';
import { compactUcdpDashboardPayload, UCDP_BOOTSTRAP_KEY, UCDP_BOOTSTRAP_META_KEY } from './_ucdp-dashboard.mjs';
import ucdpCandidate from './shared/ucdp-candidate.cjs';

loadEnvFile(import.meta.url);
const { capWithAnnualFloor, candidateContentMeta, summarizeUcdpWindow, ucdpLocatedCountry, hasPreciseUcdpLocation } = ucdpCandidate;

const REDIS_KEY = 'conflict:ucdp-events:v1';
const META_KEY = 'seed-meta:conflict:ucdp-events';
const MAX_EVENTS = 2000;
const WINDOW_MS = 365 * 24 * 60 * 60 * 1000;
const FRESH_MS = 12 * 60 * 60 * 1000;
const UA = 'Mozilla/5.0 (X11; Linux x86_64) emon-selfhost/1.0';
const DOWNLOADS = 'https://ucdp.uu.se/downloads/';
const VIOLENCE = { 1: 'UCDP_VIOLENCE_TYPE_STATE_BASED', 2: 'UCDP_VIOLENCE_TYPE_NON_STATE', 3: 'UCDP_VIOLENCE_TYPE_ONE_SIDED' };

const redisUrl = (process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/$/, '');
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || '';

async function redis(cmd, timeoutMs = 20_000) {
  const r = await fetch(redisUrl, { method: 'POST', headers: { Authorization: `Bearer ${redisToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cmd), signal: AbortSignal.timeout(timeoutMs) });
  if (!r.ok) throw new Error(`redis ${cmd[0]} HTTP ${r.status}`);
  return (await r.json()).result;
}

// CSV with quoted fields that hold commas, doubled quotes and line breaks.
function parseCsv(text, onRow) {
  let header = null; let row = []; let field = ''; let quoted = false;
  const endRow = () => {
    row.push(field); field = '';
    if (!header) header = row;
    else if (row.length === header.length) { const o = {}; for (let i = 0; i < header.length; i++) o[header[i]] = row[i]; onRow(o); }
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false; } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') endRow();
    else if (c !== '\r') field += c;
  }
  if (field !== '' || row.length) endRow();
}

const dayMs = (v) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v || '')); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : NaN; };

async function getText(url, timeoutMs = 180_000) {
  const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(timeoutMs) });
  if (!r.ok) throw new Error(`${url} HTTP ${r.status}`);
  return r.text();
}

async function main() {
  if ((process.env.UCDP_ACCESS_TOKEN || process.env.UC_DP_KEY || '').trim()) { console.log('UCDP token is set; the API seeder handles this — skip'); return; }
  if (!redisUrl || !redisToken) { console.log('Redis credentials not set — skip'); return; }
  try {
    const meta = JSON.parse((await redis(['GET', META_KEY])) || 'null');
    const have = await redis(['EXISTS', REDIS_KEY]);
    if (!process.env.NVII_FORCE && have && meta?.recordCount > 0 && Date.now() - Number(meta.fetchedAt) < FRESH_MS) { console.log('UCDP events are fresh; nothing to do'); return; }
  } catch { /* fall through and rebuild */ }

  const page = await getText(DOWNLOADS, 30_000);
  const links = [...page.matchAll(/href="(https:\/\/ucdp\.uu\.se\/downloads\/[^"]+)"/gi)].map((m) => m[1]);
  const cumulative = links.find((l) => /candidateged\/GEDEvent_v\d+_01_\d+_\d+\.csv$/i.test(l));
  const monthly = links.find((l) => /candidateged\/GEDEvent_v\d+_0_\d+\.csv$/i.test(l));
  const annualZip = links.find((l) => /\/ged\/ged\d+-csv\.zip$/i.test(l));
  const candidateUrl = cumulative || monthly;
  if (!candidateUrl) throw new Error('no candidate CSV link on the UCDP downloads page');
  const mv = /GEDEvent_v(\d+)_0_(\d+)\.csv$/i.exec(monthly || '');
  const candidateVersion = mv ? `${mv[1]}.0.${mv[2]}` : '';
  const av = /ged(\d\d)(\d)-csv\.zip$/i.exec(annualZip || '');
  const version = av ? `${av[1]}.${av[2]}` : '';
  console.log(`  Candidate file: ${candidateUrl.split('/').pop()} (release ${candidateVersion || 'unknown'})`);

  const raw = [];
  const candidateIds = new Set();
  parseCsv(await getText(candidateUrl), (e) => { raw.push(e); candidateIds.add(String(e.id)); });
  console.log(`  Candidate rows: ${raw.length}`);
  let latestMs = -Infinity;
  for (const e of raw) { const ms = dayMs(e.date_start); if (ms > latestMs) latestMs = ms; }
  if (!Number.isFinite(latestMs)) throw new Error('no dated rows in the candidate file');
  const startMs = latestMs - WINDOW_MS;

  const annualIds = new Set();
  if (annualZip) {
    const dir = mkdtempSync(join(tmpdir(), 'ucdp-'));
    try {
      const r = await fetch(annualZip, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(240_000) });
      if (!r.ok) throw new Error(`annual zip HTTP ${r.status}`);
      const zip = join(dir, 'ged.zip');
      writeFileSync(zip, Buffer.from(await r.arrayBuffer()));
      const startYear = new Date(startMs).getUTCFullYear();
      let added = 0;
      parseCsv(execFileSync('unzip', ['-p', zip], { maxBuffer: 1024 * 1024 * 1024 }).toString('utf8'), (e) => {
        if (Number(e.year) < startYear) return;
        const ms = dayMs(e.date_start);
        if (!(ms >= startMs) || candidateIds.has(String(e.id))) return;
        raw.push(e); annualIds.add(String(e.id)); added++;
      });
      console.log(`  Annual file ${annualZip.split('/').pop()}: +${added} rows inside the window`);
    } catch (err) { console.warn(`  Annual file skipped: ${err?.message ?? err}`); }
    finally { rmSync(dir, { recursive: true, force: true }); }
  }

  const filtered = raw.filter((e) => dayMs(e.date_start) >= startMs);
  const mapped = filtered.map((e) => ({
    id: String(e.id || ''),
    dateStart: dayMs(e.date_start) || 0,
    dateEnd: dayMs(e.date_end) || 0,
    location: { latitude: Number(e.latitude) || 0, longitude: Number(e.longitude) || 0 },
    country: e.country || '',
    hasPreciseLocation: hasPreciseUcdpLocation(e),
    locationName: (e.where_coordinates || '').substring(0, 200),
    sideA: (e.side_a || '').substring(0, 200),
    sideB: (e.side_b || '').substring(0, 200),
    deathsBest: Number(e.best) || 0,
    deathsLow: Number(e.low) || 0,
    deathsHigh: Number(e.high) || 0,
    violenceType: VIOLENCE[e.type_of_violence] || 'UCDP_VIOLENCE_TYPE_UNSPECIFIED',
    sourceOriginal: (e.source_original || '').substring(0, 300),
  }));
  mapped.sort((a, b) => b.dateStart - a.dateStart);
  // "Newest release" for the cap = the last month of data (the API seeder protects only the newest monthly release).
  const lastMonthMs = Date.UTC(new Date(latestMs).getUTCFullYear(), new Date(latestMs).getUTCMonth(), 1);
  const capped = capWithAnnualFloor(mapped, (ev) => candidateIds.has(ev.id) && ev.dateStart >= lastMonthMs, MAX_EVENTS, undefined, (ev) => annualIds.has(ev.id));
  if (capped.length === 0) throw new Error('0 events after processing');

  const located = filtered.map((e) => ({ country: ucdpLocatedCountry(e), dateStart: dayMs(e.date_start) || 0, deathsBest: Number(e.best) || 0, sideA: e.side_a, sideB: e.side_b }));
  const summary = summarizeUcdpWindow(located, { startMs, endMs: latestMs });
  const payload = {
    events: capped, fetchedAt: Date.now(), version, candidateVersion,
    totalRaw: raw.length, filteredCount: mapped.length,
    countryDays: summary.countryDays, partyMonths: summary.partyMonths, dailyTotals: summary.dailyTotals,
    window: { startMs, endMs: latestMs, months: summary.months, gapMonths: summary.gapMonths, upstreamGapMonths: [],
      complete: summary.gapMonths.length === 0, releases: [version, candidateVersion].filter(Boolean), missingReleases: [], unpublishedReleases: [] },
  };
  console.log(`  Mapped ${mapped.length} events, kept ${capped.length}; newest ${new Date(mapped[0].dateStart).toISOString().slice(0, 10)} — ${mapped[0].country}`);

  await redis(['SET', REDIS_KEY, JSON.stringify(payload), 'EX', 86400]);
  try {
    const compact = compactUcdpDashboardPayload(payload);
    await redis(['SET', UCDP_BOOTSTRAP_KEY, JSON.stringify(compact), 'EX', 86400]);
    await redis(['SET', UCDP_BOOTSTRAP_META_KEY, JSON.stringify({ fetchedAt: Date.now(), recordCount: compact.events.length }), 'EX', 604800]);
    console.log(`  Wrote ${UCDP_BOOTSTRAP_KEY}: ${compact.events.length} rows`);
  } catch (err) { console.error(`  Compact projection write failed: ${err?.message ?? err}`); }
  await redis(['SET', META_KEY, JSON.stringify({ fetchedAt: Date.now(), recordCount: capped.length, candidateVersion, candidateComplete: true, annualFailedPages: 0,
    windowComplete: payload.window.complete, windowGapMonths: payload.window.gapMonths, source: 'ucdp-public-csv', ...candidateContentMeta(capped) }), 'EX', 604800]);
  const back = unwrapEnvelope(JSON.parse(await redis(['GET', REDIS_KEY]))).data;
  console.log(`  Verified: ${back?.events?.length} events in Redis`);
  console.log('=== Done ===');
}

main().catch((err) => { console.error('FATAL:', err?.message || err); process.exit(0); });
