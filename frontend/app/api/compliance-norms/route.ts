import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

export async function GET() {
  const { data, error } = await supabase.from('compliance_norms').select('category_en, asset_type, pop_norm_plain, pop_norm_relaxed, applies_to')
  if (error) return NextResponse.json({ error: 'db_error' }, { status: 500 })
  return NextResponse.json({ data })
}
