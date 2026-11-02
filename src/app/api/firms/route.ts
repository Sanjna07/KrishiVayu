import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { FirmsHotspot } from '@/types';

// Approximate bounding boxes [W, S, E, N] for each tracked state
const STATE_BOUNDS: Record<string, [number, number, number, number]> = {
  PUNJAB:         [73.8, 29.5, 76.9, 32.5],
  HARYANA:        [74.5, 27.4, 77.6, 30.9],
  DELHI:          [76.8, 28.4, 77.4, 28.9],
  UTTAR_PRADESH:  [77.1, 23.9, 84.6, 30.4],
  RAJASTHAN:      [69.5, 23.1, 78.3, 30.2],
  MADHYA_PRADESH: [74.0, 21.1, 82.8, 26.9],
};

// Focused bounding box covering Punjab, Haryana, and Delhi NCR
// [W, S, E, N]: 73.5, 27.2, 77.8, 32.6
const REGIONAL_BBOX = '73.5,27.2,77.8,32.6';

const MAX_DAYS = 5;

// In-memory cache
let cachedData: {
  timestamp: number;
  days: number;
  hotspots: FirmsHotspot[];
  counts: Record<string, number>;
  frpSum: Record<string, number>;
  dateRange: { from: string; to: string } | null;
  source: string;
  isUsingSnapshot: boolean;
} | null = null;

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

function parseFirmsCSV(csv: string, satelliteName: string): FirmsHotspot[] {
  const lines = csv.split('\n');
  if (lines.length < 2) return [];

  const header = lines[0].split(',').map(h => h.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name);

  const iLat = idx('latitude');
  const iLon = idx('longitude');
  const iBright = idx('bright_ti4');
  const iConf = idx('confidence');
  const iDate = idx('acq_date');
  const iTime = idx('acq_time');
  const iFrp = idx('frp');
  const iDayNight = idx('daynight');

  const hotspots: FirmsHotspot[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const cols = line.split(',');
    if (cols.length < Math.max(iLat, iLon, iConf, iDate) + 1) continue;

    const conf = cols[iConf]?.trim().toLowerCase();
    // Confidence filter: VIIRS 'n' (nominal) and 'h' (high); discard 'l' (low)
    if (conf === 'l' || conf === 'low') continue;

    const lat = parseFloat(cols[iLat]);
    const lon = parseFloat(cols[iLon]);
    if (isNaN(lat) || isNaN(lon)) continue;

    let matchedState: string | undefined;
    for (const [state, [w, s, e, n]] of Object.entries(STATE_BOUNDS)) {
      if (lat >= s && lat <= n && lon >= w && lon <= e) {
        matchedState = state;
        break;
      }
    }

    const brightness = iBright >= 0 ? parseFloat(cols[iBright]) || 0 : 0;
    const frp = iFrp >= 0 ? parseFloat(cols[iFrp]) || 0 : 0;
    const acqDate = iDate >= 0 ? cols[iDate].trim() : '';
    const acqTime = iTime >= 0 ? cols[iTime].trim() : '';
    const daynight = (iDayNight >= 0 ? cols[iDayNight].trim().toUpperCase() : 'D') as 'D' | 'N';

    hotspots.push({
      id: `firms-${satelliteName.toLowerCase()}-${i}`,
      latitude: Number(lat.toFixed(4)),
      longitude: Number(lon.toFixed(4)),
      brightness,
      confidence: conf === 'h' || conf === 'high' ? 'high' : 'nominal',
      acq_date: acqDate,
      acq_time: acqTime,
      satellite: satelliteName,
      frp,
      daynight,
      state: matchedState,
    });
  }

  return hotspots;
}

function loadFallbackSnapshot(): {
  hotspots: FirmsHotspot[];
  source: string;
  snapshotDate: string;
} {
  try {
    const snapshotPath = path.join(process.cwd(), 'public', 'data', 'firms_snapshot.json');
    if (fs.existsSync(snapshotPath)) {
      const raw = fs.readFileSync(snapshotPath, 'utf8');
      const parsed = JSON.parse(raw);
      return {
        hotspots: parsed.hotspots || [],
        source: parsed.source || 'NASA FIRMS Snapshot',
        snapshotDate: parsed.snapshot_date || '2026-10-30',
      };
    }
  } catch (err) {
    console.error('Error loading firms snapshot:', err);
  }
  return {
    hotspots: [],
    source: 'Empty fallback',
    snapshotDate: '2026-10-30',
  };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const rawDays = parseInt(url.searchParams.get('days') ?? '3', 10);
  const days = Math.min(Math.max(rawDays, 1), MAX_DAYS);
  const format = url.searchParams.get('format') ?? 'summary'; // 'summary' (legacy) | 'full'
  const key = process.env.FIRMS_MAP_KEY;

  const now = Date.now();
  if (cachedData && (now - cachedData.timestamp < CACHE_TTL_MS) && cachedData.days === days) {
    if (format === 'full') {
      return NextResponse.json({
        hotspots: cachedData.hotspots,
        counts: cachedData.counts,
        frp_sum: cachedData.frpSum,
        total: cachedData.hotspots.length,
        days,
        date_range: cachedData.dateRange,
        fetched_at: new Date(cachedData.timestamp).toISOString(),
        source: cachedData.source,
        isUsingSnapshot: cachedData.isUsingSnapshot,
      });
    }

    return NextResponse.json({
      counts: cachedData.counts,
      frp_sum: cachedData.frpSum,
      total: Object.values(cachedData.counts).reduce((a, b) => a + b, 0),
      days,
      date_range: cachedData.dateRange,
      fetched_at: new Date(cachedData.timestamp).toISOString(),
      source: cachedData.source,
      isUsingSnapshot: cachedData.isUsingSnapshot,
    });
  }

  let hotspots: FirmsHotspot[] = [];
  let isUsingSnapshot = false;
  let sourceString = 'NASA FIRMS · VIIRS SNPP + NOAA-20 · 375m';

  // Check if key is available and not default placeholder
  const isKeyAvailable = key && key.trim() !== '' && !key.includes('your_firms_map_key_here');

  if (isKeyAvailable) {
    try {
      const fetchCSV = async (source: string, bbox: string) => {
        const fetchUrl = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${key}/${source}/${bbox}/${days}`;
        const res = await fetch(fetchUrl, { signal: AbortSignal.timeout(20_000) });
        if (!res.ok) {
          throw new Error(`FIRMS ${source} HTTP ${res.status}`);
        }
        return res.text();
      };

      const [snppCsv, noaa20Csv] = await Promise.all([
        fetchCSV('VIIRS_SNPP_NRT', REGIONAL_BBOX),
        fetchCSV('VIIRS_NOAA20_NRT', REGIONAL_BBOX),
      ]);

      const snppHotspots = parseFirmsCSV(snppCsv, 'SNPP');
      const noaa20Hotspots = parseFirmsCSV(noaa20Csv, 'NOAA20');
      hotspots = [...snppHotspots, ...noaa20Hotspots];
    } catch (err) {
      console.warn('Live FIRMS fetch failed, falling back to snapshot:', err);
      const snapshot = loadFallbackSnapshot();
      hotspots = snapshot.hotspots;
      isUsingSnapshot = true;
      sourceString = `${snapshot.source} (Snapshot ${snapshot.snapshotDate})`;
    }
  } else {
    const snapshot = loadFallbackSnapshot();
    hotspots = snapshot.hotspots;
    isUsingSnapshot = true;
    sourceString = `${snapshot.source} (Snapshot ${snapshot.snapshotDate})`;
  }

  // Aggregate counts and FRP
  const counts: Record<string, number> = {};
  const frpSum: Record<string, number> = {};
  const dates = new Set<string>();

  for (const h of hotspots) {
    if (h.state) {
      counts[h.state] = (counts[h.state] ?? 0) + 1;
      frpSum[h.state] = (frpSum[h.state] ?? 0) + h.frp;
    }
    if (h.acq_date) {
      dates.add(h.acq_date);
    }
  }

  const sortedDates = [...dates].sort();
  const dateRange = sortedDates.length > 0 ? { from: sortedDates[0], to: sortedDates.at(-1)! } : null;

  cachedData = {
    timestamp: now,
    days,
    hotspots,
    counts,
    frpSum,
    dateRange,
    source: sourceString,
    isUsingSnapshot,
  };

  if (format === 'full') {
    return NextResponse.json({
      hotspots,
      counts,
      frp_sum: frpSum,
      total: hotspots.length,
      days,
      date_range: dateRange,
      fetched_at: new Date(now).toISOString(),
      source: sourceString,
      isUsingSnapshot,
    });
  }

  return NextResponse.json({
    counts,
    frp_sum: frpSum,
    total: Object.values(counts).reduce((a, b) => a + b, 0),
    days,
    date_range: dateRange,
    fetched_at: new Date(now).toISOString(),
    source: sourceString,
    isUsingSnapshot,
  });
}
