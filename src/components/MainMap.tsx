'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { FirmsHotspot, DistrictSummary } from '@/types';
import { DELHI_COORDS } from '@/lib/geo';
import { MAJOR_REGIONAL_CITIES } from '@/lib/cities';

interface MainMapProps {
  hotspots: FirmsHotspot[];
  districts: DistrictSummary[];
  selectedDistrict: DistrictSummary | null;
  onSelectDistrict: (district: DistrictSummary) => void;
}

const ALIASES: Record<string, string> = {
  gurugram: 'gurgaon',
  sonipat: 'sonepat',
  sbsnagar: 'nawanshehar',
  nawanshahr: 'nawanshehar',
  firozepur: 'firozpur',
  sasnagar: 'rupnagar',
  mohali: 'rupnagar',
  tarntaran: 'amritsar',
  muktsarsahib: 'muktsar',
  malerkotla: 'sangrur',
  barnala: 'sangrur',
  fazilka: 'firozpur',
  pathankot: 'gurdaspur',
  charkhidadri: 'bhiwani',
  palwal: 'faridabad',
  mewat: 'gurgaon',
};

function normalizeName(name: string, state?: string): string {
  if (state?.toUpperCase() === 'DELHI') return 'delhi';
  const clean = name.toLowerCase().replace(/[^a-z]/g, '');
  return ALIASES[clean] || clean;
}

export function MainMap({
  hotspots,
  districts,
  selectedDistrict,
  onSelectDistrict,
}: MainMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);

  // Layer toggles
  const [showHotspots, setShowHotspots] = useState(true);
  const [showPolygons, setShowPolygons] = useState(true);
  const [showDistricts, setShowDistricts] = useState(true);
  const [showCities, setShowCities] = useState(true);
  const [showDelhi, setShowDelhi] = useState(true);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: [76.0, 29.9],
      zoom: 7.2,
      minZoom: 5.5,
      maxZoom: 15,
      attributionControl: false,
    });

    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');
    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution: '© <a href="https://carto.com/" target="_blank">CARTO</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
      }),
      'bottom-left'
    );

    map.on('load', async () => {
      // 1. Delhi point
      map.addSource('delhi-point', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [DELHI_COORDS.lon, DELHI_COORDS.lat] },
              properties: { name: 'Central Delhi (Target Receptor)' },
            },
          ],
        },
      });

      map.addLayer({
        id: 'delhi-glow',
        type: 'circle',
        source: 'delhi-point',
        paint: {
          'circle-radius': 16,
          'circle-color': '#1F3A5F',
          'circle-opacity': 0.15,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#1F3A5F',
        },
      });

      map.addLayer({
        id: 'delhi-inner',
        type: 'circle',
        source: 'delhi-point',
        paint: {
          'circle-radius': 6,
          'circle-color': '#1F3A5F',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#FFFFFF',
        },
      });

      // 2. Fetch District GeoJSON
      try {
        const resp = await fetch('/data/districts.geojson');
        if (resp.ok) {
          const geoData = await resp.json();

          map.addSource('district-polygons', {
            type: 'geojson',
            data: geoData,
          });

          // Polygon Fill layer
          map.addLayer({
            id: 'district-fills',
            type: 'fill',
            source: 'district-polygons',
            paint: {
              'fill-color': '#D9DEE5',
              'fill-opacity': 0.25,
            },
          });

          // Polygon Border layer
          map.addLayer({
            id: 'district-borders',
            type: 'line',
            source: 'district-polygons',
            paint: {
              'line-color': '#8892A0',
              'line-width': 1,
            },
          });

          // Hover interaction on polygons
          map.on('mousemove', 'district-fills', (e) => {
            if (!e.features || !e.features[0]) return;
            map.getCanvas().style.cursor = 'pointer';
            const f = e.features[0];
            const geoDistName = (f.properties?.district || '') as string;
            const normGeo = normalizeName(geoDistName);

            // Find matching district summary from props
            const found = districts.find(
              (d) => normalizeName(d.name, d.state) === normGeo || normGeo.includes(normalizeName(d.name, d.state))
            );

            if (found) {
              const html = `
                <div style="font-family: inherit; font-size: 12px; line-height: 1.4; color: #1B2430; padding: 2px;">
                  <div style="font-weight: 700; color: #1F3A5F; font-size: 13px; border-bottom: 1px solid #E5E9F0; padding-bottom: 3px; margin-bottom: 4px;">
                    ${found.name} (${found.state})
                  </div>
                  <div style="display: flex; justify-content: space-between; gap: 12px; margin-bottom: 2px;">
                    <span style="color: #5B6675;">Risk Score:</span>
                    <strong style="color: ${found.riskScore >= 75 ? '#C62828' : found.riskScore >= 51 ? '#E65100' : '#2E7D32'};">${found.riskScore}/100 (${found.riskLevel.toUpperCase()})</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between; gap: 12px; margin-bottom: 2px;">
                    <span style="color: #5B6675;">Active Fires:</span>
                    <strong>${found.fireCount}</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between; gap: 12px; margin-bottom: 2px;">
                    <span style="color: #5B6675;">Distance to NCR:</span>
                    <span>${found.distanceToDelhiKm} km</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; gap: 12px;">
                    <span style="color: #5B6675;">Downwind Vector:</span>
                    <span>${Math.round(found.windAlignment * 100)}%</span>
                  </div>
                </div>
              `;
              if (!popupRef.current) {
                popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false });
              }
              popupRef.current.setLngLat(e.lngLat).setHTML(html).addTo(map);
            }
          });

          map.on('mouseleave', 'district-fills', () => {
            map.getCanvas().style.cursor = '';
            if (popupRef.current) popupRef.current.remove();
          });

          map.on('click', 'district-fills', (e) => {
            if (!e.features || !e.features[0]) return;
            const geoDistName = (e.features[0].properties?.district || '') as string;
            const normGeo = normalizeName(geoDistName);
            const found = districts.find(
              (d) => normalizeName(d.name, d.state) === normGeo || normGeo.includes(normalizeName(d.name, d.state))
            );
            if (found) {
              onSelectDistrict(found);
            }
          });
        }
      } catch (err) {
        console.warn('District polygons could not be loaded:', err);
      }

      // 3. Hotspots Source
      map.addSource('hotspots-data', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });

      // Hotspots points layer
      map.addLayer({
        id: 'hotspot-points',
        type: 'circle',
        source: 'hotspots-data',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 2.5, 9, 4, 12, 7],
          'circle-color': '#E65100',
          'circle-stroke-width': 0.75,
          'circle-stroke-color': '#FFFFFF',
          'circle-opacity': 0.85,
        },
      });

      // 4. District Centroids Source
      map.addSource('districts-data', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });

      map.addLayer({
        id: 'district-markers',
        type: 'circle',
        source: 'districts-data',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 4, 9, 7, 12, 10],
          'circle-color': [
            'case',
            ['>=', ['get', 'riskScore'], 75], '#C62828',
            ['>=', ['get', 'riskScore'], 51], '#E65100',
            ['>=', ['get', 'riskScore'], 26], '#F9A825',
            '#2E7D32'
          ],
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#FFFFFF',
        },
      });

      map.addLayer({
        id: 'district-labels',
        type: 'symbol',
        source: 'districts-data',
        minzoom: 5.5,
        layout: {
          'text-field': ['concat', ['get', 'name'], ' (', ['to-string', ['get', 'riskScore']], ')'],
          'text-font': ['Open Sans Bold', 'Open Sans Regular'],
          'text-size': 11,
          'text-offset': [0, 1.2],
          'text-anchor': 'top',
        },
        paint: {
          'text-color': '#1B2430',
          'text-halo-color': '#FFFFFF',
          'text-halo-width': 2,
        },
      });

      // 5. Regional Cities Source & Layers
      map.addSource('cities-data', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: MAJOR_REGIONAL_CITIES.map((c) => ({
            type: 'Feature' as const,
            geometry: { type: 'Point' as const, coordinates: [c.lon, c.lat] },
            properties: { name: c.name, state: c.state, importance: c.importance },
          })),
        },
      });

      map.addLayer({
        id: 'city-markers',
        type: 'circle',
        source: 'cities-data',
        minzoom: 5.5,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 3.5, 9, 5, 12, 7],
          'circle-color': '#1F3A5F',
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#FFFFFF',
        },
      });

      map.addLayer({
        id: 'city-labels',
        type: 'symbol',
        source: 'cities-data',
        minzoom: 5.5,
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

      map.on('click', 'city-markers', (e) => {
        if (!e.features || !e.features[0]) return;
        const cityName = e.features[0].properties?.name;
        const stateName = e.features[0].properties?.state;
        const html = `
          <div style="font-family: inherit; font-size: 12px; line-height: 1.4; color: #1B2430; padding: 2px;">
            <div style="font-weight: 700; color: #1F3A5F; font-size: 13px; border-bottom: 1px solid #E5E9F0; padding-bottom: 3px; margin-bottom: 4px;">
              ${cityName}
            </div>
            <div style="color: #5B6675;">State: <strong>${stateName}</strong></div>
            <div style="color: #5B6675; margin-top: 2px;">Regional Urban / Monitoring Node</div>
          </div>
        `;
        if (!popupRef.current) {
          popupRef.current = new maplibregl.Popup({ closeButton: true });
        }
        popupRef.current.setLngLat(e.lngLat).setHTML(html).addTo(map);
      });

      map.on('click', 'district-markers', (e) => {
        if (!e.features || !e.features[0]) return;
        const distName = e.features[0].properties?.name;
        const found = districts.find((d) => d.name === distName);
        if (found) onSelectDistrict(found);
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update hotspot points
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const source = map.getSource('hotspots-data') as maplibregl.GeoJSONSource | undefined;
    if (!source) return;

    const features = hotspots.map((h) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [h.longitude, h.latitude] },
      properties: { frp: h.frp, confidence: h.confidence, time: h.acq_time },
    }));

    source.setData({ type: 'FeatureCollection', features });
  }, [hotspots]);

  // Update district data & polygon colors
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const source = map.getSource('districts-data') as maplibregl.GeoJSONSource | undefined;
    if (source) {
      const features = districts.map((d) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [d.lon, d.lat] },
        properties: { name: d.name, riskScore: d.riskScore, riskLevel: d.riskLevel, fireCount: d.fireCount },
      }));
      source.setData({ type: 'FeatureCollection', features });
    }

    // Colorize district polygon fills based on live district scores
    if (map.getLayer('district-fills')) {
      const matchExpr: (string | number | string[])[] = ['match', ['get', 'district']];
      for (const d of districts) {
        const norm = normalizeName(d.name, d.state);
        const color =
          d.riskScore >= 75
            ? 'rgba(198, 40, 40, 0.35)'
            : d.riskScore >= 51
            ? 'rgba(230, 81, 0, 0.30)'
            : d.riskScore >= 26
            ? 'rgba(249, 168, 37, 0.25)'
            : 'rgba(46, 125, 50, 0.20)';
        matchExpr.push(d.name, color);
        // Also push normalized variants
        if (norm !== d.name.toLowerCase()) {
          matchExpr.push(norm, color);
        }
      }
      matchExpr.push('rgba(217, 222, 229, 0.2)'); // fallback

      try {
        map.setPaintProperty('district-fills', 'fill-color', matchExpr as unknown as maplibregl.ExpressionSpecification);
      } catch {
        // ignore match syntax if features empty
      }
    }
  }, [districts]);

  // Fly to selected district
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedDistrict) return;
    map.flyTo({
      center: [selectedDistrict.lon, selectedDistrict.lat],
      zoom: 8.8,
      duration: 800,
    });
  }, [selectedDistrict]);

  // Toggle layer visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    if (map.getLayer('hotspot-points')) {
      map.setLayoutProperty('hotspot-points', 'visibility', showHotspots ? 'visible' : 'none');
    }
    if (map.getLayer('district-fills')) {
      map.setLayoutProperty('district-fills', 'visibility', showPolygons ? 'visible' : 'none');
    }
    if (map.getLayer('district-borders')) {
      map.setLayoutProperty('district-borders', 'visibility', showPolygons ? 'visible' : 'none');
    }
    if (map.getLayer('district-markers')) {
      map.setLayoutProperty('district-markers', 'visibility', showDistricts ? 'visible' : 'none');
    }
    if (map.getLayer('district-labels')) {
      map.setLayoutProperty('district-labels', 'visibility', showDistricts ? 'visible' : 'none');
    }
    if (map.getLayer('city-markers')) {
      map.setLayoutProperty('city-markers', 'visibility', showCities ? 'visible' : 'none');
    }
    if (map.getLayer('city-labels')) {
      map.setLayoutProperty('city-labels', 'visibility', showCities ? 'visible' : 'none');
    }
    if (map.getLayer('delhi-glow') && map.getLayer('delhi-inner')) {
      map.setLayoutProperty('delhi-glow', 'visibility', showDelhi ? 'visible' : 'none');
      map.setLayoutProperty('delhi-inner', 'visibility', showDelhi ? 'visible' : 'none');
    }
  }, [showHotspots, showPolygons, showDistricts, showCities, showDelhi]);

  return (
    <div className="relative w-full h-full min-h-[460px] bg-[#F5F7FA]">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Government Portal Map Legend & Layer Controls */}
      <div className="absolute top-3 left-3 z-10 bg-white/95 backdrop-blur-xs border border-[#D9DEE5] rounded-md p-3 shadow-xs text-xs max-w-xs space-y-2.5">
        <div className="font-bold text-[#1F3A5F] flex items-center justify-between border-b border-[#E5E9F0] pb-1.5">
          <span>Map Layers & Legend</span>
        </div>

        {/* Layer Toggles */}
        <div className="space-y-1.5 border-b border-[#E5E9F0] pb-2 text-[11px]">
          <label className="flex items-center gap-2 cursor-pointer text-[#1B2430]">
            <input
              type="checkbox"
              checked={showPolygons}
              onChange={(e) => setShowPolygons(e.target.checked)}
              className="rounded text-[#1F3A5F] focus:ring-[#1F3A5F]"
            />
            <span>District Risk Polygons</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-[#1B2430]">
            <input
              type="checkbox"
              checked={showDistricts}
              onChange={(e) => setShowDistricts(e.target.checked)}
              className="rounded text-[#1F3A5F] focus:ring-[#1F3A5F]"
            />
            <span>District Risk Badges & Scores</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-[#1B2430]">
            <input
              type="checkbox"
              checked={showCities}
              onChange={(e) => setShowCities(e.target.checked)}
              className="rounded text-[#1F3A5F] focus:ring-[#1F3A5F]"
            />
            <span>Major Regional Cities</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-[#1B2430]">
            <input
              type="checkbox"
              checked={showHotspots}
              onChange={(e) => setShowHotspots(e.target.checked)}
              className="rounded text-[#1F3A5F] focus:ring-[#1F3A5F]"
            />
            <span>Thermal Hotspots (VIIRS)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-[#1B2430]">
            <input
              type="checkbox"
              checked={showDelhi}
              onChange={(e) => setShowDelhi(e.target.checked)}
              className="rounded text-[#1F3A5F] focus:ring-[#1F3A5F]"
            />
            <span>Delhi Receptor Zone</span>
          </label>
        </div>

        {/* Risk Level Color Palette */}
        <div className="space-y-1 text-[11px]">
          <span className="font-semibold text-[#5B6675] block">Risk Prioritization</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-[#C62828] shrink-0" />
            <span className="text-[#1B2430]">Critical Risk (Score ≥ 75)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-[#E65100] shrink-0" />
            <span className="text-[#1B2430]">High Risk (Score 51 - 74)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-[#F9A825] shrink-0" />
            <span className="text-[#1B2430]">Moderate Risk (Score 26 - 50)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-[#2E7D32] shrink-0" />
            <span className="text-[#1B2430]">Low Risk (Score 0 - 25)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
