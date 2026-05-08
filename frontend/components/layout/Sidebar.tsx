import React from 'react'
import Link from 'next/link'

export default function Sidebar({ active = '' }: { active?: string }) {
  const items = [
    { href: '/overview', label: 'Overview' },
    { href: '/aspirations', label: 'Aspirations' },
    { href: '/gp-ranking', label: 'GP Ranking' },
    { href: '/budget-engine', label: 'Budget Engine' },
    { href: '/gis-map', label: 'GIS Map' },
    { href: '/upload', label: 'Upload' },
    { href: '/gp-baseline', label: 'GP Baseline' }
  ]
  return (
    <aside className="w-[220px] shrink-0 min-h-screen border-r border-zinc-800 bg-zinc-950 text-zinc-400 py-4">
      <div className="px-4 mb-4">
        <span className="inline-block bg-teal-900/40 text-teal-400 text-[10px] font-mono px-2 py-0.5 rounded-sm">RITI · Viksit Rajasthan @ 2047</span>
      </div>
      <div className="text-[10px] uppercase tracking-widest text-zinc-600 px-4 mt-4 mb-1">Navigation</div>
      <nav className="space-y-1 px-0">
        {items.map(i => (
          <Link key={i.href} href={i.href} className={`flex items-center h-9 pl-4 pr-3 rounded-none text-sm ${active===i.href? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'}`}>
            {i.label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto text-[11px] text-zinc-500 border-t border-zinc-800 pt-3 px-4">Rajasthan Planning Intelligence</div>
    </aside>
  )
}
