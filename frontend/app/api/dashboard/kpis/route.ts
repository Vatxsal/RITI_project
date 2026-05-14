import { NextRequest, NextResponse } from 'next/server';
import { supabase, fetchAll } from '@/lib/supabase';
import { DashboardKpiPayload, formatCrore, formatLakh, formatPct, getEmptyDashboardPayload } from '@/lib/dashboard-kpis';

type AnyRow = Record<string, any>;

type DistrictGroup = {
  name: string;
  gps: AnyRow[];
  wards: AnyRow[];
  ruralAdmin: AnyRow[];
  ruralEdu: AnyRow[];
  ruralLivelihood: AnyRow[];
  ruralHealth: AnyRow[];
  ruralEconomy: AnyRow[];
  ruralSocial: AnyRow[];
  ruralInfra: AnyRow[];
  ruralWater: AnyRow[];
  ruralEnv: AnyRow[];
  ruralTourism: AnyRow[];
  urbanAdmin: AnyRow[];
  urbanEdu: AnyRow[];
  urbanHealth: AnyRow[];
  urbanEconomy: AnyRow[];
  urbanSocial: AnyRow[];
  urbanInfra: AnyRow[];
  urbanWater: AnyRow[];
  urbanEnv: AnyRow[];
  urbanTourism: AnyRow[];
};

type ArrayBucket = Exclude<keyof DistrictGroup, 'name'>;

function toNumber(value: any): number {
  if (value === null || value === undefined || value === '') return 0;
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function sum(values: Array<number | null | undefined>) {
  let total = 0;
  for (const value of values) {
    total += toNumber(value);
  }
  return total;
}

function avg(values: Array<number | null | undefined>) {
  let total = 0;
  let count = 0;
  for (const value of values) {
    const num = toNumber(value);
    if (num === null) continue;
    total += num;
    count += 1;
  }
  return count > 0 ? total / count : null;
}

function ratio(numerator: number | null, denominator: number | null) {
  if (numerator === null || denominator === null || denominator === 0) return null;
  return (numerator * 100) / denominator;
}

function formatMillions(value: number | null) {
  if (value === null) return '-';
  return `${Math.round(value / 1000000)}M+`;
}

function addRows(groups: Map<string, DistrictGroup>, district: string, bucket: ArrayBucket, row: AnyRow) {
  if (!groups.has(district)) {
    groups.set(district, {
      name: district,
      gps: [],
      wards: [],
      ruralAdmin: [],
      ruralEdu: [],
      ruralLivelihood: [],
      ruralHealth: [],
      ruralEconomy: [],
      ruralSocial: [],
      ruralInfra: [],
      ruralWater: [],
      ruralEnv: [],
      ruralTourism: [],
      urbanAdmin: [],
      urbanEdu: [],
      urbanHealth: [],
      urbanEconomy: [],
      urbanSocial: [],
      urbanInfra: [],
      urbanWater: [],
      urbanEnv: [],
      urbanTourism: [],
    });
  }

  groups.get(district)![bucket].push(row);
}

function sectorScores(group: DistrictGroup, areaType: 'all' | 'rural' | 'urban' = 'all') {
  const ruralPop = areaType === 'urban' ? null : sum(group.ruralAdmin.map((r) => r.pop_2026_est));
  const urbanPop = areaType === 'rural' ? null : sum(group.urbanAdmin.map((r) => r.pop_2026_est));
  const totalPop = sum([ruralPop, urbanPop]);
  const femalePop = sum([
    areaType === 'urban' ? null : sum(group.ruralAdmin.map((r) => r.female_pop_2026)),
    areaType === 'rural' ? null : sum(group.urbanAdmin.map((r) => r.female_pop_2026)),
  ]);
  const totalArea = sum([
    areaType === 'urban' ? null : sum(group.ruralAdmin.map((r) => r.total_area_hectare + (r.grazing_land_ha ?? 0))),
    areaType === 'rural' ? null : sum(group.urbanAdmin.map((r) => r.total_area_hectare)),
  ]);
  const pucca = sum([
    areaType === 'urban' ? null : sum(group.ruralAdmin.map((r) => r.pucca_houses_2026)),
    areaType === 'rural' ? null : sum(group.urbanAdmin.map((r) => r.pucca_houses_2026)),
  ]);
  const kutcha = sum([
    areaType === 'urban' ? null : sum(group.ruralAdmin.map((r) => r.kutcha_houses_2026)),
    areaType === 'rural' ? null : sum(group.urbanAdmin.map((r) => r.kutcha_houses_2026)),
  ]);
  const seniorCitizens = sum([
    areaType === 'urban' ? null : sum(group.ruralAdmin.map((r) => r.senior_citizens_2026)),
    areaType === 'rural' ? null : sum(group.urbanAdmin.map((r) => r.senior_citizens_2026)),
  ]);
  const pwdPop = sum([
    areaType === 'urban' ? null : sum(group.ruralAdmin.map((r) => r.pwd_pop_2026 ?? 0)),
    areaType === 'rural' ? null : sum(group.urbanAdmin.map((r) => r.pwd_pop_2026 ?? 0)),
  ]);
  const totalFamilies = sum([
    areaType === 'urban' ? null : sum(group.ruralAdmin.map((r) => r.total_families_2026 ?? 0)),
    areaType === 'rural' ? null : sum(group.urbanAdmin.map((r) => r.total_families_2026 ?? 0)),
  ]);

  const water = avg([
    areaType === 'urban' ? null : avg(group.ruralWater.map((r) => r.tap_connection_pct)),
    areaType === 'rural' ? null : avg(group.urbanWater.map((r) => r.tap_connection_pct)),
  ]);
  const healthCenters = sum([
    areaType === 'urban' ? null : sum(group.ruralHealth.map((r) => (r.allopathic_centers ?? 0) + (r.ayush_centers ?? 0) + (r.private_health_centers ?? 0))),
    areaType === 'rural' ? null : sum(group.urbanHealth.map((r) => (r.allopathic_centers ?? 0) + (r.ayush_centers ?? 0) + (r.private_health_centers ?? 0))),
  ]);
  const health = totalPop && totalPop > 0 ? Math.min((healthCenters / totalPop) * 10000, 100) : null;
  const irrigated = areaType === 'urban' ? null : sum(group.ruralLivelihood.map((r) => r.irrigated_area_hectare));
  const cultivable = areaType === 'urban' ? null : sum(group.ruralLivelihood.map((r) => r.cultivable_land_hectare));
  const agri = ratio(irrigated, cultivable);
  const dairy = areaType === 'urban' ? null : ratio(
    sum(group.ruralLivelihood.map((r) => r.milch_animals_count)),
    sum(group.ruralLivelihood.map((r) => r.total_livestock_count))
  );
  const enrolled = sum([
    areaType === 'urban' ? null : sum(group.ruralEdu.map((r) => r.total_enrolled_students)),
    areaType === 'rural' ? null : sum(group.urbanEdu.map((r) => r.total_enrolled_students)),
  ]);
  const children = sum([
    areaType === 'urban' ? null : sum(group.ruralAdmin.map((r) => (r.children_6_14_2026 ?? 0) + (r.pop_14_18_2026 ?? 0))),
    areaType === 'rural' ? null : sum(group.urbanAdmin.map((r) => (r.children_6_14_2026 ?? 0) + (r.pop_14_18_2026 ?? 0))),
  ]);
  const edu = ratio(enrolled, children);
  const activeShg = sum([
    areaType === 'urban' ? null : sum(group.ruralEconomy.map((r) => r.active_shg_count)),
    areaType === 'rural' ? null : sum(group.urbanEconomy.map((r) => r.active_shg_count)),
  ]);
  const employ = ratio(activeShg, totalFamilies);
  const women = ratio(
    sum([
      areaType === 'urban' ? null : sum(group.ruralEconomy.map((r) => r.women_in_shgs)),
      areaType === 'rural' ? null : sum(group.urbanEconomy.map((r) => r.women_in_shgs)),
    ]),
    femalePop
  );
  const welfare = ratio(
    sum([
      areaType === 'urban' ? null : sum(group.ruralSocial.map((r) => (r.old_age_pensioners ?? 0) + (r.widow_pensioners ?? 0) + (r.pwd_pensioners_est ?? 0))),
      areaType === 'rural' ? null : sum(group.urbanSocial.map((r) => (r.old_age_pensioners ?? 0) + (r.widow_pensioners ?? 0) + (r.pwd_pensioners_est ?? 0))),
    ]),
    seniorCitizens + pwdPop
  );
  const infra = ratio(
    sum([
      areaType === 'urban' ? null : sum(group.ruralInfra.map((r) => r.houses_with_electricity)),
      areaType === 'rural' ? null : sum(group.urbanInfra.map((r) => r.houses_with_electricity)),
    ]),
    pucca !== null && kutcha !== null ? pucca + kutcha : null
  );
  const tourismFootfall = sum([
    areaType === 'urban' ? null : sum(group.ruralTourism.map((r) => (r.avg_daily_footfall_cultural_sites ?? 0) * 365)),
    areaType === 'rural' ? null : sum(group.urbanTourism.map((r) => (r.avg_fair_footfall_daily ?? 0))),
  ]);
  const tourism = ratio(tourismFootfall, totalPop);
  
  const forestArea = areaType === 'urban' ? null : sum(group.ruralEnv.map((r) => r.forest_area_hectare ?? 0));
  const grazingArea = areaType === 'urban' ? null : sum(group.ruralEnv.map((r) => r.grazing_land_ha ?? 0));
  const envDenom = forestArea !== null && grazingArea !== null ? forestArea + grazingArea : null;
  const env = ratio(forestArea, envDenom);
  
  // New metrics: KCC coverage, Solar adoption, Dropout rate
  const kccHolders = areaType === 'urban' ? null : sum(group.ruralEconomy.map((r) => r.kcc_holders_count ?? 0));
  const totalFarmers = areaType === 'urban' ? null : sum(group.ruralEconomy.map((r) => r.total_farmers_count ?? 0));
  const kccCoverage = ratio(kccHolders, totalFarmers);
  
  const solarHouses = areaType === 'urban' ? null : sum(group.ruralInfra.map((r) => r.solar_installed_houses ?? 0));
  const totalHouses = pucca + kutcha;
  const solarAdoption = ratio(solarHouses, totalHouses);
  
  const dropoutChildren = sum([
    areaType === 'urban' ? null : sum(group.ruralEdu.map((r) => r.dropout_children_prev_year ?? 0)),
    areaType === 'rural' ? null : sum(group.urbanEdu.map((r) => r.dropout_children_prev_year ?? 0)),
  ]);
  const dropoutRate = enrolled && enrolled > 0 ? (dropoutChildren / enrolled) * 100 : null;

  const sectorList = [water, health, agri, dairy, edu, employ, women, welfare, infra, tourism, env, kccCoverage, solarAdoption]
    .filter((v) => v !== null)
    .map((value) => Math.max(0, Math.min(100, value ?? 0)));

  const dev = sectorList.length ? Math.round(sectorList.reduce((acc, value) => acc + value, 0) / sectorList.length) : 0;

  return {
    sc_water: Math.round(water ?? 0),
    sc_health: Math.round(health ?? 0),
    sc_agri: Math.round(agri ?? 0),
    sc_dairy: Math.round(dairy ?? 0),
    sc_edu: Math.round(edu ?? 0),
    sc_employ: Math.round(employ ?? 0),
    sc_women: Math.round(women ?? 0),
    sc_welfare: Math.round(welfare ?? 0),
    sc_infra: Math.round(infra ?? 0),
    sc_tourism: Math.round(tourism ?? 0),
    sc_env: Math.round(env ?? 0),
    sc_kcc: Math.round(kccCoverage ?? 0),
    sc_solar: Math.round(solarAdoption ?? 0),
    dev,
    pop: (sum([ruralPop, urbanPop]) ?? 0) / 100000,
    gps: group.gps.length + group.wards.length,
    blks: 0,
    lat: 0,
    lon: 0,
    totalPop,
    dropoutRate: dropoutRate ?? null,
  };
}

function buildPayload(groups: Map<string, DistrictGroup>, areaType: 'all' | 'rural' | 'urban' = 'all'): DashboardKpiPayload {
  // Helper to filter groups based on areaType and get the right data arrays
  const getFilteredData = <T,>(mapper: (g: DistrictGroup) => T[]) => {
    return Array.from(groups.values()).flatMap((group) => {
      if (areaType === 'rural') return mapper({ ...group, urbanAdmin: [], urbanEdu: [], urbanHealth: [], urbanEconomy: [], urbanSocial: [], urbanInfra: [], urbanWater: [], urbanEnv: [], urbanTourism: [] } as DistrictGroup);
      if (areaType === 'urban') return mapper({ ...group, ruralAdmin: [], ruralEdu: [], ruralLivelihood: [], ruralHealth: [], ruralEconomy: [], ruralSocial: [], ruralInfra: [], ruralWater: [], ruralEnv: [], ruralTourism: [] } as DistrictGroup);
      return mapper(group);
    });
  };

  // Debug: Check what data is in groups
  const firstGroup = groups.values().next().value;
  if (firstGroup) {
    console.log('DEBUG: First group data sample');
    console.log('ruralWater count:', firstGroup.ruralWater.length, 'first:', firstGroup.ruralWater[0]?.tap_connection_pct);
    console.log('ruralEconomy count:', firstGroup.ruralEconomy.length, 'first:', firstGroup.ruralEconomy[0]?.lakhpati_didis_count);
    console.log('ruralLivelihood count:', firstGroup.ruralLivelihood.length, 'first:', firstGroup.ruralLivelihood[0]?.irrigated_area_hectare);
    console.log('urbanWater count:', firstGroup.urbanWater.length, 'first:', firstGroup.urbanWater[0]?.tap_connection_pct);
  }

  const districts = Array.from(groups.values()).map((group) => {
    const scores = sectorScores(group, areaType);
    return {
      n: group.name,
      ...scores,
    };
  }).sort((a, b) => b.dev - a.dev);

  const allRuralGps = areaType === 'urban' ? 0 : Array.from(groups.values()).reduce((acc, group) => acc + group.gps.length, 0);
  const allUrbanWards = areaType === 'rural' ? 0 : Array.from(groups.values()).reduce((acc, group) => acc + group.wards.length, 0);
  const totalDistricts = districts.length || null;
  const totalPop = districts.reduce((acc, row) => acc + ((row.totalPop ?? 0) as number), 0);

  const ruralWaterPct = areaType === 'urban' ? null : avg(Array.from(groups.values()).flatMap((group) => group.ruralWater.map((r) => r.tap_connection_pct)));
  const urbanWaterPct = areaType === 'rural' ? null : avg(Array.from(groups.values()).flatMap((group) => group.urbanWater.map((r) => r.tap_connection_pct)));
  const irrigatedHa = areaType === 'urban' ? null : sum(Array.from(groups.values()).flatMap((group) => group.ruralLivelihood.map((r) => r.irrigated_area_hectare)));
  const cultivableHa = areaType === 'urban' ? null : sum(Array.from(groups.values()).flatMap((group) => group.ruralLivelihood.map((r) => r.cultivable_land_hectare)));
  const dailyMilk = areaType === 'urban' ? null : sum(Array.from(groups.values()).flatMap((group) => group.ruralLivelihood.map((r) => r.daily_milk_prod_litres)));
  const lakhpati = areaType === 'urban' ? null : sum(Array.from(groups.values()).flatMap((group) => group.ruralEconomy.map((r) => r.lakhpati_didis_count)));
  // NOTE: women_in_shgs only exists in rural tables (urban doesn't have this column)
  const shgWomen = areaType === 'urban' ? null : sum(Array.from(groups.values()).flatMap((group) => group.ruralEconomy.map((r) => r.women_in_shgs)));
  const widow = sum(getFilteredData((group) => [
    ...group.ruralSocial.map((r) => r.widow_pensioners),
    ...group.urbanSocial.map((r) => r.widow_pensioners),
  ]));
  const ayushman = sum(getFilteredData((group) => [
    ...group.ruralHealth.map((r) => r.ayushman_arogya_beneficiaries),
    ...group.urbanHealth.map((r) => r.ayushman_arogya_beneficiaries),
  ]));
  const urbanFhtc = areaType === 'rural' ? null : avg(Array.from(groups.values()).flatMap((group) => group.urbanWater.map((r) => r.tap_connection_pct)));
  const tourism = sum(getFilteredData((group) => [
    ...group.ruralTourism.map((r) => r.avg_daily_footfall_cultural_sites),
    ...group.urbanTourism.map((r) => r.avg_fair_footfall_daily),
  ]));
  // NOTE: forest area only exists in rural tables (urban environment table has NO forest data)
  const forest = areaType === 'urban' ? null : sum(Array.from(groups.values()).flatMap((group) => [
    ...group.ruralEnv.map((r) => r.forest_area_hectare),
  ]));
  const totalArea = sum(getFilteredData((group) => [
    ...group.ruralAdmin.map((r) => r.total_area_hectare),
    ...group.urbanAdmin.map((r) => r.total_area_hectare),
  ]));
  const femalePop = sum(getFilteredData((group) => [
    ...group.ruralAdmin.map((r) => r.female_pop_2026),
    ...group.urbanAdmin.map((r) => r.female_pop_2026),
  ]));
  const popup = sum(Array.from(groups.values()).flatMap((group) => [
    ...group.ruralAdmin.map((r) => r.pop_2026_est),
    ...group.urbanAdmin.map((r) => r.pop_2026_est),
  ]));

  const awcWorkers = sum(Array.from(groups.values()).flatMap((group) => [
    ...group.ruralEdu.map((r) => r.anganwadi_workers),
    ...group.urbanEdu.map((r) => r.anganwadi_workers),
  ]));
  const enrolledChildren = sum(Array.from(groups.values()).flatMap((group) => [
    ...group.ruralEdu.map((r) => r.anganwadi_enrolled_children),
    ...group.urbanEdu.map((r) => r.anganwadi_enrolled_children),
  ]));
  const ashaWorkers = sum(Array.from(groups.values()).flatMap((group) => [
    ...group.ruralEdu.map((r) => r.asha_sahyogini_count),
    ...group.urbanEdu.map((r) => r.asha_sahyogini_count),
  ]));
  const awcScore = awcWorkers && enrolledChildren ? Math.min((awcWorkers / (enrolledChildren / 40)) * 100, 100) : null;
  const ashaScore = ashaWorkers && popup ? Math.min((ashaWorkers / (popup / 1000)) * 100, 100) : null;
  const eduScore = awcScore !== null && ashaScore !== null ? Math.round((awcScore + ashaScore) / 2) : null;
  const irrigationPct = irrigatedHa && cultivableHa ? Math.round((irrigatedHa * 1000) / cultivableHa) / 10 : null;
  const dairyPotential = dailyMilk ? dailyMilk * 365 * 35 : null;
  const puccaHouses = sum(Array.from(groups.values()).flatMap((group) => [
    ...group.ruralAdmin.map((r) => r.pucca_houses_2026),
    ...group.urbanAdmin.map((r) => r.pucca_houses_2026),
  ]));
  const kutchaHouses = sum(Array.from(groups.values()).flatMap((group) => [
    ...group.ruralAdmin.map((r) => r.kutcha_houses_2026),
    ...group.urbanAdmin.map((r) => r.kutcha_houses_2026),
  ]));
  const puccaPct = puccaHouses !== null && kutchaHouses !== null && puccaHouses + kutchaHouses > 0
    ? Math.round((puccaHouses * 1000) / (puccaHouses + kutchaHouses)) / 10
    : null;

  return {
    topKPIs: [
      {
        label: 'Water Coverage',
        value: ruralWaterPct !== null || urbanWaterPct !== null
          ? `${ruralWaterPct !== null ? formatPct(ruralWaterPct) : 'N/A'} R / ${urbanWaterPct !== null ? formatPct(urbanWaterPct) : 'N/A'} U`
          : '-',
        status: 'Rural FHTC / Urban FHTC',
        colorKey: 'tl',
        fill: Math.round((ruralWaterPct ?? urbanWaterPct ?? 0)),
      },
      {
        label: 'Irrigation',
        value: irrigationPct === null ? '-' : formatPct(irrigationPct),
        status: 'Agri land under irrigation',
        colorKey: 'gn',
        fill: Math.round(irrigationPct ?? 0),
      },
      {
        label: 'Dairy Potential',
        value: dairyPotential === null ? '-' : formatCrore(dairyPotential),
        status: 'At SARAS Rs 50/litre/yr',
        colorKey: 's',
        fill: Math.min(Math.round(((dairyPotential ?? 0) / 10000000) / 100), 100),
      },
      {
        label: 'Livelihoods',
        value: lakhpati !== null || shgWomen !== null
          ? `${lakhpati !== null ? formatLakh(lakhpati) : 'N/A'} / ${shgWomen !== null ? formatLakh(shgWomen, true) : 'N/A'}`
          : '-',
        status: 'Lakhpati Didi / SHG Women (Rural)',
        colorKey: 'pu',
        fill: Math.min(Math.round(((lakhpati ?? 0) / 10000)), 100),
      },
      {
        label: 'Veer Nari Welfare',
        value: widow !== null ? formatLakh(widow) : '-',
        status: 'Widow pension recipients',
        colorKey: 'pk',
        fill: Math.min(Math.round((widow ?? 0) / 10000), 100),
      },
      {
        label: 'CM Ayushman',
        value: ayushman !== null ? formatLakh(ayushman) : '-',
        status: 'Beneficiaries registered',
        colorKey: 's',
        fill: Math.min(Math.round((ayushman ?? 0) / 10000), 100),
      },
      {
        label: 'Urban Infrastructure',
        value: urbanFhtc !== null && allUrbanWards > 0 ? `${formatPct(urbanFhtc)} / ${allUrbanWards.toLocaleString('en-IN')}` : '-',
        status: 'Urban FHTC / Total wards',
        colorKey: 'bl',
        fill: Math.round(urbanFhtc ?? 0),
      },
      {
        label: 'Tourism & Heritage',
        value: tourism !== null && tourism > 0 ? formatMillions(tourism) : '-',
        status: 'Visitors/yr statewide',
        colorKey: 'tl',
        fill: Math.min(Math.round(((tourism ?? 0) * 365) / 1000000 / 10), 100),
      },
      {
        label: 'Environment',
        value: forest !== null && totalArea !== null && totalArea > 0 ? `${formatPct((forest * 100) / totalArea)} FC` : '-',
        status: 'Forest cover | 8 arid districts',
        colorKey: 'gn',
        fill: Math.round(((forest ?? 0) * 100) / (totalArea ?? 1)),
      },
      // NOTE: Education & Nutrition KPIs excluded because fact_rural_education & fact_urban_education are empty
      // {
      //   label: 'Nutrition (SAM)',
      //   value: formatLakh(samChildren),
      //   status: 'Children eligible for POSHAN',
      //   colorKey: 'w',
      //   fill: Math.min(Math.round((samChildren ?? 0) / 10000), 100),
      // },
      // {
      //   label: 'Education',
      //   value: eduScore === null ? '-' : `~ ${eduScore} / 100`,
      //   status: 'AWC + ASHA coverage proxy',
      //   colorKey: 'bl',
      //   fill: eduScore ?? 0,
      // },
    ],
    radarScores: districtsToRadar(districts),
    districtScores: districts,
    dataCoverage: [
      ['Rural GPs', `${allRuralGps.toLocaleString('en-IN')} loaded`],
      ['Urban wards', `${allUrbanWards.toLocaleString('en-IN')} loaded`],
      ['Districts', totalDistricts ? `${totalDistricts.toLocaleString('en-IN')} loaded` : '-'],
      ['Rural pop', totalPop ? `${(totalPop / 10000000).toFixed(2)} Cr` : '-'],
      ['Female pop', femalePop ? `${(femalePop / 1000000).toFixed(2)} L` : '-'],
      ['Data rows', `${groups.size.toLocaleString('en-IN')} district groups`],
      ['Status', 'Education tables pending data load'],
    ],
    source: 'live',
    lastUpdated: new Date().toISOString(),
  };
}

function districtsToRadar(districts: Array<any>) {
  const scores = districts.reduce((acc, district) => {
    acc.water += district.sc_water ?? 0;
    acc.health += district.sc_health ?? 0;
    acc.agri += district.sc_agri ?? 0;
    acc.dairy += district.sc_dairy ?? 0;
    acc.edu += district.sc_edu ?? 0;
    acc.employ += district.sc_employ ?? 0;
    acc.women += district.sc_women ?? 0;
    acc.welfare += district.sc_welfare ?? 0;
    acc.infra += district.sc_infra ?? 0;
    acc.tourism += district.sc_tourism ?? 0;
    acc.env += district.sc_env ?? 0;
    return acc;
  }, { water: 0, health: 0, agri: 0, dairy: 0, edu: 0, employ: 0, women: 0, welfare: 0, infra: 0, tourism: 0, env: 0 });

  const count = Math.max(districts.length, 1);
  return Object.fromEntries(Object.entries(scores).map(([key, value]) => [key, Math.round((value as number) / count)])) as Record<string, number>;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const districtFilter = searchParams.get('district');
    const areaType = (searchParams.get('areaType') ?? 'all') as 'all' | 'rural' | 'urban';

    // 1. Database Cache Check
    const cacheKey = districtFilter 
      ? `district_${districtFilter.replace(/\s+/g, '_')}_${areaType}`
      : `state_${areaType}`;

    try {
      const { data: cachedRow, error: cacheErr } = await supabase
        .from('cache_dashboard_kpis')
        .select('kpi_data')
        .eq('cache_key', cacheKey)
        .single();

      if (!cacheErr && cachedRow && cachedRow.kpi_data && Object.keys(cachedRow.kpi_data).length > 0) {
        console.log(`[CACHE HIT] Serving dashboard from cache_dashboard_kpis for key: ${cacheKey}`);
        const payload = cachedRow.kpi_data as any;
        payload.source = 'cache'; // Flag for UI debug if needed
        return NextResponse.json(payload);
      }
    } catch (cErr) {
      console.warn('Cache check failed, falling back to live query', cErr);
    }

    console.log(`[CACHE MISS] Querying live tables concurrently for key: ${cacheKey}...`);

    // Load only needed datasets depending on `areaType`
    let ruralDimsRes: AnyRow[] = [];
    let ruralAdminRes: AnyRow[] = [];
    let ruralEduRes: AnyRow[] = [];
    let ruralLivRes: AnyRow[] = [];
    let ruralHealthRes: AnyRow[] = [];
    let ruralEcoRes: AnyRow[] = [];
    let ruralSocialRes: AnyRow[] = [];
    let ruralInfraRes: AnyRow[] = [];
    let ruralWaterRes: AnyRow[] = [];
    let ruralEnvRes: AnyRow[] = [];
    let ruralTourRes: AnyRow[] = [];

    let urbanDimsRes: AnyRow[] = [];
    let urbanAdminRes: AnyRow[] = [];
    let urbanEduRes: AnyRow[] = [];
    let urbanHealthRes: AnyRow[] = [];
    let urbanEcoRes: AnyRow[] = [];
    let urbanSocialRes: AnyRow[] = [];
    let urbanInfraRes: AnyRow[] = [];
    let urbanWaterRes: AnyRow[] = [];
    let urbanEnvRes: AnyRow[] = [];
    let urbanTourRes: AnyRow[] = [];

    try {
      // 2. Create parallel promises for maximum speed
      const ruralPromises = areaType !== 'urban' ? [
        fetchAll('dim_rural_gps', {}, 'gp_id, district, block, gram_panchayat'),
        fetchAll('fact_rural_admin'),
        fetchAll('fact_rural_education'),
        fetchAll('fact_rural_livelihood'),
        fetchAll('fact_rural_health'),
        fetchAll('fact_rural_economy'),
        fetchAll('fact_rural_social'),
        fetchAll('fact_rural_infra'),
        fetchAll('fact_rural_water'),
        fetchAll('fact_rural_environment'),
        fetchAll('fact_rural_tourism'),
      ] : [];

      const urbanPromises = areaType !== 'rural' ? [
        fetchAll('dim_urban_wards', {}, 'ward_id, district, ulb, ward'),
        fetchAll('fact_urban_admin'),
        fetchAll('fact_urban_education'),
        fetchAll('fact_urban_health'),
        fetchAll('fact_urban_economy'),
        fetchAll('fact_urban_social'),
        fetchAll('fact_urban_infra'),
        fetchAll('fact_urban_water'),
        fetchAll('fact_urban_environment'),
        fetchAll('fact_urban_tourism'),
      ] : [];

      const allResults = await Promise.all([...ruralPromises, ...urbanPromises]);

      let rIdx = 0;
      if (areaType !== 'urban') {
        ruralDimsRes = allResults[rIdx++];
        ruralAdminRes = allResults[rIdx++];
        ruralEduRes = allResults[rIdx++];
        ruralLivRes = allResults[rIdx++];
        ruralHealthRes = allResults[rIdx++];
        ruralEcoRes = allResults[rIdx++];
        ruralSocialRes = allResults[rIdx++];
        ruralInfraRes = allResults[rIdx++];
        ruralWaterRes = allResults[rIdx++];
        ruralEnvRes = allResults[rIdx++];
        ruralTourRes = allResults[rIdx++];
      }

      if (areaType !== 'rural') {
        urbanDimsRes = allResults[rIdx++];
        urbanAdminRes = allResults[rIdx++];
        urbanEduRes = allResults[rIdx++];
        urbanHealthRes = allResults[rIdx++];
        urbanEcoRes = allResults[rIdx++];
        urbanSocialRes = allResults[rIdx++];
        urbanInfraRes = allResults[rIdx++];
        urbanWaterRes = allResults[rIdx++];
        urbanEnvRes = allResults[rIdx++];
        urbanTourRes = allResults[rIdx++];
      }
    } catch (err) {
      console.error('Error fetching data concurrently via fetchAll', err);
      return NextResponse.json(getEmptyDashboardPayload(), { status: 200 });
    }

    const groups = new Map<string, DistrictGroup>();
    const ruralDims = ruralDimsRes ?? [];
    const urbanDims = urbanDimsRes ?? [];

    const ruralAdminMap = new Map((ruralAdminRes as AnyRow[] ?? []).map((row: AnyRow) => [row.gp_id, row]));
    const ruralEduMap = new Map((ruralEduRes as AnyRow[] ?? []).map((row: AnyRow) => [row.gp_id, row]));
    const ruralLivMap = new Map((ruralLivRes as AnyRow[] ?? []).map((row: AnyRow) => [row.gp_id, row]));
    const ruralHealthMap = new Map((ruralHealthRes as AnyRow[] ?? []).map((row: AnyRow) => [row.gp_id, row]));
    const ruralEcoMap = new Map((ruralEcoRes as AnyRow[] ?? []).map((row: AnyRow) => [row.gp_id, row]));
    const ruralSocialMap = new Map((ruralSocialRes as AnyRow[] ?? []).map((row: AnyRow) => [row.gp_id, row]));
    const ruralInfraMap = new Map((ruralInfraRes as AnyRow[] ?? []).map((row: AnyRow) => [row.gp_id, row]));
    const ruralWaterMap = new Map((ruralWaterRes as AnyRow[] ?? []).map((row: AnyRow) => [row.gp_id, row]));
    const ruralEnvMap = new Map((ruralEnvRes as AnyRow[] ?? []).map((row: AnyRow) => [row.gp_id, row]));
    const ruralTourMap = new Map((ruralTourRes as AnyRow[] ?? []).map((row: AnyRow) => [row.gp_id, row]));

    const urbanAdminMap = new Map((urbanAdminRes as AnyRow[] ?? []).map((row: AnyRow) => [row.ward_id, row]));
    const urbanEduMap = new Map((urbanEduRes as AnyRow[] ?? []).map((row: AnyRow) => [row.ward_id, row]));
    const urbanHealthMap = new Map((urbanHealthRes as AnyRow[] ?? []).map((row: AnyRow) => [row.ward_id, row]));
    const urbanEcoMap = new Map((urbanEcoRes as AnyRow[] ?? []).map((row: AnyRow) => [row.ward_id, row]));
    const urbanSocialMap = new Map((urbanSocialRes as AnyRow[] ?? []).map((row: AnyRow) => [row.ward_id, row]));
    const urbanInfraMap = new Map((urbanInfraRes as AnyRow[] ?? []).map((row: AnyRow) => [row.ward_id, row]));
    const urbanWaterMap = new Map((urbanWaterRes as AnyRow[] ?? []).map((row: AnyRow) => [row.ward_id, row]));
    const urbanEnvMap = new Map((urbanEnvRes as AnyRow[] ?? []).map((row: AnyRow) => [row.ward_id, row]));
    const urbanTourMap = new Map((urbanTourRes as AnyRow[] ?? []).map((row: AnyRow) => [row.ward_id, row]));

    ruralDims.forEach((row: AnyRow) => {
      if (districtFilter && row.district !== districtFilter) return;
      addRows(groups, row.district, 'gps', row);
      const group = groups.get(row.district)!;
      const id = row.gp_id;
      if (!id) return;
      const admin = ruralAdminMap.get(id);
      const edu = ruralEduMap.get(id);
      const liv = ruralLivMap.get(id);
      const health = ruralHealthMap.get(id);
      const eco = ruralEcoMap.get(id);
      const social = ruralSocialMap.get(id);
      const infra = ruralInfraMap.get(id);
      const water = ruralWaterMap.get(id);
      const env = ruralEnvMap.get(id);
      const tour = ruralTourMap.get(id);
      if (admin) group.ruralAdmin.push(admin);
      if (edu) group.ruralEdu.push(edu);
      if (liv) group.ruralLivelihood.push(liv);
      if (health) group.ruralHealth.push(health);
      if (eco) group.ruralEconomy.push(eco);
      if (social) group.ruralSocial.push(social);
      if (infra) group.ruralInfra.push(infra);
      if (water) group.ruralWater.push(water);
      if (env) group.ruralEnv.push(env);
      if (tour) group.ruralTourism.push(tour);
    });

    urbanDims.forEach((row: AnyRow) => {
      if (districtFilter && row.district !== districtFilter) return;
      addRows(groups, row.district, 'wards', row);
      const group = groups.get(row.district)!;
      const id = row.ward_id;
      if (!id) return;
      const admin = urbanAdminMap.get(id);
      const edu = urbanEduMap.get(id);
      const health = urbanHealthMap.get(id);
      const eco = urbanEcoMap.get(id);
      const social = urbanSocialMap.get(id);
      const infra = urbanInfraMap.get(id);
      const water = urbanWaterMap.get(id);
      const env = urbanEnvMap.get(id);
      const tour = urbanTourMap.get(id);
      if (admin) group.urbanAdmin.push(admin);
      if (edu) group.urbanEdu.push(edu);
      if (health) group.urbanHealth.push(health);
      if (eco) group.urbanEconomy.push(eco);
      if (social) group.urbanSocial.push(social);
      if (infra) group.urbanInfra.push(infra);
      if (water) group.urbanWater.push(water);
      if (env) group.urbanEnv.push(env);
      if (tour) group.urbanTourism.push(tour);
    });

    const payload = buildPayload(groups, areaType);
    
    // 3. Store payload in Cache for subsequent rapid loads
    try {
      console.log(`[CACHE UPDATE] Storing new result in cache_dashboard_kpis for key: ${cacheKey}`);
      await supabase.from('cache_dashboard_kpis').upsert({
        cache_key: cacheKey,
        district: districtFilter || null,
        area_type: areaType,
        kpi_data: payload,
        computed_at: new Date().toISOString()
      });
    } catch (cacheErr) {
      console.warn(`[CACHE WARNING] Failed to write cache for key: ${cacheKey}`, cacheErr);
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error('[CRITICAL] API internal error:', error);
    return NextResponse.json(getEmptyDashboardPayload(), { status: 200 });
  }
}
