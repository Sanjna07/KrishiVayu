import assert from 'assert';
import { generateFarmerMessages, getMarketplaceSellUrl } from '../src/lib/messages';
import type { DistrictSummary } from '../src/types';

console.log('--- RUNNING WHATSAPP INTEGRATION & DEEP LINK TESTS (M7) ---');

// Mock districts for validation
const sangrurMock: DistrictSummary = {
  name: 'Sangrur',
  state: 'Punjab',
  lat: 30.24,
  lon: 75.84,
  fireCount: 42,
  riskScore: 82,
  riskLevel: 'critical',
  distanceToDelhiKm: 215,
  bearingToDelhiDeg: 135,
  windSpeedKmh: 12,
  windDirectionCardinal: 'NW',
  windTowardsDelhi: true,
  windAlignment: 0.95,
  nearestAlternativeDistanceKm: 8,
  matchedAlternatives: [
    {
      id: 'CBG-PB-01',
      name: 'Verbio India Bio-CNG Plant',
      type: 'cbg_plant',
      distanceKm: 8,
      lat: 30.15,
      lon: 75.80,
      contact: 'Toll-free 1800-180-2024',
      priceQuote: '₹210 / quintal farmgate',
      isDemo: false,
    },
  ],
};

const bathindaMock: DistrictSummary = {
  name: 'Bathinda',
  state: 'Punjab',
  lat: 30.21,
  lon: 74.95,
  fireCount: 28,
  riskScore: 68,
  riskLevel: 'high',
  distanceToDelhiKm: 310,
  bearingToDelhiDeg: 128,
  windSpeedKmh: 9,
  windDirectionCardinal: 'WNW',
  windTowardsDelhi: true,
  windAlignment: 0.88,
  nearestAlternativeDistanceKm: 14,
  matchedAlternatives: [
    {
      id: 'BP-PB-05',
      name: 'Malwa Green Energy Pellet Plant',
      type: 'biomass_plant',
      distanceKm: 14,
      lat: 30.25,
      lon: 75.02,
      contact: 'Facility Nodal Desk',
      priceQuote: '₹195 / quintal',
      isDemo: false,
    },
  ],
};

function testDistrict(district: DistrictSummary) {
  console.log(`\n======================================================`);
  console.log(`VALIDATING DISTRICT: ${district.name}`);
  console.log(`======================================================`);

  const messages = generateFarmerMessages(district);
  assert.strictEqual(messages.length, 3, 'Must generate exactly 3 language messages');

  const sellUrl = getMarketplaceSellUrl(district.name);
  console.log(`Deep Link generated: ${sellUrl}`);

  // 1. Verify Deep Link constraints
  assert.ok(sellUrl.includes(`/market/sell?district=${encodeURIComponent(district.name)}&ref=wa`));
  // Anti-Hallucination & Privacy Rule: No PII in deep link
  assert.ok(!sellUrl.includes('phone'));
  assert.ok(!sellUrl.includes('token'));
  assert.ok(!sellUrl.includes('@'));

  for (const m of messages) {
    console.log(`\n--- [${m.label.toUpperCase()}] ---`);
    console.log(m.message);

    // Verify deep link is embedded
    assert.ok(m.message.includes(sellUrl), `Message in ${m.lang} must contain sellUrl`);

    // Verify length stays within standard WhatsApp text constraints (< 1500 chars)
    assert.ok(m.message.length < 1500, `Message in ${m.lang} exceeds WhatsApp readability limit`);

    // 2. Test WhatsApp wa.me encoding and round-trip decoding
    const encoded = encodeURIComponent(m.message);
    const waUrl = `https://wa.me/?text=${encoded}`;
    assert.ok(waUrl.startsWith('https://wa.me/?text='));

    const decoded = decodeURIComponent(encoded);
    assert.strictEqual(decoded, m.message, `Decoded text must exactly match original for ${m.lang}`);

    console.log(`WhatsApp wa.me share URL verified (length: ${waUrl.length} chars).`);
  }
}

testDistrict(sangrurMock);
testDistrict(bathindaMock);

console.log('\n✓ ALL WHATSAPP INTEGRATION & ENCODING TESTS PASSED!');
