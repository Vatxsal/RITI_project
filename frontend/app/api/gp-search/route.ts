import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') || '').trim()
  const locationType = (searchParams.get('type') || 'rural').toLowerCase()

  const isUrban = locationType === 'urban'
  const tableName = isUrban ? 'dim_urban_wards' : 'dim_rural_gps'
  const idColumn = isUrban ? 'ward_id' : 'gp_id'
  const selectColumns = isUrban
    ? 'ward_id, district, block'
    : 'gp_id, district, block, gram_panchayat, is_desert, is_tribal'

  let query = supabase.from(tableName).select(selectColumns).limit(20)
  if (q) {
    query = query.ilike(idColumn, `%${q}%`)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'db_error' }, { status: 500 })
  return NextResponse.json({ data, type: locationType })
}
