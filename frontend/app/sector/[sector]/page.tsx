'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getSectorByValue, getSectorColor } from '@/lib/data';
import KPICard from '@/components/dashboard/KPICard';
import dynamic from 'next/dynamic';
import { fetchDashboardKpis, getEmptyDashboardPayload, DashboardKpiPayload, AreaType } from '@/lib/dashboard-kpis';

const SectorDistributionChart = dynamic(() => import('@/components/dashboard/charts/SectorDistributionChart'), { ssr: false });

type ColorKey = 's' | 'w' | 'd' | 'bl' | 'tl' | 'pu' | 'pk' | 'gn';

type SectorTemplate = {
  kpis: Array<{ value: string; label: string; sub: string; color: ColorKey; fill: number }>;
  insights: Array<{ tone: 'd' | 'w' | 's' | 'i' | 'p' | 't'; heading: string; body: string }>;
};

const KPI_INDEX: Record<string, number> = {
  water: 0,
  health: 1,
  agri: 2,
  dairy: 3,
  edu: 4,
  employ: 5,
  women: 6,
  welfare: 7,
  infra: 8,
  tourism: 9,
  env: 10,
};

const LIGHT_CARD_STYLE = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 12,
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
} as const;

function buildSectorTemplate(dashboard: DashboardKpiPayload, sectorKey: string, sectorLabel: string, sorted: DashboardKpiPayload['districtScores']) : SectorTemplate {
  const score = Number(dashboard.radarScores[sectorKey as keyof typeof dashboard.radarScores] ?? 0);
  const topKpi = dashboard.topKPIs[KPI_INDEX[sectorKey] ?? 0];
  const leading = sorted[0]?.n ?? 'No district';
  const lagging = sorted[sorted.length - 1]?.n ?? 'No district';

  return {
    kpis: [
      { value: topKpi?.value ?? '-', label: `${sectorLabel} live`, sub: topKpi?.status ?? 'Live baseline', color: topKpi?.colorKey ?? 's', fill: topKpi?.fill ?? score },
      { value: `${score}`, label: 'Live sector score', sub: 'Supabase baseline', color: 's', fill: score },
      { value: leading, label: 'Leading district', sub: 'Top live score', color: 'bl', fill: score },
      { value: lagging, label: 'Needs attention', sub: 'Lowest live score', color: 'd', fill: 100 - score },
    ],
    insights: [
      { tone: 'i', heading: `${sectorLabel} live ranking updated`, body: `The sector cards now come from the live dashboard payload and the selected district filter will update the ranking in real time.` },
      { tone: 'w', heading: `Top district: ${leading}`, body: `Lowest district: ${lagging}. Values are sourced from the same Supabase aggregation used by the command center.` },
    ],
  };
}

export default function SectorPage() {
  const params = useParams();
  const sectorId = params.sector as string;
  const sector = getSectorByValue(sectorId);
  const [areaType, setAreaType] = useState<AreaType>('all');
  const [dashboard, setDashboard] = useState<DashboardKpiPayload>(getEmptyDashboardPayload());

  useEffect(() => {
    let alive = true;
    fetchDashboardKpis({ areaType })
      .then((payload) => {
        if (alive && payload) setDashboard(payload);
      })
      .catch(() => {
        if (alive) setDashboard(getEmptyDashboardPayload());
      });

    return () => {
      alive = false;
    };
  }, [areaType]);

  if (!sector) {
    return <div className="pg-t">Sector not found</div>;
  }

  const sorted = [...dashboard.districtScores].sort((a, b) =>
    (b[sector.key as keyof typeof b] as number) - (a[sector.key as keyof typeof a] as number)
  );

  const sectorValues = dashboard.districtScores.map(d => d[sector.key as keyof typeof d] as number);
  const avg = Math.round(sectorValues.reduce((sum, v) => sum + v, 0) / sectorValues.length);
  const top5 = sorted.slice(0, 5);
  const bottom5 = sorted.slice(-5).reverse();
  const labels = sorted.map(d => (d.n.length > 9 ? `${d.n.slice(0, 8)}..` : d.n));
  const values = sorted.map(d => d[sector.key as keyof typeof d] as number);
  const template = buildSectorTemplate(dashboard, sector.v, sector.label, sorted);

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', padding: 24, color: '#1a2744' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 3 }}>
          <div className="pg-t">{sector.label}</div>
          <div className="ai-badge">VR 2047 · AI Analysis</div>
        </div>
        <div className="pg-s">All districts — select a district above for specific analysis</div>
      </div>

      {/* Area Type Filter */}
      <div style={{ display: 'inline-flex', gap: 4, padding: 4, background: '#f1f5f9', borderRadius: 10 }}>
        <button
          onClick={() => setAreaType('all')}
          style={{ border: 'none', borderRadius: 8, padding: '8px 20px', background: areaType === 'all' ? '#ffffff' : 'transparent', color: areaType === 'all' ? '#1a2744' : '#64748b', boxShadow: areaType === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', fontWeight: areaType === 'all' ? 700 : 600, cursor: 'pointer' }}
        >
          ALL (Rural + Urban)
        </button>
        <button
          onClick={() => setAreaType('rural')}
          style={{ border: 'none', borderRadius: 8, padding: '8px 20px', background: areaType === 'rural' ? '#ffffff' : 'transparent', color: areaType === 'rural' ? '#1a2744' : '#64748b', boxShadow: areaType === 'rural' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', fontWeight: areaType === 'rural' ? 700 : 600, cursor: 'pointer' }}
        >
          Rural Only
        </button>
        <button
          onClick={() => setAreaType('urban')}
          style={{ border: 'none', borderRadius: 8, padding: '8px 20px', background: areaType === 'urban' ? '#ffffff' : 'transparent', color: areaType === 'urban' ? '#1a2744' : '#64748b', boxShadow: areaType === 'urban' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', fontWeight: areaType === 'urban' ? 700 : 600, cursor: 'pointer' }}
        >
          Urban Only
        </button>
      </div>

      <div className="kstrip">
        {template.kpis.map((kpi, i) => (
          <KPICard
            key={`${sector.v}-kpi-${i}`}
            label={kpi.label}
            value={kpi.value}
            status={kpi.sub}
            colorKey={kpi.color}
            fill={kpi.fill}
          />
        ))}
      </div>

      <div className="g2">
        <div>
          <div style={{ ...LIGHT_CARD_STYLE, padding: 20, marginBottom: 12 }}>
            <div className="ct">{sector.label} score — all districts</div>
            <div className="cs">State average: {avg}/100 · hover bars for district detail · click bar to open district panel</div>
            <SectorDistributionChart labels={labels} data={values} />
          </div>
          <div style={{ ...LIGHT_CARD_STYLE, padding: 20, marginBottom: 12 }}>
            <div className="ct">5 districts needing most attention</div>
            <div className="space-y-1 mt-2">
              {bottom5.map((d) => {
                const score = d[sector.key as keyof typeof d] as number;
                const col = getSectorColor(score);
                return (
                  <div key={`bottom-${d.n}`} className="dbar">
                    <span className="dbn" style={{ color: col }}>{d.n}</span>
                    <div className="dbt">
                      <div className="dbf" style={{ width: `${score}%`, background: col }} />
                    </div>
                    <span className="dbv" style={{ color: col }}>{score}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div>
          <div style={{ ...LIGHT_CARD_STYLE, padding: 20, marginBottom: 12 }}>
            <div className="ct">5 leading districts</div>
            <div className="space-y-1 mt-2">
              {top5.map((d) => {
                const score = d[sector.key as keyof typeof d] as number;
                const col = getSectorColor(score);
                return (
                  <div key={`top-${d.n}`} className="dbar">
                    <span className="dbn" style={{ color: col }}>{d.n}</span>
                    <div className="dbt">
                      <div className="dbf" style={{ width: `${score}%`, background: col }} />
                    </div>
                    <span className="dbv" style={{ color: col }}>{score}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ ...LIGHT_CARD_STYLE, padding: 20, marginBottom: 12 }}>
            <div className="ct">VR 2047 Planning Insights</div>
            <div className="cs">RITI Intelligence · click for deep dive</div>
            <div className="space-y-2 mt-2">
              {template.insights.map((it, i) => (
                <div key={`ins-${i}`} className={`ins ${it.tone}`}>
                  <div className="ins-tag">State pattern</div>
                  <div className="ins-h">{it.heading}</div>
                  <div className="ins-b">{it.body}</div>
                </div>
              ))}
            </div>
            <button className="btn btn-ai" style={{ width: '100%', justifyContent: 'center', marginTop: 7 }}>
              AI deep dive into {sector.label}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}