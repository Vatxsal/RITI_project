"use client"
import React from 'react'
import Papa from 'papaparse'
import { useAspStore } from '../../store/aspirationStore'
import { runRuleEngine } from '../../lib/ruleEngine'
import { unitForItem } from '../../lib/budgetEngine'

const HINDI_TO_KEY: Record<string,string> = {
  'राजधारा संदर्भ': 'rajdhara_ref',
  'राजधारा रेफरेंस': 'rajdhara_ref',
  'जिला': 'district',
  'ब्लॉक': 'block',
  'ग्राम पंचायत': 'gp',
  'सूचक': 'sector',
  'विभाग': 'dept',
  'सब-इंडिकेटर्स': 'item',
  'प्राथमिकता स्तर': 'priority',
  '2030': 'qty_2030',
  '2030-35': 'qty_2035',
  '2035-47': 'qty_2047',
  'वित्तीय स्वीकृति': 'funded',
  'योजना का नाम': 'scheme',
  'अक्षांश मान': 'lat',
  'देशांतर मान': 'lng'
}

export default function CSVDropzone() {
  const setAsp = useAspStore(s=>s.setAspirationData)
  const setResults = useAspStore(s=>s.setRuleResults)
  const baselineMap = useAspStore(s=>s.baselineCache)
  const complianceNorms = useAspStore(s=>s.complianceNorms)

  function mapRow(row:any) {
    const mapped:any = {}
    Object.entries(row).forEach(([k,v])=>{
      const key = HINDI_TO_KEY[k.trim()] || k
      mapped[key] = v
    })
    // normalize numbers
    mapped.priority = Number(mapped.priority || 2)
    mapped.qty_2030 = Number(mapped.qty_2030||0)
    mapped.qty_2035 = Number(mapped.qty_2035||0)
    mapped.qty_2047 = Number(mapped.qty_2047||0)
    mapped.lat = mapped.lat === '' || mapped.lat == null ? null : Number(mapped.lat)
    mapped.lng = mapped.lng === '' || mapped.lng == null ? null : Number(mapped.lng)
    mapped.funded = String(mapped.funded || '').includes('हाँ') || String(mapped.funded || '').toUpperCase().includes('YES') ? 'हाँ' : 'नहीं'
    const unit = unitForItem(mapped.item || '')
    const qty = mapped.qty_2030 + mapped.qty_2035 + mapped.qty_2047
    mapped.unit_cost = unit.cost
    mapped.total_cost = qty * unit.cost
    return mapped
  }

  function handleFile(f: File) {
    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      worker: true,
      complete: (res) => {
        const rows = (res.data as any[]).map(mapRow)
        setAsp(rows)
        const baselineFetch = (key: string) => {
          const base = baselineMap[key]
          if (!base) return 1
          return base.count ?? 1
        }
        const results = runRuleEngine(rows, complianceNorms, baselineFetch)
        setResults(results)
      }
    })
  }

  return (
    <div className="card">
      <h3 className="text-sm font-medium text-zinc-900 mb-3">Upload CSV (Rajdhara format)</h3>
      <label className="border-2 border-dashed border-zinc-300 rounded-lg p-10 text-center hover:border-zinc-400 hover:bg-zinc-50 cursor-pointer transition-colors block">
        <div className="text-zinc-400 text-sm">Upload file</div>
        <div className="text-sm font-medium text-zinc-700 mt-1">Drop CSV here or click to browse</div>
        <div className="text-xs text-zinc-400 mt-1">Only .csv files are supported</div>
        <input className="hidden" type="file" accept="text/csv" onChange={(e)=>{const f=e.target.files?.[0]; if(f) handleFile(f)}} />
      </label>
      <p className="text-xs text-zinc-400 mt-2">Required columns: जिला, ब्लॉक, ग्राम पंचायत, सब-इंडिकेटर्स, प्राथमिकता स्तर, 2030, 2030-35, 2035-47, वित्तीय स्वीकृति, योजना का नाम, अक्षांश मान, देशांतर मान</p>
    </div>
  )
}
