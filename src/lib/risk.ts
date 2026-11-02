/**
 * KrishiVayu Air-Quality Risk Heuristic
 * Transparent, documented heuristic ranking the impact of crop-fire clusters on Delhi NCR.
 *
 * NOTE: This is an analytical heuristic for decision-support and prioritization,
 * not a certified regulatory atmospheric dispersion simulation.
 */

import type { RiskLevel } from '@/types';

/**
 * Calculates the aerodynamic alignment of smoke plume transport towards Delhi.
 *
 * Meteorological convention:
 * - `windFromDeg`: Direction the wind is blowing FROM (0° = North, 90° = East, 180° = South, 270° = West).
 * - Smoke plume travel direction: `windTowardsDeg = (windFromDeg + 180) % 360`.
 *
 * @param windFromDeg Direction the wind originates from [0..360)
 * @param bearingToDelhiDeg Forward azimuth from fire hotspot to Delhi [0..360)
 * @returns Normalized alignment factor between 0.0 (direct opposite) and 1.0 (exact direct trajectory).
 */
export function windAlignment(windFromDeg: number, bearingToDelhiDeg: number): number {
  // Normalize angles into [0, 360)
  const normWindFrom = ((windFromDeg % 360) + 360) % 360;
  const normBearing = ((bearingToDelhiDeg % 360) + 360) % 360;

  // The plume is blown towards:
  const plumeDirectionDeg = (normWindFrom + 180) % 360;

  // Smallest absolute angle difference between plume direction and target bearing
  const diffDeg = Math.abs(((plumeDirectionDeg - normBearing + 540) % 360) - 180);

  // Smooth cosine transfer function:
  // 0° diff (plume heading straight to Delhi) -> 1.0
  // 90° diff (perpendicular crosswind) -> 0.5
  // 180° diff (plume heading directly away from Delhi) -> 0.0
  const alignment = (Math.cos((diffDeg * Math.PI) / 180) + 1) / 2;

  return Math.round(alignment * 1000) / 1000;
}

export interface RiskInput {
  fireCount: number;
  distanceToDelhiKm: number;
  windAlignment: number; // 0..1
  totalFrp?: number;
}

export interface RiskOutput {
  score: number; // 0..100
  level: RiskLevel;
  breakdown: {
    fireVolumeComponent: number; // 0..40
    proximityComponent: number; // 0..30
    windTrajectoryComponent: number; // 0..30
  };
  explanation: string;
}

/**
 * Transparent Heuristic Risk Model:
 *
 * Total Score = Fire Volume (40%) + Proximity to Delhi (30%) + Wind Alignment (30%)
 *
 * 1. Fire Volume (40% weight):
 *    Scales linearly up to 50 active fires detected in the cluster / district.
 *    score_fires = min(fireCount / 50, 1.0) * 40
 *
 * 2. Proximity to Delhi (30% weight):
 *    Northern Indian stubble clusters occur between 50 km (NCR borders) and 450 km (NW Punjab).
 *    Nearby plumes arrive with less atmospheric dispersion.
 *    score_proximity = max(0, (450 - min(distanceKm, 450)) / 400) * 30
 *
 * 3. Wind Trajectory Alignment (30% weight):
 *    Calculated using cosine aerodynamic alignment of prevailing wind towards Delhi.
 *    score_wind = windAlignment * 30
 *
 * Score ranges:
 * - 0 to 25: Low Risk
 * - 26 to 50: Moderate Risk
 * - 51 to 75: High Risk
 * - 76 to 100: Critical Risk
 */
export function calculateRiskScore(input: RiskInput): RiskOutput {
  const { fireCount, distanceToDelhiKm, windAlignment: alignment } = input;

  // 1. Fire Volume Component (Max 40 points)
  const cappedFires = Math.max(0, fireCount);
  const fireVolumeComponent = Math.min(cappedFires / 50, 1.0) * 40;

  // 2. Proximity Component (Max 30 points, calibrated for 50km - 450km range)
  const clampedDistance = Math.max(0, distanceToDelhiKm);
  const proximityNormalized = Math.max(0, Math.min(1.0, (450 - clampedDistance) / 400));
  const proximityComponent = proximityNormalized * 30;

  // 3. Wind Trajectory Component (Max 30 points)
  const clampedAlignment = Math.max(0, Math.min(1.0, alignment));
  const windTrajectoryComponent = clampedAlignment * 30;

  const rawTotal = fireVolumeComponent + proximityComponent + windTrajectoryComponent;
  const score = Math.round(Math.min(100, Math.max(0, rawTotal)));

  let level: RiskLevel = 'low';
  if (score >= 76) level = 'critical';
  else if (score >= 51) level = 'high';
  else if (score >= 26) level = 'moderate';

  const explanation = `Fire volume: ${fireVolumeComponent.toFixed(1)}/40, Proximity: ${proximityComponent.toFixed(1)}/30 (${distanceToDelhiKm.toFixed(0)} km), Wind trajectory: ${windTrajectoryComponent.toFixed(1)}/30.`;

  return {
    score,
    level,
    breakdown: {
      fireVolumeComponent: Math.round(fireVolumeComponent * 10) / 10,
      proximityComponent: Math.round(proximityComponent * 10) / 10,
      windTrajectoryComponent: Math.round(windTrajectoryComponent * 10) / 10,
    },
    explanation,
  };
}
