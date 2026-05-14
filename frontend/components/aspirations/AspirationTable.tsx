"use client"
import React from 'react'
import { useAspStore } from '../../store/aspirationStore'
import { useVirtualizer } from '@tanstack/react-virtual'
import Chip from '../../components/Chips'
import { indianNumber } from '../../lib/utils/format'

export default function AspirationTable() {
  const rows = useAspStore(s => s.aspirationData)
  const results = useAspStore(s => s.ruleResults)
  const parentRef = React.useRef<HTMLDivElement | null>(null)
  
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64
  })

  if (!rows || rows.length === 0) return <div className="flex flex-col items-center justify-center py-12 text-center"><p className="text-sm text-zinc-500">Upload CSV to view aspirations</p><p className="text-xs text-zinc-400 mt-1">Data will appear here after parsing</p></div>

  const virtualItems = rowVirtualizer.getVirtualItems()
  const totalSize = rowVirtualizer.getTotalSize()

  const handleExportCSV = () => {
    if (rows.length === 0) return
    const headers = ['Rajdhara Ref', 'District', 'Block', 'GP', 'Sector', 'Item', 'Priority', 'Target Year', 'Quantity', 'Funded', 'Scheme', 'Status']
    const csvContent = [
      headers.join(','),
      ...rows.map((r, i) => {
        const res = results[i]
        return [
          `"${r.rajdhara_ref || ''}"`,
          `"${r.district || ''}"`,
          `"${r.block || ''}"`,
          `"${r.gp || ''}"`,
          `"${r.sector || ''}"`,
          `"${r.item || ''}"`,
          r.priority || '',
          `"${r.qty_2030 || 0}/${r.qty_2035 || 0}/${r.qty_2047 || 0}"`,
          r.qty_2030 || 0,
          `"${r.funded || ''}"`,
          `"${r.scheme || ''}"`,
          res?.passed ? 'PASS' : 'FAIL'
        ].join(',')
      })
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'aspirations_export.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <button onClick={handleExportCSV} className="border border-zinc-300 text-zinc-700 text-xs h-7 px-3 rounded-md hover:bg-zinc-50">
          Export CSV
        </button>
      </div>
      
      <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white">
        <div className="overflow-x-auto" ref={parentRef} style={{ height: '70vh' }}>
          <table className="w-full">
            <thead className="bg-zinc-50 border-b border-zinc-200 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Rajdhara Ref</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">District</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Block</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">GP</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Sector</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Item</th>
                <th className="px-3 py-2.5 text-center text-xs font-medium text-zinc-500 uppercase tracking-wider">Priority</th>
                <th className="px-3 py-2.5 text-center text-xs font-medium text-zinc-500 uppercase tracking-wider">Target Year</th>
                <th className="px-3 py-2.5 text-center text-xs font-medium text-zinc-500 uppercase tracking-wider">Quantity</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Unit Cost</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Est. Budget</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Funded</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Scheme</th>
                <th className="px-3 py-2.5 text-center text-xs font-medium text-zinc-500 uppercase tracking-wider">GIS</th>
                <th className="px-3 py-2.5 text-center text-xs font-medium text-zinc-500 uppercase tracking-wider">Status</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Reason Code</th>
              </tr>
            </thead>
            <tbody style={{ position: 'relative', height: totalSize }}>
              {virtualItems.map(vi => {
                const r = rows[vi.index]
                const res = results[vi.index]
                const hasGIS = Number.isFinite(Number(r.lat)) && Number.isFinite(Number(r.lng))
                return (
                  <tr key={vi.key} style={{ position: 'absolute', top: vi.start, left: 0, width: '100%' }} className="border-b border-zinc-100 hover:bg-zinc-50/60 transition-none">
                    <td className="px-3 py-2.5 text-xs text-zinc-900">{r.rajdhara_ref || '-'}</td>
                    <td className="px-3 py-2.5 text-xs text-zinc-900">{r.district}</td>
                    <td className="px-3 py-2.5 text-xs text-zinc-900">{r.block}</td>
                    <td className="px-3 py-2.5 text-xs text-zinc-900">{r.gp}</td>
                    <td className="px-3 py-2.5 text-xs text-zinc-900">{r.sector || '-'}</td>
                    <td className="px-3 py-2.5 text-xs text-zinc-900">{r.item}</td>
                    <td className="px-3 py-2.5 text-center text-xs text-zinc-900">{r.priority || '-'}</td>
                    <td className="px-3 py-2.5 text-center text-xs text-zinc-900">{r.qty_2030 || 0}/{r.qty_2035 || 0}/{r.qty_2047 || 0}</td>
                    <td className="px-3 py-2.5 text-center text-xs text-zinc-900">{indianNumber(r.qty_2030 || 0)}</td>
                    <td className="px-3 py-2.5 text-xs text-zinc-900">{r.unit_cost || '-'}</td>
                    <td className="px-3 py-2.5 text-xs text-zinc-900">{r.total_cost || '-'}</td>
                    <td className="px-3 py-2.5 text-xs text-zinc-900">{r.funded || '-'}</td>
                    <td className="px-3 py-2.5 text-xs text-zinc-900">{r.scheme || '-'}</td>
                    <td className="px-3 py-2.5 text-center">{hasGIS ? <span className="text-emerald-600">●</span> : <span className="text-zinc-300">-</span>}</td>
                    <td className="px-3 py-2.5 text-center">
                      <Chip variant={res?.passed ? 'pass' : 'fail'}>{res?.passed ? 'PASS' : 'FAIL'}</Chip>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-zinc-500">{res?.failedRules.join(', ') || '-'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
