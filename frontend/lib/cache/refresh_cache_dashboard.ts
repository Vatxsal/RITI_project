import { fetchAll, supabase } from '@/lib/supabase';
import type { AreaType } from '@/lib/dashboard-kpis';

export const CACHE_KEYS = {
  RURAL_DISTRICTS: 'geo_rural_districts',
  URBAN_DISTRICTS: 'geo_urban_districts',
} as const;

type GeoStorage = Pick<Storage, 'getItem' | 'setItem'> | null;

type RuralGpRow = { gp_id: number; gram_panchayat: string; block: string };
type UrbanWardRow = { ward_id: number; ward: string; ulb: string };

function getGeoStorage(): GeoStorage {
  if (typeof window === 'undefined' || !window.sessionStorage) return null;
  return window.sessionStorage;
}

function uniqueSorted(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => String(value ?? '').trim()).filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

export async function cacheRuralDistricts(): Promise<string[]> {
  const { data, error } = await supabase.from('dim_rural_gps').select('district').order('district');
  if (error) throw error;

  const unique = uniqueSorted((data || []).map((row: any) => row.district));
  const storage = getGeoStorage();
  storage?.setItem(CACHE_KEYS.RURAL_DISTRICTS, JSON.stringify(unique));
  return unique;
}

export async function cacheUrbanDistricts(): Promise<string[]> {
  const { data, error } = await supabase.from('dim_urban_wards').select('district').order('district');
  if (error) throw error;

  const unique = uniqueSorted((data || []).map((row: any) => row.district));
  const storage = getGeoStorage();
  storage?.setItem(CACHE_KEYS.URBAN_DISTRICTS, JSON.stringify(unique));
  return unique;
}

export async function fetchBlocksForDistrict(district: string): Promise<string[]> {
  const storage = getGeoStorage();
  const cacheKey = `geo_rural_blocks_${district}`;
  const cached = storage?.getItem(cacheKey);
  if (cached) return JSON.parse(cached);

  const { data, error } = await supabase
    .from('dim_rural_gps')
    .select('block')
    .eq('district', district)
    .order('block');
  if (error) throw error;

  const unique = uniqueSorted((data || []).map((row: any) => row.block));
  storage?.setItem(cacheKey, JSON.stringify(unique));
  return unique;
}

export async function fetchUlbsForDistrict(district: string): Promise<string[]> {
  const storage = getGeoStorage();
  const cacheKey = `geo_urban_ulbs_${district}`;
  const cached = storage?.getItem(cacheKey);
  if (cached) return JSON.parse(cached);

  const { data, error } = await supabase
    .from('dim_urban_wards')
    .select('ulb')
    .eq('district', district)
    .order('ulb');
  if (error) throw error;

  const unique = uniqueSorted((data || []).map((row: any) => row.ulb));
  storage?.setItem(cacheKey, JSON.stringify(unique));
  return unique;
}

export async function fetchGpsForBlock(district: string, block: string): Promise<RuralGpRow[]> {
  const storage = getGeoStorage();
  const cacheKey = `geo_rural_gps_${district}_${block}`;
  const cached = storage?.getItem(cacheKey);
  if (cached) return JSON.parse(cached);

  let query = supabase
    .from('dim_rural_gps')
    .select('gp_id, gram_panchayat, block')
    .eq('district', district)
    .order('gram_panchayat');

  if (block) query = query.eq('block', block);

  const { data, error } = await query;
  if (error) throw error;

  const result = (data || []).slice().sort((left: any, right: any) => String(left.gram_panchayat).localeCompare(String(right.gram_panchayat)));
  storage?.setItem(cacheKey, JSON.stringify(result));
  return result;
}

export async function fetchWardsForUlb(district: string, ulb: string): Promise<UrbanWardRow[]> {
  const storage = getGeoStorage();
  const cacheKey = `geo_urban_wards_${district}_${ulb}`;
  const cached = storage?.getItem(cacheKey);
  if (cached) return JSON.parse(cached);

  let query = supabase
    .from('dim_urban_wards')
    .select('ward_id, ward, ulb')
    .eq('district', district)
    .order('ward');

  if (ulb) query = query.eq('ulb', ulb);

  const { data, error } = await query;
  if (error) throw error;

  const result = (data || []).slice();
  storage?.setItem(cacheKey, JSON.stringify(result));
  return result;
}

export interface AspirationSectorEntry {
  item: string;
  sector: string;
  dept: string;
  district: string;
  area_type: string;
  priority: number;
  qty_2030: number;
  qty_2035: number;
  qty_2047: number;
  status: string;
  fast_track: boolean;
  total_budget: number;
  budget_2030?: number;
  budget_2035?: number;
  budget_2047?: number;
  planning_year?: number | string;
  gram_panchayat: string;
  block: string;
  ward: string;
  ulb: string;
  city: string;
}

export interface AspirationSectorBreakdown {
  sector: string;
  dept: string;
  topItem: string;
  count: number;
  qty2030: number;
  qty2035?: number;
  qty2047?: number;
  combinedQty?: number;
  topItemQty2030?: number;
  topItemQty2035?: number;
  topItemQty2047?: number;
  topItemCombinedQty?: number;
  totalQty2030?: number;
  totalQty2035?: number;
  totalQty2047?: number;
  uniqueItems?: number;
  allItems?: Array<{
    item: string;
    dept: string;
    qty_2030: number;
    qty_2035: number;
    qty_2047: number;
    combinedQty: number;
    count: number;
    fast_track: boolean;
    status: string;
    priority: number;
  }>;
  priority: number;
  planning_year?: number | string;
  status: string;
  fast_track: boolean;
}

export interface AspirationDistrictBreakdown {
  district: string;
  count: number;
  qty2030: number;
  budgetCr: number;
}

export interface AspirationKpis {
  totalCount: number;
  qty2030Total: number;
  qty2035Total: number;
  qty2047Total: number;
  count2030?: number;
  count2035?: number;
  count2047?: number;
  sectorBreakdown: AspirationSectorBreakdown[];
  budgetTotal: number;
  fastTrackCount: number;
  fundedCount: number;
  districtBreakdown: AspirationDistrictBreakdown[];
  records?: AspirationSectorEntry[];
  budget2030Cr?: number;
  budget2035Cr?: number;
  budget2047Cr?: number;
}

const ASPIRATION_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const aspirationKpiCache = new Map<string, { data: AspirationKpis; fetchedAt: number }>();

function createEmptyAspirationKpis(): AspirationKpis {
  return {
    totalCount: 0,
    qty2030Total: 0,
    qty2035Total: 0,
    qty2047Total: 0,
    count2030: 0,
    count2035: 0,
    count2047: 0,
    sectorBreakdown: [],
    budgetTotal: 0,
    fastTrackCount: 0,
    fundedCount: 0,
    districtBreakdown: [],
    budget2030Cr: 0,
    budget2035Cr: 0,
    budget2047Cr: 0,
  };
}

function normalizeFilterValue(value: string | undefined) {
  return String(value ?? '').trim().toLowerCase();
}

function sectorStatusRank(status: string) {
  const normalized = String(status || '').trim().toUpperCase();
  if (normalized === 'FUNDED') return 0;
  if (normalized === 'ACCEPT') return 1;
  if (normalized === 'REVIEW') return 2;
  return 3;
}

export async function fetchAspirationsKpis(params: { areaType?: 'rural' | 'urban' | 'all'; district?: string | null }): Promise<AspirationKpis> {
  const areaType = params.areaType || 'all';
  const district = normalizeFilterValue(params.district || undefined) || 'all';
  const cacheKey = `${areaType}__${district}__v2`;
  const cached = aspirationKpiCache.get(cacheKey);
  const now = Date.now();

  if (cached && now - cached.fetchedAt < ASPIRATION_CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const PAGE_SIZE = 2000;
    let allRows: AspirationSectorEntry[] = [];
    let from = 0;
    let keepFetching = true;

    while (keepFetching) {
      let pageQuery = supabase
        .from('aspirations')
        .select('sector, dept, item, district, area_type, gram_panchayat, block, ward, ulb, city, planning_year, priority, qty_2030, qty_2035, qty_2047, total_budget, budget_2030, budget_2035, budget_2047, status, fast_track')
        .in('status', ['ACCEPT', 'FUNDED', 'REVIEW'])
        .order('id', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (district !== 'all') {
        pageQuery = pageQuery.ilike('district', params.district || '');
      }

      if (areaType === 'rural') {
        pageQuery = pageQuery.eq('area_type', 'Rural');
      } else if (areaType === 'urban') {
        pageQuery = pageQuery.eq('area_type', 'Urban');
      }

      const { data: pageData, error: pageError } = await pageQuery;
      if (pageError) {
        console.warn('[fetchAspirationsKpis] page fetch error:', pageError.message);
        break;
      }

      if (!pageData || pageData.length === 0) {
        keepFetching = false;
      } else {
        allRows = allRows.concat(pageData as AspirationSectorEntry[]);
        if (pageData.length < PAGE_SIZE) {
          keepFetching = false;
        } else {
          from += PAGE_SIZE;
        }
      }
    }

    console.log(`[fetchAspirationsKpis] Total rows fetched: ${allRows.length} | areaType: ${params.areaType || 'all'} | district: ${params.district || 'all'}`);

    allRows = allRows.filter((row) => ['ACCEPT', 'FUNDED', 'REVIEW'].includes(String(row.status || '').trim().toUpperCase()));

    const summary: AspirationKpis = {
      totalCount: allRows.length,
      qty2030Total: allRows.reduce((total, row) => total + (Number(row.qty_2030) || 0), 0),
      qty2035Total: allRows.reduce((total, row) => total + (Number(row.qty_2035) || 0), 0),
      qty2047Total: allRows.reduce((total, row) => total + (Number(row.qty_2047) || 0), 0),
      count2030: allRows.filter((row) => Number(row.planning_year) === 2030).length,
      count2035: allRows.filter((row) => Number(row.planning_year) === 2035).length,
      count2047: allRows.filter((row) => Number(row.planning_year) === 2047).length,
      sectorBreakdown: [],
      budgetTotal: allRows.reduce((total, row) => total + (Number(row.total_budget) || 0), 0),
      fastTrackCount: allRows.filter((row) => Boolean(row.fast_track)).length,
      fundedCount: allRows.filter((row) => String(row.status || '').trim().toUpperCase() === 'FUNDED').length,
      districtBreakdown: [],
      records: allRows,
      budget2030Cr: allRows.reduce((total, row) => total + (Number(row.budget_2030) || 0), 0) / 10000000,
      budget2035Cr: allRows.reduce((total, row) => total + (Number(row.budget_2035) || 0), 0) / 10000000,
      budget2047Cr: allRows.reduce((total, row) => total + (Number(row.budget_2047) || 0), 0) / 10000000,
    };

    const sectorMap = new Map<string, AspirationSectorEntry[]>();
    const districtMap = new Map<string, { count: number; qty2030: number; budget: number }>();

    allRows.forEach((row) => {
      const sector = String(row.sector || row.dept || 'अन्य').trim() || 'अन्य';
      const districtName = String(row.district || 'Unknown').trim() || 'Unknown';
      const sectorRows = sectorMap.get(sector) || [];
      sectorRows.push(row);
      sectorMap.set(sector, sectorRows);

      const districtRow = districtMap.get(districtName) || { count: 0, qty2030: 0, budget: 0 };
      districtRow.count += 1;
      districtRow.qty2030 += Number(row.qty_2030) || 0;
      districtRow.budget += Number(row.total_budget) || 0;
      districtMap.set(districtName, districtRow);
    });

    summary.sectorBreakdown = Array.from(sectorMap.entries())
      .map(([sectorName, rowsForSector]) => {
        const itemMap = new Map<string, {
          item: string;
          dept: string;
          qty_2030: number;
          qty_2035: number;
          qty_2047: number;
          combinedQty: number;
          count: number;
          fast_track: boolean;
          status: string;
          priority: number;
        }>();

        for (const record of rowsForSector) {
          const itemKey = String(record.item || '').trim().toLowerCase();
          if (!itemKey) continue;

          const q2030 = Number(record.qty_2030 || 0);
          const q2035 = Number(record.qty_2035 || 0);
          const q2047 = Number(record.qty_2047 || 0);
          const existing = itemMap.get(itemKey);

          if (!existing) {
            itemMap.set(itemKey, {
              item: String(record.item || '').trim(),
              dept: String(record.dept || '').trim(),
              qty_2030: q2030,
              qty_2035: q2035,
              qty_2047: q2047,
              combinedQty: q2030 + q2035 + q2047,
              count: 1,
              fast_track: Boolean(record.fast_track),
              status: String(record.status || ''),
              priority: Number(record.priority || 99),
            });
          } else {
            existing.qty_2030 += q2030;
            existing.qty_2035 += q2035;
            existing.qty_2047 += q2047;
            existing.combinedQty += q2030 + q2035 + q2047;
            existing.count += 1;
            if (record.fast_track) existing.fast_track = true;

            if (statusRank(String(record.status || '')) < statusRank(existing.status)) {
              existing.status = String(record.status || existing.status);
            }
          }
        }

        const itemList = Array.from(itemMap.values())
          .sort((left, right) => right.combinedQty - left.combinedQty || left.priority - right.priority);
        const topEntry = itemList[0];

        const totalQty2030 = rowsForSector.reduce((sum, row) => sum + Number(row.qty_2030 || 0), 0);
        const totalQty2035 = rowsForSector.reduce((sum, row) => sum + Number(row.qty_2035 || 0), 0);
        const totalQty2047 = rowsForSector.reduce((sum, row) => sum + Number(row.qty_2047 || 0), 0);

        return {
          sector: sectorName,
          dept: topEntry?.dept || '',
          topItem: topEntry?.item || '—',
          topItemQty2030: topEntry?.qty_2030 ?? 0,
          topItemQty2035: topEntry?.qty_2035 ?? 0,
          topItemQty2047: topEntry?.qty_2047 ?? 0,
          topItemCombinedQty: topEntry?.combinedQty ?? 0,
          totalQty2030,
          totalQty2035,
          totalQty2047,
          count: rowsForSector.length,
          uniqueItems: itemMap.size,
          fast_track: topEntry?.fast_track || false,
          status: topEntry?.status || '',
          priority: topEntry?.priority || 99,
          allItems: itemList,
          // Backward-compatible fields used in existing UI logic.
          qty2030: topEntry?.qty_2030 ?? 0,
          qty2035: topEntry?.qty_2035 ?? 0,
          qty2047: topEntry?.qty_2047 ?? 0,
          combinedQty: topEntry?.combinedQty ?? 0,
          planning_year: undefined,
        };
      })
      .sort((left, right) => Number(right.totalQty2030 || 0) - Number(left.totalQty2030 || 0));

    summary.districtBreakdown = Array.from(districtMap.entries())
      .map(([districtName, metrics]) => ({
        district: districtName,
        count: metrics.count,
        qty2030: metrics.qty2030,
        budgetCr: metrics.budget / 10000000,
      }))
      .sort((left, right) => right.count - left.count || right.qty2030 - left.qty2030 || left.district.localeCompare(right.district));

    aspirationKpiCache.set(cacheKey, { data: summary, fetchedAt: now });
    return summary;
  } catch (error) {
    console.warn('Failed to fetch aspiration KPIs:', error);
    const fallback = createEmptyAspirationKpis();
    aspirationKpiCache.set(cacheKey, { data: fallback, fetchedAt: now });
    return fallback;
  }
}

export type SectorPageAspirationItem = {
  item: string;
  dept: string;
  qty2030: number;
  qty2035: number;
  qty2047: number;
  count: number;
  status: string;
  fastTrack: boolean;
};

export type SectorPageData = {
  sectorId: string;
  areaType: AreaType;
  aspTotalCount: number;
  aspQty2030: number;
  aspQty2035: number;
  aspQty2047: number;
  aspFunded: number;
  aspFastTrack: number;
  aspP1: number;
  aspBudgetCr: number;
  topAspItems: SectorPageAspirationItem[];
  distAspBreakdown: Array<{ district: string; count: number }>;
  aspStatusMix: { funded: number; accept: number; review: number };
  baselineMetrics: Record<string, number>;
  fetchedAt: number;
};

type SectorBaselineConfig = {
  ruralTable?: string;
  ruralCols?: string[];
  urbanTable?: string;
  urbanCols?: string[];
};

const SECTOR_ASPIRATION_KEYWORDS: Record<string, string[]> = {
  water: ['Water Security', 'Public Health Engineering', 'पेयजल', 'नल कनेक्शन', 'हैंडपंप', 'tubewell', 'ट्यूबवेल', 'overhead tank', 'tanker', 'jjm', 'amrut', 'drinking water'],
  health: ['Health and Wellness', 'NHM', 'ayushman', 'ayush', 'asha', 'anganwadi', 'awc', 'poshan', 'ambulance', 'dispensary', 'स्वास्थ्य'],
  agri: ['Agriculture and Livelihoods', 'irrigation', 'sinchai', 'kisan', 'fpo', 'solar pump', 'tarbandi', 'diggi', 'pmksy', 'pmfby', 'soil', 'कृषि'],
  dairy: ['Agriculture and Livelihoods', 'dairy', 'livestock', 'pashu', 'milk', 'goat', 'poultry', 'saras', 'rcdf', 'veterinary', 'पशुपालन'],
  edu: ['Education and Knowledge', 'school', 'vidyalay', 'teacher', 'classroom', 'hostel', 'skill', 'iti', 'samagra', 'शिक्षा'],
  employ: ['Industry and Economic Development', 'shg', 'self help', 'livelihood', 'mudra', 'msme', 'rozgar', 'srlm', 'nrlm', 'lakhpati', 'artisan'],
  women: ['Social Empowerment', 'mahila', 'women', 'shg', 'lakhpati', 'ujjwala', 'widow', 'beti', 'kishori'],
  welfare: ['Social Empowerment', 'pension', 'awas', 'housing', 'ujjwala', 'pwd', 'divyang', 'bpl', 'nfsa', 'old age', 'pmay'],
  infra: ['Key Infrastructure', 'road', 'sadak', 'bridge', 'electricity', 'bijli', 'street light', 'bus stand', 'panchayat bhawan', 'pmgsy', 'सड़क'],
  tourism: ['Tourism and Cultural Development', 'heritage', 'fair', 'mela', 'cultural', 'temple', 'monument', 'swadesh darshan', 'पर्यटन'],
  env: ['Environment and Climate', 'forest', 'nursery', 'plantation', 'biogas', 'compost', 'waste', 'solar energy', 'pm surya ghar', 'watershed', 'पर्यावरण'],
};

const SECTOR_BASELINE_CONFIG: Record<string, SectorBaselineConfig> = {
  water: {
    ruralTable: 'fact_rural_water',
    ruralCols: ['tap_connection_pct', 'overhead_tanks_count', 'handpump_tubewell_only_houses', 'drinking_water_sources', 'groundwater_depth_meters', 'ro_facilities', 'water_quality_test_frequency', 'tanker_only_supply_houses'],
    urbanTable: 'fact_urban_water',
    urbanCols: ['tap_connection_pct', 'overhead_tanks_count', 'handpumps_count', 'wells_count', 'tanks_count', 'groundwater_depth_meters', 'water_quality_test_frequency'],
  },
  health: {
    ruralTable: 'fact_rural_health',
    ruralCols: ['allopathic_centers', 'ayush_centers', 'private_health_centers', 'health_center_beds', 'working_health_staff', 'avg_daily_patients', 'ayushman_arogya_beneficiaries', 'janaadhar_registered_families_pct', 'tb_patients_count', 'anemic_pregnant_women', 'phc_dist_km', 'chc_dist_km'],
    urbanTable: 'fact_urban_health',
    urbanCols: ['allopathic_centers', 'ayush_centers', 'pvt_health_centers', 'health_center_beds', 'working_health_staff', 'avg_daily_patients', 'ayushman_arogya_beneficiaries', 'janaadhar_reg_families_pct', 'tb_patients_count', 'anemic_pregnant_women', 'hypertension_screening_2025_26', 'diabetes_screening_2025_26'],
  },
  agri: {
    ruralTable: 'fact_rural_livelihood',
    ruralCols: ['cultivable_land_hectare', 'irrigated_area_hectare', 'net_sown_area', 'kharif_area_hectare', 'kharif_production_quintal', 'rabi_area_hectare', 'rabi_production_quintal', 'total_farmers_count', 'small_farmers_count', 'medium_farmers_count', 'large_farmers_count', 'kcc_holders_count', 'pm_cm_kisan_beneficiaries', 'soil_health_cards_valid', 'crop_insurance_farmers', 'fpo_count', 'drip_sprinkler_farmers', 'solar_pumps_count', 'agri_electricity_conn', 'govt_vet_centers'],
  },
  dairy: {
    ruralTable: 'fact_rural_livelihood',
    ruralCols: ['total_livestock_count', 'milch_animals_count', 'daily_milk_prod_litres', 'milk_collection_centers', 'goat_farms_count', 'poultry_farms_count', 'kcc_holders_count'],
  },
  edu: {
    ruralTable: 'fact_rural_education',
    ruralCols: ['anganwadi_centers', 'anganwadi_workers', 'anganwadi_helpers', 'anganwadi_enrolled_children', 'anganwadi_pregnant_women', 'asha_sahyogini_count', 'sam_children_count', 'govt_schools_count', 'pvt_schools_count', 'total_schools_count', 'useful_rooms_count', 'working_teachers', 'sanctioned_teachers_count', 'computers_available', 'total_enrolled_students', 'enrolled_boys_0_5', 'enrolled_girls_0_5', 'enrolled_boys_6_8', 'enrolled_girls_6_8', 'enrolled_boys_9_10', 'enrolled_girls_9_10', 'enrolled_boys_11_12', 'enrolled_girls_11_12', 'dropout_children_prev_year', 'skill_training_centers', 'govt_hostels_count', 'higher_edu_institutes'],
    urbanTable: 'fact_urban_education',
    urbanCols: ['anganwadi_centers', 'anganwadi_workers', 'anganwadi_enrolled_children', 'asha_sahyogini_count', 'sam_children_count', 'snp_recipients_6_72_months', 'govt_schools_count', 'pvt_schools_count', 'total_schools_count', 'total_enrolled_students', 'useful_rooms_count', 'working_teachers', 'sanctioned_teachers_count', 'computers_available', 'dropout_children_prev_year', 'govt_hostels_count'],
  },
  employ: {
    ruralTable: 'fact_rural_economy',
    ruralCols: ['active_shg_count', 'women_in_shgs', 'lakhpati_didis_count', 'millionaire_didis_count', 'local_artisans_count', 'large_industrial_units', 'mudra_loan_beneficiaries'],
    urbanTable: 'fact_urban_economy',
    urbanCols: ['active_shg_count', 'local_artisans_count', 'large_industrial_units', 'small_scale_industries'],
  },
  women: {
    ruralTable: 'fact_rural_economy',
    ruralCols: ['active_shg_count', 'women_in_shgs', 'lakhpati_didis_count', 'millionaire_didis_count', 'local_artisans_count', 'mudra_loan_beneficiaries'],
    urbanTable: 'fact_urban_economy',
    urbanCols: ['active_shg_count', 'local_artisans_count', 'large_industrial_units', 'small_scale_industries'],
  },
  welfare: {
    ruralTable: 'fact_rural_social',
    ruralCols: ['old_age_pensioners', 'widow_pensioners', 'pwd_pensioners_est', 'pm_ujjwala_beneficiaries', 'pm_cm_awas_beneficiaries'],
    urbanTable: 'fact_urban_social',
    urbanCols: ['pm_ujjwala_beneficiaries', 'pm_cm_awas_beneficiaries', 'old_age_pensioners', 'widow_pensioners', 'pwd_pensioners_est'],
  },
  infra: {
    ruralTable: 'fact_rural_infra',
    ruralCols: ['post_offices_count', 'govt_banks_count', 'private_banks_count', 'houses_with_electricity', 'avg_electricity_hours_daily', 'total_street_lights', 'solar_installed_houses', 'public_toilets', 'road_length_km', 'dist_bus_stand_km', 'dist_main_market_km', 'dist_railway_station_km'],
    urbanTable: 'fact_urban_infra',
    urbanCols: ['govt_banks_count', 'private_banks_count', 'houses_with_electricity', 'solar_installed_houses', 'public_toilets_functional', 'road_length_km', 'dist_main_market_km', 'dist_bus_stand_km', 'dist_railway_station_km'],
  },
  tourism: {
    ruralTable: 'fact_rural_tourism',
    ruralCols: ['cultural_assets_count', 'avg_daily_footfall_cultural_sites', 'annual_fairs_count', 'avg_fair_footfall_daily', 'temporary_fair_stalls', 'fair_related_employment', 'registered_trained_guides'],
    urbanTable: 'fact_urban_tourism',
    urbanCols: ['avg_fair_footfall_daily', 'shg_operated_stalls', 'registered_trained_guides'],
  },
  env: {
    ruralTable: 'fact_rural_environment',
    ruralCols: ['houses_with_toilets', 'door_to_door_collection_houses', 'waste_dump_sites', 'total_waste_daily_kg', 'wet_waste_daily_kg', 'dry_waste_daily_kg', 'govt_compost_pits_count', 'mrf_sheds_count', 'biogas_plants_count', 'pasture_land_hectare', 'forest_area_hectare', 'pm_surya_ghar_solar_houses'],
    urbanTable: 'fact_urban_environment',
    urbanCols: ['houses_without_toilets', 'govt_compost_pits_count', 'govt_nurseries_count', 'nursery_saplings_available'],
  },
};

const SECTOR_PAGE_CACHE_TTL_MS = 5 * 60 * 1000;
const sectorPageCache = new Map<string, { data: SectorPageData; fetchedAt: number }>();

function toNumber(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = Number(String(value).replace(/,/g, '').replace(/%/g, '').trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function statusRank(status: string) {
  const normalized = String(status || '').trim().toUpperCase();
  if (normalized === 'FUNDED') return 0;
  if (normalized === 'ACCEPT') return 1;
  if (normalized === 'REVIEW') return 2;
  return 3;
}

const SECTOR_DB_NAMES: Record<string, string[]> = {
  water: ['Water Security'],
  health: ['Health and Wellness'],
  agri: ['Agriculture and Livelihoods'],
  dairy: ['Agriculture and Livelihoods'],
  edu: ['Education and Knowledge'],
  employ: ['Industry and Economic Development', 'Social Empowerment'],
  women: ['Social Empowerment'],
  welfare: ['Social Empowerment'],
  infra: ['Key Infrastructure'],
  tourism: ['Tourism and Cultural Development'],
  env: ['Environment and Climate'],
};

async function fetchAspirationsBySector(sectorId: string, areaType: AreaType, district?: string | null) {
  const keywords = SECTOR_ASPIRATION_KEYWORDS[sectorId] || [];
  const PAGE_SIZE = 1000;
  const rows: any[] = [];
  let from = 0;
  let keepFetching = true;

  while (keepFetching) {
    let query = supabase
      .from('aspirations')
      .select('item, dept, sector, qty_2030, qty_2035, qty_2047, status, priority, district, area_type, fast_track, scheme, total_budget')
      .in('status', ['ACCEPT', 'FUNDED', 'REVIEW'])
      .range(from, from + PAGE_SIZE - 1);

    if (district) {
      query = query.ilike('district', district);
    }

    if (areaType === 'rural') query = query.eq('area_type', 'Rural');
    if (areaType === 'urban') query = query.eq('area_type', 'Urban');

    const sectorDbNames = SECTOR_DB_NAMES[sectorId] || [];
    const uniqueKeywords = [...new Set([...keywords, ...sectorDbNames])].slice(0, 15);

    if (uniqueKeywords.length) {
      const clauses = uniqueKeywords.flatMap((keyword) => [
        `sector.ilike.%${keyword}%`,
        `dept.ilike.%${keyword}%`,
        `item.ilike.%${keyword}%`,
      ]);
      query = query.or(clauses.join(','));
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) break;

    rows.push(...data);
    if (data.length < PAGE_SIZE) {
      keepFetching = false;
    } else {
      from += PAGE_SIZE;
    }
  }

  return rows;
}

async function fetchTableRows(table: string, columns: string[], district?: string | null, areaType?: AreaType) {
  if (!district) {
    return fetchAll(table, {}, columns.join(', '));
  }

  // Determine if this is a rural or urban table
  const isUrbanTable = table.startsWith('fact_urban_');
  const isRuralTable = table.startsWith('fact_rural_');

  if (isRuralTable) {
    // Get GP IDs for this district
    const { data: gpData, error: gpError } = await supabase
      .from('dim_rural_gps')
      .select('gp_id')
      .ilike('district', district);

    if (gpError || !gpData || gpData.length === 0) return [];

    const gpIds = gpData.map((row: any) => row.gp_id);

    // Fetch in batches of 500 to avoid URL length limits
    const BATCH = 500;
    const allRows: any[] = [];
    for (let i = 0; i < gpIds.length; i += BATCH) {
      const batch = gpIds.slice(i, i + BATCH);
      const { data, error } = await supabase
        .from(table)
        .select(columns.join(', '))
        .in('gp_id', batch);
      if (!error && data) allRows.push(...data);
    }
    return allRows;
  }

  if (isUrbanTable) {
    // Get ward IDs for this district
    const { data: wardData, error: wardError } = await supabase
      .from('dim_urban_wards')
      .select('ward_id')
      .ilike('district', district);

    if (wardError || !wardData || wardData.length === 0) return [];

    const wardIds = wardData.map((row: any) => row.ward_id);

    const BATCH = 500;
    const allRows: any[] = [];
    for (let i = 0; i < wardIds.length; i += BATCH) {
      const batch = wardIds.slice(i, i + BATCH);
      const { data, error } = await supabase
        .from(table)
        .select(columns.join(', '))
        .in('ward_id', batch);
      if (!error && data) allRows.push(...data);
    }
    return allRows;
  }

  // Non-fact table — return all
  return fetchAll(table, {}, columns.join(', '));
}

// Columns that should be averaged rather than summed
const AVG_COLUMNS = new Set([
  'tap_connection_pct',
  'groundwater_depth_meters',
  'groundwater_depth_m',
  'avg_electricity_hours_daily',
  'janaadhar_registered_families_pct',
  'janaadhar_reg_families_pct',
  'water_quality_test_frequency',
  'phc_dist_km',
  'chc_dist_km',
  'dist_bus_stand_km',
  'dist_main_market_km',
  'dist_railway_station_km',
  'dist_police_station_km',
  'dist_emitra_km',
  'dist_lpg_distributor_km',
  'avg_daily_patients',
  'avg_fair_footfall_daily',
  'avg_daily_footfall_cultural_sites',
]);

function addBaselineRows(acc: Map<string, { sum: number; count: number; avg: boolean }>, rows: any[], columns: string[]) {
  for (const row of rows) {
    for (const column of columns) {
      const value = toNumber(row?.[column]);
      if (!Number.isFinite(value)) continue;

      const shouldAvg = column.includes('_pct') || AVG_COLUMNS.has(column);
      const entry = acc.get(column) || { sum: 0, count: 0, avg: shouldAvg };
      entry.sum += value;
      entry.count += 1;
      acc.set(column, entry);
    }
  }
}

function finalizeBaselineMetrics(acc: Map<string, { sum: number; count: number; avg: boolean }>) {
  const metrics: Record<string, number> = {};
  for (const [column, entry] of acc.entries()) {
    const raw = entry.avg ? (entry.count ? entry.sum / entry.count : 0) : entry.sum;
    // Round percentage and distance columns to 1 decimal, others to nearest integer
    if (column.includes('_pct') || column.includes('_km') || column.includes('_meters') || column.includes('_depth')) {
      metrics[column] = Math.round(raw * 10) / 10;
    } else {
      metrics[column] = Math.round(raw * 100) / 100;
    }
  }
  return metrics;
}

function mergeBaselineRows(config: SectorBaselineConfig, areaType: AreaType, district?: string | null) {
  const tasks: Promise<{ rows: any[]; columns: string[] }>[] = [];

  if (config.ruralTable && areaType !== 'urban') {
    tasks.push(fetchTableRows(config.ruralTable, config.ruralCols || [], district, areaType).then((rows) => ({ rows, columns: config.ruralCols || [] })));
  }

  if (config.urbanTable && areaType !== 'rural') {
    tasks.push(fetchTableRows(config.urbanTable, config.urbanCols || [], district, areaType).then((rows) => ({ rows, columns: config.urbanCols || [] })));
  }

  return Promise.all(tasks);
}

export async function fetchSectorPageData(params: { sectorId: string; areaType: AreaType; district?: string | null }): Promise<SectorPageData> {
  const cacheKey = `sector__${params.sectorId}__${params.areaType}__${params.district || 'all'}`;
  const now = Date.now();
  const cached = sectorPageCache.get(cacheKey);
  if (cached && now - cached.fetchedAt < SECTOR_PAGE_CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const sectorId = String(params.sectorId || '').trim();
    const areaType = params.areaType || 'all';
    const baselineConfig = SECTOR_BASELINE_CONFIG[sectorId] || {};

    const district = params.district || null;

    const [aspRows, baselineParts, ruralGpsRows, urbanWardRows] = await Promise.all([
      fetchAspirationsBySector(sectorId, areaType, district),
      mergeBaselineRows(baselineConfig, areaType, district),
      areaType === 'urban'
        ? Promise.resolve([])
        : district
          ? supabase.from('dim_rural_gps').select('gp_id, district, block, gram_panchayat').ilike('district', district).then(({ data }: { data: any[] | null }) => data || [])
          : fetchAll('dim_rural_gps', {}, 'gp_id, district, block, gram_panchayat'),
      areaType === 'rural'
        ? Promise.resolve([])
        : district
          ? supabase.from('dim_urban_wards').select('ward_id, district, ulb, ward').ilike('district', district).then(({ data }: { data: any[] | null }) => data || [])
          : fetchAll('dim_urban_wards', {}, 'ward_id, district, ulb, ward'),
    ]);

    const aspTotalCount = aspRows.length;
    const aspQty2030 = aspRows.reduce((sum: number, row: any) => sum + toNumber(row.qty_2030), 0);
    const aspQty2035 = aspRows.reduce((sum: number, row: any) => sum + toNumber(row.qty_2035), 0);
    const aspQty2047 = aspRows.reduce((sum: number, row: any) => sum + toNumber(row.qty_2047), 0);
    const aspFunded = aspRows.filter((row: any) => String(row.status || '').trim().toUpperCase() === 'FUNDED').length;
    const aspFastTrack = aspRows.filter((row: any) => Boolean(row.fast_track)).length;
    const aspP1 = aspRows.filter((row: any) => Number(row.priority) === 1).length;
    const aspBudgetTotal = aspRows.reduce((sum: number, row: any) => sum + toNumber(row.total_budget), 0);

    const itemMap = new Map<string, SectorPageAspirationItem>();
    for (const row of aspRows) {
      const key = String(row.item || '').trim().toLowerCase();
      if (!key) continue;

      const existing = itemMap.get(key);
      const nextStatus = String(row.status || '').trim().toUpperCase();
      if (!existing) {
        itemMap.set(key, {
          item: String(row.item || '').trim(),
          dept: String(row.dept || '').trim(),
          qty2030: toNumber(row.qty_2030),
          qty2035: toNumber(row.qty_2035),
          qty2047: toNumber(row.qty_2047),
          count: 1,
          status: nextStatus,
          fastTrack: Boolean(row.fast_track),
        });
      } else {
        existing.qty2030 += toNumber(row.qty_2030);
        existing.qty2035 += toNumber(row.qty_2035);
        existing.qty2047 += toNumber(row.qty_2047);
        existing.count += 1;
        if (Boolean(row.fast_track)) existing.fastTrack = true;
        if (sectorStatusRank(nextStatus) < sectorStatusRank(existing.status)) existing.status = nextStatus;
      }
    }

    const topAspItems = Array.from(itemMap.values())
      .sort((left, right) => right.qty2030 - left.qty2030 || right.count - left.count || left.item.localeCompare(right.item))
      .slice(0, 8);

    const distAspMap = new Map<string, number>();
    for (const row of aspRows) {
      const district = String(row.district || 'Unknown').trim() || 'Unknown';
      distAspMap.set(district, (distAspMap.get(district) || 0) + 1);
    }
    const distAspBreakdown = Array.from(distAspMap.entries())
      .map(([district, count]) => ({ district, count }))
      .sort((left, right) => right.count - left.count || left.district.localeCompare(right.district))
      .slice(0, 15);

    const aspStatusMix = {
      funded: aspFunded,
      accept: aspRows.filter((row: any) => String(row.status || '').trim().toUpperCase() === 'ACCEPT').length,
      review: aspRows.filter((row: any) => String(row.status || '').trim().toUpperCase() === 'REVIEW').length,
    };

    const baselineMetricAcc = new Map<string, { sum: number; count: number; avg: boolean }>();
    for (const part of baselineParts) {
      addBaselineRows(baselineMetricAcc, part.rows, part.columns);
    }
    const baselineMetrics = finalizeBaselineMetrics(baselineMetricAcc);

    baselineMetrics.rural_gp_count = ruralGpsRows.length;
    baselineMetrics.urban_ward_count = urbanWardRows.length;

    const data: SectorPageData = {
      sectorId,
      areaType,
      aspTotalCount,
      aspQty2030,
      aspQty2035,
      aspQty2047,
      aspFunded,
      aspFastTrack,
      aspP1,
      aspBudgetCr: aspBudgetTotal / 10000000,
      topAspItems,
      distAspBreakdown,
      aspStatusMix,
      baselineMetrics,
      fetchedAt: now,
    };

    sectorPageCache.set(cacheKey, { data, fetchedAt: now });
    return data;
  } catch (error) {
    console.warn('[fetchSectorPageData] failed:', error);
    const fallback: SectorPageData = {
      sectorId: params.sectorId,
      areaType: params.areaType,
      aspTotalCount: 0,
      aspQty2030: 0,
      aspQty2035: 0,
      aspQty2047: 0,
      aspFunded: 0,
      aspFastTrack: 0,
      aspP1: 0,
      aspBudgetCr: 0,
      topAspItems: [],
      distAspBreakdown: [],
      aspStatusMix: { funded: 0, accept: 0, review: 0 },
      baselineMetrics: {},
      fetchedAt: now,
    };
    sectorPageCache.set(cacheKey, { data: fallback, fetchedAt: now });
    return fallback;
  }
}
