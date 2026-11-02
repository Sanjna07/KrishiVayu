/**
 * KrishiVayu Shared Typed Contracts
 * Strictly verified data models for NASA FIRMS, Wind, Risk Heuristic & Clean Alternatives.
 */

export type AlternativeType =
  | 'residue_buyer'
  | 'biomass_plant'
  | 'cbg_plant'
  | 'machinery_rental';

export interface Alternative {
  id: string;
  type: AlternativeType;
  name: string;
  lat: number;
  lon: number;
  district: string;
  state: string;
  capacityOrFleet?: string;
  contact?: string;
  priceQuote?: string;
  source: string;
  isDemo: boolean;
  status?: string;
  sourceUrl?: string;
  notes?: string;
}

export interface MatchedAlternative extends Alternative {
  distanceKm: number;
}

export interface FirmsHotspot {
  id: string;
  latitude: number;
  longitude: number;
  brightness: number; // Brightness temperature I-4 (Kelvin)
  confidence: 'low' | 'nominal' | 'high' | string;
  acq_date: string; // YYYY-MM-DD
  acq_time: string; // HHMM UTC
  satellite: string; // 'SNPP' | 'NOAA20' | 'MODIS'
  frp: number; // Fire Radiative Power (MW)
  daynight: 'D' | 'N';
  state?: string;
  district?: string;
}

export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';

export interface DistrictSummary {
  districtKey: string;
  name: string;
  state: string;
  lat: number;
  lon: number;
  fireCount: number;
  totalFrp: number;
  avgFrp: number;
  distanceToDelhiKm: number;
  bearingToDelhiDeg: number;
  windAlignment: number; // 0 (blowing away) to 1.0 (blowing directly toward Delhi)
  riskScore: number; // 0..100 heuristic
  riskLevel: RiskLevel;
  matchedAlternatives: MatchedAlternative[];
  demandSignals?: {
    count: number;
    totalQuintals: number;
  };
}

export interface WindData {
  speedKmh: number;
  directionDeg: number; // Direction wind is blowing FROM (0-360)
  directionCardinal: string; // e.g. "NW", "WNW"
  isTowardsDelhi: boolean;
  alignmentScore: number; // Heuristic alignment towards Delhi for region
  timestamp: string;
  source: string;
  isFallback: boolean;
}

export interface MatchesApiResponse {
  hotspots: FirmsHotspot[];
  totalHotspots: number;
  highRiskDistricts: number;
  districts: DistrictSummary[];
  wind: WindData;
  fetchedAt: string;
  isUsingSnapshot: boolean;
  snapshotDate?: string;
}

export interface FarmerMessageTemplate {
  lang: 'en' | 'hi' | 'pa';
  label: string;
  message: string;
}
