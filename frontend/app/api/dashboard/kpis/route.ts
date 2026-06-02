import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { DashboardKpiPayload, formatCrore, formatLakh, formatPct, getEmptyDashboardPayload } from '@/lib/dashboard-kpis';

type AnyRow = Record<string, any>;

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

function buildPayload(ruralRows: AnyRow[], urbanRows: AnyRow[], areaType: 'all' | 'rural' | 'urban'): DashboardKpiPayload {
  const allDistricts = Array.from(new Set([...ruralRows.map(r => r.district), ...urbanRows.map(r => r.district)])).filter(Boolean);

  const districts = allDistricts.map(district => {
    const r = ruralRows.find(row => row.district === district) || {};
    const u = urbanRows.find(row => row.district === district) || {};

    const ruralPop = areaType === 'urban' ? null : toNumber(r.total_pop);
    const urbanPop = areaType === 'rural' ? null : toNumber(u.total_pop);
    const totalPop = sum([ruralPop, urbanPop]);
    const femalePop = sum([
      areaType === 'urban' ? null : toNumber(r.female_pop),
      areaType === 'rural' ? null : toNumber(u.female_pop),
    ]);
    const pucca = sum([
      areaType === 'urban' ? null : toNumber(r.pucca_houses),
      areaType === 'rural' ? null : toNumber(u.pucca_houses),
    ]);
    const kutcha = sum([
      areaType === 'urban' ? null : toNumber(r.kutcha_houses),
      areaType === 'rural' ? null : toNumber(u.kutcha_houses),
    ]);
    const seniorCitizens = sum([
      areaType === 'urban' ? null : toNumber(r.senior_citizens),
      areaType === 'rural' ? null : toNumber(u.senior_citizens),
    ]);
    const pwdPop = sum([
      areaType === 'urban' ? null : toNumber(r.pwd_pop),
      areaType === 'rural' ? null : toNumber(u.pwd_pop),
    ]);
    const totalFamilies = sum([
      areaType === 'urban' ? null : toNumber(r.total_families),
      areaType === 'rural' ? null : toNumber(u.total_families),
    ]);

    const water = avg([
      areaType === 'urban' || r.tap_connection_pct == null ? null : toNumber(r.tap_connection_pct),
      areaType === 'rural' || u.tap_connection_pct == null ? null : toNumber(u.tap_connection_pct),
    ]);

    const healthCenters = sum([
      areaType === 'urban' ? null : toNumber(r.allopathic_centers) + toNumber(r.ayush_centers) + toNumber(r.private_health_centers),
      areaType === 'rural' ? null : toNumber(u.allopathic_centers) + toNumber(u.ayush_centers) + toNumber(u.private_health_centers),
    ]);
    const health = totalPop && totalPop > 0 ? Math.min((healthCenters / totalPop) * 10000, 100) : null;

    const irrigated = areaType === 'urban' ? null : toNumber(r.irrigated_area_ha);
    const cultivable = areaType === 'urban' ? null : toNumber(r.cultivable_land_ha);
    const agri = ratio(irrigated, cultivable);

    const dairy = areaType === 'urban' ? null : ratio(
      toNumber(r.milch_animals),
      toNumber(r.total_livestock)
    );

    const enrolled = sum([
      areaType === 'urban' ? null : toNumber(r.total_enrolled_students),
      areaType === 'rural' ? null : toNumber(u.total_enrolled_students),
    ]);
    const children = sum([
      areaType === 'urban' ? null : toNumber(r.children_6_14) + toNumber(r.pop_14_18),
      areaType === 'rural' ? null : toNumber(u.children_6_14) + toNumber(u.pop_14_18),
    ]);
    const edu = ratio(enrolled, children);

    const activeShg = sum([
      areaType === 'urban' ? null : toNumber(r.active_shg_count),
      areaType === 'rural' ? null : toNumber(u.active_shg_count),
    ]);
    const employ = ratio(activeShg, totalFamilies);

    const women = ratio(
      sum([
        areaType === 'urban' ? null : toNumber(r.women_in_shgs),
        areaType === 'rural' ? null : toNumber(u.women_in_shgs),
      ]),
      femalePop
    );

    const welfare = ratio(
      sum([
        areaType === 'urban' ? null : toNumber(r.old_age_pensioners) + toNumber(r.widow_pensioners) + toNumber(r.pwd_pensioners_est),
        areaType === 'rural' ? null : toNumber(u.old_age_pensioners) + toNumber(u.widow_pensioners) + toNumber(u.pwd_pensioners_est),
      ]),
      seniorCitizens + pwdPop
    );

    const infra = ratio(
      sum([
        areaType === 'urban' ? null : toNumber(r.houses_with_electricity),
        areaType === 'rural' ? null : toNumber(u.houses_with_electricity),
      ]),
      pucca !== null && kutcha !== null ? pucca + kutcha : null
    );

    const tourismFootfall = sum([
      areaType === 'urban' ? null : toNumber(r.avg_daily_footfall_cultural_sites) * 365,
      areaType === 'rural' ? null : toNumber(u.avg_fair_footfall_daily),
    ]);
    const tourism = ratio(tourismFootfall, totalPop);
    
    const forestArea = areaType === 'urban' ? null : toNumber(r.forest_area_hectare);
    const grazingArea = areaType === 'urban' ? null : toNumber(r.grazing_land_ha);
    const envDenom = forestArea !== null && grazingArea !== null ? forestArea + grazingArea : null;
    const env = ratio(forestArea, envDenom);
    
    const kccHolders = areaType === 'urban' ? null : toNumber(r.kcc_holders);
    const totalFarmers = areaType === 'urban' ? null : toNumber(r.total_farmers);
    const kccCoverage = ratio(kccHolders, totalFarmers);
    
    const solarHouses = areaType === 'urban' ? null : toNumber(r.solar_installed_houses);
    const totalHouses = pucca + kutcha;
    const solarAdoption = ratio(solarHouses, totalHouses);
    
    const dropoutChildren = sum([
      areaType === 'urban' ? null : toNumber(r.dropout_children),
      areaType === 'rural' ? null : toNumber(u.dropout_children),
    ]);
    const dropoutRate = enrolled && enrolled > 0 ? (dropoutChildren / enrolled) * 100 : null;

    const sectorList = [water, health, agri, dairy, edu, employ, women, welfare, infra, tourism, env, kccCoverage, solarAdoption]
      .filter((v) => v !== null)
      .map((value) => Math.max(0, Math.min(100, value ?? 0)));

    const dev = sectorList.length ? Math.round(sectorList.reduce((acc, value) => acc + value, 0) / sectorList.length) : 0;

    return {
      n: district,
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
      pop: (totalPop ?? 0) / 100000,
      gps: toNumber(r.gp_count) + toNumber(u.ward_count),
      blks: toNumber(r.block_count),
      lat: 0,
      lon: 0,
      totalPop,
      dropoutRate: dropoutRate ?? null,
    };
  }).sort((a, b) => b.dev - a.dev);

  const allRuralGps = sum(ruralRows.map(r => r.gp_count));
  const allUrbanWards = sum(urbanRows.map(u => u.ward_count));
  const totalDistricts = districts.length || null;
  const totalPop = sum(districts.map(d => d.totalPop));
  const femalePop = sum([
    areaType === 'urban' ? 0 : sum(ruralRows.map(r => r.female_pop)),
    areaType === 'rural' ? 0 : sum(urbanRows.map(u => u.female_pop)),
  ]);

  const ruralWaterPct = areaType === 'urban' ? null : avg(ruralRows.map(r => r.tap_connection_pct));
  const urbanWaterPct = areaType === 'rural' ? null : avg(urbanRows.map(u => u.tap_connection_pct));
  
  const irrigatedHa = areaType === 'urban' ? null : sum(ruralRows.map(r => r.irrigated_area_ha));
  const cultivableHa = areaType === 'urban' ? null : sum(ruralRows.map(r => r.cultivable_land_ha));
  
  const dailyMilk = areaType === 'urban' ? null : sum(ruralRows.map(r => r.daily_milk_litres));
  const lakhpati = areaType === 'urban' ? null : sum(ruralRows.map(r => r.lakhpati_didis));
  const shgWomen = areaType === 'urban' ? null : sum(ruralRows.map(r => r.women_in_shgs));
  
  const widow = sum([
    areaType === 'urban' ? 0 : sum(ruralRows.map(r => r.widow_pensioners)),
    areaType === 'rural' ? 0 : sum(urbanRows.map(u => u.widow_pensioners)),
  ]);
  
  const ayushman = sum([
    areaType === 'urban' ? 0 : sum(ruralRows.map(r => r.ayushman_beneficiaries)),
    areaType === 'rural' ? 0 : sum(urbanRows.map(u => u.ayushman_beneficiaries)),
  ]);

  const urbanFhtc = areaType === 'rural' ? null : avg(urbanRows.map(u => u.tap_connection_pct));
  
  const tourism = sum([
    areaType === 'urban' ? 0 : sum(ruralRows.map(r => toNumber(r.avg_daily_footfall_cultural_sites) * 365)),
    areaType === 'rural' ? 0 : sum(urbanRows.map(u => u.avg_fair_footfall_daily)),
  ]);

  const forest = areaType === 'urban' ? null : sum(ruralRows.map(r => r.forest_area_hectare));
  
  const totalArea = sum([
    areaType === 'urban' ? 0 : sum(ruralRows.map(r => r.total_area_ha)),
    areaType === 'rural' ? 0 : sum(urbanRows.map(u => u.total_area_ha)),
  ]);

  const irrigationPct = irrigatedHa && cultivableHa ? Math.round((irrigatedHa * 1000) / cultivableHa) / 10 : null;
  const dairyPotential = dailyMilk ? dailyMilk * 365 * 35 : null;

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
    ],
    radarScores: districtsToRadar(districts),
    districtScores: districts,
    dataCoverage: [
      ['Rural GPs', `${allRuralGps.toLocaleString('en-IN')} loaded`],
      ['Urban wards', `${allUrbanWards.toLocaleString('en-IN')} loaded`],
      ['Districts', totalDistricts ? `${totalDistricts.toLocaleString('en-IN')} loaded` : '-'],
      ['Rural pop', totalPop ? `${(totalPop / 10000000).toFixed(2)} Cr` : '-'],
      ['Female pop', femalePop ? `${(femalePop / 10000000).toFixed(2)} Cr` : '-'],
      ['Data rows', `${districts.length.toLocaleString('en-IN')} district groups`],
      ['Status', 'Using Materialized Views for instant calculation'],
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

    const cacheKey = districtFilter 
      ? `district_${districtFilter.replace(/\s+/g, '_')}_${areaType}_v3`
      : `state_${areaType}_v3`;

    try {
      const { data: cachedRow, error: cacheErr } = await supabase
        .from('cache_dashboard_kpis')
        .select('kpi_data')
        .eq('cache_key', cacheKey)
        .single();

      if (!cacheErr && cachedRow && cachedRow.kpi_data && Object.keys(cachedRow.kpi_data).length > 0) {
        const payload = cachedRow.kpi_data as any;
        const hasCoverage = Array.isArray(payload.dataCoverage) && payload.dataCoverage.length > 0;
        const hasDistricts = Array.isArray(payload.districtScores) && payload.districtScores.length > 0;

        if (hasCoverage && hasDistricts) {
          console.log(`[CACHE HIT] Serving dashboard from cache_dashboard_kpis for key: ${cacheKey}`);
          payload.source = 'cache'; 
          return NextResponse.json(payload);
        }
      }
    } catch (cErr) {
      console.warn('Cache check failed, falling back to live query', cErr);
    }

    console.log(`[CACHE MISS] Querying live tables concurrently for key: ${cacheKey}...`);

    let ruralQ = supabase.from('mv_baseline_rural_district_kpis').select('*');
    let urbanQ = supabase.from('mv_baseline_urban_district_kpis').select('*');

    if (districtFilter && districtFilter !== 'all') {
      ruralQ = ruralQ.ilike('district', districtFilter);
      urbanQ = urbanQ.ilike('district', districtFilter);
    }

    const [ruralRes, urbanRes] = await Promise.all([
      ruralQ,
      urbanQ
    ]);

    const payload = buildPayload(ruralRes.data || [], urbanRes.data || [], areaType);
    
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
