/**
 * KrishiVayu Clean Residue Alternatives Service
 * Validates, loads, and matches farmers and fire hotspots to clean alternatives:
 * 1. Residue Buyer (Direct farmgate procurement)
 * 2. Biomass Plant (Pelletization & bio-power)
 * 3. CBG Plant (Compressed Bio-Gas / SATAT scheme)
 * 4. Machinery Rental (Custom Hiring Centres - Happy/Super Seeders)
 */

import fs from 'fs';
import path from 'path';
import type { Alternative, AlternativeType, MatchedAlternative } from '@/types';
import { haversineDistanceKm } from './geo';

const VALID_TYPES: ReadonlySet<AlternativeType> = new Set([
  'residue_buyer',
  'biomass_plant',
  'cbg_plant',
  'machinery_rental',
]);

// India Geodetic Bounding Box validation
const INDIA_GEO_BOUNDS = {
  latMin: 8.0,
  latMax: 37.5,
  lonMin: 68.0,
  lonMax: 97.5,
};

let cachedAlternatives: Alternative[] | null = null;

export function validateAlternative(item: unknown, index = 0): Alternative {
  if (!item || typeof item !== 'object') {
    throw new Error(`Record at index ${index} must be an object`);
  }

  const record = item as Record<string, unknown>;

  if (typeof record.id !== 'string' || !record.id.trim()) {
    throw new Error(`Record at index ${index} missing valid 'id'`);
  }

  if (typeof record.type !== 'string' || !VALID_TYPES.has(record.type as AlternativeType)) {
    throw new Error(`Record at index ${index} (${record.id}) has invalid type: '${record.type}'`);
  }

  if (typeof record.name !== 'string' || !record.name.trim()) {
    throw new Error(`Record at index ${index} (${record.id}) missing valid 'name'`);
  }

  if (typeof record.lat !== 'number' || isNaN(record.lat) || record.lat < INDIA_GEO_BOUNDS.latMin || record.lat > INDIA_GEO_BOUNDS.latMax) {
    throw new Error(`Record at index ${index} (${record.id}) latitude ${record.lat} is outside India geodetic bounds`);
  }

  if (typeof record.lon !== 'number' || isNaN(record.lon) || record.lon < INDIA_GEO_BOUNDS.lonMin || record.lon > INDIA_GEO_BOUNDS.lonMax) {
    throw new Error(`Record at index ${index} (${record.id}) longitude ${record.lon} is outside India geodetic bounds`);
  }

  if (typeof record.district !== 'string' || !record.district.trim()) {
    throw new Error(`Record at index ${index} (${record.id}) missing 'district'`);
  }

  if (typeof record.state !== 'string' || !record.state.trim()) {
    throw new Error(`Record at index ${index} (${record.id}) missing 'state'`);
  }

  if (typeof record.isDemo !== 'boolean') {
    throw new Error(`Record at index ${index} (${record.id}) 'isDemo' must be a boolean`);
  }

  return {
    id: record.id.trim(),
    type: record.type as AlternativeType,
    name: record.name.trim(),
    lat: Number(record.lat.toFixed(4)),
    lon: Number(record.lon.toFixed(4)),
    district: record.district.trim(),
    state: record.state.trim(),
    capacityOrFleet: typeof record.capacityOrFleet === 'string' ? record.capacityOrFleet.trim() : undefined,
    contact: typeof record.contact === 'string' ? record.contact.trim() : undefined,
    priceQuote: typeof record.priceQuote === 'string' ? record.priceQuote.trim() : undefined,
    source: typeof record.source === 'string' ? record.source.trim() : 'KrishiVayu Catalog',
    isDemo: record.isDemo,
    status: typeof record.status === 'string' ? record.status.trim() : undefined,
    sourceUrl: typeof record.sourceUrl === 'string' ? record.sourceUrl.trim() : undefined,
    notes: typeof record.notes === 'string' ? record.notes.trim() : undefined,
  };
}

/**
 * Loads and validates the alternatives catalog from disk.
 */
export function loadAlternatives(): Alternative[] {
  if (cachedAlternatives) return cachedAlternatives;

  const filePath = path.join(process.cwd(), 'public', 'data', 'alternatives.json');
  if (!fs.existsSync(filePath)) {
    throw new Error(`Alternatives catalog not found at ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error('Alternatives dataset must be a JSON array');
  }

  const validated = parsed.map((item, idx) => validateAlternative(item, idx));
  cachedAlternatives = validated;
  return validated;
}

/**
 * Finds the nearest alternatives for a given hotspot or district coordinate.
 * Returns up to one best match per alternative type, sorted by distance.
 */
export function findNearestAlternativesPerType(
  targetLat: number,
  targetLon: number,
  alternatives: Alternative[] = loadAlternatives()
): MatchedAlternative[] {
  const matchesByType = new Map<AlternativeType, MatchedAlternative>();

  for (const alt of alternatives) {
    const distanceKm = haversineDistanceKm(targetLat, targetLon, alt.lat, alt.lon);
    const existing = matchesByType.get(alt.type);

    if (!existing || distanceKm < existing.distanceKm) {
      matchesByType.set(alt.type, {
        ...alt,
        distanceKm,
      });
    }
  }

  // Return list sorted ascending by distance
  return Array.from(matchesByType.values()).sort((a, b) => a.distanceKm - b.distanceKm);
}
