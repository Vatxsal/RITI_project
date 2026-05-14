'use client';

interface KPICardProps {
  label: string;
  value: string;
  status: string;
  colorKey?: 's' | 'w' | 'd' | 'bl' | 'tl' | 'pu' | 'pk' | 'gn';
  fill?: number;
}

const COLOR_MAP: Record<string, string> = {
  s: '#22C55E',
  w: '#F59E0B',
  d: '#EF4444',
  bl: '#3B82F6',
  tl: '#06B6D4',
  pu: '#A855F7',
  pk: '#EC4899',
  gn: '#22C55E',
};

export default function KPICard({ label, value, status, colorKey = 'bl', fill = 70 }: KPICardProps) {
  const color = COLOR_MAP[colorKey] || '#3B82F6';

  return (
    <div className="kpi group">
      <div className="kpi-lbl">{label}</div>
      <div className="kpi-v" style={{ color }}>{value}</div>
      <div className="kpi-s">{status}</div>
      <div className="kpi-bar">
        <div 
          className="kpi-fill" 
          style={{ 
            width: `${Math.max(0, Math.min(fill, 100))}%`,
            background: color,
          }}
        ></div>
      </div>
    </div>
  );
}
