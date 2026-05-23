"use client";

import Map from '@/components/dashboard/Map';

export default function GISPage() {
  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', padding: 24, color: '#1a2744' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 3 }}>
          <div className="pg-t">GIS Planning Map — All Districts</div>
        </div>
        <div className="pg-s">41 districts from the live dashboard cache · circle size = population · colour = composite score (green 55+, amber 45-54, red below 45) · click marker for 11-sector detail</div>
      </div>

      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: 20 }}>
        <Map />
      </div>

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 9, alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--t2)', display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 9, height: 9, borderRadius: 4, background: '#22C55E', display: 'inline-block' }}></span>Score 55+ Strong
        </span>
        <span style={{ fontSize: 11, color: 'var(--t2)', display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 9, height: 9, borderRadius: 4, background: '#F59E0B', display: 'inline-block' }}></span>45-54 Moderate
        </span>
        <span style={{ fontSize: 11, color: 'var(--t2)', display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 9, height: 9, borderRadius: 4, background: '#EF4444', display: 'inline-block' }}></span>Below 45 Needs attention
        </span>
      </div>
    </div>
  );
}
