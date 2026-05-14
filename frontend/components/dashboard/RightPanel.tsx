"use client";

import { useEffect, useState } from 'react';
import { SECTORS } from '@/lib/data';
import { fetchDashboardKpis, getEmptyDashboardPayload } from '@/lib/dashboard-kpis';

interface RightPanelProps {
  isOpen: boolean;
  districtName: string | null;
  onClose: () => void;
}

export default function RightPanel({ isOpen, districtName, onClose }: RightPanelProps) {
  const [district, setDistrict] = useState<any>(null);

  useEffect(() => {
    let alive = true;
    if (!districtName) {
      setDistrict(null);
      return;
    }

    fetchDashboardKpis({ district: districtName })
      .then((payload) => {
        if (!alive) return;
        setDistrict(payload.districtScores?.[0] ?? null);
      })
      .catch(() => {
        if (alive) setDistrict(null);
      });

    return () => {
      alive = false;
    };
  }, [districtName]);

  return (
    <div id="panel" className={isOpen ? 'open' : ''} aria-hidden={!isOpen}>
      <div className="ph">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="pc" onClick={onClose}>✕</button>
          <div>
            <div style={{ fontWeight: 800 }}>{district?.n ?? 'No district'}</div>
            <div style={{ fontSize: 12, color: 'var(--t3)' }}>Live KPI snapshot</div>
          </div>
        </div>
      </div>

      <div className="pb">
        <div className="card">
          <div className="ct">District snapshot</div>
          <div className="pg-t">{district?.n ?? '—'}</div>
          <div className="pg-s">Population: {district?.pop ? `${district.pop.toFixed(1)}L` : '—'}</div>
        </div>

        <div className="card">
          <div className="ct">Needs</div>
          <div className="dbar">
            <div className="dbn">Water</div>
            <div className="dbt"><div className="dbf" style={{ width: `${district?.sc_water ?? 0}%`, background: '#3B82F6' }} /></div>
            <div className="dbv">{district?.sc_water ?? '-'}</div>
          </div>
        </div>

        {district && (
          <>
            <div className="card" style={{ marginTop: '12px' }}>
              <div className="ct">11-Sector Scores</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px' }}>
                {SECTORS.map((sector) => {
                  const raw = district ? Number((district as any)[sector.key as keyof typeof district]) : null;
                  const val = raw === null || Number.isNaN(raw) ? null : raw;
                  const color = val === null ? '#64748B' : val >= 55 ? '#22C55E' : val >= 45 ? '#F59E0B' : '#EF4444';
                  return (
                    <div key={sector.v} style={{ padding: '8px', background: 'var(--sf2)', borderRadius: 'var(--r)', border: '1px solid var(--bd)', textAlign: 'center' }}>
                      <div style={{ fontSize: '9px', color: 'var(--t3)', marginBottom: '4px' }}>{sector.label.split(' ')[0]}</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color }}>{val === null ? '-' : val}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card" style={{ marginTop: '12px' }}>
              <div className="ct">Key Metrics</div>
              <div style={{ marginTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '5px 0', borderBottom: '1px solid var(--bd)' }}>
                  <span>Population (rural)</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{district?.pop ? `${district.pop.toFixed(1)}L` : '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '5px 0', borderBottom: '1px solid var(--bd)' }}>
                  <span>Population (urban)</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>—</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '5px 0', borderBottom: '1px solid var(--bd)' }}>
                  <span>FHTC %</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{district?.sc_water ?? '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '5px 0', borderBottom: '1px solid var(--bd)' }}>
                  <span>Irrigation %</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{district?.sc_agri ?? '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '5px 0', borderBottom: '1px solid var(--bd)' }}>
                  <span>Milk (LPD)</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>—</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '5px 0' }}>
                  <span>Composite Score</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '12px', color: '#E85C0D' }}>{district?.dev ?? '—'}/100</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
