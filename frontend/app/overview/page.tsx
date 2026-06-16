"use client"
import React, { useEffect, useMemo, useState } from 'react'
import { useAspStore } from '../../store/aspirationStore'
import StatCard from '../../components/StatCard'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { fetchDashboardKpis, getEmptyDashboardPayload, AreaType } from '@/lib/dashboard-kpis'

export default function OverviewPage() {
  const rows = useAspStore(s => s.aspirationData)
  const results = useAspStore(s => s.ruleResults)
  const [areaType, setAreaType] = useState<AreaType>('all')
  const [dashboard, setDashboard] = useState(getEmptyDashboardPayload())

  useEffect(() => {
    let alive = true
    fetchDashboardKpis({ areaType })
      .then((payload) => {
        if (alive && payload) setDashboard(payload)
      })
      .catch(() => {
        if (alive) setDashboard(getEmptyDashboardPayload())
      })

    return () => {
      alive = false
    }
  }, [areaType])

  const stats = useMemo(() => {
    const total = rows.length
    const rejected = results.filter(r => !r.passed).length
    const funded = rows.filter(r => (r.funded || '').trim() === 'हाँ').length
    const critical = results.filter(r => (r.cniScore || 0) >= 70).length
    return { total, rejected, funded, critical }
  }, [rows, results])

  const CHART_COLORS = ['#0D9488', '#2563EB', '#D97706', '#DC2626', '#7C3AED', '#059669']
  const statusData = [
    { name: 'Passed', value: stats.total - stats.rejected, fill: '#16A34A' },
    { name: 'Failed', value: stats.rejected, fill: '#DC2626' }
  ]

  const sectorData = [
    { sector: 'Health', aspirations: rows.filter(r => r.sector?.includes('Health')).length },
    { sector: 'Education', aspirations: rows.filter(r => r.sector?.includes('Education')).length },
    { sector: 'Water', aspirations: rows.filter(r => r.sector?.includes('Water')).length },
    { sector: 'Infrastructure', aspirations: rows.filter(r => r.sector?.includes('Infra')).length }
  ]

  const districtData = rows.length > 0 ? rows.reduce((acc: any, r) => {
    const d = (r.district || 'Unknown')
    const found = acc.find((x: any) => x.district === d)
    if (found) found.volume += 1
    else acc.push({ district: d, volume: 1 })
    return acc
  }, []).sort((a: any, b: any) => b.volume - a.volume).slice(0, 5) : []

  return (
    <div className="space-y-6">
      <div className="text-xl font-semibold tracking-tight text-zinc-950">Overview</div>

      {/* Area Type Filter */}
      <div className="flex gap-2">
        <button
          onClick={() => setAreaType('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            areaType === 'all'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          ALL (Rural + Urban)
        </button>
        <button
          onClick={() => setAreaType('rural')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            areaType === 'rural'
              ? 'bg-green-600 text-white shadow-lg'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          Rural Only
        </button>
        <button
          onClick={() => setAreaType('urban')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            areaType === 'urban'
              ? 'bg-orange-600 text-white shadow-lg'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          Urban Only
        </button>
      </div>

      <div className="bg-white border border-zinc-200 rounded-lg p-4">
        <div className="grid grid-cols-6 gap-4 text-center">
          <div>
            <div className="text-xs text-zinc-500 font-normal uppercase tracking-wider">DISTRICTS</div>
            <div className="text-2xl font-semibold tabular-nums text-zinc-950">{dashboard.districtScores.length}</div>
            <div className="text-xs text-zinc-400">Rajasthan</div>
          </div>
          <div>
            <div className="text-xs text-zinc-500 font-normal uppercase tracking-wider">BLOCKS</div>
            <div className="text-2xl font-semibold tabular-nums text-zinc-950">457</div>
            <div className="text-xs text-zinc-400">All zones</div>
          </div>
          <div>
            <div className="text-xs text-zinc-500 font-normal uppercase tracking-wider">GP BASELINE</div>
            <div className="text-2xl font-semibold tabular-nums text-zinc-950">{dashboard.dataCoverage[0]?.[1] ?? '—'}</div>
            <div className="text-xs text-zinc-400">Post 2026</div>
          </div>
          <div>
            <div className="text-xs text-zinc-500 font-normal uppercase tracking-wider">ASPIRATIONS</div>
            <div className="text-2xl font-semibold tabular-nums text-zinc-950">Loaded</div>
            <div className="text-xs text-zinc-400">Rule engine</div>
          </div>
          <div>
            <div className="text-xs text-zinc-500 font-normal uppercase tracking-wider">ACCEPTED</div>
            <div className="text-2xl font-semibold tabular-nums text-zinc-950">Pass all rules</div>
            <div className="text-xs text-zinc-400">Rule engine</div>
          </div>
          <div>
            <div className="text-xs text-zinc-500 font-normal uppercase tracking-wider">REJECTED</div>
            <div className="text-2xl font-semibold tabular-nums text-zinc-950">Est. Rs Cr</div>
            <div className="text-xs text-zinc-400">Budget need</div>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard 
          title="Total Aspirations" 
          value={stats.total} 
          accent="#0d9488"
        />
        <StatCard 
          title="Rejected (Strict Rules)" 
          value={stats.rejected} 
          accent="#f97316"
        />
        <StatCard 
          title="Funded Aspirations" 
          value={stats.funded} 
          accent="#16a34a"
        />
        <StatCard 
          title="Critical GPs (CNI ≥70)" 
          value={stats.critical} 
          accent="#dc2626"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <h3 className="text-sm font-medium text-zinc-900 mb-3">Aspirations by Sector</h3>
          {sectorData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sectorData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" />
                <XAxis dataKey="sector" tick={{ fontSize: 11, fill: '#71717A' }} />
                <YAxis tick={{ fontSize: 11, fill: '#71717A' }} />
                <Tooltip contentStyle={{ border: '1px solid #E4E4E7', borderRadius: 6, fontSize: 11 }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11, color: '#71717A' }} />
                <Bar dataKey="aspirations" fill={CHART_COLORS[0]} radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center h-72"><p className="text-sm text-zinc-500">Upload CSV to see sector breakdown</p><p className="text-xs text-zinc-400 mt-1">Charts will render after data load</p></div>
          )}
        </div>

        <div className="card">
          <h3 className="text-sm font-medium text-zinc-900 mb-3">Status Distribution</h3>
          {statusData[0].value + statusData[1].value > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={100} fill="#8884d8" dataKey="value">
                  {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ border: '1px solid #E4E4E7', borderRadius: 6, fontSize: 11 }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11, color: '#71717A' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center h-72"><p className="text-sm text-zinc-500">Upload CSV to see status breakdown</p><p className="text-xs text-zinc-400 mt-1">Charts will render after data load</p></div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <h3 className="text-sm font-medium text-zinc-900 mb-3">Top Districts by Volume</h3>
          {districtData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={districtData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#71717A' }} />
                <YAxis dataKey="district" type="category" width={100} tick={{ fontSize: 11, fill: '#71717A' }} />
                <Tooltip contentStyle={{ border: '1px solid #E4E4E7', borderRadius: 6, fontSize: 11 }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11, color: '#71717A' }} />
                <Bar dataKey="volume" fill={CHART_COLORS[1]} radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center h-64"><p className="text-sm text-zinc-500">Upload data</p><p className="text-xs text-zinc-400 mt-1">District chart appears after data load</p></div>
          )}
        </div>

        <div className="card">
          <h3 className="text-sm font-medium text-zinc-900 mb-3">Budget by Phase</h3>
          {rows.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={[{ phase: 'Phase I', budget: 0 }, { phase: 'Phase II', budget: 0 }, { phase: 'Vision', budget: 0 }]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" />
                <XAxis dataKey="phase" tick={{ fontSize: 11, fill: '#71717A' }} />
                <YAxis tick={{ fontSize: 11, fill: '#71717A' }} />
                <Tooltip contentStyle={{ border: '1px solid #E4E4E7', borderRadius: 6, fontSize: 11 }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11, color: '#71717A' }} />
                <Bar dataKey="budget" fill={CHART_COLORS[2]} radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center h-64"><p className="text-sm text-zinc-500">Upload data</p><p className="text-xs text-zinc-400 mt-1">Budget chart appears after data load</p></div>
          )}
        </div>
      </div>
    </div>
  )
}
