
'use client';

import { useEffect, useState } from 'react';
import { SECTORS, getSectorColor } from '@/lib/data';
import KPICard from '@/components/dashboard/KPICard';
import RadarChart from '@/components/dashboard/charts/RadarChart';
import { DashboardKpiPayload, fetchDashboardKpis, getEmptyDashboardPayload, AreaType } from '@/lib/dashboard-kpis';

import { useFilter } from '@/components/FilterContext';

export default function CommandCenterPage() {
  const { urbanFilter, setUrbanFilter, selectedDistrict } = useFilter();
  const [dashboard, setDashboard] = useState<DashboardKpiPayload>(getEmptyDashboardPayload());

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

  const topKPIs = dashboard.topKPIs;
  const avgScores = dashboard.radarScores;
  const rankedDistricts = [...dashboard.districtScores].sort((a, b) => b.dev - a.dev);

  const prioritySignals = [
    {
      severity: 'w',
      heading: `Water gap snapshot: ${topKPIs[0]?.value ?? '-'}`,
      body: 'The live dashboard compares rural and urban FHTC directly so the district filter can surface the biggest access gap.',
    },
    {
      severity: 's',
      heading: `Dairy potential snapshot: ${topKPIs[2]?.value ?? '-'}`,
      body: 'The live calculation comes from daily milk production multiplied by the SARAS rate and can drop to - when the source is null.',
    },
    {
      severity: 'i',
      heading: `Welfare snapshot: ${topKPIs[4]?.value ?? '-'}`,
      body: 'Widow pension coverage is now sourced from Supabase instead of a hardcoded statewide constant.',
    },
    {
      severity: 'g',
      heading: `Tourism potential: ${topKPIs[7]?.value ?? '-'}`,
      body: 'Cultural and heritage site visitation drives employment and entrepreneurship at the grassroots level.',
    },
  ];

  const dataCoverage = dashboard.dataCoverage;
  const popLabel = urbanFilter === 'all'
    ? 'Total population'
    : urbanFilter === 'rural'
    ? 'Rural population'
    : 'Urban population';
  const femalePopLabel = urbanFilter === 'all'
    ? 'Female population'
    : urbanFilter === 'rural'
    ? 'Female population (rural)'
    : 'Female population (urban)';
  const coverageRows = dataCoverage.filter(([label]) => {
    if (urbanFilter === 'rural') return label !== 'Urban wards';
    if (urbanFilter === 'urban') return label !== 'Rural GPs';
    return true;
  }).map(([label, value]) => {
    if (label === 'Rural pop') return [popLabel, value] as const;
    if (label === 'Female pop') return [femalePopLabel, value] as const;
    return [label, value] as const;
  });

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <div className="pg-t flex items-baseline gap-2">
          Rajasthan Planning Command Center
          <div className="ai-badge">VR 2047 · AI Analysis</div>
        </div>
        <div className="pg-s">
          Viksit Rajasthan @ 2047 · RITI Planning Intelligence · Live baseline snapshot from Supabase
        </div>
      </div>

      {/* Area Type Filter (Linked to Global State) */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setUrbanFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            urbanFilter === 'all'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          ALL (Rural + Urban)
        </button>
        <button
          onClick={() => setUrbanFilter('rural')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            urbanFilter === 'rural'
              ? 'bg-green-600 text-white shadow-lg'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          Rural Only
        </button>
        <button
          onClick={() => setUrbanFilter('urban')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            urbanFilter === 'urban'
              ? 'bg-orange-600 text-white shadow-lg'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          Urban Only
        </button>
      </div>

      <div className="kstrip">
        {topKPIs.map((kpi, i) => (
          <KPICard 
            key={i}
            label={kpi.label}
            value={kpi.value}
            status={kpi.status}
            colorKey={kpi.colorKey}
            fill={kpi.fill}
          />
        ))}
      </div>

      <div className="g2">
        <div className="space-y-3">
          <div className="card">
            <div className="ct">11-Sector Development Radar</div>
            <div className="cs">State average across 11 sectors — hover to see scores, click axis to open sector dashboard</div>
            <div style={{ marginTop: 12, height: 295 }}>
              <RadarChart
                labels={['Water', 'Health', 'Agri', 'Dairy', 'Edu', 'Employ', 'Women', 'Welfare', 'Infra', 'Tourism', 'Env']}
                data={SECTORS.map(s => avgScores[s.v as keyof typeof avgScores] || 0)}
              />
            </div>
          </div>

          <div className="card">
            <div className="ct">Data coverage & validation</div>
            <div style={{ fontSize: 11 }}>
              {coverageRows.map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '4px 0',
                    borderBottom: '1px solid rgba(255,255,255,.05)',
                  }}
                >
                  <span style={{ color: '#475569' }}>{label}</span>
                  <span style={{ color: '#F1F5F9', fontWeight: 700 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="card">
            <div className="ct">State-level priority signals</div>
            <div className="cs">RITI · CDO-validated · VR 2047</div>
            <div className="space-y-2 mt-3">
              {prioritySignals.map((signal, i) => (
                <div key={i} className={`ins ${signal.severity}`}>
                  <div className="ins-tag">VR 2047 Intelligence</div>
                  <div className="ins-h text-12px">{signal.heading}</div>
                  <div className="ins-b">{signal.body}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="ct">All Districts — Composite Score</div>
            <div className="cs">Click to open full 11-sector panel</div>
            <div className="mt-2 space-y-1" style={{ maxHeight: 295, overflowY: 'auto' }}>
              {rankedDistricts.map((d, i) => (
                <div 
                  key={d.n}
                  className="dbar"
                >
                  <div className="dbn text-11px">{d.n}</div>
                  <div className="dbt">
                    <div 
                      className="dbf" 
                      style={{ 
                        width: `${d.dev}%`,
                        background: getSectorColor(d.dev)
                      }}
                    ></div>
                  </div>
                  <div className="dbv" style={{ color: getSectorColor(d.dev) }}>{d.dev}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
