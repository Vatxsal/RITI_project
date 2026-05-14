import { create } from 'zustand'
import { AspirationRow, RuleResult } from '../lib/types'
import { supabase, fetchAll } from '../lib/supabase'

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
    // fetch dim_rural_gps + minimal facts for join (paginated)
    try {
      const rows = await fetchAll('dim_rural_gps', {}, 'gp_id, district, block, gram_panchayat, is_desert, is_tribal')
      console.log('DEBUG: baseline rows', rows.length, rows[0])
      const map: Record<string, any> = {}
      ;(rows ?? []).forEach((d:any)=>{
        const key = `${(d.district||'').toLowerCase()}||${(d.block||'').toLowerCase()}||${(d.gram_panchayat||'').toLowerCase()}`
        map[key] = d
      })
      set({ baselineCache: map })
    } catch (e) {
      console.error('Failed to load baseline cache', e)
    }
  },
  loadComplianceNorms: async () => {
    try {
      const rows = await fetchAll('compliance_norms')
      console.log('DEBUG: compliance rows', rows.length, rows[0])
      const map: Record<string, any> = {}
      ;(rows ?? []).forEach((d:any)=>{
        const key = `${d.category_en}||${d.asset_type}`
        map[key] = d
      })
      set({ complianceNorms: map })
    } catch (e) {
      console.error('Failed to load compliance norms', e)
    }
  }
}))
