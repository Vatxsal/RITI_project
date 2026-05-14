'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SECTORS } from '@/lib/data';
import { useAuth } from '@/components/AuthProvider';

export default function Sidebar({ isMobileOpen, onMobileClose }: { isMobileOpen?: boolean; onMobileClose?: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();

  const isActive = (path: string) => pathname === path;

  const isAdmin = !!user && user.user_type === 'admin';
  
  // Close sidebar on mobile when navigating
  const handleLinkClick = () => {
    if (isMobileOpen && onMobileClose) {
      onMobileClose();
    }
  };

  return (
    <>
      {/* MOBILE OVERLAY — ALWAYS RENDERED */}
      <div 
        className={`mobile-sidebar-overlay ${isMobileOpen ? 'open' : ''}`}
        onClick={onMobileClose}
        role="presentation"
      ></div>
      
      <div 
        id="sb" 
        className={`h-full flex flex-col flex-shrink-0 overflow-y-auto border-r border-var(--bd) ${isMobileOpen ? 'open' : ''}`}
      >
        {/* CLOSE BUTTON FOR MOBILE */}
        <button
          className="mobile-close-btn"
          onClick={onMobileClose}
          aria-label="Close menu"
        >
          ✕
        </button>
      
      {/* Brand */}
      <div className="sb-brand">
        <div className="sb-logo">
          VIKSIT RAJASTHAN
          <span className="block text-xs font-bold tracking-widest mt-1 opacity-50">@ 2047</span>
        </div>
        <div className="sb-tagline">RITI · Planning Intelligence</div>
        <div className="ai-status">
          <div className="ai-dot"></div>
          <div className="ai-lbl">VR 2047 · AI Active</div>
        </div>
      </div>

      {isAdmin ? (
        <>
          <div className="sbl">Overview</div>
          <Link 
            href="/"
            className={`si ${isActive('/') ? 'on' : ''}`}
            onClick={handleLinkClick}
          >
            <span className="ic">◻</span>
            <span>Command Center</span>
          </Link>

          <div className="sbl">11 Sector Dashboards</div>
          {SECTORS.map(sector => (
            <Link 
              key={sector.v}
              href={`/sector/${sector.v}`}
              className={`si ${pathname === `/sector/${sector.v}` ? 'on' : ''}`}
              onClick={handleLinkClick}
            >
              <span className="ic">{sector.icon}</span>
              <span>{sector.label}</span>
            </Link>
          ))}

          <div className="sbl">Explore</div>
          <Link 
            href="/districts"
            className={`si ${isActive('/districts') ? 'on' : ''}`}
            onClick={handleLinkClick}
          >
            <span className="ic">◻</span>
            <span>All Districts</span>
            <span className="bdg">41</span>
          </Link>
          <Link 
            href="/gis-map"
            className={`si ${isActive('/gis-map') ? 'on' : ''}`}
            onClick={handleLinkClick}
          >
            <span className="ic">◯</span>
            <span>GIS Map</span>
          </Link>

          <div className="sbl">Intelligence</div>
          <Link 
            href="/reports"
            className={`si ${isActive('/reports') ? 'on' : ''}`}
            onClick={handleLinkClick}
          >
            <span className="ic">◼</span>
            <span>Report Library</span>
          </Link>
          <Link 
            href="/ai-chat"
            className={`si ${isActive('/ai-chat') ? 'on' : ''}`}
            onClick={handleLinkClick}
          >
            <span className="ic">◯</span>
            <span>Talk to Data</span>
          </Link>
        </>
      ) : (
        <div className="p-4 text-sm opacity-80">Sign in as admin to view the dashboard</div>
      )}
      </div>
    </>
  );
}
