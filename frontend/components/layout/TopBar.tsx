"use client"
import React from 'react'
import { fetchGPCounts } from '../../lib/supabase'

export default function TopBar() {
  const [counts, setCounts] = React.useState<{ districts?: number; blocks?: number; gps?: number } | null>(null)
  React.useEffect(()=>{
    // fetch /api/stats
    fetch('/api/stats').then(r=>r.json()).then(d=>{ if(d?.data) setCounts(d.data[0] || d.data) }).catch(()=>{})
  }, [])

  return (
    <div className="h-12 border-b border-zinc-200 bg-white px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="text-sm font-semibold tracking-tight text-zinc-950">Manthaan OS</div>
        <div className="inline-flex items-center gap-1 text-xs text-emerald-600">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Manthaan AI Ready
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-xs text-zinc-400 font-mono">{counts ? `${counts.districts || 41} Districts · ${counts.blocks || 457} Blocks · ${counts.gps || 14404} GPs` : 'Loading counts...'}</div>
        <button className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-7 px-3 rounded-md">Upload Aspirations</button>
      </div>
    </div>
  )
}
