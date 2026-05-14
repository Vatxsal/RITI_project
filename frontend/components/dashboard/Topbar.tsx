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
    <div id="fbar" className="bg-var(--nv2) border-b border-var(--bd) px-4 flex items-center gap-2 flex-shrink-0 header-bar">
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
      <div className="header-desktop-only flex items-center gap-2 flex-1">
        <span className="fsl">District:</span>
        <select 
          className="fs"
          value={selectedDistrict || ''}
          onChange={(e) => onDistrictChange(e.target.value || null)}
        >
          <option value="">All Rajasthan</option>
          {districtNames.map((district) => (
            <option key={district} value={district}>{district}</option>
          ))}
        </select>
        <button className="btn btn-o" onClick={() => onDistrictChange(null)} style={{ padding: '5px 9px', fontSize: 11 }}>Reset</button>
      </div>

      {/* MOBILE: District selector — stacked below */}
      <div className="mobile-district-selector">
        <select 
          className="fs"
          value={selectedDistrict || ''}
          onChange={(e) => onDistrictChange(e.target.value || null)}
        >
          <option value="">All Rajasthan</option>
          {districtNames.map((district) => (
            <option key={district} value={district}>{district}</option>
          ))}
        </select>
        <button className="btn btn-o" onClick={() => onDistrictChange(null)} style={{ padding: '5px 9px', fontSize: 11 }}>Reset</button>
      </div>

      <div className="fbr header-right">
        <span className="chip header-desktop-only">{user?.username || 'admin'}</span>
        <span className="chip header-desktop-only">{sessionLabel}</span>
        <span className="chip hi">{districtCount}</span>
        <span className="chip header-desktop-only">{populationLabel}</span>
        <button className="btn btn-ai btn-ask-ai" onClick={() => router.push('/ai-chat')}>
          <span className="desktop-text">◻ Ask Planning Intelligence</span>
          <span className="mobile-text">Ask AI</span>
        </button>
        <button className="btn btn-ghost header-desktop-only" onClick={handleLogout}>
          Sign out
        </button>
      </div>
    </div>
  );
}
