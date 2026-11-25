/**
 * Military surge core — dependency-free so it can run in the browser bundle, on
 * Vercel Edge, and inside esbuild-bundled server handlers alike.
 *
 * Nothing here reaches for the DOM, `import.meta`, or the `@/` alias. The client
 * wrapper lives in `src/services/military-surge.ts` and owns the one process-wide
 * engine; server callers construct their own `MilitarySurgeEngine` per request
 * and inject the news/CII lookups they can actually reach.
 */

import { MILITARY_BASES_EXPANDED } from './military-bases-data';
import { POSTURE_THEATERS } from './analysis-military-posture-data';
import type { PostureTheater } from './analysis-military-posture-data';
import { haversineKm as distanceKm } from './geo-distance';

export { distanceKm };
export { POSTURE_THEATERS };
export type { PostureTheater };

/** The `SignalType` member this module emits, redeclared to stay alias-free. */
export type MilitarySurgeSignalType = 'military_surge';

/** Minimal flight shape: the fields the surge algorithms actually read. */
export interface MilitaryFlightInput {
  id: string;
  callsign: string;
  aircraftType: string;
  aircraftModel?: string;
  operator: string;
  lat: number;
  lon: number;
}

export interface GeoRegion {
  id: string;
  name: string;
  lat: number;
  lon: number;
  radiusKm: number;
}

export interface OperatorHomeRegions {
  operator: string;
  country: string;
  /** Region IDs where this operator's presence is "normal". */
  homeRegions: string[];
  /** Minimum aircraft to trigger an alert when outside home. */
  alertThreshold: number;
}

export interface MilitaryTheater {
  id: string;
  name: string;
  baseIds: string[];
  centerLat: number;
  centerLon: number;
}

export interface ForeignPresenceAlert<TFlight extends MilitaryFlightInput = MilitaryFlightInput> {
  id: string;
  operator: TFlight['operator'];
  operatorCountry: string;
  region: GeoRegion;
  aircraftCount: number;
  flights: TFlight[];
  firstDetected: Date;
}

export interface SurgeAlert {
  id: string;
  theater: MilitaryTheater;
  type: 'airlift' | 'fighter' | 'reconnaissance';
  currentCount: number;
  baselineCount: number;
  surgeMultiple: number;
  aircraftTypes: Map<string, number>;
  nearbyBases: string[];
  firstDetected: Date;
  lastUpdated: Date;
  /** nvii-surge-smart-v1: hours of tracking the baseline was learned from (absent in upstream mode). */
  baselineHours?: number;
  /** nvii-surge-smart-v1: hours the count has stayed at surge level (absent in upstream mode). */
  sustainedHours?: number;
}

export interface TheaterActivity {
  theaterId: string;
  timestamp: number;
  transportCount: number;
  fighterCount: number;
  reconCount: number;
  totalMilitary: number;
  flightIds: string[];
}

export interface MilitarySurgeSignal {
  id: string;
  type: MilitarySurgeSignalType;
  source: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  confidence: number;
  category: string;
  timestamp: Date;
  location?: { lat: number; lon: number; name: string };
  data: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

/** Focal-point news lookups, injected because they live in a client service. */
export interface MilitarySurgeNewsContext {
  getCorrelation(countryCodes: string[]): string | null;
  getFocalPoint(countryCode: string): { displayName: string; newsMentions: number; urgency: string } | null;
}

/** Country-instability lookup, injected for the same reason. */
export type MilitarySurgeCiiLookup = (countryCode: string) => number | null;

/** nvii-surge-smart-v1: where the engine keeps theater history between page loads. */
export interface MilitarySurgeHistoryStore {
  load(): string | null;
  save(serialized: string): void;
}

export interface MilitarySurgeEngineOptions {
  now?: () => number;
  newsContext?: MilitarySurgeNewsContext | null;
  getCii?: MilitarySurgeCiiLookup | null;
  /** nvii-surge-smart-v1: keep theater history across page loads (null = memory only, the upstream behaviour). */
  historyStore?: MilitarySurgeHistoryStore | null;
  /**
   * nvii-surge-smart-v1: raise no surge until the baseline comes from real samples spanning at
   * least this many hours. 0 = upstream behaviour (cold start compares against a guessed baseline).
   */
  minBaselineHours?: number;
  /** nvii-surge-smart-v1: a surge has to hold this long before it alerts. 0 = alert on the first sample. */
  sustainMs?: number;
}

// Sensitive regions where foreign military concentration is notable
export const SENSITIVE_REGIONS: GeoRegion[] = [
  // Middle East / Iran area
  { id: 'persian-gulf', name: 'Persian Gulf', lat: 26.5, lon: 52.0, radiusKm: 600 },
  { id: 'strait-hormuz', name: 'Strait of Hormuz', lat: 26.5, lon: 56.5, radiusKm: 300 },
  { id: 'iran-border', name: 'Iran Border Region', lat: 33.0, lon: 47.0, radiusKm: 400 },
  // Eastern Europe / Russia borders
  { id: 'baltics', name: 'Baltic Region', lat: 56.0, lon: 24.0, radiusKm: 400 },
  { id: 'poland-border', name: 'Poland-Belarus Border', lat: 52.5, lon: 23.5, radiusKm: 300 },
  { id: 'black-sea', name: 'Black Sea', lat: 43.5, lon: 34.0, radiusKm: 500 },
  { id: 'kaliningrad', name: 'Kaliningrad Region', lat: 54.7, lon: 20.5, radiusKm: 250 },
  // Asia-Pacific
  { id: 'taiwan-strait', name: 'Taiwan Strait', lat: 24.5, lon: 119.5, radiusKm: 400 },
  { id: 'south-china-sea', name: 'South China Sea', lat: 14.0, lon: 114.0, radiusKm: 800 },
  { id: 'korean-dmz', name: 'Korean DMZ', lat: 38.0, lon: 127.0, radiusKm: 300 },
  { id: 'japan-sea', name: 'Sea of Japan', lat: 40.0, lon: 135.0, radiusKm: 500 },
  // Arctic / Alaska
  { id: 'alaska-adiz', name: 'Alaska ADIZ', lat: 62.0, lon: -165.0, radiusKm: 600 },
  { id: 'arctic-russia', name: 'Arctic (Russian Side)', lat: 72.0, lon: 70.0, radiusKm: 800 },
  // Mediterranean / Libya
  { id: 'east-med', name: 'Eastern Mediterranean', lat: 34.5, lon: 33.0, radiusKm: 500 },
  { id: 'libya-coast', name: 'Libya Coast', lat: 32.5, lon: 15.0, radiusKm: 400 },
  // Africa
  { id: 'horn-africa', name: 'Horn of Africa', lat: 10.0, lon: 45.0, radiusKm: 600 },
  { id: 'sahel', name: 'Sahel Region', lat: 15.0, lon: 5.0, radiusKm: 800 },
  // South America
  { id: 'venezuela', name: 'Venezuela', lat: 8.0, lon: -66.0, radiusKm: 500 },
];

// Define home regions for major military operators
export const OPERATOR_HOMES: OperatorHomeRegions[] = [
  { operator: 'usaf', country: 'USA', homeRegions: ['alaska-adiz'], alertThreshold: 2 },
  { operator: 'usn', country: 'USA', homeRegions: ['alaska-adiz'], alertThreshold: 2 },
  { operator: 'usmc', country: 'USA', homeRegions: ['alaska-adiz'], alertThreshold: 2 },
  { operator: 'usa', country: 'USA', homeRegions: ['alaska-adiz'], alertThreshold: 2 },
  { operator: 'vks', country: 'Russia', homeRegions: ['kaliningrad', 'arctic-russia', 'black-sea'], alertThreshold: 2 },
  { operator: 'plaaf', country: 'China', homeRegions: ['taiwan-strait', 'south-china-sea'], alertThreshold: 2 },
  { operator: 'plan', country: 'China', homeRegions: ['taiwan-strait', 'south-china-sea'], alertThreshold: 2 },
  { operator: 'iaf', country: 'Israel', homeRegions: ['east-med', 'iran-border'], alertThreshold: 2 },
  { operator: 'raf', country: 'UK', homeRegions: ['baltics', 'black-sea'], alertThreshold: 3 },
  { operator: 'faf', country: 'France', homeRegions: ['sahel', 'east-med', 'libya-coast'], alertThreshold: 3 },
  { operator: 'gaf', country: 'Germany', homeRegions: ['baltics'], alertThreshold: 3 },
];

export const THEATERS: MilitaryTheater[] = [
  {
    id: 'middle-east',
    name: 'Middle East / Persian Gulf',
    baseIds: ['al_udeid', 'ali_al_salem_air_base', 'camp_arifjan', 'camp_buehring', 'kuwait_naval_base',
              'naval_support_activity_bahrain', 'isa_air_base', 'masirah_aira_base', 'rafo_thumrait',
              'al_dhafra_air_base', 'port_of_jebel_ali', 'fujairah_naval_base', 'prince_sultan_air_base',
              'ain_assad_air_base', 'camp_victory', 'naval_support_facility_diego_garcia'],
    centerLat: 27.0,
    centerLon: 50.0,
  },
  {
    id: 'europe-east',
    name: 'Eastern Europe',
    baseIds: ['camp_bondsteel', 'aitos_logistics_center', 'bezmer', 'graf_ignatievo'],
    centerLat: 45.0,
    centerLon: 25.0,
  },
  {
    id: 'europe-west',
    name: 'Western Europe',
    baseIds: ['ramstein', 'spangdahlem', 'usag_stuttgart', 'raf_lakenheath', 'raf_mildenhall', 'aviano'],
    centerLat: 50.0,
    centerLon: 8.0,
  },
  {
    id: 'pacific-west',
    name: 'Western Pacific',
    baseIds: ['kadena_air_base', 'camp_fuji', 'fleet_activities_okinawa', 'yokota', 'misawsa',
              'osan_air_base', 'kunsan_ab', 'us_army_garrison_humphreys', 'andersen_air_force_base'],
    centerLat: 30.0,
    centerLon: 130.0,
  },
  {
    id: 'africa-horn',
    name: 'Horn of Africa',
    baseIds: ['camp_lemonnier', 'contingency_location_garoua', 'niger_air_base_201'],
    centerLat: 10.0,
    centerLon: 40.0,
  },
];

export const SURGE_THRESHOLD = 2.0;
export const BASELINE_WINDOW_HOURS = 48;
export const BASELINE_MIN_SAMPLES = 6;
const TRANSPORT_CALLSIGN_PATTERNS = [
  /^RCH/i, /^REACH/i, /^MOOSE/i, /^HERKY/i, /^EVAC/i, /^DUSTOFF/i,
];
export const PROXIMITY_RADIUS_KM = 150;

const CLEANUP_INTERVAL = 60 * 60 * 1000;
const MAX_HISTORY_HOURS = 72;
/** nvii-surge-smart-v1: two samples further apart than this (page closed) do not count as one continuous surge. */
const SUSTAIN_MAX_GAP_MS = 30 * 60 * 1000;
/** nvii-surge-smart-v1: room for 72 h of samples at a few minutes apart when history is kept. */
const STORED_HISTORY_MAX_SAMPLES = 1500;
const HISTORY_STORE_VERSION = 1;

export function getTheaterForBase(baseId: string): MilitaryTheater | null {
  for (const theater of THEATERS) {
    if (theater.baseIds.includes(baseId)) {
      return theater;
    }
  }
  return null;
}

export function findNearbyBases(lat: number, lon: number): { baseId: string; baseName: string; distance: number }[] {
  const nearby: { baseId: string; baseName: string; distance: number }[] = [];
  for (const base of MILITARY_BASES_EXPANDED) {
    const dist = distanceKm(lat, lon, base.lat, base.lon);
    if (dist <= PROXIMITY_RADIUS_KM) {
      nearby.push({ baseId: base.id, baseName: base.name, distance: dist });
    }
  }
  return nearby.sort((a, b) => a.distance - b.distance);
}

export function isTransportFlight(flight: MilitaryFlightInput): boolean {
  if (flight.aircraftType === 'transport' || flight.aircraftType === 'tanker') {
    return true;
  }
  const callsign = flight.callsign.toUpperCase();
  return TRANSPORT_CALLSIGN_PATTERNS.some(p => p.test(callsign));
}

export function classifyFlight(flight: MilitaryFlightInput): 'transport' | 'fighter' | 'recon' | 'other' {
  if (isTransportFlight(flight)) return 'transport';
  if (flight.aircraftType === 'fighter') return 'fighter';
  if (flight.aircraftType === 'reconnaissance' || flight.aircraftType === 'awacs') return 'recon';
  return 'other';
}

export function getTheaterForFlight(flight: MilitaryFlightInput): MilitaryTheater | null {
  const nearbyBases = findNearbyBases(flight.lat, flight.lon);
  for (const { baseId } of nearbyBases) {
    const theater = getTheaterForBase(baseId);
    if (theater) return theater;
  }
  for (const theater of THEATERS) {
    const dist = distanceKm(flight.lat, flight.lon, theater.centerLat, theater.centerLon);
    if (dist < 1500) return theater;
  }
  return null;
}

// ============ FOREIGN MILITARY CONCENTRATION DETECTION ============

export function getRegionForPosition(lat: number, lon: number): GeoRegion | null {
  for (const region of SENSITIVE_REGIONS) {
    const dist = distanceKm(lat, lon, region.lat, region.lon);
    if (dist <= region.radiusKm) {
      return region;
    }
  }
  return null;
}

function isHomeRegion(operator: string, regionId: string): boolean {
  const config = OPERATOR_HOMES.find(o => o.operator === operator);
  if (!config) return true; // Unknown operator - don't alert
  return config.homeRegions.includes(regionId);
}

function getOperatorThreshold(operator: string): number {
  const config = OPERATOR_HOMES.find(o => o.operator === operator);
  return config?.alertThreshold ?? 3;
}

function getOperatorCountry(operator: string): string {
  const config = OPERATOR_HOMES.find(o => o.operator === operator);
  return config?.country ?? 'Unknown';
}

// Map operator country names to ISO codes for focal point lookup
const COUNTRY_TO_ISO: Record<string, string> = {
  'USA': 'US',
  'Russia': 'RU',
  'China': 'CN',
  'Israel': 'IL',
  'Iran': 'IR',
  'UK': 'GB',
  'France': 'FR',
  'Germany': 'DE',
  'Taiwan': 'TW',
  'Ukraine': 'UA',
  'Saudi Arabia': 'SA',
};

// Map regions to affected countries (for news correlation)
const REGION_AFFECTED_COUNTRIES: Record<string, string[]> = {
  'persian-gulf': ['IR', 'SA'],
  'strait-hormuz': ['IR'],
  'iran-border': ['IR', 'IL'],
  'baltics': ['RU', 'UA'],
  'poland-border': ['RU', 'UA'],
  'black-sea': ['RU', 'UA'],
  'taiwan-strait': ['TW', 'CN'],
  'south-china-sea': ['CN', 'TW'],
  'east-med': ['IL', 'IR'],
  'alaska-adiz': ['RU'],
};

export function foreignPresenceToSignal(
  alert: ForeignPresenceAlert,
  newsContext?: MilitarySurgeNewsContext | null,
): MilitarySurgeSignal {
  const aircraftTypes = new Map<string, number>();
  const callsigns: string[] = [];

  for (const flight of alert.flights) {
    const typeKey = flight.aircraftModel || flight.aircraftType || 'unknown';
    aircraftTypes.set(typeKey, (aircraftTypes.get(typeKey) || 0) + 1);
    callsigns.push(flight.callsign);
  }

  const aircraftList = Array.from(aircraftTypes.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type, count]) => `${count}x ${type}`)
    .join(', ');

  // Severity based on operator and region sensitivity
  const criticalCombos = [
    ['vks', 'baltics'], ['vks', 'poland-border'], ['vks', 'alaska-adiz'],
    ['plaaf', 'taiwan-strait'], ['plan', 'taiwan-strait'],
    ['usaf', 'iran-border'], ['usn', 'persian-gulf'], ['iaf', 'iran-border'],
  ];

  const isCritical = criticalCombos.some(
    ([op, reg]) => alert.operator === op && alert.region.id === reg
  );

  const severity = isCritical ? 'critical' :
    alert.aircraftCount >= 5 ? 'high' : 'medium';

  const confidence = Math.min(0.95, 0.7 + alert.aircraftCount * 0.05);

  // Gather relevant countries for focal point lookup
  const relevantCountries: string[] = [];
  const operatorISO = COUNTRY_TO_ISO[alert.operatorCountry];
  if (operatorISO) relevantCountries.push(operatorISO);

  const affectedCountries = REGION_AFFECTED_COUNTRIES[alert.region.id] || [];
  for (const iso of affectedCountries) {
    if (!relevantCountries.includes(iso)) {
      relevantCountries.push(iso);
    }
  }

  // Get news correlation from the injected focal point source
  const newsCorrelation = newsContext?.getCorrelation(relevantCountries) ?? null;

  // Build enhanced description with news correlation
  const description = `${alert.aircraftCount} ${alert.operatorCountry} aircraft detected in ${alert.region.name}. ` +
    `${aircraftList}. Callsigns: ${callsigns.slice(0, 4).join(', ')}${callsigns.length > 4 ? '...' : ''}`;

  // Check for critical focal points in affected region
  const focalPointContexts: string[] = [];
  for (const iso of relevantCountries) {
    const fp = newsContext?.getFocalPoint(iso);
    if (fp && fp.newsMentions > 0) {
      focalPointContexts.push(`${fp.displayName}: ${fp.newsMentions} news mentions (${fp.urgency})`);
    }
  }

  const metadata: Record<string, unknown> = {
    operator: alert.operator,
    operatorCountry: alert.operatorCountry,
    regionId: alert.region.id,
    regionName: alert.region.name,
    lat: alert.region.lat,
    lon: alert.region.lon,
    aircraftCount: alert.aircraftCount,
    aircraftTypes: Object.fromEntries(aircraftTypes),
    callsigns,
    relevantCountries,
    newsCorrelation,
    focalPointContext: focalPointContexts.length > 0 ? focalPointContexts : null,
  };

  return {
    id: `foreign-${alert.id}-${alert.firstDetected.getTime()}`,
    type: 'military_surge',
    source: 'Military Flight Tracking',
    title: `🚨 ${alert.operatorCountry} Military in ${alert.region.name}`,
    description,
    severity,
    confidence,
    category: 'military',
    timestamp: alert.firstDetected,
    location: {
      lat: alert.region.lat,
      lon: alert.region.lon,
      name: alert.region.name,
    },
    data: metadata,
    metadata,
  };
}

// ============ SURGE DETECTION (baseline-based) ============

export function surgeAlertToSignal(surge: SurgeAlert): MilitarySurgeSignal {
  const typeLabels = {
    airlift: '🛫 Military Airlift Surge',
    fighter: '✈️ Fighter Deployment Surge',
    reconnaissance: '🔭 Reconnaissance Surge',
  };

  const aircraftList = Array.from(surge.aircraftTypes.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type, count]) => `${count}x ${type}`)
    .join(', ');

  const severity = surge.surgeMultiple >= 4 ? 'critical' :
    surge.surgeMultiple >= 3 ? 'high' : 'medium';

  const confidence = Math.min(0.95, 0.6 + (surge.surgeMultiple - 2) * 0.1);

  const metadata = {
    theaterId: surge.theater.id,
    surgeType: surge.type,
    currentCount: surge.currentCount,
    baselineCount: surge.baselineCount,
    surgeMultiple: surge.surgeMultiple,
    aircraftTypes: Object.fromEntries(surge.aircraftTypes),
    nearbyBases: surge.nearbyBases,
    lat: surge.theater.centerLat,
    lon: surge.theater.centerLon,
    regionName: surge.theater.name,
  };

  return {
    id: `surge-${surge.id}-${surge.firstDetected.getTime()}`,
    type: 'military_surge',
    source: 'Military Flight Tracking',
    title: `${typeLabels[surge.type]} - ${surge.theater.name}`,
    // nvii-surge-smart-v1: say what "baseline" was and how long the jump has held, when the engine knows.
    description: (surge.baselineHours !== undefined && surge.sustainedHours !== undefined
      ? `${surge.currentCount} ${surge.type} aircraft detected (${surge.surgeMultiple.toFixed(1)}x the usual ${surge.baselineCount}, ` +
        `learned from ${Math.round(surge.baselineHours)} h of tracking; held ${surge.sustainedHours.toFixed(1)} h). `
      : `${surge.currentCount} ${surge.type} aircraft detected (${surge.surgeMultiple.toFixed(1)}x baseline). `) +
      `${aircraftList}. Near: ${surge.nearbyBases.slice(0, 3).join(', ')}`,
    severity,
    confidence,
    category: 'military',
    timestamp: surge.firstDetected,
    location: {
      lat: surge.theater.centerLat,
      lon: surge.theater.centerLon,
      name: surge.theater.name,
    },
    data: metadata,
    metadata,
  };
}

// ============ THEATER POSTURE AGGREGATION ============

export interface TheaterPostureSummary {
  theaterId: string;
  theaterName: string;
  shortName: string;
  targetNation: string | null;
  // Aircraft counts
  fighters: number;
  tankers: number;
  awacs: number;
  reconnaissance: number;
  transport: number;
  bombers: number;
  drones: number;
  totalAircraft: number;
  // Naval vessel counts (added client-side)
  destroyers: number;
  frigates: number;
  carriers: number;
  submarines: number;
  patrol: number;
  auxiliaryVessels: number;
  totalVessels: number;
  // Combined
  byOperator: Record<string, number>;
  postureLevel: 'normal' | 'elevated' | 'critical';
  strikeCapable: boolean;
  trend: 'increasing' | 'stable' | 'decreasing';
  changePercent: number;
  summary: string;
  headline: string;
  centerLat: number;
  centerLon: number;
  // Theater bounds for vessel matching
  bounds?: { north: number; south: number; east: number; west: number };
}

export function getTheaterPostureSummaries(
  flights: MilitaryFlightInput[],
  activityHistory?: ReadonlyMap<string, TheaterActivity[]>,
): TheaterPostureSummary[] {
  const summaries: TheaterPostureSummary[] = [];

  for (const theater of POSTURE_THEATERS) {
    const theaterFlights = flights.filter(
      (f) =>
        f.lat >= theater.bounds.south &&
        f.lat <= theater.bounds.north &&
        f.lon >= theater.bounds.west &&
        f.lon <= theater.bounds.east
    );

    const byType = {
      fighters: theaterFlights.filter((f) => f.aircraftType === 'fighter').length,
      tankers: theaterFlights.filter((f) => f.aircraftType === 'tanker').length,
      awacs: theaterFlights.filter((f) => f.aircraftType === 'awacs').length,
      reconnaissance: theaterFlights.filter((f) => f.aircraftType === 'reconnaissance').length,
      transport: theaterFlights.filter((f) => f.aircraftType === 'transport').length,
      bombers: theaterFlights.filter((f) => f.aircraftType === 'bomber').length,
      drones: theaterFlights.filter((f) => f.aircraftType === 'drone').length,
    };

    const total = Object.values(byType).reduce((a, b) => a + b, 0);

    const byOperator: Record<string, number> = {};
    for (const f of theaterFlights) {
      byOperator[f.operator] = (byOperator[f.operator] || 0) + 1;
    }

    const postureLevel: 'normal' | 'elevated' | 'critical' =
      total >= theater.thresholds.critical
        ? 'critical'
        : total >= theater.thresholds.elevated
          ? 'elevated'
          : 'normal';

    const strikeCapable =
      byType.tankers >= theater.strikeIndicators.minTankers &&
      byType.awacs >= theater.strikeIndicators.minAwacs &&
      byType.fighters >= theater.strikeIndicators.minFighters;

    const history = activityHistory?.get(theater.id) || [];
    const recent = history.slice(-6);
    const older = history.slice(-12, -6);
    const recentAvg =
      recent.length > 0 ? recent.reduce((a, b) => a + b.totalMilitary, 0) / recent.length : total;
    const olderAvg =
      older.length > 0 ? older.reduce((a, b) => a + b.totalMilitary, 0) / older.length : total;
    const changePercent = olderAvg > 0 ? Math.round(((recentAvg - olderAvg) / olderAvg) * 100) : 0;
    const trend: 'increasing' | 'stable' | 'decreasing' =
      changePercent > 10 ? 'increasing' : changePercent < -10 ? 'decreasing' : 'stable';

    const parts: string[] = [];
    if (byType.fighters > 0) parts.push(`${byType.fighters} fighters`);
    if (byType.tankers > 0) parts.push(`${byType.tankers} tankers`);
    if (byType.awacs > 0) parts.push(`${byType.awacs} AWACS`);
    if (byType.reconnaissance > 0) parts.push(`${byType.reconnaissance} recon`);
    const summary = parts.join(', ') || 'No military aircraft';

    const headline =
      postureLevel === 'critical'
        ? `Critical military buildup - ${theater.name}`
        : postureLevel === 'elevated'
          ? `Elevated military activity - ${theater.name}`
          : `Normal activity - ${theater.name}`;

    summaries.push({
      theaterId: theater.id,
      theaterName: theater.name,
      shortName: theater.shortName,
      targetNation: theater.targetNation,
      // Aircraft
      fighters: byType.fighters,
      tankers: byType.tankers,
      awacs: byType.awacs,
      reconnaissance: byType.reconnaissance,
      transport: byType.transport,
      bombers: byType.bombers,
      drones: byType.drones,
      totalAircraft: total,
      // Vessels (populated client-side)
      destroyers: 0,
      frigates: 0,
      carriers: 0,
      submarines: 0,
      patrol: 0,
      auxiliaryVessels: 0,
      totalVessels: 0,
      // Metadata
      byOperator,
      postureLevel,
      strikeCapable,
      trend,
      changePercent,
      summary,
      headline,
      centerLat: (theater.bounds.north + theater.bounds.south) / 2,
      centerLon: (theater.bounds.east + theater.bounds.west) / 2,
      bounds: theater.bounds,
    });
  }

  return summaries;
}

/**
 * Map theater target nations to ISO2 country codes for CII lookup.
 */
const TARGET_NATION_CODES: Record<string, string> = {
  'Iran': 'IR',
  'Taiwan': 'TW',
  'North Korea': 'KP',
  'Gaza': 'PS',
  'Yemen': 'YE',
};

/**
 * Recalculate posture level after vessels have been merged into summaries.
 * Uses "either triggers" logic: if aircraft OR vessels exceed thresholds, level escalates.
 * CII boost: theaters whose target nation has CII ≥ 70 get elevated, ≥ 85 get critical.
 */
export function recalcPostureWithVessels(
  postures: TheaterPostureSummary[],
  getCii?: MilitarySurgeCiiLookup | null,
): void {
  for (const p of postures) {
    const theater = POSTURE_THEATERS.find((t) => t.id === p.theaterId);
    if (!theater) continue;

    const airLevel: 0 | 1 | 2 =
      p.totalAircraft >= theater.thresholds.critical ? 2
        : p.totalAircraft >= theater.thresholds.elevated ? 1 : 0;

    const navalLevel: 0 | 1 | 2 =
      p.totalVessels >= theater.navalThresholds.critical ? 2
        : p.totalVessels >= theater.navalThresholds.elevated ? 1 : 0;

    // CII boost: high instability in target nation elevates theater posture
    let ciiLevel: 0 | 1 | 2 = 0;
    if (theater.targetNation && getCii) {
      const code = TARGET_NATION_CODES[theater.targetNation];
      if (code) {
        const cii = getCii(code);
        if (cii !== null) {
          ciiLevel = cii >= 85 ? 2 : cii >= 70 ? 1 : 0;
        }
      }
    }

    const combined = Math.max(airLevel, navalLevel, ciiLevel) as 0 | 1 | 2;
    p.postureLevel = combined === 2 ? 'critical' : combined === 1 ? 'elevated' : 'normal';

    // Rebuild headline with combined context
    const parts: string[] = [];
    if (p.totalAircraft > 0) parts.push(`${p.totalAircraft} aircraft`);
    if (p.totalVessels > 0) parts.push(`${p.totalVessels} vessels`);
    const assetSummary = parts.join(' + ') || 'No assets';

    p.headline =
      p.postureLevel === 'critical'
        ? `Critical military buildup - ${p.theaterName} (${assetSummary})`
        : p.postureLevel === 'elevated'
          ? `Elevated military activity - ${p.theaterName} (${assetSummary})`
          : `Normal activity - ${p.theaterName}`;
  }
}

export function getCriticalPostures(
  flights: MilitaryFlightInput[],
  activityHistory?: ReadonlyMap<string, TheaterActivity[]>,
): TheaterPostureSummary[] {
  return getTheaterPostureSummaries(flights, activityHistory).filter(
    (p) => p.postureLevel === 'critical' || (p.postureLevel === 'elevated' && p.strikeCapable)
  );
}

/**
 * Owns the four rolling stores the surge algorithms need across ticks: theater
 * activity history, active surges, active foreign presence, and the two-hour
 * foreign-alert dedup set.
 */
export class MilitarySurgeEngine<TFlight extends MilitaryFlightInput = MilitaryFlightInput> {
  private readonly now: () => number;
  private readonly newsContext: MilitarySurgeNewsContext | null;
  private readonly getCii: MilitarySurgeCiiLookup | null;

  private readonly activityHistory = new Map<string, TheaterActivity[]>();
  private readonly activeSurges = new Map<string, SurgeAlert>();
  private readonly activeForeignPresence = new Map<string, ForeignPresenceAlert<TFlight>>();
  private readonly seenForeignAlerts = new Set<string>();
  private lastCleanup: number;
  private readonly historyStore: MilitarySurgeHistoryStore | null;
  private readonly minBaselineHours: number;
  private readonly sustainMs: number;
  private readonly maxSamples: number;

  constructor(options: MilitarySurgeEngineOptions = {}) {
    this.now = options.now ?? (() => Date.now());
    this.newsContext = options.newsContext ?? null;
    this.getCii = options.getCii ?? null;
    this.lastCleanup = this.now();
    this.historyStore = options.historyStore ?? null;
    this.minBaselineHours = Math.max(0, options.minBaselineHours ?? 0);
    this.sustainMs = Math.max(0, options.sustainMs ?? 0);
    this.maxSamples = this.historyStore ? STORED_HISTORY_MAX_SAMPLES : 200;
    this.loadHistory();
  }

  private get smartMode(): boolean {
    return this.minBaselineHours > 0 || this.sustainMs > 0;
  }

  /** nvii-surge-smart-v1: rows are [timestamp, transport, fighter, recon, total] to keep storage small. */
  private loadHistory(): void {
    if (!this.historyStore) return;
    try {
      const raw = this.historyStore.load();
      if (!raw) return;
      const parsed = JSON.parse(raw) as { v?: number; theaters?: Record<string, unknown> };
      if (parsed?.v !== HISTORY_STORE_VERSION || !parsed.theaters || typeof parsed.theaters !== 'object') return;
      const cutoff = this.now() - MAX_HISTORY_HOURS * 60 * 60 * 1000;
      for (const [theaterId, rows] of Object.entries(parsed.theaters)) {
        if (!THEATERS.some(t => t.id === theaterId) || !Array.isArray(rows)) continue;
        const entries: TheaterActivity[] = [];
        for (const row of rows) {
          if (!Array.isArray(row) || row.length < 5 || !row.every(v => typeof v === 'number' && Number.isFinite(v))) continue;
          const [timestamp, transportCount, fighterCount, reconCount, totalMilitary] = row as [number, number, number, number, number];
          if (timestamp < cutoff || timestamp > this.now()) continue;
          entries.push({ theaterId, timestamp, transportCount, fighterCount, reconCount, totalMilitary, flightIds: [] });
        }
        entries.sort((a, b) => a.timestamp - b.timestamp);
        if (entries.length > 0) this.activityHistory.set(theaterId, entries.slice(-this.maxSamples));
      }
    } catch {
      // A broken or foreign store value just means starting fresh.
    }
  }

  private saveHistory(): void {
    if (!this.historyStore) return;
    try {
      const theaters: Record<string, number[][]> = {};
      for (const [theaterId, history] of this.activityHistory) {
        theaters[theaterId] = history.map(h => [h.timestamp, h.transportCount, h.fighterCount, h.reconCount, h.totalMilitary]);
      }
      this.historyStore.save(JSON.stringify({ v: HISTORY_STORE_VERSION, theaters }));
    } catch {
      // Storage full or blocked: keep working from memory.
    }
  }

  /**
   * nvii-surge-smart-v1: baseline from earlier samples only (the current one and the surge
   * window are left out), and only once the samples cover minBaselineHours. null = not learned yet.
   */
  private calculateLearnedBaseline(
    history: TheaterActivity[],
  ): { transport: number; fighter: number; recon: number; hours: number } | null {
    const now = this.now();
    const windowStart = now - BASELINE_WINDOW_HOURS * 60 * 60 * 1000;
    const windowEnd = now - this.sustainMs;
    const relevant = history.filter(h => h.timestamp >= windowStart && h.timestamp < windowEnd);
    if (relevant.length < BASELINE_MIN_SAMPLES) return null;
    const hours = (relevant[relevant.length - 1]!.timestamp - relevant[0]!.timestamp) / (60 * 60 * 1000);
    if (hours < this.minBaselineHours) return null;
    const avg = (pick: (h: TheaterActivity) => number) => relevant.reduce((sum, h) => sum + pick(h), 0) / relevant.length;
    return {
      transport: Math.max(2, avg(h => h.transportCount)),
      fighter: Math.max(1, avg(h => h.fighterCount)),
      recon: Math.max(1, avg(h => h.reconCount)),
      hours,
    };
  }

  /**
   * nvii-surge-smart-v1: when the current run of samples at or above `threshold` began, walking back
   * from the newest sample. A gap longer than SUSTAIN_MAX_GAP_MS ends the run.
   */
  private surgeStreakStart(history: TheaterActivity[], pick: (h: TheaterActivity) => number, threshold: number): number | null {
    let start: number | null = null;
    for (let i = history.length - 1; i >= 0; i -= 1) {
      const sample = history[i]!;
      if (pick(sample) < threshold) break;
      if (start !== null && start - sample.timestamp > SUSTAIN_MAX_GAP_MS) break;
      start = sample.timestamp;
    }
    return start;
  }

  private calculateBaseline(theaterId: string): { transport: number; fighter: number; recon: number } {
    const history = this.activityHistory.get(theaterId) || [];
    const cutoff = this.now() - BASELINE_WINDOW_HOURS * 60 * 60 * 1000;
    const relevant = history.filter(h => h.timestamp >= cutoff);

    if (relevant.length < BASELINE_MIN_SAMPLES) {
      return { transport: 3, fighter: 2, recon: 1 };
    }

    const avgTransport = relevant.reduce((sum, h) => sum + h.transportCount, 0) / relevant.length;
    const avgFighter = relevant.reduce((sum, h) => sum + h.fighterCount, 0) / relevant.length;
    const avgRecon = relevant.reduce((sum, h) => sum + h.reconCount, 0) / relevant.length;

    return {
      transport: Math.max(2, avgTransport),
      fighter: Math.max(1, avgFighter),
      recon: Math.max(1, avgRecon),
    };
  }

  private cleanupOldHistory(): void {
    const now = this.now();
    if (now - this.lastCleanup < CLEANUP_INTERVAL) return;
    this.lastCleanup = now;

    const cutoff = now - MAX_HISTORY_HOURS * 60 * 60 * 1000;
    for (const [theaterId, history] of this.activityHistory) {
      const filtered = history.filter(h => h.timestamp >= cutoff);
      if (filtered.length === 0) {
        this.activityHistory.delete(theaterId);
      } else {
        this.activityHistory.set(theaterId, filtered);
      }
    }

    for (const [surgeId, surge] of this.activeSurges) {
      const age = now - surge.lastUpdated.getTime();
      if (age > 2 * 60 * 60 * 1000) {
        this.activeSurges.delete(surgeId);
      }
    }
  }

  analyzeFlightsForSurge(flights: TFlight[]): SurgeAlert[] {
    this.cleanupOldHistory();

    const theaterFlights = new Map<string, TFlight[]>();
    for (const flight of flights) {
      const theater = getTheaterForFlight(flight);
      if (!theater) continue;
      const existing = theaterFlights.get(theater.id) || [];
      existing.push(flight);
      theaterFlights.set(theater.id, existing);
    }

    const now = this.now();
    const newAlerts: SurgeAlert[] = [];

    for (const [theaterId, theaterFlightList] of theaterFlights) {
      const theater = THEATERS.find(t => t.id === theaterId);
      if (!theater) continue;

      let transportCount = 0;
      let fighterCount = 0;
      let reconCount = 0;
      const aircraftTypes = new Map<string, number>();
      const nearbyBasesSet = new Set<string>();

      for (const flight of theaterFlightList) {
        const classification = classifyFlight(flight);
        if (classification === 'transport') transportCount++;
        else if (classification === 'fighter') fighterCount++;
        else if (classification === 'recon') reconCount++;

        const typeKey = flight.aircraftModel || flight.aircraftType || 'unknown';
        aircraftTypes.set(typeKey, (aircraftTypes.get(typeKey) || 0) + 1);

        const nearby = findNearbyBases(flight.lat, flight.lon);
        for (const { baseName } of nearby.slice(0, 3)) {
          nearbyBasesSet.add(baseName);
        }
      }

      const activity: TheaterActivity = {
        theaterId,
        timestamp: now,
        transportCount,
        fighterCount,
        reconCount,
        totalMilitary: theaterFlightList.length,
        flightIds: theaterFlightList.map(f => f.id),
      };

      const history = this.activityHistory.get(theaterId) || [];
      history.push(activity);
      if (history.length > this.maxSamples) history.shift();
      this.activityHistory.set(theaterId, history);

      let baseline: { transport: number; fighter: number; recon: number; hours?: number };
      if (this.smartMode) {
        // nvii-surge-smart-v1: nothing real to compare against yet, so no surge for this theater.
        const learned = this.calculateLearnedBaseline(history);
        if (!learned) continue;
        baseline = learned;
      } else {
        baseline = this.calculateBaseline(theaterId);
      }

      // nvii-surge-smart-v1: how long the count has held at surge level (always "long enough" upstream).
      const held = (pick: (h: TheaterActivity) => number, threshold: number): { ok: boolean; hours?: number } => {
        if (!this.smartMode) return { ok: true };
        const start = this.surgeStreakStart(history, pick, threshold);
        if (start === null) return { ok: false };
        const heldMs = now - start;
        return { ok: heldMs >= this.sustainMs, hours: heldMs / (60 * 60 * 1000) };
      };

      if (transportCount >= baseline.transport * SURGE_THRESHOLD && transportCount >= 5) {
        const surgeId = `airlift-${theaterId}`;
        const surgeMultiple = transportCount / baseline.transport;
        const hold = held(h => h.transportCount, Math.max(5, baseline.transport * SURGE_THRESHOLD));

        const existing = this.activeSurges.get(surgeId);
        if (existing) {
          existing.currentCount = transportCount;
          existing.surgeMultiple = surgeMultiple;
          existing.aircraftTypes = aircraftTypes;
          existing.nearbyBases = Array.from(nearbyBasesSet);
          existing.lastUpdated = new Date(now);
          if (hold.hours !== undefined) existing.sustainedHours = hold.hours;
        } else if (hold.ok) {
          const alert: SurgeAlert = {
            id: surgeId,
            theater,
            type: 'airlift',
            currentCount: transportCount,
            baselineCount: Math.round(baseline.transport),
            surgeMultiple,
            aircraftTypes,
            nearbyBases: Array.from(nearbyBasesSet),
            firstDetected: new Date(now),
            lastUpdated: new Date(now),
            ...(baseline.hours !== undefined ? { baselineHours: baseline.hours } : {}),
            ...(hold.hours !== undefined ? { sustainedHours: hold.hours } : {}),
          };
          this.activeSurges.set(surgeId, alert);
          newAlerts.push(alert);
        }
      }

      if (fighterCount >= baseline.fighter * SURGE_THRESHOLD && fighterCount >= 4) {
        const surgeId = `fighter-${theaterId}`;
        const surgeMultiple = fighterCount / baseline.fighter;
        const hold = held(h => h.fighterCount, Math.max(4, baseline.fighter * SURGE_THRESHOLD));

        if (!this.activeSurges.has(surgeId) && hold.ok) {
          const alert: SurgeAlert = {
            id: surgeId,
            theater,
            type: 'fighter',
            currentCount: fighterCount,
            baselineCount: Math.round(baseline.fighter),
            surgeMultiple,
            aircraftTypes,
            nearbyBases: Array.from(nearbyBasesSet),
            firstDetected: new Date(now),
            lastUpdated: new Date(now),
            ...(baseline.hours !== undefined ? { baselineHours: baseline.hours } : {}),
            ...(hold.hours !== undefined ? { sustainedHours: hold.hours } : {}),
          };
          this.activeSurges.set(surgeId, alert);
          newAlerts.push(alert);
        }
      }
    }

    this.saveHistory();
    return newAlerts;
  }

  getActiveSurges(): SurgeAlert[] {
    return Array.from(this.activeSurges.values());
  }

  getTheaterActivity(theaterId: string): TheaterActivity[] {
    return this.activityHistory.get(theaterId) || [];
  }

  detectForeignMilitaryPresence(flights: TFlight[]): ForeignPresenceAlert<TFlight>[] {
    const newAlerts: ForeignPresenceAlert<TFlight>[] = [];

    // Group flights by operator and region
    const presenceMap = new Map<string, { operator: TFlight['operator']; region: GeoRegion; flights: TFlight[] }>();

    for (const flight of flights) {
      const region = getRegionForPosition(flight.lat, flight.lon);
      if (!region) continue;

      // Skip if this is a home region for this operator
      if (isHomeRegion(flight.operator, region.id)) continue;

      const key = `${flight.operator}-${region.id}`;
      const existing = presenceMap.get(key);
      if (existing) {
        existing.flights.push(flight);
      } else {
        presenceMap.set(key, { operator: flight.operator, region, flights: [flight] });
      }
    }

    // Check for concentrations above threshold
    for (const [key, presence] of presenceMap) {
      const threshold = getOperatorThreshold(presence.operator);
      if (presence.flights.length < threshold) continue;

      // Check if we've already alerted on this (within last 2 hours)
      const now = this.now();
      const alertKey = `${key}-${Math.floor(now / (2 * 60 * 60 * 1000))}`;
      if (this.seenForeignAlerts.has(alertKey)) continue;
      this.seenForeignAlerts.add(alertKey);

      const alert: ForeignPresenceAlert<TFlight> = {
        id: key,
        operator: presence.operator,
        operatorCountry: getOperatorCountry(presence.operator),
        region: presence.region,
        aircraftCount: presence.flights.length,
        flights: presence.flights,
        firstDetected: new Date(now),
      };

      this.activeForeignPresence.set(key, alert);
      newAlerts.push(alert);
    }

    return newAlerts;
  }

  getActiveForeignPresence(): ForeignPresenceAlert<TFlight>[] {
    return Array.from(this.activeForeignPresence.values());
  }

  foreignPresenceToSignal(alert: ForeignPresenceAlert<TFlight>): MilitarySurgeSignal {
    return foreignPresenceToSignal(alert, this.newsContext);
  }

  getTheaterPostureSummaries(flights: TFlight[]): TheaterPostureSummary[] {
    return getTheaterPostureSummaries(flights, this.activityHistory);
  }

  recalcPostureWithVessels(postures: TheaterPostureSummary[]): void {
    recalcPostureWithVessels(postures, this.getCii);
  }

  getCriticalPostures(flights: TFlight[]): TheaterPostureSummary[] {
    return getCriticalPostures(flights, this.activityHistory);
  }
}
