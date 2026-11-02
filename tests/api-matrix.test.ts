import assert from 'assert';
import { POST as createListingRoute, GET as listListingsRoute } from '../src/app/api/market/listings/route';
import { GET as getListingRoute, PATCH as patchListingRoute } from '../src/app/api/market/listings/[id]/route';
import { POST as createOfferRoute } from '../src/app/api/market/offers/route';
import { PATCH as patchOfferRoute } from '../src/app/api/market/offers/[id]/route';
import { marketRepo } from '../src/lib/repo/marketRepo';
import { initialDemoListings, initialDemoOffers } from '../src/lib/repo/seedData';

console.log('--- RUNNING MARKETPLACE API ROUTE MATRIX TESTS ---');

async function runApiMatrix() {
  await marketRepo.seed(initialDemoListings, initialDemoOffers, true);

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;
  const nextWeekStr = new Date(today.getTime() + 7 * 86400 * 1000).toISOString().split('T')[0];

  // 1. HAPPY PATH: CREATE LISTING
  const createReq = new Request('http://localhost:3000/api/market/listings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '192.168.1.1' },
    body: JSON.stringify({
      village: 'Kaler',
      district: 'Sangrur',
      quantityQuintals: 300,
      form: 'baled',
      startDate: todayStr,
      endDate: nextWeekStr,
      askingPricePerQuintal: 215,
      phone: '9876543210',
    }),
  });

  const createRes = await createListingRoute(createReq);
  assert.strictEqual(createRes.status, 201);
  const createData = await createRes.json();
  assert.ok(createData.success);
  assert.ok(createData.editToken);
  assert.strictEqual(createData.listing.village, 'Kaler');
  // PRIVACY CHECK: phone must NOT appear in create response listing
  assert.strictEqual(createData.listing.phone, undefined, 'Phone must be stripped from public listing response');
  const listingId = createData.listing.id;
  const editToken = createData.editToken;
  console.log('✓ 1. Happy path: Listing created. Edit token issued. Phone stripped.');

  // 2. PRIVACY CHECK: BROWSE LISTING (GET /api/market/listings)
  const listReq = new Request('http://localhost:3000/api/market/listings?district=Sangrur');
  const listRes = await listListingsRoute(listReq);
  assert.strictEqual(listRes.status, 200);
  const listData = await listRes.json();
  assert.ok(listData.listings.length > 0);
  for (const l of listData.listings) {
    assert.strictEqual(l.phone, undefined, 'Phone must never appear in browse list');
    assert.strictEqual(l.editTokenHash, undefined, 'Token hash must never appear in browse list');
  }
  console.log('✓ 2. Privacy check: Browse endpoint never exposes phone or token hash.');

  // 3. PUBLIC DETAIL CHECK: GET /api/market/listings/[id]
  const publicDetailReq = new Request(`http://localhost:3000/api/market/listings/${listingId}`);
  const publicDetailRes = await getListingRoute(publicDetailReq, {
    params: Promise.resolve({ id: listingId }),
  });
  assert.strictEqual(publicDetailRes.status, 200);
  const publicDetailData = await publicDetailRes.json();
  assert.strictEqual(publicDetailData.isOwner, false);
  assert.strictEqual(publicDetailData.listing.phone, undefined, 'Phone must not appear before acceptance');
  console.log('✓ 3. Public detail view: Phone withheld prior to offer acceptance.');

  // 4. HAPPY PATH: CREATE OFFER (POST /api/market/offers)
  const createOfferReq = new Request('http://localhost:3000/api/market/offers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '192.168.1.2' },
    body: JSON.stringify({
      listingId,
      buyerId: 'buyer_punjab_biomass_1',
      buyerName: 'Punjab Biomass Solutions (Demo)',
      buyerType: 'biomass_plant',
      buyerContact: '98111-DEMO8',
      pricePerQuintal: 210,
      proposedPickupDate: nextWeekStr,
      shortNote: 'Ready to load within 24h',
      isDemo: true,
    }),
  });

  const offerRes = await createOfferRoute(createOfferReq);
  assert.strictEqual(offerRes.status, 201);
  const offerData = await offerRes.json();
  const offerId = offerData.offer.id;
  assert.strictEqual(offerData.offer.status, 'pending');

  // Verify listing status automatically progressed to 'offered'
  const listingAfterOffer = await marketRepo.getListingById(listingId);
  assert.strictEqual(listingAfterOffer?.status, 'offered');
  console.log('✓ 4. Offer created. Listing status transitioned: listed -> offered.');

  // 5. FARMER DETAIL CHECK WITH TOKEN
  const farmerDetailReq = new Request(
    `http://localhost:3000/api/market/listings/${listingId}?token=${editToken}`
  );
  const farmerDetailRes = await getListingRoute(farmerDetailReq, {
    params: Promise.resolve({ id: listingId }),
  });
  assert.strictEqual(farmerDetailRes.status, 200);
  const farmerDetailData = await farmerDetailRes.json();
  assert.strictEqual(farmerDetailData.isOwner, true);
  assert.strictEqual(farmerDetailData.listing.phone, '9876543210', 'Farmer sees their own registered phone');
  console.log('✓ 5. Authenticated farmer dashboard view retrieves phone and private view.');

  // 6. ACCEPT OFFER (PATCH /api/market/offers/[id])
  const acceptReq = new Request(`http://localhost:3000/api/market/offers/${offerId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${editToken}`,
    },
    body: JSON.stringify({ action: 'accept' }),
  });
  const acceptRes = await patchOfferRoute(acceptReq, {
    params: Promise.resolve({ id: offerId }),
  });
  assert.strictEqual(acceptRes.status, 200);
  const acceptData = await acceptRes.json();
  assert.strictEqual(acceptData.offer.status, 'accepted');
  assert.strictEqual(acceptData.listing.status, 'accepted');
  console.log('✓ 6. Farmer accepts offer. Status transitions to accepted.');

  // 7. BUYER REVELATION AFTER ACCEPTANCE
  const buyerDetailReq = new Request(
    `http://localhost:3000/api/market/listings/${listingId}?buyerId=buyer_punjab_biomass_1`
  );
  const buyerDetailRes = await getListingRoute(buyerDetailReq, {
    params: Promise.resolve({ id: listingId }),
  });
  const buyerDetailData = await buyerDetailRes.json();
  assert.strictEqual(buyerDetailData.listing.phone, '9876543210', 'Accepted buyer receives farmer phone');
  console.log('✓ 7. Post-acceptance contact exchange: Accepted buyer receives farmer contact.');

  // 8. BAD INPUT HANDLING
  const badInputReq = new Request('http://localhost:3000/api/market/listings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '192.168.1.3' },
    body: JSON.stringify({ village: '', district: 'Sangrur' }), // Missing village and required fields
  });
  const badInputRes = await createListingRoute(badInputReq);
  assert.strictEqual(badInputRes.status, 400);
  const badInputData = await badInputRes.json();
  assert.ok(badInputData.error);
  console.log('✓ 8. Bad input rejected with 400 and consistent error payload.');

  // 9. WRONG TOKEN REJECTION
  const wrongTokenReq = new Request(`http://localhost:3000/api/market/listings/${listingId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer invalid-token-xyz',
    },
    body: JSON.stringify({ action: { type: 'SCHEDULE_PICKUP' } }),
  });
  const wrongTokenRes = await patchListingRoute(wrongTokenReq, {
    params: Promise.resolve({ id: listingId }),
  });
  assert.strictEqual(wrongTokenRes.status, 401);
  console.log('✓ 9. Invalid token correctly rejected with 401 Unauthorized.');

  // 10. INVALID TRANSITION REJECTION
  const validTokenForL2 = 'l2-token-secret-123';
  const { hashEditToken } = await import('../src/lib/market');
  const l2 = await marketRepo.createListing({
    id: 'list_test_invalid_tr',
    village: 'Dhuri',
    district: 'Sangrur',
    state: 'Punjab',
    quantityQuintals: 100,
    form: 'loose',
    availability: { startDate: todayStr, endDate: nextWeekStr },
    editTokenHash: hashEditToken(validTokenForL2),
    status: 'listed',
    isDemo: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const invalidTrReqWithToken = new Request(`http://localhost:3000/api/market/listings/${l2.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${validTokenForL2}`,
    },
    body: JSON.stringify({ action: { type: 'CONFIRM_COLLECTED' } }),
  });
  const invalidTrRes = await patchListingRoute(invalidTrReqWithToken, {
    params: Promise.resolve({ id: l2.id }),
  });
  assert.strictEqual(invalidTrRes.status, 400);
  const invalidTrData = await invalidTrRes.json();
  assert.ok(invalidTrData.error.includes('pickup_scheduled'));
  console.log('✓ 10. Invalid state transition rejected with 400.');

  // 11. RATE LIMIT HIT
  const rateLimitIp = '10.0.0.99';
  let hitRateLimit = false;
  for (let i = 0; i < 25; i++) {
    const rlReq = new Request('http://localhost:3000/api/market/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': rateLimitIp },
      body: JSON.stringify({
        village: 'Sunam',
        district: 'Sangrur',
        quantityQuintals: 100,
        form: 'baled',
        startDate: todayStr,
        endDate: nextWeekStr,
      }),
    });
    const res = await createListingRoute(rlReq);
    if (res.status === 429) {
      hitRateLimit = true;
      break;
    }
  }
  assert.ok(hitRateLimit, 'Expected rate limiter to return 429 after 20 requests');
  console.log('✓ 11. Rate limiter triggers 429 after burst of write requests.');

  console.log('ALL API ROUTE MATRIX TESTS PASSED SUCCESSFULLY!');
}

runApiMatrix().catch((err) => {
  console.error('API Matrix Test failed:', err);
  process.exit(1);
});
