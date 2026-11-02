import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type {
  FirmsHotspot,
  DistrictSummary,
  MatchesApiResponse,
} from '@/types';
import { distanceToDelhiKm, bearingToDelhiDeg, haversineDistanceKm } from '@/lib/geo';
import { windAlignment, calculateRiskScore } from '@/lib/risk';
import { getRegionalWind } from '@/lib/weather';
import { findNearestAlternativesPerType } from '@/lib/alternatives';
import { marketRepo } from '@/lib/repo/marketRepo';

interface DistrictRaw {
  lat: number;
  lon: number;
  name: string;
  state: string;
  fire_points?: number;
  fires_2025?: number;
}

let cachedDistricts: Record<string, DistrictRaw> | null = null;

function loadDistricts(): Record<string, DistrictRaw> {
  if (cachedDistricts) return cachedDistricts;
  const filePath = path.join(process.cwd(), 'public', 'data', 'districts.json');
  const raw = fs.readFileSync(filePath, 'utf8');
  cachedDistricts = JSON.parse(raw);
  return cachedDistricts!;
}

// Find closest district key for a given coordinate
function findClosestDistrict(
  lat: number,
  lon: number,
  districts: Record<string, DistrictRaw>,
  preferredState?: string
): { key: string; district: DistrictRaw } {
  let closestKey = '';
  let closestDist = Infinity;
  let closestObj: DistrictRaw | null = null;

  for (const [key, d] of Object.entries(districts)) {
    if (preferredState && d.state !== preferredState) continue;
    const dist = haversineDistanceKm(lat, lon, d.lat, d.lon);
    if (dist < closestDist) {
      closestDist = dist;
      closestKey = key;
      closestObj = d;
    }
  }

  // Fallback without state constraint if no match in preferred state
  if (!closestObj) {
    for (const [key, d] of Object.entries(districts)) {
      const dist = haversineDistanceKm(lat, lon, d.lat, d.lon);
      if (dist < closestDist) {
        closestDist = dist;
        closestKey = key;
        closestObj = d;
      }
    }
  }

  return { key: closestKey, district: closestObj! };
}

export async function GET(req: Request) {
  const startTime = Date.now();
  const url = new URL(req.url);
  const days = url.searchParams.get('days') ?? '3';

  // 1. Fetch wind vector and FIRMS hotspots in parallel
  const [wind, firmsResponse] = await Promise.all([
    getRegionalWind(),
    fetch(`${url.origin}/api/firms?days=${days}&format=full`, {
      cache: 'no-store',
    }).then(async (r) => {
      if (!r.ok) {
        // Fallback to reading disk snapshot directly if internal fetch fails
        const snapshotPath = path.join(process.cwd(), 'public', 'data', 'firms_snapshot.json');
        const raw = fs.readFileSync(snapshotPath, 'utf8');
        return JSON.parse(raw);
      }
      return r.json();
    }).catch((err) => {
      console.warn('Internal FIRMS fetch failed in /api/matches, using disk snapshot:', err);
      const snapshotPath = path.join(process.cwd(), 'public', 'data', 'firms_snapshot.json');
      const raw = fs.readFileSync(snapshotPath, 'utf8');
      return JSON.parse(raw);
    }),
  ]);

  const hotspots: FirmsHotspot[] = firmsResponse.hotspots ?? [];
  const isUsingSnapshot = Boolean(firmsResponse.isUsingSnapshot);
  const snapshotDate = firmsResponse.snapshot_date ?? firmsResponse.date_range?.to ?? '2026-10-30';

  // 2. Load district reference database
  const allDistricts = loadDistricts();

  // 3. Aggregate hotspots by district
  const districtAggregates = new Map<
    string,
    {
      key: string;
      name: string;
      state: string;
      lat: number;
      lon: number;
      fireCount: number;
      totalFrp: number;
    }
  >();

  for (const h of hotspots) {
    let matchedKey: string | null = null;
    let matchedDistrict: DistrictRaw | null = null;

    // Check direct name match
    if (h.district && h.state) {
      const directKey = `${h.state}_${h.district.replace(/\s+/g, '_').toUpperCase()}`;
      if (allDistricts[directKey]) {
        matchedKey = directKey;
        matchedDistrict = allDistricts[directKey];
      }
    }

    // Spatial nearest centroid match
    if (!matchedKey) {
      const match = findClosestDistrict(h.latitude, h.longitude, allDistricts, h.state);
      matchedKey = match.key;
      matchedDistrict = match.district;
      h.district = matchedDistrict.name;
      h.state = matchedDistrict.state;
    }

    if (!matchedKey || !matchedDistrict) continue;

    const existing = districtAggregates.get(matchedKey);
    if (existing) {
      existing.fireCount += 1;
      existing.totalFrp += h.frp;
    } else {
      districtAggregates.set(matchedKey, {
        key: matchedKey,
        name: matchedDistrict.name,
        state: matchedDistrict.state,
        lat: matchedDistrict.lat,
        lon: matchedDistrict.lon,
        fireCount: 1,
        totalFrp: h.frp,
      });
    }
  }

  // 4. Compute risk scores and match clean alternatives for each active district
  const districtSummaries: DistrictSummary[] = [];

  for (const agg of districtAggregates.values()) {
    const distToDelhi = distanceToDelhiKm(agg.lat, agg.lon);
    const bearingToDelhi = bearingToDelhiDeg(agg.lat, agg.lon);

    // Aerodynamic wind alignment towards Delhi
    const alignment = wind.isFallback
      ? 0.5 // Neutral alignment on fallback
      : windAlignment(wind.directionDeg, bearingToDelhi);

    const risk = calculateRiskScore({
      fireCount: agg.fireCount,
      distanceToDelhiKm: distToDelhi,
      windAlignment: alignment,
      totalFrp: agg.totalFrp,
    });

    const nearestAlternatives = findNearestAlternativesPerType(agg.lat, agg.lon);

    const openListings = await marketRepo.listListings({ district: agg.name });
    const unsoldListings = openListings.filter((l) => l.status === 'listed');
    const demandSignals = {
      count: unsoldListings.length,
      totalQuintals: unsoldListings.reduce((sum, l) => sum + l.quantityQuintals, 0),
    };

    districtSummaries.push({
      demandSignals,
      districtKey: agg.key,
      name: agg.name,
      state: agg.state,
      lat: agg.lat,
      lon: agg.lon,
      fireCount: agg.fireCount,
      totalFrp: Number(agg.totalFrp.toFixed(1)),
      avgFrp: Number((agg.totalFrp / agg.fireCount).toFixed(1)),
      distanceToDelhiKm: distToDelhi,
      bearingToDelhiDeg: bearingToDelhi,
      windAlignment: alignment,
      riskScore: risk.score,
      riskLevel: risk.level,
      matchedAlternatives: nearestAlternatives,
    });
  }

  // 5. Sort by risk score descending (highest threat to Delhi air quality first)
  districtSummaries.sort((a, b) => b.riskScore - a.riskScore);

  const highRiskCount = districtSummaries.filter(
    (d) => d.riskLevel === 'high' || d.riskLevel === 'critical'
  ).length;

  const durationMs = Date.now() - startTime;

  const response: MatchesApiResponse & { latencyMs: number } = {
    hotspots,
    totalHotspots: hotspots.length,
    highRiskDistricts: highRiskCount,
    districts: districtSummaries,
    wind,
    fetchedAt: new Date().toISOString(),
    isUsingSnapshot,
    snapshotDate,
    latencyMs: durationMs,
  };

  return NextResponse.json(response);
}
