export type AspirationRow = {
  district?: string
  block?: string
  gp?: string
  item?: string
  lat?: number | null
  lng?: number | null
  funded?: string
  scheme?: string
  priority?: number
  qty_2030?: number
  qty_2035?: number
  qty_2047?: number
  unit_cost?: number
  total_cost?: number
  current_pop?: number
  [key: string]: any
}

export type RuleResult = {
  rowId: string
  passed: boolean
  failedRules: string[]
  fastTrack?: boolean
  cniScore?: number
  budgetSplit?: { central: number; state: number }
}
