import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const locationType = (searchParams.get('type') || 'rural').toLowerCase()
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 })

  const isUrban = locationType === 'urban'
  const dimTable = isUrban ? 'dim_urban_wards' : 'dim_rural_gps'
  const idColumn = isUrban ? 'ward_id' : 'gp_id'
  const factTables = isUrban
    ? ['fact_urban_admin', 'fact_urban_education', 'fact_urban_health', 'fact_urban_infra', 'fact_urban_water', 'fact_urban_environment', 'fact_urban_livelihood']
    : ['fact_rural_admin', 'fact_rural_education', 'fact_rural_health', 'fact_rural_infra', 'fact_rural_water', 'fact_rural_environment', 'fact_rural_livelihood']

  const results: Record<string, any> = {}
  for (const t of factTables) {
    const { data, error } = await supabase.from(t).select('*').eq(idColumn, id).limit(1)
    if (error) return NextResponse.json({ error: 'db_error', table: t }, { status: 500 })
    results[t] = (data && data[0]) || null
  }

  const { data: dim, error } = await supabase.from(dimTable).select('*').eq(idColumn, id).limit(1)
  if (error) return NextResponse.json({ error: 'db_error', table: dimTable }, { status: 500 })

  return NextResponse.json({ type: locationType, record: dim?.[0] || null, facts: results })
}
