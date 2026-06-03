'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from '@/components/dashboard/Sidebar';
import TopBar from '@/components/dashboard/Topbar';
import RightPanel from '@/components/dashboard/RightPanel';
import { useAuth } from '@/components/AuthProvider';
import { FilterProvider, useFilter } from '@/components/FilterContext';

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { selectedDistrict, setSelectedDistrict, urbanFilter, setUrbanFilter } = useFilter();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { user, isInitializing } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';
  const isBackendPortalPage = pathname === '/backend' || pathname === '/dashboard/backend';
  const isChromeLessPage = isLoginPage || isBackendPortalPage;

  const isAuthorized = !!user && (user.user_type === 'admin' || user.user_type === 'super_admin');

  useEffect(() => {
    if (isChromeLessPage) return;
    if (!isInitializing && !isAuthorized) {
      router.replace('/login');
    }
  }, [isChromeLessPage, isInitializing, isAuthorized, router]);

  if (isChromeLessPage) {
    return <>{children}</>;
  }

  if (isInitializing) {
    return (
      <div className="auth-splash">
        <div className="auth-splash-card">
          <div className="auth-splash-title">RITI Planning Intelligence</div>
          <div className="auth-splash-sub">Preparing secure workspace...</div>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
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
