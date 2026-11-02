import crypto from 'crypto';
import type {
  ListingStatus,
  ListingAction,
  CreateListingInput,
  CreateOfferInput,
  StrawForm,
} from '@/types/market';

/**
 * Validates and normalizes Indian mobile phone numbers.
 * Valid numbers are 10 digits starting with 6, 7, 8, or 9.
 * Accepts optional +91 or 0 prefixes.
 * Returns normalized 10-digit string, or throws Error.
 */
export function validatePhone(phone: unknown): string | undefined {
  if (phone === undefined || phone === null || phone === '') {
    return undefined;
  }
  if (typeof phone !== 'string') {
    throw new Error('Phone number must be a string');
  }

  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  // Match +91XXXXXXXXXX, 91XXXXXXXXXX, 0XXXXXXXXXX, or XXXXXXXXXX
  const match = cleaned.match(/^(?:\+91|91|0)?([6-9]\d{9})$/);
  if (!match) {
    throw new Error('Invalid Indian mobile phone number. Must be 10 digits starting with 6-9.');
  }

  return match[1];
}

/**
 * Validates quantity in quintals (1 quintal = 100 kg).
 * Range: 1 to 50,000 quintals.
 */
export function validateQuantity(qty: unknown): number {
  const num = typeof qty === 'string' ? parseFloat(qty) : Number(qty);
  if (isNaN(num) || !isFinite(num)) {
    throw new Error('Quantity must be a valid number');
  }
  if (num < 1) {
    throw new Error('Quantity must be at least 1 quintal');
  }
  if (num > 50000) {
    throw new Error('Quantity cannot exceed 50,000 quintals');
  }
  return Math.round(num * 10) / 10;
}

/**
 * Validates availability window dates (YYYY-MM-DD format).
 * Start date must be today or in the future (or within recent 48h to avoid timezone edge cases).
 * End date must be >= start date and <= 90 days from now.
 */
export function validateDateRange(
  start: unknown,
  end: unknown,
  now = new Date()
): { startDate: string; endDate: string } {
  if (typeof start !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(start)) {
    throw new Error('Start date must be in YYYY-MM-DD format');
  }
  if (typeof end !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    throw new Error('End date must be in YYYY-MM-DD format');
  }

  const startDate = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(`${end}T00:00:00Z`);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error('Invalid calendar date provided');
  }

  if (endDate.getTime() < startDate.getTime()) {
    throw new Error('End date cannot be earlier than start date');
  }

  // Grace boundary: allow up to 48 hours in past for client clock skew
  const minAllowed = new Date(now.getTime() - 48 * 3600 * 1000);
  if (startDate.getTime() < minAllowed.getTime()) {
    throw new Error('Availability start date cannot be in the past');
  }

  // Max 90 days window
  const maxAllowed = new Date(now.getTime() + 90 * 24 * 3600 * 1000);
  if (endDate.getTime() > maxAllowed.getTime()) {
    throw new Error('Availability window cannot exceed 90 days');
  }

  return { startDate: start, endDate: end };
}

/**
 * Validates price per quintal. Must be positive if specified.
 */
export function validatePrice(price: unknown): number | undefined {
  if (price === undefined || price === null || price === '') {
    return undefined;
  }
  const num = typeof price === 'string' ? parseFloat(price) : Number(price);
  if (isNaN(num) || !isFinite(num) || num <= 0) {
    throw new Error('Price per quintal must be a positive number');
  }
  if (num > 5000) {
    throw new Error('Price per quintal cannot exceed ₹5,000');
  }
  return Math.round(num);
}

/**
 * Validates creation input for a listing.
 */
export function validateListingInput(raw: unknown): CreateListingInput {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Listing payload must be an object');
  }

  const data = raw as Record<string, unknown>;

  if (typeof data.village !== 'string' || !data.village.trim()) {
    throw new Error('Village is required');
  }
  if (typeof data.district !== 'string' || !data.district.trim()) {
    throw new Error('District is required');
  }

  const form = data.form;
  if (form !== 'loose' && form !== 'baled') {
    throw new Error("Form must be either 'loose' or 'baled'");
  }

  const quantityQuintals = validateQuantity(data.quantityQuintals);
  const { startDate, endDate } = validateDateRange(data.startDate, data.endDate);
  const askingPricePerQuintal = validatePrice(data.askingPricePerQuintal);
  const phone = validatePhone(data.phone);

  return {
    village: data.village.trim().slice(0, 100),
    district: data.district.trim().slice(0, 100),
    state: typeof data.state === 'string' && data.state.trim() ? data.state.trim().slice(0, 100) : 'Punjab',
    quantityQuintals,
    form: form as StrawForm,
    startDate,
    endDate,
    askingPricePerQuintal,
    phone,
    isDemo: Boolean(data.isDemo),
  };
}

/**
 * Validates offer input.
 */
export function validateOfferInput(raw: unknown): CreateOfferInput {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Offer payload must be an object');
  }

  const data = raw as Record<string, unknown>;

  if (typeof data.listingId !== 'string' || !data.listingId.trim()) {
    throw new Error('Listing ID is required');
  }
  if (typeof data.buyerId !== 'string' || !data.buyerId.trim()) {
    throw new Error('Buyer ID is required');
  }
  if (typeof data.buyerName !== 'string' || !data.buyerName.trim()) {
    throw new Error('Buyer Name is required');
  }

  const validTypes = ['cbg_plant', 'biomass_plant', 'residue_buyer', 'pellet_unit', 'aggregator'];
  if (!validTypes.includes(data.buyerType as string)) {
    throw new Error(`Invalid buyer type: ${data.buyerType}`);
  }

  const price = validatePrice(data.pricePerQuintal);
  if (!price) {
    throw new Error('Offer price per quintal is required and must be positive');
  }

  if (typeof data.proposedPickupDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.proposedPickupDate)) {
    throw new Error('Proposed pickup date must be in YYYY-MM-DD format');
  }

  return {
    listingId: data.listingId.trim(),
    buyerId: data.buyerId.trim(),
    buyerName: data.buyerName.trim().slice(0, 100),
    buyerType: data.buyerType as CreateOfferInput['buyerType'],
    buyerContact: typeof data.buyerContact === 'string' ? data.buyerContact.trim() : undefined,
    pricePerQuintal: price,
    proposedPickupDate: data.proposedPickupDate,
    shortNote: typeof data.shortNote === 'string' ? data.shortNote.trim().slice(0, 300) : undefined,
    isDemo: Boolean(data.isDemo),
  };
}

/**
 * Pure state machine transition function.
 * Enforces valid lifecycle steps and rejects invalid actions.
 */
export function transitionListingStatus(
  current: ListingStatus,
  action: ListingAction
): ListingStatus {
  switch (action.type) {
    case 'RECEIVE_OFFER': {
      if (current === 'listed') return 'offered';
      if (current === 'offered') return 'offered'; // Additional offer received
      throw new Error(`Cannot receive an offer when listing status is '${current}'`);
    }

    case 'ACCEPT_OFFER': {
      if (current === 'offered') return 'accepted';
      throw new Error(`Cannot accept offer when listing status is '${current}' (must be 'offered')`);
    }

    case 'SCHEDULE_PICKUP': {
      if (current === 'accepted') return 'pickup_scheduled';
      throw new Error(`Cannot schedule pickup when listing status is '${current}' (must be 'accepted')`);
    }

    case 'CONFIRM_COLLECTED': {
      if (current === 'pickup_scheduled') return 'collected';
      throw new Error(`Cannot mark collected when listing status is '${current}' (must be 'pickup_scheduled')`);
    }

    case 'WITHDRAW': {
      if (['listed', 'offered', 'accepted'].includes(current)) {
        return 'withdrawn';
      }
      throw new Error(`Cannot withdraw listing when status is '${current}'`);
    }

    case 'EXPIRE': {
      if (['listed', 'offered'].includes(current)) {
        return 'expired';
      }
      throw new Error(`Cannot expire listing when status is '${current}'`);
    }

    default: {
      const exhaustiveCheck: never = action;
      throw new Error(`Unhandled action: ${JSON.stringify(exhaustiveCheck)}`);
    }
  }
}

/**
 * Generates an unguessable 32-character hex edit token for farmer access.
 */
export function generateEditToken(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Hashes edit token using SHA-256 for secure storage.
 */
export function hashEditToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}
