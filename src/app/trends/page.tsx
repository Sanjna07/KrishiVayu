'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { exportToCsv } from '@/lib/csvExport';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Download, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';

// ─── constants ────────────────────────────────────────────────────────────────

const STATE_META: Record<string, { label: string; color: string }> = {
  PUNJAB:         { label: 'Punjab',          color: '#1F3A5F' },
  HARYANA:        { label: 'Haryana',         color: '#E65100' },
  UTTAR_PRADESH:  { label: 'Uttar Pradesh',   color: '#00897B' },
  MADHYA_PRADESH: { label: 'Madhya Pradesh',  color: '#7B1FA2' },
  RAJASTHAN:      { label: 'Rajasthan',       color: '#F9A825' },
  DELHI:          { label: 'Delhi',           color: '#C62828' },
};



// ─── types ────────────────────────────────────────────────────────────────────

interface CreamsData {
  state_totals: Record<string, Record<string, number>>;
  districts:    Record<string, { name: string; lat: number; lon: number; [y: string]: number | string }[]>;
}

interface FirmsResult {
  counts:     Record<string, number>;
  frp_sum:    Record<string, number>;
  total:      number;
  days:       number;
  date_range: { from: string; to: string } | null;
  fetched_at: string;
  source:     string;
  error?:     string;
}

// ─── shared tooltip ───────────────────────────────────────────────────────────

const Tip = ({ active, payload, label }: { active?: boolean; payload?: { color: string; name: string; value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#D9DEE5] rounded-lg px-3 py-2 text-xs shadow-md">
      <div className="text-[#1F3A5F] mb-1.5 font-bold">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 py-0.5">
          <div className="w-2.5 h-2.5 rounded-xs shrink-0" style={{ background: p.color }} />
          <span className="text-[#5B6675]">{STATE_META[p.name]?.label ?? p.name}:</span>
          <span className="ml-auto pl-3 text-[#1B2430] font-bold">{p.value.toLocaleString()} fires</span>
        </div>
      ))}
    </div>
  );
};

// ─── FIRMS live panel ────────────────────────────────────────────────────────

interface FirmsPanelProps {
  season:    'paddy' | 'wheat';
  data:      FirmsResult | null;
  loading:   boolean;
  noKey:     boolean;
  days:      number;
  onDays:    (d: number) => void;
  onRefresh: () => void;
}

function FirmsPanel({ season, data, loading, noKey, days, onDays, onRefresh }: FirmsPanelProps) {
  const activeLabel = season === 'wheat' ? 'Wheat (Rabi) · Apr–Jun' : 'Paddy (Kharif) · Sep–Nov';

  if (noKey) {
    return (
      <div className="border border-dashed border-[#D9DEE5] bg-white rounded-lg p-3 text-xs flex items-center justify-between text-[#5B6675]">
        <div>
          <span className="font-bold text-[#1F3A5F] block">NASA FIRMS Satellite Integration</span>
          <span>Using ICAR-IARI CREAMS historical data benchmark. Connect free FIRMS API key in .env.local for live telemetry.</span>
        </div>
        <span className="text-[11px] font-semibold text-[#5B6675] bg-slate-100 px-2 py-1 rounded">
          {activeLabel}
        </span>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#D9DEE5] rounded-lg p-3 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-2.5">
        <div className="w-2.5 h-2.5 rounded-full bg-[#2E7D32]" />
        <div>
          <span className="font-bold text-[#1F3A5F] block">NASA FIRMS Active Telemetry</span>
          <span className="text-[11px] text-[#5B6675]">{activeLabel} · {data?.source || 'VIIRS SNPP'}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex bg-[#F5F7FA] border border-[#D9DEE5] rounded-md p-0.5 text-xs font-medium">
          {[1, 3, 5].map((d) => (
            <button
              key={d}
              onClick={() => onDays(d)}
              className={`px-2 py-0.5 rounded transition-colors ${
                days === d ? 'bg-[#1F3A5F] text-white font-bold' : 'text-[#5B6675] hover:text-[#1B2430]'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-[#D9DEE5] rounded-md text-xs font-semibold text-[#1F3A5F] hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>
    </div>
  );
}

// ─── Year selector pills ─────────────────────────────────────────────────────

function YearPills({
  allYears,
  selected,
  onChange,
  hasLive,
}: {
  allYears: string[];
  selected: string[];
  onChange: (y: string[]) => void;
  hasLive?: boolean;
}) {
  const toggleYear = (yr: string) => {
    if (selected.includes(yr)) {
      if (selected.length > 1) onChange(selected.filter((y) => y !== yr));
    } else {
      onChange([...selected, yr].sort());
    }
  };

  return (
    <div className="flex items-center gap-1 flex-wrap text-xs">
      {allYears.map((yr) => {
        const active = selected.includes(yr);
        const isLive = yr === '2026';
        return (
          <button
            key={yr}
            onClick={() => toggleYear(yr)}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors ${
              active
                ? isLive
                  ? 'bg-[#2E7D32] text-white border-[#2E7D32]'
                  : 'bg-[#1F3A5F] text-white border-[#1F3A5F]'
                : 'bg-white text-[#5B6675] border-[#D9DEE5] hover:text-[#1B2430]'
            }`}
          >
            {isLive ? '2026 Live' : yr}
          </button>
        );
      })}
    </div>
  );
}

// ─── Main Trends Page ────────────────────────────────────────────────────────

export default function TrendsPage() {
  const [data, setData] = useState<CreamsData | null>(null);
  const [season, setSeason] = useState<'paddy' | 'wheat'>('paddy');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [selectedYears, setSelectedYears] = useState<string[]>(['2022', '2023', '2024', '2025']);

  // FIRMS state
  const [firmsData, setFirmsData] = useState<FirmsResult | null>(null);
  const [firmsLoading, setFirmsLoading] = useState(false);
  const [firmsNoKey, setFirmsNoKey] = useState(false);
  const [firmsDays, setFirmsDays] = useState(3);

  // Fetch CREAMS historical dataset
  useEffect(() => {
    fetch('/data/historical_trends.json')
      .then((r) => r.json())
      .then((json) => {
        setData(json[season] ?? null);
      })
      .catch((err) => console.error('Failed to load historical data:', err));
  }, [season]);

  const fetchFirms = useCallback((days: number) => {
    setFirmsLoading(true);
    fetch(`/api/firms?days=${days}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.error === 'NO_KEY') {
          setFirmsNoKey(true);
        } else {
          setFirmsData(res);
          setFirmsNoKey(false);
        }
        setFirmsLoading(false);
      })
      .catch(() => setFirmsLoading(false));
  }, []);

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      setFirmsLoading(true);
      try {
        const res = await fetch(`/api/firms?days=${firmsDays}`);
        const json = await res.json();
        if (ignore) return;
        if (json.error === 'NO_KEY') {
          setFirmsNoKey(true);
        } else {
          setFirmsData(json);
          setFirmsNoKey(false);
        }
      } catch {
        // ignore
      } finally {
        if (!ignore) setFirmsLoading(false);
      }
    };
    run();
    return () => { ignore = true; };
  }, [firmsDays]);

  const states = useMemo(() => Object.keys(STATE_META), []);
  const filteredStates = useMemo(() => {
    return stateFilter === 'all' ? states : [stateFilter];
  }, [stateFilter, states]);

  const creamsYears = useMemo(() => {
    if (!data?.state_totals?.PUNJAB) return ['2020', '2021', '2022', '2023', '2024', '2025'];
    return Object.keys(data.state_totals.PUNJAB).sort();
  }, [data]);

  const allYears = useMemo(() => {
    return firmsNoKey ? creamsYears : [...creamsYears, '2026'];
  }, [creamsYears, firmsNoKey]);

  // Chart 1: Area Data / Bar Data
  const chartData = useMemo(() => {
    return selectedYears.map((yr) => {
      const row: Record<string, string | number> = { year: yr === '2026' ? '2026 (Live)' : yr };
      filteredStates.forEach((s) => {
        row[s] = yr === '2026'
          ? (firmsData?.counts[s] ?? 0)
          : (data?.state_totals[s]?.[yr] ?? 0);
      });
      return row;
    });
  }, [selectedYears, filteredStates, firmsData, data]);

  // Top burning districts comparison for display
  const topDistricts = useMemo(() => {
    if (!data) return [];
    const latestYear = selectedYears.filter((y) => y !== '2026').at(-1) || '2025';
    const targetState = stateFilter === 'all' ? 'PUNJAB' : stateFilter;
    const distList = data.districts[targetState] || [];
    return [...distList]
      .sort((a, b) => ((b[latestYear] as number) || 0) - ((a[latestYear] as number) || 0))
      .slice(0, 6)
      .map((d) => ({
        name: d.name,
        fires: (d[latestYear] as number) || 0,
      }));
  }, [data, selectedYears, stateFilter]);

  // Handle Export CSV
  const handleExportCsv = () => {
    if (!chartData.length) return;
    const headers = ['Year', ...filteredStates.map((s) => STATE_META[s]?.label || s)];
    const rows = chartData.map((row) => [
      row.year as string,
      ...filteredStates.map((s) => (row[s] as number) || 0),
    ]);
    exportToCsv(`KrishiVayu_Historical_Trends_${season}`, headers, rows);
  };

  // KPI Calculations
  const latestSelectedYear = selectedYears.filter((y) => y !== '2026').at(-1) || '2025';
  const prevSelectedYear = selectedYears.filter((y) => y !== '2026').at(-2) || '2024';

  const totalLatestFires = filteredStates.reduce(
    (sum, s) => sum + (data?.state_totals[s]?.[latestSelectedYear] || 0),
    0
  );
  const totalPrevFires = filteredStates.reduce(
    (sum, s) => sum + (data?.state_totals[s]?.[prevSelectedYear] || 0),
    0
  );
  const yoyPctChange = totalPrevFires > 0 ? ((totalLatestFires - totalPrevFires) / totalPrevFires) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#1B2430] flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-5">
        {/* Subheader & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D9DEE5] pb-4">
          <div>
            <h1 className="text-xl font-bold text-[#1F3A5F]">Historical Crop Residue Fire Trends</h1>
            <p className="text-xs text-[#5B6675] mt-0.5">
              CREAMS / ICAR-IARI multi-year satellite monitoring archive (2020–2025) & NASA FIRMS telemetry.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3 py-1.5 bg-white border border-[#D9DEE5] hover:bg-slate-50 text-[#1F3A5F] rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              title="Download trends data as safe CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-white border border-[#D9DEE5] rounded-lg p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
          {/* Year selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#5B6675] uppercase tracking-wider">Years:</span>
            <YearPills
              allYears={allYears}
              selected={selectedYears}
              onChange={setSelectedYears}
              hasLive={!firmsNoKey}
            />
          </div>

          <div className="flex items-center gap-2.5">
            {/* Season toggle */}
            <div className="flex bg-[#F5F7FA] border border-[#D9DEE5] rounded-md p-0.5 text-xs font-semibold">
              {(['paddy', 'wheat'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSeason(s)}
                  className={`px-3 py-1 rounded transition-colors ${
                    season === s ? 'bg-[#1F3A5F] text-white shadow-xs' : 'text-[#5B6675] hover:text-[#1B2430]'
                  }`}
                >
                  {s === 'paddy' ? '🌾 Paddy (Kharif)' : '🌱 Wheat (Rabi)'}
                </button>
              ))}
            </div>

            {/* State filter */}
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="bg-white border border-[#D9DEE5] rounded-md px-3 py-1.5 text-xs text-[#1B2430] focus:ring-2 focus:ring-[#1F3A5F]"
            >
              <option value="all">All Sensed States</option>
              {states.map((s) => (
                <option key={s} value={s}>
                  {STATE_META[s]?.label || s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Live FIRMS panel */}
        <FirmsPanel
          season={season}
          data={firmsData}
          loading={firmsLoading}
          noKey={firmsNoKey}
          days={firmsDays}
          onDays={setFirmsDays}
          onRefresh={() => fetchFirms(firmsDays)}
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-white border border-[#D9DEE5] rounded-lg shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-[#5B6675] uppercase tracking-wider block">
              {latestSelectedYear} Total Detected Burns
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#1B2430]">
                {totalLatestFires.toLocaleString()}
              </span>
              <span className="text-xs text-[#5B6675]">fire events</span>
            </div>
          </div>

          <div className="p-4 bg-white border border-[#D9DEE5] rounded-lg shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-[#5B6675] uppercase tracking-wider block">
              YoY Change ({prevSelectedYear} → {latestSelectedYear})
            </span>
            <div className="flex items-center gap-2">
              <span
                className={`text-2xl font-bold ${
                  yoyPctChange <= 0 ? 'text-[#2E7D32]' : 'text-[#C62828]'
                }`}
              >
                {yoyPctChange > 0 ? '+' : ''}
                {yoyPctChange.toFixed(1)}%
              </span>
              {yoyPctChange <= 0 ? (
                <TrendingDown className="w-5 h-5 text-[#2E7D32]" />
              ) : (
                <TrendingUp className="w-5 h-5 text-[#C62828]" />
              )}
            </div>
          </div>

          <div className="p-4 bg-white border border-[#D9DEE5] rounded-lg shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-[#5B6675] uppercase tracking-wider block">
              Season Peak Window
            </span>
            <div className="text-base font-bold text-[#1F3A5F]">
              {season === 'paddy' ? 'October 25 – November 15' : 'April 20 – May 10'}
            </div>
            <p className="text-[11px] text-[#5B6675]">Critical window for ex-situ off-take intervention</p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Chart 1: Annual Trends (AreaChart or BarChart) */}
          <div className="lg:col-span-8 bg-white border border-[#D9DEE5] rounded-lg p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#E5E9F0] pb-2">
              <div>
                <h2 className="text-sm font-bold text-[#1F3A5F]">
                  {stateFilter === 'all' ? 'Annual Fire Events by State' : `${STATE_META[stateFilter]?.label} — Annual Trends`}
                </h2>
                <p className="text-[11px] text-[#5B6675]">
                  {season === 'paddy' ? 'Paddy harvest season (Oct–Nov)' : 'Wheat harvest season (Apr–May)'}
                </p>
              </div>
            </div>

            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                {chartData.length === 1 ? (
                  /* Single Year Fix: Render BarChart so single year is never empty */
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E9F0" />
                    <XAxis dataKey="year" tick={{ fill: '#5B6675', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#5B6675', fontSize: 10 }} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} />
                    <Tooltip content={<Tip />} />
                    {stateFilter === 'all' && <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v) => STATE_META[v]?.label || v} />}
                    {filteredStates.map((s) => (
                      <Bar key={s} dataKey={s} fill={STATE_META[s]?.color || '#1F3A5F'} radius={[4, 4, 0, 0]} />
                    ))}
                  </BarChart>
                ) : (
                  /* Multi-year AreaChart */
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E9F0" />
                    <XAxis dataKey="year" tick={{ fill: '#5B6675', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#5B6675', fontSize: 10 }} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} />
                    <Tooltip content={<Tip />} />
                    {stateFilter === 'all' && <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v) => STATE_META[v]?.label || v} />}
                    {filteredStates.map((s) => (
                      <Area
                        key={s}
                        type="monotone"
                        dataKey={s}
                        stroke={STATE_META[s]?.color || '#1F3A5F'}
                        fill={STATE_META[s]?.color || '#1F3A5F'}
                        fillOpacity={0.15}
                        strokeWidth={2}
                      />
                    ))}
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Top Burning Districts Comparison */}
          <div className="lg:col-span-4 bg-white border border-[#D9DEE5] rounded-lg p-5 shadow-xs space-y-3">
            <div className="border-b border-[#E5E9F0] pb-2">
              <h2 className="text-sm font-bold text-[#1F3A5F]">Highest Burn Districts</h2>
              <p className="text-[11px] text-[#5B6675]">
                {stateFilter === 'all' ? 'Punjab' : STATE_META[stateFilter]?.label} ({latestSelectedYear})
              </p>
            </div>

            <div className="space-y-2.5 pt-1">
              {topDistricts.length === 0 ? (
                <p className="text-xs text-[#5B6675]">No district data available.</p>
              ) : (
                topDistricts.map((d, i) => {
                  const maxFires = topDistricts[0]?.fires || 1;
                  const pct = Math.round((d.fires / maxFires) * 100);
                  return (
                    <div key={d.name} className="space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#1B2430]">
                          {i + 1}. {d.name}
                        </span>
                        <span className="font-bold text-[#1F3A5F]">{d.fires.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-[#F5F7FA] border border-[#E5E9F0] rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-[#1F3A5F] h-full rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
