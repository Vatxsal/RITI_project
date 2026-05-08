import { create } from 'zustand'
import { AspirationRow, RuleResult } from './types'

type State = {
  aspirationData: AspirationRow[]
  ruleResults: RuleResult[]
  setAspirationData: (rows: AspirationRow[]) => void
  setRuleResults: (results: RuleResult[]) => void
}

export const useStore = create<State>((set) => ({
  aspirationData: [],
  ruleResults: [],
  setAspirationData: (rows) => set({ aspirationData: rows }),
  setRuleResults: (results) => set({ ruleResults: results })
}))
