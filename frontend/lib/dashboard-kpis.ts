export type AreaType = 'all' | 'rural' | 'urban';

export type DistrictScoreRow = {
  n: string;
  dev: number;
  gps: number;
  blks: number;
  pop: number;
  lat: number;
  lon: number;
  sc_water: number;
  sc_health: number;
  sc_agri: number;
  sc_dairy: number;
  sc_edu: number;
  sc_employ: number;
  sc_women: number;
  sc_welfare: number;
  sc_infra: number;
  sc_tourism: number;
  sc_env: number;
};

export type DashboardKpiPayload = {
  topKPIs: Array<{ label: string; value: string; status: string; colorKey: 's' | 'w' | 'd' | 'bl' | 'tl' | 'pu' | 'pk' | 'gn'; fill: number }>;
  radarScores: Record<string, number>;
  districtScores: DistrictScoreRow[];
  dataCoverage: Array<[string, string]>;
  lastUpdated?: string | null;
  source?: 'cache' | 'fallback' | 'live';
};

export type DashboardFilter = {
  district?: string | null;
  areaType?: AreaType;
};

export function formatLakh(value: number | null | undefined, plus = false) {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  const suffix = plus ? 'L+' : 'L';
  return `${(value / 100000).toFixed(1)}${suffix}`;
}

export function formatCrore(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  if (value >= 100000000) return `${Math.round(value / 10000000 / 1000)}K Cr`;
  return `${(value / 10000000).toFixed(1)} Cr`;
}

export function formatPct(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  return `${value.toFixed(digits)}%`;
}

export function getEmptyDashboardPayload(): DashboardKpiPayload {
  return {
    topKPIs: [
      { label: 'Water Coverage', value: '-', status: 'Rural FHTC / Urban FHTC', colorKey: 'tl', fill: 0 },
      { label: 'Irrigation', value: '-', status: 'Agri land under irrigation', colorKey: 'gn', fill: 0 },
      { label: 'Dairy Potential', value: '-', status: 'At SARAS Rs 50/litre/yr', colorKey: 's', fill: 0 },
      { label: 'Livelihoods', value: '-', status: 'Lakhpati Didi / SHG Women', colorKey: 'pu', fill: 0 },
      { label: 'Veer Nari Welfare', value: '-', status: 'Widow pension recipients', colorKey: 'pk', fill: 0 },
      { label: 'CM Ayushman', value: '-', status: 'Beneficiaries registered', colorKey: 's', fill: 0 },
      { label: 'Urban Infrastructure', value: '-', status: 'Urban FHTC / Total wards', colorKey: 'bl', fill: 0 },
      { label: 'Tourism & Heritage', value: '-', status: 'Visitors/yr statewide', colorKey: 'tl', fill: 0 },
      { label: 'Environment', value: '-', status: 'Forest cover | 8 arid districts', colorKey: 'gn', fill: 0 },
    ],
    radarScores: {
      water: 0,
      health: 0,
      agri: 0,
      dairy: 0,
      edu: 0,
      employ: 0,
      women: 0,
      welfare: 0,
      infra: 0,
      tourism: 0,
      env: 0,
    },
    districtScores: [],
    dataCoverage: [],
    source: 'fallback',
    lastUpdated: null,
  };
}

export async function fetchDashboardKpis(filter: DashboardFilter = {}) {
  const params = new URLSearchParams();
  if (filter.district) params.set('district', filter.district);
  if (filter.areaType) params.set('areaType', filter.areaType);

  const response = await fetch(`/api/dashboard/kpis${params.toString() ? `?${params.toString()}` : ''}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    return getEmptyDashboardPayload();
  }

  return (await response.json()) as DashboardKpiPayload;
}