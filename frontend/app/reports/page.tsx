'use client';

import { DISTRICTS } from '@/lib/data';

export default function ReportsPage() {
  const ALWAR_REPORT_PATH = '/reports/alwar-lok-sabha-brief-v2.pdf';

  function openAlwarReport() {
    window.open(ALWAR_REPORT_PATH, '_blank');
  }

  function downloadAlwarReport() {
    const link = document.createElement('a');
    link.href = ALWAR_REPORT_PATH;
    link.download = 'Alwar_Lok_Sabha_Planning_Brief_May2026.pdf';
    link.click();
  }

  return (
    <div>
      <div className="pg-t">Report Library</div>
      <div className="pg-s">3 validated sample reports · generate for any district, GP, or ward in 60 seconds</div>
      
      <div className="rg">
        <div className="rc">
          <div className="rh">
            <div className="rtag">Constituency · Sample</div>
            <div className="rt">Alwar Lok Sabha</div>
          </div>
          <div className="rb">
            <div className="rr">
              <span>Dev Score</span>
              <span>52/100 — Tier 3</span>
            </div>
            <div className="rr">
              <span>Status</span>
              <span>Available</span>
            </div>
          </div>
          <div className="rf">
            <button className="btn btn-o" onClick={openAlwarReport}>Open Report</button>
            <button className="btn btn-ghost" onClick={downloadAlwarReport}>Download</button>
          </div>
        </div>

        <div className="rc">
          <div className="rh">
            <div className="rtag">District Report · Generate</div>
            <div className="rt">Any district</div>
          </div>
          <div className="rb">
            <select className="fs" style={{ width: '100%', marginBottom: '8px' }}>
              <option>Select district...</option>
              {DISTRICTS.map(d => (
                <option key={d.n} value={d.n}>{d.n}</option>
              ))}
            </select>
            <div className="rr">
              <span>Covers</span>
              <span>All 11 sectors</span>
            </div>
          </div>
          <div className="rf">
            <button className="btn btn-ai" style={{ width: '100%', justifyContent: 'center' }}>
              Generate Planning Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
