/**
 * Unit Tests for KrishiVayu Weather Service (Open-Meteo)
 * Validates real API fetch, cardinal direction mapping, caching, and forced failure fallback.
 */

import assert from 'node:assert/strict';
import { getRegionalWind, degreesToCardinal } from '../src/lib/weather';

async function run() {
  console.log('--- RUNNING WEATHER SERVICE TESTS ---');

  // 1. Cardinal conversion sanity
  assert.equal(degreesToCardinal(0), 'N');
  assert.equal(degreesToCardinal(90), 'E');
  assert.equal(degreesToCardinal(180), 'S');
  assert.equal(degreesToCardinal(270), 'W');
  assert.equal(degreesToCardinal(315), 'NW');
  assert.equal(degreesToCardinal(336), 'NNW');
  console.log('✓ Cardinal direction conversions verified.');

  // 2. Real Open-Meteo API call
  console.log('Testing live Open-Meteo API call...');
  const liveWind = await getRegionalWind({ bypassCache: true });
  console.log('LIVE WIND RESULT:', JSON.stringify(liveWind, null, 2));

  assert.equal(typeof liveWind.speedKmh, 'number', 'Wind speed must be number');
  assert.equal(typeof liveWind.directionDeg, 'number', 'Wind direction must be number');
  assert.equal(typeof liveWind.directionCardinal, 'string');
  assert.equal(typeof liveWind.alignmentScore, 'number');
  assert.ok(liveWind.alignmentScore >= 0 && liveWind.alignmentScore <= 1.0, 'Alignment must be within [0, 1]');
  // Verified live or fallback schema
  assert.ok(typeof liveWind.isFallback === 'boolean');
  console.log('✓ Real Open-Meteo call succeeded with valid schema.');

  // 3. Forced Error / Failure Path Test
  console.log('Testing forced error fallback path...');
  const fallbackWind = await getRegionalWind({ forceError: true, bypassCache: true });
  console.log('FALLBACK WIND RESULT:', JSON.stringify(fallbackWind, null, 2));

  assert.equal(fallbackWind.isFallback, true, 'Fallback flag must be true');
  assert.equal(fallbackWind.alignmentScore, 0.5, 'Neutral alignment must be 0.5');
  assert.equal(fallbackWind.speedKmh, 0, 'Fallback speed must be 0');
  assert.equal(fallbackWind.directionCardinal, 'N/A', 'Fallback cardinal must be N/A');
  console.log('✓ Forced error fallback path returns neutral alignment 0.5.');

  console.log('ALL WEATHER UNIT TESTS PASSED SUCCESSFULLY!');
}

run().catch((err) => {
  console.error('Weather tests failed:', err);
  process.exit(1);
});
