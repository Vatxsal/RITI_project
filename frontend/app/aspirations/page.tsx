"use client"
import React, { useState, useMemo } from 'react'
import { useAspStore } from '../../store/aspirationStore'
import AspirationTable from '../../components/aspirations/AspirationTable'
import { indianNumber } from '../../lib/utils/format'

export default function AspirationsPage() {
  const rows = useAspStore(s => s.aspirationData)
  const results = useAspStore(s => s.ruleResults)

  const [filters, setFilters] = useState({ district: '', block: '', status: 'All', priority: 'All', search: '' })

  const stats = useMemo(() => {
    const total = rows.length
    const rejected = results.filter(r => !r.passed).length
    const funded = rows.filter(r => (r.funded || '').trim() === 'हाँ').length
    const critical = results.filter(r => (r.cniScore || 0) >= 70).length
    return { total, rejected, funded, critical }
  }, [rows, results])

  const filteredRows = useMemo(() => {
    return rows.filter((r, i) => {
      const res = results[i]
      const matchDistrict = !filters.district || (r.district || '').includes(filters.district)
      const matchBlock = !filters.block || (r.block || '').includes(filters.block)
      const matchStatus = filters.status === 'All' || (filters.status === 'Pass' ? res?.passed : !res?.passed)
      const matchPriority = filters.priority === 'All' || r.priority === parseInt(filters.priority)
      const matchSearch = !filters.search || (r.item || '').includes(filters.search) || (r.gp || '').includes(filters.search)
      return matchDistrict && matchBlock && matchStatus && matchPriority && matchSearch
    })
  }, [rows, results, filters])

  const uniqueDistricts = [...new Set(rows.map(r => r.district))].filter(Boolean).sort()
  const uniqueBlocks = [...new Set(rows.filter(r => !filters.district || r.district === filters.district).map(r => r.block))].filter(Boolean).sort()

  return (
    <div className="space-y-6">
      <div className="text-xl font-semibold tracking-tight text-zinc-950">Aspirations</div>

      <div className="bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-3 text-xs text-zinc-600 leading-relaxed">
        <h2 className="text-sm font-medium text-zinc-900 mb-1">Aspiration Intelligence Engine</h2>
        <p>
          <strong>8 Filtering Rules:</strong> Data Integrity → GIS Validation → Strict Category Caps (ITI/KVK/Substation/Police/STP) → Scheme Check → Priority Alignment → Budget Ceiling → Duplicate Detection → Baseline Gap. Rejection codes explain exactly why each aspiration was rejected.
        </p>
      </div>

      <div className="card space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <select className="border border-zinc-300 rounded-md text-sm h-8 px-2.5 bg-white text-zinc-900 focus:ring-1 focus:ring-teal-500 focus:border-teal-500" value={filters.district} onChange={e => setFilters({...filters, district: e.target.value, block: ''})}>
            <option value="">सभी जिले</option>
            {uniqueDistricts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select className="border border-zinc-300 rounded-md text-sm h-8 px-2.5 bg-white text-zinc-900 focus:ring-1 focus:ring-teal-500 focus:border-teal-500" value={filters.block} onChange={e => setFilters({...filters, block: e.target.value})}>
            <option value="">सभी ब्लॉक</option>
            {uniqueBlocks.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <select className="border border-zinc-300 rounded-md text-sm h-8 px-2.5 bg-white text-zinc-900 focus:ring-1 focus:ring-teal-500 focus:border-teal-500" value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}>
            <option value="All">All Status</option>
            <option value="Pass">Pass</option>
            <option value="Fail">Fail</option>
          </select>
          <select className="border border-zinc-300 rounded-md text-sm h-8 px-2.5 bg-white text-zinc-900 focus:ring-1 focus:ring-teal-500 focus:border-teal-500" value={filters.priority} onChange={e => setFilters({...filters, priority: e.target.value})}>
            <option value="All">All Priority</option>
            <option value="1">Priority 1</option>
            <option value="2">Priority 2</option>
            <option value="3">Priority 3</option>
          </select>
          <input type="text" placeholder="Search GP, item..." value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} className="border border-zinc-300 rounded-md text-sm h-8 px-2.5 bg-white text-zinc-900 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 placeholder:text-zinc-400" />
          <button onClick={() => setFilters({district: '', block: '', status: 'All', priority: 'All', search: ''})} className="border border-zinc-300 text-zinc-700 text-xs h-7 px-3 rounded-md hover:bg-zinc-50">Clear</button>
        </div>
        <div className="text-sm text-zinc-500">{indianNumber(filteredRows.length)} aspirations</div>
      </div>

      <AspirationTable />
    </div>
  )
}
