import { NextResponse } from 'next/server';
import { marketRepo } from '@/lib/repo/marketRepo';
import {
  validateListingInput,
  generateEditToken,
  hashEditToken,
} from '@/lib/market';
import { sanitizeListingForPublic } from '@/lib/marketSanitizer';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import type { ListingStatus, StrawForm } from '@/types/market';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const district = searchParams.get('district') || undefined;
    const status = (searchParams.get('status') as ListingStatus) || undefined;
    const form = (searchParams.get('form') as StrawForm) || undefined;
    const minQty = searchParams.get('minQty') ? Number(searchParams.get('minQty')) : undefined;

    const listings = await marketRepo.listListings({
      district,
      status,
      form,
      minQty: isNaN(Number(minQty)) ? undefined : minQty,
    });

    // Populate offersCount for each listing and sanitize
    const sanitized = await Promise.all(
      listings.map(async (l) => {
        const offers = await marketRepo.getOffersByListingId(l.id);
        return sanitizeListingForPublic(l, offers.length);
      })
    );

    return NextResponse.json({
      success: true,
      count: sanitized.length,
      listings: sanitized,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch listings';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = checkRateLimit(ip, 20);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait before creating more listings.' },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const validatedInput = validateListingInput(body);
    const editToken = generateEditToken();
    const editTokenHash = hashEditToken(editToken);
    const listingId = `list_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newListing = await marketRepo.createListing({
      id: listingId,
      village: validatedInput.village,
      district: validatedInput.district,
      state: validatedInput.state || 'Punjab',
      quantityQuintals: validatedInput.quantityQuintals,
      form: validatedInput.form,
      availability: {
        startDate: validatedInput.startDate,
        endDate: validatedInput.endDate,
      },
      askingPricePerQuintal: validatedInput.askingPricePerQuintal,
      phone: validatedInput.phone,
      editTokenHash,
      status: 'listed',
      isDemo: Boolean(validatedInput.isDemo),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        success: true,
        listing: sanitizeListingForPublic(newListing, 0),
        editToken,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Invalid listing request';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
