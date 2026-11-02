export type MarketLang = 'en' | 'hi' | 'pa';

export interface MarketDictionary {
  demoNotice: string;
  step1Title: string;
  step1Desc: string;
  step2Title: string;
  step2Desc: string;
  step3Title: string;
  step3Desc: string;
  villageLabel: string;
  villagePlaceholder: string;
  districtLabel: string;
  quantityLabel: string;
  quintalsUnit: string;
  formLabel: string;
  formLoose: string;
  formBaled: string;
  startAvailability: string;
  endAvailability: string;
  priceLabel: string;
  priceBenchmark: string;
  optionalPhoneLabel: string;
  phonePrivacyNotice: string;
  backBtn: string;
  nextBtn: string;
  submitBtn: string;
  submittingBtn: string;
  successTitle: string;
  successSub: string;
  editLinkNotice: string;
  copyLinkBtn: string;
  copiedBtn: string;
  saveToWhatsAppBtn: string;
  openDashboardBtn: string;
  browseMarketBtn: string;
  viewDetails: string;
}

export const marketDict: Record<MarketLang, MarketDictionary> = {
  en: {
    demoNotice: 'Demo Environment · All buyer offers shown are synthetic simulations',
    step1Title: 'Step 1: Farm Location',
    step1Desc: 'Where is the paddy straw located?',
    step2Title: 'Step 2: Stubble Quantity & Form',
    step2Desc: 'How much residue do you have available?',
    step3Title: 'Step 3: Timing & Price',
    step3Desc: 'When can buyers pick it up?',
    villageLabel: 'Village / Tehsil',
    villagePlaceholder: 'e.g. Bhawanigarh, Dhuri',
    districtLabel: 'District',
    quantityLabel: 'Quantity (in Quintals)',
    quintalsUnit: 'Quintals (1 Quintal = 100 kg)',
    formLabel: 'Residue Form',
    formLoose: 'Loose Straw (Combine cut)',
    formBaled: 'Baled Bundles (Ready for loading)',
    startAvailability: 'Available From',
    endAvailability: 'Available Until',
    priceLabel: 'Asking Price (₹ / Quintal, Optional)',
    priceBenchmark: 'CPCB / PEDA Ex-situ Benchmark: ₹180 - ₹220 / quintal',
    optionalPhoneLabel: 'Contact Mobile Number (Optional)',
    phonePrivacyNotice: '🔒 Privacy Guaranteed: Your phone number is NEVER shown publicly. It is only revealed to the buyer whose offer you accept.',
    backBtn: 'Back',
    nextBtn: 'Next Step',
    submitBtn: 'Publish Listing for Free',
    submittingBtn: 'Publishing...',
    successTitle: '🌾 Listing Published Successfully!',
    successSub: 'Nearby bio-gas plants, biomass units, and aggregators can now discover your residue and submit pickup offers.',
    editLinkNotice: 'Save your private management link below. You need this link to view incoming offers and accept a buyer.',
    copyLinkBtn: 'Copy Private Link',
    copiedBtn: 'Link Copied!',
    saveToWhatsAppBtn: 'Send Link to My WhatsApp',
    openDashboardBtn: 'Open Listing Dashboard',
    browseMarketBtn: 'Browse All Listings',
    viewDetails: 'View Details',
  },
  hi: {
    demoNotice: 'डेमो पोर्टल · सभी खरीदार प्रस्ताव सिमुलेशन (डेमो) हैं',
    step1Title: 'चरण 1: खेत का स्थान',
    step1Desc: 'आपकी पराली किस गांव और जिले में है?',
    step2Title: 'चरण 2: पराली की मात्रा और प्रकार',
    step2Desc: 'आपके पास कितनी पराली उपलब्ध है?',
    step3Title: 'चरण 3: समय और मूल्य',
    step3Desc: 'खरीदार कब उठाव कर सकते हैं?',
    villageLabel: 'गांव / तहसील',
    villagePlaceholder: 'उदा. भवानीगढ़, धूरी',
    districtLabel: 'जिला',
    quantityLabel: 'मात्रा (क्विंटल में)',
    quintalsUnit: 'क्विंटल (1 क्विंटल = 100 किग्रा)',
    formLabel: 'पराली का प्रकार',
    formLoose: 'खुली पराली (कंबाइन कट)',
    formBaled: 'गांठें / बेल्ड बंडल (लोडिंग हेतु तैयार)',
    startAvailability: 'उपलब्धता आरंभ तिथि',
    endAvailability: 'उपलब्धता अंतिम तिथि',
    priceLabel: 'अपेक्षित मूल्य (₹ / क्विंटल, वैकल्पिक)',
    priceBenchmark: 'सरकारी / पेडा बेंचमार्क दर: ₹180 - ₹220 / क्विंटल',
    optionalPhoneLabel: 'मोबाइल नंबर (वैकल्पिक)',
    phonePrivacyNotice: '🔒 पूर्ण गोपनीयता: आपका नंबर कभी सार्वजनिक नहीं होगा। यह केवल उसी खरीदार को दिखेगा जिसका प्रस्ताव आप स्वीकार करेंगे।',
    backBtn: 'पीछे',
    nextBtn: 'अगला चरण',
    submitBtn: 'निःशुल्क लिस्टिंग प्रकाशित करें',
    submittingBtn: 'प्रकाशित हो रहा है...',
    successTitle: '🌾 लिस्टिंग सफलतापूर्वक प्रकाशित हुई!',
    successSub: 'नजदीकी बायो-सीएनजी, बायोमास संयंत्र और खरीदार अब आपकी पराली देखकर ऑफर दे सकते हैं।',
    editLinkNotice: 'अपना निजी प्रबंधन लिंक सुरक्षित रखें। ऑफर्स देखने और स्वीकार करने के लिए इसी लिंक की आवश्यकता होगी।',
    copyLinkBtn: 'निजी लिंक कॉपी करें',
    copiedBtn: 'लिंक कॉपी हो गया!',
    saveToWhatsAppBtn: 'व्हाट्सएप पर लिंक सुरक्षित करें',
    openDashboardBtn: 'लिस्टिंग डैशबोर्ड खोलें',
    browseMarketBtn: 'सभी लिस्टिंग देखें',
    viewDetails: 'विवरण देखें',
  },
  pa: {
    demoNotice: 'ਡੈਮੋ ਪੋਰਟਲ · ਦਿਖਾਏ ਗਏ ਸਾਰੇ ਖਰੀਦਦਾਰ ਆਫਰ ਡੈਮੋ ਸਿਮੂਲੇਸ਼ਨ ਹਨ',
    step1Title: 'ਪੜਾਅ 1: ਖੇਤ ਦਾ ਟਿਕਾਣਾ',
    step1Desc: 'ਤੁਹਾਡੀ ਪਰਾਲੀ ਕਿਹੜੇ ਪਿੰਡ ਅਤੇ ਜ਼ਿਲ੍ਹੇ ਵਿੱਚ ਹੈ?',
    step2Title: 'ਪੜਾਅ 2: ਪਰਾਲੀ ਦੀ ਮਾਤਰਾ ਅਤੇ ਰੂਪ',
    step2Desc: 'ਤੁਹਾਡੇ ਕੋਲ ਕਿੰਨੀ ਪਰਾਲੀ ਉਪਲਬਧ ਹੈ?',
    step3Title: 'ਪੜਾਅ 3: ਸਮਾਂ ਅਤੇ ਰੇਟ',
    step3Desc: 'ਖਰੀਦਦਾਰ ਕਦੋਂ ਚੁੱਕ ਸਕਦੇ ਹਨ?',
    villageLabel: 'ਪਿੰਡ / ਤਹਿਸੀਲ',
    villagePlaceholder: 'ਜਿਵੇਂ ਭਵਾਨੀਗੜ੍ਹ, ਧੂਰੀ',
    districtLabel: 'ਜ਼ਿਲ੍ਹਾ',
    quantityLabel: 'ਮਾਤਰਾ (ਕੁਇੰਟਲਾਂ ਵਿੱਚ)',
    quintalsUnit: 'ਕੁਇੰਟਲ (1 ਕੁਇੰਟਲ = 100 ਕਿੱਲੋ)',
    formLabel: 'ਪਰਾਲੀ ਦਾ ਰੂਪ',
    formLoose: 'ਖੁੱਲ੍ਹੀ ਪਰਾਲੀ (ਕੰਬਾਈਨ ਕੱਟ)',
    formBaled: 'ਬੇਲਰ ਦੀਆਂ ਗੱਠਾਂ (ਲੋਡਿੰਗ ਲਈ ਤਿਆਰ)',
    startAvailability: 'ਉਪਲਬਧ ਸ਼ੁਰੂਆਤੀ ਮਿਤੀ',
    endAvailability: 'ਉਪਲਬਧ ਆਖਰੀ ਮਿਤੀ',
    priceLabel: 'ਮੰਗਿਆ ਰੇਟ (₹ / ਕੁਇੰਟਲ, ਮਰਜ਼ੀ ਅਨੁਸਾਰ)',
    priceBenchmark: 'ਸਰਕਾਰੀ / ਪੇਡਾ ਮਿਆਰੀ ਰੇਟ: ₹180 - ₹220 / ਕੁਇੰਟਲ',
    optionalPhoneLabel: 'ਮੋਬਾਈਲ ਨੰਬਰ (ਮਰਜ਼ੀ ਅਨੁਸਾਰ)',
    phonePrivacyNotice: '🔒 ਪੂਰੀ ਗੁਪਤਤਾ: ਤੁਹਾਡਾ ਨੰਬਰ ਜਨਤਕ ਨਹੀਂ ਕੀਤਾ ਜਾਵੇਗਾ। ਸਿਰਫ਼ ਉਸੇ ਖਰੀਦਦਾਰ ਨੂੰ ਮਿਲੇਗਾ ਜਿਸਦਾ ਸੌਦਾ ਤੁਸੀਂ ਮਨਜ਼ੂਰ ਕਰੋਗੇ।',
    backBtn: 'ਪਿੱਛੇ',
    nextBtn: 'ਅਗਲਾ ਪੜਾਅ',
    submitBtn: 'ਮੁਫ਼ਤ ਲਿਸਟਿੰਗ ਦਰਜ ਕਰੋ',
    submittingBtn: 'ਦਰਜ ਹੋ ਰਿਹਾ ਹੈ...',
    successTitle: '🌾 ਲਿਸਟਿੰਗ ਸਫ਼ਲਤਾਪੂਰਵਕ ਦਰਜ ਹੋ ਗਈ!',
    successSub: 'ਨੇੜਲੇ ਬਾਇਓ-ਸੀਐਨਜੀ ਪਲਾਂਟ, ਪੈਲੇਟ ਯੂਨਿਟ ਅਤੇ ਵਪਾਰੀ ਹੁਣ ਤੁਹਾਡੀ ਪਰਾਲੀ ਦੇਖ ਕੇ ਆਫਰ ਭੇਜ ਸਕਦੇ ਹਨ।',
    editLinkNotice: 'ਆਪਣਾ ਨਿੱਜੀ ਪ੍ਰਬੰਧਨ ਲਿੰਕ ਸਾਂਭ ਕੇ ਰੱਖੋ। ਆਫਰ ਦੇਖਣ ਅਤੇ ਮਨਜ਼ੂਰ ਕਰਨ ਲਈ ਇਸ ਲਿੰਕ ਦੀ ਲੋੜ ਪਵੇਗੀ।',
    copyLinkBtn: 'ਨਿੱਜੀ ਲਿੰਕ ਕਾਪੀ ਕਰੋ',
    copiedBtn: 'ਲਿੰਕ ਕਾਪੀ ਹੋ ਗਿਆ!',
    saveToWhatsAppBtn: 'ਵ੍ਹਟਸਐਪ ਤੇ ਲਿੰਕ ਸਾਂਭੋ',
    openDashboardBtn: 'ਲਿਸਟਿੰਗ ਡੈਸ਼ਬੋਰਡ ਖੋਲ੍ਹੋ',
    browseMarketBtn: 'ਸਾਰੀਆਂ ਲਿਸਟਿੰਗਾਂ ਦੇਖੋ',
    viewDetails: 'ਵੇਰਵੇ ਦੇਖੋ',
  },
};

export const PUNJAB_DISTRICTS = [
  'Sangrur',
  'Bathinda',
  'Ludhiana',
  'Barnala',
  'Mansa',
  'Patiala',
  'Firozpur',
  'Faridkot',
  'Moga',
  'Tarn Taran',
  'Amritsar',
  'Jalandhar',
  'Kapurthala',
  'Fatehgarh Sahib',
  'Fazilka',
  'Gurdaspur',
  'Hoshiarpur',
  'Muktsar',
  'Rupnagar',
  'SAS Nagar (Mohali)',
  'SBS Nagar (Nawanshahr)',
  'Malerkotla',
];
