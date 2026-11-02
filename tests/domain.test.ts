/**
 * Unit Tests for KrishiVayu Domain Logic
 * Validates Geodesic distance/bearing, Wind Alignment, and Air-Quality Risk Heuristic.
 */

import assert from 'node:assert/strict';
import {
  haversineDistanceKm,
  initialBearingDeg,
  distanceToDelhiKm,
  bearingToDelhiDeg,
  DELHI_COORDS,
} from '../src/lib/geo';
import { windAlignment, calculateRiskScore } from '../src/lib/risk';

console.log('--- RUNNING KRISHIVAYU DOMAIN LOGIC TESTS ---');

// 1. Geodesic: Distance and Bearing Sanity Checks
{
  // Same point distance should be 0
  const zeroDist = haversineDistanceKm(DELHI_COORDS.lat, DELHI_COORDS.lon, DELHI_COORDS.lat, DELHI_COORDS.lon);
  assert.equal(zeroDist, 0, 'Distance to same coordinate must be 0');

  // Cardinal bearings from Equator
  assert.equal(initialBearingDeg(0, 0, 1, 0), 0, 'Bearing due North must be 0 deg');
  assert.equal(initialBearingDeg(0, 0, 0, 1), 90, 'Bearing due East must be 90 deg');
  assert.equal(initialBearingDeg(1, 0, 0, 0), 180, 'Bearing due South must be 180 deg');
  assert.equal(initialBearingDeg(0, 1, 0, 0), 270, 'Bearing due West must be 270 deg');

  // Real city pairs against established geodesic benchmarks
  // Delhi to Chandigarh (~238 km, bearing ~348°)
  const distChandigarh = haversineDistanceKm(28.6129, 77.2295, 30.7333, 76.7794);
  const bearChandigarh = initialBearingDeg(28.6129, 77.2295, 30.7333, 76.7794);
  assert.ok(distChandigarh >= 235 && distChandigarh <= 242, `Delhi to Chandigarh distance ${distChandigarh} km within 235-242`);
  assert.ok(bearChandigarh >= 346 && bearChandigarh <= 350, `Delhi to Chandigarh bearing ${bearChandigarh}° within 346-350`);

  // Amritsar (31.6340, 74.8723) to Delhi (28.6129, 77.2295)
  const distAmritsar = distanceToDelhiKm(31.6340, 74.8723);
  const bearAmritsar = bearingToDelhiDeg(31.6340, 74.8723);
  assert.ok(distAmritsar >= 400 && distAmritsar <= 415, `Amritsar to Delhi distance ${distAmritsar} km within 400-415`);
  assert.ok(bearAmritsar >= 140 && bearAmritsar <= 150, `Amritsar to Delhi heading ${bearAmritsar}° heading South-East`);

  console.log('✓ Geodesic distance and bearing benchmarks passed.');
}

// 2. Wind Alignment Tests
{
  // Assume a farm in Sangrur/Bathinda where bearing to Delhi is 135° (South-East)
  const bearingToDelhi = 135;

  // Test Case A: Prevailing North-West wind (wind originates FROM 315°)
  // The wind blows towards 315 + 180 = 495 % 360 = 135° (South-East, directly to Delhi)
  const directTowards = windAlignment(315, bearingToDelhi);
  assert.equal(directTowards, 1.0, 'Wind blowing directly towards Delhi must yield alignment 1.0');

  // Test Case B: Wind originates FROM 135° (South-East wind blowing towards North-West)
  // The plume travels towards 315° (away from Delhi)
  const directAway = windAlignment(135, bearingToDelhi);
  assert.equal(directAway, 0.0, 'Wind blowing directly away from Delhi must yield alignment 0.0');

  // Test Case C: Perpendicular crosswind FROM 45° (North-East) or 225° (South-West)
  // The angular difference between plume travel and Delhi is 90°
  const crosswind1 = windAlignment(45, bearingToDelhi);
  const crosswind2 = windAlignment(225, bearingToDelhi);
  assert.equal(crosswind1, 0.5, 'Perpendicular crosswind must yield alignment 0.5');
  assert.equal(crosswind2, 0.5, 'Opposite perpendicular crosswind must yield alignment 0.5');

  // Test Case D: 45° angular offset (wind from 270° West)
  // Plume blows towards 90° East. Angle difference to 135° is 45°. Cosine curve should be ~0.854.
  const angle45 = windAlignment(270, bearingToDelhi);
  assert.ok(angle45 > 0.84 && angle45 < 0.86, `45 deg deflection alignment ${angle45} ~ 0.854`);

  console.log('✓ Wind alignment mathematical models passed (Direct=1.0, Away=0.0, Crosswind=0.5).');
}

// 3. Air-Quality Risk Heuristic Tests
{
  // Case A: Minimum boundary (0 fires, 450 km away, wind blowing away)
  const minRisk = calculateRiskScore({
    fireCount: 0,
    distanceToDelhiKm: 450,
    windAlignment: 0.0,
  });
  assert.equal(minRisk.score, 0, 'Minimum boundary conditions must result in 0 risk score');
  assert.equal(minRisk.level, 'low', 'Risk level must be low');
  assert.equal(minRisk.breakdown.fireVolumeComponent, 0);
  assert.equal(minRisk.breakdown.proximityComponent, 0);
  assert.equal(minRisk.breakdown.windTrajectoryComponent, 0);

  // Case B: Maximum boundary (50+ fires, 50 km away, wind blowing directly toward Delhi)
  const maxRisk = calculateRiskScore({
    fireCount: 65, // above cap of 50
    distanceToDelhiKm: 50,
    windAlignment: 1.0,
  });
  assert.equal(maxRisk.score, 100, 'Maximum boundary conditions must result in 100 risk score');
  assert.equal(maxRisk.level, 'critical', 'Risk level must be critical');
  assert.equal(maxRisk.breakdown.fireVolumeComponent, 40);
  assert.equal(maxRisk.breakdown.proximityComponent, 30);
  assert.equal(maxRisk.breakdown.windTrajectoryComponent, 30);

  // Case C: High Risk District (35 fires, 150 km away, wind alignment 0.85)
  // fireVolume = (35/50)*40 = 28
  // proximity = ((450 - 150)/400)*30 = (300/400)*30 = 22.5
  // wind = 0.85 * 30 = 25.5
  // total = 28 + 22.5 + 25.5 = 76 -> critical/high boundary
  const highRisk = calculateRiskScore({
    fireCount: 35,
    distanceToDelhiKm: 150,
    windAlignment: 0.85,
  });
  assert.equal(highRisk.score, 76);
  assert.equal(highRisk.level, 'critical');

  // Case D: Moderate Risk District (15 fires, 250 km away, wind alignment 0.50)
  // fireVolume = (15/50)*40 = 12
  // proximity = ((450 - 250)/400)*30 = 15
  // wind = 0.50 * 30 = 15
  // total = 12 + 15 + 15 = 42
  const modRisk = calculateRiskScore({
    fireCount: 15,
    distanceToDelhiKm: 250,
    windAlignment: 0.5,
  });
  assert.equal(modRisk.score, 42);
  assert.equal(modRisk.level, 'moderate');

  console.log('✓ Risk scoring heuristics passed boundary and calibrated test cases.');
}

console.log('ALL DOMAIN LOGIC UNIT TESTS PASSED SUCCESSFULLY!');
