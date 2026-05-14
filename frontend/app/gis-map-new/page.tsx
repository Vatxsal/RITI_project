"use client"
import React, { useEffect, useState } from 'react'
import { fetchDashboardKpis, getEmptyDashboardPayload, AreaType } from '@/lib/dashboard-kpis'

export default function GISMapPage() {
  const [areaType, setAreaType] = useState<AreaType>('all')
  const [demoMarkers, setDemoMarkers] = useState(getEmptyDashboardPayload().districtScores.slice(0, 6))

  useEffect(() => {
    let alive = true
    fetchDashboardKpis({ areaType })
      .then((payload) => {
        if (alive && payload?.districtScores?.length) setDemoMarkers(payload.districtScores.slice(0, 6))
      })
      .catch(() => {
        if (alive) setDemoMarkers(getEmptyDashboardPayload().districtScores.slice(0, 6))
      })

    return () => {
      alive = false
    }
  }, [areaType])

  const getColor = (score: number) => {
    if (score >= 55) return '#22C55E'
    if (score >= 45) return '#F59E0B'
    return '#EF4444'
  }

  return (
    <div id="v-gis">
      <div className="pg-t">GIS Planning Map — All Districts</div>
      <div className="pg-s">Circle size = rural population · colour = composite score (green 55+, amber 45-54, red below 45) · click marker for 11-sector detail</div>
      
      {/* Area Type Filter */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setAreaType('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            areaType === 'all'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          ALL (Rural + Urban)
        </button>
        <button
          onClick={() => setAreaType('rural')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            areaType === 'rural'
              ? 'bg-green-600 text-white shadow-lg'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          Rural Only
        </button>
        <button
          onClick={() => setAreaType('urban')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            areaType === 'urban'
              ? 'bg-orange-600 text-white shadow-lg'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          Urban Only
        </button>
      </div>
      
      <div id="mapwrap" style={{ height: '440px', borderRadius: 'var(--r2)', overflow: 'hidden', border: '1px solid var(--bd)', background: 'var(--nv)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t2)', position: 'relative' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '16px', fontWeight: 700 }}>GIS Map — Rajasthan Planning Districts</div>
          <div style={{ fontSize: '12px', marginTop: '8px', color: 'var(--t3)' }}>Showing {demoMarkers.length} districts with composite scores</div>
          <div style={{ marginTop: '20px', display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', padding: '20px' }}>
            {demoMarkers.map((m, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: getColor(m.dev), display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', cursor: 'pointer', transition: 'transform .2s', fontSize: '24px' }} onMouseEnter={e => (e.currentTarget as any).style.transform = 'scale(1.1)'} onMouseLeave={e => (e.currentTarget as any).style.transform = 'scale(1)'}>
                  {Math.round(m.dev)}
                </div>
                <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--t1)' }}>{m.n}</div>
                <div style={{ fontSize: '9px', color: 'var(--t3)' }}>{m.dev}/100</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '9px', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', color: 'var(--t2)', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#22C55E', display: 'inline-block' }}></span>
          Score 55+ Strong
        </span>
        <span style={{ fontSize: '11px', color: 'var(--t2)', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#F59E0B', display: 'inline-block' }}></span>
          45-54 Moderate
        </span>
        <span style={{ fontSize: '11px', color: 'var(--t2)', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#EF4444', display: 'inline-block' }}></span>
          Below 45 Needs attention
        </span>
      </div>
    </div>
  )
}
