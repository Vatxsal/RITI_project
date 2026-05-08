import { create } from 'zustand'
import { AspirationRow, RuleResult } from '../lib/types'
import { supabase } from '../lib/supabase'

type State = {
  aspirationData: AspirationRow[]
  ruleResults: RuleResult[]
  baselineCache: Record<string, any>
  complianceNorms: Record<string, any>
  setAspirationData: (rows: AspirationRow[]) => void
  setRuleResults: (r: RuleResult[]) => void
  loadBaselineCache: () => Promise<void>
  loadComplianceNorms: () => Promise<void>
}

export const useAspStore = create<State>((set, get) => ({
  aspirationData: [],
  ruleResults: [],
  baselineCache: {},
  complianceNorms: {},
  setAspirationData: (rows) => set({ aspirationData: rows }),
  setRuleResults: (r) => set({ ruleResults: r }),
  loadBaselineCache: async () => {
    // fetch dim_rural_gps + minimal facts for join
    const { data, error } = await supabase.from('dim_rural_gps').select('gp_id, district, block, gram_panchayat, is_desert, is_tribal')
    if (error) return
    const map: Record<string, any> = {}
    (data||[]).forEach((d:any)=>{
      const key = `${(d.district||'').toLowerCase()}||${(d.block||'').toLowerCase()}||${(d.gram_panchayat||'').toLowerCase()}`
      map[key] = d
    })
    set({ baselineCache: map })
  },
  loadComplianceNorms: async () => {
    const { data } = await supabase.from('compliance_norms').select('*')
    const map: Record<string, any> = {}
    (data||[]).forEach((d:any)=>{
      const key = `${d.category_en}||${d.asset_type}`
      map[key] = d
    })
    set({ complianceNorms: map })
  }
}))
