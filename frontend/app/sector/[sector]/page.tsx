'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { getSectorByValue } from '@/lib/data';
import { type SectorPageData, fetchSectorPageData } from '@/lib/cache/refresh_cache_dashboard';
import { type AreaType } from '@/lib/dashboard-kpis';
import { useFilter } from '@/components/FilterContext';

const LIGHT_CARD_STYLE = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 12,
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
} as const;

type InsightItem = {
  type?: string;
  heading?: string;
  body?: string;
};

function HeroKpiCard({ label, value, sub, accentColor, badge }: { label: string; value: string; sub: string; accentColor: string; badge: string }) {
  return (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '18px 16px', borderTop: `3px solid ${accentColor}`, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 9, fontWeight: 800, color: accentColor, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>{badge}</div>
      <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 900, color: '#1a2744', lineHeight: 1.1, marginTop: 8 }}>{value}</div>
      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 5 }}>{sub}</div>
    </div>
  );
}

const SECTOR_PRIMARY_BASELINE_LABEL: Record<string, string> = {
  water: 'Rural FHTC Coverage',
  health: 'Health Centers',
  agri: 'Total Farmers',
  dairy: 'Total Livestock',
  edu: 'Total Schools',
  employ: 'Active SHGs',
  women: 'Women in SHGs',
  welfare: 'Old Age Pensioners',
  infra: 'Road Network (km)',
  tourism: 'Heritage Sites',
  env: 'Forest Area (Ha)',
};

const SECTOR_SECONDARY_BASELINE_LABEL: Record<string, string> = {
  water: 'Avg Groundwater Depth',
  health: 'Health Beds',
  agri: 'Irrigated Area (Ha)',
  dairy: 'Daily Milk (LPD)',
  edu: 'Enrolled Students',
  employ: 'Lakhpati Didis',
  women: 'Active SHGs',
  welfare: 'Widow Pensioners',
  infra: 'Electrified Houses',
  tourism: 'Fair Footfall/Day',
  env: 'Toilet Coverage',
};

function getPrimaryBaselineLabel(sectorId: string, areaType: AreaType): string {
  if (sectorId === 'water') {
    if (areaType === 'all') return 'Rural + Urban Tap Coverage';
    return areaType === 'urban' ? 'Urban Tap Connection Coverage' : 'Rural FHTC Coverage';
  }
  return SECTOR_PRIMARY_BASELINE_LABEL[sectorId] || 'Baseline Metric';
}

function getSecondaryBaselineLabel(sectorId: string, areaType: AreaType): string {
  if (sectorId === 'water') {
    if (areaType === 'all') return 'Avg Groundwater Depth';
    return areaType === 'urban' ? 'Urban Groundwater Depth' : 'Avg Groundwater Depth';
  }
  return SECTOR_SECONDARY_BASELINE_LABEL[sectorId] || 'Baseline Metric';
}

const SECTOR_PRIMARY_BASELINE_COLUMN: Record<string, string> = {
  water: 'tap_connection_pct',
  health: 'allopathic_centers',
  agri: 'total_farmers',
  dairy: 'total_livestock',
  edu: 'total_schools',
  employ: 'active_shg_count',
  women: 'women_in_shgs',
  welfare: 'old_age_pensioners',
  infra: 'road_length_km',
  tourism: 'cultural_assets',
  env: 'forest_area_ha',
};

const SECTOR_SECONDARY_BASELINE_COLUMN: Record<string, string> = {
  water: 'groundwater_depth_meters',
  health: 'health_center_beds',
  agri: 'irrigated_area_ha',
  dairy: 'daily_milk_litres',
  edu: 'total_enrolled_students',
  employ: 'lakhpati_didis',
  women: 'active_shg_count',
  welfare: 'widow_pensioners',
  infra: 'houses_with_electricity',
  tourism: 'avg_fair_footfall_daily',
  env: 'houses_with_toilets',
};

function formatMetricNumber(value: number, digits = 0) {
  return Number(value).toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function formatBaselineMetricValue(column: string | undefined, value: number | undefined) {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  if (!column) return formatMetricNumber(value);
  if (column.includes('_pct')) return `${Number(value).toFixed(1)}%`;
  if (column === 'groundwater_depth_meters') return `${Number(value).toFixed(1)} m`;
  if (column === 'road_length_km' || column === 'dist_bus_stand_km' || column === 'dist_main_market_km' || column === 'dist_railway_station_km' || column === 'phc_dist_km' || column === 'chc_dist_km') {
    return `${Number(value).toFixed(1)} km`;
  }
  if (column === 'daily_milk_litres') return `${formatMetricNumber(value)} L/day`;
  if (column === 'total_waste_daily_kg' || column === 'wet_waste_daily_kg' || column === 'dry_waste_daily_kg') return `${formatMetricNumber(value)} kg`;
  if (column === 'forest_area_ha' || column === 'pasture_land_ha' || column === 'cultivable_land_ha' || column === 'irrigated_area_ha') return `${formatMetricNumber(value)} ha`;
  return formatMetricNumber(value);
}

function formatHeroBaselineKpi(sectorId: string, metrics: Record<string, number> | undefined, slot: 'primary' | 'secondary'): string {
  if (!metrics) return '—';
  const column = slot === 'primary' ? SECTOR_PRIMARY_BASELINE_COLUMN[sectorId] : SECTOR_SECONDARY_BASELINE_COLUMN[sectorId];
  return formatBaselineMetricValue(column, column ? metrics[column] : undefined);
}

function getBaselineMetricCards(sectorId: string, metrics: Record<string, number>) {
  const cardSets: Record<string, Array<{ label: string; col: string; note: string }>> = {
    water: [
      { label: 'Tap Coverage', col: 'tap_connection_pct', note: 'Rural + urban FHTC' },
      { label: 'Groundwater Depth', col: 'groundwater_depth_meters', note: 'Average depth' },
      { label: 'Overhead Tanks', col: 'overhead_tanks', note: 'Storage infra' },
      { label: 'HP/TW HH', col: 'handpump_only_houses', note: 'Dependency gap' },
      { label: 'Tanker HH', col: 'tanker_only_houses', note: 'Critical supply' },
      { label: 'RO Facilities', col: 'ro_facilities', note: 'Water quality support' },
    ],
    health: [
      { label: 'Allopathic Centers', col: 'allopathic_centers', note: 'Primary care points' },
      { label: 'AYUSH Centers', col: 'ayush_centers', note: 'Complementary care' },
      { label: 'Health Beds', col: 'health_center_beds', note: 'Treatment capacity' },
      { label: 'Working Staff', col: 'working_health_staff', note: 'Active workforce' },
      { label: 'Ayushman Ben.', col: 'ayushman_beneficiaries', note: 'Scheme coverage' },
      { label: 'TB Patients', col: 'tb_patients', note: 'Active caseload' },
    ],
    agri: [
      { label: 'Cultivable Land', col: 'cultivable_land_ha', note: 'Ha · total scope' },
      { label: 'Irrigated Area', col: 'irrigated_area_ha', note: 'Watered acreage' },
      { label: 'Total Farmers', col: 'total_farmers', note: 'Producer base' },
      { label: 'KCC Holders', col: 'kcc_holders', note: 'Credit access' },
      { label: 'PM-Kisan Ben.', col: 'pm_cm_kisan_beneficiaries', note: 'Income support' },
      { label: 'Solar Pumps', col: 'solar_pumps', note: 'Green irrigation' },
    ],
    dairy: [
      { label: 'Total Livestock', col: 'total_livestock', note: 'Asset base' },
      { label: 'Milch Animals', col: 'milch_animals', note: 'Productive stock' },
      { label: 'Daily Milk LPD', col: 'daily_milk_litres', note: 'Production volume' },
      { label: 'Milk Centers', col: 'milk_collection_centers', note: 'Collection infra' },
      { label: 'Goat Farms', col: 'goat_farms', note: 'Small ruminants' },
      { label: 'Poultry Farms', col: 'poultry_farms', note: 'Protein economy' },
    ],
    edu: [
      { label: 'Govt Schools', col: 'govt_schools', note: 'Public system' },
      { label: 'Pvt Schools', col: 'pvt_schools', note: 'Private sector' },
      { label: 'Total Schools', col: 'total_schools', note: 'Education supply' },
      { label: 'Working Teachers', col: 'working_teachers', note: 'Active workforce' },
      { label: 'Dropouts', col: 'dropout_children', note: 'Retention gap' },
      { label: 'Enrolled Students', col: 'total_enrolled_students', note: 'Demand base' },
    ],
    employ: [
      { label: 'Active SHGs', col: 'active_shg_count', note: 'Community groups' },
      { label: 'Women in SHGs', col: 'women_in_shgs', note: 'Collective power' },
      { label: 'Lakhpati Didis', col: 'lakhpati_didis', note: 'Income milestone' },
      { label: 'Mudra Loans', col: 'mudra_loan_beneficiaries', note: 'MSME credit' },
      { label: 'Local Artisans', col: 'local_artisans', note: 'Craft economy' },
      { label: 'Large Industries', col: 'large_industrial_units', note: 'Industrial base' },
    ],
    women: [
      { label: 'Women in SHGs', col: 'women_in_shgs', note: 'Organized collective' },
      { label: 'Active SHGs', col: 'active_shg_count', note: 'Group count' },
      { label: 'Lakhpati Didis', col: 'lakhpati_didis', note: 'Economic milestone' },
      { label: 'Mudra Loans', col: 'mudra_loan_beneficiaries', note: 'Access to credit' },
      { label: 'Local Artisans', col: 'local_artisans', note: 'Micro enterprise' },
      { label: 'Industrial Units', col: 'large_industrial_units', note: 'Employment base' },
    ],
    welfare: [
      { label: 'Old Age Pension', col: 'old_age_pensioners', note: 'Senior support' },
      { label: 'Widow Pension', col: 'widow_pensioners', note: 'Women welfare' },
      { label: 'PwD Pension', col: 'pwd_pensioners_est', note: 'Disability support' },
      { label: 'Ujjwala LPG', col: 'pm_ujjwala_beneficiaries', note: 'Clean cooking' },
      { label: 'PM Awas', col: 'pm_cm_awas_beneficiaries', note: 'Housing scheme' },
      { label: 'Total Pensioners', col: 'old_age_pensioners', note: 'Safety net' },
    ],
    infra: [
      { label: 'Electrified HH', col: 'houses_with_electricity', note: 'Power access' },
      { label: 'Road Length', col: 'road_length_km', note: 'Network scale' },
      { label: 'Street Lights', col: 'total_street_lights', note: 'Public lighting' },
      { label: 'Public Toilets', col: 'public_toilets', note: 'Sanitation infra' },
      { label: 'Solar Homes', col: 'solar_installed_houses', note: 'Green energy' },
      { label: 'Govt Banks', col: 'govt_banks', note: 'Financial access' },
    ],
    tourism: [
      { label: 'Heritage Sites', col: 'cultural_assets', note: 'Asset base' },
      { label: 'Annual Fairs', col: 'annual_fairs', note: 'Cultural calendar' },
      { label: 'Daily Footfall', col: 'avg_daily_footfall_cultural_sites', note: 'Site traffic' },
      { label: 'Fair Footfall', col: 'avg_fair_footfall_daily', note: 'Event volume' },
      { label: 'Trained Guides', col: 'registered_trained_guides', note: 'Tourism workforce' },
      { label: 'Fair Employment', col: 'fair_employment', note: 'Livelihood from fairs' },
    ],
    env: [
      { label: 'Forest Area', col: 'forest_area_ha', note: 'Conservation asset' },
      { label: 'Pasture Land', col: 'pasture_land_ha', note: 'Commons base' },
      { label: 'Toilet Coverage', col: 'houses_with_toilets', note: 'ODF coverage' },
      { label: 'Biogas Plants', col: 'biogas_plants', note: 'Renewable energy' },
      { label: 'Compost Pits', col: 'govt_compost_pits', note: 'Waste management' },
      { label: 'PM Surya Ghar', col: 'pm_surya_ghar_houses', note: 'Solar homes' },
    ],
  };

  return (cardSets[sectorId] || []).map((card) => ({
    label: card.label,
    value: formatBaselineMetricValue(card.col, metrics[card.col]),
    note: card.note,
  }));
}

function getCoverageBars(sectorId: string, data: SectorPageData | null) {
  if (!data) return [];
  const primaryColumn = SECTOR_PRIMARY_BASELINE_COLUMN[sectorId];
  const baselineValue = primaryColumn ? data.baselineMetrics[primaryColumn] : undefined;
  const isPctColumn = primaryColumn?.includes('_pct') || false;
  const baselinePct = isPctColumn
    ? Math.round(Math.max(0, Math.min(100, typeof baselineValue === 'number' ? baselineValue : 0)) * 10) / 10
    : 0;
  const total = Math.max(data.aspTotalCount || 0, 1);
  const fundedPct = Math.round((data.aspStatusMix.funded / total) * 100);
  const fastTrackPct = Math.round((data.aspFastTrack / total) * 100);
  const clearedPct = Math.round(((data.aspStatusMix.accept + data.aspStatusMix.funded) / total) * 100);

  const primaryLabel = {
    water: 'FHTC Coverage',
    health: 'Funded Health Aspirations',
    agri: 'Irrigation Coverage',
    dairy: 'Funded Dairy Aspirations',
    edu: 'Funded Education Aspirations',
    employ: 'Funded Employment Aspirations',
    women: 'Funded Women Aspirations',
    welfare: 'Funded Welfare Aspirations',
    infra: 'Funded Infrastructure Aspirations',
    tourism: 'Funded Tourism Aspirations',
    env: 'Funded Environment Aspirations',
  }[sectorId] || 'Coverage';

  const primaryCurrent = isPctColumn ? baselinePct : fundedPct;
  const primaryTarget = isPctColumn ? 100 : 80;
  const primaryNote = isPctColumn ? 'Current baseline status' : 'Pipeline already funded';

  return [
    { label: primaryLabel, current: primaryCurrent, target: primaryTarget, color: '#0ea5e9', note: primaryNote },
    { label: 'Aspiration qty 2030', current: Math.min(Math.round((data.aspQty2030 / Math.max(data.aspQty2030 + data.aspQty2035 + data.aspQty2047, 1)) * 100), 100), target: 70, color: '#e85d04', note: '2030 share of total pipeline' },
    { label: 'Fast-track pipeline', current: fastTrackPct, target: 50, color: '#f59e0b', note: 'Priority execution share' },
    { label: 'Review cleared', current: clearedPct, target: 85, color: '#7c3aed', note: 'Accepted + funded share' },
  ];
}

export default function SectorPage() {
  const params = useParams();
  const sectorId = String(params.sector || '');
  const sector = getSectorByValue(sectorId);
  const { selectedDistrict } = useFilter();
  const [areaType, setAreaType] = useState<AreaType>('all');
  const [sectorData, setSectorData] = useState<SectorPageData | null>(null);
  const [sectorLoading, setSectorLoading] = useState(true);
  const [geminiInsights, setGeminiInsights] = useState<InsightItem[]>([]);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightFetched, setInsightFetched] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);

  useEffect(() => {
    if (!sector) return;
    let alive = true;
    setSectorLoading(true);
    setSectorData(null);
    setGeminiInsights([]);
    setInsightFetched(false);

    fetchSectorPageData({ sectorId: sector.v, areaType, district: selectedDistrict || null })
      .then((data) => {
        if (alive) {
          setSectorData(data);
          setSectorLoading(false);
          setInsightFetched(false);
        }
      })
      .catch(() => {
        if (alive) setSectorLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [areaType, sector?.v, sector, selectedDistrict]);

  const baselineCards = useMemo(
    () => getBaselineMetricCards(sector?.v || '', sectorData?.baselineMetrics || {}),
    [sector?.v, sectorData]
  );

  const coverageBars = useMemo(
    () => getCoverageBars(sector?.v || '', sectorData),
    [sector?.v, sectorData]
  );

  async function fetchGeminiInsights() {
    if (!sectorData || insightLoading) return;
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    console.log('[Gemini] API key present:', !!apiKey, '| sector:', sector?.label, '| aspTotalCount:', sectorData?.aspTotalCount);
    if (!apiKey) return;

    setInsightLoading(true);
    setInsightError(null);

    const baselineStr = Object.entries(sectorData.baselineMetrics || {})
      .slice(0, 12)
      .map(([key, value]) => `${key}: ${Number(value).toLocaleString('en-IN')}`)
      .join(', ');

    const prompt = `You are Manthaan AI, planning intelligence for Viksit Rajasthan @ 2047.
Analyze ${sector?.label} sector data (${sectorData.areaType} scope, all Rajasthan):

BASELINE (30%): ${baselineStr}

ASPIRATIONS (70%):
- Total valid aspirations: ${sectorData.aspTotalCount}
- 2030 target qty: ${sectorData.aspQty2030.toLocaleString('en-IN')}
- 2035 target qty: ${sectorData.aspQty2035.toLocaleString('en-IN')}
- 2047 target qty: ${sectorData.aspQty2047.toLocaleString('en-IN')}
- Funded: ${sectorData.aspFunded}, Fast-track: ${sectorData.aspFastTrack}, P-1: ${sectorData.aspP1}
- P-1 priority count: ${sectorData.aspP1}
- Top demand item: ${sectorData.topAspItems?.[0]?.item || '—'} (qty_2030: ${Number(sectorData.topAspItems?.[0]?.qty2030 || 0).toLocaleString('en-IN')})
- #2: ${sectorData.topAspItems?.[1]?.item || '—'} | #3: ${sectorData.topAspItems?.[2]?.item || '—'}

Write 3 planning intelligence insights in proper Hindi (Devanagari). Mix of pattern recognition, opportunity, and critical gap. Return ONLY valid JSON array, no markdown:
[
  { "type": "critical", "heading": "15 word Hindi heading", "body": "2-3 Hindi sentences with specific numbers from above data. Cite a real scheme like JJM/NHM/PMKSY/SRLM." },
  { "type": "opportunity", "heading": "15 word Hindi heading", "body": "2-3 Hindi sentences about biggest aspiration opportunity and which scheme should converge." },
  { "type": "pattern", "heading": "15 word Hindi heading", "body": "2-3 Hindi sentences on a pattern — e.g. gap between baseline and aspiration qty, or concentration in certain priority level." }
]`;

    const GEMINI_MODELS = ['gemini-3.0-flash', 'gemini-3.0-flash-lite', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'];
    let lastError: string | null = null;
    let parsed: InsightItem[] = [];
    let succeeded = false;

    for (const model of GEMINI_MODELS) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
            }),
          }
        );

        if (response.status === 429 || response.status === 503) {
          lastError = `${model}: rate limited`;
          await new Promise((resolve) => setTimeout(resolve, 1500));
          continue;
        }

        const result = await response.json();

        if (result.error) {
          lastError = `${model}: ${result.error.message}`;
          continue;
        }

        const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';

        // Strip markdown fences
        let clean = text.replace(/```json[\s\S]*?```/g, (m: string) => m.replace(/```json|```/g, '')).replace(/```/g, '').trim();

        // If JSON is truncated (unterminated), attempt to repair it:
        // Find the last complete object ending with }
        if (!clean.endsWith(']')) {
          const lastClosingBrace = clean.lastIndexOf('}');
          if (lastClosingBrace > 0) {
            clean = clean.slice(0, lastClosingBrace + 1) + ']';
          } else {
            lastError = `${model}: response truncated before any complete object`;
            continue;
          }
        }

        // Remove any trailing commas before ] (invalid JSON)
        clean = clean.replace(/,\s*]/g, ']').replace(/,\s*}/g, '}');

        try {
          parsed = JSON.parse(clean);
        } catch (parseErr: any) {
          lastError = `${model}: JSON parse failed — ${parseErr.message}`;
          continue;
        }

        if (Array.isArray(parsed) && parsed.length > 0) {
          succeeded = true;
          break;
        }
      } catch (err: any) {
        lastError = `${model}: ${err.message}`;
        continue;
      }
    }

    if (succeeded) {
      setGeminiInsights(parsed);
      setInsightError(null);
      setInsightFetched(true);
    } else {
      console.warn('[Gemini sector insight] all models failed. Last error:', lastError);
      setInsightError(`AI insights unavailable. ${lastError || 'Check API key.'}`);
      setGeminiInsights([]);
    }

    setInsightLoading(false);
  }

  if (!sector) {
    return <div className="pg-t">Sector not found</div>;
  }

  const topAspItems = sectorData?.topAspItems || [];
  const statusMix = sectorData?.aspStatusMix || { funded: 0, accept: 0, review: 0 };
  const totalAsp = Math.max(sectorData?.aspTotalCount || 0, 1);
  const aspirationTimeline = [
    { label: '2030 — Short Term', value: sectorData?.aspQty2030 || 0, color: '#e85d04', note: 'Immediate priority' },
    { label: '2035 — Medium Term', value: sectorData?.aspQty2035 || 0, color: '#0891b2', note: 'Structural phase' },
    { label: '2047 — Long Term (VR)', value: sectorData?.aspQty2047 || 0, color: '#7c3aed', note: 'Viksit Rajasthan goal' },
  ];
  const maxTimeline = Math.max(...aspirationTimeline.map((row) => row.value), 1);
  const baselineSummary = sectorData
    ? `${formatMetricNumber(sectorData.aspTotalCount)} aspirations · ${formatMetricNumber(sectorData.aspFastTrack)} fast-track items · ${formatMetricNumber(sectorData.aspFunded)} funded · ${selectedDistrict ? selectedDistrict + ' district' : 'All Rajasthan'}`
    : 'Loading sector intelligence...';

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', padding: 24, color: '#1a2744' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div className="pg-t">{sector.label}</div>
          <div className="ai-badge">VR 2047 · AI Analysis</div>
        </div>
        <div className="pg-s">{baselineSummary}</div>
      </div>

      <div style={{ display: 'inline-flex', gap: 4, padding: 4, background: '#f1f5f9', borderRadius: 10, marginBottom: 20 }}>
        {(['all', 'rural', 'urban'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setAreaType(tab)}
            style={{
              border: 'none',
              borderRadius: 8,
              padding: '8px 20px',
              background: areaType === tab ? '#ffffff' : 'transparent',
              color: areaType === tab ? '#1a2744' : '#64748b',
              boxShadow: areaType === tab ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              fontWeight: areaType === tab ? 700 : 600,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            {tab === 'all' ? 'ALL (Rural + Urban)' : tab === 'rural' ? 'Rural Only' : 'Urban Only'}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <HeroKpiCard label={getPrimaryBaselineLabel(sector.v, areaType)} value={sectorLoading ? '—' : formatHeroBaselineKpi(sector.v, sectorData?.baselineMetrics, 'primary')} sub="Baseline · All Rajasthan" accentColor="#1e3a5f" badge="BASELINE" />
        <HeroKpiCard label={getSecondaryBaselineLabel(sector.v, areaType)} value={sectorLoading ? '—' : formatHeroBaselineKpi(sector.v, sectorData?.baselineMetrics, 'secondary')} sub="Baseline · All Rajasthan" accentColor="#1e3a5f" badge="BASELINE" />
        <HeroKpiCard label="2030 Aspiration Target" value={sectorLoading ? '—' : formatMetricNumber(sectorData?.aspQty2030 || 0)} sub={`${formatMetricNumber(sectorData?.aspTotalCount || 0)} total aspirations`} accentColor="#e85d04" badge="ASPIRATIONS" />
        <HeroKpiCard label="Strategic Priority Items" value={sectorLoading ? '—' : formatMetricNumber((sectorData?.aspFunded || 0) + (sectorData?.aspFastTrack || 0))} sub={`${formatMetricNumber(sectorData?.aspFunded || 0)} funded · ${formatMetricNumber(sectorData?.aspFastTrack || 0)} fast-track`} accentColor="#16a34a" badge="FUNDED + FAST-TRACK" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ ...LIGHT_CARD_STYLE, padding: 20 }}>
            <div className="ct">Top Aspirations — {sector.label}</div>
            <div className="cs">Grouped by sub-indicator · sorted by 2030 target quantity</div>
            {sectorLoading ? (
              <div style={{ color: '#94a3b8', fontStyle: 'italic', marginTop: 12 }}>Loading...</div>
            ) : (
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {topAspItems.slice(0, 6).map((item, index) => {
                  const maxQty = topAspItems[0]?.qty2030 || 1;
                  const pct = Math.round((item.qty2030 / maxQty) * 100);
                  return (
                    <div key={`${item.item}-${index}`}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                        <div style={{ fontWeight: 700, color: '#1a2744', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.item}</div>
                        <div style={{ flexShrink: 0, marginLeft: 12, color: '#64748b', fontSize: 12 }}>
                          {formatMetricNumber(item.qty2030)} · {formatMetricNumber(item.count)} माँगें
                        </div>
                      </div>
                      <div style={{ height: 6, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: '#e85d04', borderRadius: 999, transition: 'width 0.4s' }} />
                      </div>
                      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{item.dept || '—'}{item.fastTrack ? ' · ⚡ Fast-track' : ''}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ ...LIGHT_CARD_STYLE, padding: 20 }}>
            <div className="ct">Baseline Snapshot — {sector.label}</div>
            <div className="cs">30% weight · current ground reality · all Rajasthan</div>
            {sectorLoading ? (
              <div style={{ color: '#94a3b8', fontStyle: 'italic', marginTop: 12 }}>Loading...</div>
            ) : (
              <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {baselineCards.map((card, index) => (
                  <div key={`${card.label}-${index}`} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px', borderTop: '3px solid #1e3a5f' }}>
                    <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>{card.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: '#1a2744', marginTop: 6, lineHeight: 1 }}>{card.value}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>{card.note}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ ...LIGHT_CARD_STYLE, padding: 20 }}>
            <div className="ct">Aspiration Status Mix</div>
            <div className="cs">Accept · Review · Funded breakdown for {sector.label}</div>
            {sectorLoading ? (
              <div style={{ color: '#94a3b8', fontStyle: 'italic', marginTop: 12 }}>Loading...</div>
            ) : (
              <div style={{ marginTop: 14 }}>
                <div style={{ height: 14, borderRadius: 999, overflow: 'hidden', display: 'flex', marginBottom: 12 }}>
                  <div style={{ width: `${(statusMix.funded / totalAsp) * 100}%`, background: '#16a34a' }} title={`Funded: ${statusMix.funded}`} />
                  <div style={{ width: `${(statusMix.accept / totalAsp) * 100}%`, background: '#e85d04' }} title={`Accept: ${statusMix.accept}`} />
                  <div style={{ width: `${(statusMix.review / totalAsp) * 100}%`, background: '#64748b' }} title={`Review: ${statusMix.review}`} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {[
                    { label: 'Funded', value: statusMix.funded, color: '#16a34a', bg: '#dcfce7' },
                    { label: 'Accepted', value: statusMix.accept, color: '#e85d04', bg: '#fff7ed' },
                    { label: 'Review', value: statusMix.review, color: '#64748b', bg: '#f1f5f9' },
                  ].map((item) => (
                    <div key={item.label} style={{ background: item.bg, borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: item.color }}>{formatMetricNumber(item.value)}</div>
                      <div style={{ fontSize: 10, color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3 }}>{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ ...LIGHT_CARD_STYLE, padding: 20 }}>
            <div className="ct">Coverage Progress</div>
            <div className="cs">Baseline current vs aspiration targets</div>
            {sectorLoading ? (
              <div style={{ color: '#94a3b8', fontStyle: 'italic', marginTop: 12 }}>Loading...</div>
            ) : (
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {coverageBars.map((bar) => (
                  <div key={bar.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12 }}>
                      <span style={{ fontWeight: 700, color: '#1a2744' }}>{bar.label}</span>
                      <span style={{ color: bar.color, fontWeight: 800 }}>{Number(bar.current).toFixed(1)}% / {bar.target}%</span>
                    </div>
                    <div style={{ height: 8, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.max(0, Math.min(bar.current, 100))}%`, background: bar.color, borderRadius: 999 }} />
                    </div>
                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3 }}>{bar.note}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ ...LIGHT_CARD_STYLE, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: 12 }}>
              <div className="ct">Manthaan AI · Pattern Intelligence</div>
              <button
                onClick={fetchGeminiInsights}
                disabled={insightLoading || sectorLoading}
                style={{
                  background: insightLoading ? '#f1f5f9' : '#1a2744',
                  color: insightLoading ? '#94a3b8' : 'white',
                  border: 'none',
                  borderRadius: 8,
                  padding: '7px 14px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: insightLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {insightLoading ? 'Analyzing...' : insightFetched ? 'Refresh AI Insights' : 'Generate AI Insights'}
              </button>
            </div>
            <div className="cs">Baseline + Aspirations pattern recognition</div>

            {insightLoading && (
              <div style={{ marginTop: 14, color: '#64748b', fontStyle: 'italic', fontSize: 13 }}>
                Manthaan AI विश्लेषण कर रहा है...
              </div>
            )}

            {!insightLoading && geminiInsights.length === 0 && (
              <div style={{ marginTop: 14, padding: '20px', background: insightError ? '#fef2f2' : '#f8fafc', borderRadius: 12, border: `1px dashed ${insightError ? '#fecdd3' : '#e2e8f0'}`, textAlign: 'center' }}>
                {insightError ? (
                  <>
                    <div style={{ fontSize: 13, color: '#dc2626', fontWeight: 600, marginBottom: 4 }}>⚠ {insightError}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>API key: {process.env.NEXT_PUBLIC_GEMINI_API_KEY ? '✓ present' : '✗ missing'}</div>
                  </>
                ) : (
                  <div style={{ fontSize: 13, color: '#64748b' }}>
                    Baseline और aspirations data को merge करके AI planning insights generate करें।<br />
                    <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, display: 'block' }}>
                      {sectorData ? `${sectorData.aspTotalCount} aspirations + ${Object.keys(sectorData.baselineMetrics || {}).length} baseline metrics ready` : 'Data loading...'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {geminiInsights.length > 0 && (
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {geminiInsights.map((insight, index) => {
                  const colors: Record<string, { bg: string; border: string; label: string; labelColor: string }> = {
                    critical: { bg: '#fff1f2', border: '#fecdd3', label: 'Critical Gap', labelColor: '#dc2626' },
                    opportunity: { bg: '#f0fdf4', border: '#bbf7d0', label: 'Opportunity', labelColor: '#16a34a' },
                    pattern: { bg: '#eff6ff', border: '#bfdbfe', label: 'Pattern', labelColor: '#2563eb' },
                  };
                  const style = colors[insight.type || 'pattern'] || colors.pattern;
                  return (
                    <div key={`${insight.heading || 'insight'}-${index}`} style={{ background: style.bg, border: `1px solid ${style.border}`, borderRadius: 12, padding: '14px 16px' }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: style.labelColor, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>{style.label}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1a2744', marginBottom: 4, lineHeight: 1.4 }}>{insight.heading}</div>
                      <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.7, fontFamily: 'Noto Sans Devanagari, sans-serif' }}>{insight.body}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ ...LIGHT_CARD_STYLE, padding: 20 }}>
            <div className="ct">Aspiration Target Timeline</div>
            <div className="cs">Total qty demanded across 2030 · 2035 · 2047 horizons</div>
            {sectorLoading ? (
              <div style={{ color: '#94a3b8', fontStyle: 'italic', marginTop: 12 }}>Loading...</div>
            ) : (
              <div style={{ marginTop: 14 }}>
                {aspirationTimeline.map((row) => {
                  const pct = Math.round((row.value / maxTimeline) * 100);
                  return (
                    <div key={row.label} style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12 }}>
                        <span style={{ fontWeight: 700, color: '#1a2744' }}>{row.label}</span>
                        <span style={{ color: row.color, fontWeight: 800 }}>{formatMetricNumber(row.value)}</span>
                      </div>
                      <div style={{ height: 8, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: row.color, borderRadius: 999 }} />
                      </div>
                      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3 }}>{row.note}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ ...LIGHT_CARD_STYLE, padding: 20 }}>
            <div className="ct">Districts with Highest Aspiration Density</div>
            <div className="cs">Count of valid aspirations in {sector.label} sector</div>
            {sectorLoading ? (
              <div style={{ color: '#94a3b8', fontStyle: 'italic', marginTop: 12 }}>Loading...</div>
            ) : (
              <div style={{ marginTop: 12 }}>
                {(sectorData?.distAspBreakdown || []).slice(0, 10).map((row, index) => {
                  const maxCount = sectorData?.distAspBreakdown?.[0]?.count || 1;
                  const pct = Math.round((row.count / maxCount) * 100);
                  return (
                    <div key={`${row.district}-${index}`} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <div style={{ width: 18, fontSize: 11, color: '#94a3b8', fontWeight: 700, flexShrink: 0 }}>{index + 1}</div>
                      <div style={{ width: 110, fontSize: 12, fontWeight: 600, color: '#1a2744', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.district}</div>
                      <div style={{ flex: 1, height: 6, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: '#1e3a5f', borderRadius: 999 }} />
                      </div>
                      <div style={{ width: 42, fontSize: 12, fontWeight: 700, color: '#64748b', textAlign: 'right', flexShrink: 0 }}>{row.count}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ ...LIGHT_CARD_STYLE, padding: 20 }}>
            <div className="ct">P-1 Priority Aspirations</div>
            <div className="cs">High-priority demand items · {sector.label}</div>
            {sectorLoading ? (
              <div style={{ color: '#94a3b8', fontStyle: 'italic', marginTop: 12 }}>Loading...</div>
            ) : (
              <div style={{ marginTop: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 16 }}>
                  {[
                    { label: 'P-1 Items', value: sectorData?.aspP1 || 0, color: '#dc2626', bg: '#fef2f2' },
                    { label: 'Fast-track', value: sectorData?.aspFastTrack || 0, color: '#e85d04', bg: '#fff7ed' },
                    { label: 'Funded', value: sectorData?.aspFunded || 0, color: '#16a34a', bg: '#f0fdf4' },
                    { label: 'Total', value: sectorData?.aspTotalCount || 0, color: '#1e3a5f', bg: '#eff6ff' },
                  ].map((item) => (
                    <div key={item.label} style={{ background: item.bg, borderRadius: 10, padding: '10px 12px' }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: item.color }}>{formatMetricNumber(item.value)}</div>
                      <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3 }}>{item.label}</div>
                    </div>
                  ))}
                </div>

                {(() => {
                  const total = Math.max(sectorData?.aspTotalCount || 1, 1);
                  const p1 = sectorData?.aspP1 || 0;
                  const funded = sectorData?.aspFunded || 0;
                  const fastTrack = sectorData?.aspFastTrack || 0;
                  const p1Pct = Math.round((p1 / total) * 100);
                  const fundedPct2 = Math.round((funded / total) * 100);
                  const ftPct = Math.round((fastTrack / total) * 100);

                  return [
                    { label: 'Priority 1 (High)', pct: p1Pct, color: '#dc2626' },
                    { label: 'Funded pipeline', pct: fundedPct2, color: '#16a34a' },
                    { label: 'Fast-track', pct: ftPct, color: '#e85d04' },
                  ].map((bar) => (
                    <div key={bar.label} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                        <span style={{ fontWeight: 600, color: '#1a2744' }}>{bar.label}</span>
                        <span style={{ color: bar.color, fontWeight: 700 }}>{bar.pct}%</span>
                      </div>
                      <div style={{ height: 7, background: '#f1f5f9', borderRadius: 999 }}>
                        <div style={{ height: '100%', width: `${bar.pct}%`, background: bar.color, borderRadius: 999 }} />
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}