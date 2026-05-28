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
        className={`h-full flex flex-col flex-shrink-0 overflow-y-auto ${isMobileOpen ? 'open' : ''}`}
        style={{
          width: '240px',
          height: '100vh',
          position: 'relative',
          background: '#1a2744',
          boxShadow: '2px 0 12px rgba(0,0,0,0.15)',
          borderRight: 'none',
          color: 'rgba(255,255,255,0.65)'
        }}
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
      <div className="sb-brand" style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="sb-logo" style={{ fontSize: '16px', fontWeight: 900, color: '#ffffff', letterSpacing: '0.04em', lineHeight: 1.1 }}>
          VIKSIT RAJASTHAN
          <span style={{ display: 'block', marginTop: '4px', color: '#93c5fd', fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em' }}>@ 2047</span>
        </div>
        <div className="sb-tagline" style={{ color: 'rgba(255,255,255,0.45)', fontSize: '9px', letterSpacing: '0.1em', marginTop: '4px', textTransform: 'uppercase' }}>RITI · Planning Intelligence</div>
        <div className="ai-status" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '10px', padding: '3px 10px', borderRadius: '999px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}>
          <div className="ai-dot"></div>
          <div className="ai-lbl" style={{ color: '#6ee7b7', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em' }}>VR 2047 · AI Active</div>
        </div>
      </div>

      {isAdmin ? (
        <>
          <div className="sbl" style={{ color: 'rgba(255,255,255,0.35)', fontSize: '9px', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '16px 20px 6px', opacity: 1 }}>Overview</div>
          <Link 
            href="/"
            className={`si ${isActive('/') ? 'on' : ''}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '9px 20px',
              cursor: 'pointer',
              color: isActive('/') ? '#ffffff' : 'rgba(255,255,255,0.65)',
              fontSize: '13px',
              fontWeight: isActive('/') ? 700 : 500,
              borderRadius: 0,
              transition: 'all 0.15s',
              borderLeft: isActive('/') ? '3px solid #e85d04' : '3px solid transparent',
              background: isActive('/') ? 'rgba(255,255,255,0.1)' : 'transparent',
              userSelect: 'none'
            }}
            onClick={handleLinkClick}
          >
            <span className="ic" style={{ width: '18px', flexShrink: 0, fontSize: '14px', color: isActive('/') ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)' }}>◻</span>
            <span>Command Center</span>
          </Link>

          <div className="sbl" style={{ color: 'rgba(255,255,255,0.35)', fontSize: '9px', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '16px 20px 6px', opacity: 1 }}>11 Sector Dashboards</div>
          {SECTORS.map(sector => {
            const sectorRoute = sector.v === 'women' ? 'social' : sector.v;

            return (
              <Link 
                key={sector.v}
                href={`/sector/${sectorRoute}`}
                className={`si ${pathname === `/sector/${sectorRoute}` ? 'on' : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 20px',
                  cursor: 'pointer',
                  color: pathname === `/sector/${sectorRoute}` ? '#ffffff' : 'rgba(255,255,255,0.65)',
                  fontSize: '13px',
                  fontWeight: pathname === `/sector/${sectorRoute}` ? 700 : 500,
                  borderRadius: 0,
                  transition: 'all 0.15s',
                  borderLeft: pathname === `/sector/${sectorRoute}` ? '3px solid #e85d04' : '3px solid transparent',
                  background: pathname === `/sector/${sectorRoute}` ? 'rgba(255,255,255,0.1)' : 'transparent',
                  userSelect: 'none'
                }}
                onClick={handleLinkClick}
              >
                <span className="ic" style={{ width: '18px', flexShrink: 0, fontSize: '14px', color: pathname === `/sector/${sectorRoute}` ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)' }}>{sector.icon}</span>
                <span>{sector.label}</span>
              </Link>
            );
          })}

          <div className="sbl" style={{ color: 'rgba(255,255,255,0.35)', fontSize: '9px', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '16px 20px 6px', opacity: 1 }}>Explore</div>
          <Link 
            href="/gis-map"
            className={`si ${isActive('/gis-map') ? 'on' : ''}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '9px 20px',
              cursor: 'pointer',
              color: isActive('/gis-map') ? '#ffffff' : 'rgba(255,255,255,0.65)',
              fontSize: '13px',
              fontWeight: isActive('/gis-map') ? 700 : 500,
              borderRadius: 0,
              transition: 'all 0.15s',
              borderLeft: isActive('/gis-map') ? '3px solid #e85d04' : '3px solid transparent',
              background: isActive('/gis-map') ? 'rgba(255,255,255,0.1)' : 'transparent',
              userSelect: 'none'
            }}
            onClick={handleLinkClick}
          >
            <span className="ic" style={{ width: '18px', flexShrink: 0, fontSize: '14px', color: isActive('/gis-map') ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)' }}>◯</span>
            <span>GIS Map</span>
          </Link>

          <div className="sbl" style={{ color: 'rgba(255,255,255,0.35)', fontSize: '9px', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '16px 20px 6px', opacity: 1 }}>Intelligence</div>
          <Link 
            href="/reports"
            className={`si ${isActive('/reports') ? 'on' : ''}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '9px 20px',
              cursor: 'pointer',
              color: isActive('/reports') ? '#ffffff' : 'rgba(255,255,255,0.65)',
              fontSize: '13px',
              fontWeight: isActive('/reports') ? 700 : 500,
              borderRadius: 0,
              transition: 'all 0.15s',
              borderLeft: isActive('/reports') ? '3px solid #e85d04' : '3px solid transparent',
              background: isActive('/reports') ? 'rgba(255,255,255,0.1)' : 'transparent',
              userSelect: 'none'
            }}
            onClick={handleLinkClick}
          >
            <span className="ic" style={{ width: '18px', flexShrink: 0, fontSize: '14px', color: isActive('/reports') ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)' }}>◼</span>
            <span>Report Library</span>
          </Link>
          <Link 
            href="/ai-chat"
            className={`si ${isActive('/ai-chat') ? 'on' : ''}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '9px 20px',
              cursor: 'pointer',
              color: isActive('/ai-chat') ? '#ffffff' : 'rgba(255,255,255,0.65)',
              fontSize: '13px',
              fontWeight: isActive('/ai-chat') ? 700 : 500,
              borderRadius: 0,
              transition: 'all 0.15s',
              borderLeft: isActive('/ai-chat') ? '3px solid #e85d04' : '3px solid transparent',
              background: isActive('/ai-chat') ? 'rgba(255,255,255,0.1)' : 'transparent',
              userSelect: 'none'
            }}
            onClick={handleLinkClick}
          >
            <span className="ic" style={{ width: '18px', flexShrink: 0, fontSize: '14px', color: isActive('/ai-chat') ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)' }}>◯</span>
            <span>Talk to Data</span>
          </Link>
        </>
      ) : (
        <div style={{ padding: '16px 20px', fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>Sign in as admin to view the dashboard</div>
      )}
      <div style={{ marginTop: 'auto', padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.15)', color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
          <span>Secure workspace</span>
          <span>Admin</span>
        </div>
      </div>
      </div>
    </>
  );
}