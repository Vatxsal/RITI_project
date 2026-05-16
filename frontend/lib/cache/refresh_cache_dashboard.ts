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
