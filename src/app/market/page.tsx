'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { DemoNotice } from '@/components/DemoNotice';
import { Footer } from '@/components/Footer';
import { MarketMap } from '@/components/MarketMap';
import { ListingModal } from '@/components/ListingModal';
import { PUNJAB_DISTRICTS } from '@/lib/marketDict';
import type { PublicListing } from '@/lib/marketSanitizer';
import {
  Filter,
  PlusCircle,
  ExternalLink,
} from 'lucide-react';

interface NearestBuyer {
  id: string;
  name: string;
  type: string;
  district: string;
  approxDistanceKm: number;
  isOperational: boolean;
  priceQuote?: string;
  notes?: string;
}

export default function MarketBrowsePage() {
  const [listings, setListings] = useState<PublicListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterDistrict, setFilterDistrict] = useState<string>('All');
  const [filterForm, setFilterForm] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');

  // Selected Listing & Modal State
  const [selectedListing, setSelectedListing] = useState<PublicListing | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nearestBuyers, setNearestBuyers] = useState<NearestBuyer[]>([]);

  // User Role
  const [userRole, setUserRole] = useState<'public' | 'buyer' | 'farmer'>('public');

  const fetchMarketListings = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterDistrict !== 'All') params.append('district', filterDistrict);
      if (filterForm !== 'All') params.append('form', filterForm);
      if (filterStatus !== 'All') params.append('status', filterStatus);

      const res = await fetch(`/api/market/listings?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load listings');

      setListings(data.listings);
      setLoading(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching listings');
      setLoading(false);
    }
  }, [filterDistrict, filterForm, filterStatus]);

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      try {
        const params = new URLSearchParams();
        if (filterDistrict !== 'All') params.append('district', filterDistrict);
        if (filterForm !== 'All') params.append('form', filterForm);
        if (filterStatus !== 'All') params.append('status', filterStatus);

        const res = await fetch(`/api/market/listings?${params.toString()}`);
        const data = await res.json();
        if (!ignore && res.ok) {
          setListings(data.listings);
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Error fetching listings');
          setLoading(false);
        }
      }
    };
    run();
    return () => { ignore = true; };
  }, [filterDistrict, filterForm, filterStatus]);

  // Fetch nearest buyers when district changes
  useEffect(() => {
    const dist = filterDistrict !== 'All' ? filterDistrict : 'Sangrur';
    fetch(`/api/market/nearest-buyers?district=${encodeURIComponent(dist)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.buyers) setNearestBuyers(data.buyers.slice(0, 4));
      })
      .catch(() => {});
  }, [filterDistrict]);

  const handleOpenModal = (listing: PublicListing) => {
    setSelectedListing(listing);
    setIsModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'listed':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">Open</span>;
      case 'offered':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">Offered</span>;
      case 'accepted':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">Accepted</span>;
      case 'pickup_scheduled':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">Scheduled</span>;
      case 'collected':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">Collected</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#1B2430] flex flex-col">
      <Navbar />
      <DemoNotice />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-5">
        {/* Subheader & Action Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D9DEE5] pb-4">
          <div>
            <h1 className="text-xl font-bold text-[#1F3A5F]">Paddy Straw Residue Market</h1>
            <p className="text-xs text-[#5B6675] mt-0.5">
              Discover farmer crop residue listings and connect with clean industrial off-takers across Punjab.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/market/sell"
              className="px-4 py-2 bg-[#2E7D32] hover:bg-[#236327] text-white text-xs sm:text-sm font-semibold rounded-md flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>List Stubble for Free</span>
            </Link>
          </div>
        </div>

        {/* Filter Toolbar Card */}
        <div className="bg-white border border-[#D9DEE5] rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-[#1F3A5F] uppercase tracking-wider">
            <Filter className="w-4 h-4 text-[#1F3A5F]" />
            <span>Filter Feed:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            {/* District Filter */}
            <select
              value={filterDistrict}
              onChange={(e) => setFilterDistrict(e.target.value)}
              className="bg-white border border-[#D9DEE5] rounded-md px-3 py-1.5 text-xs text-[#1B2430] focus:ring-2 focus:ring-[#1F3A5F]"
            >
              <option value="All">All Districts</option>
              {PUNJAB_DISTRICTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            {/* Form Filter */}
            <select
              value={filterForm}
              onChange={(e) => setFilterForm(e.target.value)}
              className="bg-white border border-[#D9DEE5] rounded-md px-3 py-1.5 text-xs text-[#1B2430] focus:ring-2 focus:ring-[#1F3A5F]"
            >
              <option value="All">All Straw Forms</option>
              <option value="baled">📦 Baled Bundles</option>
              <option value="loose">🌾 Loose Straw</option>
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-white border border-[#D9DEE5] rounded-md px-3 py-1.5 text-xs text-[#1B2430] focus:ring-2 focus:ring-[#1F3A5F]"
            >
              <option value="All">All Statuses</option>
              <option value="listed">Open</option>
              <option value="offered">Offered</option>
              <option value="accepted">Accepted</option>
              <option value="pickup_scheduled">Scheduled</option>
              <option value="collected">Collected</option>
            </select>
          </div>
        </div>

        {/* 2-Column Split: Listings Scrollable Feed (Left) + Synced Map (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Listings Feed (7 cols) */}
          <div className="lg:col-span-7 space-y-3">
            {loading && (
              <div className="text-center py-12 text-[#5B6675] text-xs">Loading marketplace listings...</div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-xs">
                {error}
              </div>
            )}

            {!loading && listings.length === 0 && (
              <div className="bg-white border border-[#D9DEE5] rounded-lg p-8 text-center text-xs space-y-2">
                <p className="font-semibold text-[#1B2430]">No listings match the selected filters.</p>
                <p className="text-[#5B6675]">Try resetting your district or straw form filters.</p>
                <button
                  onClick={() => { setFilterDistrict('All'); setFilterForm('All'); setFilterStatus('All'); }}
                  className="mt-2 px-3 py-1.5 bg-[#1F3A5F] text-white rounded text-xs font-semibold"
                >
                  Reset Filters
                </button>
              </div>
            )}

            {listings.map((l) => (
              <div
                key={l.id}
                onClick={() => handleOpenModal(l)}
                className="bg-white border border-[#D9DEE5] hover:border-[#1F3A5F] rounded-lg p-4 cursor-pointer transition-all shadow-xs hover:shadow-sm space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-[#1B2430]">
                        {l.village}, <span className="text-[#5B6675] font-normal">{l.district}</span>
                      </h2>
                      {l.isDemo && (
                        <span className="text-[10px] uppercase font-bold bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded">
                          Demo
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#5B6675] mt-0.5">
                      Available: {l.availability.startDate} to {l.availability.endDate}
                    </p>
                  </div>
                  {getStatusBadge(l.status)}
                </div>

                <div className="grid grid-cols-3 gap-2 py-2 border-y border-[#E5E9F0] text-xs">
                  <div>
                    <span className="text-[#5B6675] block text-[11px]">Residue Available</span>
                    <span className="font-bold text-emerald-800 text-sm">{l.quantityQuintals} Quintals</span>
                  </div>
                  <div>
                    <span className="text-[#5B6675] block text-[11px]">Residue Form</span>
                    <span className="font-semibold text-[#1B2430]">
                      {l.form === 'baled' ? '📦 Baled' : '🌾 Loose'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#5B6675] block text-[11px]">Asking Price</span>
                    <span className="font-semibold text-[#1F3A5F]">
                      {l.askingPricePerQuintal ? `₹${l.askingPricePerQuintal} / Qtl` : 'Open'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-0.5 text-[11px]">
                  <span className="text-[#5B6675]">
                    {l.offersCount !== undefined ? `${l.offersCount} buyer offers` : 'View offers & details'}
                  </span>
                  <span className="font-semibold text-[#1F3A5F] flex items-center gap-1">
                    <span>View Details & Bid</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Right Column: Synced Map & Clean Alternatives (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white border border-[#D9DEE5] rounded-lg overflow-hidden shadow-xs h-[380px]">
              <MarketMap
                listings={listings}
                selectedListing={selectedListing}
                onSelectListing={(l) => handleOpenModal(l as PublicListing)}
              />
            </div>

            {/* Nearby Sourced Clean Off-Takers */}
            <div className="bg-white border border-[#D9DEE5] rounded-lg p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-[#E5E9F0] pb-2">
                <span className="font-bold text-xs text-[#1F3A5F] uppercase tracking-wider">
                  Nearby Clean Alternatives
                </span>
                <span className="text-[11px] text-[#5B6675]">State Registry</span>
              </div>

              <div className="space-y-2">
                {nearestBuyers.map((b) => (
                  <div key={b.id} className="p-2.5 bg-[#F5F7FA] border border-[#E5E9F0] rounded-md text-xs space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#1B2430]">{b.name}</span>
                      <span className="text-[11px] text-[#5B6675]">approx. {b.approxDistanceKm} km</span>
                    </div>
                    <p className="text-[11px] text-[#5B6675]">{b.type} · {b.district}</p>
                    {b.priceQuote && (
                      <p className="text-emerald-800 font-semibold text-[11px]">{b.priceQuote}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Role-Aware Listing Modal (Replaces old detail panel) */}
      <ListingModal
        listing={selectedListing}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userRole={userRole}
        onRoleChange={setUserRole}
        onOfferSubmitted={fetchMarketListings}
      />

      {/* Footer */}
      <Footer />
    </div>
  );
}
