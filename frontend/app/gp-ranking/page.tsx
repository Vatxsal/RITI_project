"use client"

import { useMemo, useState } from 'react'
import { useAspStore } from '../../store/aspirationStore'

const ZONE: Record<string, 'desert' | 'tribal' | 'east'> = {
  'बाड़मेर': 'desert', 'जैसलमेर': 'desert', 'बीकानेर': 'desert', 'जोधपुर': 'desert', 'नागौर': 'desert', 'चूरू': 'desert', 'श्री गंगानगर': 'desert', 'हनुमानगढ़': 'desert',
  'उदयपुर': 'tribal', 'डूंगरपुर': 'tribal', 'बांसवाड़ा': 'tribal', 'प्रतापगढ़': 'tribal', 'राजसमन्द': 'tribal', 'चित्तौड़गढ़': 'tribal', 'सिरोही': 'tribal', 'सलूम्बर': 'tribal'
}

type RankedGp = {
  gp: string
  district: string
  block: string
  zone: 'desert' | 'tribal' | 'east'
  total: number
  unfunded: number
  funded: number
  rejected: number
  p1: number
  budget: number
  cni: number
  band: 'CRITICAL' | 'MODERATE' | 'ON TRACK'
}

export default function GPRankingPage() {
  const rows = useAspStore((state) => state.aspirationData)
  const results = useAspStore((state) => state.ruleResults)
  const [zoneFilter, setZoneFilter] = useState('')
  const [districtFilter, setDistrictFilter] = useState('')
  const [topN, setTopN] = useState(20)

  const ranked = useMemo<RankedGp[]>(() => {
    if (!rows.length) return []

    const gpMap = new Map<string, Omit<RankedGp, 'cni' | 'band'>>()

    rows.forEach((row, idx) => {
      const key = row.gp || `NA-${idx}`
      const current = gpMap.get(key) || {
        gp: row.gp || 'Unknown',
        district: row.district || 'Unknown',
        block: row.block || '',
        zone: ZONE[row.district || ''] || 'east',
        total: 0,
        unfunded: 0,
        funded: 0,
        rejected: 0,
        p1: 0,
        budget: 0
      }

      current.total += 1
      if ((row.funded || '').trim() === 'हाँ') current.funded += 1
      else current.unfunded += 1
      if (!results[idx]?.passed) current.rejected += 1
      if (Number(row.priority || 0) === 1) current.p1 += 1
      current.budget += Number(row.total_cost || 0)
      gpMap.set(key, current)
    })

    return Array.from(gpMap.values()).map((gr) => {
      const total = Math.max(gr.total, 1)
      const unfundedRatio = gr.unfunded / total
      const p1Ratio = gr.p1 / total
      const rejectedRatio = gr.rejected / total

      let cni = Math.round(8 + (unfundedRatio * 52) + (p1Ratio * 20) + (rejectedRatio * 20))
      if (gr.zone === 'desert') cni = Math.min(100, Math.round(cni * 1.2))
      if (gr.zone === 'tribal') cni = Math.min(100, Math.round(cni * 1.15))
      cni = Math.min(100, Math.max(5, cni))

      const band: RankedGp['band'] = cni >= 70 ? 'CRITICAL' : cni >= 40 ? 'MODERATE' : 'ON TRACK'
      return { ...gr, cni, band }
    }).sort((a, b) => b.cni - a.cni)
  }, [rows, results])

  const districts = useMemo(
    () => Array.from(new Set(ranked.map((r) => r.district))).sort(),
    [ranked]
  )

  const filtered = useMemo(() => {
    let list = ranked
    if (zoneFilter) list = list.filter((r) => r.zone === zoneFilter)
    if (districtFilter) list = list.filter((r) => r.district === districtFilter)
    if (topN > 0) list = list.slice(0, topN)
    return list
  }, [ranked, zoneFilter, districtFilter, topN])

  const bandMeta = (cni: number) => {
    if (cni >= 70) return { color: '#A82828', badge: 'bg-red-50 text-red-700' }
    if (cni >= 40) return { color: '#8C6800', badge: 'bg-amber-50 text-amber-700' }
    return { color: '#1A6B42', badge: 'bg-green-50 text-green-700' }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold tracking-tight text-zinc-950">GP Ranking</h1>

      <div className="bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-3 text-xs text-zinc-600 leading-relaxed">
        <h2 className="mb-1 text-sm font-medium text-zinc-900">GP Ranking Engine - Composite Need Index</h2>
        <p>
          CNI = Health(22%) + Education(22%) + Water(13%) + Sanitation(10%) + Roads(11%) + Electricity(7%) + Agriculture(7%) + Banking(4%) + Housing(8%) + Governance(4%) + Environment(2%). Higher CNI = higher deficit = higher priority. Desert +20%, Tribal +15%.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card">
          <h3 className="mb-3 text-sm font-medium text-zinc-900">Filters</h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-zinc-500">Zone</label>
              <select value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)} className="w-full border border-zinc-300 rounded-md text-sm h-8 px-2.5 bg-white text-zinc-900 focus:ring-1 focus:ring-teal-500 focus:border-teal-500">
                <option value="">All Zones</option>
                <option value="desert">Desert</option>
                <option value="tribal">Tribal</option>
                <option value="east">East</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-500">District</label>
              <select value={districtFilter} onChange={(e) => setDistrictFilter(e.target.value)} className="w-full border border-zinc-300 rounded-md text-sm h-8 px-2.5 bg-white text-zinc-900 focus:ring-1 focus:ring-teal-500 focus:border-teal-500">
                <option value="">All Districts</option>
                {districts.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-500">Show Top</label>
              <select value={topN} onChange={(e) => setTopN(Number(e.target.value))} className="w-full border border-zinc-300 rounded-md text-sm h-8 px-2.5 bg-white text-zinc-900 focus:ring-1 focus:ring-teal-500 focus:border-teal-500">
                <option value={20}>Top 20</option>
                <option value={50}>Top 50</option>
                <option value={100}>Top 100</option>
                <option value={999999}>All</option>
              </select>
            </div>
            <div className="space-y-1 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600">
              <div><span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-700 mr-1">Critical</span> Multi-sector emergency</div>
              <div><span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 mr-1">Moderate</span> Targeted intervention</div>
              <div><span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-700 mr-1">On Track</span> Enhancement focus</div>
            </div>
          </div>
        </div>

        <div className="card col-span-2">
          <h3 className="mb-3 text-sm font-medium text-zinc-900">
            GP Rankings <span className="text-red-600">{filtered.length} GPs</span>
          </h3>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-zinc-500">Upload aspiration data CSV to populate this table</p>
              <p className="text-xs text-zinc-400 mt-1">Ranking output appears after rule engine run</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[560px] overflow-auto pr-1">
              {filtered.map((gr, idx) => {
                const meta = bandMeta(gr.cni)
                return (
                  <div key={`${gr.gp}-${idx}`} className="border border-zinc-200 rounded-lg p-3 bg-zinc-50/40">
                    <div className="flex items-start gap-3">
                      <div className="text-[11px] text-zinc-500 min-w-8">#{idx + 1}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-zinc-900 truncate">{gr.gp}</div>
                        <div className="text-xs text-zinc-500 truncate">{gr.district} · {gr.block || '—'} · Pop-based gap index</div>
                        <div className="mt-2 h-2 rounded bg-zinc-200 overflow-hidden">
                          <div className="h-full" style={{ width: `${gr.cni}%`, backgroundColor: meta.color }} />
                        </div>
                        <div className="mt-2 text-[11px] text-zinc-500">Aspirations: {gr.total} · Unfunded: {gr.unfunded} · Rejected: {gr.rejected}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-semibold" style={{ color: meta.color }}>{gr.cni}</div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${meta.badge}`}>{gr.band}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
