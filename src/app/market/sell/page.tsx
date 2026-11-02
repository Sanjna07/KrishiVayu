'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  marketDict,
  PUNJAB_DISTRICTS,
  type MarketLang,
} from '@/lib/marketDict';
import type { StrawForm } from '@/types/market';
import {
  MapPin,
  Scale,
  Calendar,
  Phone,
  ShieldCheck,
  Check,
  Copy,
  Share2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

function SellFlowForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Language state
  const [lang, setLang] = useState<MarketLang>('en');
  const t = marketDict[lang];

  // Pre-filled URL query parameters (from WhatsApp farmer alert deep link)
  const initialDistrict = searchParams.get('district') || 'Sangrur';
  const initialVillage = searchParams.get('village') || '';
  const refSource = searchParams.get('ref');

  // Multi-step wizard state (1, 2, 3, or 'success')
  const [step, setStep] = useState<1 | 2 | 3 | 'success'>(1);

  // Form fields
  const [village, setVillage] = useState(initialVillage);
  const [district, setDistrict] = useState(initialDistrict);
  const [state] = useState('Punjab');
  const [quantity, setQuantity] = useState<number | string>(200);
  const [form, setForm] = useState<StrawForm>('baled');

  // Dates initialized lazily
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 10);
    return d.toISOString().split('T')[0];
  });

  const [askingPrice, setAskingPrice] = useState<number | string>('210');
  const [phone, setPhone] = useState('');

  // Status & Validation states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Created Listing results
  const [createdListingId, setCreatedListingId] = useState<string>('');
  const [createdEditToken, setCreatedEditToken] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Quick quantity chip helper
  const quickQuantities = [100, 200, 350, 500, 1000];

  // Step 1 validation
  const handleStep1Next = () => {
    setErrorMsg(null);
    if (!village.trim()) {
      setErrorMsg(lang === 'pa' ? 'ਕਿਰਪਾ ਕਰਕੇ ਪਿੰਡ ਦਾ ਨਾਂ ਦਰਜ ਕਰੋ।' : lang === 'hi' ? 'कृपया गांव का नाम दर्ज करें।' : 'Please enter your village name.');
      return;
    }
    setStep(2);
  };

  // Step 2 validation
  const handleStep2Next = () => {
    setErrorMsg(null);
    const qty = Number(quantity);
    if (isNaN(qty) || qty < 1) {
      setErrorMsg(lang === 'pa' ? 'ਘੱਟੋ-ਘੱਟ 1 ਕੁਇੰਟਲ ਮਾਤਰਾ ਦਰਜ ਕਰੋ।' : lang === 'hi' ? 'कम से कम 1 क्विंटल मात्रा दर्ज करें।' : 'Quantity must be at least 1 quintal.');
      return;
    }
    setStep(3);
  };

  // Step 3 submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const payload = {
        village: village.trim(),
        district: district.trim(),
        state,
        quantityQuintals: Number(quantity),
        form,
        startDate,
        endDate,
        askingPricePerQuintal: askingPrice ? Number(askingPrice) : undefined,
        phone: phone.trim() ? phone.trim() : undefined,
      };

      const res = await fetch('/api/market/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to publish listing');
      }

      setCreatedListingId(data.listing.id);
      setCreatedEditToken(data.editToken);
      setStep('success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to publish listing';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Management URL generator
  const getManageUrl = () => {
    if (typeof window === 'undefined') return `/market/manage/${createdEditToken}`;
    return `${window.location.origin}/market/manage/${createdEditToken}`;
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getManageUrl());
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleShareWhatsApp = () => {
    const manageUrl = getManageUrl();
    const shareText = encodeURIComponent(
      `🌾 KrishiVayu Listing #${createdListingId}\nVillage: ${village}, ${district}\nQuantity: ${quantity} Quintals (${form})\nManage Listing & View Buyer Offers:\n${manageUrl}`
    );
    window.open(`https://wa.me/?text=${shareText}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#1B2430] flex flex-col">

      {/* Header with Language Selector */}
      <header className="border-b border-[#D9DEE5] bg-white sticky top-0 z-20 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-emerald-400 font-bold text-lg hover:text-emerald-300 transition-colors"
          >
            <span className="text-xl">🌾</span>
            <span>KrishiVayu</span>
          </Link>
          <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
            Marketplace
          </span>
        </div>

        {/* Language Switcher */}
        <div className="flex items-center bg-[#F5F7FA] rounded-lg p-0.5 border border-[#D9DEE5] text-xs">
          <button
            type="button"
            onClick={() => setLang('en')}
            className={`px-2.5 py-1 rounded-md transition-colors min-h-[36px] ${
              lang === 'en' ? 'bg-[#1F3A5F] text-white font-medium' : 'text-[#5B6675] hover:text-[#1B2430]'
            }`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => setLang('hi')}
            className={`px-2.5 py-1 rounded-md transition-colors min-h-[36px] ${
              lang === 'hi' ? 'bg-[#1F3A5F] text-white font-medium' : 'text-[#5B6675] hover:text-[#1B2430]'
            }`}
          >
            हिन्दी
          </button>
          <button
            type="button"
            onClick={() => setLang('pa')}
            className={`px-2.5 py-1 rounded-md transition-colors min-h-[36px] ${
              lang === 'pa' ? 'bg-[#1F3A5F] text-white font-medium' : 'text-[#5B6675] hover:text-[#1B2430]'
            }`}
          >
            ਪੰਜਾਬੀ
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-center">
        {/* Deep-link notification pill if arrived via WhatsApp alert */}
        {refSource === 'wa' && step !== 'success' && (
          <div className="mb-4 bg-emerald-950/60 border border-emerald-500/30 rounded-lg p-3 text-xs text-emerald-300 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Prefilled from your WhatsApp Crop Burn Advisory for District {district}.
            </span>
          </div>
        )}

        {/* Step Progress Indicators */}
        {step !== 'success' && (
          <div className="mb-6">
            <div className="flex items-center justify-between text-xs text-[#5B6675] mb-2 font-medium">
              <span className={step >= 1 ? 'text-emerald-400' : ''}>1. Location</span>
              <span className={step >= 2 ? 'text-emerald-400' : ''}>2. Quantity</span>
              <span className={step >= 3 ? 'text-emerald-400' : ''}>3. Timing & Price</span>
            </div>
            <div className="w-full bg-[#F5F7FA] h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full transition-all duration-300"
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Inline Error Alert */}
        {errorMsg && (
          <div className="mb-5 bg-red-950/60 border border-red-500/40 rounded-xl p-3.5 text-sm text-red-200 flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: WHERE */}
        {step === 1 && (
          <div className="bg-white border border-[#D9DEE5] rounded-2xl p-5 sm:p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-[#1B2430]">{t.step1Title}</h1>
                <p className="text-xs sm:text-sm text-[#5B6675]">{t.step1Desc}</p>
              </div>
            </div>

            <div className="space-y-4 mt-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  {t.districtLabel} <span className="text-emerald-400">*</span>
                </label>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full min-h-[48px] bg-[#F5F7FA] border border-[#D9DEE5] rounded-xl px-3.5 py-2.5 text-[#1B2430] focus:outline-none focus:ring-2 focus:ring-emerald-500 text-base"
                >
                  {PUNJAB_DISTRICTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  {t.villageLabel} <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  placeholder={t.villagePlaceholder}
                  className="w-full min-h-[48px] bg-[#F5F7FA] border border-[#D9DEE5] rounded-xl px-3.5 py-2.5 text-[#1B2430] placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-base"
                />
              </div>

              <div className="pt-4 flex justify-between items-center">
                <Link
                  href="/"
                  className="min-h-[44px] px-4 py-2 text-sm text-[#5B6675] hover:text-[#1B2430] flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Cancel
                </Link>
                <button
                  type="button"
                  onClick={handleStep1Next}
                  className="min-h-[48px] px-6 py-2.5 bg-[#2E7D32] hover:bg-[#236327] text-white font-medium rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/30"
                >
                  <span>{t.nextBtn}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: HOW MUCH */}
        {step === 2 && (
          <div className="bg-white border border-[#D9DEE5] rounded-2xl p-5 sm:p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-[#1B2430]">{t.step2Title}</h1>
                <p className="text-xs sm:text-sm text-[#5B6675]">{t.step2Desc}</p>
              </div>
            </div>

            <div className="space-y-5 mt-6">
              {/* Quantity in Quintals */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  {t.quantityLabel} <span className="text-emerald-400">*</span>
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="number"
                    min="1"
                    max="50000"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full min-h-[48px] bg-[#F5F7FA] border border-[#D9DEE5] rounded-xl px-3.5 py-2.5 text-[#1B2430] font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-[#5B6675] px-2 shrink-0">Quintals</span>
                </div>

                {/* Quick Selection Chips */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {quickQuantities.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setQuantity(q)}
                      className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        Number(quantity) === q
                          ? 'bg-emerald-600 border-emerald-500 text-[#1B2430]'
                          : 'bg-[#F5F7FA] border-[#D9DEE5] text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {q} Qtl
                    </button>
                  ))}
                </div>
              </div>

              {/* Form of Straw */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {t.formLabel} <span className="text-emerald-400">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setForm('baled')}
                    className={`p-3.5 rounded-xl border text-left min-h-[64px] transition-all flex flex-col justify-center ${
                      form === 'baled'
                        ? 'bg-emerald-950/40 border-emerald-500 text-[#1B2430] ring-1 ring-emerald-500'
                        : 'bg-[#F5F7FA]/60 border-[#D9DEE5] text-slate-300 hover:bg-[#F5F7FA]'
                    }`}
                  >
                    <span className="font-semibold text-sm">📦 Baled Bundles</span>
                    <span className="text-xs text-[#5B6675] mt-0.5">{t.formBaled}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm('loose')}
                    className={`p-3.5 rounded-xl border text-left min-h-[64px] transition-all flex flex-col justify-center ${
                      form === 'loose'
                        ? 'bg-emerald-950/40 border-emerald-500 text-[#1B2430] ring-1 ring-emerald-500'
                        : 'bg-[#F5F7FA]/60 border-[#D9DEE5] text-slate-300 hover:bg-[#F5F7FA]'
                    }`}
                  >
                    <span className="font-semibold text-sm">🌾 Loose Straw</span>
                    <span className="text-xs text-[#5B6675] mt-0.5">{t.formLoose}</span>
                  </button>
                </div>
              </div>

              <div className="pt-4 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="min-h-[48px] px-4 py-2 text-sm text-[#5B6675] hover:text-[#1B2430] flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> {t.backBtn}
                </button>
                <button
                  type="button"
                  onClick={handleStep2Next}
                  className="min-h-[48px] px-6 py-2.5 bg-[#2E7D32] hover:bg-[#236327] text-white font-medium rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/30"
                >
                  <span>{t.nextBtn}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: WHEN & PRICE */}
        {step === 3 && (
          <form
            onSubmit={handleSubmit}
            className="bg-white border border-[#D9DEE5] rounded-2xl p-5 sm:p-6 shadow-xl"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-[#1B2430]">{t.step3Title}</h1>
                <p className="text-xs sm:text-sm text-[#5B6675]">{t.step3Desc}</p>
              </div>
            </div>

            <div className="space-y-4 mt-6">
              {/* Availability Window */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {t.startAvailability}
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full min-h-[48px] bg-[#F5F7FA] border border-[#D9DEE5] rounded-xl px-3 py-2 text-[#1B2430] focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {t.endAvailability}
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full min-h-[48px] bg-[#F5F7FA] border border-[#D9DEE5] rounded-xl px-3 py-2 text-[#1B2430] focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>
              </div>

              {/* Price & Benchmark Reference (Q4) */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  {t.priceLabel}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3.5 text-[#5B6675] font-medium">₹</span>
                  <input
                    type="number"
                    min="1"
                    max="5000"
                    placeholder="e.g. 210"
                    value={askingPrice}
                    onChange={(e) => setAskingPrice(e.target.value)}
                    className="w-full min-h-[48px] bg-[#F5F7FA] border border-[#D9DEE5] rounded-xl pl-8 pr-3.5 py-2.5 text-[#1B2430] font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 text-base"
                  />
                </div>
                {/* Benchmark indicator */}
                <div className="mt-1.5 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 rounded-lg p-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                  <span>{t.priceBenchmark}</span>
                </div>
              </div>

              {/* Phone & Privacy Notice */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  {t.optionalPhoneLabel}
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#8892A0] absolute left-3.5 top-4" />
                  <input
                    type="tel"
                    placeholder="10-digit mobile number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full min-h-[48px] bg-[#F5F7FA] border border-[#D9DEE5] rounded-xl pl-10 pr-3.5 py-2.5 text-[#1B2430] placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-base"
                  />
                </div>
                <p className="mt-1.5 text-xs text-cyan-300 bg-cyan-950/40 border border-cyan-500/20 rounded-lg p-2 leading-relaxed">
                  {t.phonePrivacyNotice}
                </p>
              </div>

              <div className="pt-4 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="min-h-[48px] px-4 py-2 text-sm text-[#5B6675] hover:text-[#1B2430] flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> {t.backBtn}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-h-[48px] px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-[#1B2430] font-medium rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/30"
                >
                  {isSubmitting ? t.submittingBtn : t.submitBtn}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* SUCCESS SCREEN */}
        {step === 'success' && (
          <div className="bg-white border border-emerald-500/40 rounded-2xl p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#1B2430] mb-2">{t.successTitle}</h1>
              <p className="text-sm text-slate-300 max-w-md mx-auto mb-6">{t.successSub}</p>
            </div>

            {/* Listing Summary Card */}
            <div className="bg-[#F5F7FA]/80 border border-[#D9DEE5] rounded-xl p-4 mb-6 text-sm space-y-2">
              <div className="flex justify-between items-center text-xs text-[#5B6675]">
                <span>Listing ID:</span>
                <span className="font-mono text-[#1B2430]">{createdListingId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#5B6675]">Location:</span>
                <span className="font-medium text-[#1B2430]">{village}, {district}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#5B6675]">Residue:</span>
                <span className="font-medium text-emerald-400">{quantity} Quintals ({form})</span>
              </div>
            </div>

            {/* Private Management Link Card */}
            <div className="bg-[#F5F7FA] border border-amber-500/30 rounded-xl p-4 sm:p-5 mb-6">
              <div className="flex items-start gap-2.5 mb-3">
                <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-amber-300">Your Private Management Link</h3>
                  <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{t.editLinkNotice}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="min-h-[48px] px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-[#1B2430] font-medium rounded-xl flex items-center justify-center gap-2 transition-colors border border-slate-600"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">{t.copiedBtn}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>{t.copyLinkBtn}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="min-h-[48px] px-4 py-2.5 bg-emerald-700 hover:bg-[#1F3A5F] text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors border border-emerald-600 shadow-md"
                >
                  <Share2 className="w-4 h-4" />
                  <span>{t.saveToWhatsAppBtn}</span>
                </button>
              </div>
            </div>

            {/* Direct Dashboard & Browse Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => router.push(`/market/manage/${createdEditToken}`)}
                className="flex-1 min-h-[48px] px-4 py-3 bg-[#2E7D32] hover:bg-[#236327] text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-900/30"
              >
                <span>{t.openDashboardBtn}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <Link
                href="/market"
                className="min-h-[48px] px-4 py-3 bg-[#F5F7FA] hover:bg-slate-700 text-[#1B2430] font-medium rounded-xl flex items-center justify-center transition-colors border border-[#D9DEE5]"
              >
                {t.browseMarketBtn}
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function SellPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F5F7FA] text-[#5B6675] p-8">Loading...</div>}>
      <SellFlowForm />
    </Suspense>
  );
}
