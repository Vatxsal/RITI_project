import { supabase } from '@/lib/supabase';

export type QueryIntent =
  | 'DISTRICT_FULL_REPORT'
  | 'DISTRICT_SECTOR'
  | 'STAT_LOOKUP'
  | 'COMPARISON'
  | 'TOP_BOTTOM'
  | 'GENERAL';

export type QueryType = 'FULL_REPORT' | 'INTERVENTIONS' | 'GP_REPORT' | 'COMPARISON' | 'GENERAL';

type LocationContext =
  | { type: 'district'; name: string }
  | { type: 'gp_id'; id: string; district?: string }
  | { type: 'state'; name: 'Rajasthan' }
  | null;

type BaselineMeta = {
  scope: 'district' | 'state';
  district: string | null;
  districts: string[];
  gpCount: number;
  wardCount: number;
  blockCount: number;
  ulbCount: number;
  blocks: string[];
  ulbs: string[];
  dataFound: boolean;
};

type BaselineMetrics = {
  population: {
    rural: number; urban: number; total: number;
    male: number; female: number;
    children06: number; children614: number; children1418: number;
    seniors: number; pwd: number;
    totalFamilies: number; bplFamilies: number; nfsaFamilies: number;
    puccaHouses: number; kutchaHouses: number; totalAreaHectare: number;
  };
  water: {
    ruralFhtcAvg: number; urbanFhtcAvg: number;
    overheadTanks: number; handpumpHomes: number;
    groundwaterDepthAvg: number; roFacilities: number;
    waterQualityTestFrequency: number; tankerHomes: number;
  };
  agriculture: {
    cultivableLand: number; irrigatedLand: number; irrigationCoverage: number;
    netSownArea: number; kharifArea: number; kharifProduction: number;
    rabiArea: number; rabiProduction: number;
    totalFarmers: number; smallFarmers: number; mediumFarmers: number; largeFarmers: number;
    kccHolders: number; pmKisan: number; soilHealthCards: number;
    cropInsurance: number; fpoCount: number; dripSprinklerFarmers: number;
    solarPumps: number; agriElectricityConn: number; govtVetCenters: number;
  };
  dairy: {
    totalLivestock: number; milchAnimals: number;
    dailyMilkProduction: number; annualDairyPotentialCr: number;
    milkCollectionCenters: number; goatFarms: number; poultryFarms: number;
    horticultureArea: number; organicFarmingArea: number; manglaPashuBimaBen: number;
  };
  health: {
    allopathicCenters: number; ayushCenters: number; privateHealthCenters: number;
    healthBeds: number; workingHealthStaff: number; avgDailyPatients: number;
    ayushmanBeneficiaries: number; janaadharPct: number;
    tbPatients: number; anemicPregnant: number;
    phcDistKm: number; chcDistKm: number;
    hypertensionScreening: number; diabetesScreening: number;
    awcCenters: number; ashaWorkers: number; samChildren: number;
    anganwadiWorkers: number; anganwadiHelpers: number;
    anganwadiEnrolledChildren: number; anganwadiPregnantWomen: number;
  };
  education: {
    govtSchools: number; pvtSchools: number; totalSchools: number;
    usefulRooms: number; workingTeachers: number; sanctionedTeachers: number;
    computersAvailable: number; totalEnrolledStudents: number; dropoutChildren: number;
    skillCenters: number; govtHostels: number; higherEduInstitutes: number;
    urbanGovtSchools: number; urbanPvtSchools: number; urbanTeachers: number;
  };
  social: {
    oldAgePensioners: number; widowPensioners: number; pwdPensioners: number;
    ujjwalaBeneficiaries: number; awasBeneficiaries: number;
    urbanWidow: number; urbanAwas: number;
  };
  economy: {
    activeShgs: number; womenInShgs: number; lakhpatiDidis: number;
    millionaireDidis: number; localArtisans: number;
    largeIndustrialUnits: number; smallScaleIndustries: number;
    mudraBeneficiaries: number; urbanShgs: number;
  };
  infrastructure: {
    housesWithElectricity: number; roadLengthKm: number;
    govtBanks: number; privateBanks: number; postOffices: number;
    publicToilets: number; solarHomes: number; avgElectricityHours: number;
    streetLights: number; distBusStandKm: number;
    distMainMarketKm: number; distRailwayStationKm: number;
  };
  governance: {
    distPoliceKm: number; distEmitraKm: number; distLpgKm: number;
    urbanPoliceKm: number; urbanEmitraKm: number;
  };
  environment: {
    forestArea: number; pastureArea: number; housesWithToilets: number;
    doorToDoorCollectionHouses: number; wasteDumpSites: number;
    totalWasteKgDay: number; wetWasteKgDay: number; dryWasteKgDay: number;
    compostPits: number; mrfSheds: number; biogasPlants: number;
    pmSuryaGharHomes: number; govtNurseries: number;
    nurserySaplingsAvailable: number; housesWithoutToilets: number;
  };
  tourism: {
    culturalAssets: number; dailyCulturalFootfall: number; annualFairs: number;
    dailyFairFootfall: number; temporaryFairStalls: number;
    fairEmployment: number; trainedGuides: number;
    shgOperatedStalls: number; annualVisitors: number;
  };
};

export type QuickQuery = string;

// ── District name mappings ────────────────────────────────────────────────────
// baseline_rural / baseline_urban store district in HINDI.
// aspirations / mv_aspirations_summary store district in ENGLISH.

export const DISTRICT_EN_TO_HI: Record<string, string> = {
  'Ajmer': 'अजमेर', 'Alwar': 'अलवर', 'Balotara': 'बालोतरा',
  'Banswara': 'बांसवाडा', 'Baran': 'बारां', 'Barmer': 'बाड़मेर',
  'Beawar': 'ब्यावर', 'Bharatpur': 'भरतपुर', 'Bhilwara': 'भीलवाड़ा',
  'Bikaner': 'बीकानेर', 'Bundi': 'बूंदी', 'Chittorgarh': 'चित्तौड़गढ़',
  'Churu': 'चूरू', 'Dausa': 'दौसा', 'Deeg': 'डीग',
  'Dholpur': 'धौलपुर', 'Didwana-Kuchaman': 'डीडवाना कुचामन',
  'Dungarpur': 'डूंगरपुर', 'Hanumangarh': 'हनुमानगढ़',
  'Jaipur': 'जयपुर', 'Jaisalmer': 'जैसलमेर', 'Jalore': 'जालोर',
  'Jhalawar': 'झालावाड़', 'Jhunjhunu': 'झुन्झुनू', 'Jodhpur': 'जोधपुर',
  'Karauli': 'करौली', 'Khairthal-Tijara': 'खैरथल -तिजारा',
  'Kota': 'कोटा', 'Kotputli-Behror': 'कोटपूतली-बहरोड',
  'Nagaur': 'नागौर', 'Pali': 'पाली', 'Phalodi': 'फलोदी',
  'Pratapgarh': 'प्रतापगढ़', 'Rajsamand': 'राजसमन्द',
  'Salumbar': 'सलूम्बर', 'Sawai Madhopur': 'सवाई माधोपुर',
  'Sikar': 'सीकर', 'Sirohi': 'सिरोही', 'Sri Ganganagar': 'श्री गंगानगर',
  'Tonk': 'टोंक', 'Udaipur': 'उदयपुर',
};

export const DISTRICTS_EN = Object.keys(DISTRICT_EN_TO_HI);

export const QUICK_QUERIES: QuickQuery[] = [
  'Ajmer district ka full tourism report banao',
  'Rajasthan mein sabse zyada irrigation kaun se district mein hai?',
  'Tonk mein kitne SAM children hain aur kya karna chahiye?',
  'Jaipur ki widow pension aur welfare coverage batao',
  'Bikaner ka dairy economy kitna bada hai?',
  'State mein FHTC coverage sabse kam kahan hai?',
  'Jodhpur ke SHGs aur Lakhpati Didi ki situation kya hai?',
  'Udaipur ka environment aur forest data batao',
];

// Variant spellings → English canonical name (for district detection in user messages)
const DISTRICT_HINDI_VARIANTS: Record<string, string> = {
  ajmer: 'Ajmer', 'अजमेर': 'Ajmer',
  alwar: 'Alwar', 'अलवर': 'Alwar',
  balotara: 'Balotara', 'बालोतरा': 'Balotara',
  banswara: 'Banswara', 'बांसवाड़ा': 'Banswara', 'बांसवाडा': 'Banswara',
  baran: 'Baran', 'बारां': 'Baran',
  barmer: 'Barmer', 'बाड़मेर': 'Barmer',
  beawar: 'Beawar', 'ब्यावर': 'Beawar',
  bharatpur: 'Bharatpur', 'भरतपुर': 'Bharatpur',
  bhilwara: 'Bhilwara', 'भीलवाड़ा': 'Bhilwara',
  bikaner: 'Bikaner', 'बीकानेर': 'Bikaner',
  bundi: 'Bundi', 'बूंदी': 'Bundi',
  chittorgarh: 'Chittorgarh', 'चित्तौड़गढ़': 'Chittorgarh',
  churu: 'Churu', 'चूरू': 'Churu',
  dausa: 'Dausa', 'दौसा': 'Dausa',
  deeg: 'Deeg', 'डीग': 'Deeg',
  dholpur: 'Dholpur', 'धौलपुर': 'Dholpur',
  'didwana kuchaman': 'Didwana-Kuchaman', 'didwana-kuchaman': 'Didwana-Kuchaman', 'डीडवाना कुचामन': 'Didwana-Kuchaman',
  dungarpur: 'Dungarpur', 'डूंगरपुर': 'Dungarpur',
  hanumangarh: 'Hanumangarh', 'हनुमानगढ़': 'Hanumangarh',
  jaipur: 'Jaipur', 'जयपुर': 'Jaipur',
  jaisalmer: 'Jaisalmer', 'जैसलमेर': 'Jaisalmer',
  jalore: 'Jalore', 'जालोर': 'Jalore',
  jhalawar: 'Jhalawar', 'झालावाड़': 'Jhalawar',
  jhunjhunu: 'Jhunjhunu', 'झुंझुनू': 'Jhunjhunu', 'झुन्झुनू': 'Jhunjhunu',
  jodhpur: 'Jodhpur', 'जोधपुर': 'Jodhpur',
  karauli: 'Karauli', 'करौली': 'Karauli',
  kota: 'Kota', 'कोटा': 'Kota',
  khairthal: 'Khairthal-Tijara', tijara: 'Khairthal-Tijara', 'खैरथल': 'Khairthal-Tijara',
  kotputli: 'Kotputli-Behror', behror: 'Kotputli-Behror', 'कोटपुतली': 'Kotputli-Behror',
  nagaur: 'Nagaur', 'नागौर': 'Nagaur',
  pali: 'Pali', 'पाली': 'Pali',
  phalodi: 'Phalodi', 'फलोदी': 'Phalodi',
  pratapgarh: 'Pratapgarh', 'प्रतापगढ़': 'Pratapgarh',
  rajsamand: 'Rajsamand', 'राजसमंद': 'Rajsamand', 'राजसमन्द': 'Rajsamand',
  salumbar: 'Salumbar', 'सलूम्बर': 'Salumbar',
  'sawai madhopur': 'Sawai Madhopur', 'सवाई माधोपुर': 'Sawai Madhopur',
  sikar: 'Sikar', 'सीकर': 'Sikar',
  sirohi: 'Sirohi', 'सिरोही': 'Sirohi',
  'sri ganganagar': 'Sri Ganganagar', 'श्री गंगानगर': 'Sri Ganganagar',
  tonk: 'Tonk', 'टोंक': 'Tonk',
  udaipur: 'Udaipur', 'उदयपुर': 'Udaipur',
};

const SECTOR_KEYWORDS: Record<string, string[]> = {
  water: ['water','pani','paani','jal','fhtc','tap','groundwater','borewell','boring','tubewell','handpump','hand pump','tanker','ro','kuan','well','overhead tank','supply','connection','jjm'],
  agriculture: ['agriculture','agri','krishi','khet','fasal','irrigation','sinchai','farmer','kisan','kcc','soil','crop','kharif','rabi','fpo','solar pump','drip','sprinkler','pmksy','pm kisan'],
  dairy: ['dairy','dudh','doodh','milk','milch','livestock','pashu','goat','bakri','poultry','murgi','gaye','bhains','rcdf','saras'],
  health: ['health','swasthya','hospital','doctor','dawakhana','nurse','ayushman','beemari','tb','anemia','bed','asha','anganwadi','sam','icds','poshan','nhm'],
  education: ['education','shiksha','padhai','school','teacher','student','dropout','college','hostel','computer','bacche','padhna'],
  social: ['social','welfare','kalyan','pension','widow','vidhwa','old age','vridh','budhapa','ujjwala','awas','ghar','rasoi','pwd','divyang'],
  economy: ['economy','shg','samuh','lakhpati','didi','mudra','artisan','karigar','kamai','rozgar','employment','industry','loan','mahila','srlm','nrlm'],
  infrastructure: ['infrastructure','infra','electricity','bijli','road','sadak','bank','dak','post office','toilet','solar','street light','connectivity'],
  governance: ['governance','emitra','police','lpg','gas','shasan','prashasan','sarkar','adhikari','collector'],
  environment: ['environment','paryavaran','forest','jungle','waste','kachra','biogas','compost','nursery','surya ghar','pollution','safai','sbm'],
  tourism: ['tourism','pariyatan','heritage','fair','mela','footfall','guide','cultural','mandir','dargah','tourist','swadesh darshan'],
  population: ['population','jansankhya','male','female','purush','aurat','children','bachche','senior','old','pwd','bpl','family','parivar','house','ghar','aabadi','log'],
};

// ── Aggregation helpers ───────────────────────────────────────────────────────

function parseNumber(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  const cleaned = String(value).replace(/,/g, '').replace(/%/g, '').trim();
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function sumRows(rows: any[], column: string): number {
  return rows.reduce((total, row) => total + (parseNumber(row?.[column]) ?? 0), 0);
}

function avgRows(rows: any[], column: string): number {
  let total = 0; let count = 0;
  for (const row of rows) {
    const value = parseNumber(row?.[column]);
    if (value !== null) { total += value; count += 1; }
  }
  return count > 0 ? total / count : 0;
}

function avgPair(first: number, second: number): number {
  const values = [first, second].filter((v) => Number.isFinite(v) && v > 0);
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function formatMetric(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  return Number(value).toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

// ── Intent / language detection ───────────────────────────────────────────────

function detectLanguage(text: string): 'en' | 'hi' | 'hinglish' {
  const devanagariCount = (text.match(/[\u0900-\u097F]/g) || []).length;
  const englishCount = (text.match(/[a-zA-Z]/g) || []).length;
  if (devanagariCount > 0 && englishCount > 0) return 'hinglish';
  if (devanagariCount > 0) return 'hi';
  return 'en';
}

function normalizeDistrict(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function detectDistrict(question: string, availableDistricts: string[]) {
  const normalizedQuestion = normalizeDistrict(question);
  for (const district of availableDistricts) {
    if (normalizedQuestion.includes(normalizeDistrict(district))) return district;
  }
  for (const [variant, english] of Object.entries(DISTRICT_HINDI_VARIANTS)) {
    if (normalizedQuestion.includes(normalizeDistrict(variant))) return english;
  }
  return null;
}

function detectSector(question: string): string | null {
  const q = question.toLowerCase();
  for (const [sector, keywords] of Object.entries(SECTOR_KEYWORDS)) {
    if (keywords.some((kw) => q.includes(kw))) return sector;
  }
  return null;
}

function classifyIntent(question: string): QueryIntent {
  const q = question.toLowerCase();
  const hasReport = ['report','brief','analysis','summary','full','detail','poori','saari','पूर्ण','सम्पूर्ण'].some((w) => q.includes(w));
  const hasComparison = ['compare','vs','versus','difference','tulna','comparison'].some((w) => q.includes(w));
  const hasTopBottom = ['top','best','worst','bottom','highest','lowest','sabse','ranking','rank'].some((w) => q.includes(w));
  const hasStat = ['kitne','kitni','total','count','average','avg','percentage','percent','%','how many','how much'].some((w) => q.includes(w));
  const district = detectDistrict(question, DISTRICTS_EN);
  const sector = detectSector(question);

  if (district && hasReport) return 'DISTRICT_FULL_REPORT';
  if (district && sector) return 'DISTRICT_SECTOR';
  if (district && hasStat) return 'STAT_LOOKUP';
  if (hasTopBottom) return 'TOP_BOTTOM';
  if (hasComparison) return 'COMPARISON';
  if (hasStat) return 'STAT_LOOKUP';
  return 'GENERAL';
}

function resolveQueryType(intent: QueryIntent, district: string | null, sector: string | null): QueryType {
  if (intent === 'DISTRICT_FULL_REPORT') return 'FULL_REPORT';
  if (intent === 'DISTRICT_SECTOR' || (district && sector)) return 'INTERVENTIONS';
  if (intent === 'COMPARISON' || intent === 'TOP_BOTTOM') return 'COMPARISON';
  if (intent === 'STAT_LOOKUP') return 'GENERAL';
  if (district) return 'GP_REPORT';
  return 'GENERAL';
}

function getMaxTokens(queryType: QueryType) {
  if (queryType === 'FULL_REPORT') return 3000;
  if (queryType === 'GP_REPORT' || queryType === 'COMPARISON') return 2200;
  if (queryType === 'INTERVENTIONS') return 1800;
  return 900;
}

// ── Supabase data fetching — NEW TABLES ONLY ─────────────────────────────────
// baseline_rural  → district/block/gram_panchayat in HINDI
// baseline_urban  → district/ulb/ward in HINDI
// mv_baseline_rural_district_kpis  → one aggregated row per district (Hindi)
// mv_baseline_urban_district_kpis  → one aggregated row per district (Hindi)
// mv_aspirations_summary           → district in ENGLISH

const DISTRICT_CACHE = { fetchedAt: 0, districts: [] as string[] };

/** Returns the 41 English district names — derived from DISTRICT_EN_TO_HI, no DB call needed. */
async function getAvailableDistricts(): Promise<string[]> {
  return DISTRICTS_EN;
}

/**
 * District-level baseline: one row per district from the MVs.
 * hindiDistrict = DISTRICT_EN_TO_HI[englishDistrict]
 */
async function fetchDistrictMvRows(hindiDistrict: string) {
  const [ruralRes, urbanRes] = await Promise.all([
    supabase.from('mv_baseline_rural_district_kpis').select('*').eq('district', hindiDistrict).single(),
    supabase.from('mv_baseline_urban_district_kpis').select('*').eq('district', hindiDistrict).single(),
  ]);
  return {
    rural: ruralRes.data ? [ruralRes.data] : [],
    urban: urbanRes.data ? [urbanRes.data] : [],
  };
}

/**
 * Aspirations summary for a district (English district name).
 * Uses mv_aspirations_summary — fast, pre-aggregated.
 */
async function fetchDistrictAspSummary(englishDistrict: string, sector?: string | null) {
  let query = supabase
    .from('mv_aspirations_summary')
    .select('sector, dept, item, status, fast_track, sum_qty_2030, sum_qty_2035, sum_qty_2047, total_budget, total_count')
    .in('status', ['ACCEPT', 'FUNDED', 'REVIEW'])
    .order('sum_qty_2030', { ascending: false })
    .limit(60);

  // Only filter by district if one is provided
  if (englishDistrict) {
    query = query.eq('district', englishDistrict);
  }

  if (sector && SECTOR_KEYWORDS[sector]) {
    const kws = SECTOR_KEYWORDS[sector].slice(0, 5);
    const clauses = kws.flatMap((kw) => [`sector.ilike.%${kw}%`, `dept.ilike.%${kw}%`, `item.ilike.%${kw}%`]);
    query = query.or(clauses.join(','));
  }

  const { data, error } = await query;
  if (error) { console.warn('[fetchDistrictAspSummary]', error.message); return []; }
  return data || [];
}

/**
 * Statewide: fetch all districts from MVs using DISTRICT_EN_TO_HI list.
 * Runs 41 pairs in parallel — acceptable since MVs are fast.
 */
async function fetchStateMvRows() {
  const pairs = await Promise.all(
    Object.entries(DISTRICT_EN_TO_HI).map(async ([en, hi]) => {
      const [rRes, uRes] = await Promise.all([
        supabase.from('mv_baseline_rural_district_kpis').select('*').eq('district', hi).single(),
        supabase.from('mv_baseline_urban_district_kpis').select('*').eq('district', hi).single(),
      ]);
      return { en, rural: rRes.data || null, urban: uRes.data || null };
    })
  );
  const rural = pairs.map((p) => p.rural).filter(Boolean) as any[];
  const urban = pairs.map((p) => p.urban).filter(Boolean) as any[];
  return { rural, urban };
}

async function fetchDistrictBaseline(englishDistrict: string) {
  const hindiDistrict = DISTRICT_EN_TO_HI[englishDistrict] || englishDistrict;
  const { rural, urban } = await fetchDistrictMvRows(hindiDistrict);

  const blocks = rural.length ? [...new Set((String(rural[0].blocks || '')).split(',').map((b: string) => b.trim()).filter(Boolean))] as string[] : [] as string[];
  const ulbs   = urban.length ? [...new Set((String(urban[0].ulbs  || '')).split(',').map((u: string) => u.trim()).filter(Boolean))] as string[] : [] as string[];

  return {
    meta: {
      scope: 'district' as const,
      district: englishDistrict,
      districts: [englishDistrict],
      gpCount:    Number(rural[0]?.gp_count   || 0),
      wardCount:  Number(urban[0]?.ward_count  || 0),
      blockCount: Number(rural[0]?.block_count || 0),
      ulbCount:   Number(urban[0]?.ulb_count   || 0),
      blocks,
      ulbs,
      dataFound: rural.length > 0 || urban.length > 0,
    } satisfies BaselineMeta,
    rural,
    urban,
  };
}

async function fetchStateBaseline() {
  const { rural, urban } = await fetchStateMvRows();
  return {
    meta: {
      scope: 'state' as const,
      district: null,
      districts: DISTRICTS_EN,
      gpCount:    rural.reduce((s: number, r: any) => s + Number(r.gp_count   || 0), 0),
      wardCount:  urban.reduce((s: number, u: any) => s + Number(u.ward_count  || 0), 0),
      blockCount: rural.reduce((s: number, r: any) => s + Number(r.block_count || 0), 0),
      ulbCount:   urban.reduce((s: number, u: any) => s + Number(u.ulb_count   || 0), 0),
      blocks: [],
      ulbs: [],
      dataFound: rural.length > 0,
    } satisfies BaselineMeta,
    rural,
    urban,
  };
}

// ── Aggregate MV rows → BaselineMetrics ──────────────────────────────────────
// MV columns use the same names as baseline_rural/urban but pre-aggregated.
// Rates/percentages in MVs are already averaged; counts are already summed.

function aggregateBaseline(rural: any[], urban: any[]): BaselineMetrics {
  // For percentages/rates we average across rows; for counts we sum.
  const AVG_COLS = new Set(['tap_connection_pct','groundwater_depth_meters','avg_electricity_hours_daily','phc_dist_km','chc_dist_km','dist_bus_stand_km','dist_main_market_km','dist_railway_station_km','dist_police_station_km','dist_emitra_km','dist_lpg_distributor_km','janaadhar_registered_families_pct','water_quality_test_frequency','avg_daily_patients']);

  const sumR  = (col: string) => sumRows(rural, col);
  const avgR  = (col: string) => avgRows(rural, col);
  const sumU  = (col: string) => sumRows(urban, col);
  const avgU  = (col: string) => avgRows(urban, col);
  const both  = (col: string) => sumR(col) + sumU(col);
  const avgBoth = (col: string) => avgPair(avgR(col), avgU(col));

  const ruralPop  = sumR('total_pop');
  const urbanPop  = sumU('total_pop');
  const milkLpd   = sumR('daily_milk_litres');

  return {
    population: {
      rural: ruralPop, urban: urbanPop, total: ruralPop + urbanPop,
      male:   sumR('male_pop')   + sumU('male_pop'),
      female: sumR('female_pop') + sumU('female_pop'),
      children06:   sumR('children_06')  + sumU('children_06'),
      children614:  sumR('children_614') + sumU('children_614'),
      children1418: sumR('pop_14_18')    + sumU('pop_14_18'),
      seniors: sumR('senior_citizens') + sumU('senior_citizens'),
      pwd:     sumR('pwd_pop')         + sumU('pwd_pop'),
      totalFamilies: sumR('total_families'),
      bplFamilies:   sumR('bpl_families'),
      nfsaFamilies:  sumR('nfsa_families'),
      puccaHouses:   sumR('pucca_houses') + sumU('pucca_houses'),
      kutchaHouses:  sumR('kutcha_houses') + sumU('kutcha_houses'),
      totalAreaHectare: sumU('total_area_ha'),
    },
    water: {
      ruralFhtcAvg: avgR('tap_connection_pct'),
      urbanFhtcAvg: avgU('tap_connection_pct'),
      overheadTanks:    both('overhead_tanks'),
      handpumpHomes:    sumR('handpump_only_houses') + sumU('handpump_count'),
      groundwaterDepthAvg: avgBoth('groundwater_depth_meters'),
      roFacilities:     sumR('ro_facilities'),
      waterQualityTestFrequency: avgBoth('water_quality_test_frequency'),
      tankerHomes:      sumR('tanker_only_houses'),
    },
    agriculture: {
      cultivableLand:   sumR('cultivable_land_ha'),
      irrigatedLand:    sumR('irrigated_area_ha'),
      irrigationCoverage: sumR('cultivable_land_ha') > 0
        ? (sumR('irrigated_area_ha') / sumR('cultivable_land_ha')) * 100 : 0,
      netSownArea:    sumR('net_sown_area_ha'),
      kharifArea:     sumR('kharif_area_ha'),
      kharifProduction: sumR('kharif_production_quintal'),
      rabiArea:       sumR('rabi_area_ha'),
      rabiProduction: sumR('rabi_production_quintal'),
      totalFarmers:   sumR('total_farmers'),
      smallFarmers:   sumR('small_farmers'),
      mediumFarmers:  sumR('medium_farmers'),
      largeFarmers:   sumR('large_farmers'),
      kccHolders:     sumR('kcc_holders'),
      pmKisan:        sumR('pm_cm_kisan_beneficiaries'),
      soilHealthCards: sumR('soil_health_cards'),
      cropInsurance:  sumR('crop_insurance_farmers'),
      fpoCount:       sumR('fpo_count'),
      dripSprinklerFarmers: sumR('drip_sprinkler_farmers'),
      solarPumps:     sumR('solar_pumps'),
      agriElectricityConn: sumR('agri_electricity_connections'),
      govtVetCenters: sumR('govt_vet_centers_count'),
    },
    dairy: {
      totalLivestock:   sumR('total_livestock'),
      milchAnimals:     sumR('milch_animals'),
      dailyMilkProduction: milkLpd,
      annualDairyPotentialCr: milkLpd ? (milkLpd * 365 * 50) / 10000000 : 0,
      milkCollectionCenters: sumR('milk_collection_centers'),
      goatFarms:    sumR('goat_farms'),
      poultryFarms: sumR('poultry_farms'),
      horticultureArea: sumR('horticulture_area_ha'),
      organicFarmingArea: sumR('organic_farming_area_ha'),
      manglaPashuBimaBen: sumR('mangla_pashu_bima_beneficiaries'),
    },
    health: {
      allopathicCenters: both('allopathic_centers'),
      ayushCenters:      both('ayush_centers'),
      privateHealthCenters: both('private_health_centers'),
      healthBeds:   both('health_center_beds'),
      workingHealthStaff: both('working_health_staff'),
      avgDailyPatients: avgBoth('avg_daily_patients'),
      ayushmanBeneficiaries: both('ayushman_beneficiaries'),
      janaadharPct: avgBoth('janaadhar_registered_families_pct'),
      tbPatients:   both('tb_patients'),
      anemicPregnant: both('anemic_pregnant_women'),
      phcDistKm:    avgR('phc_dist_km'),
      chcDistKm:    avgR('chc_dist_km'),
      hypertensionScreening: sumU('bp_screened_fy2526'),
      diabetesScreening:     sumU('diabetes_screened_fy2526'),
      awcCenters:   both('anganwadi_centers'),
      ashaWorkers:  both('asha_workers'),
      samChildren:  both('sam_children'),
      anganwadiWorkers:        sumR('anganwadi_workers'),
      anganwadiHelpers:        sumR('anganwadi_helpers'),
      anganwadiEnrolledChildren: both('anganwadi_enrolled_children'),
      anganwadiPregnantWomen:  sumR('anganwadi_pregnant_women'),
    },
    education: {
      govtSchools:   both('govt_schools_count'),
      pvtSchools:    both('pvt_schools_count'),
      totalSchools:  both('total_schools_count'),
      usefulRooms:   both('useful_classrooms_count'),
      workingTeachers:    both('working_teachers'),
      sanctionedTeachers: both('sanctioned_teachers'),
      computersAvailable: both('computers'),
      totalEnrolledStudents: both('total_enrolled_students'),
      dropoutChildren: both('dropout_children_prev_year'),
      skillCenters:    sumR('skill_training_centers_count'),
      govtHostels:     both('govt_hostels'),
      higherEduInstitutes: sumR('higher_edu_institutions'),
      urbanGovtSchools: sumU('govt_schools_count'),
      urbanPvtSchools:  sumU('pvt_schools_count'),
      urbanTeachers:    sumU('working_teachers'),
    },
    social: {
      oldAgePensioners:    both('old_age_pensioners'),
      widowPensioners:     both('widow_pensioners'),
      pwdPensioners:       both('pwd_pensioners_est'),
      ujjwalaBeneficiaries: sumR('pm_ujjwala_beneficiaries') + sumU('pm_ujjwala_beneficiaries'),
      awasBeneficiaries:    both('pm_cm_awas_beneficiaries'),
      urbanWidow: sumU('widow_pensioners'),
      urbanAwas:  sumU('pm_cm_awas_beneficiaries'),
    },
    economy: {
      activeShgs:           both('active_shg_count'),
      womenInShgs:          sumR('women_in_shgs'),
      lakhpatiDidis:        sumR('lakhpati_didis'),
      millionaireDidis:     sumR('millionaire_didis'),
      localArtisans:        both('local_artisans_count'),
      largeIndustrialUnits: both('large_industrial_units'),
      smallScaleIndustries: sumU('small_scale_industries'),
      mudraBeneficiaries:   sumR('mudra_loan_beneficiaries'),
      urbanShgs:            sumU('active_shg_count'),
    },
    infrastructure: {
      housesWithElectricity: both('houses_with_electricity'),
      roadLengthKm:   both('road_length_km'),
      govtBanks:      both('govt_banks_count'),
      privateBanks:   both('private_banks_count'),
      postOffices:    sumR('post_offices_count'),
      publicToilets:  sumR('public_toilets') + sumU('public_toilets_functional'),
      solarHomes:     both('solar_installed_houses'),
      avgElectricityHours: avgR('avg_electricity_hours_daily'),
      streetLights:   sumR('total_street_lights'),
      distBusStandKm: avgBoth('dist_bus_stand_km'),
      distMainMarketKm: avgBoth('dist_main_market_km'),
      distRailwayStationKm: avgBoth('dist_railway_station_km'),
    },
    governance: {
      distPoliceKm: avgR('dist_police_station_km'),
      distEmitraKm: avgR('dist_emitra_km'),
      distLpgKm:    avgR('dist_lpg_distributor_km'),
      urbanPoliceKm: avgU('dist_police_station_km'),
      urbanEmitraKm: avgU('dist_emitra_km'),
    },
    environment: {
      forestArea:   sumR('forest_area_hectare'),
      pastureArea:  sumR('pasture_land_hectare'),
      housesWithToilets: sumR('houses_with_toilets'),
      housesWithoutToilets: sumU('houses_without_toilets'),
      doorToDoorCollectionHouses: sumR('dtd_collection_houses'),
      wasteDumpSites: sumR('waste_dump_sites'),
      totalWasteKgDay: sumR('total_waste_daily_kg'),
      wetWasteKgDay:   sumR('wet_waste_daily_kg'),
      dryWasteKgDay:   sumR('dry_waste_daily_kg'),
      compostPits: sumR('govt_compost_pits_count') + sumU('govt_compost_pits_count'),
      mrfSheds:    sumR('mrf_sheds'),
      biogasPlants: sumR('biogas_plants_count'),
      pmSuryaGharHomes: both('pm_surya_ghar_solar_houses'),
      govtNurseries: sumU('govt_nurseries_count'),
      nurserySaplingsAvailable: sumU('nursery_plants_count'),
    },
    tourism: {
      culturalAssets:       sumR('cultural_assets_count'),
      dailyCulturalFootfall: sumR('avg_daily_footfall_cultural_sites'),
      annualFairs:          sumR('annual_fairs_count'),
      dailyFairFootfall:    sumR('avg_fair_footfall_daily') + sumU('avg_fair_footfall_daily'),
      temporaryFairStalls:  sumR('fair_product_stalls_count'),
      fairEmployment:       sumR('fair_related_employment'),
      trainedGuides:        both('registered_trained_guides'),
      shgOperatedStalls:    sumU('fair_shg_stalls_count'),
      annualVisitors: (sumR('avg_daily_footfall_cultural_sites') + sumR('avg_fair_footfall_daily') + sumU('avg_fair_footfall_daily')) * 365,
    },
  };
}

// ── Prompt builder ────────────────────────────────────────────────────────────

function getQueryTypeInstructions(queryType: QueryType) {
  if (queryType === 'FULL_REPORT') return 'Full district report hai to all 11 sectors cover karo, actual baseline numbers cite karo, har sector mein gap aur scheme-linked recommendation do.';
  if (queryType === 'INTERVENTIONS') return 'Sector-specific ya intervention-focused answer do. 2-3 actionable steps, har step ke saath real scheme name aur exact number cite karo.';
  if (queryType === 'GP_REPORT') return 'GP/ward deep dive do. Local constraints, baseline numbers, aur practical sequencing samjhao.';
  if (queryType === 'COMPARISON') return 'Comparison karte waqt sirf live baseline numbers use karo. Side-by-side clarity rakhna.';
  return 'Direct answer do, data-first raho, aur exact numbers cite karo.';
}

function buildGeminiPrompt(
  context: { meta: BaselineMeta; metrics: BaselineMetrics; scopeLabel: string; queryType: QueryType; sector?: string | null; aspirations?: any[] },
  userQuestion: string,
  _language: 'en' | 'hi' | 'hinglish'
) {
  const m = context.metrics;
  const meta = context.meta;
  const q = context.queryType;

  const baseRole = `You are Manthaan AI, planning intelligence engine for Viksit Rajasthan @ 2047 by Aasvaa Innovation Labs.
LANGUAGE: Always respond in Hinglish — Hindi sentence structure with English technical terms mixed naturally. Scheme names (JJM, PMKSY, KCC, RCDF, SARAS, NHM, POSHAN, SRLM etc.), numbers, and metric names stay in English.

CRITICAL RULES:
1. Use ONLY the LIVE BASELINE DATA below — never invent, estimate, or assume figures.
2. This data is fetched fresh from Supabase before this answer.
3. If a value is 0, say "baseline mein 0 recorded hai". Do not say data unavailable.
4. Keep numbers in English digits. Short, crisp sentences for government officers.
5. Never mention Gemini, Google, or any model name.
6. End with one concrete actionable recommendation tied to a real scheme.`;

  const lines = [
    `LOCATION: ${context.scopeLabel}`,
    `SCOPE: ${meta.scope}${meta.district ? ` | District: ${meta.district}` : ' | Statewide'}`,
    `GPs: ${meta.gpCount} | Urban Wards: ${meta.wardCount} | Blocks: ${meta.blockCount} | ULBs: ${meta.ulbCount}`,
    '',
    'POPULATION:',
    `Rural: ${formatMetric(m.population.rural)} | Urban: ${formatMetric(m.population.urban)} | Total: ${formatMetric(m.population.total)}`,
    `Male: ${formatMetric(m.population.male)} | Female: ${formatMetric(m.population.female)}`,
    `Children 0-6: ${formatMetric(m.population.children06)} | 6-14: ${formatMetric(m.population.children614)} | 14-18: ${formatMetric(m.population.children1418)}`,
    `Senior citizens: ${formatMetric(m.population.seniors)} | PwD: ${formatMetric(m.population.pwd)}`,
    `Total families: ${formatMetric(m.population.totalFamilies)} | BPL: ${formatMetric(m.population.bplFamilies)} | NFSA: ${formatMetric(m.population.nfsaFamilies)}`,
    `Pucca houses: ${formatMetric(m.population.puccaHouses)} | Kutcha houses: ${formatMetric(m.population.kutchaHouses)}`,
    '',
    'WATER & SANITATION:',
    `Rural FHTC avg: ${formatMetric(m.water.ruralFhtcAvg, 1)}% | Urban FHTC avg: ${formatMetric(m.water.urbanFhtcAvg, 1)}%`,
    `Overhead tanks: ${formatMetric(m.water.overheadTanks)} | Handpump homes: ${formatMetric(m.water.handpumpHomes)} | Tanker-only homes: ${formatMetric(m.water.tankerHomes)}`,
    `Avg groundwater depth: ${formatMetric(m.water.groundwaterDepthAvg, 1)}m | RO facilities: ${formatMetric(m.water.roFacilities)}`,
    '',
    'AGRICULTURE:',
    `Cultivable land: ${formatMetric(m.agriculture.cultivableLand, 1)} ha | Irrigated: ${formatMetric(m.agriculture.irrigatedLand, 1)} ha (${formatMetric(m.agriculture.irrigationCoverage, 1)}%)`,
    `Total farmers: ${formatMetric(m.agriculture.totalFarmers)} | KCC holders: ${formatMetric(m.agriculture.kccHolders)} | PM-Kisan: ${formatMetric(m.agriculture.pmKisan)}`,
    `Soil health cards: ${formatMetric(m.agriculture.soilHealthCards)} | Crop insurance: ${formatMetric(m.agriculture.cropInsurance)} | FPOs: ${formatMetric(m.agriculture.fpoCount)} | Solar pumps: ${formatMetric(m.agriculture.solarPumps)}`,
    '',
    'DAIRY & LIVESTOCK:',
    `Total livestock: ${formatMetric(m.dairy.totalLivestock)} | Milch animals: ${formatMetric(m.dairy.milchAnimals)}`,
    `Daily milk: ${formatMetric(m.dairy.dailyMilkProduction)} LPD | Est. annual dairy value: Rs ${formatMetric(m.dairy.annualDairyPotentialCr, 2)} Cr`,
    `Milk centers: ${formatMetric(m.dairy.milkCollectionCenters)} | Goat farms: ${formatMetric(m.dairy.goatFarms)} | Poultry farms: ${formatMetric(m.dairy.poultryFarms)}`,
    '',
    'HEALTH:',
    `Allopathic centers: ${formatMetric(m.health.allopathicCenters)} | AYUSH: ${formatMetric(m.health.ayushCenters)} | Private: ${formatMetric(m.health.privateHealthCenters)}`,
    `Health beds: ${formatMetric(m.health.healthBeds)} | Health staff: ${formatMetric(m.health.workingHealthStaff)}`,
    `Ayushman beneficiaries: ${formatMetric(m.health.ayushmanBeneficiaries)} | TB patients: ${formatMetric(m.health.tbPatients)} | Anemic pregnant: ${formatMetric(m.health.anemicPregnant)}`,
    `AWC centers: ${formatMetric(m.health.awcCenters)} | ASHA workers: ${formatMetric(m.health.ashaWorkers)} | SAM children: ${formatMetric(m.health.samChildren)}`,
    `PHC distance: ${formatMetric(m.health.phcDistKm, 1)} km | CHC distance: ${formatMetric(m.health.chcDistKm, 1)} km`,
    '',
    'EDUCATION:',
    `Govt schools: ${formatMetric(m.education.govtSchools)} | Pvt schools: ${formatMetric(m.education.pvtSchools)} | Total: ${formatMetric(m.education.totalSchools)}`,
    `Enrolled students: ${formatMetric(m.education.totalEnrolledStudents)} | Working teachers: ${formatMetric(m.education.workingTeachers)} | Sanctioned: ${formatMetric(m.education.sanctionedTeachers)} | Vacancy: ${formatMetric(Math.max(m.education.sanctionedTeachers - m.education.workingTeachers, 0))}`,
    `Dropout children: ${formatMetric(m.education.dropoutChildren)} | Skill centers: ${formatMetric(m.education.skillCenters)} | Govt hostels: ${formatMetric(m.education.govtHostels)}`,
    '',
    'SOCIAL WELFARE:',
    `Old age pensioners: ${formatMetric(m.social.oldAgePensioners)} | Widow pensioners: ${formatMetric(m.social.widowPensioners)} | PwD: ${formatMetric(m.social.pwdPensioners)}`,
    `PM Ujjwala: ${formatMetric(m.social.ujjwalaBeneficiaries)} | PM/CM Awas: ${formatMetric(m.social.awasBeneficiaries)}`,
    '',
    'ECONOMY & SHGs:',
    `Active SHGs: ${formatMetric(m.economy.activeShgs)} | Women in SHGs: ${formatMetric(m.economy.womenInShgs)} | Lakhpati Didis: ${formatMetric(m.economy.lakhpatiDidis)}`,
    `Mudra beneficiaries: ${formatMetric(m.economy.mudraBeneficiaries)} | Local artisans: ${formatMetric(m.economy.localArtisans)} | Large industries: ${formatMetric(m.economy.largeIndustrialUnits)}`,
    '',
    'INFRASTRUCTURE:',
    `Houses with electricity: ${formatMetric(m.infrastructure.housesWithElectricity)} | Road length: ${formatMetric(m.infrastructure.roadLengthKm, 1)} km`,
    `Govt banks: ${formatMetric(m.infrastructure.govtBanks)} | Public toilets: ${formatMetric(m.infrastructure.publicToilets)} | Solar homes: ${formatMetric(m.infrastructure.solarHomes)}`,
    '',
    'GOVERNANCE:',
    `Rural police dist: ${formatMetric(m.governance.distPoliceKm, 1)} km | Rural e-Mitra dist: ${formatMetric(m.governance.distEmitraKm, 1)} km | LPG dist: ${formatMetric(m.governance.distLpgKm, 1)} km`,
    '',
    'ENVIRONMENT:',
    `Forest area: ${formatMetric(m.environment.forestArea, 1)} ha | Pasture: ${formatMetric(m.environment.pastureArea, 1)} ha | Houses with toilets: ${formatMetric(m.environment.housesWithToilets)}`,
    `Biogas plants: ${formatMetric(m.environment.biogasPlants)} | Compost pits: ${formatMetric(m.environment.compostPits)} | PM Surya Ghar homes: ${formatMetric(m.environment.pmSuryaGharHomes)}`,
    '',
    'TOURISM:',
    `Cultural assets: ${formatMetric(m.tourism.culturalAssets)} | Annual fairs: ${formatMetric(m.tourism.annualFairs)} | Daily fair footfall: ${formatMetric(m.tourism.dailyFairFootfall)}`,
    `Trained guides: ${formatMetric(m.tourism.trainedGuides)} | Fair employment: ${formatMetric(m.tourism.fairEmployment)}`,
    '',
    `TASK: ${getQueryTypeInstructions(q)}`,
  ];

  // Append live aspirations data if available
  if (context.aspirations && context.aspirations.length > 0) {
    // Group by item+dept, sum quantities, sort by qty_2030 descending
    const aspMap = new Map<string, { sector: string; dept: string; item: string; qty2030: number; qty2035: number; qty2047: number; count: number; status: string; fastTrack: boolean }>();
    for (const row of context.aspirations) {
      const key = `${row.item || ''}__${row.dept || ''}`.toLowerCase();
      const existing = aspMap.get(key);
      const q2030 = Number(row.sum_qty_2030 || row.qty_2030 || 0);
      const q2035 = Number(row.sum_qty_2035 || row.qty_2035 || 0);
      const q2047 = Number(row.sum_qty_2047 || row.qty_2047 || 0);
      const cnt   = Number(row.total_count || 1);
      if (!existing) {
        aspMap.set(key, { sector: row.sector || '', dept: row.dept || '', item: row.item || '', qty2030: q2030, qty2035: q2035, qty2047: q2047, count: cnt, status: row.status || '', fastTrack: Boolean(row.fast_track) });
      } else {
        existing.qty2030 += q2030;
        existing.qty2035 += q2035;
        existing.qty2047 += q2047;
        existing.count   += cnt;
      }
    }
    const sorted = Array.from(aspMap.values()).sort((a, b) => b.qty2030 - a.qty2030).slice(0, 20);
    lines.push('');
    lines.push('LIVE ASPIRATIONS DATA (from aspirations table — community planning demands):');
    lines.push('Item | Sector | Dept | Qty 2030 | Qty 2035 | Qty 2047 | Count | Status');
    for (const a of sorted) {
      lines.push(`${a.item} | ${a.sector} | ${a.dept} | ${formatMetric(a.qty2030)} | ${formatMetric(a.qty2035)} | ${formatMetric(a.qty2047)} | ${formatMetric(a.count)} | ${a.status}${a.fastTrack ? ' ⚡' : ''}`);
    }
    lines.push('NOTE: Use THIS aspirations data when answering questions about top aspirations, community demands, or planning priorities. Do NOT derive aspirations from baseline metrics.');
  } else {
    lines.push('');
    lines.push('ASPIRATIONS DATA: No aspiration records found for this scope/sector.');
  }

  lines.push('');
  lines.push(`User question: ${userQuestion}`);

  return `${baseRole}\n\nLIVE BASELINE DATA FROM SUPABASE:\n${lines.join('\n')}\n\nRules:\n- Use the data above only.\n- Never hallucinate or invent figures.\n- If a value is 0, say baseline mein 0 recorded hai.\n- End with one concrete recommendation tied to a real scheme.`;
}

function buildFallbackPrompt(userMessage: string) {
  return `You are Manthaan AI, planning intelligence engine for Viksit Rajasthan @ 2047 by Aasvaa Innovation Labs.
Live data fetch failed. Ask the user to retry or specify a district, GP, or ward more clearly.
User question: ${userMessage}`;
}

function buildScopeLabel(meta: BaselineMeta) {
  if (meta.scope === 'district' && meta.district) return `${meta.district} district`;
  return 'Rajasthan statewide baseline';
}

// ── Main context builder ──────────────────────────────────────────────────────

async function fetchBaselineContext(userMessage: string) {
  const district = detectDistrict(userMessage, DISTRICTS_EN);
  const sector = detectSector(userMessage);
  const intent = classifyIntent(userMessage);
  const queryType = resolveQueryType(intent, district, sector);

  console.log(`[AI CONTEXT] intent=${intent} queryType=${queryType} district=${district || 'none'} sector=${sector || 'none'}`);

  if (district) {
    const [live, aspRows] = await Promise.all([
      fetchDistrictBaseline(district),
      fetchDistrictAspSummary(district, sector),
    ]);
    const metrics = aggregateBaseline(live.rural, live.urban);
    return {
      meta: live.meta,
      metrics,
      aspirations: aspRows,
      sector,
      queryType,
      language: detectLanguage(userMessage),
      scopeLabel: buildScopeLabel(live.meta),
      tableCounts: { rural: live.rural.length, urban: live.urban.length },
    };
  }

  // Statewide — fetch top aspirations across all districts
  const [live, aspRows] = await Promise.all([
    fetchStateBaseline(),
    fetchDistrictAspSummary('', sector), // empty district = no district filter
  ]);
  const metrics = aggregateBaseline(live.rural, live.urban);
  return {
    meta: live.meta,
    metrics,
    aspirations: aspRows,
    sector,
    queryType,
    language: detectLanguage(userMessage),
    scopeLabel: buildScopeLabel(live.meta),
    tableCounts: { rural: live.rural.length, urban: live.urban.length },
  };
}

export async function buildChatContext(userMessage: string) {
  try {
    const live = await fetchBaselineContext(userMessage || '');
    const systemPrompt = buildGeminiPrompt({ ...live, aspirations: live.aspirations }, userMessage || '', live.language);

    return {
      systemPrompt,
      queryType: live.queryType,
      maxOutputTokens: getMaxTokens(live.queryType),
      contextObject: {
        meta: live.meta,
        scopeLabel: live.scopeLabel,
        sector: live.sector,
        queryType: live.queryType,
        language: live.language,
        baseline: live.metrics,
        aspirationsCount: live.aspirations?.length || 0,
        tableCounts: live.tableCounts,
        liveFetch: true,
      },
    };
  } catch (error) {
    console.error('[AI CONTEXT] Live baseline build failed:', error);
    return {
      systemPrompt: buildFallbackPrompt(userMessage || ''),
      queryType: 'GENERAL' as const,
      maxOutputTokens: 900,
      contextObject: {
        liveFetch: false,
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export async function getLiveBaselinePrompt(userMessage = '') {
  const ctx = await buildChatContext(userMessage);
  return ctx.systemPrompt;
}
