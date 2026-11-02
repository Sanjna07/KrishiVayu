import { NextResponse } from 'next/server';
import { getRegionalWind } from '@/lib/weather';

/**
 * KrishiVayu Weather Gateway Endpoint
 * GET /api/weather?lat=...&lon=...
 *
 * Provides server-side proxied, cached, and aerodynamically aligned
 * 10m wind vectors relative to the Delhi NCR plume corridor.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const latParam = url.searchParams.get('lat');
  const lonParam = url.searchParams.get('lon');
  const bypassCache = url.searchParams.get('fresh') === 'true';

  const lat = latParam ? parseFloat(latParam) : undefined;
  const lon = lonParam ? parseFloat(lonParam) : undefined;

  const windData = await getRegionalWind({
    lat,
    lon,
    bypassCache,
  });

  return NextResponse.json({
    ...windData,
    corridor: 'Punjab/Haryana -> Delhi NCR Basin',
    units: {
      speed: 'km/h',
      direction: 'degrees (originating FROM)',
      alignment: '0.0 (directly away) to 1.0 (directly towards Delhi)',
    },
    gateway: 'KrishiVayu Open-Meteo Weather Gateway',
  });
}
