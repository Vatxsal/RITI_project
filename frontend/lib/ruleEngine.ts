import { AspirationRow, RuleResult } from './types'

// Constants
const LAT_MIN = 23.0
const LAT_MAX = 30.2
const LNG_MIN = 69.3
const LNG_MAX = 78.3
const BUDGET_CEILING = 50_00_00_000 // ₹50 Crore in paise-style but we keep rupees here as numeric

const UNIT_COST_MAP: Record<string, number> = {
  'सिंचाई पाइपलाइन': 18000,
  'फार्म पौंड': 150000
}

// Simple utility
function indianFormat(n: number) {
  return n.toLocaleString('en-IN')
}

export function runRuleEngine(rows: AspirationRow[], complianceNorms: Record<string, any> = {}, baselineFetch?: (key: string)=>number): RuleResult[] {
  const seen = new Set<string>()
  return rows.map((r, idx) => {
    const id = `row-${idx}`
    const failed: string[] = []
    let fastTrack = false

    // R1 - Integrity
    const missingCore = !r.district || !r.block || !r.gp || !r.item
    const quantities = (r.qty_2030 || 0) + (r.qty_2035 || 0) + (r.qty_2047 || 0)
    if (missingCore || quantities === 0) failed.push('R1')

    // R2 - GIS
    if (r.lat != null && r.lng != null) {
      if (!(r.lat >= LAT_MIN && r.lat <= LAT_MAX && r.lng >= LNG_MIN && r.lng <= LNG_MAX)) failed.push('R2')
    }

    // R3 - Pop Norm
    if (r.current_pop != null) {
      const normKey = `${r.district || ''}`
      const norm = complianceNorms[normKey]
      if (norm && r.current_pop < norm.min_pop) failed.push('R3')
    }

    // R4 - Scheme
    if ((r.funded || '').trim() === 'नहीं' && !(r.scheme && r.scheme.trim())) failed.push('R4')

    // R5 - Priority Alignment
    if (r.priority === 1) {
      // if quantities only in 2035/2047 (no 2030)
      if ((r.qty_2030 || 0) === 0 && ((r.qty_2035 || 0) > 0 || (r.qty_2047 || 0) > 0)) failed.push('R5')
    }

    // R6 - Budget Ceiling
    const totalCost = r.total_cost ?? ((r.unit_cost ?? 0) * ((r.qty_2030||0)+(r.qty_2035||0)+(r.qty_2047||0)))
    if (totalCost > BUDGET_CEILING) failed.push('R6')

    // R7 - Duplicate within upload
    const key = `${r.district}||${r.block}||${r.gp}||${r.item}`
    if (seen.has(key)) failed.push('R7')
    else seen.add(key)

    // R8 - Baseline Gap (fast-track)
    if (baselineFetch) {
      const baselineCount = baselineFetch(key)
      if (baselineCount === 0) {
        fastTrack = true
      }
    }

    // Compose result
    const passed = failed.length === 0
    const cniScore = computeCNI(r)
    const budgetSplit = computeBudgetSplit(totalCost)

    return {
      rowId: id,
      passed,
      failedRules: failed,
      fastTrack,
      cniScore,
      budgetSplit
    } as RuleResult
  })
}

export function computeCNI(r: AspirationRow) {
  // placeholder weighted sum - health/edu 22%, water 13%, infra 12%, livelihood 10%, others remainder
  const weights: Record<string, number> = { health: 0.22, education: 0.22, water: 0.13, infra: 0.12, livelihood: 0.10 }
  let base = 0
  for (const k of Object.keys(weights)) {
    const val = (r["gap_" + k] as number) || 0
    base += weights[k] * val
  }
  // Adjustments
  if (r['is_desert']) base *= 1.2
  if (r['is_tribal']) base *= 1.15
  return Math.round(base)
}

export function computeBudgetSplit(totalCost: number) {
  // decide split: if totalCost > 1 crore, 60:40 else 50:50
  const threshold = 1_00_00_000
  if (totalCost > threshold) return { central: Math.round(totalCost*0.4), state: Math.round(totalCost*0.6) }
  return { central: Math.round(totalCost*0.5), state: Math.round(totalCost*0.5) }
}
