import assert from 'assert';
import { POST as createListingRoute } from '../src/app/api/market/listings/route';
import { POST as createOfferRoute } from '../src/app/api/market/offers/route';
import { PATCH as patchOfferRoute } from '../src/app/api/market/offers/[id]/route';
import { PATCH as patchListingRoute } from '../src/app/api/market/listings/[id]/route';
import { GET as getManageRoute } from '../src/app/api/market/manage/[token]/route';

console.log('--- RUNNING FULL FARMER DASHBOARD LIFECYCLE TESTS (M6) ---');

async function testFullLifecycle() {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const nextWeekStr = new Date(today.getTime() + 7 * 86400 * 1000).toISOString().split('T')[0];

  // 1. Farmer creates listing
  const createListingReq = new Request('http://localhost:3000/api/market/listings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.10.1.1' },
    body: JSON.stringify({
      village: 'Cheema',
      district: 'Barnala',
      quantityQuintals: 250,
      form: 'baled',
      startDate: todayStr,
      endDate: nextWeekStr,
      askingPricePerQuintal: 215,
      phone: '9876543210',
    }),
  });

  const createRes = await createListingRoute(createListingReq);
  assert.strictEqual(createRes.status, 201);
  const { listing: initialListing, editToken } = await createRes.json();
  const listingId = initialListing.id;
  assert.strictEqual(initialListing.status, 'listed');
  console.log(`✓ 1. Listing created: #${listingId} (status: listed) with private token.`);

  // 2. Buyer submits offer #1
  const offer1Req = new Request('http://localhost:3000/api/market/offers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.10.1.2' },
    body: JSON.stringify({
      listingId,
      buyerId: 'demo_buyer_1',
      buyerName: 'Malwa Bio-Pellet Unit (Demo)',
      buyerType: 'pellet_unit',
      buyerContact: '98111-DEMO1',
      pricePerQuintal: 210,
      proposedPickupDate: nextWeekStr,
      shortNote: 'Ready with baler and flatbed trailer',
      isDemo: true,
    }),
  });
  const offer1Res = await createOfferRoute(offer1Req);
  assert.strictEqual(offer1Res.status, 201);
  const { offer: offer1 } = await offer1Res.json();
  console.log(`✓ 2. Buyer submitted offer #${offer1.id} (status: pending).`);

  // Verify dashboard view via token reveals offer and changes listing status to 'offered'
  const manageRes1 = await getManageRoute(new Request(`http://localhost:3000/api/market/manage/${editToken}`), {
    params: Promise.resolve({ token: editToken }),
  });
  assert.strictEqual(manageRes1.status, 200);
  const manageData1 = await manageRes1.json();
  assert.strictEqual(manageData1.listing.status, 'offered');
  assert.strictEqual(manageData1.offers.length, 1);
  // Before acceptance: buyer contact is withheld
  assert.strictEqual(manageData1.offers[0].buyerContact, undefined, 'Buyer contact must be masked before acceptance');
  console.log('✓ 3. Farmer dashboard reflects status "offered" & buyer contact is safely masked.');

  // 4. Invalid Action Blocked: Try to schedule pickup directly while still 'offered'
  const invalidActionReq = new Request(`http://localhost:3000/api/market/listings/${listingId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${editToken}`,
    },
    body: JSON.stringify({ action: { type: 'SCHEDULE_PICKUP' } }),
  });
  const invalidActionRes = await patchListingRoute(invalidActionReq, {
    params: Promise.resolve({ id: listingId }),
  });
  assert.strictEqual(invalidActionRes.status, 400, 'Cannot schedule pickup before accepting an offer');
  console.log('✓ 4. Premature pickup scheduling correctly blocked (400).');

  // 5. Wrong token blocked: Unauthorized user cannot accept offer
  const wrongTokenReq = new Request(`http://localhost:3000/api/market/offers/${offer1.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer wrong-fake-token-xyz',
    },
    body: JSON.stringify({ action: 'accept' }),
  });
  const wrongTokenRes = await patchOfferRoute(wrongTokenReq, {
    params: Promise.resolve({ id: offer1.id }),
  });
  assert.strictEqual(wrongTokenRes.status, 401);
  console.log('✓ 5. Offer acceptance with wrong token rejected (401 Unauthorized).');

  // 6. Valid farmer acceptance
  const validAcceptReq = new Request(`http://localhost:3000/api/market/offers/${offer1.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${editToken}`,
    },
    body: JSON.stringify({ action: 'accept' }),
  });
  const validAcceptRes = await patchOfferRoute(validAcceptReq, {
    params: Promise.resolve({ id: offer1.id }),
  });
  assert.strictEqual(validAcceptRes.status, 200);
  const acceptPayload = await validAcceptRes.json();
  assert.strictEqual(acceptPayload.offer.status, 'accepted');
  assert.strictEqual(acceptPayload.listing.status, 'accepted');
  console.log('✓ 6. Farmer accepted offer: status transitioned to "accepted".');

  // 7. Verify buyer contact is now revealed to farmer in management dashboard
  const manageRes2 = await getManageRoute(new Request(`http://localhost:3000/api/market/manage/${editToken}`), {
    params: Promise.resolve({ token: editToken }),
  });
  const manageData2 = await manageRes2.json();
  const acceptedOfferInDashboard = manageData2.offers.find((o: { id: string }) => o.id === offer1.id);
  assert.strictEqual(acceptedOfferInDashboard.buyerContact, '98111-DEMO1', 'Accepted buyer contact must be unlocked for farmer');
  console.log('✓ 7. Buyer contact "98111-DEMO1" successfully unlocked for farmer.');

  // 8. Lifecycle Advance: Farmer schedules pickup
  const scheduleReq = new Request(`http://localhost:3000/api/market/listings/${listingId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${editToken}`,
    },
    body: JSON.stringify({ action: { type: 'SCHEDULE_PICKUP' } }),
  });
  const scheduleRes = await patchListingRoute(scheduleReq, {
    params: Promise.resolve({ id: listingId }),
  });
  assert.strictEqual(scheduleRes.status, 200);
  const scheduleData = await scheduleRes.json();
  assert.strictEqual(scheduleData.listing.status, 'pickup_scheduled');
  console.log('✓ 8. Status transitioned: accepted -> pickup_scheduled.');

  // 9. Lifecycle Advance: Confirm residue collected
  const collectReq = new Request(`http://localhost:3000/api/market/listings/${listingId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${editToken}`,
    },
    body: JSON.stringify({ action: { type: 'CONFIRM_COLLECTED' } }),
  });
  const collectRes = await patchListingRoute(collectReq, {
    params: Promise.resolve({ id: listingId }),
  });
  assert.strictEqual(collectRes.status, 200);
  const collectData = await collectRes.json();
  assert.strictEqual(collectData.listing.status, 'collected');
  console.log('✓ 9. Status transitioned: pickup_scheduled -> collected.');

  // 10. Invalid Action Blocked: Cannot withdraw once collected
  const withdrawReq = new Request(`http://localhost:3000/api/market/listings/${listingId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${editToken}`,
    },
    body: JSON.stringify({ action: { type: 'WITHDRAW' } }),
  });
  const withdrawRes = await patchListingRoute(withdrawReq, {
    params: Promise.resolve({ id: listingId }),
  });
  assert.strictEqual(withdrawRes.status, 400);
  console.log('✓ 10. Illegal withdrawal on collected residue properly rejected (400).');

  console.log('ALL M6 LIFECYCLE TESTS COMPLETED SUCCESSFULLY!');
}

testFullLifecycle().catch((err) => {
  console.error('Lifecycle test error:', err);
  process.exit(1);
});
