import { supabase } from '@/lib/supabase';

// ============================================================================
// INTENT TYPES & CLASSIFICATION
// ============================================================================

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

// ============================================================================
// SECTOR DETECTION MAP WITH HINDI/HINGLISH KEYWORDS
// ============================================================================

const SECTOR_MAP: Record<string, string[]> = {
  water: ['water', 'pani', 'paani', 'jal', 'fhtc', 'tap', 'groundwater', 'borewell', 'boring', 'tubewell', 'handpump', 'hand pump', 'tanker', 'ro', 'kuan', 'well', 'overhead tank', 'supply', 'connection'],
  agriculture: ['agriculture', 'agri', 'krishi', 'khet', 'fasal', 'irrigation', 'sinchai', 'bijwai', 'farmer', 'kisan', 'kcc', 'soil', 'crop', 'kharif', 'rabi', 'fpo', 'solar pump', 'drip', 'sprinkler'],
  dairy: ['dairy', 'dudh', 'doodh', 'milk', 'milch', 'livestock', 'pashu', 'goat', 'bakri', 'poultry', 'murgi', 'gaye', 'bhains'],
  health: ['health', 'swasthya', 'hospital', 'doctor', 'dawakhana', 'nurse', 'ayushman', 'beemari', 'tb', 'anemia', 'bed', 'asha', 'anganwadi', 'sam', 'icds', 'poshan'],
  education: ['education', 'shiksha', 'padhai', 'school', 'teacher', 'student', 'dropout', 'college', 'hostel', 'computer', 'bacche', 'padhna'],
  social: ['social', 'welfare', 'kalyan', 'pension', 'widow', 'vidhwa', 'old age', 'vridh', 'budhapa', 'ujjwala', 'awas', 'ghar', 'rasoi', 'pwd', 'divyang'],
  economy: ['economy', 'shg', 'samuh', 'lakhpati', 'didi', 'mudra', 'artisan', 'karigar', 'kamai', 'rozgar', 'employment', 'industry', 'loan', 'mahila'],
  infrastructure: ['infrastructure', 'infra', 'electricity', 'bijli', 'road', 'sadak', 'bank', 'dak', 'post office', 'toilet', 'solar', 'street light'],
  environment: ['environment', 'paryavaran', 'forest', 'jungle', 'waste', 'kachra', 'biogas', 'compost', 'nursery', 'surya ghar', 'pollution', 'safai'],
  tourism: ['tourism', 'pariyatan', 'heritage', 'fair', 'mela', 'footfall', 'guide', 'cultural', 'mandir', 'dargah', 'tourist'],
  population: ['population', 'jansankhya', 'male', 'female', 'purush', 'aurat', 'children', 'bachche', 'ladka', 'ladki', 'senior', 'old', 'pwd', 'bpl', 'family', 'parivar', 'house', 'ghar', 'aabadi', 'log'],
};

const SECTOR_TABLE_MAP: Record<string, Record<'rural' | 'urban', { table: string; cols: string[] } | null>> = {
  population: {
    rural: { table: 'fact_rural_admin', cols: ['pop_2026_est','male_pop_2026','female_pop_2026','children_0_6_2026','children_6_14_2026','pop_14_18_2026','senior_citizens_2026','pwd_pop_2026','total_families_2026','bpl_families_count','nfsa_beneficiary_families','pucca_houses_2026','kutcha_houses_2026'] },
    urban: { table: 'fact_urban_admin', cols: ['pop_2026_est','male_pop_2026','female_pop_2026','children_0_6_2026','children_6_14_2026','pop_14_18_2026','senior_citizens_2026','pwd_pop_2026','pucca_houses_2026','kutcha_houses_2026','total_area_hectare'] },
  },
  water: {
    rural: { table: 'fact_rural_water', cols: ['tap_connection_pct','overhead_tanks_count','handpump_tubewell_only_houses','drinking_water_sources','groundwater_depth_meters','ro_facilities','water_quality_test_frequency','tanker_only_supply_houses'] },
    urban: { table: 'fact_urban_water', cols: ['tap_connection_pct','overhead_tanks_count','handpumps_count','wells_count','tanks_count','groundwater_depth_meters','water_quality_test_frequency'] },
  },
  agriculture: {
    rural: { table: 'fact_rural_livelihood', cols: ['cultivable_land_hectare','irrigated_area_hectare','net_sown_area','kharif_area_hectare','kharif_production_quintal','rabi_area_hectare','rabi_production_quintal','total_farmers_count','small_farmers_count','medium_farmers_count','large_farmers_count','kcc_holders_count','pm_cm_kisan_beneficiaries','soil_health_cards_valid','crop_insurance_farmers','fpo_count','drip_sprinkler_farmers','solar_pumps_count','agri_electricity_conn','govt_vet_centers'] },
    urban: null,
  },
  dairy: {
    rural: { table: 'fact_rural_livelihood', cols: ['total_livestock_count','milch_animals_count','daily_milk_prod_litres','milk_collection_centers','goat_farms_count','poultry_farms_count','horticulture_area','organic_farming_area','mangla_pashu_bima_ben'] },
    urban: null,
  },
  health: {
    rural: { table: 'fact_rural_health', cols: ['allopathic_centers','ayush_centers','private_health_centers','health_center_beds','working_health_staff','avg_daily_patients','ayushman_arogya_beneficiaries','janaadhar_registered_families_pct','tb_patients_count','anemic_pregnant_women','phc_dist_km','chc_dist_km'] },
    urban: { table: 'fact_urban_health', cols: ['allopathic_centers','ayush_centers','pvt_health_centers','health_center_beds','working_health_staff','avg_daily_patients','ayushman_arogya_beneficiaries','janaadhar_reg_families_pct','tb_patients_count','anemic_pregnant_women','hypertension_screening_2025_26','diabetes_screening_2025_26'] },
  },
  education: {
    rural: { table: 'fact_rural_education', cols: ['anganwadi_centers','anganwadi_workers','anganwadi_helpers','anganwadi_enrolled_children','anganwadi_pregnant_women','asha_sahyogini_count','sam_children_count','govt_schools_count','pvt_schools_count','total_schools_count','useful_rooms_count','working_teachers','sanctioned_teachers_count','computers_available','total_enrolled_students','enrolled_boys_0_5','enrolled_girls_0_5','enrolled_boys_6_8','enrolled_girls_6_8','enrolled_boys_9_10','enrolled_girls_9_10','enrolled_boys_11_12','enrolled_girls_11_12','dropout_children_prev_year','skill_training_centers','govt_hostels_count','higher_edu_institutes'] },
    urban: { table: 'fact_urban_education', cols: ['anganwadi_centers','anganwadi_workers','anganwadi_enrolled_children','asha_sahyogini_count','sam_children_count','snp_recipients_6_72_months','govt_schools_count','pvt_schools_count','total_schools_count','school_enrolled_students','useful_rooms_count','working_teachers','sanctioned_teachers_count','computers_available','dropout_children_prev_year','govt_hostels_count'] },
  },
  social: {
    rural: { table: 'fact_rural_social', cols: ['old_age_pensioners','widow_pensioners','pwd_pensioners_est','pm_ujjwala_beneficiaries','pm_cm_awas_beneficiaries'] },
    urban: { table: 'fact_urban_social', cols: ['pm_ujjwala_beneficiaries','pm_cm_awas_beneficiaries','old_age_pensioners','widow_pensioners','pwd_pensioners_est'] },
  },
  economy: {
    rural: { table: 'fact_rural_economy', cols: ['active_shg_count','women_in_shgs','lakhpati_didis_count','millionaire_didis_count','local_artisans_count','large_industrial_units','mudra_loan_beneficiaries'] },
    urban: { table: 'fact_urban_economy', cols: ['active_shg_count','local_artisans_count','large_industrial_units','small_scale_industries'] },
  },
  infrastructure: {
    rural: { table: 'fact_rural_infra', cols: ['post_offices_count','govt_banks_count','private_banks_count','houses_with_electricity','avg_electricity_hours_daily','total_street_lights','solar_installed_houses','public_toilets','road_length_km','dist_bus_stand_km','dist_main_market_km','dist_railway_station_km'] },
    urban: { table: 'fact_urban_infra', cols: ['govt_banks_count','private_banks_count','houses_with_electricity','solar_installed_houses','public_toilets_functional','road_length_km','dist_main_market_km','dist_bus_stand_km','dist_railway_station_km'] },
  },
  environment: {
    rural: { table: 'fact_rural_environment', cols: ['houses_with_toilets','door_to_door_collection_houses','waste_dump_sites','total_waste_daily_kg','wet_waste_daily_kg','dry_waste_daily_kg','govt_compost_pits_count','mrf_sheds_count','biogas_plants_count','pasture_land_hectare','forest_area_hectare','pm_surya_ghar_solar_houses'] },
    urban: { table: 'fact_urban_environment', cols: ['houses_without_toilets','govt_compost_pits_count','govt_nurseries_count','nursery_saplings_available'] },
  },
  tourism: {
    rural: { 
      table: 'fact_rural_tourism', 
      cols: [
        'cultural_assets_count',
        'avg_daily_footfall_cultural_sites',
        'annual_fairs_count',
        'avg_fair_footfall_daily',
        'temporary_fair_stalls',
        'fair_related_employment',
        'registered_trained_guides'
      ] 
    },
    urban: { 
      table: 'fact_urban_tourism', 
      cols: [
        'avg_fair_footfall_daily',
        'shg_operated_stalls',
        'registered_trained_guides'
      ] 
    },
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function detectLanguage(text: string): 'en' | 'hi' | 'hinglish' {
  const devanagariCount = (text.match(/[\u0900-\u097F]/g) || []).length;
  const engCount = (text.match(/[a-zA-Z]/g) || []).length;
  const totalChars = text.length;

  if (devanagariCount / totalChars > 0.5) return 'hi';
  if (devanagariCount > 0 && engCount > 0) return 'hinglish';
  return 'en';
}

function classifyIntent(question: string): QueryIntent {
  const q = question.toLowerCase();
  
  const hasDistrict = /(ajmer|alwar|banswara|baran|barmer|basni|bhilwara|bikaner|bundi|chittorgarh|churu|dausa|dholpur|dungarpur|ganganagar|hanumangarh|jaisalmer|jaipur|jalor|jhalawar|jhunjhunu|jodhpur|karauli|kota|nagaur|pali|pratapgarh|rajasmand|ram nagar|sawaimadhopur|sikar|sirohi|sriganganagar|tonk|udaipur|udaypur)/i.test(q);
  
  const sectors = ['water','pani','paani','jal','agriculture','agri','krishi','khet','dairy','dudh','doodh','health','swasthya','education','shiksha','social','welfare','kalyan','economy','shg','infrastructure','infra','bijli','environment','paryavaran','tourism','pariyatan','population','jansankhya'];
  const hasSector = sectors.some(s => q.includes(s));
  
  const isTopBottom = ['top','best','worst','bottom','highest','lowest','sabse','adhik','kam','zyada','max','min','maximum','minimum'].some(w => q.includes(w));
  const isComparison = ['compare','vs','versus','difference','tulna','between','vs','aur'].some(w => q.includes(w));
  const isStat = ['kitne','total','count','average','avg','kul','kitni','kaafi','percentage','percent','%','how many','kitni','jinni'].some(w => q.includes(w));
  const isFullReport = ['full','report','सम्पूर्ण','समपूर्ण','poori','सारी','saari','summary','sammelan'].some(w => q.includes(w));

  if (isFullReport && hasDistrict) return 'DISTRICT_FULL_REPORT';
  if (hasDistrict && hasSector) return 'DISTRICT_SECTOR';
  if (hasDistrict && !hasSector && !isTopBottom) return 'DISTRICT_FULL_REPORT';
  if (isTopBottom) return 'TOP_BOTTOM';
  if (isComparison) return 'COMPARISON';
  if (isStat) return 'STAT_LOOKUP';
  return 'GENERAL';
}

function detectSector(question: string): string | null {
  const q = question.toLowerCase();
  for (const [sector, keywords] of Object.entries(SECTOR_MAP)) {
    if (keywords.some(k => q.includes(k))) return sector;
  }
  return null;
}

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

// Old table selects (still needed for full district context)
const RURAL_TABLE_SELECTS: Record<string, string> = {
  fact_rural_admin: 'gp_id,pop_2026_est,male_pop_2026,female_pop_2026,children_0_6_2026,children_6_14_2026,senior_citizens_2026,pwd_pop_2026,bpl_families_count,nfsa_beneficiary_families,pucca_houses_2026,kutcha_houses_2026',
  fact_rural_water: 'gp_id,tap_connection_pct,overhead_tanks_count,handpump_tubewell_only_houses,groundwater_depth_meters',
  fact_rural_health: 'gp_id,allopathic_centers,ayush_centers,tb_patients_count,anemic_pregnant_women,ayushman_arogya_beneficiaries,avg_daily_patients',
  fact_rural_livelihood: 'gp_id,cultivable_land_hectare,irrigated_area_hectare,total_farmers_count,kcc_holders_count,fpo_count,solar_pumps_count,daily_milk_prod_litres,milch_animals_count,total_livestock_count',
  fact_rural_economy: 'gp_id,active_shg_count,women_in_shgs,lakhpati_didis_count,millionaire_didis_count,mudra_loan_beneficiaries',
  fact_rural_social: 'gp_id,old_age_pensioners,widow_pensioners,pwd_pensioners_est,pm_ujjwala_beneficiaries,pm_cm_awas_beneficiaries',
  fact_rural_infra: 'gp_id,houses_with_electricity,road_length_km,govt_banks_count,private_banks_count',
  fact_rural_environment: 'gp_id,forest_area_hectare,total_waste_daily_kg,houses_with_toilets',
  fact_rural_tourism: 'gp_id,avg_daily_footfall_cultural_sites,cultural_assets_count,annual_fairs_count,avg_fair_footfall_daily',
  fact_rural_education: 'gp_id,govt_schools_count,pvt_schools_count,total_enrolled_students,working_teachers,sanctioned_teachers_count,anganwadi_centers,sam_children_count,dropout_children_prev_year',
  fact_rural_governance: 'gp_id',
};

const URBAN_TABLE_SELECTS: Record<string, string> = {
  fact_urban_admin: 'ward_id,pop_2026_est,male_pop_2026,female_pop_2026,children_0_6_2026,children_6_14_2026,senior_citizens_2026,pwd_pop_2026,pucca_houses_2026,kutcha_houses_2026',
  fact_urban_water: 'ward_id,tap_connection_pct,overhead_tanks_count,handpumps_count,groundwater_depth_meters',
  fact_urban_health: 'ward_id,allopathic_centers,ayush_centers,tb_patients_count,anemic_pregnant_women,ayushman_arogya_beneficiaries,avg_daily_patients',
  fact_urban_economy: 'ward_id,active_shg_count,large_industrial_units,small_scale_industries,local_artisans_count',
  fact_urban_social: 'ward_id,old_age_pensioners,widow_pensioners,pwd_pensioners_est,pm_ujjwala_beneficiaries,pm_cm_awas_beneficiaries',
  fact_urban_infra: 'ward_id,houses_with_electricity,road_length_km,govt_banks_count,private_banks_count',
  fact_urban_environment: 'ward_id,houses_without_toilets',
  fact_urban_tourism: 'ward_id,avg_fair_footfall_daily,registered_trained_guides',
  fact_urban_education: 'ward_id,govt_schools_count,pvt_schools_count,school_enrolled_students,working_teachers,sanctioned_teachers_count,anganwadi_centers,sam_children_count,dropout_children_prev_year',
  fact_urban_governance: 'ward_id',
};

// ============================================================================
// SMART DATA FETCHER FOR INTENT-BASED QUERIES
// ============================================================================

async function fetchDataForIntent(intent: QueryIntent, question: string, district: string | null, availableDistricts: string[]) {
  try {
    const sector = detectSector(question);
    
    if ((intent === 'DISTRICT_SECTOR' || intent === 'DISTRICT_FULL_REPORT') && district) {
      const normalized = normalizeDistrict(district);
      const matchedDistrict = availableDistricts.find(d => normalizeDistrict(d) === normalized);
      
      if (!matchedDistrict) return { intent, district: null, dataFound: false };

      // FIX 1 — Add console logging to every data fetch step
      console.log('[TalkToData] Question:', question);
      console.log('[TalkToData] Detected district:', matchedDistrict);
      console.log('[TalkToData] Detected sector:', sector);
      console.log('[TalkToData] Intent:', intent);

      if (intent === 'DISTRICT_SECTOR' && sector) {
        const mapping = SECTOR_TABLE_MAP[sector];
        if (!mapping) return { intent, district: matchedDistrict, sector, dataFound: false };

        try {
          const gpIdsRes = await fetchAllFromTable('dim_rural_gps', 'gp_id', { district: matchedDistrict });
          const wardIdsRes = await fetchAllFromTable('dim_urban_wards', 'ward_id', { district: matchedDistrict });
          
          const gpIds = gpIdsRes.map((r: any) => r.gp_id);
          const wardIds = wardIdsRes.map((r: any) => r.ward_id);

          console.log('[TalkToData] Rural GP lookup:', matchedDistrict, '→ rows:', gpIds.length);
          console.log('[TalkToData] Urban ward lookup:', matchedDistrict, '→ rows:', wardIds.length);

          let ruralData: Record<string, number | null> = {};
          let urbanData: Record<string, number | null> = {};

          if (mapping.rural && gpIds.length > 0) {
            const rows = await fetchAllFromTable(mapping.rural.table, mapping.rural.cols.join(','), { gp_id: gpIds });
            console.log(`[TalkToData] ${mapping.rural.table} rows:`, rows?.length);
            for (const col of mapping.rural.cols) {
              ruralData[col] = sumValues(rows, col);
            }
          }

          if (mapping.urban && wardIds.length > 0) {
            const rows = await fetchAllFromTable(mapping.urban.table, mapping.urban.cols.join(','), { ward_id: wardIds });
            console.log(`[TalkToData] ${mapping.urban.table} rows:`, rows?.length);
            for (const col of mapping.urban.cols) {
              urbanData[col] = sumValues(rows, col);
            }
          }

          if (sector === 'tourism') {
            console.log('[TalkToData] Tourism context sent to Gemini:', {
              heritageSites: ruralData.cultural_assets_count,
              annualFairs: ruralData.annual_fairs_count,
              dailyFootfall: ruralData.avg_daily_footfall_cultural_sites,
              fairFootfall: ruralData.avg_fair_footfall_daily,
              fairStalls: ruralData.temporary_fair_stalls,
              fairEmployment: ruralData.fair_related_employment,
              trainedGuides: ruralData.registered_trained_guides,
              urbanFairFootfall: urbanData.avg_fair_footfall_daily,
              urbanShgStalls: urbanData.shg_operated_stalls,
              urbanGuides: urbanData.registered_trained_guides,
            });
          }

          return {
            intent,
            district: matchedDistrict,
            sector,
            ruralData,
            urbanData,
            gpCount: gpIds.length,
            wardCount: wardIds.length,
            dataFound: true,
          };
        } catch (err) {
          console.error('[AI CONTEXT] Sector data fetch failed:', err);
          return { intent, district: matchedDistrict, sector, dataFound: false };
        }
      }

      return { intent, district: matchedDistrict, dataFound: true };
    }

    return { intent, district: null, dataFound: true };
  } catch (err) {
    console.error('[AI CONTEXT] Intent data fetch failed:', err);
    return { intent, district: null, dataFound: false };
  }
}

// ============================================================================
// LANGUAGE-AWARE GEMINI PROMPT BUILDER
// ============================================================================

function buildImprovedGeminiPrompt(queryData: Record<string, any>, userQuestion: string, language: 'en' | 'hi' | 'hinglish') {
  const baseRoleEn = `You are Manthaan OS Planning Intelligence for Viksit Rajasthan @ 2047, built by Aasvaa Innovation Labs.
RULES:
1. Respond in the SAME language as the question - if Hindi, respond in Hindi; if English, respond in English; if Hinglish, respond in Hinglish
2. Always cite exact numbers from data provided - never invent figures
3. Use clear paragraphs or numbered lists, no bullet points with asterisks
4. CRITICAL RULE: If a metric value is 0 or not recorded, say "recorded as 0 in baseline" or "not yet captured in CDO survey" — NEVER say "डेटा अभी उपलब्ध नहीं" or "data not available". Always work with what is provided and give recommendations based on the gap the zero represents.
5. Never mention Gemini, Google, or any model names
6. Always end with one specific, actionable recommendation tied to a real government scheme`;

  const baseRoleHi = `आप मंथन ओएस प्लानिंग इंटेलिजेंस हो विक्सित राजस्थान @ 2047 के लिए, आव्स्वा इनोवेशन लैब्स द्वारा निर्मित।
नियम:
1. सवाल की भाषा में जवाब दें - अगर हिंदी, हिंदी में; अगर अंग्रेजी, अंग्रेजी में; अगर हिंग्लिश, हिंग्लिश में
2. सदा सटीक संख्याएं उद्धृत करें - कभी आंकड़े गढ़ें नहीं
3. स्पष्ट पैराग्राफ या क्रमांकित सूचियां का उपयोग करें
4. महत्वपूर्ण नियम: यदि किसी मीट्रिक का मान 0 है, तो "बेसलाइन में 0 के रूप में दर्ज" कहें - कभी भी "डेटा उपलब्ध नहीं" न कहें। जो दिया गया है उसके साथ काम करें।
5. कभी Google या मॉडल का नाम न लें
6. हमेशा एक सरकारी योजना के साथ जुड़ी कार्यवाही की सिफारिश दें`;

  const baseRole = language === 'en' ? baseRoleEn : language === 'hi' ? baseRoleHi : `${baseRoleEn}\n${baseRoleHi}`;

  // Build context string from data
  let contextStr = '';
  if (queryData.ruralData || queryData.urbanData) {
    const district = queryData.district;
    const sector = queryData.sector;
    const gpCount = queryData.gpCount;
    const wardCount = queryData.wardCount;
    const ruralData = queryData.ruralData || {};
    const urbanData = queryData.urbanData || {};

    if (queryData.intent === 'DISTRICT_SECTOR' && sector === 'tourism') {
      contextStr = `
DISTRICT: ${district} | Rural GPs: ${gpCount} | Urban Wards: ${wardCount}

TOURISM DATA (Rural — ${gpCount} GPs):
Cultural/heritage sites: ${ruralData.cultural_assets_count || 0}
Average daily footfall at cultural sites: ${ruralData.avg_daily_footfall_cultural_sites || 0}
Annual fairs count: ${ruralData.annual_fairs_count || 0}
Average daily fair footfall: ${ruralData.avg_fair_footfall_daily || 0}
Temporary fair stalls: ${ruralData.temporary_fair_stalls || 0}
Fair-related employment: ${ruralData.fair_related_employment || 0}
Registered trained guides: ${ruralData.registered_trained_guides || 0}
Estimated annual visitor footfall: ${((ruralData.avg_daily_footfall_cultural_sites || 0) * 365).toLocaleString()}

TOURISM DATA (Urban — ${wardCount} wards):
Average daily fair footfall: ${urbanData.avg_fair_footfall_daily || 0}
SHG-operated stalls/services: ${urbanData.shg_operated_stalls || 0}
Registered trained guides: ${urbanData.registered_trained_guides || 0}
      `;
    } else {
      contextStr = `DISTRICT: ${district} | SECTOR: ${sector?.toUpperCase() || 'GENERAL'}
GPs covered: ${gpCount || 0} | Urban Wards: ${wardCount || 0}

RURAL DATA:
${JSON.stringify(ruralData, null, 2)}

URBAN DATA:
${JSON.stringify(urbanData, null, 2)}`;
    }
  }

  return `${baseRole}

${contextStr}

Use ONLY the data above. For sector reports, include key metrics, identified gaps, and 1-2 actionable recommendations. For general questions, answer directly and completely. Always cite exact numbers.

Question: ${userQuestion}`;
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
- CRITICAL RULE: If data shows - for a field, say "not yet recorded in baseline" or "not yet captured in CDO survey" — NEVER say "data not available". Always work with what is provided and give recommendations based on the gap the zero represents.
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
  // NEW: Intent-based system with language detection
  const language = detectLanguage(userMessage || '');
  const intent = classifyIntent(userMessage || '');
  const availableDistricts = await getAvailableDistricts();
  const districtFromQuestion = availableDistricts.find(d => 
    new RegExp(`\\b${d.toLowerCase()}\\b|\\b${d.toLowerCase().split(' ')[0]}\\b`, 'i').test(userMessage || '')
  );

  console.log(`[AI CONTEXT] Language: ${language}, Intent: ${intent}, District: ${districtFromQuestion || 'none'}`);

  // Try new intent-based data fetch first
  if (intent !== 'GENERAL') {
    try {
      const intentData = await fetchDataForIntent(intent, userMessage || '', districtFromQuestion || null, availableDistricts);
      if (intentData.dataFound) {
        const systemPrompt = buildImprovedGeminiPrompt(intentData, userMessage || '', language);
        return {
          systemPrompt,
          intent,
          language,
          maxOutputTokens: 2000,
          contextObject: {
            intent,
            language,
            districtData: intentData,
            cache: { key: `intent_${districtFromQuestion}`, hit: false },
          },
        };
      }
    } catch (err) {
      console.log('[AI CONTEXT] Intent fetch failed, falling back to full context');
    }
  }

  // FALLBACK: Original full context build for backward compatibility
  const queryType = detectQueryType(userMessage || '');
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
