/**
 * Unit & Integration Tests for KrishiVayu Demo Resilience (Offline & Venue-WiFi Fallback)
 * Validates that the system seamlessly falls back to bundled snapshots with clear UI indicators
 * when external NASA FIRMS or weather networks are unreachable.
 */

import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { getFallbackWind } from '../src/lib/weather';
import { calculateRiskScore } from '../src/lib/risk';

console.log('--- RUNNING DEMO RESILIENCE TESTS ---');

// 1. Verify Snapshot File Exists and is Valid
{
  const snapshotPath = path.join(process.cwd(), 'public', 'data', 'firms_snapshot.json');
  assert.ok(fs.existsSync(snapshotPath), 'Snapshot file public/data/firms_snapshot.json must exist');

  const raw = fs.readFileSync(snapshotPath, 'utf8');
  const json = JSON.parse(raw);

  assert.ok(Array.isArray(json.hotspots), 'Snapshot must contain hotspots array');
  assert.ok(json.hotspots.length >= 20, 'Snapshot must contain at least 20 active hotspots');
  assert.equal(typeof json.snapshot_date, 'string', 'Snapshot must have a snapshot_date timestamp');
  assert.ok(json.source.includes('NASA FIRMS'), 'Snapshot source must credit NASA FIRMS');

  console.log(`✓ Bundled offline snapshot verified: ${json.hotspots.length} hotspots, dated ${json.snapshot_date}`);
}

// 2. Weather Offline Fallback Resilience
{
  const fallbackWind = getFallbackWind('Forced venue-wifi disconnect');
  assert.equal(fallbackWind.isFallback, true, 'isFallback must be true');
  assert.equal(fallbackWind.alignmentScore, 0.5, 'Fallback alignment must be neutral 0.5');

  // Verify risk scoring continues to compute predictably even during complete weather blackout
  const riskWithFallback = calculateRiskScore({
    fireCount: 20,
    distanceToDelhiKm: 150,
    windAlignment: fallbackWind.alignmentScore,
  });

  assert.ok(riskWithFallback.score > 0 && riskWithFallback.score <= 100, 'Risk score must calculate cleanly');
  assert.equal(riskWithFallback.breakdown.windTrajectoryComponent, 15, 'Neutral wind alignment (0.5) must give exactly 15 points (0.5 * 30)');

  console.log(`✓ Offline weather fallback operates cleanly: Risk score computed as ${riskWithFallback.score}/100.`);
}

console.log('ALL DEMO RESILIENCE TESTS PASSED SUCCESSFULLY!');
