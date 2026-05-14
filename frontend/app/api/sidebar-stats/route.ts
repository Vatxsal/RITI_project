import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Fetch rural GPs count
    const { data: ruralGPs, error: ruralError } = await supabase
      .from('dim_rural_gps')
      .select('gp_id', { count: 'exact' });
    
    if (ruralError) throw ruralError;

    // Fetch urban wards count
    const { data: urbanWards, error: urbanError } = await supabase
      .from('dim_urban_wards')
      .select('ward_id', { count: 'exact' });
    
    if (urbanError) throw urbanError;

    const ruralCount = ruralGPs?.length || 0;
    const urbanCount = urbanWards?.length || 0;
    const totalCoverage = ruralCount + urbanCount;

    // Calculate data quality: percentage of GPs/wards with at least one baseline record
    let qualityScore = 100;
    
    // Check rural coverage: sample if we have any data in rural fact tables
    if (ruralCount > 0) {
      const { data: sampleRural, error: sampleError } = await supabase
        .from('fact_rural_admin')
        .select('gp_id', { count: 'exact' })
        .limit(1);
      
      if (!sampleError && sampleRural && sampleRural.length === 0) {
        qualityScore = Math.min(qualityScore, 50);
      }
    }

    // Check urban coverage
    if (urbanCount > 0) {
      const { data: sampleUrban, error: sampleError } = await supabase
        .from('fact_urban_admin')
        .select('ward_id', { count: 'exact' })
        .limit(1);
      
      if (!sampleError && sampleUrban && sampleUrban.length === 0) {
        qualityScore = Math.min(qualityScore, 50);
      }
    }

    return NextResponse.json({
      ruralGPs: ruralCount,
      urbanWards: urbanCount,
      totalCoverage: totalCoverage,
      coverage: ruralCount > 0 ? `${ruralCount} GPs` : '-',
      dataQuality: `${qualityScore}%`,
      updated: new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'short' })
    });
  } catch (error) {
    console.error('Error fetching sidebar stats:', error);
    return NextResponse.json({
      coverage: '-',
      urbanWards: '-',
      dataQuality: '-',
      updated: new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'short' })
    }, { status: 500 });
  }
}
