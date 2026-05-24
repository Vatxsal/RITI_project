import { supabase } from '@/lib/supabase';

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

const ASPIRATION_CACHE_TTL_MS = 60 * 1000;
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

function statusRank(status: string) {
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
    const PAGE_SIZE = 1000;
    let allRows: AspirationSectorEntry[] = [];
    let from = 0;
    let keepFetching = true;

    while (keepFetching) {
      let pageQuery = supabase
        .from('aspirations')
        .select('sector, dept, item, district, area_type, gram_panchayat, block, ward, ulb, city, planning_year, priority, qty_2030, qty_2035, qty_2047, total_budget, budget_2030, budget_2035, budget_2047, status, fast_track')
        .in('status', ['ACCEPT', 'FUNDED', 'REVIEW'])
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
