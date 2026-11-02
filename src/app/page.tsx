'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { MainMap } from '@/components/MainMap';
import { DetailDrawer } from '@/components/DetailDrawer';
import { DemoNotice } from '@/components/DemoNotice';
import { Footer } from '@/components/Footer';
import type { MatchesApiResponse, DistrictSummary } from '@/types';
import { getRiskBadgeClasses } from '@/lib/theme';
import { exportToCsv } from '@/lib/csvExport';
import {
  Flame,
  AlertTriangle,
  Wind,
  CheckCircle2,
  Search,
  RefreshCw,
  ChevronRight,
  Database,
  Download,
} from 'lucide-react';

export default function HomePage() {
  const [data, setData] = useState<MatchesApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState<'ALL' | 'PUNJAB' | 'HARYANA'>('ALL');
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictSummary | null>(null);
  const [activeMobileTab, setActiveMobileTab] = useState<'map' | 'list'>('map');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/matches');
      if (!res.ok) throw new Error(`API returned HTTP ${res.status}`);
      const json: MatchesApiResponse = await res.json();
      setData(json);
    } catch (err) {
      console.error('Failed to fetch matches data:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect to KrishiVayu API');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/api/matches')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json: MatchesApiResponse) => {
        if (!active) return;
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to connect to KrishiVayu API');
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  
  // Filtered districts
  const filteredDistricts = useMemo(() => {
    if (!data) return [];
    return data.districts.filter((d) => {
      const matchesSearch =
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.state.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesState = selectedState === 'ALL' || d.state === selectedState;
      return matchesSearch && matchesState;
    });
  }, [data, searchQuery, selectedState]);

  const handleExportDistrictCsv = () => {
    if (!filteredDistricts.length) return;
    const headers = [
      'District Name',
      'State',
      'Risk Score',
      'Risk Level',
      'Active Fires',
      'Distance to NCR (km)',
      'Plume Alignment (%)',
      'Residue Available (Quintals)',
    ];
    const rows = filteredDistricts.map((d) => [
      d.name,
      d.state,
      d.riskScore,
      d.riskLevel,
      d.fireCount,
      d.distanceToDelhiKm,
      Math.round(d.windAlignment * 100),
      d.demandSignals?.totalQuintals ?? 0,
    ]);
    exportToCsv(`KrishiVayu_District_Risk_${new Date().toISOString().slice(0, 10)}`, headers, rows);
  };


  return (
    <div className="flex flex-col min-h-screen bg-[#F5F7FA] text-[#1B2430]">
      <Navbar />
      <DemoNotice allowDismiss />

      {/* Headline Metric Row */}
      <section className="bg-white border-b border-[#D9DEE5] px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 flex-1">
            {/* Metric 1: Hotspots */}
            <div className="flex items-center gap-3 bg-[#F5F7FA] border border-[#D9DEE5] p-2.5 rounded-lg">
              <div className="p-2 rounded-md bg-red-100 text-[#C62828] shrink-0">
                <Flame className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-bold text-[#5B6675] tracking-wider truncate">Hotspots Detected</div>
                <div className="text-base sm:text-lg font-bold text-[#1B2430] flex items-center gap-1.5">
                  {loading ? (
                    <span className="w-10 h-4 bg-slate-200 rounded animate-pulse inline-block" />
                  ) : (
                    <>
                      <span>{data?.totalHotspots ?? 0}</span>
                      <span className="text-[10px] text-[#C62828] font-medium">Active VIIRS</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Metric 2: High Risk Districts */}
            <div className="flex items-center gap-3 bg-[#F5F7FA] border border-[#D9DEE5] p-2.5 rounded-lg">
              <div className="p-2 rounded-md bg-orange-100 text-[#E65100] shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-bold text-[#5B6675] tracking-wider truncate">High Threat Districts</div>
                <div className="text-base sm:text-lg font-bold text-[#1B2430] flex items-center gap-1.5">
                  {loading ? (
                    <span className="w-10 h-4 bg-slate-200 rounded animate-pulse inline-block" />
                  ) : (
                    <>
                      <span>{data?.highRiskDistricts ?? 0}</span>
                      <span className="text-[10px] text-[#E65100] font-medium">(Score ≥ 51)</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Metric 3: Wind Vector */}
            <div className="flex items-center gap-3 bg-[#F5F7FA] border border-[#D9DEE5] p-2.5 rounded-lg">
              <div className="p-2 rounded-md bg-blue-100 text-[#1F3A5F] shrink-0">
                <Wind className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-bold text-[#5B6675] tracking-wider truncate">Prevailing Wind (10m)</div>
                <div className="text-base sm:text-lg font-bold text-[#1B2430] flex items-center gap-1.5 truncate">
                  {loading ? (
                    <span className="w-12 h-4 bg-slate-200 rounded animate-pulse inline-block" />
                  ) : (
                    <>
                      <span>{data?.wind.speedKmh ?? 0} km/h</span>
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                          data?.wind.isTowardsDelhi
                            ? 'text-red-800 border-red-300 bg-red-50'
                            : 'text-slate-700 border-slate-300 bg-slate-100'
                        }`}
                      >
                        {data?.wind.directionCardinal} {data?.wind.isTowardsDelhi ? '→ NCR' : ''}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Metric 4: Alternatives Ready */}
            <div className="flex items-center gap-3 bg-[#F5F7FA] border border-[#D9DEE5] p-2.5 rounded-lg">
              <div className="p-2 rounded-md bg-green-100 text-[#2E7D32] shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-bold text-[#5B6675] tracking-wider truncate">Clean Alternatives</div>
                <div className="text-base sm:text-lg font-bold text-[#1B2430] flex items-center gap-1.5">
                  <span>29 Facilities</span>
                  <span className="text-[10px] font-medium text-[#2E7D32]">CBG & CHCs</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Status Controls */}
          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
            {data?.isUsingSnapshot && (
              <span className="text-[11px] text-amber-800 bg-amber-50 border border-amber-300 px-2 py-1 rounded-md flex items-center gap-1">
                <Database className="w-3.5 h-3.5 text-amber-600" />
                <span>Cached Snapshot ({data.snapshotDate ?? '2026-10-30'})</span>
              </span>
            )}

            <button
              onClick={fetchData}
              disabled={loading}
              aria-label="Refresh live data"
              title="Refresh live data"
              className="p-2 rounded-md bg-white hover:bg-slate-100 border border-[#D9DEE5] text-[#5B6675] hover:text-[#1F3A5F] transition-colors focus-visible:ring-2 focus-visible:ring-[#1F3A5F] disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#1F3A5F]' : ''}`} />
            </button>
          </div>
        </div>
      </section>

      {/* Mobile Tab Switcher */}
      <div className="sm:hidden flex border-b border-[#D9DEE5] bg-white text-xs font-semibold">
        <button
          onClick={() => setActiveMobileTab('map')}
          className={`flex-1 py-2.5 text-center border-b-2 ${
            activeMobileTab === 'map' ? 'border-[#1F3A5F] text-[#1F3A5F]' : 'border-transparent text-[#5B6675]'
          }`}
        >
          Risk Map
        </button>
        <button
          onClick={() => setActiveMobileTab('list')}
          className={`flex-1 py-2.5 text-center border-b-2 ${
            activeMobileTab === 'list' ? 'border-[#1F3A5F] text-[#1F3A5F]' : 'border-transparent text-[#5B6675]'
          }`}
        >
          District Ranking ({filteredDistricts.length})
        </button>
      </div>

      {/* Main Content Workspace */}
      <main className="flex-1 flex flex-col lg:flex-row min-h-[580px] overflow-hidden">
        {/* Left Side: Ranked District List */}
        <aside
          className={`w-full lg:w-96 bg-white border-r border-[#D9DEE5] flex flex-col shrink-0 ${
            activeMobileTab === 'map' ? 'hidden sm:flex' : 'flex'
          }`}
        >
          {/* Search & State Filter Controls */}
          <div className="p-3.5 border-b border-[#D9DEE5] space-y-2 bg-[#F5F7FA]">
            <div className="relative">
              <Search className="w-4 h-4 text-[#8892A0] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search district or state..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-[#D9DEE5] rounded-md pl-9 pr-3 py-1.5 text-xs text-[#1B2430] placeholder-[#8892A0] focus:ring-2 focus:ring-[#1F3A5F] focus:border-[#1F3A5F] outline-hidden"
              />
            </div>

            <div className="flex gap-1.5 text-xs font-medium">
              {(['ALL', 'PUNJAB', 'HARYANA'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedState(s)}
                  className={`flex-1 py-1 rounded-md text-xs font-semibold transition-colors ${
                    selectedState === s
                      ? 'bg-[#1F3A5F] text-white shadow-xs'
                      : 'bg-white border border-[#D9DEE5] text-[#5B6675] hover:text-[#1B2430]'
                  }`}
                >
                  {s === 'ALL' ? 'All Districts' : s}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-[#5B6675] font-medium">
                Showing {filteredDistricts.length} districts
              </span>
              <button
                type="button"
                onClick={handleExportDistrictCsv}
                className="text-xs text-[#1F3A5F] hover:text-[#162C49] font-semibold flex items-center gap-1 hover:underline"
                title="Export filtered districts to safe CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* List Feed */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#E5E9F0]">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : filteredDistricts.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#5B6675] space-y-1">
                <p className="font-semibold text-[#1B2430]">No matching districts found</p>
                <p>Adjust your search query or state filter.</p>
              </div>
            ) : (
              filteredDistricts.map((d) => {
                const isSelected = selectedDistrict?.districtKey === d.districtKey;
                return (
                  <div
                    key={d.districtKey}
                    onClick={() => setSelectedDistrict(d)}
                    className={`p-3 cursor-pointer transition-colors hover:bg-slate-50 flex items-center justify-between ${
                      isSelected ? 'bg-blue-50/70 border-l-4 border-l-[#1F3A5F]' : ''
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-xs text-[#1B2430] truncate">{d.name}</span>
                        <span className="text-[10px] text-[#5B6675]">{d.state}</span>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-[#5B6675]">
                        <span>{d.fireCount} fires</span>
                        <span>·</span>
                        <span>{d.distanceToDelhiKm} km to NCR</span>
                        <span>·</span>
                        <span>{Math.round(d.windAlignment * 100)}% downwind</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-bold border ${getRiskBadgeClasses(
                          d.riskLevel
                        )}`}
                      >
                        {d.riskScore}
                      </span>
                      <ChevronRight className="w-4 h-4 text-[#8892A0]" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Side: Map Canvas */}
        <section
          className={`flex-1 relative ${
            activeMobileTab === 'list' ? 'hidden sm:block' : 'block'
          }`}
        >
          <MainMap
            hotspots={data?.hotspots ?? []}
            districts={data?.districts ?? []}
            selectedDistrict={selectedDistrict}
            onSelectDistrict={(d) => setSelectedDistrict(d)}
          />
        </section>
      </main>

      {/* Drawer */}
      <DetailDrawer
        district={selectedDistrict}
        onClose={() => setSelectedDistrict(null)}
      />

      {/* Footer */}
      <Footer lastUpdated={data?.fetchedAt} />
    </div>
  );
}
