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

type TableScope = 'rural' | 'urban';

type TableRegistryEntry = {
  table: string;
  idColumn: 'gp_id' | 'ward_id';
  columns: string[];
};

type BaselineRows = {
  rural: Record<string, any[]>;
  urban: Record<string, any[]>;
};

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
    rural: number;
    urban: number;
    total: number;
    male: number;
    female: number;
    children06: number;
    children614: number;
    children1418: number;
    seniors: number;
    pwd: number;
    totalFamilies: number;
    bplFamilies: number;
    nfsaFamilies: number;
    puccaHouses: number;
    kutchaHouses: number;
    totalAreaHectare: number;
  };
  water: {
    ruralFhtcAvg: number;
    urbanFhtcAvg: number;
    overheadTanks: number;
    handpumpHomes: number;
    groundwaterDepthAvg: number;
    roFacilities: number;
    waterQualityTestFrequency: number;
    tankerHomes: number;
  };
  agriculture: {
    cultivableLand: number;
    irrigatedLand: number;
    irrigationCoverage: number;
    netSownArea: number;
    kharifArea: number;
    kharifProduction: number;
    rabiArea: number;
    rabiProduction: number;
    totalFarmers: number;
    smallFarmers: number;
    mediumFarmers: number;
    largeFarmers: number;
    kccHolders: number;
    pmKisan: number;
    soilHealthCards: number;
    cropInsurance: number;
    fpoCount: number;
    dripSprinklerFarmers: number;
    solarPumps: number;
    agriElectricityConn: number;
    govtVetCenters: number;
  };
  dairy: {
    totalLivestock: number;
    milchAnimals: number;
    dailyMilkProduction: number;
    annualDairyPotentialCr: number;
    milkCollectionCenters: number;
    goatFarms: number;
    poultryFarms: number;
    horticultureArea: number;
    organicFarmingArea: number;
    manglaPashuBimaBen: number;
  };
  health: {
    allopathicCenters: number;
    ayushCenters: number;
    privateHealthCenters: number;
    healthBeds: number;
    workingHealthStaff: number;
    avgDailyPatients: number;
    ayushmanBeneficiaries: number;
    janaadharPct: number;
    tbPatients: number;
    anemicPregnant: number;
    phcDistKm: number;
    chcDistKm: number;
    hypertensionScreening: number;
    diabetesScreening: number;
    awcCenters: number;
    ashaWorkers: number;
    samChildren: number;
    anganwadiWorkers: number;
    anganwadiHelpers: number;
    anganwadiEnrolledChildren: number;
    anganwadiPregnantWomen: number;
  };
  education: {
    govtSchools: number;
    pvtSchools: number;
    totalSchools: number;
    usefulRooms: number;
    workingTeachers: number;
    sanctionedTeachers: number;
    computersAvailable: number;
    totalEnrolledStudents: number;
    dropoutChildren: number;
    skillCenters: number;
    govtHostels: number;
    higherEduInstitutes: number;
    urbanGovtSchools: number;
    urbanPvtSchools: number;
    urbanTeachers: number;
  };
  social: {
    oldAgePensioners: number;
    widowPensioners: number;
    pwdPensioners: number;
    ujjwalaBeneficiaries: number;
    awasBeneficiaries: number;
    urbanWidow: number;
    urbanAwas: number;
  };
  economy: {
    activeShgs: number;
    womenInShgs: number;
    lakhpatiDidis: number;
    millionaireDidis: number;
    localArtisans: number;
    largeIndustrialUnits: number;
    smallScaleIndustries: number;
    mudraBeneficiaries: number;
    urbanShgs: number;
  };
  infrastructure: {
    housesWithElectricity: number;
    roadLengthKm: number;
    govtBanks: number;
    privateBanks: number;
    postOffices: number;
    publicToilets: number;
    solarHomes: number;
    avgElectricityHours: number;
    streetLights: number;
    distBusStandKm: number;
    distMainMarketKm: number;
    distRailwayStationKm: number;
  };
  governance: {
    distPoliceKm: number;
    distEmitraKm: number;
    distLpgKm: number;
    urbanPoliceKm: number;
    urbanEmitraKm: number;
  };
  environment: {
    forestArea: number;
    pastureArea: number;
    housesWithToilets: number;
    doorToDoorCollectionHouses: number;
    wasteDumpSites: number;
    totalWasteKgDay: number;
    wetWasteKgDay: number;
    dryWasteKgDay: number;
    compostPits: number;
    mrfSheds: number;
    biogasPlants: number;
    pmSuryaGharHomes: number;
    govtNurseries: number;
    nurserySaplingsAvailable: number;
    housesWithoutToilets: number;
  };
  tourism: {
    culturalAssets: number;
    dailyCulturalFootfall: number;
    annualFairs: number;
    dailyFairFootfall: number;
    temporaryFairStalls: number;
    fairEmployment: number;
    trainedGuides: number;
    shgOperatedStalls: number;
    annualVisitors: number;
  };
};

export type QuickQuery = string;

export const DISTRICTS_EN = [
  'Ajmer','Alwar','Balotara','Banswara','Baran','Barmer','Beawar','Bharatpur','Bhilwara','Bikaner','Bundi','Chittorgarh','Churu','Dausa','Deeg','Dholpur','Didwana-Kuchaman','Dungarpur','Hanumangarh','Jaipur','Jaisalmer','Jalore','Jhalawar','Jhunjhunu','Jodhpur','Karauli','Khairthal-Tijara','Kota','Kotputli-Behror','Nagaur','Pali','Phalodi','Pratapgarh','Rajsamand','Salumbar','Sawai Madhopur','Sikar','Sirohi','Sri Ganganagar','Tonk','Udaipur'
];

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

const DISTRICT_HINDI_VARIANTS: Record<string, string> = {
  ajmer: 'Ajmer', 'अजमेर': 'Ajmer',
  alwar: 'Alwar', 'अलवर': 'Alwar',
  balotara: 'Balotara', 'बालोतरा': 'Balotara',
  banswara: 'Banswara', 'बांसवाड़ा': 'Banswara',
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
  jhunjhunu: 'Jhunjhunu', 'झुंझुनू': 'Jhunjhunu',
  jodhpur: 'Jodhpur', 'जोधपुर': 'Jodhpur',
  karauli: 'Karauli', 'करौली': 'Karauli',
  kota: 'Kota', 'कोटा': 'Kota',
  khairthal: 'Khairthal-Tijara', 'tijara': 'Khairthal-Tijara', 'खैरथल': 'Khairthal-Tijara',
  kotputli: 'Kotputli-Behror', 'behror': 'Kotputli-Behror', 'कोटपुतली': 'Kotputli-Behror',
  nagaur: 'Nagaur', 'नागौर': 'Nagaur',
  pali: 'Pali', 'पाली': 'Pali',
  phalodi: 'Phalodi', 'फलोदी': 'Phalodi',
  pratapgarh: 'Pratapgarh', 'प्रतापगढ़': 'Pratapgarh',
  rajsamand: 'Rajsamand', 'राजसमंद': 'Rajsamand',
  salumbar: 'Salumbar', 'सलूम्बर': 'Salumbar',
  'sawai madhopur': 'Sawai Madhopur', 'सवाई माधोपुर': 'Sawai Madhopur',
  sikar: 'Sikar', 'सीकर': 'Sikar',
  sirohi: 'Sirohi', 'सिरोही': 'Sirohi',
  'sri ganganagar': 'Sri Ganganagar', 'श्री गंगानगर': 'Sri Ganganagar',
  tonk: 'Tonk', 'टोंक': 'Tonk',
  udaipur: 'Udaipur', 'उदयपुर': 'Udaipur',
};

const SECTOR_KEYWORDS: Record<string, string[]> = {
  water: ['water', 'pani', 'paani', 'jal', 'fhtc', 'tap', 'groundwater', 'borewell', 'boring', 'tubewell', 'handpump', 'hand pump', 'tanker', 'ro', 'kuan', 'well', 'overhead tank', 'supply', 'connection', 'jjm'],
  agriculture: ['agriculture', 'agri', 'krishi', 'khet', 'fasal', 'irrigation', 'sinchai', 'farmer', 'kisan', 'kcc', 'soil', 'crop', 'kharif', 'rabi', 'fpo', 'solar pump', 'drip', 'sprinkler', 'pmksy', 'pm kisan'],
  dairy: ['dairy', 'dudh', 'doodh', 'milk', 'milch', 'livestock', 'pashu', 'goat', 'bakri', 'poultry', 'murgi', 'gaye', 'bhains', 'rcdf', 'saras'],
  health: ['health', 'swasthya', 'hospital', 'doctor', 'dawakhana', 'nurse', 'ayushman', 'beemari', 'tb', 'anemia', 'bed', 'asha', 'anganwadi', 'sam', 'icds', 'poshan', 'nhm'],
  education: ['education', 'shiksha', 'padhai', 'school', 'teacher', 'student', 'dropout', 'college', 'hostel', 'computer', 'bacche', 'padhna'],
  social: ['social', 'welfare', 'kalyan', 'pension', 'widow', 'vidhwa', 'old age', 'vridh', 'budhapa', 'ujjwala', 'awas', 'ghar', 'rasoi', 'pwd', 'divyang'],
  economy: ['economy', 'shg', 'samuh', 'lakhpati', 'didi', 'mudra', 'artisan', 'karigar', 'kamai', 'rozgar', 'employment', 'industry', 'loan', 'mahila', 'srlm', 'nrlm'],
  infrastructure: ['infrastructure', 'infra', 'electricity', 'bijli', 'road', 'sadak', 'bank', 'dak', 'post office', 'toilet', 'solar', 'street light', 'connectivity'],
  governance: ['governance', 'emitra', 'police', 'lpg', 'gas', 'shasan', 'prashasan', 'sarkar', 'adhikari', 'collector'],
  environment: ['environment', 'paryavaran', 'forest', 'jungle', 'waste', 'kachra', 'biogas', 'compost', 'nursery', 'surya ghar', 'pollution', 'safai', 'sbm'],
  tourism: ['tourism', 'pariyatan', 'heritage', 'fair', 'mela', 'footfall', 'guide', 'cultural', 'mandir', 'dargah', 'tourist', 'swadesh darshan'],
  population: ['population', 'jansankhya', 'male', 'female', 'purush', 'aurat', 'children', 'bachche', 'senior', 'old', 'pwd', 'bpl', 'family', 'parivar', 'house', 'ghar', 'aabadi', 'log'],
};

const TABLE_REGISTRY: Record<string, TableRegistryEntry> = {
  fact_rural_admin: { table: 'fact_rural_admin', idColumn: 'gp_id', columns: ['pop_2011','pop_2026_est','male_pop_2026','female_pop_2026','children_0_6_2026','children_6_14_2026','pop_14_18_2026','senior_citizens_2026','pwd_pop_2026','total_families_2026','bpl_families_count','nfsa_beneficiary_families','pucca_houses_2026','kutcha_houses_2026'] },
  fact_rural_livelihood: { table: 'fact_rural_livelihood', idColumn: 'gp_id', columns: ['cultivable_land_hectare','irrigated_area_hectare','net_sown_area','kharif_area_hectare','kharif_production_quintal','rabi_area_hectare','rabi_production_quintal','total_farmers_count','small_farmers_count','medium_farmers_count','large_farmers_count','kcc_holders_count','pm_cm_kisan_beneficiaries','soil_health_cards_valid','crop_insurance_farmers','fpo_count','drip_sprinkler_farmers','solar_pumps_count','agri_electricity_conn','govt_vet_centers','total_livestock_count','milch_animals_count','daily_milk_prod_litres','milk_collection_centers','goat_farms_count','poultry_farms_count','horticulture_area','organic_farming_area','mangla_pashu_bima_ben'] },
  fact_rural_health: { table: 'fact_rural_health', idColumn: 'gp_id', columns: ['allopathic_centers','ayush_centers','private_health_centers','health_center_beds','working_health_staff','avg_daily_patients','ayushman_arogya_beneficiaries','janaadhar_registered_families_pct','tb_patients_count','anemic_pregnant_women','phc_dist_km','chc_dist_km'] },
  fact_rural_education: { table: 'fact_rural_education', idColumn: 'gp_id', columns: ['anganwadi_centers','anganwadi_workers','anganwadi_helpers','anganwadi_enrolled_children','anganwadi_pregnant_women','asha_sahyogini_count','sam_children_count','govt_schools_count','pvt_schools_count','total_schools_count','useful_rooms_count','working_teachers','sanctioned_teachers_count','computers_available','total_enrolled_students','enrolled_boys_0_5','enrolled_girls_0_5','enrolled_boys_6_8','enrolled_girls_6_8','enrolled_boys_9_10','enrolled_girls_9_10','enrolled_boys_11_12','enrolled_girls_11_12','dropout_children_prev_year','skill_training_centers','govt_hostels_count','higher_edu_institutes'] },
  fact_rural_social: { table: 'fact_rural_social', idColumn: 'gp_id', columns: ['old_age_pensioners','widow_pensioners','pwd_pensioners_est','pm_ujjwala_beneficiaries','pm_cm_awas_beneficiaries'] },
  fact_rural_economy: { table: 'fact_rural_economy', idColumn: 'gp_id', columns: ['active_shg_count','women_in_shgs','lakhpati_didis_count','millionaire_didis_count','local_artisans_count','large_industrial_units','mudra_loan_beneficiaries'] },
  fact_rural_infra: { table: 'fact_rural_infra', idColumn: 'gp_id', columns: ['post_offices_count','govt_banks_count','private_banks_count','houses_with_electricity','avg_electricity_hours_daily','total_street_lights','solar_installed_houses','public_toilets','road_length_km','dist_bus_stand_km','dist_main_market_km','dist_railway_station_km'] },
  fact_rural_governance: { table: 'fact_rural_governance', idColumn: 'gp_id', columns: ['dist_police_station_km','dist_emitra_km','dist_lpg_distributor_km'] },
  fact_rural_water: { table: 'fact_rural_water', idColumn: 'gp_id', columns: ['tap_connection_pct','overhead_tanks_count','handpump_tubewell_only_houses','drinking_water_sources','groundwater_depth_meters','ro_facilities','water_quality_test_frequency','tanker_only_supply_houses'] },
  fact_rural_environment: { table: 'fact_rural_environment', idColumn: 'gp_id', columns: ['houses_with_toilets','door_to_door_collection_houses','waste_dump_sites','total_waste_daily_kg','wet_waste_daily_kg','dry_waste_daily_kg','govt_compost_pits_count','mrf_sheds_count','biogas_plants_count','pasture_land_hectare','forest_area_hectare','pm_surya_ghar_solar_houses'] },
  fact_rural_tourism: { table: 'fact_rural_tourism', idColumn: 'gp_id', columns: ['cultural_assets_count','avg_daily_footfall_cultural_sites','annual_fairs_count','avg_fair_footfall_daily','temporary_fair_stalls','fair_related_employment','registered_trained_guides'] },
  fact_urban_admin: { table: 'fact_urban_admin', idColumn: 'ward_id', columns: ['pop_2011','pop_2026_est','male_pop_2026','female_pop_2026','children_0_6_2026','children_6_14_2026','pop_14_18_2026','senior_citizens_2026','pwd_pop_2026','pucca_houses_2026','kutcha_houses_2026','total_area_hectare'] },
  fact_urban_health: { table: 'fact_urban_health', idColumn: 'ward_id', columns: ['allopathic_centers','ayush_centers','pvt_health_centers','health_center_beds','working_health_staff','avg_daily_patients','ayushman_arogya_beneficiaries','janaadhar_reg_families_pct','tb_patients_count','anemic_pregnant_women','hypertension_screening_2025_26','diabetes_screening_2025_26'] },
  fact_urban_education: { table: 'fact_urban_education', idColumn: 'ward_id', columns: ['anganwadi_centers','anganwadi_workers','anganwadi_enrolled_children','asha_sahyogini_count','sam_children_count','snp_recipients_6_72_months','govt_schools_count','pvt_schools_count','total_schools_count','total_enrolled_students','useful_rooms_count','working_teachers','sanctioned_teachers_count','computers_available','dropout_children_prev_year','govt_hostels_count'] },
  fact_urban_social: { table: 'fact_urban_social', idColumn: 'ward_id', columns: ['pm_ujjwala_beneficiaries','pm_cm_awas_beneficiaries','old_age_pensioners','widow_pensioners','pwd_pensioners_est'] },
  fact_urban_economy: { table: 'fact_urban_economy', idColumn: 'ward_id', columns: ['active_shg_count','local_artisans_count','large_industrial_units','small_scale_industries'] },
  fact_urban_infra: { table: 'fact_urban_infra', idColumn: 'ward_id', columns: ['govt_banks_count','private_banks_count','houses_with_electricity','solar_installed_houses','public_toilets_functional','road_length_km','dist_main_market_km','dist_bus_stand_km','dist_railway_station_km'] },
  fact_urban_governance: { table: 'fact_urban_governance', idColumn: 'ward_id', columns: ['dist_police_station_km','dist_emitra_km'] },
  fact_urban_water: { table: 'fact_urban_water', idColumn: 'ward_id', columns: ['tap_connection_pct','overhead_tanks_count','handpumps_count','wells_count','tanks_count','groundwater_depth_meters','water_quality_test_frequency'] },
  fact_urban_environment: { table: 'fact_urban_environment', idColumn: 'ward_id', columns: ['houses_without_toilets','govt_compost_pits_count','govt_nurseries_count','nursery_saplings_available'] },
  fact_urban_tourism: { table: 'fact_urban_tourism', idColumn: 'ward_id', columns: ['avg_fair_footfall_daily','shg_operated_stalls','registered_trained_guides'] },
};

const DISTRICT_CACHE = {
  fetchedAt: 0,
  districts: [] as string[],
};

function normalizeDistrict(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

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
  let total = 0;
  let count = 0;
  for (const row of rows) {
    const value = parseNumber(row?.[column]);
    if (value !== null) {
      total += value;
      count += 1;
    }
  }
  return count > 0 ? total / count : 0;
}

function avgPair(first: number, second: number): number {
  const values = [first, second].filter((value) => Number.isFinite(value));
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatMetric(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  return Number(value).toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function detectLanguage(text: string): 'en' | 'hi' | 'hinglish' {
  const devanagariCount = (text.match(/[\u0900-\u097F]/g) || []).length;
  const englishCount = (text.match(/[a-zA-Z]/g) || []).length;
  if (devanagariCount > 0 && englishCount > 0) return 'hinglish';
  if (devanagariCount > 0) return 'hi';
  return 'en';
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
    if (keywords.some((keyword) => q.includes(keyword))) return sector;
  }
  return null;
}

function classifyIntent(question: string): QueryIntent {
  const q = question.toLowerCase();
  const hasReport = ['report', 'brief', 'analysis', 'summary', 'full', 'detail', 'poori', 'saari', 'पूर्ण', 'सम्पूर्ण'].some((word) => q.includes(word));
  const hasComparison = ['compare', 'vs', 'versus', 'difference', 'tulna', 'comparison'].some((word) => q.includes(word));
  const hasTopBottom = ['top', 'best', 'worst', 'bottom', 'highest', 'lowest', 'sabse', 'ranking', 'rank'].some((word) => q.includes(word));
  const hasStat = ['kitne', 'kitni', 'total', 'count', 'average', 'avg', 'percentage', 'percent', '%', 'how many', 'how much'].some((word) => q.includes(word));
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

async function fetchAllFromTable(table: string, select: string, filters: Record<string, any> = {}) {
  const pageSize = 1000;
  let countQuery = supabase.from(table).select('*', { count: 'exact', head: true });

  for (const [key, value] of Object.entries(filters)) {
    countQuery = Array.isArray(value) ? countQuery.in(key, value) : countQuery.eq(key, value);
  }

  const { count, error: countError } = await countQuery;
  if (countError) throw countError;
  if (!count) return [];

  const pages = Math.ceil(count / pageSize);
  const promises: Array<Promise<any[]>> = [];

  for (let index = 0; index < pages; index += 1) {
    let query = supabase.from(table).select(select).range(index * pageSize, index * pageSize + pageSize - 1);
    for (const [key, value] of Object.entries(filters)) {
      query = Array.isArray(value) ? query.in(key, value) : query.eq(key, value);
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

  const [ruralRows, urbanRows] = await Promise.all([
    fetchAllFromTable('dim_rural_gps', 'district'),
    fetchAllFromTable('dim_urban_wards', 'district'),
  ]);

  const districts = new Set<string>();
  [...ruralRows, ...urbanRows].forEach((row: any) => {
    const district = String(row?.district || '').trim();
    if (district) districts.add(district);
  });

  DISTRICT_CACHE.fetchedAt = Date.now();
  DISTRICT_CACHE.districts = Array.from(districts).sort((left, right) => left.localeCompare(right));
  return DISTRICT_CACHE.districts;
}

async function fetchRowsByIds(scope: TableScope, ids: string[]) {
  const prefixes = scope === 'rural' ? 'fact_rural_' : 'fact_urban_';
  const entries = Object.entries(TABLE_REGISTRY).filter(([tableName]) => tableName.startsWith(prefixes));
  const result: Record<string, any[]> = {};

  for (const [tableName, config] of entries) {
    if (!ids.length) {
      result[tableName] = [];
      continue;
    }
    const rows = await fetchAllFromTable(tableName, config.columns.join(','), { [config.idColumn]: ids });
    result[tableName] = rows;
  }

  return result;
}

async function fetchDistrictBaseline(district: string) {
  const [ruralDimRows, urbanDimRows] = await Promise.all([
    fetchAllFromTable('dim_rural_gps', 'gp_id,district,block,gram_panchayat', { district }),
    fetchAllFromTable('dim_urban_wards', 'ward_id,district,ulb,ward', { district }),
  ]);

  const ruralIds = ruralDimRows.map((row: any) => row.gp_id).filter(Boolean);
  const urbanIds = urbanDimRows.map((row: any) => row.ward_id).filter(Boolean);

  const [rural, urban] = await Promise.all([
    fetchRowsByIds('rural', ruralIds),
    fetchRowsByIds('urban', urbanIds),
  ]);

  return {
    meta: {
      scope: 'district' as const,
      district,
      districts: [district],
      gpCount: ruralIds.length,
      wardCount: urbanIds.length,
      blockCount: [...new Set(ruralDimRows.map((row: any) => row.block).filter(Boolean))].length,
      ulbCount: [...new Set(urbanDimRows.map((row: any) => row.ulb).filter(Boolean))].length,
      blocks: [...new Set(ruralDimRows.map((row: any) => row.block).filter(Boolean))],
      ulbs: [...new Set(urbanDimRows.map((row: any) => row.ulb).filter(Boolean))],
      dataFound: ruralIds.length > 0 || urbanIds.length > 0,
    } satisfies BaselineMeta,
    rows: { rural, urban } satisfies BaselineRows,
  };
}

async function fetchStateBaseline() {
  const [ruralDimRows, urbanDimRows] = await Promise.all([
    fetchAllFromTable('dim_rural_gps', 'gp_id,district,block,gram_panchayat'),
    fetchAllFromTable('dim_urban_wards', 'ward_id,district,ulb,ward'),
  ]);

  const [ruralIds, urbanIds] = await Promise.all([
    fetchAllFromTable('dim_rural_gps', 'gp_id').then((rows) => rows.map((row: any) => row.gp_id).filter(Boolean)),
    fetchAllFromTable('dim_urban_wards', 'ward_id').then((rows) => rows.map((row: any) => row.ward_id).filter(Boolean)),
  ]);

  const [rural, urban] = await Promise.all([
    fetchRowsByIds('rural', ruralIds),
    fetchRowsByIds('urban', urbanIds),
  ]);

  const districts = new Set<string>();
  ruralDimRows.forEach((row: any) => row?.district && districts.add(String(row.district)));
  urbanDimRows.forEach((row: any) => row?.district && districts.add(String(row.district)));

  return {
    meta: {
      scope: 'state' as const,
      district: null,
      districts: Array.from(districts).sort((a, b) => a.localeCompare(b)),
      gpCount: ruralDimRows.length,
      wardCount: urbanDimRows.length,
      blockCount: [...new Set(ruralDimRows.map((row: any) => row.block).filter(Boolean))].length,
      ulbCount: [...new Set(urbanDimRows.map((row: any) => row.ulb).filter(Boolean))].length,
      blocks: [...new Set(ruralDimRows.map((row: any) => row.block).filter(Boolean))],
      ulbs: [...new Set(urbanDimRows.map((row: any) => row.ulb).filter(Boolean))],
      dataFound: true,
    } satisfies BaselineMeta,
    rows: { rural, urban } satisfies BaselineRows,
  };
}

function aggregateBaseline(rows: BaselineRows, meta: BaselineMeta): BaselineMetrics {
  const ruralAdmin = rows.rural.fact_rural_admin || [];
  const ruralLivelihood = rows.rural.fact_rural_livelihood || [];
  const ruralHealth = rows.rural.fact_rural_health || [];
  const ruralEducation = rows.rural.fact_rural_education || [];
  const ruralSocial = rows.rural.fact_rural_social || [];
  const ruralEconomy = rows.rural.fact_rural_economy || [];
  const ruralInfra = rows.rural.fact_rural_infra || [];
  const ruralGovernance = rows.rural.fact_rural_governance || [];
  const ruralWater = rows.rural.fact_rural_water || [];
  const ruralEnvironment = rows.rural.fact_rural_environment || [];
  const ruralTourism = rows.rural.fact_rural_tourism || [];

  const urbanAdmin = rows.urban.fact_urban_admin || [];
  const urbanHealth = rows.urban.fact_urban_health || [];
  const urbanEducation = rows.urban.fact_urban_education || [];
  const urbanSocial = rows.urban.fact_urban_social || [];
  const urbanEconomy = rows.urban.fact_urban_economy || [];
  const urbanInfra = rows.urban.fact_urban_infra || [];
  const urbanGovernance = rows.urban.fact_urban_governance || [];
  const urbanWater = rows.urban.fact_urban_water || [];
  const urbanEnvironment = rows.urban.fact_urban_environment || [];
  const urbanTourism = rows.urban.fact_urban_tourism || [];

  const ruralPopulation = sumRows(ruralAdmin, 'pop_2026_est');
  const urbanPopulation = sumRows(urbanAdmin, 'pop_2026_est');

  const population = {
    rural: ruralPopulation,
    urban: urbanPopulation,
    total: ruralPopulation + urbanPopulation,
    male: sumRows(ruralAdmin, 'male_pop_2026') + sumRows(urbanAdmin, 'male_pop_2026'),
    female: sumRows(ruralAdmin, 'female_pop_2026') + sumRows(urbanAdmin, 'female_pop_2026'),
    children06: sumRows(ruralAdmin, 'children_0_6_2026') + sumRows(urbanAdmin, 'children_0_6_2026'),
    children614: sumRows(ruralAdmin, 'children_6_14_2026') + sumRows(urbanAdmin, 'children_6_14_2026'),
    children1418: sumRows(ruralAdmin, 'pop_14_18_2026') + sumRows(urbanAdmin, 'pop_14_18_2026'),
    seniors: sumRows(ruralAdmin, 'senior_citizens_2026') + sumRows(urbanAdmin, 'senior_citizens_2026'),
    pwd: sumRows(ruralAdmin, 'pwd_pop_2026') + sumRows(urbanAdmin, 'pwd_pop_2026'),
    totalFamilies: sumRows(ruralAdmin, 'total_families_2026'),
    bplFamilies: sumRows(ruralAdmin, 'bpl_families_count'),
    nfsaFamilies: sumRows(ruralAdmin, 'nfsa_beneficiary_families'),
    puccaHouses: sumRows(ruralAdmin, 'pucca_houses_2026') + sumRows(urbanAdmin, 'pucca_houses_2026'),
    kutchaHouses: sumRows(ruralAdmin, 'kutcha_houses_2026') + sumRows(urbanAdmin, 'kutcha_houses_2026'),
    totalAreaHectare: sumRows(urbanAdmin, 'total_area_hectare'),
  };

  const water = {
    ruralFhtcAvg: avgRows(ruralWater, 'tap_connection_pct'),
    urbanFhtcAvg: avgRows(urbanWater, 'tap_connection_pct'),
    overheadTanks: sumRows(ruralWater, 'overhead_tanks_count') + sumRows(urbanWater, 'overhead_tanks_count'),
    handpumpHomes: sumRows(ruralWater, 'handpump_tubewell_only_houses') + sumRows(urbanWater, 'handpumps_count'),
    groundwaterDepthAvg: avgPair(avgRows(ruralWater, 'groundwater_depth_meters'), avgRows(urbanWater, 'groundwater_depth_meters')),
    roFacilities: sumRows(ruralWater, 'ro_facilities'),
    waterQualityTestFrequency: avgPair(avgRows(ruralWater, 'water_quality_test_frequency'), avgRows(urbanWater, 'water_quality_test_frequency')),
    tankerHomes: sumRows(ruralWater, 'tanker_only_supply_houses'),
  };

  const agriculture = {
    cultivableLand: sumRows(ruralLivelihood, 'cultivable_land_hectare'),
    irrigatedLand: sumRows(ruralLivelihood, 'irrigated_area_hectare'),
    irrigationCoverage:
      sumRows(ruralLivelihood, 'cultivable_land_hectare') > 0
        ? (sumRows(ruralLivelihood, 'irrigated_area_hectare') / sumRows(ruralLivelihood, 'cultivable_land_hectare')) * 100
        : 0,
    netSownArea: sumRows(ruralLivelihood, 'net_sown_area'),
    kharifArea: sumRows(ruralLivelihood, 'kharif_area_hectare'),
    kharifProduction: sumRows(ruralLivelihood, 'kharif_production_quintal'),
    rabiArea: sumRows(ruralLivelihood, 'rabi_area_hectare'),
    rabiProduction: sumRows(ruralLivelihood, 'rabi_production_quintal'),
    totalFarmers: sumRows(ruralLivelihood, 'total_farmers_count'),
    smallFarmers: sumRows(ruralLivelihood, 'small_farmers_count'),
    mediumFarmers: sumRows(ruralLivelihood, 'medium_farmers_count'),
    largeFarmers: sumRows(ruralLivelihood, 'large_farmers_count'),
    kccHolders: sumRows(ruralLivelihood, 'kcc_holders_count'),
    pmKisan: sumRows(ruralLivelihood, 'pm_cm_kisan_beneficiaries'),
    soilHealthCards: sumRows(ruralLivelihood, 'soil_health_cards_valid'),
    cropInsurance: sumRows(ruralLivelihood, 'crop_insurance_farmers'),
    fpoCount: sumRows(ruralLivelihood, 'fpo_count'),
    dripSprinklerFarmers: sumRows(ruralLivelihood, 'drip_sprinkler_farmers'),
    solarPumps: sumRows(ruralLivelihood, 'solar_pumps_count'),
    agriElectricityConn: sumRows(ruralLivelihood, 'agri_electricity_conn'),
    govtVetCenters: sumRows(ruralLivelihood, 'govt_vet_centers'),
  };

  const dairyProduction = sumRows(ruralLivelihood, 'daily_milk_prod_litres');
  const dairy = {
    totalLivestock: sumRows(ruralLivelihood, 'total_livestock_count'),
    milchAnimals: sumRows(ruralLivelihood, 'milch_animals_count'),
    dailyMilkProduction: dairyProduction,
    annualDairyPotentialCr: dairyProduction ? (dairyProduction * 365 * 50) / 10000000 : 0,
    milkCollectionCenters: sumRows(ruralLivelihood, 'milk_collection_centers'),
    goatFarms: sumRows(ruralLivelihood, 'goat_farms_count'),
    poultryFarms: sumRows(ruralLivelihood, 'poultry_farms_count'),
    horticultureArea: sumRows(ruralLivelihood, 'horticulture_area'),
    organicFarmingArea: sumRows(ruralLivelihood, 'organic_farming_area'),
    manglaPashuBimaBen: sumRows(ruralLivelihood, 'mangla_pashu_bima_ben'),
  };

  const health = {
    allopathicCenters: sumRows(ruralHealth, 'allopathic_centers') + sumRows(urbanHealth, 'allopathic_centers'),
    ayushCenters: sumRows(ruralHealth, 'ayush_centers') + sumRows(urbanHealth, 'ayush_centers'),
    privateHealthCenters: sumRows(ruralHealth, 'private_health_centers') + sumRows(urbanHealth, 'pvt_health_centers'),
    healthBeds: sumRows(ruralHealth, 'health_center_beds') + sumRows(urbanHealth, 'health_center_beds'),
    workingHealthStaff: sumRows(ruralHealth, 'working_health_staff') + sumRows(urbanHealth, 'working_health_staff'),
    avgDailyPatients: avgPair(avgRows(ruralHealth, 'avg_daily_patients'), avgRows(urbanHealth, 'avg_daily_patients')),
    ayushmanBeneficiaries: sumRows(ruralHealth, 'ayushman_arogya_beneficiaries') + sumRows(urbanHealth, 'ayushman_arogya_beneficiaries'),
    janaadharPct: avgPair(avgRows(ruralHealth, 'janaadhar_registered_families_pct'), avgRows(urbanHealth, 'janaadhar_reg_families_pct')),
    tbPatients: sumRows(ruralHealth, 'tb_patients_count') + sumRows(urbanHealth, 'tb_patients_count'),
    anemicPregnant: sumRows(ruralHealth, 'anemic_pregnant_women') + sumRows(urbanHealth, 'anemic_pregnant_women'),
    phcDistKm: avgRows(ruralHealth, 'phc_dist_km'),
    chcDistKm: avgRows(ruralHealth, 'chc_dist_km'),
    hypertensionScreening: sumRows(urbanHealth, 'hypertension_screening_2025_26'),
    diabetesScreening: sumRows(urbanHealth, 'diabetes_screening_2025_26'),
    awcCenters: sumRows(ruralEducation, 'anganwadi_centers') + sumRows(urbanEducation, 'anganwadi_centers'),
    ashaWorkers: sumRows(ruralEducation, 'asha_sahyogini_count') + sumRows(urbanEducation, 'asha_sahyogini_count'),
    samChildren: sumRows(ruralEducation, 'sam_children_count') + sumRows(urbanEducation, 'sam_children_count'),
    anganwadiWorkers: sumRows(ruralEducation, 'anganwadi_workers') + sumRows(urbanEducation, 'anganwadi_workers'),
    anganwadiHelpers: sumRows(ruralEducation, 'anganwadi_helpers'),
    anganwadiEnrolledChildren: sumRows(ruralEducation, 'anganwadi_enrolled_children') + sumRows(urbanEducation, 'anganwadi_enrolled_children'),
    anganwadiPregnantWomen: sumRows(ruralEducation, 'anganwadi_pregnant_women'),
  };

  const education = {
    govtSchools: sumRows(ruralEducation, 'govt_schools_count') + sumRows(urbanEducation, 'govt_schools_count'),
    pvtSchools: sumRows(ruralEducation, 'pvt_schools_count') + sumRows(urbanEducation, 'pvt_schools_count'),
    totalSchools: sumRows(ruralEducation, 'total_schools_count') + sumRows(urbanEducation, 'total_schools_count'),
    usefulRooms: sumRows(ruralEducation, 'useful_rooms_count') + sumRows(urbanEducation, 'useful_rooms_count'),
    workingTeachers: sumRows(ruralEducation, 'working_teachers') + sumRows(urbanEducation, 'working_teachers'),
    sanctionedTeachers: sumRows(ruralEducation, 'sanctioned_teachers_count') + sumRows(urbanEducation, 'sanctioned_teachers_count'),
    computersAvailable: sumRows(ruralEducation, 'computers_available') + sumRows(urbanEducation, 'computers_available'),
    totalEnrolledStudents: sumRows(ruralEducation, 'total_enrolled_students') + sumRows(urbanEducation, 'total_enrolled_students'),
    dropoutChildren: sumRows(ruralEducation, 'dropout_children_prev_year') + sumRows(urbanEducation, 'dropout_children_prev_year'),
    skillCenters: sumRows(ruralEducation, 'skill_training_centers'),
    govtHostels: sumRows(ruralEducation, 'govt_hostels_count') + sumRows(urbanEducation, 'govt_hostels_count'),
    higherEduInstitutes: sumRows(ruralEducation, 'higher_edu_institutes'),
    urbanGovtSchools: sumRows(urbanEducation, 'govt_schools_count'),
    urbanPvtSchools: sumRows(urbanEducation, 'pvt_schools_count'),
    urbanTeachers: sumRows(urbanEducation, 'working_teachers'),
  };

  const social = {
    oldAgePensioners: sumRows(ruralSocial, 'old_age_pensioners') + sumRows(urbanSocial, 'old_age_pensioners'),
    widowPensioners: sumRows(ruralSocial, 'widow_pensioners') + sumRows(urbanSocial, 'widow_pensioners'),
    pwdPensioners: sumRows(ruralSocial, 'pwd_pensioners_est') + sumRows(urbanSocial, 'pwd_pensioners_est'),
    ujjwalaBeneficiaries: sumRows(ruralSocial, 'pm_ujjwala_beneficiaries') + sumRows(urbanSocial, 'pm_ujjwala_beneficiaries'),
    awasBeneficiaries: sumRows(ruralSocial, 'pm_cm_awas_beneficiaries') + sumRows(urbanSocial, 'pm_cm_awas_beneficiaries'),
    urbanWidow: sumRows(urbanSocial, 'widow_pensioners'),
    urbanAwas: sumRows(urbanSocial, 'pm_cm_awas_beneficiaries'),
  };

  const economy = {
    activeShgs: sumRows(ruralEconomy, 'active_shg_count') + sumRows(urbanEconomy, 'active_shg_count'),
    womenInShgs: sumRows(ruralEconomy, 'women_in_shgs'),
    lakhpatiDidis: sumRows(ruralEconomy, 'lakhpati_didis_count'),
    millionaireDidis: sumRows(ruralEconomy, 'millionaire_didis_count'),
    localArtisans: sumRows(ruralEconomy, 'local_artisans_count') + sumRows(urbanEconomy, 'local_artisans_count'),
    largeIndustrialUnits: sumRows(ruralEconomy, 'large_industrial_units') + sumRows(urbanEconomy, 'large_industrial_units'),
    smallScaleIndustries: sumRows(urbanEconomy, 'small_scale_industries'),
    mudraBeneficiaries: sumRows(ruralEconomy, 'mudra_loan_beneficiaries'),
    urbanShgs: sumRows(urbanEconomy, 'active_shg_count'),
  };

  const infrastructure = {
    housesWithElectricity: sumRows(ruralInfra, 'houses_with_electricity') + sumRows(urbanInfra, 'houses_with_electricity'),
    roadLengthKm: sumRows(ruralInfra, 'road_length_km') + sumRows(urbanInfra, 'road_length_km'),
    govtBanks: sumRows(ruralInfra, 'govt_banks_count') + sumRows(urbanInfra, 'govt_banks_count'),
    privateBanks: sumRows(ruralInfra, 'private_banks_count') + sumRows(urbanInfra, 'private_banks_count'),
    postOffices: sumRows(ruralInfra, 'post_offices_count'),
    publicToilets: sumRows(ruralInfra, 'public_toilets') + sumRows(urbanInfra, 'public_toilets_functional'),
    solarHomes: sumRows(ruralInfra, 'solar_installed_houses') + sumRows(urbanInfra, 'solar_installed_houses'),
    avgElectricityHours: avgRows(ruralInfra, 'avg_electricity_hours_daily'),
    streetLights: sumRows(ruralInfra, 'total_street_lights'),
    distBusStandKm: avgPair(avgRows(ruralInfra, 'dist_bus_stand_km'), avgRows(urbanInfra, 'dist_bus_stand_km')),
    distMainMarketKm: avgPair(avgRows(ruralInfra, 'dist_main_market_km'), avgRows(urbanInfra, 'dist_main_market_km')),
    distRailwayStationKm: avgPair(avgRows(ruralInfra, 'dist_railway_station_km'), avgRows(urbanInfra, 'dist_railway_station_km')),
  };

  const governance = {
    distPoliceKm: avgRows(ruralGovernance, 'dist_police_station_km'),
    distEmitraKm: avgRows(ruralGovernance, 'dist_emitra_km'),
    distLpgKm: avgRows(ruralGovernance, 'dist_lpg_distributor_km'),
    urbanPoliceKm: avgRows(urbanGovernance, 'dist_police_station_km'),
    urbanEmitraKm: avgRows(urbanGovernance, 'dist_emitra_km'),
  };

  const environment = {
    forestArea: sumRows(ruralEnvironment, 'forest_area_hectare'),
    pastureArea: sumRows(ruralEnvironment, 'pasture_land_hectare'),
    housesWithToilets: sumRows(ruralEnvironment, 'houses_with_toilets') + sumRows(urbanEnvironment, 'houses_without_toilets'),
    doorToDoorCollectionHouses: sumRows(ruralEnvironment, 'door_to_door_collection_houses'),
    wasteDumpSites: sumRows(ruralEnvironment, 'waste_dump_sites'),
    totalWasteKgDay: sumRows(ruralEnvironment, 'total_waste_daily_kg'),
    wetWasteKgDay: sumRows(ruralEnvironment, 'wet_waste_daily_kg'),
    dryWasteKgDay: sumRows(ruralEnvironment, 'dry_waste_daily_kg'),
    compostPits: sumRows(ruralEnvironment, 'govt_compost_pits_count') + sumRows(urbanEnvironment, 'govt_compost_pits_count'),
    mrfSheds: sumRows(ruralEnvironment, 'mrf_sheds_count'),
    biogasPlants: sumRows(ruralEnvironment, 'biogas_plants_count'),
    pmSuryaGharHomes: sumRows(ruralEnvironment, 'pm_surya_ghar_solar_houses'),
    govtNurseries: sumRows(urbanEnvironment, 'govt_nurseries_count'),
    nurserySaplingsAvailable: sumRows(urbanEnvironment, 'nursery_saplings_available'),
    housesWithoutToilets: sumRows(urbanEnvironment, 'houses_without_toilets'),
  };

  const tourism = {
    culturalAssets: sumRows(ruralTourism, 'cultural_assets_count'),
    dailyCulturalFootfall: sumRows(ruralTourism, 'avg_daily_footfall_cultural_sites'),
    annualFairs: sumRows(ruralTourism, 'annual_fairs_count'),
    dailyFairFootfall: sumRows(ruralTourism, 'avg_fair_footfall_daily') + sumRows(urbanTourism, 'avg_fair_footfall_daily'),
    temporaryFairStalls: sumRows(ruralTourism, 'temporary_fair_stalls'),
    fairEmployment: sumRows(ruralTourism, 'fair_related_employment'),
    trainedGuides: sumRows(ruralTourism, 'registered_trained_guides') + sumRows(urbanTourism, 'registered_trained_guides'),
    shgOperatedStalls: sumRows(urbanTourism, 'shg_operated_stalls'),
    annualVisitors: (sumRows(ruralTourism, 'avg_daily_footfall_cultural_sites') + sumRows(ruralTourism, 'avg_fair_footfall_daily') + sumRows(urbanTourism, 'avg_fair_footfall_daily')) * 365,
  };

  return { population, water, agriculture, dairy, health, education, social, economy, infrastructure, governance, environment, tourism };
}

function getQueryTypeInstructions(queryType: QueryType) {
  if (queryType === 'FULL_REPORT') {
    return 'Full district report hai to all 11 sectors cover karo, actual baseline numbers cite karo, har sector mein gap aur scheme-linked recommendation do.';
  }
  if (queryType === 'INTERVENTIONS') {
    return 'Sector-specific ya intervention-focused answer do. 2-3 actionable steps, har step ke saath real scheme name aur exact number cite karo.';
  }
  if (queryType === 'GP_REPORT') {
    return 'GP/ward deep dive do. Local constraints, baseline numbers, aur practical sequencing samjhao.';
  }
  if (queryType === 'COMPARISON') {
    return 'Comparison karte waqt sirf live baseline numbers use karo. Side-by-side clarity rakhna.';
  }
  return 'Direct answer do, data-first raho, aur exact numbers cite karo.';
}

function buildGeminiPrompt(context: { meta: BaselineMeta; metrics: BaselineMetrics; scopeLabel: string; queryType: QueryType; sector?: string | null; }, userQuestion: string, language: 'en' | 'hi' | 'hinglish') {
  const m = context.metrics;
  const meta = context.meta;
  const q = context.queryType;

  const languageInstruction = `LANGUAGE: Always respond in Hinglish — Hindi sentence structure with English technical terms mixed naturally. Never full Hindi, never full English. Scheme names (JJM, PMKSY, KCC, RCDF, SARAS, NHM, POSHAN, SRLM etc.), numbers, and metric names stay in English. Short, clear sentences.`;

  const baseRole = `You are Manthaan AI, planning intelligence engine for Viksit Rajasthan @ 2047 by Aasvaa Innovation Labs.
${languageInstruction}

CRITICAL RULES:
1. Use ONLY the LIVE BASELINE DATA below — never invent, estimate, or assume figures.
2. This data is fetched fresh from Supabase before this answer.
3. If a value is 0, say "baseline mein 0 recorded hai". Do not say data unavailable.
4. Keep numbers in English digits.
5. Use short, crisp sentences that government officers can scan quickly.
6. Never mention Gemini, Google, or any model name.
7. End with one concrete actionable recommendation tied to a real scheme.`;

  const lines = [
    `LOCATION: ${context.scopeLabel}`,
    `SCOPE: ${meta.scope}${meta.district ? ` | District: ${meta.district}` : ' | Statewide'}`,
    `District Count: ${meta.districts.length} | GPs: ${meta.gpCount} | Urban Wards: ${meta.wardCount} | Blocks: ${meta.blockCount} | ULBs: ${meta.ulbCount}`,
    '',
    'POPULATION:',
    `Rural: ${formatMetric(m.population.rural)} | Urban: ${formatMetric(m.population.urban)} | Total: ${formatMetric(m.population.total)}`,
    `Male: ${formatMetric(m.population.male)} | Female: ${formatMetric(m.population.female)}`,
    `Children 0-6: ${formatMetric(m.population.children06)} | 6-14: ${formatMetric(m.population.children614)} | 14-18: ${formatMetric(m.population.children1418)}`,
    `Senior citizens: ${formatMetric(m.population.seniors)} | PwD: ${formatMetric(m.population.pwd)}`,
    `Total families: ${formatMetric(m.population.totalFamilies)} | BPL: ${formatMetric(m.population.bplFamilies)} | NFSA: ${formatMetric(m.population.nfsaFamilies)}`,
    `Pucca houses: ${formatMetric(m.population.puccaHouses)} | Kutcha houses: ${formatMetric(m.population.kutchaHouses)} | Area (urban ha): ${formatMetric(m.population.totalAreaHectare, 1)}`,
    '',
    'WATER & SANITATION:',
    `Rural FHTC avg: ${formatMetric(m.water.ruralFhtcAvg, 1)}% | Urban FHTC avg: ${formatMetric(m.water.urbanFhtcAvg, 1)}%`,
    `Overhead tanks: ${formatMetric(m.water.overheadTanks)} | Handpump/handpump-home count: ${formatMetric(m.water.handpumpHomes)}`,
    `Avg groundwater depth: ${formatMetric(m.water.groundwaterDepthAvg, 1)}m | RO facilities: ${formatMetric(m.water.roFacilities)} | Water quality test frequency: ${formatMetric(m.water.waterQualityTestFrequency, 1)} | Tanker-only homes: ${formatMetric(m.water.tankerHomes)}`,
    '',
    'AGRICULTURE:',
    `Cultivable land: ${formatMetric(m.agriculture.cultivableLand, 1)} ha | Irrigated: ${formatMetric(m.agriculture.irrigatedLand, 1)} ha (${formatMetric(m.agriculture.irrigationCoverage, 1)}%)`,
    `Net sown area: ${formatMetric(m.agriculture.netSownArea, 1)} | Kharif area: ${formatMetric(m.agriculture.kharifArea, 1)} | Rabi area: ${formatMetric(m.agriculture.rabiArea, 1)}`,
    `Kharif production: ${formatMetric(m.agriculture.kharifProduction)} | Rabi production: ${formatMetric(m.agriculture.rabiProduction)}`,
    `Total farmers: ${formatMetric(m.agriculture.totalFarmers)} | Small: ${formatMetric(m.agriculture.smallFarmers)} | Medium: ${formatMetric(m.agriculture.mediumFarmers)} | Large: ${formatMetric(m.agriculture.largeFarmers)}`,
    `KCC holders: ${formatMetric(m.agriculture.kccHolders)} | PM-Kisan: ${formatMetric(m.agriculture.pmKisan)} | Soil health cards: ${formatMetric(m.agriculture.soilHealthCards)}`,
    `Crop insurance: ${formatMetric(m.agriculture.cropInsurance)} | FPOs: ${formatMetric(m.agriculture.fpoCount)} | Solar pumps: ${formatMetric(m.agriculture.solarPumps)}`,
    `Agri electricity connections: ${formatMetric(m.agriculture.agriElectricityConn)} | Govt vet centers: ${formatMetric(m.agriculture.govtVetCenters)} | Drip/sprinkler farmers: ${formatMetric(m.agriculture.dripSprinklerFarmers)}`,
    '',
    'DAIRY & LIVESTOCK:',
    `Total livestock: ${formatMetric(m.dairy.totalLivestock)} | Milch animals: ${formatMetric(m.dairy.milchAnimals)}`,
    `Daily milk production: ${formatMetric(m.dairy.dailyMilkProduction)} LPD | Est. annual dairy value: Rs ${formatMetric(m.dairy.annualDairyPotentialCr, 2)} Cr`,
    `Milk collection centers: ${formatMetric(m.dairy.milkCollectionCenters)} | Goat farms: ${formatMetric(m.dairy.goatFarms)} | Poultry farms: ${formatMetric(m.dairy.poultryFarms)}`,
    `Horticulture area: ${formatMetric(m.dairy.horticultureArea, 1)} | Organic area: ${formatMetric(m.dairy.organicFarmingArea, 1)} | Mangla Pashu Bima ben: ${formatMetric(m.dairy.manglaPashuBimaBen)}`,
    '',
    'HEALTH:',
    `Allopathic centers: ${formatMetric(m.health.allopathicCenters)} | AYUSH: ${formatMetric(m.health.ayushCenters)} | Private health centers: ${formatMetric(m.health.privateHealthCenters)}`,
    `Health beds: ${formatMetric(m.health.healthBeds)} | Health staff: ${formatMetric(m.health.workingHealthStaff)} | Avg daily patients: ${formatMetric(m.health.avgDailyPatients, 1)}`,
    `Ayushman beneficiaries: ${formatMetric(m.health.ayushmanBeneficiaries)} | Janaadhar families %: ${formatMetric(m.health.janaadharPct, 1)}`,
    `TB patients: ${formatMetric(m.health.tbPatients)} | Anemic pregnant women: ${formatMetric(m.health.anemicPregnant)}`,
    `PHC distance: ${formatMetric(m.health.phcDistKm, 1)} km | CHC distance: ${formatMetric(m.health.chcDistKm, 1)} km | Hyper screening: ${formatMetric(m.health.hypertensionScreening)} | Diabetes screening: ${formatMetric(m.health.diabetesScreening)}`,
    `AWC centers: ${formatMetric(m.health.awcCenters)} | ASHA workers: ${formatMetric(m.health.ashaWorkers)} | SAM children: ${formatMetric(m.health.samChildren)}`,
    '',
    'EDUCATION:',
    `Govt schools: ${formatMetric(m.education.govtSchools)} | Pvt schools: ${formatMetric(m.education.pvtSchools)} | Total schools: ${formatMetric(m.education.totalSchools)}`,
    `Enrolled students: ${formatMetric(m.education.totalEnrolledStudents)} | Working teachers: ${formatMetric(m.education.workingTeachers)} | Sanctioned teachers: ${formatMetric(m.education.sanctionedTeachers)} | Vacancy proxy: ${formatMetric(Math.max(m.education.sanctionedTeachers - m.education.workingTeachers, 0))}`,
    `Useful rooms: ${formatMetric(m.education.usefulRooms)} | Computers: ${formatMetric(m.education.computersAvailable)} | Dropout children: ${formatMetric(m.education.dropoutChildren)}`,
    `Skill centers: ${formatMetric(m.education.skillCenters)} | Govt hostels: ${formatMetric(m.education.govtHostels)} | Higher education institutes: ${formatMetric(m.education.higherEduInstitutes)}`,
    `Urban govt schools: ${formatMetric(m.education.urbanGovtSchools)} | Urban pvt schools: ${formatMetric(m.education.urbanPvtSchools)} | Urban teachers: ${formatMetric(m.education.urbanTeachers)}`,
    '',
    'SOCIAL WELFARE:',
    `Old age pensioners: ${formatMetric(m.social.oldAgePensioners)} | Widow pensioners: ${formatMetric(m.social.widowPensioners)} | Urban widow: ${formatMetric(m.social.urbanWidow)}`,
    `PwD pensioners: ${formatMetric(m.social.pwdPensioners)} | PM Ujjwala: ${formatMetric(m.social.ujjwalaBeneficiaries)} | PM/CM Awas: ${formatMetric(m.social.awasBeneficiaries)} | Urban Awas: ${formatMetric(m.social.urbanAwas)}`,
    '',
    'ECONOMY & SHGs:',
    `Active SHGs: ${formatMetric(m.economy.activeShgs)} | Women in SHGs: ${formatMetric(m.economy.womenInShgs)} | Urban SHGs: ${formatMetric(m.economy.urbanShgs)}`,
    `Lakhpati Didis: ${formatMetric(m.economy.lakhpatiDidis)} | Millionaire Didis: ${formatMetric(m.economy.millionaireDidis)} | Mudra beneficiaries: ${formatMetric(m.economy.mudraBeneficiaries)}`,
    `Local artisans: ${formatMetric(m.economy.localArtisans)} | Large industrial units: ${formatMetric(m.economy.largeIndustrialUnits)} | Small scale industries: ${formatMetric(m.economy.smallScaleIndustries)}`,
    '',
    'INFRASTRUCTURE:',
    `Houses with electricity: ${formatMetric(m.infrastructure.housesWithElectricity)} | Road length: ${formatMetric(m.infrastructure.roadLengthKm, 1)} km`,
    `Govt banks: ${formatMetric(m.infrastructure.govtBanks)} | Private banks: ${formatMetric(m.infrastructure.privateBanks)} | Post offices: ${formatMetric(m.infrastructure.postOffices)}`,
    `Public toilets: ${formatMetric(m.infrastructure.publicToilets)} | Solar homes: ${formatMetric(m.infrastructure.solarHomes)} | Avg electricity hours: ${formatMetric(m.infrastructure.avgElectricityHours, 1)}`,
    `Street lights: ${formatMetric(m.infrastructure.streetLights)} | Bus stand distance: ${formatMetric(m.infrastructure.distBusStandKm, 1)} km | Main market distance: ${formatMetric(m.infrastructure.distMainMarketKm, 1)} km | Railway station distance: ${formatMetric(m.infrastructure.distRailwayStationKm, 1)} km`,
    '',
    'GOVERNANCE & LAST-MILE ACCESS:',
    `Rural police distance: ${formatMetric(m.governance.distPoliceKm, 1)} km | Rural e-Mitra distance: ${formatMetric(m.governance.distEmitraKm, 1)} km | Rural LPG distributor distance: ${formatMetric(m.governance.distLpgKm, 1)} km`,
    `Urban police distance: ${formatMetric(m.governance.urbanPoliceKm, 1)} km | Urban e-Mitra distance: ${formatMetric(m.governance.urbanEmitraKm, 1)} km`,
    '',
    'ENVIRONMENT:',
    `Forest area: ${formatMetric(m.environment.forestArea, 1)} ha | Pasture area: ${formatMetric(m.environment.pastureArea, 1)} ha`,
    `Houses with toilets: ${formatMetric(m.environment.housesWithToilets)} | Houses without toilets: ${formatMetric(m.environment.housesWithoutToilets)}`,
    `Door-to-door collection houses: ${formatMetric(m.environment.doorToDoorCollectionHouses)} | Waste dump sites: ${formatMetric(m.environment.wasteDumpSites)} | Total waste: ${formatMetric(m.environment.totalWasteKgDay)} kg/day`,
    `Wet waste: ${formatMetric(m.environment.wetWasteKgDay)} kg/day | Dry waste: ${formatMetric(m.environment.dryWasteKgDay)} kg/day | Compost pits: ${formatMetric(m.environment.compostPits)} | MRF sheds: ${formatMetric(m.environment.mrfSheds)} | Biogas plants: ${formatMetric(m.environment.biogasPlants)}`,
    `PM Surya Ghar homes: ${formatMetric(m.environment.pmSuryaGharHomes)} | Govt nurseries: ${formatMetric(m.environment.govtNurseries)} | Nursery saplings available: ${formatMetric(m.environment.nurserySaplingsAvailable)}`,
    '',
    'TOURISM:',
    `Cultural assets: ${formatMetric(m.tourism.culturalAssets)} | Daily cultural footfall: ${formatMetric(m.tourism.dailyCulturalFootfall)}`,
    `Annual fairs: ${formatMetric(m.tourism.annualFairs)} | Daily fair footfall: ${formatMetric(m.tourism.dailyFairFootfall)}`,
    `Temporary fair stalls: ${formatMetric(m.tourism.temporaryFairStalls)} | Fair employment: ${formatMetric(m.tourism.fairEmployment)} | Trained guides: ${formatMetric(m.tourism.trainedGuides)}`,
    `SHG operated stalls: ${formatMetric(m.tourism.shgOperatedStalls)} | Annual visitors estimate: ${formatMetric(m.tourism.annualVisitors)}`,
    '',
    `TASK: ${getQueryTypeInstructions(q)}`,
    `Answer in Hinglish. ${q === 'FULL_REPORT' ? 'District ke liye 11 sectors cover karo.' : q === 'INTERVENTIONS' ? 'Relevant sector par actionable answer do.' : q === 'COMPARISON' ? 'Comparison data-backed rakho.' : 'Direct answer do.'}`,
    `User question: ${userQuestion}`,
  ];

  return `${baseRole}

LIVE BASELINE DATA FROM SUPABASE:
${lines.join('\n')}

Rules:
- Use the data above only.
- Never hallucinate or invent figures.
- If a value is 0, say baseline mein 0 recorded hai.
- Keep sentence length short and clear.
- End with one concrete recommendation tied to a real scheme.`;
}

function buildFallbackPrompt(userMessage: string) {
  return `You are Manthaan AI, planning intelligence engine for Viksit Rajasthan @ 2047 by Aasvaa Innovation Labs.
You must answer only from live baseline data. Live fetch failed for this request, so ask the user to retry or specify a district, GP, or ward more clearly.

User question: ${userMessage}`;
}

function buildScopeLabel(meta: BaselineMeta) {
  if (meta.scope === 'district' && meta.district) return `${meta.district} district`;
  return 'Rajasthan statewide baseline';
}

async function fetchBaselineContext(userMessage: string) {
  const availableDistricts = await getAvailableDistricts();
  const district = detectDistrict(userMessage, availableDistricts);
  const sector = detectSector(userMessage);
  const intent = classifyIntent(userMessage);
  const queryType = resolveQueryType(intent, district, sector);

  console.log(`[AI CONTEXT] intent=${intent} queryType=${queryType} district=${district || 'none'} sector=${sector || 'none'}`);

  if (district) {
    const live = await fetchDistrictBaseline(district);
    const metrics = aggregateBaseline(live.rows, live.meta);
    return {
      meta: live.meta,
      metrics,
      sector,
      queryType,
      language: detectLanguage(userMessage),
      scopeLabel: buildScopeLabel(live.meta),
      rows: live.rows,
    };
  }

  const live = await fetchStateBaseline();
  const metrics = aggregateBaseline(live.rows, live.meta);
  return {
    meta: live.meta,
    metrics,
    sector,
    queryType,
    language: detectLanguage(userMessage),
    scopeLabel: buildScopeLabel(live.meta),
    rows: live.rows,
  };
}

export async function buildChatContext(userMessage: string) {
  try {
    const live = await fetchBaselineContext(userMessage || '');
    const systemPrompt = buildGeminiPrompt(live, userMessage || '', live.language);

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
        tableCounts: {
          rural: Object.fromEntries(Object.entries(live.rows.rural).map(([table, rows]) => [table, rows.length])),
          urban: Object.fromEntries(Object.entries(live.rows.urban).map(([table, rows]) => [table, rows.length])),
        },
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