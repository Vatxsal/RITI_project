import { supabase } from '@/lib/supabase';

export type QueryType = 'FULL_REPORT' | 'INTERVENTIONS' | 'GP_REPORT' | 'COMPARISON' | 'GENERAL';

type LocationContext =
  | { type: 'district'; name: string }
  | { type: 'gp_id'; id: string; district?: string }
  | { type: 'state'; name: 'Rajasthan' }
  | null;

type CachedEntry = {
  fetchedAt: number;
  contextObject: Record<string, any>;
};

const CACHE_TTL = 30 * 60 * 1000;
const DATA_CACHE: Record<string, CachedEntry> = {};

const DISTRICT_CACHE = {
  fetchedAt: 0,
  districts: [] as string[],
};

const RURAL_TABLE_SELECTS: Record<string, string> = {
  fact_rural_admin:
    'gp_id,pop_2026_est,male_pop_2026,female_pop_2026,children_0_6_2026,children_6_14_2026,senior_citizens_2026,pwd_pop_2026,bpl_families_count,nfsa_beneficiary_families,pucca_houses_2026,kutcha_houses_2026',
  fact_rural_water:
    'gp_id,tap_connection_pct,overhead_tanks_count,handpump_tubewell_only_houses,groundwater_depth_meters',
  fact_rural_health:
    'gp_id,allopathic_centers,ayush_centers,tb_patients_count,anemic_pregnant_women,ayushman_arogya_beneficiaries,avg_daily_patients',
  fact_rural_livelihood:
    'gp_id,cultivable_land_hectare,irrigated_area_hectare,total_farmers_count,kcc_holders_count,fpo_count,solar_pumps_count,daily_milk_prod_litres,milch_animals_count,total_livestock_count',
  fact_rural_economy:
    'gp_id,active_shg_count,women_in_shgs,lakhpati_didis_count,millionaire_didis_count,mudra_loan_beneficiaries',
  fact_rural_social:
    'gp_id,old_age_pensioners,widow_pensioners,pwd_pensioners_est,pm_ujjwala_beneficiaries,pm_cm_awas_beneficiaries',
  fact_rural_infra:
    'gp_id,houses_with_electricity,road_length_km,govt_banks_count,private_banks_count',
  fact_rural_environment:
    'gp_id,forest_area_hectare,total_waste_daily_kg,houses_with_toilets',
  fact_rural_tourism:
    'gp_id,avg_daily_footfall_cultural_sites,cultural_assets_count,annual_fairs_count,avg_fair_footfall_daily',
  fact_rural_education:
    'gp_id,govt_schools_count,pvt_schools_count,total_enrolled_students,working_teachers,sanctioned_teachers_count,anganwadi_centers,sam_children_count,dropout_children_prev_year',
  fact_rural_governance: 'gp_id',
};

const URBAN_TABLE_SELECTS: Record<string, string> = {
  fact_urban_admin:
    'ward_id,pop_2026_est,male_pop_2026,female_pop_2026,children_0_6_2026,children_6_14_2026,senior_citizens_2026,pwd_pop_2026,pucca_houses_2026,kutcha_houses_2026',
  fact_urban_water:
    'ward_id,tap_connection_pct,overhead_tanks_count,handpumps_count,groundwater_depth_meters',
  fact_urban_health:
    'ward_id,allopathic_centers,ayush_centers,tb_patients_count,anemic_pregnant_women,ayushman_arogya_beneficiaries,avg_daily_patients',
  fact_urban_economy:
    'ward_id,active_shg_count,large_industrial_units,small_scale_industries,local_artisans_count',
  fact_urban_social:
    'ward_id,old_age_pensioners,widow_pensioners,pwd_pensioners_est,pm_ujjwala_beneficiaries,pm_cm_awas_beneficiaries',
  fact_urban_infra:
    'ward_id,houses_with_electricity,road_length_km,govt_banks_count,private_banks_count',
  fact_urban_environment:
    'ward_id,houses_without_toilets',
  fact_urban_tourism:
    'ward_id,avg_fair_footfall_daily,registered_trained_guides',
  fact_urban_education:
    'ward_id,govt_schools_count,pvt_schools_count,school_enrolled_students,working_teachers,sanctioned_teachers_count,anganwadi_centers,sam_children_count,dropout_children_prev_year',
  fact_urban_governance: 'ward_id',
};

function normalizeDistrict(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function parseNumber(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sumValues(rows: any[], column: string): number | null {
  let total = 0;
  let has = false;
  for (const row of rows) {
    const num = parseNumber(row?.[column]);
    if (num !== null) {
      total += num;
      has = true;
    }
  }
  return has ? total : null;
}

function avgValues(rows: any[], column: string): number | null {
  let total = 0;
  let count = 0;
  for (const row of rows) {
    const num = parseNumber(row?.[column]);
    if (num !== null) {
      total += num;
      count += 1;
    }
  }
  return count > 0 ? total / count : null;
}

function formatMetric(value: number | null, digits = 0): string {
  if (value === null || Number.isNaN(value)) return '-';
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function getCached(key: string): CachedEntry | null {
  const entry = DATA_CACHE[key];
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > CACHE_TTL) return null;
  return entry;
}

function setCached(key: string, contextObject: Record<string, any>) {
  DATA_CACHE[key] = { fetchedAt: Date.now(), contextObject };
}

export function detectQueryType(userMessage: string): QueryType {
  const msg = userMessage.toLowerCase();
  if (msg.includes('full') && (msg.includes('report') || msg.includes('sector'))) {
    return 'FULL_REPORT';
  }
  if (msg.includes('top intervention') || msg.includes('best intervention')) {
    return 'INTERVENTIONS';
  }
  if (msg.includes('gp level') || msg.includes('gram panchayat')) {
    return 'GP_REPORT';
  }
  if (msg.includes('compare')) {
    return 'COMPARISON';
  }
  return 'GENERAL';
}

async function fetchAllFromTable(table: string, select: string, filters?: Record<string, any>) {
  const pageSize = 1000;
  let countQuery = supabase.from(table).select('*', { count: 'exact', head: true });
  for (const [key, value] of Object.entries(filters || {})) {
    if (Array.isArray(value)) {
      countQuery = countQuery.in(key, value);
    } else {
      countQuery = countQuery.eq(key, value);
    }
  }
  const { count, error: countErr } = await countQuery;
  if (countErr) throw countErr;
  if (!count) return [];

  const pages = Math.ceil(count / pageSize);
  const promises: Array<Promise<any[]>> = [];

  for (let i = 0; i < pages; i += 1) {
    let query = supabase.from(table).select(select).range(i * pageSize, i * pageSize + pageSize - 1);
    for (const [key, value] of Object.entries(filters || {})) {
      if (Array.isArray(value)) {
        query = query.in(key, value);
      } else {
        query = query.eq(key, value);
      }
    }
    promises.push(
      query.then((result: any) => {
        if (result.error) throw result.error;
        return result.data || [];
      })
    );
  }

  const chunks = await Promise.all(promises);
  return chunks.flat();
}

async function getAvailableDistricts(): Promise<string[]> {
  const ttlMs = 60 * 60 * 1000;
  if (Date.now() - DISTRICT_CACHE.fetchedAt < ttlMs && DISTRICT_CACHE.districts.length > 0) {
    return DISTRICT_CACHE.districts;
  }

  let ruralRows: any[] = [];
  let urbanRows: any[] = [];

  try {
    [ruralRows, urbanRows] = await Promise.all([
      fetchAllFromTable('dim_rural_gps', 'district'),
      fetchAllFromTable('dim_urban_wards', 'district'),
    ]);
  } catch (error) {
    console.error('[AI CONTEXT] Failed to load district lists:', error);
    return [];
  }

  const districts = new Set<string>();
  [...ruralRows, ...urbanRows].forEach((row: any) => {
    const district = String(row?.district || '').trim();
    if (district) districts.add(district);
  });

  DISTRICT_CACHE.fetchedAt = Date.now();
  DISTRICT_CACHE.districts = Array.from(districts).sort((a, b) => a.localeCompare(b));
  return DISTRICT_CACHE.districts;
}

export function extractLocation(userMessage: string, availableDistricts: string[]): LocationContext {
  const msg = userMessage.toLowerCase();

  for (const district of availableDistricts) {
    if (msg.includes(district.toLowerCase())) {
      return { type: 'district', name: district };
    }
  }

  if (msg.includes('rajasthan') || msg.includes('statewide') || msg.includes('state level')) {
    return { type: 'state', name: 'Rajasthan' };
  }

  const gpMatch = userMessage.match(/\b(\d{4,5})\b/);
  if (gpMatch) return { type: 'gp_id', id: gpMatch[1] };

  return null;
}

async function fetchDistrictBaseline(district: string) {
  const normalized = normalizeDistrict(district);

  let ruralDimRows: any[] = [];
  let urbanDimRows: any[] = [];

  try {
    [ruralDimRows, urbanDimRows] = await Promise.all([
      fetchAllFromTable('dim_rural_gps', 'gp_id,district'),
      fetchAllFromTable('dim_urban_wards', 'ward_id,district'),
    ]);
  } catch (error) {
    console.error('[AI CONTEXT] Failed loading district dimensions:', error);
  }

  const ruralIds = ruralDimRows
    .filter((row: any) => normalizeDistrict(String(row?.district || '')) === normalized)
    .map((row: any) => row.gp_id)
    .filter((id: any) => id !== null && id !== undefined);

  const urbanIds = urbanDimRows
    .filter((row: any) => normalizeDistrict(String(row?.district || '')) === normalized)
    .map((row: any) => row.ward_id)
    .filter((id: any) => id !== null && id !== undefined);

  const ruralFetches = Object.entries(RURAL_TABLE_SELECTS).map(async ([table, select]) => {
    try {
      if (ruralIds.length === 0) return [table, []] as const;
      const rows = await fetchAllFromTable(table, select, { gp_id: ruralIds });
      return [table, rows] as const;
    } catch (error) {
      console.error(`[AI CONTEXT] Failed loading ${table}:`, error);
      return [table, []] as const;
    }
  });

  const urbanFetches = Object.entries(URBAN_TABLE_SELECTS).map(async ([table, select]) => {
    try {
      if (urbanIds.length === 0) return [table, []] as const;
      const rows = await fetchAllFromTable(table, select, { ward_id: urbanIds });
      return [table, rows] as const;
    } catch (error) {
      console.error(`[AI CONTEXT] Failed loading ${table}:`, error);
      return [table, []] as const;
    }
  });

  const rural = Object.fromEntries(await Promise.all(ruralFetches));
  const urban = Object.fromEntries(await Promise.all(urbanFetches));

  return { rural, urban };
}

async function fetchGpBaseline(gpId: string) {
  let ruralDimRows: any[] = [];
  let urbanDimRows: any[] = [];

  try {
    [ruralDimRows, urbanDimRows] = await Promise.all([
      fetchAllFromTable('dim_rural_gps', 'gp_id,district,block,gram_panchayat', { gp_id: gpId }),
      fetchAllFromTable('dim_urban_wards', 'ward_id,district,ulb,ward', { ward_id: gpId }),
    ]);
  } catch (error) {
    console.error('[AI CONTEXT] Failed loading GP/Ward dimensions:', error);
    return null;
  }

  if (ruralDimRows.length > 0) {
    const ruralFetches = Object.entries(RURAL_TABLE_SELECTS).map(async ([table, select]) => {
      try {
        const rows = await fetchAllFromTable(table, select, { gp_id: gpId });
        return [table, rows] as const;
      } catch (error) {
        console.error(`[AI CONTEXT] Failed loading ${table}:`, error);
        return [table, []] as const;
      }
    });

    return {
      location: {
        type: 'gp_id' as const,
        id: gpId,
        district: ruralDimRows[0]?.district || undefined,
      },
      rural: Object.fromEntries(await Promise.all(ruralFetches)),
      urban: Object.fromEntries(Object.keys(URBAN_TABLE_SELECTS).map((table) => [table, []])),
    };
  }

  if (urbanDimRows.length > 0) {
    const urbanFetches = Object.entries(URBAN_TABLE_SELECTS).map(async ([table, select]) => {
      try {
        const rows = await fetchAllFromTable(table, select, { ward_id: gpId });
        return [table, rows] as const;
      } catch (error) {
        console.error(`[AI CONTEXT] Failed loading ${table}:`, error);
        return [table, []] as const;
      }
    });

    return {
      location: {
        type: 'gp_id' as const,
        id: gpId,
        district: urbanDimRows[0]?.district || undefined,
      },
      rural: Object.fromEntries(Object.keys(RURAL_TABLE_SELECTS).map((table) => [table, []])),
      urban: Object.fromEntries(await Promise.all(urbanFetches)),
    };
  }

  return null;
}

function aggregateContext(rural: Record<string, any[]>, urban: Record<string, any[]>) {
  const ruralAdmin = rural.fact_rural_admin || [];
  const urbanAdmin = urban.fact_urban_admin || [];
  const ruralWater = rural.fact_rural_water || [];
  const urbanWater = urban.fact_urban_water || [];
  const ruralHealth = rural.fact_rural_health || [];
  const urbanHealth = urban.fact_urban_health || [];
  const ruralEducation = rural.fact_rural_education || [];
  const urbanEducation = urban.fact_urban_education || [];
  const ruralLivelihood = rural.fact_rural_livelihood || [];
  const ruralEconomy = rural.fact_rural_economy || [];
  const urbanEconomy = urban.fact_urban_economy || [];
  const ruralSocial = rural.fact_rural_social || [];
  const urbanSocial = urban.fact_urban_social || [];
  const ruralInfra = rural.fact_rural_infra || [];
  const urbanInfra = urban.fact_urban_infra || [];
  const ruralEnvironment = rural.fact_rural_environment || [];
  const urbanEnvironment = urban.fact_urban_environment || [];
  const ruralTourism = rural.fact_rural_tourism || [];
  const urbanTourism = urban.fact_urban_tourism || [];

  const totalPopulation = (sumValues(ruralAdmin, 'pop_2026_est') || 0) + (sumValues(urbanAdmin, 'pop_2026_est') || 0);
  const malePopulation = (sumValues(ruralAdmin, 'male_pop_2026') || 0) + (sumValues(urbanAdmin, 'male_pop_2026') || 0);
  const femalePopulation = (sumValues(ruralAdmin, 'female_pop_2026') || 0) + (sumValues(urbanAdmin, 'female_pop_2026') || 0);
  const children0to6 = (sumValues(ruralAdmin, 'children_0_6_2026') || 0) + (sumValues(urbanAdmin, 'children_0_6_2026') || 0);
  const children6to14 = (sumValues(ruralAdmin, 'children_6_14_2026') || 0) + (sumValues(urbanAdmin, 'children_6_14_2026') || 0);
  const seniorCitizens = (sumValues(ruralAdmin, 'senior_citizens_2026') || 0) + (sumValues(urbanAdmin, 'senior_citizens_2026') || 0);
  const pwdPopulation = (sumValues(ruralAdmin, 'pwd_pop_2026') || 0) + (sumValues(urbanAdmin, 'pwd_pop_2026') || 0);
  const bplFamilies = sumValues(ruralAdmin, 'bpl_families_count');
  const nfsaFamilies = sumValues(ruralAdmin, 'nfsa_beneficiary_families');
  const puccaHouses = (sumValues(ruralAdmin, 'pucca_houses_2026') || 0) + (sumValues(urbanAdmin, 'pucca_houses_2026') || 0);
  const kutchaHouses = (sumValues(ruralAdmin, 'kutcha_houses_2026') || 0) + (sumValues(urbanAdmin, 'kutcha_houses_2026') || 0);

  const ruralFhtc = avgValues(ruralWater, 'tap_connection_pct');
  const urbanFhtc = avgValues(urbanWater, 'tap_connection_pct');
  const overheadTanks = (sumValues(ruralWater, 'overhead_tanks_count') || 0) + (sumValues(urbanWater, 'overhead_tanks_count') || 0);
  const handpumpHomes = (sumValues(ruralWater, 'handpump_tubewell_only_houses') || 0) + (sumValues(urbanWater, 'handpumps_count') || 0);
  const groundwaterDepthAvg = (() => {
    const r = avgValues(ruralWater, 'groundwater_depth_meters');
    const u = avgValues(urbanWater, 'groundwater_depth_meters');
    if (r === null && u === null) return null;
    if (r === null) return u;
    if (u === null) return r;
    return (r + u) / 2;
  })();
  const housesWithToilet = sumValues(ruralEnvironment, 'houses_with_toilets');

  const allopathicCenters = (sumValues(ruralHealth, 'allopathic_centers') || 0) + (sumValues(urbanHealth, 'allopathic_centers') || 0);
  const ayushCenters = (sumValues(ruralHealth, 'ayush_centers') || 0) + (sumValues(urbanHealth, 'ayush_centers') || 0);
  const tbPatients = (sumValues(ruralHealth, 'tb_patients_count') || 0) + (sumValues(urbanHealth, 'tb_patients_count') || 0);
  const anemicPregnant = (sumValues(ruralHealth, 'anemic_pregnant_women') || 0) + (sumValues(urbanHealth, 'anemic_pregnant_women') || 0);
  const ayushmanBeneficiaries =
    (sumValues(ruralHealth, 'ayushman_arogya_beneficiaries') || 0) + (sumValues(urbanHealth, 'ayushman_arogya_beneficiaries') || 0);
  const avgDailyPatients = (() => {
    const r = avgValues(ruralHealth, 'avg_daily_patients');
    const u = avgValues(urbanHealth, 'avg_daily_patients');
    if (r === null && u === null) return null;
    if (r === null) return u;
    if (u === null) return r;
    return (r + u) / 2;
  })();

  const govtSchools = (sumValues(ruralEducation, 'govt_schools_count') || 0) + (sumValues(urbanEducation, 'govt_schools_count') || 0);
  const pvtSchools = (sumValues(ruralEducation, 'pvt_schools_count') || 0) + (sumValues(urbanEducation, 'pvt_schools_count') || 0);
  const enrolledStudents =
    (sumValues(ruralEducation, 'total_enrolled_students') || 0) + (sumValues(urbanEducation, 'school_enrolled_students') || 0);
  const workingTeachers = (sumValues(ruralEducation, 'working_teachers') || 0) + (sumValues(urbanEducation, 'working_teachers') || 0);
  const sanctionedTeachers =
    (sumValues(ruralEducation, 'sanctioned_teachers_count') || 0) + (sumValues(urbanEducation, 'sanctioned_teachers_count') || 0);
  const teacherVacancy = sanctionedTeachers === null ? null : Math.max((sanctionedTeachers || 0) - (workingTeachers || 0), 0);
  const anganwadiCenters = (sumValues(ruralEducation, 'anganwadi_centers') || 0) + (sumValues(urbanEducation, 'anganwadi_centers') || 0);
  const samChildren = (sumValues(ruralEducation, 'sam_children_count') || 0) + (sumValues(urbanEducation, 'sam_children_count') || 0);
  const dropoutChildren =
    (sumValues(ruralEducation, 'dropout_children_prev_year') || 0) + (sumValues(urbanEducation, 'dropout_children_prev_year') || 0);

  const cultivableLand = sumValues(ruralLivelihood, 'cultivable_land_hectare');
  const irrigatedLand = sumValues(ruralLivelihood, 'irrigated_area_hectare');
  const irrigationCoverage =
    cultivableLand && cultivableLand > 0 && irrigatedLand !== null ? (irrigatedLand / cultivableLand) * 100 : null;
  const totalFarmers = sumValues(ruralLivelihood, 'total_farmers_count');
  const kccHolders = sumValues(ruralLivelihood, 'kcc_holders_count');
  const fpoCount = sumValues(ruralLivelihood, 'fpo_count');
  const solarPumps = sumValues(ruralLivelihood, 'solar_pumps_count');

  const dailyMilkProduction = sumValues(ruralLivelihood, 'daily_milk_prod_litres');
  const annualDairyPotentialCr = dailyMilkProduction !== null ? (dailyMilkProduction * 365 * 50) / 10000000 : null;
  const milchAnimals = sumValues(ruralLivelihood, 'milch_animals_count');
  const totalLivestock = sumValues(ruralLivelihood, 'total_livestock_count');

  const activeShg = (sumValues(ruralEconomy, 'active_shg_count') || 0) + (sumValues(urbanEconomy, 'active_shg_count') || 0);
  const womenInShgs = sumValues(ruralEconomy, 'women_in_shgs');
  const lakhpatiDidis = sumValues(ruralEconomy, 'lakhpati_didis_count');
  const millionaireDidis = sumValues(ruralEconomy, 'millionaire_didis_count');
  const mudraBeneficiaries = sumValues(ruralEconomy, 'mudra_loan_beneficiaries');

  const oldAgePensioners = (sumValues(ruralSocial, 'old_age_pensioners') || 0) + (sumValues(urbanSocial, 'old_age_pensioners') || 0);
  const widowPensioners = (sumValues(ruralSocial, 'widow_pensioners') || 0) + (sumValues(urbanSocial, 'widow_pensioners') || 0);
  const pwdPensioners = (sumValues(ruralSocial, 'pwd_pensioners_est') || 0) + (sumValues(urbanSocial, 'pwd_pensioners_est') || 0);
  const ujjwalaBeneficiaries =
    (sumValues(ruralSocial, 'pm_ujjwala_beneficiaries') || 0) + (sumValues(urbanSocial, 'pm_ujjwala_beneficiaries') || 0);
  const awasBeneficiaries =
    (sumValues(ruralSocial, 'pm_cm_awas_beneficiaries') || 0) + (sumValues(urbanSocial, 'pm_cm_awas_beneficiaries') || 0);

  const housesWithElectricity =
    (sumValues(ruralInfra, 'houses_with_electricity') || 0) + (sumValues(urbanInfra, 'houses_with_electricity') || 0);
  const roadLengthKm = (sumValues(ruralInfra, 'road_length_km') || 0) + (sumValues(urbanInfra, 'road_length_km') || 0);
  const govtBanks = (sumValues(ruralInfra, 'govt_banks_count') || 0) + (sumValues(urbanInfra, 'govt_banks_count') || 0);
  const privateBanks = (sumValues(ruralInfra, 'private_banks_count') || 0) + (sumValues(urbanInfra, 'private_banks_count') || 0);

  const forestArea = sumValues(ruralEnvironment, 'forest_area_hectare');
  const forestCoverPct = null;
  const dailyWaste = sumValues(ruralEnvironment, 'total_waste_daily_kg');

  const dailyFootfall =
    (sumValues(ruralTourism, 'avg_daily_footfall_cultural_sites') || 0) +
    (sumValues(ruralTourism, 'avg_fair_footfall_daily') || 0) +
    (sumValues(urbanTourism, 'avg_fair_footfall_daily') || 0);
  const annualVisitors = dailyFootfall !== null ? dailyFootfall * 365 : null;
  const culturalAssets = sumValues(ruralTourism, 'cultural_assets_count');
  const annualFairs = sumValues(ruralTourism, 'annual_fairs_count');

  return {
    population: {
      totalPopulation,
      malePopulation,
      femalePopulation,
      children0to6,
      children6to14,
      seniorCitizens,
      pwdPopulation,
      bplFamilies,
      nfsaFamilies,
      puccaHouses,
      kutchaHouses,
    },
    water: {
      ruralFhtc,
      urbanFhtc,
      overheadTanks,
      handpumpHomes,
      groundwaterDepthAvg,
      housesWithToilet,
    },
    health: {
      allopathicCenters,
      ayushCenters,
      tbPatients,
      anemicPregnant,
      ayushmanBeneficiaries,
      avgDailyPatients,
    },
    education: {
      govtSchools,
      pvtSchools,
      enrolledStudents,
      workingTeachers,
      sanctionedTeachers,
      teacherVacancy,
      anganwadiCenters,
      samChildren,
      dropoutChildren,
    },
    agriculture: {
      cultivableLand,
      irrigatedLand,
      irrigationCoverage,
      totalFarmers,
      kccHolders,
      fpoCount,
      solarPumps,
    },
    dairy: {
      dailyMilkProduction,
      annualDairyPotentialCr,
      milchAnimals,
      totalLivestock,
    },
    livelihoods: {
      activeShg,
      womenInShgs,
      lakhpatiDidis,
      millionaireDidis,
      mudraBeneficiaries,
    },
    welfare: {
      oldAgePensioners,
      widowPensioners,
      pwdPensioners,
      ujjwalaBeneficiaries,
      awasBeneficiaries,
    },
    infra: {
      housesWithElectricity,
      roadLengthKm,
      govtBanks,
      privateBanks,
    },
    environment: {
      forestArea,
      forestCoverPct,
      dailyWaste,
      housesWithToilet,
    },
    tourism: {
      dailyFootfall,
      annualVisitors,
      culturalAssets,
      annualFairs,
    },
  };
}

function getQueryTypeInstructions(queryType: QueryType) {
  if (queryType === 'FULL_REPORT') {
    return 'For full sector reports, cover all 11 sectors with actual numbers, identified gaps, and 2-3 specific interventions per sector. Keep each sector to 4-6 lines.';
  }
  if (queryType === 'INTERVENTIONS') {
    return 'Provide top 5 interventions with data-backed rationale and practical scheme-linked execution guidance.';
  }
  if (queryType === 'GP_REPORT') {
    return 'Provide a GP/ward deep dive with local constraints, baseline numbers, and sequenced interventions.';
  }
  if (queryType === 'COMPARISON') {
    return 'Compare locations side-by-side using only available baseline numbers and highlight strongest and weakest sectors.';
  }
  return 'Answer directly using baseline numbers. Keep response concise and data-first.';
}

function buildSystemPrompt(locationLabel: string, aggregated: Record<string, any>, queryType: QueryType, hasLocation: boolean) {
  return `You are Manthaan OS Planning Intelligence for Rajasthan.
You have access to real baseline data fetched from Supabase for the requested district/GP/ward.

BASELINE DATA FOR ${locationLabel}:
--- POPULATION & DEMOGRAPHICS ---
Total Population (2026 est): ${formatMetric(aggregated.population.totalPopulation)}
Male: ${formatMetric(aggregated.population.malePopulation)} | Female: ${formatMetric(aggregated.population.femalePopulation)}
Children 0-6: ${formatMetric(aggregated.population.children0to6)} | Children 6-14: ${formatMetric(aggregated.population.children6to14)}
Senior Citizens: ${formatMetric(aggregated.population.seniorCitizens)} | PwD: ${formatMetric(aggregated.population.pwdPopulation)}
BPL Families: ${formatMetric(aggregated.population.bplFamilies)} | NFSA Families: ${formatMetric(aggregated.population.nfsaFamilies)}
Pucca Houses: ${formatMetric(aggregated.population.puccaHouses)} | Kutcha Houses: ${formatMetric(aggregated.population.kutchaHouses)}

--- WATER & SANITATION ---
Rural FHTC %: ${formatMetric(aggregated.water.ruralFhtc, 1)} | Urban FHTC %: ${formatMetric(aggregated.water.urbanFhtc, 1)}
Overhead Tanks: ${formatMetric(aggregated.water.overheadTanks)} | Handpump HH: ${formatMetric(aggregated.water.handpumpHomes)}
Groundwater Depth: ${formatMetric(aggregated.water.groundwaterDepthAvg, 1)}m avg
Houses with Toilets: ${formatMetric(aggregated.water.housesWithToilet)}

--- HEALTH ---
Allopathic Centers: ${formatMetric(aggregated.health.allopathicCenters)} | AYUSH: ${formatMetric(aggregated.health.ayushCenters)}
TB Patients: ${formatMetric(aggregated.health.tbPatients)} | Anemic Pregnant: ${formatMetric(aggregated.health.anemicPregnant)}
Ayushman Beneficiaries: ${formatMetric(aggregated.health.ayushmanBeneficiaries)}
Avg Daily Patients: ${formatMetric(aggregated.health.avgDailyPatients, 1)}

--- EDUCATION ---
Govt Schools: ${formatMetric(aggregated.education.govtSchools)} | Pvt Schools: ${formatMetric(aggregated.education.pvtSchools)}
Enrolled Students: ${formatMetric(aggregated.education.enrolledStudents)}
Working Teachers: ${formatMetric(aggregated.education.workingTeachers)} | Sanctioned: ${formatMetric(aggregated.education.sanctionedTeachers)}
Teacher Vacancy: ${formatMetric(aggregated.education.teacherVacancy)}
Anganwadi Centers: ${formatMetric(aggregated.education.anganwadiCenters)} | SAM Children: ${formatMetric(aggregated.education.samChildren)}
Dropout Children: ${formatMetric(aggregated.education.dropoutChildren)}

--- AGRICULTURE ---
Cultivable Land: ${formatMetric(aggregated.agriculture.cultivableLand)} ha | Irrigated: ${formatMetric(aggregated.agriculture.irrigatedLand)} ha
Irrigation Coverage: ${formatMetric(aggregated.agriculture.irrigationCoverage, 1)}%
Total Farmers: ${formatMetric(aggregated.agriculture.totalFarmers)} | KCC Holders: ${formatMetric(aggregated.agriculture.kccHolders)}
FPO Count: ${formatMetric(aggregated.agriculture.fpoCount)} | Solar Pumps: ${formatMetric(aggregated.agriculture.solarPumps)}

--- DAIRY & LIVESTOCK ---
Daily Milk Production: ${formatMetric(aggregated.dairy.dailyMilkProduction)} L/day
Annual Dairy Potential: Rs ${formatMetric(aggregated.dairy.annualDairyPotentialCr, 2)} Cr (at Rs 50/L SARAS rate)
Milch Animals: ${formatMetric(aggregated.dairy.milchAnimals)} | Total Livestock: ${formatMetric(aggregated.dairy.totalLivestock)}

--- LIVELIHOODS & ECONOMY ---
Active SHGs: ${formatMetric(aggregated.livelihoods.activeShg)} | Women in SHGs: ${formatMetric(aggregated.livelihoods.womenInShgs)}
Lakhpati Didis: ${formatMetric(aggregated.livelihoods.lakhpatiDidis)} | Millionaire Didis: ${formatMetric(aggregated.livelihoods.millionaireDidis)}
Mudra Beneficiaries: ${formatMetric(aggregated.livelihoods.mudraBeneficiaries)}

--- WELFARE & SOCIAL ---
Old Age Pensioners: ${formatMetric(aggregated.welfare.oldAgePensioners)}
Widow Pensioners: ${formatMetric(aggregated.welfare.widowPensioners)}
PwD Pensioners: ${formatMetric(aggregated.welfare.pwdPensioners)}
PM Ujjwala: ${formatMetric(aggregated.welfare.ujjwalaBeneficiaries)} | PM/CM Awas: ${formatMetric(aggregated.welfare.awasBeneficiaries)}

--- INFRASTRUCTURE ---
HH with Electricity: ${formatMetric(aggregated.infra.housesWithElectricity)}
Road Length: ${formatMetric(aggregated.infra.roadLengthKm, 1)} km
Govt Banks: ${formatMetric(aggregated.infra.govtBanks)} | Pvt Banks: ${formatMetric(aggregated.infra.privateBanks)}

--- ENVIRONMENT ---
Forest Area: ${formatMetric(aggregated.environment.forestArea)} ha | Forest Cover: ${formatMetric(aggregated.environment.forestCoverPct, 1)}%
Daily Waste: ${formatMetric(aggregated.environment.dailyWaste)} kg
Houses with Toilets: ${formatMetric(aggregated.environment.housesWithToilet)}

--- TOURISM ---
Daily Footfall: ${formatMetric(aggregated.tourism.dailyFootfall)} | Annual Visitors: ${formatMetric(aggregated.tourism.annualVisitors)}
Cultural Assets: ${formatMetric(aggregated.tourism.culturalAssets)} | Annual Fairs: ${formatMetric(aggregated.tourism.annualFairs)}

Where value is - means data not yet available for this geography.

INSTRUCTIONS:
- Use ONLY the numbers above — never make up or estimate figures
- For a full sector report: cover all 11 sectors with actual numbers, gaps, and 2-3 specific interventions per sector
- Keep each sector to 4-6 lines — detailed but readable
- For general questions: answer directly using the data above
- If data shows - for a field, say "data not available" for that specific metric
- Always end with a 3-point priority action summary
- Query type for this request: ${queryType}
- ${getQueryTypeInstructions(queryType)}
${hasLocation ? '' : '- No district/GP was detected in user query. Ask the user to specify district or GP/ward ID for precise reporting.'}`;
}

function getMaxTokens(queryType: QueryType) {
  if (queryType === 'FULL_REPORT') return 3000;
  if (queryType === 'GP_REPORT' || queryType === 'COMPARISON') return 2200;
  if (queryType === 'INTERVENTIONS') return 1800;
  return 800;
}

export async function buildChatContext(userMessage: string) {
  const queryType = detectQueryType(userMessage || '');
  const availableDistricts = await getAvailableDistricts();
  const location = extractLocation(userMessage || '', availableDistricts);

  let cacheKey = 'state';
  if (location?.type === 'district') cacheKey = location.name;
  if (location?.type === 'gp_id') cacheKey = `gp_${location.id}`;

  const cached = getCached(cacheKey);
  if (cached) {
    const systemPrompt = buildSystemPrompt(
      cached.contextObject.locationLabel,
      cached.contextObject.aggregated,
      queryType,
      cached.contextObject.hasLocation
    );
    return {
      systemPrompt,
      queryType,
      maxOutputTokens: getMaxTokens(queryType),
      contextObject: {
        ...cached.contextObject,
        cache: { key: cacheKey, hit: true, fetchedAt: cached.fetchedAt },
        queryType,
      },
    };
  }

  let rural: Record<string, any[]> = Object.fromEntries(Object.keys(RURAL_TABLE_SELECTS).map((table) => [table, []]));
  let urban: Record<string, any[]> = Object.fromEntries(Object.keys(URBAN_TABLE_SELECTS).map((table) => [table, []]));
  let resolvedLocation = location;

  if (location?.type === 'district') {
    const baseline = await fetchDistrictBaseline(location.name);
    rural = baseline.rural;
    urban = baseline.urban;
  } else if (location?.type === 'gp_id') {
    const baseline = await fetchGpBaseline(location.id);
    if (baseline) {
      rural = baseline.rural;
      urban = baseline.urban;
      resolvedLocation = baseline.location;
    }
  }

  const locationLabel =
    resolvedLocation?.type === 'district'
      ? resolvedLocation.name
      : resolvedLocation?.type === 'gp_id'
        ? `GP/Ward ID ${resolvedLocation.id}${resolvedLocation.district ? ` (${resolvedLocation.district})` : ''}`
        : 'Requested geography (not detected)';

  const aggregated = aggregateContext(rural, urban);
  const contextObject = {
    location: resolvedLocation,
    locationLabel,
    hasLocation: !!resolvedLocation,
    queryType,
    tableRows: {
      rural: Object.fromEntries(Object.entries(rural).map(([table, rows]) => [table, rows.length])),
      urban: Object.fromEntries(Object.entries(urban).map(([table, rows]) => [table, rows.length])),
    },
    aggregated,
    cache: {
      key: cacheKey,
      hit: false,
      ttlMs: CACHE_TTL,
    },
  };

  setCached(cacheKey, contextObject);

  return {
    systemPrompt: buildSystemPrompt(locationLabel, aggregated, queryType, !!resolvedLocation),
    queryType,
    maxOutputTokens: getMaxTokens(queryType),
    contextObject,
  };
}

export async function getLiveBaselinePrompt(userMessage = '') {
  const ctx = await buildChatContext(userMessage);
  return ctx.systemPrompt;
}
