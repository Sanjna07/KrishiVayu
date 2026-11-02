/**
 * Unit Tests for KrishiVayu Alternatives Dataset & Matching Logic
 * Validates strict schema validation, India boundary constraints, and nearest alternative matching.
 */

import assert from 'node:assert/strict';
import {
  loadAlternatives,
  validateAlternative,
  findNearestAlternativesPerType,
} from '../src/lib/alternatives';

console.log('--- RUNNING ALTERNATIVES DATASET TESTS ---');

// 1. Schema Validation Unit Tests
{
  const validRecord = {
    id: 'test-cbg-1',
    type: 'cbg_plant',
    name: 'Demo CBG Plant 1',
    lat: 30.125,
    lon: 75.842,
    district: 'SANGRUR',
    state: 'PUNJAB',
    isDemo: true,
  };

  const parsed = validateAlternative(validRecord);
  assert.equal(parsed.id, 'test-cbg-1');
  assert.equal(parsed.isDemo, true);

  // Missing ID should throw
  assert.throws(() => validateAlternative({ ...validRecord, id: '' }), /missing valid 'id'/);

  // Invalid alternative type should throw
  assert.throws(() => validateAlternative({ ...validRecord, type: 'nuclear_plant' }), /invalid type/);

  // Out of India bounds should throw
  assert.throws(() => validateAlternative({ ...validRecord, lat: 51.5074 }), /outside India geodetic bounds/);
  assert.throws(() => validateAlternative({ ...validRecord, lon: 0.1278 }), /outside India geodetic bounds/);

  // Non-boolean isDemo should throw
  assert.throws(() => validateAlternative({ ...validRecord, isDemo: 'yes' }), /'isDemo' must be a boolean/);

  console.log('✓ Validation schema constraints strictly enforced.');
}

// 2. Real Dataset Integrity
{
  const records = loadAlternatives();
  console.log(`Loaded ${records.length} records from public/data/alternatives.json`);

  assert.ok(records.length >= 20, 'Catalog should contain all real PEDA/MNRE/IOCL alternative options');

  const realRecords = records.filter(r => !r.isDemo);
  const demoRecords = records.filter(r => r.isDemo);

  assert.ok(realRecords.length >= 20, 'Should have at least 20 real PEDA/MNRE facilities');
  assert.ok(demoRecords.length >= 4, 'Should have CHC machinery rental hubs');

  for (const alt of records) {
    // Check geodetic bounds
    assert.ok(alt.lat >= 8.0 && alt.lat <= 37.5, `${alt.id} latitude ${alt.lat} inside India`);
    assert.ok(alt.lon >= 68.0 && alt.lon <= 97.5, `${alt.id} longitude ${alt.lon} inside India`);

    if (alt.isDemo) {
      assert.equal(typeof alt.isDemo, 'boolean');
    } else {
      assert.equal(alt.isDemo, false, `${alt.id} is an official verified entity`);
      assert.ok(alt.source.length > 0, `${alt.id} must have a cited source`);
    }
  }

  console.log(`✓ Real dataset verified: ${realRecords.length} official entities, ${demoRecords.length} CHC hubs.`);
}

// 3. Nearest Alternative Matching
{
  // Test coordinate: Sangrur district center (30.245, 75.844)
  const matches = findNearestAlternativesPerType(30.245, 75.844);

  assert.ok(matches.length >= 3, 'Should find matches across alternative categories');

  // Verify list is sorted ascending by distance
  for (let i = 0; i < matches.length - 1; i++) {
    assert.ok(
      matches[i].distanceKm <= matches[i + 1].distanceKm,
      `Match ${i} (${matches[i].distanceKm}km) must be <= Match ${i + 1} (${matches[i + 1].distanceKm}km)`
    );
  }

  // Check Sangrur Verbio CBG plant is matched closely
  const cbgMatch = matches.find(m => m.type === 'cbg_plant');
  assert.ok(cbgMatch, 'CBG plant match must exist');
  assert.ok(cbgMatch.name.includes('Verbio') || cbgMatch.district === 'SANGRUR');
  assert.ok(cbgMatch.distanceKm <= 15, `Sangrur CBG match should be <= 15 km away (actual: ${cbgMatch.distanceKm} km)`);

  console.log(`✓ Nearest alternative matching verified. Closest in Sangrur: ${matches[0].name} (${matches[0].distanceKm} km).`);
}

console.log('ALL ALTERNATIVES TESTS PASSED SUCCESSFULLY!');
