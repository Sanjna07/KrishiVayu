import { NextResponse } from 'next/server';
import { marketRepo } from '@/lib/repo/marketRepo';
import { transitionListingStatus } from '@/lib/market';
import { verifyListingToken } from '@/lib/marketSanitizer';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

function extractToken(request: Request, bodyToken?: unknown): string | null {
  if (typeof bodyToken === 'string' && bodyToken.trim()) {
    return bodyToken.trim();
  }
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  const url = new URL(request.url);
  const queryToken = url.searchParams.get('token');
  if (queryToken) {
    return queryToken.trim();
  }
  return null;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(request);
    const rl = checkRateLimit(ip, 30);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { id } = await context.params;
    const offer = await marketRepo.getOfferById(id);
    if (!offer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    }

    const listing = await marketRepo.getListingById(offer.listingId);
    if (!listing) {
      return NextResponse.json({ error: 'Associated listing not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const token = extractToken(request, body.token || body.editToken);
    const isAuthorized = verifyListingToken(listing, token);
    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized. Invalid or missing farmer edit token.' },
        { status: 401 }
      );
    }

    const action = body.action;
    if (action !== 'accept' && action !== 'decline') {
      return NextResponse.json(
        { error: "Invalid action. Must be 'accept' or 'decline'" },
        { status: 400 }
      );
    }

    if (action === 'accept') {
      // Enforce valid state transition
      const nextListingStatus = transitionListingStatus(listing.status, {
        type: 'ACCEPT_OFFER',
        offerId: offer.id,
      });

      // 1. Mark this offer as accepted
      const updatedOffer = await marketRepo.updateOffer(offer.id, {
        status: 'accepted',
      });

      // 2. Update listing status and acceptedOfferId
      const updatedListing = await marketRepo.updateListing(listing.id, {
        status: nextListingStatus,
        acceptedOfferId: offer.id,
      });

      // 3. Decline any other pending offers
      const siblingOffers = await marketRepo.getOffersByListingId(listing.id);
      for (const sibling of siblingOffers) {
        if (sibling.id !== offer.id && sibling.status === 'pending') {
          await marketRepo.updateOffer(sibling.id, { status: 'declined' });
        }
      }

      const { editTokenHash, ...sanitizedListing } = updatedListing;
      void editTokenHash;

      return NextResponse.json({
        success: true,
        offer: updatedOffer,
        listing: sanitizedListing,
      });
    }

    // Decline action
    const updatedOffer = await marketRepo.updateOffer(offer.id, {
      status: 'declined',
    });

    return NextResponse.json({
      success: true,
      offer: updatedOffer,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to process offer action';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
