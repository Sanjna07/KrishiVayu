import assert from 'assert';
import { GET as getMatchesRoute } from '../src/app/api/matches/route';
import { marketRepo } from '../src/lib/repo/marketRepo';
import { initialDemoListings, initialDemoOffers } from '../src/lib/repo/seedData';
import type { MatchesApiResponse } from '../src/types';

console.log('--- RUNNING DEMAND SIGNAL TIE-IN TESTS (M8) ---');

async function testDemandSignal() {
  // 1. Initialize seed dataset
  await marketRepo.seed(initialDemoListings, initialDemoOffers, true);

  // In seedData: demo_list_02 is in Bathinda (400 Quintals, status: 'listed')
  // demo_list_04 is in Tarn Taran (320 Quintals, status: 'listed')

  const req = new Request('http://localhost:3000/api/matches');
  const res = await getMatchesRoute(req);
  assert.strictEqual(res.status, 200);

  const data: MatchesApiResponse = await res.json();
  assert.ok(data.districts.length > 0);

  // Check Bathinda or Sangrur demand signals
  const bathinda = data.districts.find((d) => d.name.toLowerCase() === 'bathinda');
  if (bathinda) {
    console.log(`Bathinda Demand Signals:`, bathinda.demandSignals);
    assert.ok(bathinda.demandSignals, 'Bathinda must include demandSignals field');
    assert.ok(bathinda.demandSignals.count >= 1, 'Bathinda must show at least 1 open listing');
    assert.ok(bathinda.demandSignals.totalQuintals >= 400, 'Bathinda must show at least 400 quintals available');
  }

  // Verify privacy: demandSignals contains strictly count & totalQuintals (no phone, no name, no token)
  for (const d of data.districts) {
    if (d.demandSignals) {
      assert.strictEqual(typeof d.demandSignals.count, 'number');
      assert.strictEqual(typeof d.demandSignals.totalQuintals, 'number');
      const keys = Object.keys(d.demandSignals);
      assert.deepStrictEqual(keys.sort(), ['count', 'totalQuintals'].sort(), 'No PII or extra fields allowed in demand signals');
    }
  }

  console.log('✓ Demand signal aggregation verified across district view without PII.');
  console.log('ALL DEMAND SIGNAL TESTS PASSED SUCCESSFULLY!');
}

testDemandSignal().catch((err) => {
  console.error('Demand signal test error:', err);
  process.exit(1);
});
