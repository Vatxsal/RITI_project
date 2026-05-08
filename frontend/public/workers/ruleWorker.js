/* eslint-disable no-restricted-globals */
const LAT_MIN = 23.0
const LAT_MAX = 30.2
const LNG_MIN = 69.3
const LNG_MAX = 78.3
const BUDGET_CEILING = 50000000

function computeBudgetSplit(total) {
  const threshold = 100000
  if (total > threshold) return { central: Math.round(total*0.4), state: Math.round(total*0.6) }
  return { central: Math.round(total*0.5), state: Math.round(total*0.5) }
}

onmessage = function(e) {
  const { rows, complianceNorms, baselineMap } = e.data
  const seen = new Set()
  const results = rows.map((r, idx) => {
    const failed = []
    const quantities = (Number(r.qty_2030)||0) + (Number(r.qty_2035)||0) + (Number(r.qty_2047)||0)
    if (!r.district || !r.block || !r.gp || !r.item) failed.push('R1')
    if (quantities === 0) failed.push('R1')
    if (r.lat != null && r.lng != null && r.lat !== '' && r.lng !== '') {
      const lat = Number(r.lat), lng = Number(r.lng)
      if (!(lat >= LAT_MIN && lat <= LAT_MAX && lng >= LNG_MIN && lng <= LNG_MAX)) failed.push('R2')
    }
    // R3 simple: skip if no norm
    // R4
    if ((r.funded||'').trim() === 'नहीं' && !(r.scheme && r.scheme.trim())) failed.push('R4')
    // R5
    if (Number(r.priority) === 1 && Number(r.qty_2030||0) === 0) failed.push('R5')
    if (Number(r.priority) === 3 && Number(r.qty_2030||0) > 0) failed.push('R5')
    // R6
    const unit_cost = Number(r.unit_cost||0)
    const totalCost = Number(r.total_cost) || unit_cost * quantities
    if (totalCost > BUDGET_CEILING) failed.push('R6')
    // R7
    const key = `${r.district}||${r.block}||${r.gp}||${r.item}`
    if (seen.has(key)) failed.push('R7')
    else seen.add(key)
    // R8 baseline
    let fastTrack = false
    if (baselineMap) {
      const base = baselineMap[key]
      if (base && base.count === 0) fastTrack = true
    }

    return { rowId: `row-${idx}`, passed: failed.length===0, failedRules: failed, fastTrack, budgetSplit: computeBudgetSplit(totalCost) }
  })
  postMessage({ results })
}
