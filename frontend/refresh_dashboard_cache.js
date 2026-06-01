const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "https://jnzhmcngxigtptztdjhl.supabase.co";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuemhtY25neGlndHB0enRkamhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNDM0MDgsImV4cCI6MjA5NTgxOTQwOH0.wCsBF-uTxmyJXLa2SRm0pZ0XwiWwKAXC26qSHZ9wux8";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- HELPERS FROM route.ts & dashboard-kpis.ts ---
function toNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function sum(values) {
  let total = 0;
  for (const value of values) {
    total += toNumber(value);
  }
  return total;
}

function avg(values) {
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

function ratio(numerator, denominator) {
  if (numerator === null || denominator === null || denominator === 0) return null;
  return (numerator * 100) / denominator;
}

function formatMillions(value) {
  if (value === null) return '-';
  return `${Math.round(value / 1000000)}M+`;
}

function formatLakh(value, plus = false) {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  const suffix = plus ? 'L+' : 'L';
  return `${(value / 100000).toFixed(1)}${suffix}`;
}

function formatCrore(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  if (value >= 100000000) return `${Math.round(value / 10000000 / 1000)}K Cr`;
  return `${(value / 10000000).toFixed(1)} Cr`;
}

function formatPct(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  return `${value.toFixed(digits)}%`;
}

function addRows(groups, district, bucket, row) {
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
  groups.get(district)[bucket].push(row);
}

function sectorScores(group, areaType = 'all') {
  const ruralPop = areaType === 'urban' ? null : sum(group.ruralAdmin.map((r) => r.pop_2026_est));
  const urbanPop = areaType === 'rural' ? null : sum(group.urbanAdmin.map((r) => r.pop_2026_est));
  const totalPop = sum([ruralPop, urbanPop]);
  const femalePop = sum([
    areaType === 'urban' ? null : sum(group.ruralAdmin.map((r) => r.female_pop_2026)),
    areaType === 'rural' ? null : sum(group.urbanAdmin.map((r) => r.female_pop_2026)),
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
    femalePop,
    raw_health_centers: healthCenters,
    raw_active_shg: activeShg,
    raw_milch_animals: sum(group.ruralLivelihood.map((r) => r.milch_animals_count)),
    dropoutRate: dropoutRate ?? null,
  };
}

function districtsToRadar(districts) {
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
  return Object.fromEntries(Object.entries(scores).map(([key, value]) => [key, Math.round(value / count)]));
}

function buildPayload(groups, areaType = 'all') {
  const getFilteredData = (mapper) => {
    return Array.from(groups.values()).flatMap((group) => {
      if (areaType === 'rural') return mapper({ ...group, urbanAdmin: [], urbanEdu: [], urbanHealth: [], urbanEconomy: [], urbanSocial: [], urbanInfra: [], urbanWater: [], urbanEnv: [], urbanTourism: [] });
      if (areaType === 'urban') return mapper({ ...group, ruralAdmin: [], ruralEdu: [], ruralLivelihood: [], ruralHealth: [], ruralEconomy: [], ruralSocial: [], ruralInfra: [], ruralWater: [], ruralEnv: [], ruralTourism: [] });
      return mapper(group);
    });
  };

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
  const totalPop = districts.reduce((acc, row) => acc + (row.totalPop ?? 0), 0);

  const ruralWaterPct = areaType === 'urban' ? null : avg(Array.from(groups.values()).flatMap((group) => group.ruralWater.map((r) => r.tap_connection_pct)));
  const urbanWaterPct = areaType === 'rural' ? null : avg(Array.from(groups.values()).flatMap((group) => group.urbanWater.map((r) => r.tap_connection_pct)));
  const irrigatedHa = areaType === 'urban' ? null : sum(Array.from(groups.values()).flatMap((group) => group.ruralLivelihood.map((r) => r.irrigated_area_hectare)));
  const cultivableHa = areaType === 'urban' ? null : sum(Array.from(groups.values()).flatMap((group) => group.ruralLivelihood.map((r) => r.cultivable_land_hectare)));
  const dailyMilk = areaType === 'urban' ? null : sum(Array.from(groups.values()).flatMap((group) => group.ruralLivelihood.map((r) => r.daily_milk_prod_litres)));
  const lakhpati = areaType === 'urban' ? null : sum(Array.from(groups.values()).flatMap((group) => group.ruralEconomy.map((r) => r.lakhpati_didis_count)));
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
      ['Data rows', `${groups.size.toLocaleString('en-IN')} district groups`],
      ['Status', 'Education tables pending data load'],
    ],
    topGps: {
      rural_health: Array.from(groups.values()).flatMap(g => g.ruralHealth)
        .filter(r => (r.allopathic_centers || 0) > 0)
        .sort((a, b) => (b.allopathic_centers || 0) - (a.allopathic_centers || 0))
        .slice(0, 5)
        .map(r => ({ n: r.n, d: r.d, v: r.allopathic_centers })),
      urban_health: Array.from(groups.values()).flatMap(g => g.urbanHealth)
        .filter(r => (r.allopathic_centers || 0) > 0)
        .sort((a, b) => (b.allopathic_centers || 0) - (a.allopathic_centers || 0))
        .slice(0, 5)
        .map(r => ({ n: r.n, d: r.d, v: r.allopathic_centers })),
    },
    source: 'live',
    lastUpdated: new Date().toISOString(),
  };
}

// --- OPTIMIZED BATCH FETCHING LOGIC ---
async function fetchAllWithConcurrency(table, select = '*') {
  const PAGE_SIZE = 1000;
  
  console.log(`  Starting query on table: ${table}`);
  const { count, error: countErr } = await supabase.from(table).select('*', { count: 'exact', head: true });
  if (countErr) throw countErr;
  if (!count || count === 0) return [];

  console.log(`  Fetching ${count} rows from ${table} (${Math.ceil(count/PAGE_SIZE)} pages)...`);
  const numPages = Math.ceil(count / PAGE_SIZE);
  const results = [];
  
  // Fetch pages in small batches to avoid rate limiting
  for (let i = 0; i < numPages; i += 5) {
    const pagePromises = [];
    for (let j = i; j < Math.min(i + 5, numPages); j++) {
      const from = j * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      pagePromises.push(
        supabase.from(table).select(select).range(from, to).then(res => {
          if (res.error) throw res.error;
          return res.data || [];
        })
      );
    }
    const batchResults = await Promise.all(pagePromises);
    batchResults.forEach(page => results.push(...page));
  }
  
  return results;
}

async function seed() {
  try {
    console.log('=== STARTING OPTIMIZED CACHE SEEDER ===\n');
    const start = Date.now();

    // Fetch dimension and fact tables sequentially to avoid server overload
    const ruralDimsRes = await fetchAllWithConcurrency('dim_rural_gps', 'gp_id, district, block, gram_panchayat');
    const ruralAdminRes = await fetchAllWithConcurrency('fact_rural_admin');
    const ruralEduRes = await fetchAllWithConcurrency('fact_rural_education');
    const ruralLivRes = await fetchAllWithConcurrency('fact_rural_livelihood');
    const ruralHealthRes = await fetchAllWithConcurrency('fact_rural_health');
    const ruralEcoRes = await fetchAllWithConcurrency('fact_rural_economy');
    const ruralSocialRes = await fetchAllWithConcurrency('fact_rural_social');
    const ruralInfraRes = await fetchAllWithConcurrency('fact_rural_infra');
    const ruralWaterRes = await fetchAllWithConcurrency('fact_rural_water');
    const ruralEnvRes = await fetchAllWithConcurrency('fact_rural_environment');
    const ruralTourRes = await fetchAllWithConcurrency('fact_rural_tourism');

    const urbanDimsRes = await fetchAllWithConcurrency('dim_urban_wards', 'ward_id, district, ulb, ward');
    const urbanAdminRes = await fetchAllWithConcurrency('fact_urban_admin');
    const urbanEduRes = await fetchAllWithConcurrency('fact_urban_education');
    const urbanHealthRes = await fetchAllWithConcurrency('fact_urban_health');
    const urbanEcoRes = await fetchAllWithConcurrency('fact_urban_economy');
    const urbanSocialRes = await fetchAllWithConcurrency('fact_urban_social');
    const urbanInfraRes = await fetchAllWithConcurrency('fact_urban_infra');
    const urbanWaterRes = await fetchAllWithConcurrency('fact_urban_water');
    const urbanEnvRes = await fetchAllWithConcurrency('fact_urban_environment');
    const urbanTourRes = await fetchAllWithConcurrency('fact_urban_tourism');

    console.log(`\nAll tables loaded in ${((Date.now() - start) / 1000).toFixed(1)}s. Mapping and calculating KPIs...`);

    const groups = new Map();
    const ruralDims = ruralDimsRes ?? [];
    const urbanDims = urbanDimsRes ?? [];

    const ruralAdminMap = new Map(ruralAdminRes.map(row => [row.gp_id, row]));
    const ruralEduMap = new Map(ruralEduRes.map(row => [row.gp_id, row]));
    const ruralLivMap = new Map(ruralLivRes.map(row => [row.gp_id, row]));
    const ruralHealthMap = new Map(ruralHealthRes.map(row => [row.gp_id, row]));
    const ruralEcoMap = new Map(ruralEcoRes.map(row => [row.gp_id, row]));
    const ruralSocialMap = new Map(ruralSocialRes.map(row => [row.gp_id, row]));
    const ruralInfraMap = new Map(ruralInfraRes.map(row => [row.gp_id, row]));
    const ruralWaterMap = new Map(ruralWaterRes.map(row => [row.gp_id, row]));
    const ruralEnvMap = new Map(ruralEnvRes.map(row => [row.gp_id, row]));
    const ruralTourMap = new Map(ruralTourRes.map(row => [row.gp_id, row]));

    const urbanAdminMap = new Map(urbanAdminRes.map(row => [row.ward_id, row]));
    const urbanEduMap = new Map(urbanEduRes.map(row => [row.ward_id, row]));
    const urbanHealthMap = new Map(urbanHealthRes.map(row => [row.ward_id, row]));
    const urbanEcoMap = new Map(urbanEcoRes.map(row => [row.ward_id, row]));
    const urbanSocialMap = new Map(urbanSocialRes.map(row => [row.ward_id, row]));
    const urbanInfraMap = new Map(urbanInfraRes.map(row => [row.ward_id, row]));
    const urbanWaterMap = new Map(urbanWaterRes.map(row => [row.ward_id, row]));
    const urbanEnvMap = new Map(urbanEnvRes.map(row => [row.ward_id, row]));
    const urbanTourMap = new Map(urbanTourRes.map(row => [row.ward_id, row]));

    ruralDims.forEach((row) => {
      addRows(groups, row.district, 'gps', row);
      const group = groups.get(row.district);
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
      if (admin) group.ruralAdmin.push({ ...admin, n: row.gram_panchayat, d: row.district });
      if (edu) group.ruralEdu.push({ ...edu, n: row.gram_panchayat, d: row.district });
      if (liv) group.ruralLivelihood.push({ ...liv, n: row.gram_panchayat, d: row.district });
      if (health) group.ruralHealth.push({ ...health, n: row.gram_panchayat, d: row.district });
      if (eco) group.ruralEconomy.push({ ...eco, n: row.gram_panchayat, d: row.district });
      if (social) group.ruralSocial.push({ ...social, n: row.gram_panchayat, d: row.district });
      if (infra) group.ruralInfra.push({ ...infra, n: row.gram_panchayat, d: row.district });
      if (water) group.ruralWater.push({ ...water, n: row.gram_panchayat, d: row.district });
      if (env) group.ruralEnv.push({ ...env, n: row.gram_panchayat, d: row.district });
      if (tour) group.ruralTourism.push({ ...tour, n: row.gram_panchayat, d: row.district });
    });

    urbanDims.forEach((row) => {
      const urbanDistrict = row.district;
      if (!urbanDistrict) return;
      addRows(groups, urbanDistrict, 'wards', row);
      const group = groups.get(urbanDistrict);
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
      if (admin) group.urbanAdmin.push({ ...admin, n: row.ward, d: urbanDistrict });
      if (edu) group.urbanEdu.push({ ...edu, n: row.ward, d: urbanDistrict });
      if (health) group.urbanHealth.push({ ...health, n: row.ward, d: urbanDistrict });
      if (eco) group.urbanEconomy.push({ ...eco, n: row.ward, d: urbanDistrict });
      if (social) group.urbanSocial.push({ ...social, n: row.ward, d: urbanDistrict });
      if (infra) group.urbanInfra.push({ ...infra, n: row.ward, d: urbanDistrict });
      if (water) group.urbanWater.push({ ...water, n: row.ward, d: urbanDistrict });
      if (env) group.urbanEnv.push({ ...env, n: row.ward, d: urbanDistrict });
      if (tour) group.urbanTourism.push({ ...tour, n: row.ward, d: urbanDistrict });
    });

    console.log(`Processing ${groups.size} district groups...`);

    // Prepare to upsert caches
    const cacheRows = [];

    // 1. STATE LEVEL COMBINATIONS
    ['all', 'rural', 'urban'].forEach(areaType => {
      console.log(`- Building state KPI payload for areaType: ${areaType}`);
      const payload = buildPayload(groups, areaType);
      cacheRows.push({
        cache_key: `state_${areaType}`,
        district: null,
        area_type: areaType,
        kpi_data: payload,
        computed_at: new Date().toISOString()
      });
    });

    // 2. DISTRICT LEVEL COMBINATIONS (For instant single-district view)
    // We need to loop over all districts present in groups and generate a payload for each.
    for (const districtName of Array.from(groups.keys())) {
      const districtGroup = groups.get(districtName);
      // To generate a payload specifically for a single district, we create a mini-map with just that district
      const singleDistrictMap = new Map([[districtName, districtGroup]]);
      
      ['all', 'rural', 'urban'].forEach(areaType => {
        const payload = buildPayload(singleDistrictMap, areaType);
        const sanitizedKey = districtName.replace(/\s+/g, '_');
        cacheRows.push({
          cache_key: `district_${sanitizedKey}_${areaType}`,
          district: districtName,
          area_type: areaType,
          kpi_data: payload,
          computed_at: new Date().toISOString()
        });
      });
    }

    console.log(`Generated ${cacheRows.length} cache entries. Upserting to cache_dashboard_kpis...`);

    // Upsert batches to avoid rate limits
    for (let i = 0; i < cacheRows.length; i += 10) {
      const batch = cacheRows.slice(i, i + 10);
      const { error } = await supabase.from('cache_dashboard_kpis').upsert(batch);
      if (error) {
        console.error(`  Failed to upsert batch starting at index ${i}: ${error.message}`);
      } else {
        console.log(`  Upserted batch ${i} to ${Math.min(i + 10, cacheRows.length)} successfully.`);
      }
    }

    console.log(`\n=== CACHE SUCCESSFULLY POPULATED IN ${((Date.now() - start) / 1000).toFixed(1)}s ===`);

  } catch (err) {
    console.error('FATAL ERROR SEEDING CACHE:', JSON.stringify(err, null, 2), err.stack || err);
  }
}

seed();
