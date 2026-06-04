import { fetchAll, supabase } from '@/lib/supabase';
import type { AreaType } from '@/lib/dashboard-kpis';

export const CACHE_KEYS = {
  RURAL_DISTRICTS: 'geo_rural_districts',
  URBAN_DISTRICTS: 'geo_urban_districts',
} as const;

type GeoStorage = Pick<Storage, 'getItem' | 'setItem'> | null;

type RuralGpRow = { gp_id: number; gram_panchayat: string; block: string };
type UrbanWardRow = { ward_id: number; ward: string; ulb: string };
type BaselineRow = Record<string, any>;

export const DISTRICT_EN_TO_HI: Record<string, string> = {
  'Ajmer': 'अजमेर',
  'Alwar': 'अलवर',
  'Balotara': 'बालोतरा',
  'Banswara': 'बांसवाडा',
  'Baran': 'बारां',
  'Barmer': 'बाड़मेर',
  'Beawar': 'ब्यावर',
  'Bharatpur': 'भरतपुर',
  'Bhilwara': 'भीलवाड़ा',
  'Bikaner': 'बीकानेर',
  'Bundi': 'बूंदी',
  'Chittorgarh': 'चित्तौड़गढ़',
  'Churu': 'चूरू',
  'Dausa': 'दौसा',
  'Deeg': 'डीग',
  'Dholpur': 'धौलपुर',
  'Didwana-Kuchaman': 'डीडवाना कुचामन',
  'Dungarpur': 'डूंगरपुर',
  'Hanumangarh': 'हनुमानगढ़',
  'Jaipur': 'जयपुर',
  'Jaisalmer': 'जैसलमेर',
  'Jalore': 'जालोर',
  'Jhalawar': 'झालावाड़',
  'Jhunjhunu': 'झुन्झुनू',
  'Jodhpur': 'जोधपुर',
  'Karauli': 'करौली',
  'Khairthal-Tijara': 'खैरथल -तिजारा',
  'Kota': 'कोटा',
  'Kotputli-Behror': 'कोटपूतली-बहरोड',
  'Nagaur': 'नागौर',
  'Pali': 'पाली',
  'Phalodi': 'फलोदी',
  'Pratapgarh': 'प्रतापगढ़',
  'Rajsamand': 'राजसमन्द',
  'Salumbar': 'सलूम्बर',
  'Sawai Madhopur': 'सवाई माधोपुर',
  'Sikar': 'सीकर',
  'Sirohi': 'सिरोही',
  'Sri Ganganagar': 'श्री गंगानगर',
  'Tonk': 'टोंक',
  'Udaipur': 'उदयपुर'
};

export const DISTRICT_HI_TO_EN: Record<string, string> = Object.fromEntries(
  Object.entries(DISTRICT_EN_TO_HI).map(([en, hi]) => [hi, en])
);

function getGeoStorage(): GeoStorage {
  if (typeof window === 'undefined' || !window.sessionStorage) return null;
  return window.sessionStorage;
}

function uniqueSorted(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => String(value ?? '').trim()).filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

export async function cacheRuralDistricts(): Promise<string[]> {
  const { data, error } = await supabase.from('mv_baseline_rural_district_kpis').select('district').order('district');
  if (error) throw error;

  const unique = uniqueSorted((data || []).map((row: any) => row.district));
  const storage = getGeoStorage();
  storage?.setItem(CACHE_KEYS.RURAL_DISTRICTS, JSON.stringify(unique));
  return unique;
}

export async function cacheUrbanDistricts(): Promise<string[]> {
  const { data, error } = await supabase.from('mv_baseline_urban_district_kpis').select('district').order('district');
  if (error) throw error;

  const unique = uniqueSorted((data || []).map((row: any) => row.district));
  const storage = getGeoStorage();
  storage?.setItem(CACHE_KEYS.URBAN_DISTRICTS, JSON.stringify(unique));
  return unique;
}

export async function fetchBlocksForDistrict(districtEn: string): Promise<{hi: string, en: string}[]> {
  const storage = getGeoStorage();
  const cacheKey = `geo_rural_blocks_${districtEn}_paired_v2`;
  const cached = storage?.getItem(cacheKey);
  if (cached) return JSON.parse(cached);

  const dbDistrict = DISTRICT_EN_TO_HI[districtEn] || districtEn;
  
  const [baseRes, aspRes] = await Promise.all([
    supabase.from('baseline_rural').select('block').eq('district', dbDistrict),
    supabase.from('aspirations').select('block').eq('district', districtEn)
  ]);

  if (baseRes.error || !baseRes.data) return [];
  
  const hiBlocks = [...new Set(baseRes.data.map((r: any) => r.block))].filter(Boolean) as string[];
  const enBlocks = [...new Set((aspRes.data || []).map((r: any) => r.block))].filter(Boolean) as string[];

  const transliterate = (hi: string) => {
    const map: Record<string, string> = { 'अ':'a', 'आ':'aa', 'इ':'i', 'ई':'ee', 'उ':'u', 'ऊ':'oo', 'ए':'e', 'ऐ':'ai', 'ओ':'o', 'औ':'au', 'क':'k', 'ख':'kh', 'ग':'g', 'घ':'gh', 'च':'ch', 'छ':'chh', 'ज':'j', 'झ':'jh', 'ट':'t', 'ठ':'th', 'ड':'d', 'ढ':'dh', 'त':'t', 'थ':'th', 'द':'d', 'ध':'dh', 'न':'n', 'प':'p', 'फ':'f', 'ब':'b', 'भ':'bh', 'म':'m', 'य':'y', 'र':'r', 'ल':'l', 'व':'v', 'श':'sh', 'ष':'sh', 'स':'s', 'ह':'h', 'ा':'a', 'ि':'i', 'ी':'ee', 'ु':'u', 'ू':'oo', 'े':'e', 'ै':'ai', 'ो':'o', 'ौ':'au', 'ं':'n', 'ँ':'n', '्':'', '़':'', 'रूरल':'rural', 'अर्बन':'urban', ' ':' ' };
    let res = '';
    for (let char of hi) res += map[char] || char;
    return res.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
  };

  const pairObjects = hiBlocks.map(hi => {
    const hiTrans = transliterate(hi);
    let bestEn = '';
    for (const en of enBlocks) {
      const enClean = en.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
      if (hiTrans.includes(enClean) || enClean.includes(hiTrans) || (hiTrans.substring(0,3) === enClean.substring(0,3) && hiTrans.length > 2)) {
        bestEn = en;
        break;
      }
    }
    return { hi, en: bestEn };
  });

  const unique = pairObjects.sort((a, b) => a.hi.localeCompare(b.hi, 'hi-IN'));
  storage?.setItem(cacheKey, JSON.stringify(unique));
  return unique;
}

export async function fetchUlbsForDistrict(district: string): Promise<string[]> {
  const storage = getGeoStorage();
  const cacheKey = `geo_urban_ulbs_${district}`;
  const cached = storage?.getItem(cacheKey);
  if (cached) return JSON.parse(cached);

  const dbDistrict = DISTRICT_EN_TO_HI[district] || district;
  const { data, error } = await supabase
    .from('baseline_urban')
    .select('ulb')
    .eq('district', dbDistrict);
  if (error) throw error;

  const unique = uniqueSorted((data || []).map((row: any) => row.ulb));
  storage?.setItem(cacheKey, JSON.stringify(unique));
  return unique;
}

export async function fetchGpsForBlock(district: string, blockHi: string): Promise<{gp_id: number; gram_panchayat: {hi: string, en: string}; block: string}[]> {
  const storage = getGeoStorage();
  const cacheKey = `geo_rural_gps_${district}_${blockHi}_paired_v2`;
  const cached = storage?.getItem(cacheKey);
  if (cached) return JSON.parse(cached);

  const dbDistrict = DISTRICT_EN_TO_HI[district] || district;
  
  // We need to fetch the English block name corresponding to blockHi to query aspirations
  const blocks = await fetchBlocksForDistrict(district);
  const blockEn = blocks.find(b => b.hi === blockHi)?.en || '';

  const [baseRes, aspRes] = await Promise.all([
    supabase.from('baseline_rural').select('gram_panchayat, block').eq('district', dbDistrict).eq('block', blockHi),
    blockEn ? supabase.from('aspirations').select('location').eq('district', district).eq('block', blockEn) : { data: [] }
  ]);

  if (baseRes.error) throw baseRes.error;

  const uniqueGpsHi = uniqueSorted((baseRes.data || []).map((row: any) => row.gram_panchayat));
  const uniqueGpsEn = uniqueSorted((aspRes.data || []).map((row: any) => row.location));

  const transliterate = (hi: string) => {
    const map: Record<string, string> = { 'अ':'a', 'आ':'aa', 'इ':'i', 'ई':'ee', 'उ':'u', 'ऊ':'oo', 'ए':'e', 'ऐ':'ai', 'ओ':'o', 'औ':'au', 'क':'k', 'ख':'kh', 'ग':'g', 'घ':'gh', 'च':'ch', 'छ':'chh', 'ज':'j', 'झ':'jh', 'ट':'t', 'ठ':'th', 'ड':'d', 'ढ':'dh', 'त':'t', 'थ':'th', 'द':'d', 'ध':'dh', 'न':'n', 'प':'p', 'फ':'f', 'ब':'b', 'भ':'bh', 'म':'m', 'य':'y', 'र':'r', 'ल':'l', 'व':'v', 'श':'sh', 'ष':'sh', 'स':'s', 'ह':'h', 'ा':'a', 'ि':'i', 'ी':'ee', 'ु':'u', 'ू':'oo', 'े':'e', 'ै':'ai', 'ो':'o', 'ौ':'au', 'ं':'n', 'ँ':'n', '्':'', '़':'' };
    let res = '';
    for (let char of hi) res += map[char] || char;
    return res.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
  };

  const result = uniqueGpsHi.map((hiName, idx) => {
    const hiTrans = transliterate(hiName);
    let bestEn = '';
    for (const en of uniqueGpsEn) {
      const enClean = en.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
      if (hiTrans.includes(enClean) || enClean.includes(hiTrans) || (hiTrans.substring(0,3) === enClean.substring(0,3) && hiTrans.length > 2)) {
        bestEn = en;
        break;
      }
    }
    
    return {
      gp_id: idx + 1,
      gram_panchayat: { hi: hiName, en: bestEn },
      block: blockHi
    };
  });

  storage?.setItem(cacheKey, JSON.stringify(result));
  return result;
}

async function retryOnSchemaCache<T>(operation: () => Promise<T>, label: string, attempts = 3, delayMs = 250): Promise<T> {
  let lastError: any = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      const message = String(error?.message || '');
      const code = String(error?.code || '');
      const isSchemaCacheError = code === 'PGRST002' || /schema cache/i.test(message);

      if (!isSchemaCacheError || attempt === attempts) {
        throw error;
      }

      console.warn(`[${label}] schema cache miss, retrying ${attempt}/${attempts}...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }

  throw lastError;
}

export async function fetchWardsForUlb(district: string, ulb: string): Promise<UrbanWardRow[]> {
  const storage = getGeoStorage();
  const cacheKey = `geo_urban_wards_${district}_${ulb}`;
  const cached = storage?.getItem(cacheKey);
  if (cached) return JSON.parse(cached);

  const dbDistrict = DISTRICT_EN_TO_HI[district] || district;
  const result = await retryOnSchemaCache(async () => {
    let query = supabase
      .from('baseline_urban')
      .select('ward, ulb')
      .eq('district', dbDistrict);

    if (ulb) query = query.eq('ulb', ulb);

    const { data, error } = await query;
    if (error) throw error;

    const uniqueWards = uniqueSorted((data || []).map((row: any) => row.ward));

    const formattedWards: UrbanWardRow[] = uniqueWards.map((wardName, idx) => ({
      ward_id: idx + 1,
      ward: wardName,
      ulb: ulb
    }));

    return formattedWards;
  }, `fetchWardsForUlb:${district}`);

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
  planning_year?: number;
  total_count?: number;
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

function aggregateBaselineRuralRows(rows: BaselineRow[]) {
  // Now returning rows directly since MV is already aggregated by district
  return rows;
}

async function fetchBaselineRows(table: 'baseline_rural' | 'baseline_urban', columns: string[], district?: string | null) {
  const mvTable = table === 'baseline_rural' ? 'mv_baseline_rural_district_kpis' : 'mv_baseline_urban_district_kpis';
  const selectCols = Array.from(new Set([...columns, 'district'])).join(', ');
  let query = supabase.from(mvTable).select(selectCols);

  if (district) {
    // The MV tables store district names in Hindi; the incoming district is English.
    // Translate to Hindi before filtering so "Ajmer" correctly matches "अजमेर".
    const districtHi = DISTRICT_EN_TO_HI[district] || district;
    query = query.ilike('district', districtHi);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []) as BaselineRow[];
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
      const pageData = await retryOnSchemaCache(async () => {
        let pageQuery = supabase
          .from('mv_aspirations_summary')
          .select('sector, dept, item, district, area_type, planning_year, priority, qty_2030:sum_qty_2030, qty_2035:sum_qty_2035, qty_2047:sum_qty_2047, total_budget, budget_2030:sum_budget_2030, budget_2035:sum_budget_2035, budget_2047:sum_budget_2047, status, fast_track, total_count')
          .order('district', { ascending: true })
          .range(from, from + PAGE_SIZE - 1);

        if (district !== 'all') {
          const rawDistrict = params.district || '';
          const englishDistrict = DISTRICT_HI_TO_EN[rawDistrict] || rawDistrict;
          pageQuery = pageQuery.ilike('district', englishDistrict);
        }

        if (areaType === 'rural') {
          pageQuery = pageQuery.eq('area_type', 'Rural');
        } else if (areaType === 'urban') {
          pageQuery = pageQuery.eq('area_type', 'Urban');
        }

        const { data: queryData, error: pageError } = await pageQuery;
        if (pageError) throw pageError;
        return queryData || [];
      }, `fetchAspirationsKpis:${areaType}:${district}`);

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
      totalCount: allRows.reduce((sum, row) => sum + (Number(row.total_count) || 0), 0),
      qty2030Total: allRows.reduce((total, row) => total + (Number(row.qty_2030) || 0), 0),
      qty2035Total: allRows.reduce((total, row) => total + (Number(row.qty_2035) || 0), 0),
      qty2047Total: allRows.reduce((total, row) => total + (Number(row.qty_2047) || 0), 0),
      count2030: allRows.filter((row) => Number(row.planning_year) === 2030).reduce((sum, row) => sum + (Number(row.total_count) || 0), 0),
      count2035: allRows.filter((row) => Number(row.planning_year) === 2035).reduce((sum, row) => sum + (Number(row.total_count) || 0), 0),
      count2047: allRows.filter((row) => Number(row.planning_year) === 2047).reduce((sum, row) => sum + (Number(row.total_count) || 0), 0),
      sectorBreakdown: [],
      budgetTotal: allRows.reduce((total, row) => total + (Number(row.total_budget) || 0), 0),
      fastTrackCount: allRows.filter((row) => Boolean(row.fast_track)).reduce((sum, row) => sum + (Number(row.total_count) || 0), 0),
      fundedCount: allRows.filter((row) => String(row.status || '').trim().toUpperCase() === 'FUNDED').reduce((sum, row) => sum + (Number(row.total_count) || 0), 0),
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
      districtRow.count += (Number(row.total_count) || 0);
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
              count: Number(record.total_count) || 0,
              fast_track: Boolean(record.fast_track),
              status: String(record.status || ''),
              priority: Number(record.priority || 99),
            });
          } else {
            existing.qty_2030 += q2030;
            existing.qty_2035 += q2035;
            existing.qty_2047 += q2047;
            existing.combinedQty += q2030 + q2035 + q2047;
            existing.count += Number(record.total_count) || 0;
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
          count: rowsForSector.reduce((sum, row) => sum + (Number(row.total_count) || 0), 0),
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
    ruralTable: 'baseline_rural',
    ruralCols: ['tap_connection_pct', 'overhead_tanks', 'handpump_only_houses', 'drinking_water_sources', 'groundwater_depth_meters', 'ro_facilities', 'water_quality_test_frequency', 'tanker_only_houses'],
    urbanTable: 'baseline_urban',
    urbanCols: ['tap_connection_pct', 'overhead_tanks', 'handpump_count', 'well_count', 'tank_count', 'groundwater_depth_meters', 'water_quality_test_frequency'],
  },
  health: {
    ruralTable: 'baseline_rural',
    ruralCols: ['allopathic_centers', 'ayush_centers', 'private_health_centers', 'health_center_beds', 'working_health_staff', 'avg_daily_patients', 'ayushman_beneficiaries', 'janaadhar_registered_families_pct', 'tb_patients', 'anemic_pregnant_women', 'phc_dist_km', 'chc_dist_km'],
    urbanTable: 'baseline_urban',
    urbanCols: ['allopathic_centers', 'ayush_centers', 'private_health_centers', 'health_center_beds', 'working_health_staff', 'avg_daily_patients', 'ayushman_beneficiaries', 'janaadhar_reg_families_pct', 'tb_patients', 'anemic_pregnant_women', 'bp_screened', 'diabetes_screened'],
  },
  agri: {
    ruralTable: 'baseline_rural',
    ruralCols: ['cultivable_land_ha', 'irrigated_area_ha', 'net_sown_area_ha', 'kharif_crop_area_hectare', 'kharif_crop_production_quintal', 'rabi_crop_area_hectare', 'rabi_crop_production_quintal', 'total_farmers', 'small_farmers', 'medium_farmers', 'large_farmers', 'kcc_holders', 'pm_cm_kisan_beneficiaries', 'soil_health_cards', 'crop_insurance_farmers', 'fpo_count', 'drip_sprinkler_farmers', 'solar_pumps', 'agri_electricity_connections', 'govt_vet_centers_count'],
  },
  dairy: {
    ruralTable: 'baseline_rural',
    ruralCols: ['total_livestock', 'milch_animals', 'daily_milk_litres', 'milk_collection_centers', 'goat_farms', 'poultry_farms', 'kcc_holders'],
  },
  edu: {
    ruralTable: 'baseline_rural',
    ruralCols: ['anganwadi_centers', 'anganwadi_workers', 'anganwadi_helpers', 'anganwadi_enrolled_children', 'anganwadi_pregnant_women', 'asha_workers', 'sam_children', 'govt_schools', 'pvt_schools', 'total_schools', 'useful_classrooms_count', 'working_teachers', 'sanctioned_teachers', 'computers', 'total_enrolled_students', 'students_class_0_5_boys', 'students_class_0_5_girls', 'students_class_6_8_boys', 'students_class_6_8_girls', 'students_class_9_10_boys', 'students_class_9_10_girls', 'students_class_11_12_boys', 'students_class_11_12_girls', 'dropout_children', 'skill_training_centers', 'govt_hostels', 'higher_edu_institutions'],
    urbanTable: 'baseline_urban',
    urbanCols: ['anganwadi_centers', 'anganwadi_workers', 'anganwadi_enrolled_children', 'asha_workers', 'sam_children', 'snp_children', 'govt_schools', 'pvt_schools', 'total_schools', 'total_enrolled_students', 'useful_classrooms_count', 'working_teachers', 'sanctioned_teachers', 'computers', 'dropout_children', 'govt_hostels'],
  },
  employ: {
    ruralTable: 'baseline_rural',
    ruralCols: ['active_shg_count', 'women_in_shgs', 'lakhpati_didis', 'millionaire_didis', 'local_artisans', 'large_industrial_units', 'mudra_loan_beneficiaries'],
    urbanTable: 'baseline_urban',
    urbanCols: ['active_shg_count', 'local_artisans', 'large_industrial_units', 'small_scale_industries'],
  },
  women: {
    ruralTable: 'baseline_rural',
    ruralCols: ['active_shg_count', 'women_in_shgs', 'lakhpati_didis', 'millionaire_didis', 'local_artisans', 'mudra_loan_beneficiaries'],
    urbanTable: 'baseline_urban',
    urbanCols: ['active_shg_count', 'local_artisans', 'large_industrial_units', 'small_scale_industries'],
  },
  welfare: {
    ruralTable: 'baseline_rural',
    ruralCols: ['old_age_pensioners', 'widow_pensioners', 'pwd_pensioners_est', 'pm_ujjwala_beneficiaries', 'pm_cm_awas_beneficiaries'],
    urbanTable: 'baseline_urban',
    urbanCols: ['pm_ujjwala_beneficiaries', 'pm_cm_awas_beneficiaries', 'old_age_pensioners', 'widow_pensioners', 'pwd_pensioners_est'],
  },
  infra: {
    ruralTable: 'baseline_rural',
    ruralCols: ['post_offices', 'govt_banks', 'pvt_banks', 'houses_with_electricity', 'avg_electricity_hours', 'total_street_lights', 'solar_installed_houses', 'public_toilets', 'road_length_km', 'dist_bus_stand_km', 'dist_main_market_km', 'dist_railway_station_km'],
    urbanTable: 'baseline_urban',
    urbanCols: ['govt_banks', 'pvt_banks', 'houses_with_electricity', 'solar_installed_houses', 'public_toilets', 'road_length_km', 'dist_main_market_km', 'dist_bus_stand_km', 'dist_railway_station_km'],
  },
  tourism: {
    ruralTable: 'baseline_rural',
    ruralCols: ['cultural_assets', 'avg_daily_footfall_cultural_sites', 'annual_fairs', 'avg_fair_footfall_daily', 'fair_stalls_count', 'fair_employment', 'registered_trained_guides'],
    urbanTable: 'baseline_urban',
    urbanCols: ['avg_fair_footfall_daily', 'fair_shg_stalls_count', 'registered_trained_guides'],
  },
  env: {
    ruralTable: 'baseline_rural',
    ruralCols: ['houses_with_toilets', 'dtd_collection_houses', 'waste_dump_sites', 'total_waste_daily_kg', 'wet_waste_daily_kg', 'dry_waste_daily_kg', 'govt_compost_pits', 'mrf_sheds', 'biogas_plants', 'pasture_land_ha', 'forest_area_ha', 'pm_surya_ghar_houses'],
    urbanTable: 'baseline_urban',
    urbanCols: ['houses_without_toilets', 'govt_compost_pits', 'govt_nurseries_count', 'nursery_plants_count'],
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
  water:   ['Water Security'],
  health:  ['Health and Wellness'],
  agri:    ['Agriculture and Livelihoods'],
  dairy:   ['Agriculture and Livelihoods'],
  edu:     ['Education and Knowledge'],
  employ:  ['Industry and Economic Development'],
  women:   ['Social Empowerment'],
  welfare: ['Social Empowerment'],
  infra:   ['Key Infrastructure'],
  tourism: ['Tourism and Cultural Development'],
  env:     ['Environment and Climate'],
};

async function fetchAspirationsBySector(sectorId: string, areaType: AreaType, district?: string | null) {
  const PAGE_SIZE = 1000;
  const rows: any[] = [];
  let from = 0;
  let keepFetching = true;

  while (keepFetching) {
    let query = supabase
      .from('mv_aspirations_summary')
      .select('item, dept, sector, qty_2030:sum_qty_2030, qty_2035:sum_qty_2035, qty_2047:sum_qty_2047, status, priority, district, area_type, fast_track, total_budget, total_count')
      .range(from, from + PAGE_SIZE - 1);

    if (district) {
      const englishDistrict = DISTRICT_HI_TO_EN[district] || district;
      query = query.ilike('district', englishDistrict);
    }

    if (areaType === 'rural') query = query.eq('area_type', 'Rural');
    if (areaType === 'urban') query = query.eq('area_type', 'Urban');

    const sectorDbNames = SECTOR_DB_NAMES[sectorId] || [];

    if (sectorDbNames.length > 0) {
      query = query.in('dept', sectorDbNames);
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

  if (sectorId === 'agri') {
    const dairyTerms = ['dairy', 'dugdh', 'दुग्ध', 'livestock', 'pashu', 'पशु', 'milk', 'goat',
                        'poultry', 'saras', 'rcdf', 'milch', 'veterinary', 'पशुपालन'];
    return rows.filter((row: any) => {
      const text = [row.item || '', row.sector || ''].join(' ').toLowerCase();
      return !dairyTerms.some(term => text.includes(term.toLowerCase()));
    });
  }
  if (sectorId === 'dairy') {
    const dairyTerms = ['dairy', 'dugdh', 'दुग्ध', 'livestock', 'pashu', 'पशु', 'milk', 'goat',
                        'poultry', 'saras', 'rcdf', 'milch', 'veterinary', 'पशुपालन'];
    return rows.filter((row: any) => {
      const text = [row.item || '', row.sector || ''].join(' ').toLowerCase();
      return dairyTerms.some(term => text.includes(term.toLowerCase()));
    });
  }
  if (sectorId === 'welfare') {
    const welfareTerms = ['pension', 'awas', 'housing', 'ujjwala', 'pwd', 'divyang',
                          'bpl', 'nfsa', 'old age', 'vridha', 'widow', 'pmay'];
    return rows.filter((row: any) => {
      const text = [row.item || '', row.sector || ''].join(' ').toLowerCase();
      return welfareTerms.some(term => text.includes(term.toLowerCase()));
    });
  }
  return rows;
}

async function fetchTableRows(table: string, columns: string[], district?: string | null, areaType?: AreaType) {
  if (table === 'baseline_rural') {
    const rows = await fetchBaselineRows('baseline_rural', columns, district);
    return aggregateBaselineRuralRows(rows);
  }

  if (table === 'baseline_urban') {
    return fetchBaselineRows('baseline_urban', columns, district);
  }

  if (!district) {
    return retryOnSchemaCache(() => fetchAll(table, {}, columns.join(', ')), `fetchTableRows:${table}`);
  }

  // Non-fact table — return all
  return retryOnSchemaCache(() => fetchAll(table, {}, columns.join(', ')), `fetchTableRows:${table}`);
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
        : (() => {
            const districtHi = district ? (DISTRICT_EN_TO_HI[district] || district) : null;
            let q = supabase.from('baseline_rural').select('district, block, gram_panchayat');
            if (districtHi) q = q.eq('district', districtHi);
            return q.then(({ data }: { data: any[] | null }) => data || []);
          })(),
      areaType === 'rural'
        ? Promise.resolve([])
        : (() => {
            const districtHi = district ? (DISTRICT_EN_TO_HI[district] || district) : null;
            let q = supabase.from('baseline_urban').select('district, ulb, ward');
            if (districtHi) q = q.eq('district', districtHi);
            return q.then(({ data }: { data: any[] | null }) => data || []);
          })(),
    ]);

    const aspTotalCount = aspRows.reduce((sum: number, row: any) => sum + toNumber(row.total_count), 0);
    const aspQty2030 = aspRows.reduce((sum: number, row: any) => sum + toNumber(row.qty_2030), 0);
    const aspQty2035 = aspRows.reduce((sum: number, row: any) => sum + toNumber(row.qty_2035), 0);
    const aspQty2047 = aspRows.reduce((sum: number, row: any) => sum + toNumber(row.qty_2047), 0);
    const aspFunded = aspRows.filter((row: any) => String(row.status || '').trim().toUpperCase() === 'FUNDED').reduce((sum: number, row: any) => sum + toNumber(row.total_count), 0);
    const aspFastTrack = aspRows.filter((row: any) => Boolean(row.fast_track)).reduce((sum: number, row: any) => sum + toNumber(row.total_count), 0);
    const aspP1 = aspRows.filter((row: any) => Number(row.priority) === 1).reduce((sum: number, row: any) => sum + toNumber(row.total_count), 0);
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
          count: toNumber(row.total_count),
          status: nextStatus,
          fastTrack: Boolean(row.fast_track),
        });
      } else {
        existing.qty2030 += toNumber(row.qty_2030);
        existing.qty2035 += toNumber(row.qty_2035);
        existing.qty2047 += toNumber(row.qty_2047);
        existing.count += toNumber(row.total_count);
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
      distAspMap.set(district, (distAspMap.get(district) || 0) + toNumber(row.total_count));
    }
    const distAspBreakdown = Array.from(distAspMap.entries())
      .map(([district, count]) => ({ district, count }))
      .sort((left, right) => right.count - left.count || left.district.localeCompare(right.district))
      .slice(0, 15);

    const aspStatusMix = {
      funded: aspFunded,
      accept: aspRows.filter((row: any) => String(row.status || '').trim().toUpperCase() === 'ACCEPT').reduce((sum: number, row: any) => sum + toNumber(row.total_count), 0),
      review: aspRows.filter((row: any) => String(row.status || '').trim().toUpperCase() === 'REVIEW').reduce((sum: number, row: any) => sum + toNumber(row.total_count), 0),
    };

    const baselineMetricAcc = new Map<string, { sum: number; count: number; avg: boolean }>();
    for (const part of baselineParts) {
      addBaselineRows(baselineMetricAcc, part.rows, part.columns);
    }
    const baselineMetrics = finalizeBaselineMetrics(baselineMetricAcc);

    // Count distinct GP entries (district + block + gram_panchayat) from baseline_rural
  const uniqueRuralGPs = new Set<string>();
  for (const row of ruralGpsRows) {
    const key = `${row.district}|||${row.block}|||${row.gram_panchayat}`;
    uniqueRuralGPs.add(key);
  }
  baselineMetrics.rural_gp_count = uniqueRuralGPs.size;
  // Count distinct Urban Ward entries (district + ulb + ward) from baseline_urban
  const uniqueUrbanWards = new Set<string>();
  for (const row of urbanWardRows) {
    const ulbOrCity = row.ulb || row.city || '';
    const key = `${row.district}|||${ulbOrCity}|||${row.ward}`;
    uniqueUrbanWards.add(key);
  }
  baselineMetrics.urban_ward_count = uniqueUrbanWards.size;
  

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