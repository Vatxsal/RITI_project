import { AspirationRow } from './types'

type SectorWeights = Record<string, number>

const SECTOR_WEIGHTS: SectorWeights = {
  health: 22,
  education: 22,
  water: 13,
  sanitation: 10,
  roads: 11,
  electricity: 7,
  agriculture: 7,
  banking: 4,
  housing: 8,
  governance: 4,
  environment: 2
}

export function computeCNIForGP(rows: AspirationRow[], gpMeta: { is_desert?: boolean; is_tribal?: boolean; zone?: 'urban'|'rural' } = {}) {
  // rows: passing aspirations for the GP
  const total = rows.length || 1
  // compute sector counts
  const sectorCounts: Record<string, number> = {}
  let unfunded = 0
  let p1count = 0
  rows.forEach(r => {
    const sector = (r.sector || 'other').toLowerCase()
    sectorCounts[sector] = (sectorCounts[sector] || 0) + 1
    if ((r.funded||'').trim() === 'नहीं') unfunded += 1
    if (r.priority === 1) p1count += 1
  })

  // sector gap score = (count / total) *100
  let score = 0
  Object.entries(SECTOR_WEIGHTS).forEach(([sector, weight]) => {
    const cnt = sectorCounts[sector] || 0
    const sectorScore = Math.min(100, (cnt / total) * 100)
    score += (sectorScore * weight) / 100
  })

  // adjustments
  const unfundedRatio = (unfunded / total) * 10
  const p1Ratio = (p1count / total) * 5
  let final = score + unfundedRatio + p1Ratio

  if (gpMeta.is_desert) final *= 1.2
  if (gpMeta.is_tribal) final *= 1.15
  if (gpMeta.zone === 'urban') {
    // redistribute agriculture weight to health (+4) and water (+3)
    final += 4 + 3
  }

  return Math.round(Math.min(100, final))
}

export function bandFromCNI(score: number) {
  if (score >= 70) return { band: 'Critical', color: 'critical' }
  if (score >= 40) return { band: 'Moderate', color: 'moderate' }
  return { band: 'On Track', color: 'ontrack' }
}
