export interface RegionalCity {
  name: string;
  state: string;
  lat: number;
  lon: number;
  importance: 'major' | 'regional';
}

/**
 * Key administrative, cultural, and industrial cities across Punjab, Haryana, and Delhi NCR.
 * Real geographic coordinates for map labeling and geographic context.
 */
export const MAJOR_REGIONAL_CITIES: RegionalCity[] = [
  // Punjab
  { name: 'Ludhiana', state: 'Punjab', lat: 30.9010, lon: 75.8573, importance: 'major' },
  { name: 'Amritsar', state: 'Punjab', lat: 31.6340, lon: 74.8723, importance: 'major' },
  { name: 'Jalandhar', state: 'Punjab', lat: 31.3260, lon: 75.5762, importance: 'major' },
  { name: 'Patiala', state: 'Punjab', lat: 30.3398, lon: 76.3869, importance: 'major' },
  { name: 'Bathinda', state: 'Punjab', lat: 30.2110, lon: 74.9455, importance: 'major' },
  { name: 'Sangrur', state: 'Punjab', lat: 30.2458, lon: 75.8471, importance: 'regional' },
  { name: 'Hoshiarpur', state: 'Punjab', lat: 31.5273, lon: 75.9115, importance: 'regional' },
  { name: 'Pathankot', state: 'Punjab', lat: 32.2689, lon: 75.6529, importance: 'regional' },
  { name: 'Firozpur', state: 'Punjab', lat: 30.9237, lon: 74.6122, importance: 'regional' },
  { name: 'Mohali', state: 'Punjab', lat: 30.7046, lon: 76.7179, importance: 'regional' },

  // Chandigarh (Capital / Union Territory)
  { name: 'Chandigarh', state: 'Chandigarh', lat: 30.7333, lon: 76.7794, importance: 'major' },

  // Haryana
  { name: 'Ambala', state: 'Haryana', lat: 30.3782, lon: 76.7767, importance: 'major' },
  { name: 'Karnal', state: 'Haryana', lat: 29.6857, lon: 76.9897, importance: 'major' },
  { name: 'Panipat', state: 'Haryana', lat: 29.3909, lon: 76.9635, importance: 'major' },
  { name: 'Kurukshetra', state: 'Haryana', lat: 29.9695, lon: 76.8433, importance: 'regional' },
  { name: 'Sonipat', state: 'Haryana', lat: 28.9931, lon: 77.0194, importance: 'regional' },
  { name: 'Rohtak', state: 'Haryana', lat: 28.8955, lon: 76.6066, importance: 'major' },
  { name: 'Hisar', state: 'Haryana', lat: 29.1492, lon: 75.7217, importance: 'major' },
  { name: 'Sirsa', state: 'Haryana', lat: 29.5349, lon: 75.0367, importance: 'regional' },
  { name: 'Gurugram', state: 'Haryana', lat: 28.4595, lon: 77.0266, importance: 'major' },
  { name: 'Faridabad', state: 'Haryana', lat: 28.4089, lon: 77.3178, importance: 'major' },

  // Delhi NCT
  { name: 'New Delhi', state: 'Delhi', lat: 28.6139, lon: 77.2090, importance: 'major' },
];
