import { NextResponse } from 'next/server'
import { supabase, fetchAll } from '../../../lib/supabase'

export async function GET() {
  try {
    const data = await fetchAll('compliance_norms', {}, 'category_en, asset_type, pop_norm_plain, pop_norm_relaxed, applies_to')
    return NextResponse.json({ data })
  } catch (e) {
    console.error('Failed to fetch compliance_norms', e)
    return NextResponse.json({ data: [] })
  }
}
