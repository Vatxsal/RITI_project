"use client"
import React, { useMemo } from 'react'
import { useAspStore } from '../../store/aspirationStore'
import { aggregateBudget, UNIT_COST_MAP } from '../../lib/budgetEngine'
import { formatINRShort } from '../../lib/utils/format'

export default function BudgetEnginePage() {
  const rows = useAspStore(s => s.aspirationData)
  const results = useAspStore(s => s.ruleResults)

  const budget = useMemo(() => aggregateBudget(rows), [rows])

  const sectorBudgets = useMemo(() => {
    const map: Record<string, number> = {}
    rows.forEach((r) => {
      const key = r.sector || 'Other'
      map[key] = (map[key] || 0) + Number(r.total_cost || 0)
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8)
  }, [rows])

  const accepted = useMemo(() => results.filter(r => r.passed).length, [results])
  const rejected = useMemo(() => results.filter(r => !r.passed).length, [results])

  const downloadOfflineReport = () => {
    const title = 'Manthaan Budget Report'
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body { font-family: Calibri, Arial, sans-serif; margin: 24px; color: #1f2937; }
    h1 { margin-bottom: 0; }
    .sub { color: #6b7280; margin-top: 4px; margin-bottom: 18px; }
    .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-bottom: 16px; }
    .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; }
    .k { font-size: 11px; color: #6b7280; text-transform: uppercase; }
    .v { font-size: 20px; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border: 1px solid #e5e7eb; padding: 6px; font-size: 12px; text-align: left; }
    th { background: #f9fafb; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="sub">Generated ${new Date().toLocaleDateString('en-IN')}</div>
  <div class="grid">
    <div class="card"><div class="k">Phase I (2030)</div><div class="v">${formatINRShort(budget.phase1)}</div></div>
    <div class="card"><div class="k">Phase II (2035)</div><div class="v">${formatINRShort(budget.phase2)}</div></div>
    <div class="card"><div class="k">Vision (2047)</div><div class="v">${formatINRShort(budget.vision)}</div></div>
    <div class="card"><div class="k">Scheme Funded</div><div class="v">${formatINRShort(budget.total - budget.fundingGap)}</div></div>
    <div class="card"><div class="k">Funding Gap</div><div class="v">${formatINRShort(budget.fundingGap)}</div></div>
    <div class="card"><div class="k">Accepted/Rejected</div><div class="v">${accepted}/${rejected}</div></div>
  </div>
  <h3>Sector Budget Breakdown</h3>
  <table>
    <thead><tr><th>Sector</th><th>Budget</th></tr></thead>
    <tbody>
      ${sectorBudgets.map(([s, v]) => `<tr><td>${s}</td><td>${formatINRShort(v)}</td></tr>`).join('')}
    </tbody>
  </table>
</body>
</html>`

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `manthaan_budget_report_${new Date().toISOString().slice(0, 10)}.html`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const printReport = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold tracking-tight text-zinc-950">Budget Engine</h1>

      <div className="bg-white border border-zinc-200 rounded-lg p-4">
        <div className="grid grid-cols-5 gap-4 text-center">
          <div>
            <div className="text-xs text-zinc-500 font-normal uppercase tracking-wider">PHASE I (2030)</div>
            <div className="text-2xl font-semibold tabular-nums text-zinc-950">{formatINRShort(budget.phase1)}</div>
          </div>
          <div>
            <div className="text-xs text-zinc-500 font-normal uppercase tracking-wider">PHASE II (2035)</div>
            <div className="text-2xl font-semibold tabular-nums text-zinc-950">{formatINRShort(budget.phase2)}</div>
          </div>
          <div>
            <div className="text-xs text-zinc-500 font-normal uppercase tracking-wider">VISION (2047)</div>
            <div className="text-2xl font-semibold tabular-nums text-zinc-950">{formatINRShort(budget.vision)}</div>
          </div>
          <div>
            <div className="text-xs text-zinc-500 font-normal uppercase tracking-wider">SCHEME FUNDED</div>
            <div className="text-2xl font-semibold tabular-nums text-zinc-950">{formatINRShort(budget.total - budget.fundingGap)}</div>
          </div>
          <div>
            <div className="text-xs text-zinc-500 font-normal uppercase tracking-wider">FUNDING GAP</div>
            <div className="text-2xl font-semibold tabular-nums text-zinc-950">{formatINRShort(budget.fundingGap)}</div>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={downloadOfflineReport} className="border border-zinc-300 text-zinc-700 text-xs h-7 px-3 rounded-md hover:bg-zinc-50">Generate Offline Report</button>
        <button onClick={printReport} className="border border-zinc-300 text-zinc-700 text-xs h-7 px-3 rounded-md hover:bg-zinc-50">Print Report</button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <h3 className="text-sm font-medium text-zinc-900 mb-3">Budget by Sector</h3>
          {sectorBudgets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center"><p className="text-sm text-zinc-500">Upload data</p><p className="text-xs text-zinc-400 mt-1">Sector budget visualization will appear here</p></div>
          ) : (
            <div className="space-y-2">
              {sectorBudgets.map(([sector, val]) => {
                const max = sectorBudgets[0][1] || 1
                const width = (val / max) * 100
                return (
                  <div key={sector} className="space-y-1">
                    <div className="flex justify-between text-xs"><span className="text-zinc-700">{sector}</span><span className="text-zinc-500">{formatINRShort(val)}</span></div>
                    <div className="h-2 bg-zinc-100 rounded"><div className="h-full bg-teal-600 rounded" style={{ width: `${width}%` }} /></div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="text-sm font-medium text-zinc-900 mb-3">Unit Cost Reference (Budget 2026-27)</h3>
          <div className="overflow-auto max-h-96">
            <table className="w-full border border-zinc-200 rounded-lg overflow-hidden">
              <thead className="bg-zinc-50 border-b border-zinc-200 sticky top-0">
                <tr>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Item</th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">Unit</th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">Cost</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(UNIT_COST_MAP).filter(([k]) => k !== 'default').map(([item, data]) => (
                  <tr key={item} className="border-b border-zinc-100 hover:bg-zinc-50/60 transition-none">
                    <td className="px-3 py-2.5 text-xs text-zinc-900">{item}</td>
                    <td className="px-3 py-2.5 text-right text-xs text-zinc-900">unit</td>
                    <td className="px-3 py-2.5 text-right text-xs text-zinc-900">{formatINRShort(data.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
