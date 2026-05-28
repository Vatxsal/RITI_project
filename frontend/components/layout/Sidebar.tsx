
import React from 'react'
import Link from 'next/link'

export default function Sidebar() {
  return (
    <div id="sb" style={{ width: '228px', background: 'var(--nv2)', display: 'flex', flexDirection: 'column', flexShrink: 0, overflowY: 'auto', borderRight: '1px solid var(--bd)', color: 'var(--t1)' }}>
      {/* Brand Section */}
      <div className="sb-brand" style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--bd)', flexShrink: 0 }}>
        <div className="sb-logo" style={{ fontSize: '13px', letterSpacing: '.02em', fontWeight: 900, color: 'var(--t1)' }}>
          VIKSIT RAJASTHAN
          <span style={{ display: 'block', fontSize: '10px', fontWeight: 700, letterSpacing: '.15em', marginTop: '2px', color: 'rgba(255,255,255,.5)' }}>@ 2047</span>
        </div>
        <div className="sb-tagline" style={{ fontSize: '9px', color: 'var(--t3)', letterSpacing: '.12em', textTransform: 'uppercase', marginTop: '4px' }}>RITI · Planning Intelligence</div>
        <div className="ai-status" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '8px', padding: '4px 9px', borderRadius: '20px', background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.2)' }}>
          <div className="ai-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--gn)' }}></div>
          <div className="ai-lbl" style={{ fontSize: '9px', color: 'var(--gn)', fontWeight: 700, letterSpacing: '.08em' }}>VR 2047 · AI Active</div>
        </div>
      </div>

      {/* Navigation */}
      <div className="sbl" style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--t3)', padding: '11px 16px 4px', opacity: 0.55 }}>Overview</div>
      <Link href="/" className="si on" style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '7px 16px', cursor: 'pointer', color: 'var(--t1)', fontSize: '12px', borderLeft: '2px solid var(--or)', background: 'linear-gradient(90deg,rgba(232,92,13,.18),rgba(232,92,13,.04))', fontWeight: 600, transition: 'all .15s', userSelect: 'none' }}>
        <span className="ic" style={{ width: '16px', textAlign: 'center', flexShrink: 0, fontSize: '13px', opacity: 1 }}>▀</span>
        Command Center
      </Link>

      <div className="sbl" style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--t3)', padding: '11px 16px 4px', opacity: 0.55 }}>11 Sector Dashboards</div>
      {[
        { view: 'water', label: 'Water & Sanitation', icon: '◯' },
        { view: 'health', label: 'Health & Nutrition', icon: '✚' },
        { view: 'agri', label: 'Agriculture', icon: '❖' },
        { view: 'dairy', label: 'Dairy & Livestock', icon: 'Ⓓ' },
        { view: 'edu', label: 'Education', icon: '✎' },
        { view: 'employ', label: 'Employment & Skills', icon: '⊙' },
        { view: 'women', label: 'Social Empowerment', icon: '✧' },
        { view: 'welfare', label: 'Welfare & Housing', icon: '♥' },
        { view: 'infra', label: 'Infrastructure', icon: '⚙' },
        { view: 'tourism', label: 'Tourism & Heritage', icon: '✈' },
        { view: 'env', label: 'Environment & Forest', icon: '♲' }
      ].map(item => (
        <Link key={item.view} href={`/${item.view}`} className="si" style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '7px 16px', cursor: 'pointer', color: 'var(--t3)', fontSize: '12px', borderLeft: '2px solid transparent', transition: 'all .15s', userSelect: 'none' }}>
          <span className="ic" style={{ width: '16px', textAlign: 'center', flexShrink: 0, fontSize: '13px', opacity: 0.6 }}>{item.icon}</span>
          {item.label}
        </Link>
      ))}

      <div className="sbl" style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--t3)', padding: '11px 16px 4px', opacity: 0.55 }}>Explore</div>
      <Link href="/gis-map-new" className="si" style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '7px 16px', cursor: 'pointer', color: 'var(--t3)', fontSize: '12px', borderLeft: '2px solid transparent', transition: 'all .15s', userSelect: 'none' }}>
        <span className="ic" style={{ width: '16px', textAlign: 'center', flexShrink: 0, fontSize: '13px', opacity: 0.6 }}>●</span>
        GIS Map
      </Link>

      <div className="sbl" style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--t3)', padding: '11px 16px 4px', opacity: 0.55 }}>Intelligence</div>
      <Link href="/reports" className="si" style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '7px 16px', cursor: 'pointer', color: 'var(--t3)', fontSize: '12px', borderLeft: '2px solid transparent', transition: 'all .15s', userSelect: 'none' }}>
        <span className="ic" style={{ width: '16px', textAlign: 'center', flexShrink: 0, fontSize: '13px', opacity: 0.6 }}>▬</span>
        Report Library
      </Link>
      <Link href="/ai-chat" className="si" style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '7px 16px', cursor: 'pointer', color: 'var(--t3)', fontSize: '12px', borderLeft: '2px solid transparent', transition: 'all .15s', userSelect: 'none' }}>
        <span className="ic" style={{ width: '16px', textAlign: 'center', flexShrink: 0, fontSize: '13px', opacity: 0.6 }}>◌</span>
        Talk to Data
      </Link>
    </div>
  )
}