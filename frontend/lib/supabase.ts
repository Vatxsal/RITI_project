import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)

export async function fetchGPCounts() {
  // Example: counts by gp from dim_rural_gps
  try {
    const { data, error } = await supabase.rpc('get_gp_counts')
    if (error) return { data: null, error }
    return { data }
  } catch (e) {
    return { data: null, error: e }
  }
}

export async function fetchComplianceNorms() {
  const { data, error } = await supabase.from('compliance_norms').select('*').limit(1000)
  if (error) return {}
  const map: Record<string, any> = {}
  (data || []).forEach((row: any) => {
    map[row.region || row.district || ''] = row
  })
  return map
}
