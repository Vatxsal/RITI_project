"use client"
import React from 'react'
import { useRouter } from 'next/navigation'
import { fetchGPCounts } from '../../lib/supabase'

export default function TopBar() {
  const router = useRouter()
  const [counts, setCounts] = React.useState<{ districts?: number; blocks?: number; gps?: number } | null>(null)
  React.useEffect(()=>{
    // fetch /api/stats
    fetch('/api/stats').then(r=>r.json()).then(d=>{ if(d?.data) setCounts(d.data[0] || d.data) }).catch(()=>{})
  }, [])

  return (
    <div id="fbar" style={{ background: 'var(--nv2)', borderBottom: '1px solid var(--bd)', padding: '0 18px', height: '50px', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
      <span className="fsl" style={{ fontSize: '11px', color: 'var(--t3)', fontWeight: 600, whiteSpace: 'nowrap' }}>District:</span>
      
      <select id="fd" className="fs" style={{ border: '1px solid var(--bd)', borderRadius: '7px', padding: '5px 9px', fontSize: '12px', fontFamily: 'inherit', background: 'var(--sf2)', color: 'var(--t1)', cursor: 'pointer', transition: '.15s' }}>
        <option value="">All Rajasthan (41)</option>
      </select>

      <button className="btn btn-o" style={{ padding: '5px 9px', fontSize: '11px', border: '1px solid var(--bd)', borderRadius: '8px', background: 'var(--sf2)', color: 'var(--t2)', cursor: 'pointer', transition: '.15s' }}>Reset</button>

      <div className="ftog" style={{ display: 'flex', gap: '2px', background: 'var(--nv)', border: '1px solid var(--bd)', borderRadius: '8px', padding: '2px' }}>
        <button className="on" style={{ border: 'none', borderRadius: '6px', padding: '4px 11px', fontSize: '11px', cursor: 'pointer', background: 'var(--or)', color: '#fff', fontFamily: 'inherit', transition: '.15s', fontWeight: 600 }}>All</button>
        <button style={{ border: 'none', borderRadius: '6px', padding: '4px 11px', fontSize: '11px', cursor: 'pointer', background: 'transparent', color: 'var(--t3)', fontFamily: 'inherit', transition: '.15s' }}>Rural</button>
        <button style={{ border: 'none', borderRadius: '6px', padding: '4px 11px', fontSize: '11px', cursor: 'pointer', background: 'transparent', color: 'var(--t3)', fontFamily: 'inherit', transition: '.15s' }}>Urban</button>
      </div>

      <div className="fbr" style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span className="chip hi" style={{ fontSize: '9px', fontFamily: 'monospace', color: 'var(--or)', background: 'rgba(232,92,13,.08)', border: '1px solid rgba(232,92,13,.3)', padding: '3px 8px', borderRadius: '6px' }}>-</span>
        <span className="chip" style={{ fontSize: '9px', fontFamily: 'monospace', color: 'var(--t3)', background: 'var(--sf2)', border: '1px solid var(--bd)', padding: '3px 8px', borderRadius: '6px' }}>-</span>
        <button className="btn btn-ai" style={{ marginLeft: '8px' }} onClick={() => router.push('/ai-chat')}>▀ Ask Planning Intelligence</button>
      </div>
    </div>
  )
}
