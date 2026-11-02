import assert from 'assert';
import {
  validatePhone,
  validateQuantity,
  validateDateRange,
  validatePrice,
  validateListingInput,
  validateOfferInput,
  transitionListingStatus,
  generateEditToken,
  hashEditToken,
} from '../src/lib/market';
import type { ListingStatus, ListingAction } from '../src/types/market';

console.log('--- RUNNING MARKETPLACE DOMAIN & CONTRACT TESTS ---');

// 1. Phone validation
assert.strictEqual(validatePhone('9876543210'), '9876543210');
assert.strictEqual(validatePhone('+919876543210'), '9876543210');
assert.strictEqual(validatePhone('919876543210'), '9876543210');
assert.strictEqual(validatePhone('09876543210'), '9876543210');
assert.strictEqual(validatePhone(' 98765-43210 '), '9876543210');
assert.strictEqual(validatePhone(undefined), undefined);
assert.strictEqual(validatePhone(''), undefined);

assert.throws(() => validatePhone('1234567890'), /Invalid Indian mobile phone number/);
assert.throws(() => validatePhone('98765'), /Invalid Indian mobile phone number/);
assert.throws(() => validatePhone('abcdefghij'), /Invalid Indian mobile phone number/);
console.log('✓ Phone number normalization and boundary checks passed.');

// 2. Quantity & Price validation
assert.strictEqual(validateQuantity(1), 1);
assert.strictEqual(validateQuantity('250.55'), 250.6);
assert.strictEqual(validateQuantity(50000), 50000);

assert.strictEqual(validatePrice('210'), 210);
assert.strictEqual(validatePrice(undefined), undefined);
assert.throws(() => validatePrice(0), /positive number/);

assert.throws(() => validateQuantity(0), /at least 1 quintal/);
assert.throws(() => validateQuantity(-10), /at least 1 quintal/);
assert.throws(() => validateQuantity(50001), /cannot exceed 50,000/);
assert.throws(() => validateQuantity('invalid'), /valid number/);
console.log('✓ Quantity validation and rounding rules passed.');

// 3. Date range validation
const today = new Date();
const yyyy = today.getFullYear();
const mm = String(today.getMonth() + 1).padStart(2, '0');
const dd = String(today.getDate()).padStart(2, '0');
const todayStr = `${yyyy}-${mm}-${dd}`;

const plus10 = new Date(today.getTime() + 10 * 86400 * 1000);
const plus10Str = `${plus10.getFullYear()}-${String(plus10.getMonth() + 1).padStart(2, '0')}-${String(plus10.getDate()).padStart(2, '0')}`;

const validDates = validateDateRange(todayStr, plus10Str);
assert.strictEqual(validDates.startDate, todayStr);
assert.strictEqual(validDates.endDate, plus10Str);

assert.throws(() => validateDateRange('2026/10/10', '2026/10/12'), /YYYY-MM-DD format/);
assert.throws(() => validateDateRange(plus10Str, todayStr), /earlier than start date/);
assert.throws(() => validateDateRange('2020-01-01', '2020-01-05'), /cannot be in the past/);
console.log('✓ Date range and availability boundary checks passed.');

// 4. Status Machine Transitions: Valid paths
assert.strictEqual(transitionListingStatus('listed', { type: 'RECEIVE_OFFER', offerId: 'o1' }), 'offered');
assert.strictEqual(transitionListingStatus('offered', { type: 'RECEIVE_OFFER', offerId: 'o2' }), 'offered');
assert.strictEqual(transitionListingStatus('offered', { type: 'ACCEPT_OFFER', offerId: 'o1' }), 'accepted');
assert.strictEqual(transitionListingStatus('accepted', { type: 'SCHEDULE_PICKUP' }), 'pickup_scheduled');
assert.strictEqual(transitionListingStatus('pickup_scheduled', { type: 'CONFIRM_COLLECTED' }), 'collected');

assert.strictEqual(transitionListingStatus('listed', { type: 'WITHDRAW' }), 'withdrawn');
assert.strictEqual(transitionListingStatus('offered', { type: 'WITHDRAW' }), 'withdrawn');
assert.strictEqual(transitionListingStatus('accepted', { type: 'WITHDRAW' }), 'withdrawn');

assert.strictEqual(transitionListingStatus('listed', { type: 'EXPIRE' }), 'expired');
assert.strictEqual(transitionListingStatus('offered', { type: 'EXPIRE' }), 'expired');
console.log('✓ All valid state machine lifecycle transitions verified.');

// 5. Status Machine: Invalid transitions
const invalidTransitions: Array<[ListingStatus, ListingAction]> = [
  ['listed', { type: 'ACCEPT_OFFER', offerId: 'o1' }],
  ['listed', { type: 'SCHEDULE_PICKUP' }],
  ['listed', { type: 'CONFIRM_COLLECTED' }],
  ['offered', { type: 'SCHEDULE_PICKUP' }],
  ['offered', { type: 'CONFIRM_COLLECTED' }],
  ['accepted', { type: 'CONFIRM_COLLECTED' }],
  ['collected', { type: 'WITHDRAW' }],
  ['collected', { type: 'RECEIVE_OFFER', offerId: 'o1' }],
  ['withdrawn', { type: 'RECEIVE_OFFER', offerId: 'o1' }],
  ['withdrawn', { type: 'ACCEPT_OFFER', offerId: 'o1' }],
  ['expired', { type: 'ACCEPT_OFFER', offerId: 'o1' }],
];

for (const [status, action] of invalidTransitions) {
  assert.throws(
    () => transitionListingStatus(status, action),
    Error,
    `Expected transition from ${status} with action ${action.type} to throw`
  );
}
console.log('✓ All 11 invalid lifecycle transitions successfully rejected.');

// 6. Security Token generation & hashing
const token1 = generateEditToken();
const token2 = generateEditToken();
assert.strictEqual(token1.length, 32);
assert.notStrictEqual(token1, token2);

const hash1 = hashEditToken(token1);
const hash2 = hashEditToken(token1);
assert.strictEqual(hash1, hash2);
assert.strictEqual(hash1.length, 64); // SHA-256 hex string
console.log('✓ Token generation and SHA-256 hash consistency verified.');

// 7. Full Input Validation Functions
const validListing = validateListingInput({
  village: 'Bhawanigarh',
  district: 'Sangrur',
  quantityQuintals: '150',
  form: 'baled',
  startDate: todayStr,
  endDate: plus10Str,
  askingPricePerQuintal: '220',
  phone: '9876543210',
});
assert.strictEqual(validListing.village, 'Bhawanigarh');
assert.strictEqual(validListing.quantityQuintals, 150);
assert.strictEqual(validListing.form, 'baled');
assert.strictEqual(validListing.phone, '9876543210');

const validOffer = validateOfferInput({
  listingId: 'list_123',
  buyerId: 'buyer_abc',
  buyerName: 'Verbio Bio-Gas Sangrur',
  buyerType: 'cbg_plant',
  pricePerQuintal: 210,
  proposedPickupDate: plus10Str,
  shortNote: 'Self fleet collection',
  isDemo: true,
});
assert.strictEqual(validOffer.buyerName, 'Verbio Bio-Gas Sangrur');
assert.strictEqual(validOffer.pricePerQuintal, 210);
assert.strictEqual(validOffer.isDemo, true);

console.log('✓ Complete Listing and Offer boundary sanitizers verified.');
console.log('ALL MARKETPLACE CONTRACT TESTS PASSED SUCCESSFULLY!');
