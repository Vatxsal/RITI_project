'use client';

import { useEffect, useState } from 'react';
import { getSectorColor } from '@/lib/data';
import { useFilter } from '@/components/FilterContext';
import { DashboardKpiPayload, fetchDashboardKpis, getEmptyDashboardPayload } from '@/lib/dashboard-kpis';
import { fetchAspirationsKpis } from '@/lib/cache/refresh_cache_dashboard';

type CoverageRow = [string, string];

const SECTOR_PALETTE = ['#E85D04', '#0F766E', '#2563EB', '#8B5CF6', '#16A34A', '#C2410C', '#DB2777', '#0284C7', '#64748B', '#059669', '#0EA5E9'];

const LIGHT_CARD_STYLE = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 12,
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
} as const;

function formatCount(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return value.toLocaleString('en-IN');
}

function formatCompact(value: number): string {
  if (value >= 10000000) return `${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000)   return `${(value / 100000).toFixed(1)}L`;
  if (value >= 1000)     return `${(value / 1000).toFixed(1)}k`;
  return value.toLocaleString('en-IN');
}

function parseCoverageValue(value: string | undefined) {
  const cleaned = String(value ?? '').replace(/\s*loaded$/i, '').replace(/,/g, '').trim();
  const match = cleaned.match(/^([0-9]+(?:\.[0-9]+)?)\s*(Cr|L|M)?$/i);
  if (!match) return null;

  const numeric = Number(match[1]);
  if (!Number.isFinite(numeric)) return null;

  const unit = String(match[2] || '').toLowerCase();
  const multiplier = unit === 'cr' ? 10000000 : unit === 'l' ? 100000 : unit === 'm' ? 1000000 : 1;

  return {
    raw: Math.round(numeric * multiplier),
    unit,
  };
}

function formatCoverageValue(raw: number, unit: string) {
  if (unit === 'cr') return `${(raw / 10000000).toFixed(2)} Cr`;
  if (unit === 'l') return `${(raw / 100000).toFixed(1)} L`;
  if (unit === 'm') return `${(raw / 1000000).toFixed(1)} M`;
  return raw.toLocaleString('en-IN');
}

function isAgricultureSector(entry: { sector?: string; dept?: string; topItem?: string }) {
  const haystack = `${entry.sector || ''} ${entry.dept || ''} ${entry.topItem || ''}`.toLowerCase();
  return haystack.includes('agri') || haystack.includes('agriculture') || haystack.includes('कृषि');
}

function statusRankForTable(status?: string) {
  const normalized = String(status || '').trim().toUpperCase();
  if (normalized === 'FUNDED') return 0;
  if (normalized === 'ACCEPT') return 1;
  if (normalized === 'REVIEW') return 2;
  return 3;
}

function emptyAspirationState() {
  return {
    totalCount: 0,
    qty2030Total: 0,
    qty2035Total: 0,
    qty2047Total: 0,
    count2030: 0,
    count2035: 0,
    count2047: 0,
    sectorBreakdown: [],
    budgetTotal: 0,
    fastTrackCount: 0,
    fundedCount: 0,
    districtBreakdown: [],
    budget2030Cr: 0,
    budget2035Cr: 0,
    budget2047Cr: 0,
  };
}

export default function CommandCenterPage() {
  const { urbanFilter, setUrbanFilter, selectedDistrict } = useFilter();
  const [dashboard, setDashboard] = useState<DashboardKpiPayload>(getEmptyDashboardPayload());
  const [aspKpis, setAspKpis] = useState<any>(null);
  const [aspirationYearFilter, setAspirationYearFilter] = useState<'2030' | '2035' | '2047'>('2030');
  const [sectorYearFilter, setSectorYearFilter] = useState<'2030' | '2035' | '2047'>('2030');

  useEffect(() => {
    fetchAspirationsKpis({ areaType: 'all', district: null }).catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    fetchDashboardKpis({ areaType: urbanFilter, district: selectedDistrict })
      .then((payload) => {
        if (alive && payload) setDashboard(payload);
      })
      .catch(() => {
        if (alive) setDashboard(getEmptyDashboardPayload());
      });

    return () => {
      alive = false;
    };
  }, [urbanFilter, selectedDistrict]);

  useEffect(() => {
    let alive = true;
    setAspKpis(null);

    fetchAspirationsKpis({ areaType: urbanFilter, district: selectedDistrict })
      .then((payload) => {
        if (alive) setAspKpis(payload);
      })
      .catch(() => {
        if (alive) setAspKpis(emptyAspirationState());
      });

    return () => {
      alive = false;
    };
  }, [urbanFilter, selectedDistrict]);

  const coverageRows: CoverageRow[] = dashboard.dataCoverage || [];
  const populationRow = coverageRows.find(([label]) => /population|rural pop|urban population|total population/i.test(label) && !/female/i.test(label))
    || coverageRows.find(([label]) => /pop/i.test(label) && !/female/i.test(label))
    || coverageRows[0]
    || ['—', '—'];
  const femaleRow = coverageRows.find(([label]) => /female/i.test(label));
  const ruralGpsRow = coverageRows.find(([label]) => /rural gps/i.test(label));
  const urbanWardsRow = coverageRows.find(([label]) => /urban wards/i.test(label));

  const parsedPopulation = parseCoverageValue(populationRow?.[1]);
  const parsedFemale = parseCoverageValue(femaleRow?.[1]);
  const maleFemaleSplit = parsedPopulation && parsedFemale
    ? `पुरुष ${formatCoverageValue(Math.max(parsedPopulation.raw - parsedFemale.raw, 0), parsedPopulation.unit)} · महिला ${formatCoverageValue(parsedFemale.raw, parsedPopulation.unit)}`
    : femaleRow?.[1]
    ? `${femaleRow[0]}: ${femaleRow[1]}`
    : '—';

  const visibleSectorRows = ((aspKpis?.sectorBreakdown || []) as any[])
    .filter((entry: any) => urbanFilter === 'urban' ? !isAgricultureSector(entry) : true)
    .slice(0, urbanFilter === 'urban' ? 10 : 11)
    .map((entry: any) => ({
      ...entry,
      displayQty: sectorYearFilter === '2030'
        ? (entry.topItemQty2030 ?? entry.qty2030 ?? 0)
        : sectorYearFilter === '2035'
          ? (entry.topItemQty2035 ?? entry.qty2035 ?? 0)
          : (entry.topItemQty2047 ?? entry.qty2047 ?? 0),
      displaySectorTotal: sectorYearFilter === '2030'
        ? (entry.totalQty2030 ?? 0)
        : sectorYearFilter === '2035'
          ? (entry.totalQty2035 ?? 0)
          : (entry.totalQty2047 ?? 0),
    }));

  const aspirationQtyKey = `qty_${aspirationYearFilter}` as 'qty_2030' | 'qty_2035' | 'qty_2047';

  const aspirationTableRows = (() => {
    const areaFiltered = ((aspKpis?.records || []) as Array<{
      item: string;
      dept: string;
      sector: string;
      district: string;
      area_type: string;
      gram_panchayat: string;
      block: string;
      ward: string;
      ulb: string;
      city: string;
      priority: number;
      planning_year?: number | string;
      qty_2030: number;
      qty_2035: number;
      qty_2047: number;
      status: string;
      fast_track: boolean;
    }>).filter((row) => {
      const areaType = String(row.area_type || '').trim().toLowerCase();
      if (urbanFilter === 'urban') return areaType !== 'rural';
      if (urbanFilter === 'rural') return areaType !== 'urban';
      return true;
    });

    const p1Rows = areaFiltered.filter((row) => Number(row.priority) === 1 && Number((row as any)[aspirationQtyKey] || 0) > 0);

    const groupMap = new Map<string, {
      item: string;
      dept: string;
      sector: string;
      area_type: string;
      priority: number;
      qty_2030: number;
      qty_2035: number;
      qty_2047: number;
      status: string;
      fast_track: boolean;
      planning_year?: number | string;
      gram_panchayat: string;
      block: string;
      ward: string;
      ulb: string;
      city: string;
      district: string;
      occurrences: number;
      districtList: string[];
    }>();

    for (const row of p1Rows) {
      const key = String(row.item || '').trim().toLowerCase();
      if (!key) continue;

      const existing = groupMap.get(key);
      if (!existing) {
        groupMap.set(key, {
          ...row,
          qty_2030: Number(row.qty_2030 || 0),
          qty_2035: Number(row.qty_2035 || 0),
          qty_2047: Number(row.qty_2047 || 0),
          occurrences: 1,
          districtList: row.district ? [row.district] : [],
        });
      } else {
        existing.qty_2030 += Number(row.qty_2030 || 0);
        existing.qty_2035 += Number(row.qty_2035 || 0);
        existing.qty_2047 += Number(row.qty_2047 || 0);
        existing.occurrences += 1;

        if (statusRankForTable(row.status) < statusRankForTable(existing.status)) {
          existing.status = row.status;
        }

        if (row.fast_track) existing.fast_track = true;

        if (row.district && !existing.districtList.includes(row.district)) {
          existing.districtList.push(row.district);
        }
      }
    }

    return Array.from(groupMap.values())
      .sort((left, right) => {
        const qtyDiff = Number((right as any)[aspirationQtyKey] || 0) - Number((left as any)[aspirationQtyKey] || 0);
        if (qtyDiff !== 0) return qtyDiff;
        return statusRankForTable(left.status) - statusRankForTable(right.status);
      })
      .slice(0, urbanFilter === 'urban' ? 10 : 11);
  })();

  const year2030Count = aspKpis?.count2030 ?? 0;
  const year2035Count = aspKpis?.count2035 ?? 0;
  const year2047Count = aspKpis?.count2047 ?? 0;
  const totalShownAspirations = Math.max(year2030Count + year2035Count + year2047Count, 1);
  const reviewCount = Math.max((aspKpis?.totalCount || 0) - (aspKpis?.fundedCount || 0) - (aspKpis?.fastTrackCount || 0), 0);
  const districtsCovered = aspKpis?.districtBreakdown?.length || 0;

  const sectorShareRows = visibleSectorRows.slice().sort((left, right) => right.count - left.count || left.sector.localeCompare(right.sector));
  const sectorPieData = sectorShareRows.map((entry) => ({ name: entry.sector, value: entry.count }));
  const totalSectorCount = Math.max(sectorPieData.reduce((sum, row) => sum + row.value, 0), 1);
  const districtRows = ((aspKpis?.districtBreakdown || []) as Array<{ district: string; count: number; qty2030: number; budgetCr: number }>)
    .slice()
    .sort((left, right) => right.count - left.count || right.qty2030 - left.qty2030 || left.district.localeCompare(right.district))
    .slice(0, 15);

  const strategicCount = aspKpis ? (aspKpis.fundedCount || 0) + (aspKpis.fastTrackCount || 0) : 0;

  const aspirationCards = [
    {
      label: 'ASPIRATIONS · 2030',
      value: aspKpis ? formatCount(year2030Count) : '—',
      subLabel: 'short-term',
      accent: '#e85d04',
    },
    {
      label: 'ASPIRATIONS · 2035',
      value: aspKpis ? formatCount(year2035Count) : '—',
      subLabel: 'mid-term',
      accent: '#e85d04',
    },
    {
      label: 'ASPIRATIONS · 2047',
      value: aspKpis ? formatCount(year2047Count) : '—',
      subLabel: 'long-term',
      accent: '#e85d04',
    },
  ];

  const baselineCards = [
    {
      label: 'TOTAL POPULATION',
      value: populationRow?.[1] || '—',
      subLabel: maleFemaleSplit,
      accent: '#1e3a5f',
      hidden: false,
    },
    {
      label: 'GRAM PANCHAYATS',
      value: (ruralGpsRow?.[1] || '—').replace(/\s*loaded$/i, ''),
      subLabel: 'ग्राम पंचायतें · Rural GPs',
      accent: '#1e3a5f',
      hidden: urbanFilter === 'urban',
    },
    {
      label: 'URBAN WARDS',
      value: (urbanWardsRow?.[1] || '—').replace(/\s*loaded$/i, ''),
      subLabel: 'वार्ड · ULBs',
      accent: '#1e3a5f',
      hidden: urbanFilter === 'rural',
    },
    {
      label: 'STRATEGIC PRIORITIES',
      value: aspKpis ? formatCount(strategicCount) : '—',
      subLabel: aspKpis ? `Planning years: 2030 · 2035 · 2047` : '— loading —',
      accent: '#16a34a',
      hidden: false,
    },
  ];

  const summaryPills = [
    { label: 'Total aspirations', value: aspKpis ? formatCount(aspKpis.totalCount) : '— आंकड़े लोड हो रहे हैं —' },
    { label: 'Fast-track', value: aspKpis ? formatCount(aspKpis.fastTrackCount) : '— आंकड़े लोड हो रहे हैं —' },
    { label: 'Funded', value: aspKpis ? formatCount(aspKpis.fundedCount) : '— आंकड़े लोड हो रहे हैं —' },
    { label: 'REVIEW pending', value: aspKpis ? formatCount(reviewCount) : '— आंकड़े लोड हो रहे हैं —' },
    { label: 'Districts covered', value: aspKpis ? formatCount(districtsCovered) : '— आंकड़े लोड हो रहे हैं —' },
  ];

  const scopeLabel = selectedDistrict ? selectedDistrict : urbanFilter === 'rural' ? 'Rural scope' : urbanFilter === 'urban' ? 'Urban scope' : 'All Rajasthan';

  const statusMixData = [
    { name: 'Funded', value: Number(aspKpis?.fundedCount || 0), fill: '#16a34a' },
    { name: 'Fast-track', value: Number(aspKpis?.fastTrackCount || 0), fill: '#e85d04' },
    { name: 'Review', value: reviewCount, fill: '#64748b' },
  ];
  const statusMixTotal = Math.max(statusMixData.reduce((sum, row) => sum + row.value, 0), 1);
  const sectorConicGradient = sectorPieData
    .map((entry, index) => {
      const start = sectorPieData.slice(0, index).reduce((sum, row) => sum + row.value, 0);
      const end = start + entry.value;
      return `${SECTOR_PALETTE[index % SECTOR_PALETTE.length]} ${((start / totalSectorCount) * 100).toFixed(3)}% ${((end / totalSectorCount) * 100).toFixed(3)}%`;
    })
    .join(', ');
  const statusMixConicGradient = statusMixData
    .map((entry, index) => {
      const start = statusMixData.slice(0, index).reduce((sum, row) => sum + row.value, 0);
      const end = start + entry.value;
      return `${entry.fill} ${((start / statusMixTotal) * 100).toFixed(3)}% ${((end / statusMixTotal) * 100).toFixed(3)}%`;
    })
    .join(', ');

  const YearFilterPills = ({
    value,
    onChange,
  }: {
    value: '2030' | '2035' | '2047';
    onChange: (y: '2030' | '2035' | '2047') => void;
  }) => (
    <div style={{ display: 'inline-flex', gap: 4, padding: 3, background: '#f1f5f9', borderRadius: 8 }}>
      {(['2030', '2035', '2047'] as const).map((year) => (
        <button
          key={year}
          onClick={() => onChange(year)}
          style={{
            border: 'none',
            borderRadius: 6,
            padding: '5px 14px',
            background: value === year ? '#1e3a5f' : 'transparent',
            color: value === year ? '#ffffff' : '#64748b',
            fontWeight: value === year ? 700 : 600,
            fontSize: 12,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          {year}
        </button>
      ))}
    </div>
  );

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', padding: 24, color: '#1a2744' }}>
      <div className="space-y-4">
        <div className="mb-4">
          <div className="pg-t flex items-baseline gap-2" style={{ color: '#1a2744' }}>
            {selectedDistrict ? `${selectedDistrict} District Overview` : 'Rajasthan State Overview'}
            <div className="ai-badge">VR 2047 · AI Analysis</div>
          </div>
          <div className="pg-s" style={{ color: '#64748b' }}>
            Live planning intelligence — KPIs, top strategic aspirations, sector mix, and AI insights all rendered without explicit commands.
            Switch district or sector to drill down.
          </div>
        </div>

        <div style={{ display: 'inline-flex', gap: 4, padding: 4, background: '#f1f5f9', borderRadius: 10 }}>
          {[
            { value: 'all', label: 'ALL (Rural + Urban)' },
            { value: 'rural', label: 'Rural Only' },
            { value: 'urban', label: 'Urban Only' },
          ].map((tab) => {
            const active = urbanFilter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setUrbanFilter(tab.value as 'all' | 'rural' | 'urban')}
                style={{
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 20px',
                  background: active ? '#ffffff' : 'transparent',
                  color: active ? '#1a2744' : '#64748b',
                  boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  fontWeight: active ? 700 : 600,
                  cursor: 'pointer',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          {baselineCards.filter((card) => !card.hidden).map((card) => (
            <div
              key={card.label}
              style={{
                ...LIGHT_CARD_STYLE,
                minWidth: 0,
                padding: '18px 16px',
                borderTop: `3px solid ${card.accent}`,
                borderLeft: '1px solid #e2e8f0',
                color: '#1a2744',
              }}
            >
              <div style={{ fontSize: 10, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>{card.label}</div>
              <div style={{ fontSize: 30, fontWeight: 900, color: '#1a2744', lineHeight: 1.1, marginTop: 6 }}>{card.value}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, minHeight: 16 }}>{card.subLabel}</div>
            </div>
          ))}
          {aspirationCards.map((card) => (
            <div
              key={card.label}
              style={{
                ...LIGHT_CARD_STYLE,
                minWidth: 0,
                padding: '18px 16px',
                borderTop: `3px solid ${card.accent}`,
                borderLeft: '1px solid #e2e8f0',
                color: '#1a2744',
              }}
            >
              <div style={{ fontSize: 10, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>{card.label}</div>
              <div style={{ fontSize: 30, fontWeight: 900, color: '#1a2744', lineHeight: 1.1, marginTop: 6 }}>{card.value}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, minHeight: 16 }}>{card.subLabel}</div>
            </div>
          ))}
        </div>

        <div
          style={{
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: 16,
            padding: '20px 22px',
          }}
        >
          <div style={{ color: '#1e3a5f', fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
            Manthaan AI · Planning Summary
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {summaryPills.map((pill) => (
              <div key={pill.label} style={{ borderRadius: 14, padding: '12px 14px', background: '#ffffff', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 10, color: '#1e3a5f', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>{pill.label}</div>
                <div style={{ marginTop: 4, fontSize: 18, fontWeight: 800, lineHeight: 1.2, color: '#1a2744' }}>{pill.value}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, fontSize: 13, lineHeight: 1.8, color: '#64748b' }}>
            Baseline data for Viksit Rajasthan @ 2047 with {aspKpis ? aspKpis.totalCount.toLocaleString('en-IN') : '—'} aspirations — baseline + aspiration convergence planning intelligence.
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2 items-start">
          <div style={{ ...LIGHT_CARD_STYLE, minWidth: 0, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
              <div>
                <div className="ct" style={{ color: '#1a2744' }}>Top Strategic Aspirations</div>
                <div className="cs" style={{ color: '#64748b' }}>P-1 items · grouped by sub-indicator · sorted by highest {aspirationYearFilter} quantity</div>
              </div>
              <YearFilterPills value={aspirationYearFilter} onChange={setAspirationYearFilter} />
            </div>
            {!aspKpis || aspirationTableRows.length === 0 ? (
              <div style={{ color: '#64748b', fontStyle: 'italic' }}>Loading data —</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', color: '#475569', textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.08em' }}>
                    <th style={{ padding: '12px 10px', borderBottom: '1px solid #f1f5f9', textAlign: 'left', width: '34%' }}>Aspiration</th>
                    <th style={{ padding: '12px 10px', borderBottom: '1px solid #f1f5f9', textAlign: 'left', width: '29%' }}>Area</th>
                    <th style={{ padding: '12px 10px', borderBottom: '1px solid #f1f5f9', textAlign: 'left', width: '22%' }}>Sector</th>
                    <th style={{ padding: '12px 10px', borderBottom: '1px solid #f1f5f9', textAlign: 'center', width: '7%' }}>P</th>
                    <th style={{ padding: '12px 10px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', width: '8%', whiteSpace: 'nowrap' }}>{aspirationYearFilter} Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {aspirationTableRows.map((entry, index) => {
                      const areaType = String(entry.area_type || '').trim().toLowerCase();
                      const isRural = areaType === 'rural';
                      const occurrences = (entry as any).occurrences ?? 1;
                      const districtList = (entry as any).districtList ?? [];
                      const areaLabel = occurrences > 1
                        ? `${districtList.length} जिलों में · ${occurrences} locations`
                        : isRural
                          ? [entry.gram_panchayat, entry.block, entry.district].filter(Boolean).join(' · ') || entry.district || '—'
                          : [entry.ward, entry.ulb || entry.city, entry.district].filter(Boolean).join(' · ') || entry.district || '—';
                      const aspirationLabel = [entry.item, entry.dept].filter(Boolean).join(' · ') || entry.item || entry.dept || '—';
                      const borderColor = SECTOR_PALETTE[index % SECTOR_PALETTE.length];

                      return (
                      <tr key={`${entry.sector}-${entry.item}-${index}`} className="asp-row" style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '14px 10px', verticalAlign: 'top' }}>
                            <div style={{ fontSize: 14, fontWeight: 800, color: '#1a2744', lineHeight: 1.35 }}>{aspirationLabel}</div>
                            {occurrences > 1 && (
                              <div style={{ marginTop: 4, fontSize: 10, color: '#64748b' }}>
                                {occurrences} sub-indicators grouped
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '14px 10px', verticalAlign: 'top' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  minWidth: 54,
                                  padding: '4px 10px',
                                  borderRadius: 4,
                                  fontSize: 9.5,
                                  fontWeight: 800,
                                  letterSpacing: '0.1em',
                                  textTransform: 'uppercase',
                                  background: isRural ? '#dcfce7' : '#dbeafe',
                                  color: isRural ? '#166534' : '#1d4ed8',
                                  border: '1px solid rgba(148,163,184,.14)',
                                }}
                              >
                                {isRural ? 'RURAL' : 'URBAN'}
                              </span>
                              <div style={{ fontSize: 12, fontWeight: 700, color: '#1a2744', lineHeight: 1.35 }}>{areaLabel}</div>
                            </div>
                            <div style={{ marginTop: 4, fontSize: 10.5, color: '#64748b' }}>{isRural ? 'GP · Block · District' : 'Ward · ULB · District'}</div>
                          </td>
                          <td style={{ padding: '14px 10px', verticalAlign: 'top' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: 28, padding: '3px 8px', borderRadius: 4, border: `1px solid ${borderColor}33`, background: `${borderColor}10`, color: '#1a2744', fontSize: 10, fontWeight: 800, letterSpacing: '0.04em', lineHeight: 1.2, whiteSpace: 'normal', wordBreak: 'break-word', textAlign: 'center' }}>
                              {entry.sector || entry.dept || 'Other'}
                            </span>
                          </td>
                          <td style={{ padding: '14px 10px', textAlign: 'center', verticalAlign: 'top' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 999, background: '#e85d04', color: '#fff', fontSize: 10.5, fontWeight: 800, lineHeight: 1.1, margin: '0 auto' }}>
                              P-{Number(entry.priority || 0)}
                            </span>
                          </td>
                          <td style={{ padding: '14px 10px', textAlign: 'right', verticalAlign: 'top', color: '#1a2744', fontWeight: 800, whiteSpace: 'nowrap' }}>{formatCompact(Number((entry as any)[aspirationQtyKey] || 0))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex flex-col gap-4 min-w-0">
            <div style={{ ...LIGHT_CARD_STYLE, minWidth: 0, padding: 20 }}>
              <div className="ct" style={{ color: '#1a2744' }}>Count-Wise Sector Allocation</div>
              <div className="cs" style={{ color: '#64748b' }}>Percentage share of aspiration counts across {urbanFilter === 'urban' ? 10 : 11} visible sectors, normalized to the total shown in 2030 + 2035 + 2047</div>
              {!aspKpis || sectorPieData.length === 0 ? (
                <div style={{ color: '#64748b' }}>— Loading data —</div>
              ) : (
                <>
                  <div style={{ position: 'relative', width: '100%', minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 260, height: 260, borderRadius: '50%', background: `conic-gradient(${sectorConicGradient})`, boxShadow: 'inset 0 0 0 1px #e2e8f0' }} />
                    <div style={{ position: 'absolute', width: 118, height: 118, borderRadius: '50%', background: '#ffffff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                      <div style={{ fontSize: 20, fontWeight: 900, color: '#1a2744', lineHeight: 1 }}>{formatCompact(totalShownAspirations)}</div>
                      <div style={{ marginTop: 2, fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total count</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
                    {sectorPieData.map((entry, index) => {
                      const percent = (entry.value / totalShownAspirations) * 100;
                      return (
                        <div key={entry.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, fontSize: 12, color: '#1a2744' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                            <span style={{ width: 10, height: 10, borderRadius: 999, background: SECTOR_PALETTE[index % SECTOR_PALETTE.length], flexShrink: 0 }} />
                            <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.name}</span>
                          </div>
                          <span style={{ flexShrink: 0, color: '#64748b' }}>{formatCount(entry.value)} · {percent.toFixed(1)}%</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <div style={{ ...LIGHT_CARD_STYLE, minWidth: 0, padding: 20 }}>
              <div className="ct" style={{ color: '#1a2744' }}>Aspiration Status Mix</div>
              <div className="cs" style={{ color: '#64748b' }}>Fast-track vs funded vs review</div>
              <div style={{ position: 'relative', width: '100%', minHeight: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 220, height: 220, borderRadius: '50%', background: `conic-gradient(${statusMixConicGradient})`, boxShadow: 'inset 0 0 0 1px #e2e8f0' }} />
                <div style={{ position: 'absolute', width: 104, height: 104, borderRadius: '50%', background: '#ffffff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#1a2744', lineHeight: 1 }}>{formatCompact(aspKpis?.totalCount || 0)}</div>
                  <div style={{ marginTop: 2, fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total</div>
                </div>
              </div>
              <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                {statusMixData.map((entry) => {
                  const percent = (entry.value / statusMixTotal) * 100;
                  return (
                    <div key={entry.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, fontSize: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 999, background: entry.fill }} />
                        <span style={{ color: '#1a2744', fontWeight: 600 }}>{entry.name}</span>
                      </div>
                      <span style={{ color: '#64748b' }}>{formatCount(entry.value)} · {percent.toFixed(1)}%</span>
                    </div>
                  );
                })}
              </div>
              <div style={{
                marginTop: 14,
                padding: '10px 14px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                fontSize: 11,
                color: '#64748b',
                lineHeight: 1.7,
              }}>
                <div style={{ fontWeight: 700, color: '#475569', marginBottom: 4, fontSize: 11 }}>
                  Status Definitions (Rules Engine)
                </div>
                <div><span style={{ color: '#16a34a', fontWeight: 700 }}>● Funded</span> — Aspiration has financial approval + scheme name linked in Rajdhara</div>
                <div><span style={{ color: '#e85d04', fontWeight: 700 }}>● Fast-track</span> — Critical sector (Water / Health / Sanitation) — auto-approved regardless of documentation gaps</div>
                <div><span style={{ color: '#64748b', fontWeight: 700 }}>● Review</span> — Passed basic checks but has minor issues (missing GPS, priority mismatch, etc.) — needs officer review before funding</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ ...LIGHT_CARD_STYLE, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
            <div>
              <div className="ct" style={{ color: '#1a2744' }}>Sector-wise Top Aspirations</div>
              <div className="cs" style={{ color: '#64748b' }}>Top sub-indicator per sector · grouped quantities · {sectorYearFilter} view</div>
            </div>
            <YearFilterPills value={sectorYearFilter} onChange={setSectorYearFilter} />
          </div>
          {!aspKpis || visibleSectorRows.length === 0 ? (
            <div style={{ color: '#64748b', fontStyle: 'italic' }}>Loading data —</div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {visibleSectorRows.map((entry, index) => {
                const borderColor = SECTOR_PALETTE[index % SECTOR_PALETTE.length];
                const statusText = String(entry.status || '').trim().toUpperCase();
                return (
                  <div key={`${entry.sector}-${entry.topItem}-${index}`} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, borderLeft: `4px solid ${borderColor}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: borderColor, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{entry.sector || entry.dept || 'Other'}</div>
                        <div style={{ marginTop: 6, fontSize: 14, fontWeight: 800, color: '#1a2744', lineHeight: 1.35 }}>{entry.topItem}</div>
                        <div style={{ marginTop: 4, fontSize: 11, color: '#64748b' }}>
                          {entry.dept || '—'}
                        </div>
                      </div>
                      {entry.fast_track ? (
                        <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 800, padding: '4px 8px', borderRadius: 999, background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' }}>⚡ Fast-track</span>
                      ) : null}
                    </div>
                    <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, fontSize: 11 }}>
                      <div>
                        <div style={{ color: '#64748b', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Sub-indicators</div>
                        <div style={{ marginTop: 2, color: '#1a2744', fontWeight: 800 }}>{formatCount((entry as any).uniqueItems ?? entry.count)}</div>
                      </div>
                      <div>
                        <div style={{ color: '#64748b', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{sectorYearFilter} Qty</div>
                        <div style={{ marginTop: 2, color: '#1a2744', fontWeight: 800 }}>{formatCount((entry as any).displayQty ?? 0)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <style jsx global>{`
          .asp-row:hover td {
            background: #f8fafc !important;
          }
        `}</style>
      </div>
    </div>
  );
}