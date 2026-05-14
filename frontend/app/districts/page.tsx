'use client';

import { useEffect, useState } from 'react';
import { fetchDashboardKpis, getEmptyDashboardPayload, AreaType } from '@/lib/dashboard-kpis';

export default function DistrictsPage() {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('dev');
  const [areaType, setAreaType] = useState<AreaType>('all');
  const [districts, setDistricts] = useState(getEmptyDashboardPayload().districtScores);

  useEffect(() => {
    let alive = true;
    fetchDashboardKpis({ areaType })
      .then((payload) => {
        if (alive && payload?.districtScores?.length) setDistricts(payload.districtScores);
      })
      .catch(() => {
        if (alive) setDistricts(getEmptyDashboardPayload().districtScores);
      });

    return () => {
      alive = false;
    };
  }, [areaType]);

  let filtered = [...districts].filter(d => 
    !search || d.n.toLowerCase().includes(search.toLowerCase())
  );

  filtered.sort((a, b) => {
    const key = sort as keyof typeof a;
    return (b[key] as number) - (a[key] as number);
  });

  return (
    <div>
      <div className="pg-t">All Districts — 11-Sector Intelligence View</div>
      <div className="pg-s">Click header to sort · hover row to see all sector scores</div>
      
      {/* Area Type Filter */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setAreaType('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            areaType === 'all'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          ALL (Rural + Urban)
        </button>
        <button
          onClick={() => setAreaType('rural')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            areaType === 'rural'
              ? 'bg-green-600 text-white shadow-lg'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          Rural Only
        </button>
        <button
          onClick={() => setAreaType('urban')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            areaType === 'urban'
              ? 'bg-orange-600 text-white shadow-lg'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          Urban Only
        </button>
      </div>
      
      <div className="flex gap-2 mb-3 items-center flex-wrap">
        <input 
          type="text"
          className="fs"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '150px' }}
        />
        <span className="chip">{filtered.length} rows</span>
      </div>

      <div className="overflow-x-auto border border-var(--bd) rounded-lg">
        <table className="tbl" style={{ minWidth: '760px' }}>
          <thead>
            <tr>
              <th style={{ width: '96px' }}>District</th>
              <th style={{ width: '38px' }}>Water</th>
              <th style={{ width: '36px' }}>Health</th>
              <th style={{ width: '36px' }}>Agri</th>
              <th style={{ width: '36px' }}>Dairy</th>
              <th style={{ width: '34px' }}>Edu</th>
              <th style={{ width: '38px' }}>Employ</th>
              <th style={{ width: '36px' }}>Women</th>
              <th style={{ width: '40px' }}>Welfare</th>
              <th style={{ width: '36px' }}>Infra</th>
              <th style={{ width: '36px' }}>Tour</th>
              <th style={{ width: '34px' }}>Env</th>
              <th style={{ width: '40px' }}>Score</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(d => (
              <tr key={d.n}>
                <td><span className="tbl-n">{d.n}</span></td>
                <td><span className="pill s">{d.sc_water}</span></td>
                <td><span className="pill w">{d.sc_health}</span></td>
                <td><span className="pill s">{d.sc_agri}</span></td>
                <td><span className="pill s">{d.sc_dairy}</span></td>
                <td><span className="pill s">{d.sc_edu}</span></td>
                <td><span className="pill w">{d.sc_employ}</span></td>
                <td><span className="pill s">{d.sc_women}</span></td>
                <td><span className="pill s">{d.sc_welfare}</span></td>
                <td><span className="pill s">{d.sc_infra}</span></td>
                <td><span className="pill w">{d.sc_tourism}</span></td>
                <td><span className="pill w">{d.sc_env}</span></td>
                <td><span className="pill s" style={{ fontSize: '11px', fontWeight: 800 }}>{d.dev}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
