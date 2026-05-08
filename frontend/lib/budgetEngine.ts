import { AspirationRow } from './types'

export const UNIT_COST_MAP: Record<string, { cost: number; statePct: number; centralPct: number }> = {
  'सिंचाई पाइपलाइन': { cost: 18000, statePct: 0.40, centralPct: 0.60 },
  'फार्म पौंड': { cost: 150000, statePct: 0.40, centralPct: 0.60 },
  'डिग्गी': { cost: 350000, statePct: 0.50, centralPct: 0.50 },
  'तारबंदी': { cost: 120000, statePct: 0.25, centralPct: 0.75 },
  'सोलर पंप': { cost: 150000, statePct: 0.30, centralPct: 0.70 },
  'ड्रिप': { cost: 80000, statePct: 0.35, centralPct: 0.65 },
  'स्प्रिंकलर': { cost: 60000, statePct: 0.35, centralPct: 0.65 },
  'ग्रीन हाउस': { cost: 850000, statePct: 0.50, centralPct: 0.50 },
  'पॉली हाउस': { cost: 500000, statePct: 0.50, centralPct: 0.50 },
  'शेडनेट': { cost: 300000, statePct: 0.50, centralPct: 0.50 },
  'कोल्ड स्टोरेज': { cost: 2500000, statePct: 0.40, centralPct: 0.60 },
  'पशुचिकित्सालय': { cost: 1500000, statePct: 0.60, centralPct: 0.40 },
  default: { cost: 500000, statePct: 0.50, centralPct: 0.50 }
}

export function unitForItem(item: string) {
  const key = Object.keys(UNIT_COST_MAP).find(k => item?.includes(k))
  return key ? UNIT_COST_MAP[key] : UNIT_COST_MAP.default
}

export function computeRowBudget(row: AspirationRow) {
  const qty = (row.qty_2030 || 0) + (row.qty_2035 || 0) + (row.qty_2047 || 0)
  const unit = unitForItem(row.item || '')
  const total = qty * unit.cost
  return {
    phase1: (row.qty_2030 || 0) * unit.cost,
    phase2: (row.qty_2035 || 0) * unit.cost,
    vision: (row.qty_2047 || 0) * unit.cost,
    total,
    stateFund: Math.round(total * unit.statePct),
    centralFund: Math.round(total * unit.centralPct),
    fundingGap: (row.funded === 'नहीं') ? total : 0
  }
}

export function aggregateBudget(rows: AspirationRow[]) {
  const agg = { phase1: 0, phase2: 0, vision: 0, total: 0, stateFund: 0, centralFund: 0, fundingGap: 0 }
  rows.forEach(r => {
    const b = computeRowBudget(r)
    agg.phase1 += b.phase1
    agg.phase2 += b.phase2
    agg.vision += b.vision
    agg.total += b.total
    agg.stateFund += b.stateFund
    agg.centralFund += b.centralFund
    agg.fundingGap += b.fundingGap
  })
  return agg
}
