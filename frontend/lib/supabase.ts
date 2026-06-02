import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON || ''
 
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)

/**
 * Fetch all rows from a Supabase table using pagination (1000 rows/page).
 * `filters` are applied as equality checks. `select` defaults to '*'.
 */
export async function fetchAll(table: string, filters: Record<string, any> = {}, select = '*') {
  const PAGE_SIZE = 1000
  const run = async () => {
    // 1. Get total row count for this query
    let countQuery = supabase.from(table).select('*', { count: 'exact', head: true })
    Object.entries(filters).forEach(([col, val]) => { countQuery = countQuery.eq(col, val) })

    const { count, error: countErr } = await countQuery
    if (countErr) throw countErr
    if (!count || count === 0) return []

    // 2. Prepare ranges for all pages
    const numPages = Math.ceil(count / PAGE_SIZE)
    const pagePromises: Promise<any[]>[] = []

    for (let i = 0; i < numPages; i++) {
      const from = i * PAGE_SIZE
      const to = from + PAGE_SIZE - 1
      let query = supabase.from(table).select(select).range(from, to)
      Object.entries(filters).forEach(([col, val]) => { query = query.eq(col, val) })

      pagePromises.push(
        query.then((res: any) => {
          if (res.error) throw res.error
          return res.data || []
        })
      )
    }

    // 3. Fetch all pages concurrently and flatten results
    const results = await Promise.all(pagePromises)
    return results.flat()
  }

  let lastError: any = null
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await run()
    } catch (error: any) {
      lastError = error
      const message = String(error?.message || '')
      const code = String(error?.code || '')
      const isSchemaCacheError = code === 'PGRST002' || /schema cache/i.test(message)
      if (!isSchemaCacheError || attempt === 3) {
        throw error
      }
      await new Promise((resolve) => setTimeout(resolve, 250 * attempt))
    }
  }

  throw lastError
}


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
  try {
    const rows = await fetchAll('compliance_norms')
    const map: Record<string, any> = {}
    ;(rows ?? []).forEach((row: any) => {
      map[row.region || row.district || ''] = row
    })
    return map
  } catch (e) {
    return {}
  }
}
