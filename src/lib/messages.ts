/**
 * KrishiVayu Farmer Advisory Generator
 * Generates actionable, polite farmer notification messages in 3 languages:
 * English, Hindi (हिन्दी), and Punjabi (ਪੰਜਾਬੀ).
 * Includes deep link to the KrishiVayu Residue Marketplace with pre-filled district.
 */

import type { DistrictSummary, FarmerMessageTemplate } from '@/types';

export function getMarketplaceSellUrl(districtName: string): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://krishivayu-dw9o.vercel.app';
  return `${siteUrl}/market/sell?district=${encodeURIComponent(districtName)}&ref=wa`;
}

export function generateFarmerMessages(district: DistrictSummary): FarmerMessageTemplate[] {
  const cbgOrBio = district.matchedAlternatives.find(
    (a) => a.type === 'cbg_plant' || a.type === 'biomass_plant'
  ) || district.matchedAlternatives[0];

  const chc = district.matchedAlternatives.find(
    (a) => a.type === 'machinery_rental'
  );

  const buyer = district.matchedAlternatives.find(
    (a) => a.type === 'residue_buyer'
  );

  const buyerOrBio = cbgOrBio || buyer;
  const sellUrl = getMarketplaceSellUrl(district.name);

  // English
  const enLines = [
    `🌾 KrishiVayu Advisory · District ${district.name}`,
    `Air-Quality Risk Index: ${district.riskScore}/100 (${district.riskLevel.toUpperCase()}) | ${district.fireCount} active fire points detected.`,
    `Please DO NOT burn paddy stubble. Connect directly with your nearest clean alternatives:`,
    buyerOrBio
      ? `• Residue Off-Take: ${buyerOrBio.name} (${buyerOrBio.distanceKm} km away) · ${buyerOrBio.priceQuote ?? 'Competitive price'} · Ph: ${buyerOrBio.contact ?? 'Toll-free 1800'}`
      : `• Residue Off-Take: District Biomass Aggregation Yard`,
    chc
      ? `• In-Situ Machinery Rental: ${chc.name} (${chc.distanceKm} km away) · ${chc.priceQuote ?? 'Subsidized rates'} · Ph: ${chc.contact ?? 'Toll-free 1800'}`
      : `• Machinery Rental: Nearest Custom Hiring Centre (CHC)`,
    `• Sell Stubble for Free: List your straw for local bio-gas & pellet buyers at: ${sellUrl}`,
    `Protect your soil fertility, keep Delhi-NCR air clean, and earn value from residue!`,
  ];

  // Hindi (हिन्दी)
  const hiLines = [
    `🌾 कृषिवायु किसान परामर्श · जिला ${district.name}`,
    `वायु गुणवत्ता जोखिम: ${district.riskScore}/100 (${district.riskLevel === 'critical' ? 'गंभीर' : district.riskLevel === 'high' ? 'उच्च' : 'मध्यम'}) | ${district.fireCount} सक्रिय पराली आग दर्ज।`,
    `कृपया पराली न जलाएं। अपने खेत के सबसे नजदीकी स्वच्छ विकल्पों से संपर्क करें:`,
    buyerOrBio
      ? `• पराली खरीद केंद्र: ${buyerOrBio.name} (${buyerOrBio.distanceKm} किमी दूर) · खरीद दर: ${buyerOrBio.priceQuote ?? 'उचित दर'} · फोन: ${buyerOrBio.contact ?? 'टोल-फ्री'}`
      : `• पराली खरीद केंद्र: जिला बायोमास डिपो`,
    chc
      ? `• इन-सीटू कृषि यंत्र किराया: ${chc.name} (${chc.distanceKm} किमी दूर) · किराया दर: ${chc.priceQuote ?? 'सब्सिडी दर'} · फोन: ${chc.contact ?? 'टोल-फ्री'}`
      : `• कस्टम हायरिंग सेंटर (CHC) से सुपर/हैप्पी सीडर प्राप्त करें`,
    `• पराली बेचें: स्थानीय बायो-गैस व पेलेट खरीदारों के लिए निःशुल्क लिस्ट करें: ${sellUrl}`,
    `भूमि की उर्वरता बचाएं, वायु प्रदूषण रोकें और पराली से अतिरिक्त आय कमाएं!`,
  ];

  // Punjabi (ਪੰਜਾਬੀ)
  const paLines = [
    `🌾 ਕ੍ਰਿਸ਼ੀਵਾਯੂ ਕਿਸਾਨ ਸਲਾਹਕਾਰੀ · ਜ਼ਿਲ੍ਹਾ ${district.name}`,
    `ਹਵਾ ਗੁਣਵੱਤਾ ਜੋਖਮ: ${district.riskScore}/100 (${district.riskLevel === 'critical' ? 'ਗੰਭੀਰ' : district.riskLevel === 'high' ? 'ਉੱਚ' : 'ਦਰਮਿਆਨਾ'}) | ${district.fireCount} ਸਰਗਰਮ ਪਰਾਲੀ ਅੱਗ ਦਰਜ।`,
    `ਕਿਰਪਾ ਕਰਕੇ ਪਰਾਲੀ ਨੂੰ ਅੱਗ ਨਾ ਲਗਾਓ। ਆਪਣੇ ਨੇੜਲੇ ਸਾਫ਼ ਬਦਲਾਂ ਨਾਲ ਸੰਪਰਕ ਕਰੋ:`,
    buyerOrBio
      ? `• ਪਰਾਲੀ ਖਰੀਦ ਕੇਂਦਰ: ${buyerOrBio.name} (${buyerOrBio.distanceKm} ਕਿਲੋਮੀਟਰ ਦੂਰ) · ਖਰੀਦ ਮੁੱਲ: ${buyerOrBio.priceQuote ?? 'ਵਾਜਬ ਰੇਟ'} · ਫੋਨ: ${buyerOrBio.contact ?? 'ਟੋਲ-ਫ੍ਰੀ'}`
      : `• ਪਰਾਲੀ ਖਰੀਦ ਕੇਂਦਰ: ਜ਼ਿਲ੍ਹਾ ਬਾਇਓਮਾਸ ਡਿਪੂ`,
    chc
      ? `• ਖੇਤੀ ਮਸ਼ੀਨਰੀ ਕਿਰਾਇਆ: ${chc.name} (${chc.distanceKm} ਕਿਲੋਮੀਟਰ ਦੂਰ) · ਕਿਰਾਇਆ: ${chc.priceQuote ?? 'ਸਬਸਿਡੀ ਰੇਟ'} · ਫੋਨ: ${chc.contact ?? 'ਟੋਲ-ਫ੍ਰੀ'}`
      : `• ਨੇੜਲੇ ਕਸਟਮ ਹਾਇਰਿੰਗ ਸੈਂਟਰ (CHC) ਤੋਂ ਹੈਪੀ/ਸੁਪਰ ਸੀਡਰ ਲਵੋ`,
    `• ਪਰਾਲੀ ਵੇਚੋ: ਨੇੜਲੇ ਬਾਇਓ-ਗੈਸ ਅਤੇ ਪੈਲੇਟ ਖਰੀਦਦਾਰਾਂ ਲਈ ਮੁਫ਼ਤ ਦਰਜ ਕਰੋ: ${sellUrl}`,
    `ਜ਼ਮੀਨ ਦੀ ਉਪਜਾਊ ਸ਼ਕਤੀ ਬਚਾਓ, ਹਵਾ ਨੂੰ ਸਾਫ਼ ਰੱਖੋ ਅਤੇ ਪਰਾਲੀ ਵੇਚ ਕੇ ਕਮਾਈ ਕਰੋ!`,
  ];

  return [
    { lang: 'en', label: 'English', message: enLines.join('\n') },
    { lang: 'hi', label: 'हिन्दी', message: hiLines.join('\n') },
    { lang: 'pa', label: 'ਪੰਜਾਬੀ', message: paLines.join('\n') },
  ];
}
