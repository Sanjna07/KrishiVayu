/**
 * KrishiVayu Geodesic Utilities
 * Pure mathematical functions for spherical distance and bearing calculations.
 */

/**
 * Reference coordinate for National Capital Territory of Delhi (India Gate / Central Delhi).
 * Source: Survey of India / OpenStreetMap Reference Node (28.6129° N, 77.2295° E).
 */
export const DELHI_COORDS = {
  lat: 28.6129,
  lon: 77.2295,
  name: 'Delhi NCT (Central Reference)',
} as const;

const EARTH_RADIUS_KM = 6371.0;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Great-circle distance between two geographic coordinates using the Haversine formula.
 * @returns Distance in kilometers, rounded to 1 decimal place.
 */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const deltaPhi = toRadians(lat2 - lat1);
  const deltaLambda = toRadians(lon2 - lon1);

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_KM * c;

  return Math.round(distance * 10) / 10;
}

/**
 * Initial forward bearing (azimuth) from origin (lat1, lon1) to destination (lat2, lon2).
 * @returns Azimuth in degrees from True North [0, 360).
 */
export function initialBearingDeg(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const deltaLambda = toRadians(lon2 - lon1);

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  const initialBearingRad = Math.atan2(y, x);
  const initialBearingDeg = (toDegrees(initialBearingRad) + 360) % 360;

  return Math.round(initialBearingDeg * 10) / 10;
}

/**
 * Distance in kilometers from any coordinate to the Central Delhi reference point.
 */
export function distanceToDelhiKm(lat: number, lon: number): number {
  return haversineDistanceKm(lat, lon, DELHI_COORDS.lat, DELHI_COORDS.lon);
}

/**
 * Azimuth in degrees from any coordinate heading towards Central Delhi.
 */
export function bearingToDelhiDeg(lat: number, lon: number): number {
  return initialBearingDeg(lat, lon, DELHI_COORDS.lat, DELHI_COORDS.lon);
}
