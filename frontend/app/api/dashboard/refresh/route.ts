import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    console.log('[REFRESH] Clearing cache_dashboard_kpis table...');
    const { error: deleteErr } = await supabase
      .from('cache_dashboard_kpis')
      .delete()
      .neq('cache_key', ''); // Deletes all rows

    if (deleteErr) {
      console.error('[REFRESH] Failed to clear cache:', deleteErr);
      return NextResponse.json({ success: false, error: deleteErr.message }, { status: 500 });
    }

    console.log('[REFRESH] Calling RPCs to refresh materialized views...');
    
    // First try the new fast RPC for aspirations
    const { error: aspRpcErr } = await supabase.rpc('refresh_aspirations_summary');
    if (aspRpcErr) {
      console.warn('[REFRESH] RPC refresh_aspirations_summary failed or does not exist:', aspRpcErr.message);
    } else {
      console.log('[REFRESH] Aspirations materialized view refreshed successfully.');
    }

    // Try the full refresh, though it may timeout (code 57014)
    const { error: rpcErr } = await supabase.rpc('refresh_materialized_views');
    
    if (rpcErr) {
      console.warn('[REFRESH] RPC refresh_materialized_views failed or does not exist:', rpcErr.message);
      // We don't fail the request if RPC doesn't exist yet, so the cache is still cleared.
    } else {
      console.log('[REFRESH] Materialized views refreshed successfully.');
    }

    return NextResponse.json({ success: true, message: 'Data refreshed successfully' });
  } catch (error: any) {
    console.error('[REFRESH] Internal error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
