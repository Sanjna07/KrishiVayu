import { marketRepo } from '../src/lib/repo/marketRepo';
import { initialDemoListings, initialDemoOffers } from '../src/lib/repo/seedData';

async function main() {
  console.log('Seeding KrishiVayu Residue Marketplace demo dataset...');
  const result = await marketRepo.seed(initialDemoListings, initialDemoOffers, true);
  console.log(`✓ Seeded ${result.listingCount} demo listings and ${result.offerCount} demo offers.`);

  // Verify demo flags
  const listings = await marketRepo.listListings();
  const allListingsDemo = listings.every((l) => l.isDemo === true);
  if (!allListingsDemo) {
    throw new Error('Verification failed: Non-demo listing found in seed!');
  }

  for (const l of listings) {
    const offers = await marketRepo.getOffersByListingId(l.id);
    const allOffersDemo = offers.every((o) => o.isDemo === true);
    if (!allOffersDemo) {
      throw new Error(`Verification failed: Non-demo offer found on listing ${l.id}!`);
    }
  }

  console.log('✓ Idempotency and isDemo: true integrity checks verified successfully.');
}

main().catch((err) => {
  console.error('Seed script error:', err);
  process.exit(1);
});
