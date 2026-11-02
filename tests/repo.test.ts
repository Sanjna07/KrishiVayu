import assert from 'assert';
import { marketRepo } from '../src/lib/repo/marketRepo';
import { initialDemoListings, initialDemoOffers } from '../src/lib/repo/seedData';
import { generateEditToken, hashEditToken } from '../src/lib/market';
import type { Listing, Offer } from '../src/types/market';

console.log('--- RUNNING MARKETPLACE REPOSITORY & SEED TESTS ---');

async function testRepository() {
  // 1. Seed idempotency
  await marketRepo.seed(initialDemoListings, initialDemoOffers, true);
  let listings = await marketRepo.listListings();
  assert.strictEqual(listings.length, initialDemoListings.length);

  // Run seed a second time (should be completely idempotent)
  await marketRepo.seed(initialDemoListings, initialDemoOffers, true);
  listings = await marketRepo.listListings();
  assert.strictEqual(listings.length, initialDemoListings.length);
  console.log('✓ Seed idempotency verified.');

  // 2. Demo flag verification
  for (const l of listings) {
    assert.strictEqual(l.isDemo, true, `Listing ${l.id} must be flagged isDemo: true`);
  }
  const offersList1 = await marketRepo.getOffersByListingId('demo_list_01');
  assert.ok(offersList1.length >= 2);
  for (const o of offersList1) {
    assert.strictEqual(o.isDemo, true, `Offer ${o.id} must be flagged isDemo: true`);
  }
  console.log('✓ Strict isDemo: true check passed on all seeded records.');

  // 3. Create listing round-trip
  const testToken = generateEditToken();
  const testHash = hashEditToken(testToken);
  const newListing: Listing = {
    id: 'test_list_roundtrip',
    village: 'Cheema',
    district: 'Barnala',
    state: 'Punjab',
    quantityQuintals: 200,
    form: 'loose',
    availability: {
      startDate: '2026-11-05',
      endDate: '2026-11-15',
    },
    askingPricePerQuintal: 200,
    phone: '9876543210',
    editTokenHash: testHash,
    status: 'listed',
    isDemo: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const created = await marketRepo.createListing(newListing);
  assert.strictEqual(created.id, 'test_list_roundtrip');

  // Read back by ID
  const fetched = await marketRepo.getListingById('test_list_roundtrip');
  assert.ok(fetched);
  assert.strictEqual(fetched?.village, 'Cheema');
  assert.strictEqual(fetched?.quantityQuintals, 200);

  // Read back by Token Hash
  const fetchedByHash = await marketRepo.getListingByTokenHash(testHash);
  assert.ok(fetchedByHash);
  assert.strictEqual(fetchedByHash?.id, 'test_list_roundtrip');

  // Update listing
  const updated = await marketRepo.updateListing('test_list_roundtrip', {
    status: 'offered',
    quantityQuintals: 210,
  });
  assert.strictEqual(updated.status, 'offered');
  assert.strictEqual(updated.quantityQuintals, 210);
  assert.strictEqual(updated.editTokenHash, testHash); // Hash preserved
  console.log('✓ Create / Read / Update / Token lookup round-trip verified.');

  // 4. Create offer round-trip
  const newOffer: Offer = {
    id: 'test_off_roundtrip',
    listingId: 'test_list_roundtrip',
    buyerId: 'buyer_test_99',
    buyerName: 'Green Biofuels Ltd',
    buyerType: 'biomass_plant',
    buyerContact: '9876599999',
    pricePerQuintal: 215,
    proposedPickupDate: '2026-11-10',
    shortNote: 'Ready for loading',
    status: 'pending',
    isDemo: false,
    createdAt: new Date().toISOString(),
  };

  await marketRepo.createOffer(newOffer);
  const fetchedOffers = await marketRepo.getOffersByListingId('test_list_roundtrip');
  assert.strictEqual(fetchedOffers.length, 1);
  assert.strictEqual(fetchedOffers[0].id, 'test_off_roundtrip');

  const updatedOffer = await marketRepo.updateOffer('test_off_roundtrip', { status: 'accepted' });
  assert.strictEqual(updatedOffer.status, 'accepted');
  console.log('✓ Offer creation, retrieval, and status update verified.');

  // 5. Filtering verification
  const sangrurListings = await marketRepo.listListings({ district: 'Sangrur' });
  assert.ok(sangrurListings.every((l) => l.district.toLowerCase() === 'sangrur'));

  const baledListings = await marketRepo.listListings({ form: 'baled' });
  assert.ok(baledListings.every((l) => l.form === 'baled'));

  // Clean test item and restore seed
  await marketRepo.seed(initialDemoListings, initialDemoOffers, true);
  console.log('ALL MARKETPLACE REPOSITORY TESTS PASSED SUCCESSFULLY!');
}

testRepository().catch((err) => {
  console.error('Repo test failed:', err);
  process.exit(1);
});
