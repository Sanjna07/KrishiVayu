'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Alert & Match', labelHi: 'अलर्ट व विकल्प', labelPa: 'ਅਲਰਟ ਅਤੇ ਬਦਲ' },
  { href: '/market', label: 'Residue Market', labelHi: 'पराली बाजार', labelPa: 'ਪਰਾਲੀ ਬਾਜ਼ਾਰ' },
  { href: '/trends', label: 'Historical Trends', labelHi: 'ऐतिहासिक रुझान', labelPa: 'ਇਤਿਹਾਸਕ ਰੁਝਾਨ' },
];

export function Navbar() {
  const path = usePathname();
  const [lang, setLang] = useState<'en' | 'hi' | 'pa'>(() => {
    if (typeof window === 'undefined') return 'en';
    try {
      const saved = localStorage.getItem('krishivayu_lang');
      if (saved === 'hi' || saved === 'pa') return saved;
    } catch {
      // ignore
    }
    return 'en';
  });

  const handleLangChange = (newLang: 'en' | 'hi' | 'pa') => {
    setLang(newLang);
    try {
      localStorage.setItem('krishivayu_lang', newLang);
      window.dispatchEvent(new CustomEvent('krishivayu-lang-changed', { detail: newLang }));
    } catch {
      // ignore
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#D9DEE5] shadow-xs">
      {/* Tricolor Government Portal Accent Bar */}
      <div className="h-1 w-full grid grid-cols-3">
        <div className="bg-[#FF9933]" />
        <div className="bg-[#FFFFFF]" />
        <div className="bg-[#138808]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Logo */}
          <Link href="/" className="flex items-center gap-3 group focus-visible:ring-2 focus-visible:ring-[#1F3A5F] rounded-md p-1">
            <span className="text-2xl" role="img" aria-label="Rice Paddy">🌾</span>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-[#1F3A5F] tracking-tight group-hover:text-[#162C49]">
                  KrishiVayu
                </span>
                <span className="text-xs text-[#5B6675] font-medium hidden sm:inline">
                  (कृषिवायु)
                </span>
              </div>
              <span className="text-[11px] text-[#5B6675] hidden md:inline leading-none">
                Burn Alert to Clean Residue Market
              </span>
            </div>
          </Link>

          {/* Underlined Tab Navigation */}
          <nav className="flex items-center gap-1 sm:gap-2 h-full" aria-label="Primary Portal Navigation">
            {LINKS.map((l) => {
              const active = path === l.href;
              const displayLabel = lang === 'hi' ? l.labelHi : lang === 'pa' ? l.labelPa : l.label;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`h-full flex items-center px-3 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors ${
                    active
                      ? 'border-[#1F3A5F] text-[#1F3A5F]'
                      : 'border-transparent text-[#5B6675] hover:text-[#1B2430] hover:border-[#D9DEE5]'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  {displayLabel}
                </Link>
              );
            })}
          </nav>

          {/* Site-wide Language Switcher & Subtle Feed Status */}
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-[#5B6675] border-r border-[#D9DEE5] pr-3">
              <span className="w-2 h-2 rounded-full bg-[#2E7D32]" />
              <span>NASA VIIRS · Open-Meteo</span>
            </div>

            <div className="flex items-center bg-[#F5F7FA] border border-[#D9DEE5] rounded-md p-0.5 text-xs font-medium" role="group" aria-label="Language selection">
              <button
                type="button"
                onClick={() => handleLangChange('en')}
                className={`px-2 py-1 rounded transition-colors ${
                  lang === 'en'
                    ? 'bg-white text-[#1F3A5F] font-bold shadow-xs'
                    : 'text-[#5B6675] hover:text-[#1B2430]'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => handleLangChange('hi')}
                className={`px-2 py-1 rounded transition-colors ${
                  lang === 'hi'
                    ? 'bg-white text-[#1F3A5F] font-bold shadow-xs'
                    : 'text-[#5B6675] hover:text-[#1B2430]'
                }`}
              >
                हिन्दी
              </button>
              <button
                type="button"
                onClick={() => handleLangChange('pa')}
                className={`px-2 py-1 rounded transition-colors ${
                  lang === 'pa'
                    ? 'bg-white text-[#1F3A5F] font-bold shadow-xs'
                    : 'text-[#5B6675] hover:text-[#1B2430]'
                }`}
              >
                ਪੰਜਾਬੀ
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
