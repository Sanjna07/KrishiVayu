import { NextResponse } from 'next/server';
import { marketRepo } from '@/lib/repo/marketRepo';
import { hashEditToken } from '@/lib/market';
import { sanitizeOfferForPublic } from '@/lib/marketSanitizer';

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const hashed = hashEditToken(token);
    const listing = await marketRepo.getListingByTokenHash(hashed);
    if (!listing) {
      return NextResponse.json(
        { error: 'Listing not found for this management link' },
        { status: 404 }
      );
    }

    const offers = await marketRepo.getOffersByListingId(listing.id);

    // Farmer owner view: reveal farmer phone and reveal buyer contact for accepted offer
    const { editTokenHash, ...safeListing } = listing;
    void editTokenHash;

    const ownerOffers = offers.map((offer) => {
      if (offer.status === 'accepted') {
        return offer; // Reveal buyer contact so farmer can coordinate pickup
      }
      return sanitizeOfferForPublic(offer);
    });

    return NextResponse.json({
      success: true,
      listing: safeListing,
      offers: ownerOffers,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to retrieve management details';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
