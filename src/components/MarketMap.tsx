'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Listing } from '@/types/market';
import type { PublicListing } from '@/lib/marketSanitizer';
import { MAJOR_REGIONAL_CITIES } from '@/lib/cities';

type MarketMapListing = Listing | PublicListing;

// Coordinates lookup for Punjab districts
const DISTRICT_COORDS: Record<string, [number, number]> = {
  Sangrur: [75.84, 30.24],
  Bathinda: [74.95, 30.21],
  Ludhiana: [75.85, 30.90],
  Barnala: [75.55, 30.38],
  Mansa: [75.39, 29.98],
  Patiala: [76.39, 30.34],
  Firozpur: [74.61, 30.92],
  Faridkot: [74.76, 30.67],
  Moga: [75.17, 30.82],
  'Tarn Taran': [74.92, 31.45],
  Amritsar: [74.87, 31.63],
  Jalandhar: [75.58, 31.33],
  Kapurthala: [75.38, 31.38],
  'Fatehgarh Sahib': [76.40, 30.65],
  Fazilka: [74.03, 30.40],
  Gurdaspur: [75.52, 32.04],
  Hoshiarpur: [75.91, 31.53],
  Muktsar: [74.52, 30.48],
  Rupnagar: [76.53, 30.97],
  'SAS Nagar (Mohali)': [76.72, 30.70],
  'SBS Nagar (Nawanshahr)': [76.12, 31.12],
  Malerkotla: [75.88, 30.52],
};

interface MarketMapProps {
  listings: MarketMapListing[];
  selectedListing: MarketMapListing | null;
  onSelectListing: (listing: MarketMapListing) => void;
}

export function MarketMap({
  listings,
  selectedListing,
  onSelectListing,
}: MarketMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: [75.5, 30.6], // Punjab center
      zoom: 7.2,
      minZoom: 6,
      maxZoom: 14,
      attributionControl: false,
    });

    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');
    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution: '© <a href="https://carto.com/">CARTO</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }),
      'bottom-left'
    );

    map.on('load', async () => {
      // 1. District Boundaries
      try {
        const resp = await fetch('/data/districts.geojson');
        if (resp.ok) {
          const geoData = await resp.json();
          map.addSource('district-polygons', {
            type: 'geojson',
            data: geoData,
          });

          map.addLayer({
            id: 'district-borders',
            type: 'line',
            source: 'district-polygons',
            paint: {
              'line-color': '#CBD5E1',
              'line-width': 1,
            },
          });
        }
      } catch (err) {
        console.warn('District boundaries failed to load:', err);
      }

      // 2. District Center Labels
      const districtFeatures = Object.entries(DISTRICT_COORDS).map(([name, coords]) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: coords },
        properties: { name },
      }));

      map.addSource('district-points', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: districtFeatures,
        },
      });

      map.addLayer({
        id: 'district-labels',
        type: 'symbol',
        source: 'district-points',
        minzoom: 6.0,
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Open Sans Bold', 'Open Sans Regular'],
          'text-size': 10.5,
          'text-offset': [0, 1.2],
          'text-anchor': 'top',
        },
        paint: {
          'text-color': '#5B6675',
          'text-halo-color': '#FFFFFF',
          'text-halo-width': 2,
        },
      });

      // 3. Regional Cities
      const regionalCities = MAJOR_REGIONAL_CITIES.filter(
        (c) => c.state === 'Punjab' || c.state === 'Chandigarh' || c.state === 'Haryana'
      );

      map.addSource('regional-cities', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: regionalCities.map((c) => ({
            type: 'Feature' as const,
            geometry: { type: 'Point' as const, coordinates: [c.lon, c.lat] },
            properties: { name: c.name, state: c.state },
          })),
        },
      });

      map.addLayer({
        id: 'city-points',
        type: 'circle',
        source: 'regional-cities',
        minzoom: 6.0,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 3, 9, 4.5],
          'circle-color': '#1F3A5F',
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#FFFFFF',
        },
      });

      map.addLayer({
        id: 'city-labels',
        type: 'symbol',
        source: 'regional-cities',
        minzoom: 6.0,
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Open Sans Bold', 'Open Sans Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 6, 11, 9, 13],
          'text-offset': [0, -1.2],
          'text-anchor': 'bottom',
        },
        paint: {
          'text-color': '#1F3A5F',
          'text-halo-color': '#FFFFFF',
          'text-halo-width': 2,
        },
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update listing markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Create a marker per listing
    listings.forEach((listing) => {
      const coords = DISTRICT_COORDS[listing.district] || [75.5, 30.6];
      // Jitter slightly so overlapping pins in same district spread out
      const hash = (listing.id || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const jitterLat = ((hash % 10) - 5) * 0.015;
      const jitterLon = (((hash >> 2) % 10) - 5) * 0.015;

      const isSelected = selectedListing?.id === listing.id;

      // Pin DOM Element
      const el = document.createElement('div');
      el.className = 'group cursor-pointer flex flex-col items-center';
      el.innerHTML = `
        <div style="
          background-color: ${isSelected ? '#1F3A5F' : '#2E7D32'};
          color: white;
          border: 2px solid white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          border-radius: 9999px;
          padding: 2px 7px;
          font-size: 11px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 3px;
          transition: transform 0.15s ease;
          transform: ${isSelected ? 'scale(1.15)' : 'scale(1)'};
        ">
          <span>📦</span>
          <span>${listing.quantityQuintals} Q</span>
        </div>
        <div style="
          width: 0; 
          height: 0; 
          border-left: 4px solid transparent;
          border-right: 4px solid transparent;
          border-top: 5px solid ${isSelected ? '#1F3A5F' : '#2E7D32'};
        "></div>
      `;

      el.addEventListener('click', () => {
        onSelectListing(listing);
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([coords[0] + jitterLon, coords[1] + jitterLat])
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [listings, selectedListing, onSelectListing]);

  // Fly to selected listing
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedListing) return;

    const coords = DISTRICT_COORDS[selectedListing.district];
    if (coords) {
      map.flyTo({
        center: coords,
        zoom: 9.5,
        duration: 800,
      });
    }
  }, [selectedListing]);

  return (
    <div className="relative w-full h-full min-h-[420px] bg-[#F5F7FA]">
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
}
