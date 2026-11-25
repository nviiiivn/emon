#!/usr/bin/env node
// EMON Social Velocity without a Reddit app (2026-11-20).
// Reddit no longer lets ordinary accounts create API apps and blocks the public hot.json from this IP, so the
// relay's own seeder (scripts/ais-relay.cjs seedSocialVelocity) always comes back empty here. This fills the
// same Redis key in the same shape from the Arctic Shift public Reddit archive (no key needed):
//   https://arctic-shift.photon-reddit.com/api/posts/search?subreddit=<sub>&after=12h
// Scoring is the relay's formula: log1p(score) * upvote_ratio * exp(-age/6h) * 100, top 30.
// Env: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN (same as the other seeders).
const REDIS_URL = (process.env.UPSTASH_REDIS_REST_URL || 'http://localhost:8079').replace(/\/$/, '');
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_TOKEN || '';
const KEY = 'intelligence:social:reddit:v1';
const META_KEY = 'seed-meta:intelligence:social-reddit';
const TTL = 43200;
const SUBREDDITS = ['worldnews', 'geopolitics', 'news'];
const UA = 'emon-selfhost/1.0 (personal dashboard)';

async function redis(cmd) {
  const r = await fetch(REDIS_URL, { method: 'POST', headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cmd), signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw new Error(`redis ${cmd[0]} HTTP ${r.status}`);
  return r.json();
}

async function fetchSub(sub) {
  const u = `https://arctic-shift.photon-reddit.com/api/posts/search?subreddit=${encodeURIComponent(sub)}&limit=100&sort=desc&after=12h`;
  const r = await fetch(u, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`r/${sub} HTTP ${r.status}`);
  const j = await r.json();
  return Array.isArray(j?.data) ? j.data : [];
}

const nowSec = Date.now() / 1000;
const all = [];
const seen = new Set();
const failures = [];
for (const sub of SUBREDDITS) {
  let posts = [];
  try { posts = await fetchSub(sub); } catch (e) { failures.push(String(e.message || e)); }
  for (const p of posts) {
    if (!p || typeof p.permalink !== 'string' || !/^\/r\/[A-Za-z0-9_]+\/comments\/[A-Za-z0-9]+(?:\/|$)/.test(p.permalink)) continue;
    if (p.removed_by_category || p.over_18) continue;
    const href = new URL(p.permalink, 'https://reddit.com').href;
    if (href.length > 2048) continue;
    const article = typeof p.url === 'string' ? p.url : '';
    let host = '';
    try { host = new URL(article).hostname; } catch {}
    const external = host && host !== 'reddit.com' && !host.endsWith('.reddit.com');
    if (external && seen.has(article)) continue;
    if (external) seen.add(article);
    const ageSec = Math.max(1, nowSec - (p.created_utc || nowSec));
    const velocity = Math.log1p(p.score || 1) * (p.upvote_ratio || 0.5) * Math.exp(-ageSec / (6 * 3600)) * 100;
    all.push({
      id: String(p.id || ''), title: String(p.title || '').slice(0, 300), subreddit: sub, url: href,
      score: p.score || 0, upvoteRatio: p.upvote_ratio || 0, numComments: p.num_comments || 0,
      velocityScore: Math.round(velocity * 10) / 10, createdAt: Math.round((p.created_utc || nowSec) * 1000),
    });
  }
  await new Promise((r) => setTimeout(r, 800));
}

if (!all.length) {
  await redis(['SET', META_KEY, JSON.stringify({ fetchedAt: Date.now(), recordCount: 0, sourceVersion: 'social-reddit', status: 'error', errorReason: ('keyless: ' + failures.join('; ')).slice(0, 240) }), 'EX', 604800]);
  console.error('[social-keyless] no posts:', failures.join('; '));
  process.exit(1);
}
all.sort((a, b) => b.velocityScore - a.velocityScore);
const top = all.slice(0, 30);
const fetchedAt = Date.now();
const envelope = { _seed: { fetchedAt, recordCount: top.length, sourceVersion: 'social-reddit', schemaVersion: 1, state: 'OK' }, data: { posts: top, fetchedAt } };
await redis(['SET', KEY, JSON.stringify(envelope), 'EX', TTL]);
await redis(['SET', META_KEY, JSON.stringify({ fetchedAt, recordCount: top.length, sourceVersion: 'social-reddit', status: 'ok' }), 'EX', 604800]);
console.log(`[social-keyless] seeded ${top.length} posts (of ${all.length}); top: "${top[0].title.slice(0, 70)}" score=${top[0].score}`);
