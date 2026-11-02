'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { DistrictSummary } from '@/types';
import { generateFarmerMessages } from '@/lib/messages';
import { getRiskBadgeClasses } from '@/lib/theme';
import {
  X,
  Copy,
  Check,
  Share2,
  Factory,
  Flame,
  Truck,
  Wrench,
  Info,
  Printer,
} from 'lucide-react';

interface DetailDrawerProps {
  district: DistrictSummary | null;
  onClose: () => void;
}

export function DetailDrawer({ district, onClose }: DetailDrawerProps) {
  const [selectedLang, setSelectedLang] = useState<'en' | 'hi' | 'pa'>('en');
  const [copied, setCopied] = useState(false);
  const [showFormulaInfo, setShowFormulaInfo] = useState(false);

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!district) return null;

  const messages = generateFarmerMessages(district);
  const currentMessage = messages.find((m) => m.lang === selectedLang) ?? messages[0];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentMessage.message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const getAlternativeIcon = (type: string) => {
    switch (type) {
      case 'cbg_plant':
        return <Factory className="w-4 h-4 text-[#2E7D32]" />;
      case 'biomass_plant':
        return <Flame className="w-4 h-4 text-[#E65100]" />;
      case 'residue_buyer':
        return <Truck className="w-4 h-4 text-[#1F3A5F]" />;
      case 'machinery_rental':
        return <Wrench className="w-4 h-4 text-purple-700" />;
      default:
        return <Factory className="w-4 h-4 text-[#5B6675]" />;
    }
  };

  const getAlternativeTypeLabel = (type: string) => {
    switch (type) {
      case 'cbg_plant':
        return 'CBG Bio-CNG Facility';
      case 'biomass_plant':
        return 'Biomass / Pellet Plant';
      case 'residue_buyer':
        return 'Residue Off-Take Buyer';
      case 'machinery_rental':
        return 'Custom Hiring Centre (CHC)';
      default:
        return 'Clean Alternative';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-150">
      {/* Click outside to close */}
      <div className="flex-1 cursor-pointer" onClick={onClose} aria-hidden="true" />

      {/* Drawer Panel */}
      <div
        role="dialog"
        aria-labelledby="drawer-title"
        className="w-full max-w-lg bg-white border-l print-only-container border-[#D9DEE5] h-full flex flex-col shadow-xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#D9DEE5] bg-[#F5F7FA]">
          <div>
            <div className="flex items-center gap-2">
              <h2 id="drawer-title" className="text-lg font-bold text-[#1F3A5F]">
                {district.name}
              </h2>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-200/80 text-[#5B6675] font-semibold">
                {district.state}
              </span>
            </div>
            <p className="text-xs text-[#5B6675] mt-0.5">
              Agricultural Fire Cluster & Clean Alternatives Triage
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close drawer"
            className="p-1.5 rounded-md hover:bg-slate-200 text-[#5B6675] hover:text-[#1B2430] transition-colors focus-visible:ring-2 focus-visible:ring-[#1F3A5F]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Risk Level & Score Badge */}
          <div className="bg-[#F5F7FA] border border-[#D9DEE5] rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#5B6675] uppercase tracking-wider">
                Delhi Air Quality Risk Assessment
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getRiskBadgeClasses(
                    district.riskLevel
                  )}`}
                >
                  {district.riskLevel.toUpperCase()} RISK · {district.riskScore}/100
                </span>
                <button
                  type="button"
                  onClick={() => setShowFormulaInfo(!showFormulaInfo)}
                  className="text-[#5B6675] hover:text-[#1F3A5F] p-0.5"
                  title="View Risk Heuristic Formula"
                  aria-label="View Risk Heuristic Formula"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Formula Explanation Popover */}
            {showFormulaInfo && (
              <div className="mb-3 p-3 bg-white border border-[#D9DEE5] rounded-md text-xs text-[#5B6675] space-y-1 shadow-xs">
                <p className="font-semibold text-[#1F3A5F]">Transparent Risk Heuristic Weights:</p>
                <p>• <strong>Fire Volume (40%)</strong>: Active VIIRS fire count normalized up to 50 fires.</p>
                <p>• <strong>Proximity (30%)</strong>: Geodesic distance to Delhi NCR (50 km - 450 km).</p>
                <p>• <strong>Wind Trajectory (30%)</strong>: Aerodynamic cosine alignment of prevailing plume heading towards Delhi.</p>
              </div>
            )}

            {/* Risk Factors Breakdown */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#E5E9F0] text-center">
              <div>
                <span className="block text-xs text-[#5B6675]">Active Fires</span>
                <span className="text-base font-bold text-[#C62828]">{district.fireCount}</span>
              </div>
              <div>
                <span className="block text-xs text-[#5B6675]">Distance to NCR</span>
                <span className="text-base font-bold text-[#1B2430]">{district.distanceToDelhiKm} km</span>
              </div>
              <div>
                <span className="block text-xs text-[#5B6675]">Downwind Vector</span>
                <span className="text-base font-bold text-[#E65100]">
                  {Math.round(district.windAlignment * 100)}%
                </span>
              </div>
            </div>
          </div>

          {/* Stubble Marketplace Demand Signals */}
          <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-lg p-3 text-xs text-emerald-900 flex items-center justify-between">
            <div>
              <span className="font-bold block text-emerald-950">Residue Marketplace Availability</span>
              <span>
                {district.demandSignals && district.demandSignals.count > 0
                  ? `${district.demandSignals.count} listing (${district.demandSignals.totalQuintals} Quintals available for pickup)`
                  : 'No active listings in this district yet.'}
              </span>
            </div>
            <Link
              href={`/market/sell?district=${encodeURIComponent(district.name)}&ref=drawer`}
              className="px-2.5 py-1.5 bg-[#2E7D32] hover:bg-[#236327] text-white rounded text-xs font-semibold shrink-0 transition-colors"
            >
              List Stubble
            </Link>
          </div>

          {/* Nearest Clean Alternatives Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#5B6675]">
              Nearest Verified Clean Alternatives
            </h3>

            <div className="space-y-2">
              {district.matchedAlternatives.map((alt) => (
                <div
                  key={alt.id}
                  className="p-3 bg-white border border-[#D9DEE5] rounded-lg hover:border-slate-400 transition-colors space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getAlternativeIcon(alt.type)}
                      <span className="font-bold text-xs text-[#1F3A5F]">{alt.name}</span>
                    </div>
                    <span className="text-xs font-semibold text-[#5B6675] bg-slate-100 px-2 py-0.5 rounded">
                      approx. {alt.distanceKm} km
                    </span>
                  </div>

                  <p className="text-[11px] text-[#5B6675]">
                    {getAlternativeTypeLabel(alt.type)} · {alt.district}
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-[#F1F4F9] text-xs">
                    <span className="text-emerald-700 font-semibold">{alt.priceQuote}</span>
                    <span className="text-[#5B6675] font-mono text-[11px]">Ph: {alt.contact}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trilingual Farmer Message Generator */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#5B6675]">
                Farmer Advisory Generator
              </h3>
              {/* Language Pills */}
              <div className="flex gap-1 bg-[#F5F7FA] border border-[#D9DEE5] p-0.5 rounded-md">
                <button
                  onClick={() => setSelectedLang('en')}
                  className={`px-2 py-0.5 text-xs rounded font-medium ${
                    selectedLang === 'en' ? 'bg-[#1F3A5F] text-white' : 'text-[#5B6675] hover:text-[#1B2430]'
                  }`}
                >
                  English
                </button>
                <button
                  onClick={() => setSelectedLang('hi')}
                  className={`px-2 py-0.5 text-xs rounded font-medium ${
                    selectedLang === 'hi' ? 'bg-[#1F3A5F] text-white' : 'text-[#5B6675] hover:text-[#1B2430]'
                  }`}
                >
                  हिन्दी
                </button>
                <button
                  onClick={() => setSelectedLang('pa')}
                  className={`px-2 py-0.5 text-xs rounded font-medium ${
                    selectedLang === 'pa' ? 'bg-[#1F3A5F] text-white' : 'text-[#5B6675] hover:text-[#1B2430]'
                  }`}
                >
                  ਪੰਜਾਬੀ
                </button>
              </div>
            </div>

            {/* Advisory Textarea */}
            <div className="relative">
              <textarea
                readOnly
                rows={7}
                value={currentMessage.message}
                className="w-full bg-[#F5F7FA] border border-[#D9DEE5] rounded-lg p-3 text-xs text-[#1B2430] font-sans leading-relaxed resize-none focus:outline-hidden"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md bg-[#1F3A5F] hover:bg-[#162C49] text-white text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[#1F3A5F]"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied Advisory!' : 'Copy Advisory'}</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-md bg-white border border-[#D9DEE5] hover:bg-slate-50 text-[#1F3A5F] text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[#1F3A5F]"
                title="Print or Save District Action Plan as PDF"
              >
                <Printer className="w-4 h-4" />
                <span>Print Plan</span>
              </button>

              <button
                onClick={() => {
                  const encoded = encodeURIComponent(currentMessage.message);
                  window.open(`https://wa.me/?text=${encoded}`, '_blank');
                }}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-md bg-[#2E7D32] hover:bg-[#236327] text-white text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[#2E7D32]"
              >
                <Share2 className="w-4 h-4" />
                <span>Share on WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
