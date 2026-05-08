"use client"
import React, { useMemo, useState } from 'react'
import { useAspStore } from '../../store/aspirationStore'

type Layer = 'cni' | 'funded' | 'priority' | 'status' | 'aspirations'

export default function GISMapPage() {
  const rows = useAspStore((s) => s.aspirationData)
  const results = useAspStore((s) => s.ruleResults)
  const [layer, setLayer] = useState<Layer>('cni')
  const [districtFilter, setDistrictFilter] = useState('')
  const [sectorFilter, setSectorFilter] = useState('')
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  const districts = useMemo(
    () => Array.from(new Set(rows.map((r) => r.district).filter(Boolean) as string[])).sort(),
    [rows]
  )

  const sectors = useMemo(
    () => Array.from(new Set(rows.map((r) => r.sector).filter(Boolean) as string[])).sort(),
    [rows]
  )

  const points = useMemo(() => {
    return rows
      .map((r, i) => ({ ...r, __index: i }))
      .filter((r) => r.lat != null && r.lng != null && Number(r.lat) !== 0 && Number(r.lng) !== 0)
      .filter((r) => !districtFilter || r.district === districtFilter)
      .filter((r) => !sectorFilter || r.sector === sectorFilter)
  }, [rows, districtFilter, sectorFilter])

  const geo = useMemo(() => {
    if (!points.length) return null
    const lats = points.map((p) => Number(p.lat))
    const lngs = points.map((p) => Number(p.lng))
    return {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs)
    }
  }, [points])

  const width = 1000
  const height = 460
  const selected = selectedIndex == null ? null : rows[selectedIndex]

  const pointColor = (index: number) => {
    const row = rows[index]
    const result = results[index]
    if (layer === 'aspirations') return '#0B6E6E'
    if (layer === 'funded') return (row.funded || '').trim() === 'हाँ' ? '#1A6B42' : '#A82828'
    if (layer === 'priority') return Number(row.priority || 0) === 1 ? '#A82828' : Number(row.priority || 0) === 2 ? '#8C6800' : '#1A6B42'
    if (layer === 'status') return result?.passed ? '#1A6B42' : '#A82828'
    const cni = result?.cniScore || 50
    if (cni >= 70) return '#A82828'
    if (cni >= 40) return '#8C6800'
    return '#1A6B42'
  }

  const toXY = (lat: number, lng: number) => {
    if (!geo) return { x: 0, y: 0 }
    const latRange = geo.maxLat - geo.minLat || 0.5
    const lngRange = geo.maxLng - geo.minLng || 0.5
    const x = ((lng - geo.minLng) / lngRange) * (width - 80) + 40
    const y = ((geo.maxLat - lat) / latRange) * (height - 80) + 40
    return { x, y }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold tracking-tight text-zinc-950">GIS Map - Aspiration Locations</h1>

      <div className="card space-y-3">
        <div className="flex flex-wrap gap-2">
          <select value={districtFilter} onChange={(e) => setDistrictFilter(e.target.value)} className="border border-zinc-300 rounded-md text-sm h-8 px-2.5 bg-white text-zinc-900">
            <option value="">All Districts</option>
            {districts.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={sectorFilter} onChange={(e) => setSectorFilter(e.target.value)} className="border border-zinc-300 rounded-md text-sm h-8 px-2.5 bg-white text-zinc-900">
            <option value="">All Sectors</option>
            {sectors.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          {(['cni', 'funded', 'priority', 'status', 'aspirations'] as Layer[]).map((l) => (
            <button
              key={l}
              onClick={() => setLayer(l)}
              className={`border text-xs h-7 px-3 rounded-md ${layer === l ? 'border-teal-700 bg-teal-50 text-teal-700' : 'border-zinc-300 text-zinc-700 hover:bg-zinc-50'}`}
            >
              {l.toUpperCase()}
            </button>
          ))}
          <div className="ml-auto text-xs text-zinc-500">Mapped: {points.length} · Missing GPS: {Math.max(rows.length - points.length, 0)}</div>
        </div>

        {!points.length ? (
          <div className="h-96 flex flex-col items-center justify-center text-center border border-zinc-200 rounded-lg bg-zinc-50/60">
            <p className="text-sm text-zinc-500">No GIS points for current filters.</p>
            <p className="text-xs text-zinc-400 mt-1">Upload CSV with lat/lng coordinates to see aspirations plotted on map.</p>
          </div>
        ) : (
          <div className="border border-zinc-200 rounded-lg overflow-hidden bg-zinc-50">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[460px]">
              <rect width={width} height={height} fill="#EAF5F5" />
              {Array.from({ length: 5 }).map((_, i) => {
                const x = 40 + (i * (width - 80)) / 4
                const y = 40 + (i * (height - 80)) / 4
                return (
                  <g key={i}>
                    <line x1={x} y1={40} x2={x} y2={height - 40} stroke="#B2DADA" strokeWidth="0.5" opacity="0.4" />
                    <line x1={40} y1={y} x2={width - 40} y2={y} stroke="#B2DADA" strokeWidth="0.5" opacity="0.4" />
                  </g>
                )
              })}
              {points.map((p) => {
                const { x, y } = toXY(Number(p.lat), Number(p.lng))
                const priority = Number(p.priority || 0)
                const r = priority === 1 ? 6 : 4
                return (
                  <circle
                    key={`${p.__index}-${x}-${y}`}
                    cx={x}
                    cy={y}
                    r={r}
                    fill={pointColor(p.__index)}
                    stroke="white"
                    strokeWidth="1"
                    opacity="0.85"
                    onClick={() => setSelectedIndex(p.__index)}
                    className="cursor-pointer"
                  />
                )
              })}
            </svg>
          </div>
        )}

        {selected && (
          <div className="border border-zinc-200 rounded-lg p-3 bg-white">
            <div className="text-sm font-semibold text-zinc-900">{selected.item || 'Aspiration'}</div>
            <div className="text-xs text-zinc-500 mt-0.5">{selected.gp || '—'} · {selected.district || '—'} · {selected.block || '—'}</div>
            <div className="grid grid-cols-4 gap-2 mt-3 text-xs">
              <div className="border border-zinc-200 rounded p-2"><div className="text-zinc-500">Priority</div><div className="text-zinc-900 font-medium">P{selected.priority || 0}</div></div>
              <div className="border border-zinc-200 rounded p-2"><div className="text-zinc-500">Funded</div><div className="text-zinc-900 font-medium">{selected.funded || '—'}</div></div>
              <div className="border border-zinc-200 rounded p-2"><div className="text-zinc-500">Location</div><div className="text-zinc-900 font-medium">{Number(selected.lat).toFixed(4)}, {Number(selected.lng).toFixed(4)}</div></div>
              <div className="border border-zinc-200 rounded p-2"><div className="text-zinc-500">Status</div><div className="text-zinc-900 font-medium">{results[selectedIndex || 0]?.passed ? 'PASS' : 'FAIL'}</div></div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
