'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/dashboard/Sidebar';
import TopBar from '@/components/dashboard/Topbar';
import RightPanel from '@/components/dashboard/RightPanel';
import { FilterProvider, useFilter } from '@/components/FilterContext';

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { selectedDistrict, setSelectedDistrict, urbanFilter, setUrbanFilter } = useFilter();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';
  const isBackendPortalPage = pathname === '/backend' || pathname === '/dashboard/backend';
  const isChromeLessPage = isLoginPage || isBackendPortalPage;

  if (isChromeLessPage) {
    return <>{children}</>;
  }

  return (
    <div id="app" className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      <Sidebar isMobileOpen={isMobileSidebarOpen} onMobileClose={() => setIsMobileSidebarOpen(false)} />
      
      <div id="mn" className="flex flex-col flex-1 overflow-hidden">
        <TopBar 
          selectedDistrict={selectedDistrict}
          urbanFilter={urbanFilter}
          onDistrictChange={setSelectedDistrict}
          onUrbanFilterChange={setUrbanFilter}
          onPanelOpen={() => setIsPanelOpen(true)}
          onMobileMenuClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />
        
        <div id="ct" className="flex-1 overflow-y-auto" style={{ padding: '0 24px 24px 0', background: 'var(--bg)' }}>
          {children}
        </div>
      </div>

      <RightPanel 
        isOpen={isPanelOpen}
        districtName={selectedDistrict}
        onClose={() => setIsPanelOpen(false)}
      />
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <FilterProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </FilterProvider>
  );
}
