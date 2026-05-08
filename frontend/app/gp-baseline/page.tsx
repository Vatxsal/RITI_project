"use client"
import React, { useMemo, useState } from 'react'

export default function GPBaselinePage() {
  const [locationType, setLocationType] = useState<'rural' | 'urban'>('rural')
  const [lookupId, setLookupId] = useState('')
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const idLabel = useMemo(() => (locationType === 'urban' ? 'Ward ID' : 'GP ID'), [locationType])

  async function handleLookup() {
    const trimmed = lookupId.trim()
    if (!trimmed) return

    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/gp-baseline?type=${locationType}&id=${encodeURIComponent(trimmed)}`)
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || 'lookup_failed')
      }
      setResults(payload)
    } catch (err: any) {
      setResults(null)
      setError(err?.message || 'lookup_failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold tracking-tight text-zinc-950">GP Baseline Viewer - 12,323 GPs Real Data (Survey 2026)</h1>

      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <h3 className="mb-3 text-sm font-medium text-zinc-900">Search Baseline</h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-zinc-500">Location Type</label>
              <select
                className="w-full border border-zinc-300 rounded-md text-sm h-8 px-2.5 bg-white text-zinc-900 focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                value={locationType}
                onChange={(event) => setLocationType(event.target.value as 'rural' | 'urban')}
              >
                <option value="rural">Rural GP</option>
                <option value="urban">Urban Ward</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-500">{idLabel}</label>
              <input
                type="text"
                placeholder={locationType === 'urban' ? 'Enter ward id, e.g. W-1042' : 'Enter gp id, e.g. GP-1034'}
                className="w-full border border-zinc-300 rounded-md text-sm h-8 px-2.5 bg-white text-zinc-900 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 placeholder:text-zinc-400"
                value={lookupId}
                onChange={(event) => setLookupId(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    void handleLookup()
                  }
                }}
              />
            </div>
            <button
              className="bg-teal-600 text-white text-xs h-7 px-3 rounded-md hover:bg-teal-700 disabled:opacity-60"
              onClick={() => void handleLookup()}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Load Baseline'}
            </button>
            <p className="text-xs text-zinc-500">
              Use the unique GP ID or Ward ID from the matching dimension table, then load the baseline facts from the corresponding rural or urban fact tables.
            </p>
            {error ? <div className="rounded-lg border border-zinc-200 bg-red-50 p-3 text-xs text-red-700">{error}</div> : null}
          </div>
        </div>

        <div className="card">
          <h3 className="mb-3 text-sm font-medium text-zinc-900">Selected Record</h3>
          {results?.record ? (
            <div className="space-y-2 text-sm text-zinc-700">
              <div><span className="font-medium">Type:</span> {results.type}</div>
              <div><span className="font-medium">ID:</span> {results.record.gp_id || results.record.ward_id || '-'}</div>
              <div><span className="font-medium">Name:</span> {results.record.gram_panchayat || results.record.ward_name || '-'}</div>
              <div><span className="font-medium">District:</span> {results.record.district || '-'}</div>
              <div><span className="font-medium">Block:</span> {results.record.block || '-'}</div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center"><p className="text-sm text-zinc-500">Search and load a rural GP or urban ward</p><p className="text-xs text-zinc-400 mt-1">Selected record details will appear here</p></div>
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="mb-3 text-sm font-medium text-zinc-900">Fact Tables</h3>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {results ? Object.entries(results.facts || {}).map(([table, row]: any) => (
            <div key={table} className="rounded-lg border border-zinc-200 bg-white p-3">
              <div className="mb-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">{table}</div>
              {row ? (
                <pre className="overflow-auto text-xs text-zinc-700">{JSON.stringify(row, null, 2)}</pre>
              ) : (
                <div className="text-sm text-zinc-500">No baseline row found</div>
              )}
            </div>
          )) : <p className="text-sm text-zinc-500">Baseline facts will appear here after lookup.</p>}
        </div>
      </div>
    </div>
  )
}
