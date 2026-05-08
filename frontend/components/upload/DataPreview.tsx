"use client"
import React from 'react'
import { useAspStore } from '../../store/aspirationStore'

export default function DataPreview(){
  const rows = useAspStore(s=>s.aspirationData)
  if(!rows || rows.length===0) return <div className="card"><div className="flex flex-col items-center justify-center py-12 text-center"><p className="text-sm text-zinc-500">No data loaded</p><p className="text-xs text-zinc-400 mt-1">Upload a CSV to preview rows</p></div></div>
  return (
    <div className="card">
      <h4 className="text-sm font-medium text-zinc-900 mb-3">Loaded Preview ({rows.length} rows)</h4>
      <div className="overflow-x-auto">
        <table className="w-full border border-zinc-200 rounded-lg overflow-hidden">
          <thead className="bg-zinc-50 border-b border-zinc-200"><tr><th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">District</th><th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Block</th><th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">GP</th><th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Item</th><th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">2030</th><th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Funded</th></tr></thead>
          <tbody>
            {rows.slice(0,20).map((r,i)=>(
              <tr key={i} className="border-b border-zinc-100 hover:bg-zinc-50/60 transition-none"><td className="px-3 py-2.5 text-xs text-zinc-900">{r.district}</td><td className="px-3 py-2.5 text-xs text-zinc-900">{r.block}</td><td className="px-3 py-2.5 text-xs text-zinc-900">{r.gp}</td><td className="px-3 py-2.5 text-xs text-zinc-900">{r.item}</td><td className="px-3 py-2.5 text-xs text-zinc-900">{r.qty_2030}</td><td className="px-3 py-2.5 text-xs text-zinc-900">{r.funded}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
