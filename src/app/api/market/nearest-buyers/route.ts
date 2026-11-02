import { NextResponse } from 'next/server';
import { loadAlternatives } from '@/lib/alternatives';
import { haversineDistanceKm } from '@/lib/geo';
import fs from 'fs';
import path from 'path';

interface DistrictRaw {
  lat: number;
  lon: number;
  name: string;
  state: string;
}

let cachedDistricts: Record<string, DistrictRaw> | null = null;

function getDistrictCoords(districtName: string): { lat: number; lon: number } | null {
  if (!cachedDistricts) {
    const filePath = path.join(process.cwd(), 'public', 'data', 'districts.json');
    if (fs.existsSync(filePath)) {
      cachedDistricts = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  }

  if (!cachedDistricts) return null;

  const key = districtName.toLowerCase().trim();
  for (const [k, v] of Object.entries(cachedDistricts)) {
    if (k.toLowerCase() === key || v.name.toLowerCase() === key) {
      return { lat: v.lat, lon: v.lon };
    }
  }
  return null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const district = searchParams.get('district');
    if (!district) {
      return NextResponse.json({ error: 'District is required' }, { status: 400 });
    }

    const coords = getDistrictCoords(district) || { lat: 30.24, lon: 75.84 }; // Default Punjab centroid (Sangrur)
    const alternatives = loadAlternatives();

    // Calculate approximate distance to each alternative
    const withDistance = alternatives.map((alt) => {
      const approxDistanceKm = Math.round(haversineDistanceKm(coords.lat, coords.lon, alt.lat, alt.lon));
      const statusLower = (alt.status || '').toLowerCase();
      const isLowConfidence =
        statusLower.includes('verify') ||
        statusLower.includes('disputed') ||
        statusLower.includes('unknown') ||
        statusLower.includes('stale') ||
        statusLower.includes('planned');

      const isOperational =
        statusLower.includes('operational') ||
        statusLower.includes('commissioned') ||
        statusLower.includes('receiving_straw');

      return {
        ...alt,
        approxDistanceKm,
        isOperational,
        isLowConfidence,
      };
    });

    // Sort closest first
    withDistance.sort((a, b) => a.approxDistanceKm - b.approxDistanceKm);

    // Operational first, then low-confidence
    const topMatches = withDistance.slice(0, 5);

    return NextResponse.json({
      success: true,
      district,
      approxCoords: coords,
      buyers: topMatches,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to match nearest buyers';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
