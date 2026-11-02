import { NextResponse } from 'next/server';
import { marketRepo } from '@/lib/repo/marketRepo';
import { validateOfferInput, transitionListingStatus } from '@/lib/market';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = checkRateLimit(ip, 30);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const validatedInput = validateOfferInput(body);

    const listing = await marketRepo.getListingById(validatedInput.listingId);
    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    if (listing.status !== 'listed' && listing.status !== 'offered') {
      return NextResponse.json(
        { error: `Cannot submit offer on listing with status '${listing.status}'` },
        { status: 400 }
      );
    }

    const offerId = `off_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newOffer = await marketRepo.createOffer({
      id: offerId,
      listingId: validatedInput.listingId,
      buyerId: validatedInput.buyerId,
      buyerName: validatedInput.buyerName,
      buyerType: validatedInput.buyerType,
      buyerContact: validatedInput.buyerContact,
      pricePerQuintal: validatedInput.pricePerQuintal,
      proposedPickupDate: validatedInput.proposedPickupDate,
      shortNote: validatedInput.shortNote,
      status: 'pending',
      isDemo: Boolean(validatedInput.isDemo),
      createdAt: new Date().toISOString(),
    });

    // Update listing status if currently 'listed'
    if (listing.status === 'listed') {
      const nextStatus = transitionListingStatus('listed', {
        type: 'RECEIVE_OFFER',
        offerId,
      });
      await marketRepo.updateListing(listing.id, { status: nextStatus });
    }

    return NextResponse.json(
      {
        success: true,
        offer: newOffer,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Invalid offer submission';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
