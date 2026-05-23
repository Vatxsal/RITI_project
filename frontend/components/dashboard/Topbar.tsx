'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { fetchDashboardKpis } from '@/lib/dashboard-kpis';

const DISTRICTS_EN = [
  'Ajmer','Alwar','Balotara','Banswara','Baran','Barmer','Beawar',
  'Bharatpur','Bhilwara','Bikaner','Bundi','Chittorgarh','Churu',
  'Dausa','Deeg','Dholpur','Didwana-Kuchaman','Dungarpur','Hanumangarh',
  'Jaipur','Jaisalmer','Jalore','Jhalawar','Jhunjhunu','Jodhpur',
  'Karauli','Khairthal-Tijara','Kota','Kotputli-Behror','Nagaur',
  'Pali','Phalodi','Pratapgarh','Rajsamand','Salumbar','Sawai Madhopur',
  'Sikar','Sirohi','Sri Ganganagar','Tonk','Udaipur'
];

interface TopBarProps {
  selectedDistrict: string | null;
  urbanFilter: 'all' | 'rural' | 'urban';
  onDistrictChange: (district: string | null) => void;
  
  onUrbanFilterChange: (filter: 'all' | 'rural' | 'urban') => void;
  onPanelOpen: () => void;
  onMobileMenuClick?: () => void;
}

export default function TopBar({
  selectedDistrict,
  urbanFilter,
  onDistrictChange,
  onUrbanFilterChange,
  onPanelOpen,
  onMobileMenuClick
}: TopBarProps) {
  const { user, logout, sessionExpiresAt } = useAuth();
  const router = useRouter();
  const [districtNames, setDistrictNames] = useState<string[]>([]);
  const [districtCount, setDistrictCount] = useState<string>('-');
  const [populationLabel, setPopulationLabel] = useState<string>('-');

  useEffect(() => {
    setDistrictNames(DISTRICTS_EN);
    setDistrictCount(`${DISTRICTS_EN.length} loaded`);

    let alive = true;
    fetchDashboardKpis()
      .then((payload) => {
        if (!alive) return;
        setPopulationLabel(payload?.dataCoverage?.find(([label]) => label === 'Rural pop')?.[1] ?? '-');
      })
      .catch(() => {
        if (!alive) return;
        setPopulationLabel('-');
      });

    return () => {
      alive = false;
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const sessionLabel = sessionExpiresAt
    ? `Session ends ${new Date(sessionExpiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : 'Session active';

  return (
    <div
      id="fbar"
      className="header-bar"
      style={{
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        height: '52px',
        padding: '0 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexShrink: 0,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        position: 'relative'
      }}
    >
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, background: 'linear-gradient(90deg, #1a2744 0%, #1a2744 68%, #e85d04 100%)', opacity: 0.95 }} />

      {/* MOBILE HAMBURGER MENU */}
      <button 
        className="mobile-menu-btn"
        onClick={onMobileMenuClick}
        aria-label="Toggle menu"
        title="Menu"
      >
        ☰
      </button>
      
      {/* DESKTOP: District selector row */}
      <div className="header-desktop-only flex items-center gap-2 flex-1" style={{ minWidth: 0 }}>
        <span className="fsl" style={{ color: '#64748b', fontSize: '12px', fontWeight: 700, letterSpacing: '0.04em', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>District:</span>
        <select 
          className="fs"
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            color: '#1a2744',
            fontSize: '13px',
            fontWeight: 600,
            padding: '6px 12px',
            minWidth: '180px',
            cursor: 'pointer'
          }}
          value={selectedDistrict || ''}
          onChange={(e) => onDistrictChange(e.target.value || null)}
        >
          <option value="">All Rajasthan</option>
          {districtNames.map((district) => (
            <option key={district} value={district}>{district}</option>
          ))}
        </select>
        <button
          className="btn btn-o"
          onClick={() => onDistrictChange(null)}
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            color: '#64748b',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            padding: '5px 12px',
            cursor: 'pointer'
          }}
        >
          Reset
        </button>
      </div>

      {/* MOBILE: District selector — stacked below */}
      <div className="mobile-district-selector">
        <select 
          className="fs"
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            color: '#1a2744',
            fontSize: '13px',
            fontWeight: 600,
            padding: '6px 12px',
            minWidth: '180px',
            cursor: 'pointer'
          }}
          value={selectedDistrict || ''}
          onChange={(e) => onDistrictChange(e.target.value || null)}
        >
          <option value="">All Rajasthan</option>
          {districtNames.map((district) => (
            <option key={district} value={district}>{district}</option>
          ))}
        </select>
        <button
          className="btn btn-o"
          onClick={() => onDistrictChange(null)}
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            color: '#64748b',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            padding: '5px 12px',
            cursor: 'pointer'
          }}
        >
          Reset
        </button>
      </div>

      <div className="fbr header-right">
        <span className="chip header-desktop-only" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#1a2744', color: '#ffffff', border: '1px solid #1a2744', borderRadius: '999px', fontSize: '11px', fontWeight: 700, padding: '4px 12px', letterSpacing: '0.02em' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#6ee7b7', display: 'inline-block' }} />
          {user?.username || 'admin'}
        </span>
        <span className="chip header-desktop-only" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '999px', fontSize: '11px', fontWeight: 600, padding: '4px 12px', letterSpacing: '0.01em' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#94a3b8', display: 'inline-block' }} />
          {sessionLabel}
        </span>
        <span className="chip hi" style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '999px', fontSize: '10px', fontWeight: 700, padding: '3px 10px' }}>{districtCount}</span>
        <span className="chip header-desktop-only" style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', borderRadius: '999px', fontSize: '11px', fontWeight: 700, padding: '3px 10px' }}>{populationLabel}</span>
        <button className="btn btn-ai btn-ask-ai" style={{ background: '#1a2744', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 8px rgba(26,39,68,0.15)' }} onClick={() => router.push('/ai-chat')}>
          <span className="desktop-text">Ask Planning Intelligence</span>
          <span className="mobile-text">Ask AI</span>
        </button>
        <button className="btn btn-ghost header-desktop-only" style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 600, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }} onClick={handleLogout}>
          Sign out
        </button>
      </div>

      <style jsx>{`
        #fbar .fs:hover,
        #fbar .fs:focus {
          border-color: #1e3a5f !important;
          outline: none !important;
        }

        #fbar .btn.btn-o:hover {
          border-color: #1e3a5f !important;
          color: #1a2744 !important;
        }

        #fbar .btn.btn-o:focus,
        #fbar .btn.btn-o:active {
          outline: none !important;
          box-shadow: 0 0 0 3px rgba(30, 58, 95, 0.14) !important;
        }

        #fbar .btn.btn-ai:hover {
          background: #1e3a5f !important;
        }

        #fbar .btn.btn-ghost:hover {
          color: #ef4444 !important;
        }

        #fbar .header-right {
          gap: 8px;
          flex-wrap: nowrap;
        }
      `}</style>
    </div>
  );
}
