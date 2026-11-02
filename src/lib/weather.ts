/**
 * KrishiVayu Weather & Wind Service
 * Wraps keyless Open-Meteo API with in-memory caching and resilient offline fallback.
 */

import type { WindData } from '@/types';
import { windAlignment } from './risk';

// Central reference point between Punjab/Haryana agricultural belt and Delhi
const REGIONAL_REF = {
  lat: 29.5, // Central Haryana / Southern Punjab corridor
  lon: 76.5,
  bearingToDelhi: 145, // South-East towards Delhi NCR
};

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour cache

let cachedWind: {
  data: WindData;
  cachedAt: number;
} | null = null;

const CARDINALS = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
];

export function degreesToCardinal(deg: number): string {
  const normalized = ((deg % 360) + 360) % 360;
  const index = Math.round(normalized / 22.5) % 16;
  return CARDINALS[index];
}

export function getFallbackWind(reason = 'Weather service unavailable'): WindData {
  return {
    speedKmh: 0,
    directionDeg: 0,
    directionCardinal: 'N/A',
    isTowardsDelhi: false,
    alignmentScore: 0.5, // Neutral alignment per specification
    timestamp: new Date().toISOString(),
    source: `Fallback (${reason})`,
    isFallback: true,
  };
}

export interface WindFetchOptions {
  lat?: number;
  lon?: number;
  forceError?: boolean;
  bypassCache?: boolean;
}

/**
 * Fetches prevailing regional wind vector from Open-Meteo API.
 * Uses 1-hour in-memory cache and returns a neutral fallback on network failure.
 */
export async function getRegionalWind(options: WindFetchOptions = {}): Promise<WindData> {
  const {
    lat = REGIONAL_REF.lat,
    lon = REGIONAL_REF.lon,
    forceError = false,
    bypassCache = false,
  } = options;

  const now = Date.now();
  if (!bypassCache && !forceError && cachedWind && now - cachedWind.cachedAt < CACHE_TTL_MS) {
    return cachedWind.data;
  }

  if (forceError) {
    return getFallbackWind('Forced error test');
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=wind_speed_10m,wind_direction_10m`;
    const res = await fetch(url, { signal: AbortSignal.timeout(12000) });

    if (!res.ok) {
      console.warn(`Open-Meteo returned HTTP ${res.status}`);
      return getFallbackWind(`HTTP ${res.status}`);
    }

    const json = await res.json();
    const current = json.current;

    if (!current || typeof current.wind_speed_10m !== 'number' || typeof current.wind_direction_10m !== 'number') {
      return getFallbackWind('Malformed weather payload');
    }

    const speedKmh = Number(current.wind_speed_10m.toFixed(1));
    const directionDeg = Math.round(current.wind_direction_10m);
    const directionCardinal = degreesToCardinal(directionDeg);

    // Calculate aerodynamic plume alignment towards Delhi
    const alignment = windAlignment(directionDeg, REGIONAL_REF.bearingToDelhi);
    const isTowardsDelhi = alignment >= 0.7;

    const data: WindData = {
      speedKmh,
      directionDeg,
      directionCardinal,
      isTowardsDelhi,
      alignmentScore: alignment,
      timestamp: current.time ? `${current.time}Z` : new Date().toISOString(),
      source: 'Open-Meteo 10m Wind Model',
      isFallback: false,
    };

    cachedWind = {
      data,
      cachedAt: now,
    };

    return data;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('Open-Meteo fetch error, activating neutral fallback:', message);
    return getFallbackWind(message);
  }
}
