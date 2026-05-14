'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { fetchDashboardKpis } from '@/lib/dashboard-kpis';

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
    let alive = true;
    fetchDashboardKpis()
      .then((payload) => {
        if (!alive) return;
        setDistrictNames(payload?.districtScores?.map((district) => district.n) ?? []);
        setDistrictCount(payload?.dataCoverage?.find(([label]) => label === 'Districts')?.[1] ?? '-');
        setPopulationLabel(payload?.dataCoverage?.find(([label]) => label === 'Rural pop')?.[1] ?? '-');
      })
      .catch(() => {
        if (!alive) return;
        setDistrictNames([]);
        setDistrictCount('-');
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
    <div id="fbar" className="bg-var(--nv2) border-b border-var(--bd) px-4 h-12 flex items-center gap-2 flex-shrink-0">
      {/* MOBILE HAMBURGER MENU */}
      <button 
        className="mobile-menu-btn"
        onClick={onMobileMenuClick}
        aria-label="Toggle menu"
        title="Menu"
      >
        ☰
      </button>
      
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

      <div className="fbr">
        <span className="chip">{user?.username || 'admin'}</span>
        <span className="chip">{sessionLabel}</span>
        <span className="chip hi">{selectedDistrict ? '1 loaded' : districtCount}</span>
        <span className="chip">{populationLabel}</span>
        <button className="btn btn-ai" onClick={() => router.push('/ai-chat')}>
          ◻ Ask Planning Intelligence
        </button>
        <button className="btn btn-ghost" onClick={handleLogout}>
          Sign out
        </button>
      </div>
    </div>
  );
}
