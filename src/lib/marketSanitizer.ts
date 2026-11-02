import type { Listing, Offer } from '@/types/market';
import { hashEditToken } from './market';

export interface PublicListing extends Omit<Listing, 'editTokenHash' | 'phone'> {
  phone?: string;
  offersCount?: number;
}

export interface SanitizedOffer extends Omit<Offer, 'buyerContact'> {
  buyerContact?: string;
}

/**
 * Sanitizes a listing for public listing views (browse, search, map).
 * Strictly hides phone, editTokenHash.
 */
export function sanitizeListingForPublic(listing: Listing, offersCount = 0): PublicListing {
  const { editTokenHash, phone, ...rest } = listing;
  void editTokenHash;
  void phone;
  return {
    ...rest,
    offersCount,
  };
}

/**
 * Sanitizes offers for public view.
 * Hides buyerContact unless the viewing role has authorization.
 */
export function sanitizeOfferForPublic(offer: Offer): SanitizedOffer {
  const { buyerContact, ...rest } = offer;
  void buyerContact;
  return rest;
}

/**
 * Verifies if an edit token matches a listing's editTokenHash.
 */
export function verifyListingToken(listing: Listing, token?: string | null): boolean {
  if (!token || typeof token !== 'string') return false;
  const hashed = hashEditToken(token);
  return hashed === listing.editTokenHash;
}
