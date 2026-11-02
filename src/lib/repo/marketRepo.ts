import fs from 'fs';
import path from 'path';
import type { Listing, Offer, ListingStatus, StrawForm } from '@/types/market';
import { initialDemoListings, initialDemoOffers } from './seedData';

export interface ListingFilter {
  district?: string;
  status?: ListingStatus;
  form?: StrawForm;
  minQty?: number;
}

export interface IMarketRepository {
  createListing(listing: Listing): Promise<Listing>;
  getListingById(id: string): Promise<Listing | null>;
  getListingByTokenHash(tokenHash: string): Promise<Listing | null>;
  listListings(filter?: ListingFilter): Promise<Listing[]>;
  updateListing(id: string, updates: Partial<Listing>): Promise<Listing>;

  createOffer(offer: Offer): Promise<Offer>;
  getOffersByListingId(listingId: string): Promise<Offer[]>;
  getOfferById(id: string): Promise<Offer | null>;
  updateOffer(id: string, updates: Partial<Offer>): Promise<Offer>;

  seed(listings: Listing[], offers: Offer[], replace?: boolean): Promise<{ listingCount: number; offerCount: number }>;
  clear(): Promise<void>;
}

class InMemoryMarketRepository implements IMarketRepository {
  private listings = new Map<string, Listing>();
  private offers = new Map<string, Offer>();
  private initialized = false;

  constructor() {
    this.ensureInitialized();
  }

  private ensureInitialized(): void {
    if (this.initialized) return;

    // Check if tmp or persistent file exists
    const storagePath = this.getStoragePath();
    if (storagePath && fs.existsSync(storagePath)) {
      try {
        const raw = fs.readFileSync(storagePath, 'utf-8');
        const data = JSON.parse(raw);
        if (Array.isArray(data.listings) && Array.isArray(data.offers)) {
          this.listings.clear();
          this.offers.clear();
          for (const l of data.listings) this.listings.set(l.id, l);
          for (const o of data.offers) this.offers.set(o.id, o);
          this.initialized = true;
          return;
        }
      } catch (err) {
        console.warn('Failed to load persisted market data, falling back to seed data:', err);
      }
    }

    // Default to initial synthetic demo dataset
    for (const l of initialDemoListings) {
      this.listings.set(l.id, { ...l });
    }
    for (const o of initialDemoOffers) {
      this.offers.set(o.id, { ...o });
    }
    this.initialized = true;
    this.saveToStorage();
  }

  private getStoragePath(): string | null {
    // In Vercel serverless environment, only /tmp is writable
    if (process.env.VERCEL) {
      return path.join('/tmp', 'krishivayu_market.json');
    }
    const dataDir = path.join(process.cwd(), 'data');
    try {
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      return path.join(dataDir, 'market.json');
    } catch {
      return null;
    }
  }

  private saveToStorage(): void {
    try {
      const storagePath = this.getStoragePath();
      if (!storagePath) return;
      const data = {
        listings: Array.from(this.listings.values()),
        offers: Array.from(this.offers.values()),
      };
      fs.writeFileSync(storagePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch {
      // Ephemeral environments might restrict disk writes; in-memory map preserves state within runtime
    }
  }

  async createListing(listing: Listing): Promise<Listing> {
    this.ensureInitialized();
    const copy: Listing = {
      ...listing,
      createdAt: listing.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.listings.set(copy.id, copy);
    this.saveToStorage();
    return { ...copy };
  }

  async getListingById(id: string): Promise<Listing | null> {
    this.ensureInitialized();
    const item = this.listings.get(id);
    return item ? { ...item } : null;
  }

  async getListingByTokenHash(tokenHash: string): Promise<Listing | null> {
    this.ensureInitialized();
    for (const item of this.listings.values()) {
      if (item.editTokenHash === tokenHash) {
        return { ...item };
      }
    }
    return null;
  }

  async listListings(filter?: ListingFilter): Promise<Listing[]> {
    this.ensureInitialized();
    let results = Array.from(this.listings.values());

    if (filter) {
      if (filter.district) {
        const d = filter.district.toLowerCase().trim();
        results = results.filter((l) => l.district.toLowerCase() === d);
      }
      if (filter.status) {
        results = results.filter((l) => l.status === filter.status);
      }
      if (filter.form) {
        results = results.filter((l) => l.form === filter.form);
      }
      if (typeof filter.minQty === 'number') {
        results = results.filter((l) => l.quantityQuintals >= (filter.minQty as number));
      }
    }

    // Sort newest first
    return results
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((l) => ({ ...l }));
  }

  async updateListing(id: string, updates: Partial<Listing>): Promise<Listing> {
    this.ensureInitialized();
    const existing = this.listings.get(id);
    if (!existing) {
      throw new Error(`Listing '${id}' not found`);
    }
    const updated: Listing = {
      ...existing,
      ...updates,
      id: existing.id, // Prevent ID override
      editTokenHash: existing.editTokenHash, // Prevent token hash corruption
      updatedAt: new Date().toISOString(),
    };
    this.listings.set(id, updated);
    this.saveToStorage();
    return { ...updated };
  }

  async createOffer(offer: Offer): Promise<Offer> {
    this.ensureInitialized();
    const copy: Offer = {
      ...offer,
      createdAt: offer.createdAt || new Date().toISOString(),
    };
    this.offers.set(copy.id, copy);
    this.saveToStorage();
    return { ...copy };
  }

  async getOffersByListingId(listingId: string): Promise<Offer[]> {
    this.ensureInitialized();
    const list: Offer[] = [];
    for (const o of this.offers.values()) {
      if (o.listingId === listingId) {
        list.push({ ...o });
      }
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getOfferById(id: string): Promise<Offer | null> {
    this.ensureInitialized();
    const item = this.offers.get(id);
    return item ? { ...item } : null;
  }

  async updateOffer(id: string, updates: Partial<Offer>): Promise<Offer> {
    this.ensureInitialized();
    const existing = this.offers.get(id);
    if (!existing) {
      throw new Error(`Offer '${id}' not found`);
    }
    const updated: Offer = {
      ...existing,
      ...updates,
      id: existing.id,
      listingId: existing.listingId,
    };
    this.offers.set(id, updated);
    this.saveToStorage();
    return { ...updated };
  }

  async seed(listings: Listing[], offers: Offer[], replace = true): Promise<{ listingCount: number; offerCount: number }> {
    if (replace) {
      this.listings.clear();
      this.offers.clear();
    }
    for (const l of listings) {
      this.listings.set(l.id, { ...l });
    }
    for (const o of offers) {
      this.offers.set(o.id, { ...o });
    }
    this.initialized = true;
    this.saveToStorage();
    return {
      listingCount: this.listings.size,
      offerCount: this.offers.size,
    };
  }

  async clear(): Promise<void> {
    this.listings.clear();
    this.offers.clear();
    this.initialized = true;
    this.saveToStorage();
  }
}

// Global singleton to persist in memory across Next.js API requests
const globalForMarket = globalThis as unknown as {
  marketRepo: InMemoryMarketRepository | undefined;
};

export const marketRepo: IMarketRepository =
  globalForMarket.marketRepo ?? new InMemoryMarketRepository();

if (process.env.NODE_ENV !== 'production') {
  globalForMarket.marketRepo = marketRepo as InMemoryMarketRepository;
}
