const fs = require('fs');
const path = require('path');

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

const csvPath = path.join(__dirname, '..', 'public', 'data', 'cbg_buyer_sources.csv');
const rawCSV = fs.readFileSync(csvPath, 'utf8').trim();
const lines = rawCSV.split('\n').filter(l => l.trim().length > 0);

const header = parseCSVLine(lines[0]);
const idx = (col) => header.indexOf(col);

const alternatives = [];

for (let i = 1; i < lines.length; i++) {
  const cols = parseCSVLine(lines[i]);
  if (cols.length < 10) continue;

  const id = cols[idx('id')];
  const type = cols[idx('type')];
  const name = cols[idx('name')];
  const district = cols[idx('district')];
  const state = cols[idx('state')];
  const lat = parseFloat(cols[idx('lat')]);
  const lon = parseFloat(cols[idx('lon')]);
  const capacity = cols[idx('capacity')];
  const capacityUnit = cols[idx('capacity_unit')];
  const sourceUrl = cols[idx('source_url')];
  const status = cols[idx('status')];
  const notes = cols[idx('notes')];

  alternatives.push({
    id,
    type,
    name,
    lat,
    lon,
    district: district.toUpperCase(),
    state: state.toUpperCase(),
    capacityOrFleet: capacity && capacity !== '(not stated)' ? `${capacity} ${capacityUnit || ''}`.trim() : 'Commercial Off-Take Capacity',
    contact: 'Facility Office / Nodal Officer',
    priceQuote: 'Regulated PEDA / SATAT Benchmark Rate',
    source: sourceUrl || 'PEDA / MNRE / IOCL Official Registry',
    isDemo: false,
    status,
    notes,
    sourceUrl,
  });
}

// Add state Agricultural Department Custom Hiring Centres (CHC Machinery Rental Hubs)
const chcs = [
  {
    id: 'CHC-PB-01',
    type: 'machinery_rental',
    name: 'State CRM Custom Hiring Centre (Sangrur Hub)',
    lat: 30.245,
    lon: 75.844,
    district: 'SANGRUR',
    state: 'PUNJAB',
    capacityOrFleet: '18 Happy Seeders, 8 Super Seeders, 4 Straw Balers',
    contact: '1800-180-1551 (Kisan Call Centre)',
    priceQuote: '₹1,050 / acre subsidized rental',
    source: 'Punjab Agriculture Dept CRM Scheme Hub',
    isDemo: true,
  },
  {
    id: 'CHC-PB-02',
    type: 'machinery_rental',
    name: 'Cooperative Agriculture Service Society CHC (Bathinda)',
    lat: 30.226,
    lon: 75.120,
    district: 'BATHINDA',
    state: 'PUNJAB',
    capacityOrFleet: '14 Super Seeders, 6 Smart Seeders, 3 Balers',
    contact: '1800-180-1551 (Kisan Call Centre)',
    priceQuote: '₹1,100 / acre hire charge',
    source: 'Punjab Cooperative CRM Machinery Bank',
    isDemo: true,
  },
  {
    id: 'CHC-PB-03',
    type: 'machinery_rental',
    name: 'Farmer Producer Co-op Machinery Bank (Ferozepur)',
    lat: 30.933,
    lon: 74.622,
    district: 'FEROZEPUR',
    state: 'PUNJAB',
    capacityOrFleet: '12 Super Seeders, 5 Mulchers, 2 Reversible MB Ploughs',
    contact: '1800-180-1551 (Kisan Call Centre)',
    priceQuote: '₹1,000 / acre hire charge',
    source: 'Punjab Agricultural Machinery Hub',
    isDemo: true,
  },
  {
    id: 'CHC-HR-01',
    type: 'machinery_rental',
    name: 'District CRM Machinery Rental Centre (Karnal)',
    lat: 29.692,
    lon: 76.995,
    district: 'KARNAL',
    state: 'HARYANA',
    capacityOrFleet: '15 Super SMS Combines, 10 Mulchers, 6 Zero-Till Drills',
    contact: '1800-180-2117 (Haryana Agri Toll-Free)',
    priceQuote: '₹1,150 / acre with trained operator',
    source: 'Haryana Agri Dept Crop Residue Management Hub',
    isDemo: true,
  },
  {
    id: 'CHC-HR-02',
    type: 'machinery_rental',
    name: 'Block Agriculture Machinery Bank (Kaithal)',
    lat: 29.801,
    lon: 76.399,
    district: 'KAITHAL',
    state: 'HARYANA',
    capacityOrFleet: '12 Happy Seeders, 6 Rotary Slashers, 4 Super Seeders',
    contact: '1800-180-2117 (Haryana Agri Toll-Free)',
    priceQuote: '₹1,100 / acre machine hire',
    source: 'HAREDA / Haryana CRM Centre',
    isDemo: true,
  },
  {
    id: 'CHC-HR-03',
    type: 'machinery_rental',
    name: 'In-Situ Crop Residue Machinery Hub (Jind)',
    lat: 29.450,
    lon: 76.257,
    district: 'JIND',
    state: 'HARYANA',
    capacityOrFleet: '10 Super Seeders, 4 Straw Choppers, 3 Hydraulic Ploughs',
    contact: '1800-180-2117 (Haryana Agri Toll-Free)',
    priceQuote: '₹1,050 / acre subsidized rate',
    source: 'Haryana CRM Machinery Bank',
    isDemo: true,
  }
];

const combined = [...alternatives, ...chcs];

const outPath = path.join(__dirname, '..', 'public', 'data', 'alternatives.json');
fs.writeFileSync(outPath, JSON.stringify(combined, null, 2), 'utf8');

console.log(`Successfully generated ${combined.length} alternatives (${alternatives.length} real PEDA/MNRE/IOCL facilities with isDemo: false + ${chcs.length} CHC machinery hubs).`);
