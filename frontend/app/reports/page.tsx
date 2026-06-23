'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { DISTRICT_EN_TO_HI, fetchBlocksForDistrict, fetchGpsForBlock, fetchUlbsForDistrict, fetchWardsForUlb } from '@/lib/cache/refresh_cache_dashboard';

const DISTRICTS_EN = [
  'Ajmer', 'Alwar', 'Balotara', 'Banswara', 'Baran', 'Barmer', 'Beawar',
  'Bharatpur', 'Bhilwara', 'Bikaner', 'Bundi', 'Chittorgarh', 'Churu',
  'Dausa', 'Deeg', 'Dholpur', 'Didwana-Kuchaman', 'Dungarpur', 'Hanumangarh',
  'Jaipur', 'Jaisalmer', 'Jalore', 'Jhalawar', 'Jhunjhunu', 'Jodhpur',
  'Karauli', 'Khairthal-Tijara', 'Kota', 'Kotputli-Behror', 'Nagaur',
  'Pali', 'Phalodi', 'Pratapgarh', 'Rajsamand', 'Salumbar', 'Sawai Madhopur',
  'Sikar', 'Sirohi', 'Sri Ganganagar', 'Tonk', 'Udaipur'
] as const;


if (DISTRICTS_EN.length !== 41) {
  throw new Error(`DISTRICTS_EN must contain exactly 41 entries, found ${DISTRICTS_EN.length}`);
}

export default function ReportsPage() {
  const reportFrameRef = useRef<HTMLIFrameElement | null>(null);
  const [activeTab, setActiveTab] = useState<'rural' | 'urban' | 'district'>('rural');
  const [reportHistory, setReportHistory] = useState<Array<{
    id: number;
    report_name: string;
    scope_type: string;
    district: string | null;
    area_type: string;
    created_at: string;
    html_content: string;
    file_size_kb: number | null;
    created_by: string | null;
  }>>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [ruralDistrict, setRuralDistrict] = useState('');
  const [ruralBlock, setRuralBlock] = useState({ hi: '', en: '' });
  const [ruralGpId, setRuralGpId] = useState<number | null>(null);
  const [ruralGpName, setRuralGpName] = useState({ hi: '', en: '' });
  const [ruralBlocks, setRuralBlocks] = useState<{ hi: string, en: string }[]>([]);
  const [ruralGps, setRuralGps] = useState<{ gp_id: number; gram_panchayat: { hi: string, en: string }; block: string }[]>([]);
  const [gpSearch, setGpSearch] = useState('');

  const [urbanDistrict, setUrbanDistrict] = useState('');
  const [urbanUlb, setUrbanUlb] = useState('');
  const [urbanWardId, setUrbanWardId] = useState<number | null>(null);
  const [urbanWardName, setUrbanWardName] = useState('');
  const [urbanUlbs, setUrbanUlbs] = useState<string[]>([]);
  const [urbanWards, setUrbanWards] = useState<{ ward_id: number; ward: string; ulb: string }[]>([]);
  const [wardSearch, setWardSearch] = useState('');

  const [generating, setGenerating] = useState(false);
  const [generatingLabel, setGeneratingLabel] = useState('');
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  const [loadingBlocks, setLoadingBlocks] = useState(false);
  const [loadingGps, setLoadingGps] = useState(false);
  const [loadingUlbs, setLoadingUlbs] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const ALWAR_REPORT_PATH = '/reports/alwar-lok-sabha-brief-v2.pdf';
  const scopeLabel = activeTab === 'rural'
    ? ruralGpName.hi
      ? `GP: ${ruralGpName.hi}`
      : ruralBlock.hi
        ? `Block: ${ruralBlock.hi}, ${ruralDistrict}`
        : ruralDistrict
          ? `District: ${ruralDistrict}`
          : 'Select location'
    : activeTab === 'urban'
      ? urbanWardName
        ? `Ward: ${urbanWardName}`
        : urbanUlb
          ? `ULB: ${urbanUlb}, ${urbanDistrict}`
          : urbanDistrict
            ? `District: ${urbanDistrict}`
            : 'Select location'
      : ruralDistrict
        ? `District: ${ruralDistrict}`
        : 'Select location';

  const loadReportHistory = async () => {
    try {
      setHistoryLoading(true);
      const { data, error } = await supabase
        .from('generated_reports')
        .select('id, report_name, scope_type, district, area_type, created_at, file_size_kb, created_by')
        .order('created_at', { ascending: false })
        .limit(50);
      if (!error && data) {
        setReportHistory(data as typeof reportHistory);
      }
    } catch (e) {
      console.warn('Could not load report history:', e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleDeleteReport = async (id: number) => {
    if (!confirm('इस रिपोर्ट को हटाएं?')) return;
    setDeletingId(id);
    try {
      await supabase.from('generated_reports').delete().eq('id', id);
      setReportHistory((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  const handleOpenSavedReport = async (id: number) => {
    try {
      const { data, error } = await supabase
        .from('generated_reports')
        .select('html_content, report_name')
        .eq('id', id)
        .single();
      if (!error && data?.html_content) {
        const blob = new Blob([data.html_content], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const newTab = window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 3000);
        if (!newTab) {
          setGeneratedHtml(data.html_content);
        }
      }
    } catch (e) {
      console.warn('Could not load report:', e);
    }
  };

  const handlePrintSavedReport = async (id: number) => {
    try {
      const { data, error } = await supabase
        .from('generated_reports')
        .select('html_content, report_name')
        .eq('id', id)
        .single();
      if (!error && data?.html_content) {
        const blob = new Blob([data.html_content], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const printWindow = window.open(url, '_blank');
        if (printWindow) {
          printWindow.addEventListener('load', () => {
            setTimeout(() => {
              printWindow.focus();
              printWindow.print();
            }, 800);
          });
        }
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      }
    } catch (e) {
      console.warn('Could not print report:', e);
    }
  };

  useEffect(() => {
    loadReportHistory();
  }, []);

  async function handleRuralDistrictChange(district: string) {
    setRuralDistrict(district);
    setRuralBlock({ hi: '', en: '' });
    setRuralGpId(null);
    setRuralGpName({ hi: '', en: '' });
    setRuralGps([]);
    setGpSearch('');

    if (!district) {
      setRuralBlocks([]);
      return;
    }

    setLoadingBlocks(true);
    try {
      const blocks = await fetchBlocksForDistrict(district);
      setRuralBlocks(blocks);
    } catch (error) {
      console.error('Failed to load blocks:', error);
      setRuralBlocks([]);
    } finally {
      setLoadingBlocks(false);
    }
  }

  async function handleRuralBlockChange(blockHi: string) {
    const blockObj = ruralBlocks.find(b => b.hi === blockHi) || { hi: blockHi, en: '' };
    setRuralBlock(blockObj);
    setRuralGpId(null);
    setRuralGpName({ hi: '', en: '' });
    setGpSearch('');

    if (!blockHi) {
      setRuralGps([]);
      return;
    }

    setLoadingGps(true);
    try {
      const gps = await fetchGpsForBlock(ruralDistrict, blockHi);
      setRuralGps(gps);
    } catch (error) {
      console.error('Failed to load GPs:', error);
      setRuralGps([]);
    } finally {
      setLoadingGps(false);
    }
  }

  async function handleUrbanDistrictChange(district: string) {
    setUrbanDistrict(district);
    setUrbanUlb('');
    setUrbanWardId(null);
    setUrbanWardName('');
    setUrbanWards([]);
    setWardSearch('');

    if (!district) {
      setUrbanUlbs([]);
      return;
    }

    setLoadingUlbs(true);
    try {
      const ulbs = await fetchUlbsForDistrict(district);
      setUrbanUlbs(ulbs);
    } catch (error) {
      console.error('Failed to load ULBs:', error);
      setUrbanUlbs([]);
    } finally {
      setLoadingUlbs(false);
    }
  }

  async function handleUrbanUlbChange(ulb: string) {
    setUrbanUlb(ulb);
    setUrbanWardId(null);
    setUrbanWardName('');
    setWardSearch('');

    if (!ulb) {
      setUrbanWards([]);
      return;
    }

    setLoadingWards(true);
    try {
      const wards = await fetchWardsForUlb(urbanDistrict, ulb);
      setUrbanWards(wards);
    } catch (error) {
      console.error('Failed to load wards:', error);
      setUrbanWards([]);
    } finally {
      setLoadingWards(false);
    }
  }

  async function handleGenerateReport() {
    const district = activeTab === 'rural' ? ruralDistrict : activeTab === 'urban' ? urbanDistrict : ruralDistrict;
    if (!district) {
      alert('Pehle district select karo');
      return;
    }
    setReportError(null);
    setGenerating(true);
    setGeneratingLabel('Data fetch ho raha hai...');

    try {
      const scope = activeTab === 'rural'
        ? {
          type: 'rural' as const,
          district: ruralDistrict,
          block: ruralBlock.hi || null,
          blockEn: ruralBlock.en || null,
          gpId: ruralGpId || null,
          gpName: ruralGpName.hi || null,
          gpNameEn: ruralGpName.en || null,
        }
        : activeTab === 'urban'
          ? {
            type: 'urban' as const,
            district: urbanDistrict,
            ulb: urbanUlb || null,
            wardId: urbanWardId || null,
            wardName: urbanWardName || null,
          }
          : {
            type: 'district' as const,
            district: ruralDistrict,
            block: null,
            blockEn: null,
            gpId: null,
            gpName: null,
            gpNameEn: null,
            ulb: null,
            wardId: null,
            wardName: null,
          };

      const reportData = await fetchScopedReportData(scope);
      setGeneratingLabel('Manthaan AI report likh raha hai...');
      const narrative = await generateNarrative(reportData, scope);
      setGeneratingLabel('Report render ho rahi hai...');
      renderReport(scope, reportData, narrative);
    } catch (err: any) {
      console.error('[Manthaan AI]', err.message);
      setReportError(err.message || 'Manthaan AI अभी उपलब्ध नहीं है। कृपया कुछ समय बाद पुनः प्रयास करें।');
    } finally {
      setGenerating(false);
      setGeneratingLabel('');
    }
  }

  async function fetchScopedReportData(scope: any) {
    const S = (rows: any[], col: string) => rows.reduce((a: number, r: any) => a + (Number(r[col]) || 0), 0);
    const A = (rows: any[], col: string) => {
      const vals = rows.map((r: any) => Number(r[col])).filter((v: number) => v > 0);
      return vals.length ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : 0;
    };

    const dbDistrict = DISTRICT_EN_TO_HI[scope.district] || scope.district;
    const RURAL_ASP_SELECT = 'district, block, gram_panchayat, gp_id, item, sector, priority, qty_2030, qty_2035, qty_2047, status, total_budget, scheme, fast_track';
    const URBAN_ASP_SELECT = 'district, ulb, ward, ward_id, item, sector, priority, qty_2030, qty_2035, qty_2047, status, total_budget, scheme, fast_track';

    if (scope.type === 'district') {
      // ── RURAL BASELINE ──────────────────────────────────────────
      const { data: ruralData, error: ruralError } = await supabase
        .from('baseline_rural').select('*').eq('district', dbDistrict);
      if (ruralError || !ruralData || ruralData.length === 0) throw new Error('No rural data found for district.');

      // ── URBAN BASELINE ──────────────────────────────────────────
      const { data: urbanData, error: urbanError } = await supabase
        .from('baseline_urban').select('*').eq('district', dbDistrict);
      const hasUrban = !urbanError && urbanData && urbanData.length > 0;
      const uData = hasUrban ? urbanData : [];

      // ── ASPIRATIONS (both rural + urban) — PAGINATED ────────────
      // A full district can have thousands of aspiration rows; unpaginated queries
      // silently truncate at Supabase/PostgREST's default row cap, causing some
      // sectors to show zero data. Page through both tables fully.
      async function fetchAllAspirationRows(table: 'aspirations_rural' | 'aspirations_urban', selectCols: string) {
        const PAGE_SIZE = 1000;
        let allRows: any[] = [];
        let from = 0;
        let keepFetching = true;

        while (keepFetching) {
          const { data: pageData, error: pageError } = await supabase
            .from(table)
            .select(selectCols)
            .in('status', ['ACCEPT', 'FUNDED', 'REVIEW'])
            .ilike('district', dbDistrict)
            .range(from, from + PAGE_SIZE - 1);

          if (pageError) {
            console.warn(`[District Asp] ${table} fetch error:`, pageError.message);
            break;
          }

          if (!pageData || pageData.length === 0) {
            keepFetching = false;
          } else {
            allRows = allRows.concat(pageData);
            if (pageData.length < PAGE_SIZE) {
              keepFetching = false;
            } else {
              from += PAGE_SIZE;
            }
          }
        }

        return allRows;
      }

      const [ruralAspRows, urbanAspRows] = await Promise.all([
        fetchAllAspirationRows('aspirations_rural', RURAL_ASP_SELECT),
        fetchAllAspirationRows('aspirations_urban', URBAN_ASP_SELECT),
      ]);
      const allAspirations = [...ruralAspRows, ...urbanAspRows];

      console.log(`[District Asp] Total aspirations fetched for ${scope.district}: ${allAspirations.length} (rural: ${ruralAspRows.length}, urban: ${urbanAspRows.length})`);

      // ── GP + WARD PROFILE TEXTS (for Gemini aggregation) ───────
      const allGpProfilesDistrict: string[] = ruralData
        .map((r: any) => String(r.gp_profile || r.gp_profiles || '').trim())
        .filter((text: string) => text.length > 10);

      const allWardProfilesDistrict: string[] = uData
        .map((r: any) => String(r.ward_profile || r.ward_profiles || r.urban_profile || r.profile || '').trim())
        .filter((text: string) => text.length > 10);

      const allProfileTextsDistrict = [...allGpProfilesDistrict, ...allWardProfilesDistrict];

      return {
        scopeType: 'district',
        scopeLabel: `${scope.district} District`,
        meta: {
          district: scope.district,
          gpCount: [...new Set(ruralData.map((r: any) => r.gram_panchayat))].length,
          blockCount: [...new Set(ruralData.map((r: any) => r.block))].length,
          blocks: [...new Set(ruralData.map((r: any) => r.block))],
          wardCount: uData.length,
          ulbCount: [...new Set(uData.map((r: any) => r.ulb))].length,
          ulbs: [...new Set(uData.map((r: any) => r.ulb))],
          isSingleGp: false,
          isSingleWard: false,
        },
        population: {
          total: S(ruralData, 'pop_2026_est'),
          male: S(ruralData, 'male_pop_2026') + S(uData, 'male_pop_2026'),
          female: S(ruralData, 'female_pop_2026') + S(uData, 'female_pop_2026'),
          children06: S(ruralData, 'children_0_6_2026') + S(uData, 'children_0_6_2026'),
          children614: S(ruralData, 'children_6_14_2026') + S(uData, 'children_6_14_2026'),
          pop14_18: S(ruralData, 'pop_14_18_2026') + S(uData, 'pop_14_18_2026'),
          seniors: S(ruralData, 'senior_citizens_2026') + S(uData, 'senior_citizens_2026'),
          pwd: S(ruralData, 'pwd_pop_2026') + S(uData, 'pwd_pop_2026'),
          totalFamilies: S(ruralData, 'total_families_2026'),
          bplFamilies: S(ruralData, 'bpl_families_2026'),
          puccaHouses: S(ruralData, 'pucca_houses_2026') + S(uData, 'pucca_houses_2026'),
          kutchaHouses: S(ruralData, 'kutcha_houses_2026') + S(uData, 'kutcha_houses_2026'),
          urbanPop: S(uData, 'pop_2026_est'),
          urbanPop14_18: S(uData, 'pop_14_18_2026'),
        },
        water: {
          ruralFhtcAvg: A(ruralData, 'tap_connection_pct').toFixed(1),
          gpsBelow30Fhtc: ruralData.filter((r: any) => r.tap_connection_pct < 30).length,
          overheadTanks: S(ruralData, 'overhead_tanks_count') + S(uData, 'overhead_tanks_count'),
          groundwaterDepth: A(ruralData, 'groundwater_depth_meters').toFixed(1),
          roFacilities: S(ruralData, 'ro_facilities') + S(uData, 'ro_facilities'),
          urbanFhtcAvg: A(uData, 'tap_connection_pct').toFixed(1),
        },
        agriculture: {
          cultivableHa: S(ruralData, 'cultivable_land_hectare'),
          irrigatedHa: S(ruralData, 'irrigated_area_hectare'),
          irrigationPct: S(ruralData, 'cultivable_land_hectare') > 0
            ? ((S(ruralData, 'irrigated_area_hectare') / S(ruralData, 'cultivable_land_hectare')) * 100).toFixed(1) : 0,
          totalFarmers: S(ruralData, 'total_farmers_count'),
          kccHolders: S(ruralData, 'kcc_holders_count'),
          pmKisan: S(ruralData, 'pm_cm_kisan_beneficiaries'),
          soilCards: S(ruralData, 'soil_health_cards_valid'),
          cropInsurance: S(ruralData, 'crop_insurance_farmers_count'),
          fpos: S(ruralData, 'fpo_count'),
          solarPumps: S(ruralData, 'solar_pumps_count'),
        },
        dairy: {
          totalLivestock: S(ruralData, 'total_livestock_count'),
          milchAnimals: S(ruralData, 'milch_animals_count'),
          dailyMilkLpd: S(ruralData, 'daily_milk_prod_litres'),
          annualDairyValueCr: (S(ruralData, 'daily_milk_prod_litres') * 365 * 50 / 10000000).toFixed(0),
          milkCenters: S(ruralData, 'milk_collection_centers'),
          goatFarms: S(ruralData, 'goat_farms_count'),
          poultryFarms: S(ruralData, 'poultry_farms_count'),
        },
        health: {
          allopathicCenters: S(ruralData, 'allopathic_centers') + S(uData, 'allopathic_centers'),
          ayushCenters: S(ruralData, 'ayush_centers') + S(uData, 'ayush_centers'),
          healthBeds: S(ruralData, 'health_center_beds'),
          healthStaff: S(ruralData, 'working_health_staff') + S(uData, 'working_health_staff'),
          ayushmanBen: S(ruralData, 'ayushman_arogya_beneficiaries'),
          tbPatients: S(ruralData, 'tb_patients_count') + S(uData, 'tb_patients_count'),
          anemicPregnant: S(ruralData, 'anemic_pregnant_women_count') + S(uData, 'anemic_pregnant_women_count'),
          samChildren: S(ruralData, 'sam_children_count') + S(uData, 'sam_children_count'),
          ashaWorkers: S(ruralData, 'asha_workers_count') + S(uData, 'asha_workers_count'),
          awcCenters: S(ruralData, 'anganwadi_centers_count') + S(uData, 'anganwadi_centers_count'),
          urbanHealthBeds: S(uData, 'health_center_beds'),
          urbanAyushman: S(uData, 'ayushman_arogya_beneficiaries'),
          privateHealthCenters: S(uData, 'private_health_centers'),
        },
        education: {
          govtSchools: S(ruralData, 'govt_schools_count') + S(uData, 'govt_schools_count'),
          pvtSchools: S(ruralData, 'pvt_schools_count') + S(uData, 'pvt_schools_count'),
          totalSchools: S(ruralData, 'total_schools_count') + S(uData, 'total_schools_count'),
          workingTeachers: S(ruralData, 'working_teachers') + S(uData, 'working_teachers'),
          sanctionedTeachers: S(ruralData, 'sanctioned_teachers') + S(uData, 'sanctioned_teachers'),
          enrolledStudents: S(ruralData, 'total_enrolled_students') + S(uData, 'total_enrolled_students'),
          dropouts: S(ruralData, 'dropout_children_prev_year') + S(uData, 'dropout_children_prev_year'),
          skillCenters: S(ruralData, 'skill_training_centers_count'),
          awcCenters: S(ruralData, 'anganwadi_centers_count') + S(uData, 'anganwadi_centers_count'),
          ashaWorkers: S(ruralData, 'asha_workers_count') + S(uData, 'asha_workers_count'),
          samChildren: S(ruralData, 'sam_children_count') + S(uData, 'sam_children_count'),
          anganwadiEnrolledChildren: S(ruralData, 'anganwadi_enrolled_children') + S(uData, 'anganwadi_enrolled_children'),
          dataAvailable: true,
        },
        social: {
          oldAgePensioners: S(ruralData, 'old_age_pensioners') + S(uData, 'old_age_pensioners'),
          widowPensioners: S(ruralData, 'widow_pensioners'),
          pwdPensioners: S(ruralData, 'pwd_pensioners_est') + S(uData, 'pwd_pensioners_est'),
          ujjwalaBen: S(ruralData, 'pm_ujjwala_beneficiaries') + S(uData, 'pm_ujjwala_beneficiaries'),
          awasBen: S(ruralData, 'pm_cm_awas_beneficiaries'),
          urbanWidow: S(uData, 'widow_pensioners'),
          urbanAwas: S(uData, 'pm_cm_awas_beneficiaries'),
        },
        economy: {
          activeShgs: S(ruralData, 'active_shg_count') + S(uData, 'active_shg_count'),
          shgWomen: S(ruralData, 'women_in_shgs') + S(uData, 'women_in_shgs'),
          lakhpatiDidis: S(ruralData, 'lakhpati_didis_count'),
          millionaireDidis: S(ruralData, 'millionaire_didis_count'),
          mudraLoan: S(ruralData, 'mudra_loan_beneficiaries'),
          artisans: S(ruralData, 'local_artisans_count') + S(uData, 'local_artisans_count'),
          urbanShgs: S(uData, 'active_shg_count'),
          urbanIndustries: S(uData, 'large_industrial_units') + S(uData, 'small_scale_industries'),
          largeIndustrialUnits: S(uData, 'large_industrial_units'),
          smallScaleIndustries: S(uData, 'small_scale_industries'),
        },
        infrastructure: {
          electricityHouses: S(ruralData, 'houses_with_electricity') + S(uData, 'houses_with_electricity'),
          roadKm: S(ruralData, 'road_length_km') + S(uData, 'road_length_km'),
          streetLights: S(ruralData, 'total_street_lights'),
          govtBanks: S(ruralData, 'govt_banks_count') + S(uData, 'govt_banks_count'),
          postOffices: S(ruralData, 'post_offices_count'),
          publicToilets: S(ruralData, 'public_toilets') + S(uData, 'public_toilets_functional'),
          solarHomes: S(ruralData, 'solar_installed_houses') + S(uData, 'solar_installed_houses'),
          privateBanks: S(uData, 'private_banks_count'),
        },
        environment: {
          forestHa: S(ruralData, 'forest_area_hectare') + S(uData, 'forest_area_hectare'),
          pastureHa: S(ruralData, 'pasture_land_hectare'),
          biogasPlants: S(ruralData, 'biogas_plants_count'),
          govtCompostPits: S(ruralData, 'govt_compost_pits_count') + S(uData, 'govt_compost_pits_count'),
          pvtCompostPits: S(ruralData, 'pvt_compost_pits_count'),
          suryaGharHomes: S(ruralData, 'pm_surya_ghar_solar_houses') + S(uData, 'pm_surya_ghar_solar_houses'),
          wasteKgDay: S(ruralData, 'total_waste_daily_kg'),
          housesWithToilets: S(ruralData, 'houses_with_toilets'),
          housesWithoutToilets: S(uData, 'houses_without_toilets'),
          govtNurseries: S(uData, 'govt_nurseries_count'),
          nurserySaplingsAvailable: S(uData, 'nursery_plants_count'),
        },
        tourism: {
          heritageSites: S(ruralData, 'cultural_assets_count'),
          annualFairs: S(ruralData, 'annual_fairs_count'),
          dailyFootfall: A(ruralData, 'avg_daily_footfall_cultural_sites'),
          avgFairFootfallDaily: A(ruralData, 'avg_fair_footfall_daily'),
          trainedGuides: S(ruralData, 'registered_trained_guides') + S(uData, 'registered_trained_guides'),
          fairEmployment: S(ruralData, 'fair_related_employment') + S(uData, 'fair_shg_stalls_count'),
          localProductStalls: S(ruralData, 'fair_product_stalls_count'),
        },
        governance: {
          distPoliceKm: A(ruralData, 'dist_police_station_km'),
          distEmitraKm: A(ruralData, 'dist_emitra_km'),
          distLpgKm: A(ruralData, 'dist_lpg_distributor_km'),
          urbanPoliceKm: 0, urbanEmitraKm: 0,
        },
        profileText: '',
        allProfileTexts: allProfileTextsDistrict,
        aspirations: allAspirations,
      };
    }

    if (scope.type === 'rural') {
      // ── RURAL BASELINE ──────────────────────────────────────────
      let query = supabase.from('baseline_rural').select('*').eq('district', dbDistrict);
      if (scope.block) query = query.eq('block', scope.block);
      if (scope.gpName) query = query.ilike('gram_panchayat', scope.gpName);

      const { data, error } = await query;
      if (error || !data || data.length === 0) throw new Error('No rural data found.');
      // Collect all non-empty profile texts from data
      const allGpProfiles: string[] = data
        .map((r: any) => String(r.gp_profile || r.gp_profiles || '').trim())
        .filter((text: string) => text.length > 10);

      const gpProfileText: string = (() => {
        if (scope.gpName) {
          const gpRow = data.find((r: any) =>
            String(r.gram_panchayat || '').trim().toLowerCase() === String(scope.gpName || '').trim().toLowerCase()
          );
          const raw = gpRow?.gp_profile || gpRow?.gp_profiles || allGpProfiles[0] || '';
          // Truncate to ~3-4 lines to fit the report box
          return String(raw).slice(0, 1200);
        }
        // Block or district level: aggregate via Gemini later (return raw list for now)
        return '';
      })();

      // ── RURAL ASPIRATIONS ─────────────────────────────────────────────────
      // aspirations_rural stores all names in Hindi:
      //   district = Hindi | block = Hindi | gram_panchayat = Hindi
      //   scope.gpName = Hindi | scope.gpId = numeric id (if available)
      let ruralAspData: any[] = [];
      try {
        let ruralAspQuery = supabase
          .from('aspirations_rural')
          .select(RURAL_ASP_SELECT)
          .in('status', ['ACCEPT', 'FUNDED', 'REVIEW']);

        if (scope.gpName) {
          // GP-level: exact match on Hindi gram_panchayat
          console.log(`[Rural Asp] Attempting exact match: gpName="${scope.gpName}" (Hindi)`);
          ruralAspQuery = ruralAspQuery.ilike('gram_panchayat', scope.gpName.trim());

          const { data: exactMatch, error: err1 } = await ruralAspQuery;
          if (err1) {
            console.warn('[Rural Asp] fetch error:', err1.message);
            ruralAspData = [];
          } else {
            ruralAspData = exactMatch || [];
            console.log(`[Rural Asp] Exact match found: ${ruralAspData.length} records`);
          }

          // Fallback to gp_id if exact name match gave 0 results
          if (ruralAspData.length === 0 && scope.gpId) {
            console.log(`[Rural Asp] Fallback to gp_id=${scope.gpId}`);
            const { data: fallback } = await supabase
              .from('aspirations_rural')
              .select(RURAL_ASP_SELECT)
              .in('status', ['ACCEPT', 'FUNDED', 'REVIEW'])
              .eq('gp_id', scope.gpId);
            ruralAspData = fallback || [];
            console.log(`[Rural Asp] Fallback to gp_id=${scope.gpId}: ${ruralAspData.length} records`);
          }

          // If still 0, return district-level data (no partial/fuzzy matching)
          if (ruralAspData.length === 0) {
            console.log(`[Rural Asp] No GP match, falling back to district-level`);
            const { data: districtFallback } = await supabase
              .from('aspirations_rural')
              .select(RURAL_ASP_SELECT)
              .in('status', ['ACCEPT', 'FUNDED', 'REVIEW'])
              .ilike('district', dbDistrict);
            ruralAspData = districtFallback || [];
          }
        } else if (scope.block) {
          // Block-level: filter by block, return all GPs
          ruralAspQuery = ruralAspQuery
            .ilike('district', dbDistrict)
            .ilike('block', scope.block);
          const { data: blockData, error: blockErr } = await ruralAspQuery;
          if (blockErr) {
            console.warn('[Rural Asp] block fetch error:', blockErr.message);
            ruralAspData = [];
          } else {
            ruralAspData = blockData || [];
          }
        } else {
          // District-level: filter by district only
          ruralAspQuery = ruralAspQuery.ilike('district', dbDistrict);
          const { data: distData, error: distErr } = await ruralAspQuery;
          if (distErr) {
            console.warn('[Rural Asp] district fetch error:', distErr.message);
            ruralAspData = [];
          } else {
            ruralAspData = distData || [];
          }
        }
      } catch (err) {
        console.warn('[Rural Asp] exception:', err);
        ruralAspData = [];
      }



      return {
        scopeType: 'rural',
        scopeLabel: `${scope.gpName || scope.block || scope.district} Rural`,
        meta: {
          district: scope.district,
          gpCount: [...new Set(data.map((r: any) => r.gram_panchayat))].length,
          blockCount: [...new Set(data.map((r: any) => r.block))].length,
          blocks: [...new Set(data.map((r: any) => r.block))],
          isSingleGp: !!scope.gpName,
          isSingleWard: false,
        },
        population: {
          total: S(data, 'pop_2026_est'), male: S(data, 'male_pop_2026'), female: S(data, 'female_pop_2026'),
          children06: S(data, 'children_0_6_2026'), children614: S(data, 'children_6_14_2026'),
          pop14_18: S(data, 'pop_14_18_2026'),
          seniors: S(data, 'senior_citizens_2026'), pwd: S(data, 'pwd_pop_2026'),
          totalFamilies: S(data, 'total_families_2026'), bplFamilies: S(data, 'bpl_families_2026'),
          puccaHouses: S(data, 'pucca_houses_2026'), kutchaHouses: S(data, 'kutcha_houses_2026'), urbanPop: 0,
        },
        water: {
          ruralFhtcAvg: A(data, 'tap_connection_pct').toFixed(1),
          gpsBelow30Fhtc: data.filter((r: any) => r.tap_connection_pct < 30).length,
          overheadTanks: S(data, 'overhead_tanks_count'),
          groundwaterDepth: A(data, 'groundwater_depth_meters').toFixed(1),
          roFacilities: S(data, 'ro_facilities'), urbanFhtcAvg: '0',
        },
        agriculture: {
          cultivableHa: S(data, 'cultivable_land_hectare'), irrigatedHa: S(data, 'irrigated_area_hectare'),
          irrigationPct: S(data, 'cultivable_land_hectare') > 0
            ? ((S(data, 'irrigated_area_hectare') / S(data, 'cultivable_land_hectare')) * 100).toFixed(1) : 0,
          totalFarmers: S(data, 'total_farmers_count'), kccHolders: S(data, 'kcc_holders_count'),
          pmKisan: S(data, 'pm_cm_kisan_beneficiaries'), soilCards: S(data, 'soil_health_cards_valid'),
          cropInsurance: S(data, 'crop_insurance_farmers_count'), fpos: S(data, 'fpo_count'),
          solarPumps: S(data, 'solar_pumps_count'),
        },
        dairy: {
          totalLivestock: S(data, 'total_livestock_count'), milchAnimals: S(data, 'milch_animals_count'),
          dailyMilkLpd: S(data, 'daily_milk_prod_litres'),
          annualDairyValueCr: (S(data, 'daily_milk_prod_litres') * 365 * 50 / 10000000).toFixed(0),
          milkCenters: S(data, 'milk_collection_centers'), goatFarms: S(data, 'goat_farms_count'),
          poultryFarms: S(data, 'poultry_farms_count'),
        },
        health: {
          allopathicCenters: S(data, 'allopathic_centers'), ayushCenters: S(data, 'ayush_centers'),
          healthBeds: S(data, 'health_center_beds'), healthStaff: S(data, 'working_health_staff'),
          ayushmanBen: S(data, 'ayushman_arogya_beneficiaries'), tbPatients: S(data, 'tb_patients_count'),
          anemicPregnant: S(data, 'anemic_pregnant_women_count'), samChildren: S(data, 'sam_children_count'),
          ashaWorkers: S(data, 'asha_workers_count'), awcCenters: S(data, 'anganwadi_centers_count'),
          urbanHealthBeds: 0, urbanAyushman: 0,
        },
        education: {
          govtSchools: S(data, 'govt_schools_count'), pvtSchools: S(data, 'pvt_schools_count'),
          totalSchools: S(data, 'total_schools_count'), workingTeachers: S(data, 'working_teachers'),
          sanctionedTeachers: S(data, 'sanctioned_teachers'), enrolledStudents: S(data, 'total_enrolled_students'),
          dropouts: S(data, 'dropout_children_prev_year'), skillCenters: S(data, 'skill_training_centers_count'),
          awcCenters: S(data, 'anganwadi_centers_count'), ashaWorkers: S(data, 'asha_workers_count'),
          samChildren: S(data, 'sam_children_count'),
          anganwadiEnrolledChildren: S(data, 'anganwadi_enrolled_children'),
          dataAvailable: data.length > 0,
        },
        social: {
          oldAgePensioners: S(data, 'old_age_pensioners'), widowPensioners: S(data, 'widow_pensioners'),
          pwdPensioners: S(data, 'pwd_pensioners_est'), ujjwalaBen: S(data, 'pm_ujjwala_beneficiaries'),
          awasBen: S(data, 'pm_cm_awas_beneficiaries'), urbanWidow: 0, urbanAwas: 0,
        },
        economy: {
          activeShgs: S(data, 'active_shg_count'), shgWomen: S(data, 'women_in_shgs'),
          lakhpatiDidis: S(data, 'lakhpati_didis_count'), millionaireDidis: S(data, 'millionaire_didis_count'),
          mudraLoan: S(data, 'mudra_loan_beneficiaries'), artisans: S(data, 'local_artisans_count'),
          urbanShgs: 0, urbanIndustries: 0,
        },
        infrastructure: {
          electricityHouses: S(data, 'houses_with_electricity'), roadKm: S(data, 'road_length_km'),
          streetLights: S(data, 'total_street_lights'), govtBanks: S(data, 'govt_banks_count'),
          postOffices: S(data, 'post_offices_count'), publicToilets: S(data, 'public_toilets'),
          solarHomes: S(data, 'solar_installed_houses'),
        },
        environment: {
          forestHa: S(data, 'forest_area_hectare'), pastureHa: S(data, 'pasture_land_hectare'),
          biogasPlants: S(data, 'biogas_plants_count'), govtCompostPits: S(data, 'govt_compost_pits_count'),
          pvtCompostPits: S(data, 'pvt_compost_pits_count'),
          suryaGharHomes: S(data, 'pm_surya_ghar_solar_houses'),
          wasteKgDay: S(data, 'total_waste_daily_kg'), housesWithToilets: S(data, 'houses_with_toilets'),
        },
        tourism: {
          heritageSites: S(data, 'cultural_assets_count'), annualFairs: S(data, 'annual_fairs_count'),
          dailyFootfall: A(data, 'avg_daily_footfall_cultural_sites'),
          avgFairFootfallDaily: A(data, 'avg_fair_footfall_daily'),
          trainedGuides: S(data, 'registered_trained_guides'), fairEmployment: S(data, 'fair_related_employment'),
          localProductStalls: S(data, 'fair_product_stalls_count'),
        },
        governance: {
          distPoliceKm: A(data, 'dist_police_station_km'),
          distEmitraKm: A(data, 'dist_emitra_km'),
          distLpgKm: A(data, 'dist_lpg_distributor_km'),
          urbanPoliceKm: 0, urbanEmitraKm: 0,
        },
        profileText: gpProfileText,
        allProfileTexts: scope.gpName ? [] : allGpProfiles,
        aspirations: ruralAspData,
      };

    } else {
      // ── URBAN BASELINE ──────────────────────────────────────────
      let query = supabase.from('baseline_urban').select('*').eq('district', dbDistrict);
      if (scope.ulb) query = query.eq('ulb', scope.ulb);
      if (scope.wardName) query = query.eq('ward', scope.wardName);

      const { data, error } = await query;
      if (error || !data || data.length === 0) throw new Error('No urban data found.');
      // Debug: log what profile columns exist in the first row
      if (data.length > 0) {
        const firstRow = data[0];
        const profileCols = Object.keys(firstRow).filter(k =>
          k.toLowerCase().includes('profile') || k.toLowerCase().includes('urban_profile')
        );
        console.log('[Ward Profile] Available profile columns:', profileCols);
        console.log('[Ward Profile] scope.wardName:', scope.wardName);
        console.log('[Ward Profile] data rows:', data.length);
        if (data.length > 0) {
          console.log('[Ward Profile] First row sample:', {
            ward: data[0].ward,
            ward_profile: data[0].ward_profile,
            ward_profiles: data[0].ward_profiles,
            urban_profile: data[0].urban_profile,
            profile: data[0].profile,
          });
        }
      }

      // Try ALL possible column name variants
      const getProfileText = (row: any): string => {
        return String(
          row?.ward_profile ||
          row?.ward_profiles ||
          row?.urban_profile ||
          row?.profile ||
          row?.ward_description ||
          row?.description ||
          ''
        ).trim();
      };

      const allWardProfiles: string[] = data
        .map((r: any) => getProfileText(r))
        .filter((text: string) => text.length > 10);

      const wardProfileText: string = (() => {
        if (scope.wardName) {
          // data is already filtered to this ward by the query above
          // Just take the first row's profile text
          const raw = data.length > 0 ? getProfileText(data[0]) : (allWardProfiles[0] || '');
          console.log('[Ward Profile] raw text found:', raw.slice(0, 100));
          return String(raw).slice(0, 1200);
        }
        return '';
      })();

      // ── URBAN ASPIRATIONS ──────────────────────────────────────────────────────
      // aspirations_urban stores all names in Hindi:
      //   district = Hindi | ulb = Hindi | ward = Hindi
      //   scope.ulb = Hindi | scope.wardName = Hindi | scope.wardId = numeric (if available)
      let urbanAspData: any[] = [];
      try {
        if (scope.ulb && scope.wardName) {
          // ULB + ward level: exact match on both
          console.log(`[Urban Asp] Exact match: ulb="${scope.ulb}" ward="${scope.wardName}"`);
          let q = supabase
            .from('aspirations_urban')
            .select(URBAN_ASP_SELECT)
            .in('status', ['ACCEPT', 'FUNDED', 'REVIEW'])
            .ilike('ulb', scope.ulb.trim())
            .ilike('ward', scope.wardName.trim());
          const { data: exact } = await q;
          urbanAspData = exact || [];
          console.log(`[Urban Asp] Exact ulb+ward match: ${urbanAspData.length} records`);

          // Fallback to ward_id if name match gave 0
          if (urbanAspData.length === 0 && scope.wardId) {
            console.log(`[Urban Asp] Fallback to ward_id=${scope.wardId}`);
            const { data: fallback } = await supabase
              .from('aspirations_urban')
              .select(URBAN_ASP_SELECT)
              .in('status', ['ACCEPT', 'FUNDED', 'REVIEW'])
              .ilike('ulb', scope.ulb.trim())
              .eq('ward_id', scope.wardId);
            urbanAspData = fallback || [];
            console.log(`[Urban Asp] ward_id fallback: ${urbanAspData.length} records`);
          }

          if (urbanAspData.length === 0) {
            console.log(`[Urban Asp] No match for ulb+ward, returning empty`);
          }
        } else if (scope.ulb) {
          // ULB level only
          console.log(`[Urban Asp] ULB match: ulb="${scope.ulb}"`);
          const { data: ulbData } = await supabase
            .from('aspirations_urban')
            .select(URBAN_ASP_SELECT)
            .in('status', ['ACCEPT', 'FUNDED', 'REVIEW'])
            .ilike('ulb', scope.ulb.trim());
          urbanAspData = ulbData || [];
          console.log(`[Urban Asp] ULB match: ${urbanAspData.length} records`);
        } else if (scope.wardName) {
          // Ward only (rare — usually ward comes with ULB)
          console.log(`[Urban Asp] Ward match: ward="${scope.wardName}"`);
          let q = supabase
            .from('aspirations_urban')
            .select(URBAN_ASP_SELECT)
            .in('status', ['ACCEPT', 'FUNDED', 'REVIEW'])
            .ilike('ward', scope.wardName.trim());
          const { data: wardExact } = await q;
          urbanAspData = wardExact || [];
          console.log(`[Urban Asp] Ward exact match: ${urbanAspData.length} records`);

          if (urbanAspData.length === 0 && scope.wardId) {
            console.log(`[Urban Asp] Ward fallback to ward_id=${scope.wardId}`);
            const { data: fallback } = await supabase
              .from('aspirations_urban')
              .select(URBAN_ASP_SELECT)
              .in('status', ['ACCEPT', 'FUNDED', 'REVIEW'])
              .eq('ward_id', scope.wardId);
            urbanAspData = fallback || [];
            console.log(`[Urban Asp] ward_id fallback: ${urbanAspData.length} records`);
          }

          if (urbanAspData.length === 0) {
            console.log(`[Urban Asp] No ward match, returning empty`);
          }
        } else {
          // District level
          console.log(`[Urban Asp] District match: district="${dbDistrict}"`);
          const { data: distData } = await supabase
            .from('aspirations_urban')
            .select(URBAN_ASP_SELECT)
            .in('status', ['ACCEPT', 'FUNDED', 'REVIEW'])
            .ilike('district', dbDistrict);
          urbanAspData = distData || [];
          console.log(`[Urban Asp] District-level: ${urbanAspData.length} records`);
        }
      } catch (err) {
        console.warn('[Urban Asp] exception:', err);
        urbanAspData = [];
      }

      return {
        scopeType: 'urban',
        scopeLabel: `${scope.wardName || scope.ulb || scope.district} Urban`,
        meta: {
          district: scope.district,
          wardCount: data.length,
          ulbCount: [...new Set(data.map((r: any) => r.ulb))].length,
          ulbs: [...new Set(data.map((r: any) => r.ulb))],
          isSingleWard: !!scope.wardName,
          isSingleGp: false,
        },
        population: {
          male: S(data, 'male_pop_2026'), female: S(data, 'female_pop_2026'),
          children06: S(data, 'children_0_6_2026'), children614: S(data, 'children_6_14_2026'),
          urbanPop14_18: S(data, 'pop_14_18_2026'),
          seniors: S(data, 'senior_citizens_2026'), pwd: S(data, 'pwd_pop_2026'),
          puccaHouses: S(data, 'pucca_houses_2026'), kutchaHouses: S(data, 'kutcha_houses_2026'),
          urbanPop: S(data, 'pop_2026_est'), total: 0, totalFamilies: 0, bplFamilies: 0,
        },
        water: {
          overheadTanks: S(data, 'overhead_tanks_count'),
          groundwaterDepth: A(data, 'groundwater_depth_meters').toFixed(1),
          urbanFhtcAvg: A(data, 'tap_connection_pct').toFixed(1),
          ruralFhtcAvg: '0', gpsBelow30Fhtc: 0, roFacilities: S(data, 'ro_facilities'),
        },
        health: {
          allopathicCenters: S(data, 'allopathic_centers'), ayushCenters: S(data, 'ayush_centers'),
          healthBeds: S(data, 'health_center_beds'), healthStaff: S(data, 'working_health_staff'),
          privateHealthCenters: S(data, 'private_health_centers'),
          tbPatients: S(data, 'tb_patients_count'), anemicPregnant: S(data, 'anemic_pregnant_women_count'),
          hypertensionScreening2025_26: S(data, 'bp_screened_fy2526'),
          diabetesScreening2025_26: S(data, 'diabetes_screened_fy2526'),
          urbanHealthBeds: S(data, 'health_center_beds'),
          urbanAyushman: S(data, 'ayushman_arogya_beneficiaries'),
          samChildren: S(data, 'sam_children_count'), ashaWorkers: S(data, 'asha_workers_count'),
          awcCenters: S(data, 'anganwadi_centers_count'), snpRecipients: S(data, 'snp_children_6_72m'),
          ayushmanBen: S(data, 'ayushman_arogya_beneficiaries'),
        },
        education: {
          totalSchools: S(data, 'total_schools_count'), govtSchools: S(data, 'govt_schools_count'),
          pvtSchools: S(data, 'pvt_schools_count'), workingTeachers: S(data, 'working_teachers'),
          sanctionedTeachers: S(data, 'sanctioned_teachers'),
          enrolledStudents: S(data, 'total_enrolled_students'),
          dropouts: S(data, 'dropout_children_prev_year'), awcCenters: S(data, 'anganwadi_centers_count'),
          ashaWorkers: S(data, 'asha_workers_count'), samChildren: S(data, 'sam_children_count'),
          snpRecipients672Months: S(data, 'snp_children_6_72m'),
          anganwadiEnrolledChildren: S(data, 'anganwadi_enrolled_children'),
          urbanGovtSchools: S(data, 'govt_schools_count'), urbanPvtSchools: S(data, 'pvt_schools_count'),
          urbanTeachers: S(data, 'working_teachers'), dataAvailable: data.length > 0,
        },
        social: {
          oldAgePensioners: S(data, 'old_age_pensioners'), pwdPensioners: S(data, 'pwd_pensioners_est'),
          ujjwalaBen: S(data, 'pm_ujjwala_beneficiaries'), widowPensioners: 0, awasBen: 0,
          urbanWidow: S(data, 'widow_pensioners'), urbanAwas: S(data, 'pm_cm_awas_beneficiaries'),
        },
        economy: {
          activeShgs: S(data, 'active_shg_count'), artisans: S(data, 'local_artisans_count'),
          largeIndustrialUnits: S(data, 'large_industrial_units'),
          smallScaleIndustries: S(data, 'small_scale_industries'),
          urbanShgs: S(data, 'active_shg_count'),
          urbanIndustries: S(data, 'large_industrial_units') + S(data, 'small_scale_industries'),
          shgWomen: S(data, 'women_in_shgs'), lakhpatiDidis: 0, millionaireDidis: 0, mudraLoan: 0,
        },
        infrastructure: {
          electricityHouses: S(data, 'houses_with_electricity'), roadKm: S(data, 'road_length_km'),
          govtBanks: S(data, 'govt_banks_count'), privateBanks: S(data, 'private_banks_count'),
          publicToilets: S(data, 'public_toilets_functional'), solarHomes: S(data, 'solar_installed_houses'),
          distMainMarketKm: A(data, 'dist_main_market_km'), distBusStandKm: A(data, 'dist_bus_stand_km'),
          distRailwayStationKm: A(data, 'dist_railway_station_km'),
          streetLights: 0, postOffices: 0,
        },
        environment: {
          housesWithoutToilets: S(data, 'houses_without_toilets'),
          govtCompostPits: S(data, 'govt_compost_pits_count'),
          govtNurseries: S(data, 'govt_nurseries_count'),
          nurserySaplingsAvailable: S(data, 'nursery_plants_count'),
          forestHa: S(data, 'forest_area_hectare'),
          suryaGharHomes: S(data, 'pm_surya_ghar_solar_houses'),
          pastureHa: 0, biogasPlants: 0, wasteKgDay: 0, housesWithToilets: 0,
        },
        tourism: {
          dailyFootfall: A(data, 'avg_fair_footfall_daily'),
          avgFairFootfallDaily: A(data, 'avg_fair_footfall_daily'),
          localProductStalls: S(data, 'fair_product_stalls_count'),
          trainedGuides: S(data, 'registered_trained_guides'),
          fairEmployment: S(data, 'fair_shg_stalls_count'),
          heritageSites: 0, annualFairs: 0,
        },
        governance: { urbanPoliceKm: 0, urbanEmitraKm: 0, distPoliceKm: 0, distEmitraKm: 0, distLpgKm: 0 },
        profileText: wardProfileText,
        allProfileTexts: scope.wardName ? [] : allWardProfiles,
        aspirations: urbanAspData,
      };
    }
  }

  // STEP 3 — Gemini narrative generation
  async function generateNarrative(data: any, scope: any) {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    const d = {
      scopeType: data.scopeType || '',
      scopeLabel: data.scopeLabel || '',
      meta: {
        district: '', gpCount: 0, blockCount: 0, blocks: [],
        wardCount: 0, ulbCount: 0, ulbs: [],
        ...(data.meta || {})
      },
      population: {
        total: 0, male: 0, female: 0, children06: 0, children614: 0,
        seniors: 0, pwd: 0, totalFamilies: 0, bplFamilies: 0,
        puccaHouses: 0, kutchaHouses: 0, urbanPop: 0,
        ...(data.population || {})
      },
      water: {
        ruralFhtcAvg: 0, gpsBelow30Fhtc: 0, overheadTanks: 0,
        groundwaterDepth: 0, roFacilities: 0, urbanFhtcAvg: 0,
        ...(data.water || {})
      },
      agriculture: {
        cultivableHa: 0, irrigatedHa: 0, irrigationPct: 0,
        totalFarmers: 0, kccHolders: 0, pmKisan: 0,
        soilCards: 0, cropInsurance: 0, fpos: 0, solarPumps: 0,
        ...(data.agriculture || {})
      },
      dairy: {
        totalLivestock: 0, milchAnimals: 0, dailyMilkLpd: 0,
        annualDairyValueCr: 0, milkCenters: 0, goatFarms: 0, poultryFarms: 0,
        ...(data.dairy || {})
      },
      health: {
        allopathicCenters: 0, ayushCenters: 0, healthBeds: 0,
        healthStaff: 0, ayushmanBen: 0, tbPatients: 0,
        anemicPregnant: 0, samChildren: 0, ashaWorkers: 0,
        awcCenters: 0, urbanHealthBeds: 0, urbanAyushman: 0,
        ...(data.health || {})
      },
      education: {
        totalSchools: 0, govtSchools: 0, pvtSchools: 0,
        workingTeachers: 0, sanctionedTeachers: 0, enrolledStudents: 0,
        dropouts: 0, awcCenters: 0, ashaWorkers: 0,
        samChildren: 0, snpRecipients672Months: 0, anganwadiEnrolledChildren: 0,
        ...(data.education || {})
      },
      social: {
        oldAgePensioners: 0, widowPensioners: 0, pwdPensioners: 0,
        ujjwalaBen: 0, awasBen: 0, urbanWidow: 0, urbanAwas: 0,
        ...(data.social || {})
      },
      economy: {
        activeShgs: 0, shgWomen: 0, lakhpatiDidis: 0,
        millionaireDidis: 0, mudraLoan: 0, artisans: 0,
        urbanShgs: 0, urbanIndustries: 0,
        ...(data.economy || {})
      },
      infrastructure: {
        electricityHouses: 0, roadKm: 0, streetLights: 0,
        govtBanks: 0, postOffices: 0, publicToilets: 0, solarHomes: 0,
        ...(data.infrastructure || {})
      },
      environment: {
        forestHa: 0, pastureHa: 0, biogasPlants: 0,
        govtCompostPits: 0, pvtCompostPits: 0, suryaGharHomes: 0,
        wasteKgDay: 0, housesWithToilets: 0,
        ...(data.environment || {})
      },
      tourism: {
        heritageSites: 0, annualFairs: 0, dailyFootfall: 0,
        trainedGuides: 0, fairEmployment: 0,
        ...(data.tourism || {})
      },
      governance: {
        distPoliceKm: 0, distEmitraKm: 0, distLpgKm: 0,
        urbanPoliceKm: 0, urbanEmitraKm: 0,
        ...(data.governance || {})
      }
    };

    // ── Profile text preparation for Gemini prompt ────────────────
    // Collect raw profile texts from GPs/wards so Gemini can summarise them
    const profileTextsForPrompt: string[] = data.allProfileTexts || [];
    const MAX_PROFILES_FOR_SUMMARY = 8;
    const MAX_CHARS_PER_PROFILE = 350;
    const sampledProfiles = profileTextsForPrompt
      .slice(0, MAX_PROFILES_FOR_SUMMARY)
      .map((t: string) => t.length > MAX_CHARS_PER_PROFILE ? t.slice(0, MAX_CHARS_PER_PROFILE) + '...' : t);

    const profileSourceBlock = sampledProfiles.length > 0
      ? `\nLOCAL PROFILE EXCERPTS (from ${profileTextsForPrompt.length} GP/Ward records, showing ${sampledProfiles.length}):\n${sampledProfiles.map((t: string, i: number) => `[प्रोफाइल ${i + 1}] ${t}`).join('\n\n')}`
      : '';

    console.log('[Profile Summary] Sending', sampledProfiles.length, 'of', profileTextsForPrompt.length, 'profile excerpts to Gemini');

    const scopeName = scope.gpName || scope.wardName || scope.ulb || scope.block || scope.district || d.meta.district;
    const scopeTypeLabel = scope.type === 'urban' ? 'urban ward' : scope.gpName || scope.block ? 'rural local geography' : 'district';
    const prompt = `LANGUAGE INSTRUCTION (MOST IMPORTANT — follow strictly):

  Write this ENTIRE report in PROPER HINDI (Devanagari script). NOT Hinglish. NOT English sentences.

  Rules:
  - ALL narrative text must be in proper Hindi sentences using Devanagari script
  - Technical scheme names stay as-is in English within Hindi sentences: JJM, PMKSY, NHM, POSHAN, SRLM, KCC etc.
  - Numbers always in English digits (1234, not १२३४)
  - Example of CORRECT Hindi: "अजमेर जिले में सिंचाई दर 41.5% है, जो राज्य औसत से काफी बेहतर है। KCC की पहुँच अभी 38% पर है, इसमें सुधार की आवश्यकता है। PMKSY योजना के माध्यम से 2 वर्षों में सिंचाई कवरेज 60% तक बढ़ाना संभव है।"
  - Example of WRONG: "Ajmer mein irrigation 41.5% hai" (this is Hinglish — NOT acceptable)
  - Important figures and numbers should be highlighted with <b> tags
  - Keep sentences clear and formal — suitable for Collector, BDO, and senior officers
  - executiveSummary: proper Hindi
  - findings[].finding: proper Hindi | findings[].currentPosition: numbers/metrics ok in English
  - findings[].opportunity: proper Hindi
  - ALL sectorNarratives: proper Hindi
  - priorityActions[].description: proper Hindi
  - closingQuote: proper Hindi — inspiring and grounded

  You are Manthaan AI, planning intelligence engine for Viksit Rajasthan @ 2047 by Aasvaa Innovation Labs.

Generate a ${scopeTypeLabel} planning intelligence brief for ${scopeName}, within ${d.meta.district} district, using ONLY the numbers below. Do not invent figures. Do not include Vision 2047 targets or aspiration data — this is a baseline-only report.

DISTRICT PROFILE:
GPs: ${d.meta.gpCount || 0} | Blocks: ${d.meta.blockCount || 0} (${(d.meta.blocks || []).slice(0, 5).join(', ')}${(d.meta.blocks || []).length > 5 ? '...' : ''})
Urban Wards: ${d.meta.wardCount || 0} | ULBs: ${d.meta.ulbCount || 0} (${(d.meta.ulbs || []).slice(0, 4).join(', ')}${(d.meta.ulbs || []).length > 4 ? '...' : ''})
${profileSourceBlock}

POPULATION:
Rural: ${d.population.total.toLocaleString()} | Urban: ${d.population.urbanPop.toLocaleString()} | Total: ${(d.population.total + d.population.urbanPop).toLocaleString()}
Male: ${d.population.male.toLocaleString()} | Female: ${d.population.female.toLocaleString()}
Children 0-6: ${d.population.children06.toLocaleString()} | 6-14: ${d.population.children614.toLocaleString()}
Senior citizens: ${d.population.seniors.toLocaleString()} | PwD: ${d.population.pwd.toLocaleString()}
Total families: ${d.population.totalFamilies.toLocaleString()} | BPL: ${d.population.bplFamilies.toLocaleString()}
Pucca houses: ${d.population.puccaHouses.toLocaleString()} | Kutcha: ${d.population.kutchaHouses.toLocaleString()}

WATER & SANITATION:
Rural FHTC avg: ${d.water.ruralFhtcAvg}% | Urban FHTC avg: ${d.water.urbanFhtcAvg}%
GPs below 30% FHTC: ${d.water.gpsBelow30Fhtc} | Overhead tanks: ${d.water.overheadTanks}
Avg groundwater depth: ${d.water.groundwaterDepth}m | RO facilities: ${d.water.roFacilities}

AGRICULTURE:
Cultivable land: ${d.agriculture.cultivableHa.toLocaleString()} ha | Irrigated: ${d.agriculture.irrigatedHa.toLocaleString()} ha (${d.agriculture.irrigationPct}%)
Total farmers: ${d.agriculture.totalFarmers.toLocaleString()} | KCC holders: ${d.agriculture.kccHolders.toLocaleString()} (${d.agriculture.totalFarmers > 0 ? ((d.agriculture.kccHolders / d.agriculture.totalFarmers) * 100).toFixed(1) : 0}%)
PM-Kisan: ${d.agriculture.pmKisan.toLocaleString()} | Soil health cards: ${d.agriculture.soilCards.toLocaleString()}
Crop insurance: ${d.agriculture.cropInsurance.toLocaleString()} | FPOs: ${d.agriculture.fpos} | Solar pumps: ${d.agriculture.solarPumps}

DAIRY & LIVESTOCK:
Total livestock: ${d.dairy.totalLivestock.toLocaleString()} | Milch animals: ${d.dairy.milchAnimals.toLocaleString()}
Daily milk production: ${d.dairy.dailyMilkLpd.toLocaleString()} LPD | Est. annual dairy value: Rs ${d.dairy.annualDairyValueCr} Cr
Milk collection centers: ${d.dairy.milkCenters} | Goat farms: ${d.dairy.goatFarms} | Poultry farms: ${d.dairy.poultryFarms}

HEALTH:
Allopathic centers (rural): ${d.health.allopathicCenters} | AYUSH: ${d.health.ayushCenters}
Health beds (rural): ${d.health.healthBeds} | Urban beds: ${d.health.urbanHealthBeds}
Health staff: ${d.health.healthStaff} | Avg daily patients: ${d.health.healthStaff}
Ayushman beneficiaries (rural): ${d.health.ayushmanBen.toLocaleString()} | Urban: ${d.health.urbanAyushman.toLocaleString()}
TB patients: ${d.health.tbPatients} | Anemic pregnant women: ${d.health.anemicPregnant}
AWC centers: ${d.health.awcCenters} | ASHA workers: ${d.health.ashaWorkers} | SAM children: ${d.health.samChildren.toLocaleString()}

EDUCATION: [नोट: विद्यालय नामांकन और शिक्षक डेटा अभी CDO आधारभूत डेटाबेस में लोड नहीं किया गया है। AWC कवरेज: ${d.health.awcCenters} केंद्र जो ${d.health.samChildren.toLocaleString()} SAM बच्चों की सेवा कर रहे हैं।]

SOCIAL WELFARE:
Old age pensioners: ${d.social.oldAgePensioners.toLocaleString()} | Widow pensioners (rural): ${d.social.widowPensioners.toLocaleString()} | Urban: ${d.social.urbanWidow.toLocaleString()}
PwD pensioners: ${d.social.pwdPensioners.toLocaleString()} | PM Ujjwala: ${d.social.ujjwalaBen.toLocaleString()}
PM/CM Awas (rural): ${d.social.awasBen.toLocaleString()} | Urban: ${d.social.urbanAwas.toLocaleString()}

ECONOMY & SHGs:
Active SHGs: ${d.economy.activeShgs.toLocaleString()} | Women in SHGs: ${d.economy.shgWomen.toLocaleString()}
Lakhpati Didis: ${d.economy.lakhpatiDidis.toLocaleString()} | Millionaire Didis: ${d.economy.millionaireDidis.toLocaleString()}
Mudra loan beneficiaries: ${d.economy.mudraLoan.toLocaleString()} | Local artisans: ${d.economy.artisans.toLocaleString()}
Urban SHGs: ${d.economy.urbanShgs.toLocaleString()} | Urban industries: ${d.economy.urbanIndustries.toLocaleString()}

INFRASTRUCTURE:
Houses with electricity: ${d.infrastructure.electricityHouses.toLocaleString()} | Road length: ${d.infrastructure.roadKm.toLocaleString()} km
Street lights: ${d.infrastructure.streetLights.toLocaleString()} | Govt banks: ${d.infrastructure.govtBanks}
Post offices: ${d.infrastructure.postOffices} | Public toilets: ${d.infrastructure.publicToilets}
Solar homes: ${d.infrastructure.solarHomes.toLocaleString()}

ENVIRONMENT:
Forest area: ${d.environment.forestHa.toLocaleString()} ha | Pasture land: ${d.environment.pastureHa.toLocaleString()} ha
Biogas plants: ${d.environment.biogasPlants} | PM Surya Ghar homes: ${d.environment.suryaGharHomes.toLocaleString()}
Houses with toilets: ${d.environment.housesWithToilets.toLocaleString()} | Daily waste: ${d.environment.wasteKgDay.toLocaleString()} kg/day

TOURISM:
Heritage/cultural sites: ${d.tourism.heritageSites} | Annual fairs: ${d.tourism.annualFairs}
Avg daily cultural footfall: ${d.tourism.dailyFootfall.toLocaleString()} | Trained guides: ${d.tourism.trainedGuides}
Fair-related employment: ${d.tourism.fairEmployment.toLocaleString()}

Generate ONLY valid JSON, no markdown, no preamble, no trailing commas:
{
  "executiveSummary": "3-4 sentences on district's development position, key strengths, and biggest gaps based strictly on numbers above",
  "profileSummary": "${sampledProfiles.length > 0 
    ? 'Synthesize the LOCAL PROFILE EXCERPTS above into ONE cohesive Hindi paragraph (proper Devanagari, formal tone, 3-4 sentences, roughly 400-550 characters) describing the area\'s general geography, history, economy, and notable features. Write a flowing narrative summary — do NOT just list or concatenate the excerpts. Numbers in English digits, scheme names in English.' 
    : 'Leave this as an empty string "" since no GP/ward profile excerpts were provided for this scope.'}",
  "findings": [
    { "number": "01", "finding": "one sentence finding grounded in specific data", "currentPosition": "exact metric with number", "opportunity": "specific actionable opportunity citing a real scheme" },
    { "number": "02", "finding": "...", "currentPosition": "...", "opportunity": "..." },
    { "number": "03", "finding": "...", "currentPosition": "...", "opportunity": "..." },
    { "number": "04", "finding": "...", "currentPosition": "...", "opportunity": "..." },
    { "number": "05", "finding": "...", "currentPosition": "...", "opportunity": "..." }
  ],
  "sectorNarratives": {
    "water": "50-60 word narrative with specific numbers and one JJM/AMRUT scheme recommendation",
    "agriculture": "50-60 word narrative with irrigation%, KCC gap, PM-Kisan gap and PMKSY/KCC recommendation",
    "dairy": "50-60 word narrative with LPD, milch animals, dairy value and RCDF/SARAS recommendation",
    "health": "50-60 word narrative with centers, beds, SAM children, Ayushman and NHM recommendation",
    "education": "Note: School enrollment and teacher data not yet loaded in the CDO baseline database. AWC coverage: ${d.health.awcCenters} centers serving ${d.health.samChildren.toLocaleString()} SAM children across ${d.meta.gpCount} GPs.",
    "socialWelfare": "50-60 word narrative with pension counts, Ujjwala, Awas and scheme convergence recommendation",
    "economy": "50-60 word narrative with SHG count, Lakhpati Didi, Mudra and SRLM/NRLM recommendation",
    "infrastructure": "50-60 word narrative with electricity, roads, solar and 15th FC/PMGSY recommendation",
    "environment": "50-60 word narrative with forest, biogas, solar homes and PM Surya Ghar/SBM recommendation",
    "tourism": "50-60 word narrative with heritage sites, fair footfall, guides and Swadesh Darshan 2.0 recommendation",
    "governance": "50-60 word narrative on e-Mitra access, police proximity, LPG coverage and last-mile governance recommendation"
  },
  "priorityActions": [
    { "number": "01", "cost": "Zero Cost", "timeline": "30 days", "title": "action title", "description": "2-3 sentences with specific numbers from data above", "scheme": "scheme / department name" },
    { "number": "02", "cost": "...", "timeline": "...", "title": "...", "description": "...", "scheme": "..." },
    { "number": "03", "cost": "...", "timeline": "...", "title": "...", "description": "...", "scheme": "..." },
    { "number": "04", "cost": "...", "timeline": "...", "title": "...", "description": "...", "scheme": "..." }
  ],
  "closingQuote": "one powerful, district-specific planning insight sentence"
}`;

    if (!apiKey) {
      throw new Error('Manthaan AI कॉन्फ़िगरेशन अपूर्ण है। कृपया RITI तकनीकी दल से संपर्क करें।');
    }

    // Try multiple models to handle quota/demand issues
    const models = [
      'gemini-3.1-flash-lite',
      'gemini-3.1-flash',
      'gemini-2.5-flash',
      'gemini-2.0-flash', // Fallback for stability
      'gemini-1.5-flash'  // Emergency fallback
    ];
    let lastError: any = null;

    for (const model of models) {
      // Retry up to 2 times for 503/429 errors
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          console.log(`[Manthaan AI] Generating report... (attempt ${attempt + 1})`);
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.3, maxOutputTokens: 2000 }
              })
            }
          );

          const result = await response.json();

          // Handle High Demand or Rate Limits with a retry
          if (response.status === 503 || response.status === 429) {
            console.warn(`[Manthaan AI] Busy, retrying...`);
            await new Promise(r => setTimeout(r, 2000));
            continue;
          }

          if (!result.candidates || result.candidates.length === 0) {
            console.warn(`[Manthaan AI] Response error`);
            lastError = result.error?.message || 'No response';
            break; // Try next model in the list
          }

          const text = result.candidates[0].content.parts[0].text;
          const clean = text.replace(/```json|```/g, '').trim();
          const parsed = JSON.parse(clean);
          return parsed;
        } catch (err: any) {
          console.warn(`[Manthaan AI] Connection error`);
          lastError = err.message;
          break; // Try next model
        }
      }
    }

    throw new Error(`Manthaan AI अभी उपलब्ध नहीं है। कृपया कुछ समय बाद पुनः प्रयास करें।`);
  }

  function buildAlwarPdfReportHtml(scope: any, data: any, narrative: any) {
    console.log('✅ Alwar PDF redesign v3 active', scope);

    const d = data;
    const siteOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    const logoUrl = `${siteOrigin}/images/logo.png`;
    const profileText: string = String(d.profileText || narrative?.profileSummary || '');
    const n = narrative || {};
    const scopeType = d.scopeType || scope.type;
    const isRural = scopeType === 'rural';
    const isUrban = scopeType === 'urban';
    const isDistrict = scopeType === 'district';
    // Enforce strict scope isolation: rural reports never show urban units and vice versa.
    const showRuralProfile = isRural || isDistrict || (!isUrban && !isRural && Number(d.meta?.gpCount || 0) > 0);
    const showUrbanProfile = isUrban || isDistrict || (!isUrban && !isRural && Number(d.meta?.wardCount || 0) > 0);
    const district = d.meta?.district || scope.district || 'District';
    const selectedScopeName = scope.gpName || scope.wardName || scope.block || scope.ulb || district;
    const selectedScopeType = scope.gpName
      ? 'Gram Panchayat'
      : scope.wardName
        ? 'Urban Ward'
        : scope.block
          ? 'Block'
          : scope.ulb
            ? 'ULB'
            : 'District';
    const selectedScopePath = scope.gpName
      ? `${scope.gpName}${scope.block ? ` · ${scope.block}` : ''} · ${district}`
      : scope.wardName
        ? `${scope.wardName}${scope.ulb ? ` · ${scope.ulb}` : ''} · ${district}`
        : scope.block
          ? `${scope.block} · ${district}`
          : scope.ulb
            ? `${scope.ulb} · ${district}`
            : district;
    const districtCode = (district || 'DIST')
      .replace(/[^A-Za-z0-9]/g, '')
      .slice(0, 4)
      .toUpperCase() || 'DIST';
    const reportDate = new Date();
    const reportMonth = reportDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const reportDateLabel = reportDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const scopeLabel = scope.gpName || scope.wardName || scope.ulb || scope.block || district;
    const totalPopulation = Number(d.population?.total || 0) + Number(d.population?.urbanPop || 0);
    const totalPopulationLakh = (totalPopulation / 100000).toFixed(2);
    const ruralFamilies = Number(d.population?.totalFamilies || 0);
    const totalFarmers = Number(d.agriculture?.totalFarmers || 0);
    const totalSchools = Number(d.education?.totalSchools || 0);
    const anganwadiCenters = Number(d.education?.awcCenters || d.health?.awcCenters || 0);
    const healthCenters = Number(d.health?.allopathicCenters || 0) + Number(d.health?.ayushCenters || 0) + Number(d.health?.privateHealthCenters || d.health?.pvtHealthCenters || 0);
    const activeShgs = Number(d.economy?.activeShgs || d.economy?.urbanShgs || 0);
    const totalLivestock = Number(d.dairy?.totalLivestock || 0);
    const dailyMilkLpd = Number(d.dairy?.dailyMilkLpd || 0);
    const kccHolders = Number(d.agriculture?.kccHolders || 0);
    const pmKisan = Number(d.agriculture?.pmKisan || 0);
    const ujjwala = Number(d.social?.ujjwalaBen || 0);
    const awas = Number(d.social?.awasBen || d.social?.urbanAwas || 0);
    const totalHouses = Number(d.population?.puccaHouses || 0) + Number(d.population?.kutchaHouses || 0);
    const puccaPct = totalHouses > 0 ? ((Number(d.population?.puccaHouses || 0) / totalHouses) * 100).toFixed(1) : '—';
    const avgWardPopulation = d.meta?.wardCount ? Math.round(Number(d.population?.urbanPop || 0) / Number(d.meta.wardCount)) : 0;
    const avgGpArea = d.meta?.gpCount && Number(d.population?.totalAreaHectare || 0) > 0
      ? Math.round(Number(d.population.totalAreaHectare) / Number(d.meta.gpCount))
      : null;
    const largestUlb = d.meta?.ulbs?.[0] || scope.ulb || '—';
    const heritageUlbs = d.meta?.ulbs?.slice(0, 3).join(' · ') || '—';
    const districtNameHindi = selectedScopeName;

    const escapeHtml = (value: any) => String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    const fmt = (value: any) => {
      if (value === null || value === undefined || value === '') return '—';
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric.toLocaleString('en-IN') : escapeHtml(value);
    };

    const fmtPct = (value: any, digits = 1) => {
      if (value === null || value === undefined || value === '') return '—';
      const numeric = Number(value);
      return Number.isFinite(numeric) ? `${numeric.toFixed(digits)}%` : escapeHtml(value);
    };

    const fmtLakh = (value: any, forceL = false) => {
      if (value === null || value === undefined || value === '') return '—';
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) return escapeHtml(value);
      if (numeric >= 100000 || forceL) {
        return `${(numeric / 100000).toFixed(2)} L`;
      }
      return numeric.toLocaleString('en-IN');
    };

    const fmtKm = (value: any, digits = 1) => {
      if (value === null || value === undefined || value === '') return '—';
      const numeric = Number(value);
      return Number.isFinite(numeric) ? `${numeric.toFixed(digits)} km` : escapeHtml(value);
    };

    const pageHeader = (pageNo: string, title: string, subtitle: string, rightText: string) => `
      <div class="page-header">
        <div class="page-header-left">
          <img src="${logoUrl}" alt="Govt of Rajasthan" style="height:32px; width:auto; object-fit:contain;" onerror="this.style.display='none'" />
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-weight:800; color:#1a2744; font-size:11px;">Govt. of Rajasthan</span>
            <span style="color:#94a3b8;">·</span>
            <span style="color:#94a3b8; font-weight:500;">${escapeHtml(title)}</span>
          </div>
        </div>
        <div class="page-header-right">${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })} | PAGE ${pageNo}</div>
      </div>
    `;

    const scopeLevel = (scope.gpName || scope.gpNameEn) ? 'gp'
      : scope.wardName ? 'ward'
        : scope.block ? 'block'
          : scope.ulb ? 'ulb'
            : (scope.type === 'district' || scopeType === 'district') ? 'district'
              : 'district';

    const demographicSubtitleEn = scopeLevel === 'gp'
      ? 'Gram Panchayat Profile, Settlement & Demography'
      : scopeLevel === 'ward'
        ? 'Ward Profile, Settlement & Demography'
        : scopeLevel === 'block'
          ? 'Block Profile, Settlement & Demography'
          : scopeLevel === 'ulb'
            ? 'ULB Profile, Settlement & Demography'
            : 'District Profile, Settlement & Demography';

    const coverMainName = (scope.gpName || scope.gpNameEn) || scope.wardName || scope.block || scope.ulb || district;

    const coverTypeLabel = {
      gp: 'ग्राम पंचायत',
      ward: 'शहरी वार्ड',
      block: 'खंड',
      ulb: 'नगर निकाय',
      district: 'जिला',
    }[scopeLevel];

    const coverParentLine = scope.gpName
      ? `${scope.block ? `${scope.block} खंड · ` : ''}${district} जिला`
      : scope.wardName
        ? `${scope.ulb ? `${scope.ulb} · ` : ''}${district} जिला`
        : scope.block
          ? `${district} जिला`
          : scope.ulb
            ? `${district} जिला`
            : 'राजस्थान';

    const kpiPill = (label: string, value: any, subLabel: string = '') => `
      <div class="kpi-pill">
        <div class="kpi-pill-label">${escapeHtml(label)}</div>
        <div class="kpi-pill-value">${escapeHtml(value)}</div>
        ${subLabel ? `<div class="kpi-pill-sub">${escapeHtml(subLabel)}</div>` : ''}
      </div>
    `;

    const statCard = (title: string, value: any, border: string, note: string = '') => `
      <div class="stat-card" style="border-left-color:${border};">
        <div class="stat-card-title">${escapeHtml(title)}</div>
        <div class="stat-card-value">${escapeHtml(value)}</div>
        ${note ? `<div class="stat-card-note">${escapeHtml(note)}</div>` : ''}
      </div>
    `;

    const infoRow = (label: string, value: any) => `
      <div class="info-row"><span>${escapeHtml(label)}</span><span>${escapeHtml(value)}</span></div>
    `;

    const shortenMetricValue = (value: any): string => {
      const str = String(value ?? '');
      if (str === '—') return str;

      if (str.endsWith(' km')) {
        const num = parseFloat(str);
        if (!isNaN(num)) {
          if (num >= 100000) return `${(num / 100000).toFixed(1)} L km`;
          if (num >= 1000) return `${(num / 1000).toFixed(1)}K km`;
          return str;
        }
      }

      if (str.endsWith(' L')) return str;

      const stripped = str.replace(/,/g, '');
      const num = parseFloat(stripped);
      if (!isNaN(num) && isFinite(num)) {
        if (num >= 10000000) return `${(num / 10000000).toFixed(1)} Cr`;
        if (num >= 100000) return `${(num / 100000).toFixed(2)} L`;
        if (num >= 10000) return `${(num / 1000).toFixed(1)}K`;
        return str;
      }

      if (str.endsWith('%')) return str;

      return str;
    };

    const metricCard = (value: any, label: string, subLabel: string = '') => `
      <div class="metric-card">
        <div class="metric-value">${escapeHtml(shortenMetricValue(value))}</div>
        <div class="metric-label">${escapeHtml(label)}</div>
        ${subLabel ? `<div class="metric-sub">${escapeHtml(subLabel)}</div>` : ''}
      </div>
    `;

    const schemePills = (schemes: string[]) => schemes.map((scheme) => `<span class="scheme-tag">${escapeHtml(scheme)}</span>`).join('');

    const aspirationRow = (row: {
      title: string;
      subtitle: string;
      priority: 'P-1' | 'P-2';
      gp: string;
      qty2030: string;
      qty2035: string;
      qty2047: string;
      context: string;
      schemes: string[];
    }) => `
      <tr>
        <td>
          <div style="font-weight:700; color:#1a1a2e;">${escapeHtml(row.title)}</div>
          <div style="font-size:10px; color:#64748b; margin-top:2px; font-family:sans-serif;">${escapeHtml(row.subtitle)}</div>
        </td>
        <td style="text-align:center;"><span class="priority-badge ${row.priority === 'P-1' ? 'p1' : 'p2'}">${row.priority}</span></td>
        <td style="text-align:center; font-family:sans-serif; font-weight:700;">${escapeHtml(row.gp)}</td>
        <td>${escapeHtml(row.qty2030)}</td>
        <td>${escapeHtml(row.qty2035)}</td>
        <td>${escapeHtml(row.qty2047)}</td>
        <td>
          <div style="color:#1a1a2e; font-size:11px; line-height:1.5; font-family:'Noto Sans Devanagari',sans-serif;">${escapeHtml(row.context)}</div>
          <div style="margin-top:4px;">${schemePills(row.schemes)}</div>
        </td>
      </tr>
    `;

    const pageShell = (inner: string, extraClass = '') => `<section class="report-page ${extraClass}">${inner}</section>`;

    const scopeMasterLabel = {
      gp:       `ग्राम पंचायत मास्टर प्लान`,
      ward:     `वार्ड मास्टर प्लान`,
      block:    `समेकित खंड रिपोर्ट`,
      ulb:      `समेकित नगर निकाय रिपोर्ट`,
      district: `समेकित जिला रिपोर्ट`,
    }[scopeLevel] || 'समेकित रिपोर्ट';

    const coverPage = pageShell(`
      ${pageHeader('01 / 07', 'आवरण एवं परिचय', 'Cover · Introduction', 'PAGE 01 / 07 · आवरण एवं परिचय')}
      <div class="cover-kicker">${escapeHtml(scopeMasterLabel)}</div>
      <h1 class="cover-district">${escapeHtml(coverMainName)}<span>${escapeHtml(coverTypeLabel)}</span></h1>
      <div class="cover-subtitle">${escapeHtml(coverParentLine)} · Rajasthan</div>
      <div class="pill-row">
        ${kpiPill('नागरिक', `${fmtLakh(totalPopulation)}`,
          scopeLevel === 'gp'
            ? `${scope.block ? scope.block + ' खंड' : district}`
            : scopeLevel === 'ward'
              ? `${scope.ulb ? scope.ulb : district}`
              : (isRural || isDistrict)
                ? `${fmt(d.meta?.gpCount || 0)} ग्राम पंचायतें`
                : `${fmt(d.meta?.wardCount || 0)} वार्ड`
        )}
        ${scopeLevel === 'district'
  ? (isUrban
    ? kpiPill('वार्ड · नगर निकाय', `${fmt(d.meta?.wardCount || 0)} · ${fmt(d.meta?.ulbCount || 0)}`, 'शहरी प्रशासनिक ढांचा')
    : kpiPill('ग्राम पंचायतें · Blocks', `${fmt(d.meta?.gpCount || 0)} · ${fmt(d.meta?.blockCount || 0)}`, 'ग्रामीण प्रशासनिक ढांचा'))
  : scopeLevel === 'block'
    ? kpiPill('ग्राम पंचायतें', `${fmt(d.meta?.gpCount || 0)} ग्राम पंचायतें`, 'चयनित खंड कवरेज')
    : scopeLevel === 'gp'
      ? kpiPill('BPL परिवार', fmt(d.population?.bplFamilies || 0), `कुल ${fmt(d.population?.totalFamilies || 0)} परिवारों में`)
      : scopeLevel === 'ward'
        ? kpiPill('नगर निकाय', fmt(d.meta?.ulbCount || 0), `${scope.ulb || '—'} में`)
        : scopeLevel === 'ulb'
          ? kpiPill('नगर निकाय', fmt(d.meta?.ulbCount || 0), `${fmt(d.meta?.wardCount || 0)} वार्ड सहित`)
          : kpiPill('नगर निकाय', `${fmt(d.meta?.wardCount || 0)} वार्ड`, 'शहरी प्रशासनिक कवरेज')
}
        ${kpiPill('क्षेत्रीय स्थिति', isDistrict ? `ग्रामीण · शहरी · समेकित` : isRural ? `कृषि · डेयरी · ग्राम शासन` : `शहरी सेवा · उद्योग · अवसंरचना`, isDistrict ? 'जिला स्तरीय समेकित' : isRural ? 'ग्रामीण केंद्रित' : 'शहरी केंद्रित')}
        ${scopeLevel === 'gp'
  ? kpiPill('BPL अनुपात', `${d.population?.totalFamilies > 0 ? ((Number(d.population?.bplFamilies || 0) / Number(d.population?.totalFamilies)) * 100).toFixed(1) : '—'}%`, 'BPL परिवार प्रतिशत')
  : scopeLevel === 'ward'
    ? kpiPill('पक्के आवास', fmt(d.population?.puccaHouses || 0), 'शहरी आवास स्थिति')
    : scopeLevel === 'block'
      ? kpiPill('सिंचाई दर', fmtPct(d.agriculture?.irrigationPct), `${fmtLakh(d.agriculture?.totalFarmers || 0)} किसान`)
      : scopeLevel === 'ulb'
        ? kpiPill('शहरी वार्ड', fmt(d.meta?.wardCount || 0), `${scope.ulb || district} में`)
        : isDistrict
          ? kpiPill('FHTC · ग्रामीण / शहरी', `${fmtPct(d.water?.ruralFhtcAvg)} / ${fmtPct(d.water?.urbanFhtcAvg)}`, 'जल आपूर्ति · दोनों क्षेत्र')
          : kpiPill('FHTC कवरेज', fmtPct(d.water?.urbanFhtcAvg), 'जल आपूर्ति स्थिति')
}
      </div>

      <div class="featured-box">
        <div class="featured-title">${(scopeLevel === 'gp' || scopeLevel === 'ward') ? 'मास्टर प्लान · एक नज़र में · THE PLANNING PROGRAMME AT A GLANCE' : 'समेकित जिला रिपोर्ट · आधारभूत डेटा सारांश · DISTRICT BASELINE SUMMARY AT A GLANCE'}</div>
        <div class="featured-body">
    ${profileText
      ? `<div style="font-size:12px; color:#e2e8f0; line-height:1.75; font-family:'Noto Sans Devanagari',sans-serif; white-space:pre-wrap; word-break:break-word; overflow-wrap:break-word;">${escapeHtml(profileText)}</div>`
      : ((isRural || isDistrict) ? `
    <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
      <div>
        <div style="font-size:10px; color:#94a3b8; text-transform:uppercase; letter-spacing:0.08em; font-weight:700; margin-bottom:6px;">जनसंख्या एवं परिवार</div>
        <div style="font-size:12px; color:#e2e8f0; line-height:2; font-family:'Noto Sans Devanagari',sans-serif;">
          <div>कुल जनसंख्या: <b>${fmtLakh(d.population?.total || 0)}</b></div>
          <div>कुल परिवार: <b>${fmt(d.population?.totalFamilies || 0)}</b></div>
          <div>BPL परिवार: <b>${fmt(d.population?.bplFamilies || 0)}</b></div>
          <div>पक्के आवास: <b>${fmtPct(ruralFamilies > 0 ? ((Number(d.population?.puccaHouses || 0) / ruralFamilies) * 100).toFixed(1) : '—')}</b></div>
          <div>PwD (Specially Abled) जनसंख्या: <b>${fmt(d.population?.pwd || 0)}</b></div>
        </div>
      </div>
      <div>
        <div style="font-size:10px; color:#94a3b8; text-transform:uppercase; letter-spacing:0.08em; font-weight:700; margin-bottom:6px;">कृषि एवं जल</div>
        <div style="font-size:12px; color:#e2e8f0; line-height:2; font-family:'Noto Sans Devanagari',sans-serif;">
          <div>कुल किसान: <b>${fmtLakh(d.agriculture?.totalFarmers || 0)}</b></div>
          <div>सिंचाई दर: <b>${fmtPct(d.agriculture?.irrigationPct || 0)}</b></div>
          <div>KCC धारक: <b>${fmtLakh(d.agriculture?.kccHolders || 0)}</b></div>
          <div>FHTC कवरेज: <b>${fmtPct(d.water?.ruralFhtcAvg || 0)}</b></div>
          <div>भूजल गहराई: <b>${fmtKm(d.water?.groundwaterDepth || 0)}</b></div>
        </div>
      </div>
      <div>
        <div style="font-size:10px; color:#94a3b8; text-transform:uppercase; letter-spacing:0.08em; font-weight:700; margin-bottom:6px;">स्वास्थ्य एवं अवसंरचना</div>
        <div style="font-size:12px; color:#e2e8f0; line-height:2; font-family:'Noto Sans Devanagari',sans-serif;">
          <div>AWC केंद्र: <b>${fmt(d.health?.awcCenters || 0)}</b></div>
          <div>ASHA कार्यकर्ता: <b>${fmt(d.health?.ashaWorkers || 0)}</b></div>
          <div>स्वास्थ्य केंद्र: <b>${fmt((Number(d.health?.allopathicCenters || 0) + Number(d.health?.ayushCenters || 0)))}</b></div>
          <div>विद्युतीकृत परिवार: <b>${fmt(d.infrastructure?.electricityHouses || 0)}</b></div>
          <div>सड़क नेटवर्क: <b>${fmtKm(d.infrastructure?.roadKm || 0)}</b></div>
        </div>
      </div>
    </div>
    ` : `
    <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
      <div>
        <div style="font-size:10px; color:#94a3b8; text-transform:uppercase; letter-spacing:0.08em; font-weight:700; margin-bottom:6px;">जनसंख्या एवं आवास</div>
        <div style="font-size:12px; color:#e2e8f0; line-height:2; font-family:'Noto Sans Devanagari',sans-serif;">
          <div>शहरी जनसंख्या: <b>${fmtLakh(d.population?.urbanPop || 0)}</b></div>
          <div>पक्के आवास: <b>${fmt(d.population?.puccaHouses || 0)}</b></div>
          <div>कच्चे आवास: <b>${fmt(d.population?.kutchaHouses || 0)}</b></div>
          <div>PwD (Specially Abled) जनसंख्या: <b>${fmt(d.population?.pwd || 0)}</b></div>
          <div>वरिष्ठ नागरिक: <b>${fmt(d.population?.seniors || 0)}</b></div>
        </div>
      </div>
      <div>
        <div style="font-size:10px; color:#94a3b8; text-transform:uppercase; letter-spacing:0.08em; font-weight:700; margin-bottom:6px;">जल एवं अवसंरचना</div>
        <div style="font-size:12px; color:#e2e8f0; line-height:2; font-family:'Noto Sans Devanagari',sans-serif;">
          <div>FHTC कवरेज: <b>${fmtPct(d.water?.urbanFhtcAvg || 0)}</b></div>
          <div>Overhead Tanks: <b>${fmt(d.water?.overheadTanks || 0)}</b></div>
          <div>भूजल गहराई: <b>${fmtKm(d.water?.groundwaterDepth || 0)}</b></div>
          <div>विद्युत कनेक्शन: <b>${fmt(d.infrastructure?.electricityHouses || 0)}</b></div>
          <div>सड़क नेटवर्क: <b>${fmtKm(d.infrastructure?.roadKm || 0)}</b></div>
        </div>
      </div>
      <div>
        <div style="font-size:10px; color:#94a3b8; text-transform:uppercase; letter-spacing:0.08em; font-weight:700; margin-bottom:6px;">स्वास्थ्य एवं अर्थव्यवस्था</div>
        <div style="font-size:12px; color:#e2e8f0; line-height:2; font-family:'Noto Sans Devanagari',sans-serif;">
          <div>स्वास्थ्य केंद्र: <b>${fmt((Number(d.health?.allopathicCenters || 0) + Number(d.health?.ayushCenters || 0) + Number(d.health?.privateHealthCenters || 0)))}</b></div>
          <div>AWC केंद्र: <b>${fmt(d.health?.awcCenters || 0)}</b></div>
          <div>Ayushman लाभार्थी: <b>${fmtLakh(d.health?.urbanAyushman || d.health?.ayushmanBen || 0)}</b></div>
          <div>सक्रिय SHG: <b>${fmt(d.economy?.activeShgs || 0)}</b></div>
          <div>औद्योगिक इकाइयां: <b>${fmt((Number(d.economy?.largeIndustrialUnits || 0) + Number(d.economy?.smallScaleIndustries || 0)))}</b></div>
        </div>
      </div>
    </div>
    `)}
  </div>
        <div class="featured-caption"></div>
      </div>

      <div class="cover-grid">
              ${isRural ? `
                ${statCard('रणनीतिक स्थिति', `${fmtPct(d.water?.ruralFhtcAvg)}`, '#1e3a5f', scopeLevel === 'gp' ? `Rural FHTC · ग्राम पंचायत स्तर पर नल कनेक्शन` : `Rural FHTC · ${fmt(d.water?.gpsBelow30Fhtc || 0)} GPs below 30%`)}
                ${statCard('कृषि स्थिति', `${fmtPct(d.agriculture?.irrigationPct)}`, '#16a34a', `${fmtLakh(d.agriculture?.totalFarmers || 0)} farmers · ${fmtLakh(d.agriculture?.kccHolders || 0)} KCC`)}
                ${statCard('पशुधन एवं डेयरी', `${fmtLakh(totalLivestock)}`, '#e85d04', `${fmt(d.dairy?.milkCenters || 0)} milk collection centres · ${fmtLakh(dailyMilkLpd, true)} LPD`)}
                ${scopeLevel === 'gp'
                  ? statCard('सामाजिक सुरक्षा', `${fmt(Number(d.social?.oldAgePensioners || 0) + Number(d.social?.widowPensioners || 0))}`, '#1a2744', `वृद्धा + विधवा पेंशन`)
                  : statCard('ग्राम पंचायतें', fmt(d.meta?.gpCount || 0), '#1a2744', 'Selected rural units')
                }
              ` : isDistrict ? `
                ${statCard('ग्रामीण FHTC', `${fmtPct(d.water?.ruralFhtcAvg)}`, '#1e3a5f', `${fmt(d.water?.gpsBelow30Fhtc || 0)} GPs below 30% · ${fmt(d.meta?.gpCount || 0)} ग्राम पंचायतें`)}
                ${statCard('कृषि एवं पशुपालन', `${fmtPct(d.agriculture?.irrigationPct)}`, '#16a34a', `${fmtLakh(d.agriculture?.totalFarmers || 0)} किसान · ${fmtLakh(d.dairy?.totalLivestock || 0)} पशुधन`)}
                ${statCard('स्वास्थ्य एवं शिक्षा', `${fmt(Number(d.health?.allopathicCenters || 0) + Number(d.health?.ayushCenters || 0))}`, '#e85d04', `${fmt(d.health?.awcCenters || 0)} AWC · ${fmt(d.health?.samChildren || 0)} SAM बच्चे`)}
                ${statCard('शहरी FHTC · नगर निकाय', `${fmtPct(d.water?.urbanFhtcAvg)} · ${fmt(d.meta?.ulbCount || 0)}`, '#1a2744', `${fmt(d.meta?.wardCount || 0)} वार्ड · ${fmtLakh(d.population?.urbanPop || 0)} शहरी जनसंख्या`)}
              ` : `
                ${statCard('जल आपूर्ति स्थिति', `${fmtPct(d.water?.urbanFhtcAvg)}`, '#1e3a5f', `Groundwater: ${fmtKm(d.water?.groundwaterDepth || 0, 1)} depth · ${fmt(d.water?.overheadTanks || 0)} overhead tanks`)}
                ${statCard('स्वास्थ्य सेवाएं', `${fmt(Number(d.health?.allopathicCenters || 0) + Number(d.health?.ayushCenters || 0) + Number(d.health?.privateHealthCenters || 0))}`, '#16a34a', `${fmtLakh(d.health?.urbanAyushman || d.health?.ayushmanBen || 0)} Ayushman · ${fmt(d.health?.healthBeds || 0)} beds`)}
                ${statCard('शहरी अर्थव्यवस्था', `${fmt(Number(d.economy?.largeIndustrialUnits || 0) + Number(d.economy?.smallScaleIndustries || 0))}`, '#e85d04', `${fmt(d.economy?.activeShgs || 0)} SHG · ${fmt(d.economy?.artisans || 0)} कारीगर`)}
                ${scopeLevel === 'ward'
                  ? statCard('सामाजिक सुरक्षा', `${fmt(Number(d.social?.oldAgePensioners || 0) + Number(d.social?.urbanWidow || 0))}`, '#1a2744', 'वृद्धा + विधवा पेंशन')
                  : statCard('वार्ड / नगर निकाय', `${fmt(d.meta?.wardCount || 0)} · ${fmt(d.meta?.ulbCount || 0)}`, '#1a2744', 'Selected urban units')
                }
              `}
      </div>

      <div class="footer-line">Govt of Rajasthan · ${escapeHtml(reportDateLabel)}</div>
    `, 'cover-page');

    const malePopulation = Number(d.population?.male || 0);
    const femalePopulation = Number(d.population?.female || 0);
    const sexRatio = malePopulation > 0 ? ((femalePopulation / malePopulation) * 1000).toFixed(0) : '—';
    const demographicPage = pageShell(`
      ${pageHeader('02 / 07', 'जनसांख्यिकी संरचना', demographicSubtitleEn, `PAGE 02 / 07 · जनसांख्यिकी संरचना`)}
      <div class="section-kicker">खंड 01</div>
      <h2 class="section-title">जनसांख्यिकी संरचना</h2>
      <div class="section-subtitle">${demographicSubtitleEn}</div>
      <div class="section-copy">${
  scopeLevel === 'gp'
    ? `${escapeHtml(coverMainName)} ग्राम पंचायत की बस्ती संरचना, जनसंख्या वितरण और कल्याण कवरेज का आधारभूत दृश्य इस अनुभाग में प्रस्तुत किया गया है।`
    : scopeLevel === 'ward'
      ? `${escapeHtml(coverMainName)} वार्ड की बस्ती संरचना, जनसंख्या वितरण और कल्याण कवरेज का आधारभूत दृश्य इस अनुभाग में प्रस्तुत किया गया है।`
      : `${escapeHtml(district)} जिले में ${showRuralProfile ? `${fmt(d.meta?.gpCount || 0)} ग्राम पंचायतें और ${fmt(d.meta?.blockCount || 0)} प्रशासनिक खंड` : ''}${showRuralProfile && showUrbanProfile ? ' तथा ' : ''}${showUrbanProfile ? `${fmt(d.meta?.wardCount || 0)} वार्ड और ${fmt(d.meta?.ulbCount || 0)} नगर निकाय` : ''} शामिल हैं। यह अनुभाग बस्ती संरचना, जनसंख्या वितरण और कल्याण कवरेज का आधारभूत दृश्य प्रस्तुत करता है।`
}</div>

      <div class="${showRuralProfile && showUrbanProfile ? 'two-col' : 'one-col'}">
        ${showRuralProfile ? `
        <div class="info-panel">
          <div class="panel-title">ग्रामीण प्रोफाइल</div>
          ${infoRow('ग्रामीण जनसंख्या (2026)', fmtLakh(d.population?.total || 0))}
          ${infoRow('ग्रामीण परिवार', fmt(ruralFamilies))}
          ${scopeLevel !== 'gp' ? infoRow('ग्राम पंचायतें', fmt(d.meta?.gpCount || 0)) : infoRow('ग्राम पंचायत', scope.gpName || coverMainName)}
          ${scopeLevel === 'gp' ? infoRow('विकास खंड', scope.block || '—') : scopeLevel === 'block' ? '' : infoRow('प्रशासनिक blocks', fmt(d.meta?.blockCount || 0))}
          ${infoRow('पक्के आवास कवरेज', `${puccaPct}%`)}
        </div>
        ` : ''}
        ${showUrbanProfile ? `
        <div class="info-panel">
          <div class="panel-title">शहरी प्रोफाइल</div>
          ${infoRow('शहरी जनसंख्या (2026)', fmtLakh(d.population?.urbanPop || 0))}
          ${scopeLevel === 'ward'
  ? infoRow('वार्ड', scope.wardName || coverMainName) + '\n          ' + infoRow('नगर निकाय', scope.ulb || '—')
  : infoRow('नगर निकाय', fmt(d.meta?.ulbCount || 0)) + '\n          ' + infoRow('शहरी वार्ड', fmt(d.meta?.wardCount || 0))}
          ${infoRow('सबसे बड़ा ULB', escapeHtml(largestUlb))}
          ${infoRow('औसत वार्ड जनसंख्या', avgWardPopulation ? `~${fmt(avgWardPopulation)}` : '—')}
        </div>
        ` : ''}
      </div>

      <div class="two-col metrics-row">
        <div class="info-panel">
          <div class="panel-title">प्रशासनिक प्रोफाइल</div>
          ${showRuralProfile && !showUrbanProfile ? (
            scopeLevel === 'gp' ? `
              ${infoRow('जिला', district)}
              ${infoRow('चयनित स्तर', 'ग्राम पंचायत')}
              ${infoRow('कुल किसान', fmt(d.agriculture?.totalFarmers || 0))}
              ${infoRow('सक्रिय SHG', fmt(d.economy?.activeShgs || 0))}
              ${infoRow('स्वास्थ्य केंद्र', fmt(Number(d.health?.allopathicCenters || 0) + Number(d.health?.ayushCenters || 0)))}
              ${infoRow('आंगनवाड़ी केंद्र', fmt(d.health?.awcCenters || 0))}
              ${infoRow('BPL परिवार', fmt(d.population?.bplFamilies || 0))}
              ${infoRow('PwD (Specially Abled) जनसंख्या', fmt(d.population?.pwd || 0))}
            ` : `
              ${infoRow('जिला', district)}
              ${infoRow('चयनित स्तर', scopeLevel === 'block' ? 'खंड' : 'जिला')}
              ${infoRow('चयनित इकाई', selectedScopeName)}
              ${scopeLevel === 'block' ? '' : infoRow('प्रशासनिक खंड', fmt(d.meta?.blockCount || 0))}
              ${infoRow('ग्राम पंचायतें', fmt(d.meta?.gpCount || 0))}
              ${infoRow('औसत GP क्षेत्र', avgGpArea ? `~${fmt(avgGpArea)} हे.` : '—')}
              ${infoRow('कुल भौगोलिक क्षेत्र', d.population?.totalAreaHectare ? `${fmt(d.population.totalAreaHectare)} हे.` : '—')}
              ${infoRow('BPL परिवार', fmt(d.population?.bplFamilies || 0))}
              ${infoRow('PwD (Specially Abled) जनसंख्या', fmt(d.population?.pwd || 0))}
            `
          ) : !showRuralProfile && showUrbanProfile ? (
            scopeLevel === 'ward' ? `
              ${infoRow('जिला', district)}
              ${infoRow('चयनित स्तर', 'शहरी वार्ड')}
              ${infoRow('सक्रिय SHG', fmt(d.economy?.activeShgs || 0))}
              ${infoRow('स्वास्थ्य केंद्र', fmt(Number(d.health?.allopathicCenters || 0) + Number(d.health?.ayushCenters || 0) + Number(d.health?.privateHealthCenters || 0)))}
              ${infoRow('आंगनवाड़ी केंद्र', fmt(d.health?.awcCenters || 0))}
              ${infoRow('विद्युत कनेक्शन', fmt(d.infrastructure?.electricityHouses || 0))}
              ${infoRow('BPL परिवार', fmt(d.population?.bplFamilies || 0))}
              ${infoRow('PwD (Specially Abled) जनसंख्या', fmt(d.population?.pwd || 0))}
            ` : `
              ${infoRow('जिला', district)}
              ${infoRow('चयनित स्तर', scopeLevel === 'ulb' ? 'नगर निकाय' : 'जिला')}
              ${infoRow('चयनित इकाई', selectedScopeName)}
              ${infoRow('नगर निकाय', fmt(d.meta?.ulbCount || 0))}
              ${infoRow('शहरी वार्ड', fmt(d.meta?.wardCount || 0))}
              ${infoRow('सबसे बड़ा ULB', largestUlb)}
              ${infoRow('औसत वार्ड जनसंख्या', avgWardPopulation ? `~${fmt(avgWardPopulation)}` : '—')}
              ${infoRow('BPL परिवार', fmt(d.population?.bplFamilies || 0))}
              ${infoRow('PwD (Specially Abled) जनसंख्या', fmt(d.population?.pwd || 0))}
            `
          ) : `
            ${infoRow('जिला', district)}
            ${infoRow('प्रशासनिक खंड', fmt(d.meta?.blockCount || 0))}
            ${infoRow('ग्राम पंचायतें', fmt(d.meta?.gpCount || 0))}
            ${infoRow('नगर निकाय', fmt(d.meta?.ulbCount || 0))}
            ${infoRow('शहरी वार्ड', fmt(d.meta?.wardCount || 0))}
            ${infoRow('BPL परिवार', fmt(d.population?.bplFamilies || 0))}
            ${infoRow('PwD (Specially Abled) जनसंख्या', fmt(d.population?.pwd || 0))}
          `}
        </div>
        <div class="info-panel">
          <div class="panel-title">जनसांख्यिकी प्रोफाइल</div>
          ${infoRow('पुरुष', fmt(malePopulation))}
          ${infoRow('महिला', fmt(femalePopulation))}
          ${infoRow('लिंग अनुपात (प्रति 1000)', sexRatio)}
          ${infoRow('बच्चे 0-6 वर्ष', fmt(d.population?.children06 || 0))}
          ${infoRow('बच्चे (स्कूली आयु 6-14)', fmt(d.population?.children614 || 0))}
          ${infoRow('बच्चे (14-18 वर्ष)', fmt(isRural || isDistrict ? (Number(d.population?.pop14_18 || 0) + Number(d.population?.urbanPop14_18 || 0)) : (d.population?.urbanPop14_18 || 0)))}
          ${infoRow('वरिष्ठ नागरिक (60+)', fmt(d.population?.seniors || 0))}
        </div>
      </div>

    `);

    const SECTOR_KEYWORDS = {
      water: ['water', 'jal', 'जल', 'fhtc', 'handpump', 'tubewell', 'pipeline', 'overhead tank', 'ro plant', 'drinking water', 'पेयजल', 'swachh', 'toilet', 'shauchalay', 'sewerage', 'drainage', 'sanitation', 'नल कनेक्शन', 'tap connection', 'jjm', 'amrut'],
      agriculture: ['agriculture', 'krishi', 'कृषि', 'irrigation', 'sinchai', 'सिंचाई', 'farm pond', 'drip', 'sprinkler', 'solar pump', 'kisan', 'fpo', 'seed', 'soil', 'fasal', 'pmksy', 'tarbandi', 'diggi', 'khet', 'pmfby'],
      dairy: ['dairy', 'dugdh', 'दुग्ध', 'livestock', 'pashu', 'पशु', 'milk', 'goat', 'sheep', 'poultry', 'saras', 'rcdf', 'nlm', 'पशुपालन', 'milch', 'veterinary', 'chikitsa'],
      health: ['health', 'swasthya', 'स्वास्थ्य', 'hospital', 'chc', 'phc', 'sub health', 'medical', 'nhm', 'ayushman', 'ayush', 'asha', 'anm', 'nurse', 'doctor', 'medicine', 'poshan', 'nutrition', 'sam children', 'anganwadi', 'awc', 'icds', 'maternity', 'delivery', 'ambulance', 'bed', 'ward', 'dispensary', 'health centre'],
      education: ['education', 'shiksha', 'शिक्षा', 'school', 'vidyalay', 'विद्यालय', 'teacher', 'student', 'college', 'skill', 'training', 'iti', 'hostel', 'library', 'computer lab', 'classroom', 'toilet school', 'school building', 'samagra', 'pm shri'],
      social: ['pension', 'awas', 'housing', 'ujjwala', 'social welfare', 'samaj', 'pwd', 'widow', 'bpl', 'ration', 'nfsa', 'old age', 'vridha', 'divyang', 'pm awas', 'pmay', 'indira awas', 'rehabilitation'],
      economy: ['shg', 'self help', 'mahila', 'women group', 'livelihood', 'mudra', 'msme', 'industry', 'artisan', 'craft', 'rozgar', 'employment', 'nrlm', 'srlm', 'lakhpati', 'entrepreneur', 'market', 'cold storage', 'processing unit'],
      infrastructure: ['road', 'sadak', 'सड़क', 'bridge', 'electricity', 'bijli', 'बिजली', 'street light', 'bank', 'post office', 'connectivity', 'bus stand', 'panchayat bhawan', 'community hall', 'building', 'pmgsy', '15th fc', 'rural road', 'link road'],
      governance: ['emitra', 'e-mitra', 'police', 'governance', 'shasan', 'revenue', 'patwari', 'patwari bhawan', 'digital', 'cctv', 'security', 'boundary wall', 'government office', 'doit', 'digital rajasthan', 'public wifi'],
      environment: ['forest', 'van', 'वन', 'nursery', 'plantation', 'vruksha', 'biogas', 'compost', 'waste', 'environment', 'paryavaran', 'पर्यावरण', 'solar energy', 'pm surya ghar', 'green', 'ecology', 'pond', 'talab', 'water harvesting', 'check dam', 'watershed', 'wildlife', 'pasture'],
      tourism: ['tourism', 'paryatan', 'पर्यटन', 'heritage', 'fair', 'mela', 'cultural', 'temple', 'monument', 'museum', 'dharohar', 'धरोहर', 'homestay', 'swadesh darshan', 'prashad', 'tourist'],
    } as const;

    // Sector-specific exclusions derived from Aspiration_Grouping Excel
    // Keys = sector values in aspirations_rural / aspirations_urban tables
    const SECTOR_EXCLUDED_ITEMS: Record<string, Set<string>> = {
      'कृषि एवं आजीविका': new Set([
        'अत्याधुनिक कृषि अनुसंधान केंद्रों की स्थापना',
        'नवीन पशु चिकित्सा उप केंद्र की स्थापना',
        'पशु चिकित्सा उप केंद्र का पशु चिकित्सालय में क्रमोन्नयन',
        'नवीन पशु चिकित्सालय',
        'पशु चिकित्सालय का प्रथम श्रेणी पशु चिकित्सालय में क्रमोन्नयन',
        'प्रथम श्रेणी पशु चिकित्सालय का बहुउद्देश्यीय चिकित्सालय में क्रमोन्नयन',
        'अन्य',
      ]),
      'स्वास्थ्य एवं कल्याण': new Set([
        'उप स्वास्थ्य केंद्र का प्राथमिक स्वास्थ्य केंद्र में क्रमोन्नयन',
        'नए उप स्वास्थ्य केंद्र की स्थापना',
        'प्राथमिक स्वास्थ्य केंद्र का सामुदायिक स्वास्थ्य केंद्र में क्रमोन्नयन',
        'नए प्राथमिक स्वास्थ्य केंद्र की स्थापना',
        'नवीन आयुर्वेद औषधालय की स्थापना',
        'नवीन होम्योपैथी औषधालय की स्थापना',
        'नवीन मां-बाड़ी केन्द्र',
        'छात्रावास का निर्माण',
        'छात्रावास भवन की मरम्मत',
      ]),
      'शिक्षा संबंधी जानकारी': new Set([
        'नवीन प्राथमिक विद्यालय की स्थापना',
        'प्राथमिक विद्यालयों का उच्च प्राथमिक विद्यालयों में क्रमोन्नयन',
        'उच्च प्राथमिक विद्यालय में क्रमोन्नयन',
        'उच्च माध्यमिक विद्यालय में क्रमोन्नयन',
        'संस्कृत विद्यालय में शौचालयों का निर्माण',
        'नवीन प्राथमिक संस्कृत विद्यालयों की स्थापना',
        'राजकीय प्रवेशिका संस्कृत विद्यालयों का वरिष्ठ उपाध्याय विद्यालयों में क्रमोन्नयन',
        'राजकीय संस्कृत महाविद्यालयों का आचार्य स्तर पर क्रमोन्नयन',
        'नए राजकीय आईटीआई संस्थान की स्थापना',
        'राजकीय पॉलिटेक्निक महाविद्यालयों की स्थापना',
      ]),
      'सामाजिक सशक्तिकरण और समावेशन': new Set([
        'नगर परिषद से नगर निगम में क्रमोन्नयन',
        'नगरपालिका से नगर परिषद में क्रमोन्नयन',
        'नवीन नगरपालिका का गठन',
      ]),
      'औद्योगिक, खनन और आर्थिक विकास': new Set([
        'औद्योगिक क्षेत्र की स्थापना',
        'औद्योगिक भूखंड का आवंटन',
      ]),
      'मुख्य (इंफ्रास्ट्रक्चर) आवागमन संबंधित': new Set([
        '132 केवी के नए ग्रिड सब स्टेशन',
        '220 केवी के नए ग्रिड सब स्टेशन',
        '400 केवी के नए ग्रिड सब स्टेशन',
      ]),
      'पर्यावरणीय स्थिरता और जलवायु अनुकूलता': new Set([
        'वन चौकी की स्थापना',
      ]),
      'प्रभावी शासन और सार्वजनिक सेवाएं': new Set([
        'नवीन पुलिस चौकी का सृजन',
      ]),
    };

    // Helper: check if an aspiration item is excluded for its sector
    const isExcludedForSector = (item: string, sector: string): boolean => {
      const itemTrimmed = item.trim();
      const sectorSet = SECTOR_EXCLUDED_ITEMS[sector.trim()];
      return sectorSet ? sectorSet.has(itemTrimmed) : false;
    };

    // Canonical sort order from Aspiration_Grouping Excel file
    // Lower number = higher priority display order
    const ITEM_ORDER_MAP: Record<string, number> = {
      'पटवार भवन का निर्माण': 1,
      'नवीन राजस्व ग्राम का गठन': 2,
      'अन्य': 3,
      'लघु सिंचाई परियोजना': 4,
      'सिंचाई  पाइपलाइन': 5,
      'फार्म पौण्ड (खेत तलाई) निर्माण': 6,
      'डिग्गी निर्माण': 7,
      'ड्रिप एवं मिनी स्प्रिंकलर संयंत्र': 8,
      'फव्वारा संयंत्र': 9,
      'सोलर पंप सेट': 10,
      'ग्रीन हाउस': 11,
      'पॉली हाउस': 12,
      'शेडनेट हाउस': 13,
      'प्लास्टिक मल्चिंग': 14,
      'कृषि उपज मंडी': 15,
      'कोल्ड स्टोरेज का निर्माण': 16,
      'ग्राम सेवा सहकारी समितियों में नए गोदामों का निर्माण': 17,
      'प्याज भंडारण गृहों का निर्माण': 18,
      'कस्टम हायरिंग केंद्रों की स्थापना': 19,
      'खाद्य एवं कृषि प्रसंस्करण इकाई': 20,
      'किसान उत्पादक संगठन का गठन': 21,
      'नए पैक्स (PACS) का गठन': 22,
      'नए लैम्प्स (LAMPS) का गठन': 23,
      'नवीन ग्राम सेवा सहकारी समितियों का गठन': 24,
      'वर्मी कम्पोस्ट इकाई': 26,
      'मृदा परीक्षण प्रयोगशालाओं का निर्माण एवं क्षमतावर्धन': 27,
      'फल बगीचे की स्थापना': 28,
      'फूल बगीचे की स्थापना': 29,
      'खेतो पर तारबंदी': 30,
      '%मत्स्य बीज उत्पादन (स्रोत)': 31,
      'मत्स्य उत्पादन': 32,
      'मधुमक्खी पालन': 33,
      'नवीन गौशालाएं': 34,
      'पशु चिकित्सा उप केंद्र भवन का निर्माण': 35,
      'पशु चिकित्सा उप केंद्र भवन की मरम्मत': 36,
      'पशु चिकित्सालय के भवन का निर्माण': 39,
      'पशु चिकित्सालय के भवन की मरम्मत': 40,
      'उप स्वास्थ्य केंद्र के भवन निर्माण': 45,
      'उप स्वास्थ्य केंद्र भवन की मरम्मत': 46,
      'प्राथमिक स्वास्थ्य केंद्र के भवन निर्माण': 49,
      'प्राथमिक स्वास्थ्य केंद्र पर आवासीय भवन निर्माण': 50,
      'प्राथमिक स्वास्थ्य केंद्र भवन की मरम्मत': 51,
      'सामुदायिक स्वास्थ्य केंद्र के भवन निर्माण': 54,
      'सामुदायिक स्वास्थ्य केंद्र भवन की मरम्मत': 55,
      'सामुदायिक स्वास्थ्य केंद्र पर आवासीय भवन निर्माण': 56,
      'भवन की बाउंड्री वॉल': 57,
      'सामुदायिक स्वास्थ्य केंद्र में सोनोग्राफी मशीन': 58,
      'सामुदायिक स्वास्थ्य केंद्र में डायलिसिस मशीन': 59,
      'शैय्याओं की संख्या में वृद्धि': 60,
      'आयुर्वेद चिकित्सा केंद्र भवन का निर्माण': 61,
      'आयुर्वेद चिकित्सा केंद्र भवन की मरम्मत': 62,
      'आंगनवाड़ी केन्द्र की स्थापना': 65,
      'आंगनवाड़ी केन्द्र भवन निर्माण': 66,
      'आंगनवाड़ी केन्द्र भवन मरम्मत': 67,
      'आंगनवाड़ी केन्द्र में विद्युतीकरण': 68,
      'आंगनवाड़ी केन्द्र में पेयजल व्यवस्था': 69,
      'आंगनवाड़ी केन्द्र में शौचालय का निर्माण': 70,
      'विद्यालय भवन निर्माण': 75,
      'अतिरिक्त कक्षा-कक्ष का निर्माण': 76,
      'पुस्तकालय': 77,
      'शाला भवन में खेल मैदान का निर्माण': 78,
      'शाला भवन में पीने के पानी की व्यवस्था': 79,
      'शाला भवन में बिजली की उपलब्धता': 80,
      'शाला भवन में वर्षा जल संचयन की सुविधा': 81,
      'शाला में कंप्यूटर की व्यवस्था': 82,
      'शौचालय का निर्माण': 83,
      'शौचालय की मरम्मत': 84,
      'शौचालय में पानी की व्यवस्था': 85,
      'संस्कृत विद्यालय भवन का निर्माण': 90,
      'संस्कृत विद्यालय में अतिरिक्त कक्षा-कक्षों का निर्माण': 91,
      'संस्कृत विद्यालय में पुस्तकालय': 92,
      'संस्कृत विद्यालय में भवन की बाउंड्री वॉल का निर्माण': 93,
      'संस्कृत विद्यालय में भवन की मरम्मत': 94,
      'संस्कृत विद्यालय में शाला भवनों में खेल मैदानों का निर्माण': 95,
      'संस्कृत विद्यालय में शाला भवनों में पीने के पानी की व्यवस्था': 96,
      'संस्कृत विद्यालय में शाला भवनों में बिजली की उपलब्धता': 97,
      'संस्कृत विद्यालय में शाला भवनों में वर्षा जल संचयन की सुविधा': 98,
      'संस्कृत विद्यालय में शालाओं में कंप्यूटर की व्यवस्था': 99,
      'संस्कृत विद्यालय में शौचालय का निर्माण': 100,
      'संस्कृत विद्यालय में शौचालयों की मरम्मत': 101,
      'संस्कृत विद्यालय में शौचालयों में पानी की व्यवस्था': 102,
      'आईटीआई भवन का निर्माण': 105,
      'आईटीआई भवन की मरम्मत': 106,
      'राजकीय आईटीआई संस्थान में सीटों में वृद्धि': 107,
      'कौशल, नियोजन एवं उद्यमिता शिविर का आयोजन': 110,
      'छात्रावास भवन की मरम्मत': 112,
      'नए छात्रावास का निर्माण': 113,
      'नवीन उचित मूल्य की दुकान': 119,
      'पंचायत भवन निर्माण': 120,
      'पार्कों का निर्माण': 121,
      'पुस्तकालय निर्माण': 122,
      'प्रधानमंत्री आवास योजना': 123,
      'प्रधानमंत्री आवास योजना (शहरी)': 124,
      'सामुदायिक भवन': 125,
      'सामुदायिक शौचालय': 126,
      'सार्वजनिक शौचालय': 127,
      'यातायात साधनों हेतु पार्किंग': 128,
      'रोड लाइट': 129,
      'सड़क निर्माण': 131,
      'सड़क मरम्मत': 132,
      'कचरा ले जाने के लिए हूपर': 134,
      'सॉलिड वेस्ट प्रोसेसिंग प्लांट': 135,
      'सीवरेज ट्रीटमेंट प्लांट': 136,
      'सीवरेज लाइन': 137,
      'राजीविका के अंतर्गत स्वयं सहायता समूह का गठन': 138,
      'सूक्ष्म, लघु एवं मध्यम उद्योगों की स्थापना': 142,
      '33 केवी के नए सब स्टेशन': 146,
      'कृषि कनेक्शन': 148,
      'घरेलू कनेक्शन': 149,
      'घरेलू पाइपलाइन कुकिंग गैस कनेक्शन': 150,
      'नवीन सड़क निर्माण': 151,
      'निर्मित सड़क की मरम्मत': 152,
      'गांव को सड़क से जोड़ना': 153,
      'ढाणियों/मजरों को सड़क से जोड़ना': 154,
      'नए मार्ग': 155,
      'आरओबी निर्माण': 156,
      'आरयूबी निर्माण': 157,
      'मिसिंग लिंक सड़क का निर्माण': 158,
      'मिसिंग लिंक सड़क की मरम्मत': 159,
      'ग्रामीण बस सुविधा': 161,
      'बस स्टैंड': 162,
      'रोडवेज बस सुविधा': 163,
      'नए हैंडपंप': 166,
      'हैंडपंप मरम्मत': 167,
      'नए ट्यूबवेल': 168,
      'ट्यूबवेल मरम्मत': 169,
      'पेयजल हेतु घरेलू नल कनेक्शन': 170,
      'जल संग्रहण संरचना': 172,
      'नर्सरी': 175,
      'वृक्षारोपण': 176,
      'सार्वजनिक भूमि पर वन विकास': 177,
      'वन्य पशुओं के पेयजल हेतु निर्माण': 179,
      'नवीन पर्यटन इकाई': 181,
      'पर्यटन केन्द्र की स्थापना': 182,
      'पर्यटन स्थल का विकास/संरक्षण': 183,
      'ऐतिहासिक महत्व के स्मारक का संरक्षण': 184,
      'ई-मित्र': 186,
      'शैक्षणिक संस्थानों में सीसीटीवी कैमरे': 188,
      'सार्वजनिक स्थानों पर सीसीटीवी कैमरे': 189,
    };

    const PAGE_DEPT_NAMES: Record<string, string[]> = {
      'people_society': [
        'स्वास्थ्य एवं कल्याण',
        'शिक्षा संबंधी जानकारी',
        'सामाजिक सशक्तिकरण और समावेशन',
      ],
      'livelihood_economy': [
        'कृषि एवं आजीविका',
        'पर्यटन एवं सांस्कृतिक विकास',
      ],
      'core_infra': [
        'जल सुरक्षा और समुदाय आधारित क्षमता',
        'मुख्य (इंफ्रास्ट्रक्चर) आवागमन संबंधित',
      ],
      'env_heritage': [
        'पर्यावरणीय स्थिरता और जलवायु अनुकूलता',
        'प्रभावी शासन और सार्वजनिक सेवाएं',
      ],
    };

    const getEligibleAspirations = (aspirations: any[], sectorHint?: string) => {
      if (!aspirations) return [];
      return aspirations.filter((a: any) => {
        const item = String(a.item || '').trim();
        const sector = sectorHint || String(a.sector || a.dept || '').trim();
        return !isExcludedForSector(item, sector);
      });
    };

    const getAspirationsForSector = (aspirations: any[], includeKeywords: readonly string[], maxRows = 8, pageKey?: string) => {
      if (!aspirations || aspirations.length === 0) return [];

      // Step 1: dept-first filtering
      // If this page has known dept names, use them as the primary filter.
      // Only fall back to keyword matching for items with no recognized dept.
      const knownDepts = pageKey ? (PAGE_DEPT_NAMES[pageKey] || []) : [];

      let filtered: any[];

      if (knownDepts.length > 0) {
        // Primary: items whose sector/dept column matches this page's known depts
        const deptMatched = aspirations.filter((a: any) => {
          const dept = String(a.sector || a.dept || '').trim();
          return knownDepts.some(d => dept.includes(d) || d.includes(dept));
        });

        // Secondary: items with no recognized dept at all (untagged / catch-all)
        // — only include these via keyword match on item text, and only if they
        // don't already belong to a different page's depts
        const allKnownDepts = Object.values(PAGE_DEPT_NAMES).flat();
        const includeKw = (includeKeywords as string[]).map(kw => kw.toLowerCase());
        const keywordFallback = aspirations.filter((a: any) => {
          const dept = String(a.sector || a.dept || '').trim();
          // Skip if this item has a recognized dept (belongs to another page)
          if (allKnownDepts.some(d => dept.includes(d) || d.includes(dept))) return false;
          // Accept if item text matches this page's keywords
          const itemText = String(a.item || '').toLowerCase();
          return includeKw.some(kw => itemText.includes(kw));
        });

        // Combine: dept-matched items first, then untagged keyword matches
        const seen = new Set(deptMatched);
        filtered = [...deptMatched, ...keywordFallback.filter(a => !seen.has(a))];
      } else {
        // No known dept mapping for this page — fall back to keyword matching as before
        const includeKw = (includeKeywords as string[]).map(kw => kw.toLowerCase());
        filtered = aspirations.filter((a: any) => {
          const sectorText = [a.sector || '', a.dept || '', a.item || '', a.sector_hi || '', a.indicator_hi || ''].join(' ').toLowerCase();
          return includeKw.some((keyword) => sectorText.includes(keyword));
        });
      }

      // Step 2: exclude govt-excluded items using shared helper
      const eligible = getEligibleAspirations(filtered);

      // Step 3: sort by Excel-defined order, then by status, then by priority
      eligible.sort((a: any, b: any) => {
        const orderA = ITEM_ORDER_MAP[String(a.item || '').trim()] ?? 999;
        const orderB = ITEM_ORDER_MAP[String(b.item || '').trim()] ?? 999;
        if (orderA !== orderB) return orderA - orderB;
        const statusOrder: Record<string, number> = { FUNDED: 0, ACCEPT: 1, REVIEW: 2 };
        const statusDiff = (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3);
        if (statusDiff !== 0) return statusDiff;
        return (Number(a.priority) || 99) - (Number(b.priority) || 99);
      });

      // For district-level reports (maxRows = Infinity), aggregate by item name instead
      // of returning one row per GP/ward. Summing qty_2030/2035/2047 across all GPs/wards
      // keeps the report to a manageable page count (target: under 20 pages) while still
      // showing every distinct sub-indicator, excluding only items per SECTOR_EXCLUDED_ITEMS.
      if (!Number.isFinite(maxRows)) {
        const aggregateMap = new Map<string, {
          item: string;
          dept: string;
          sector: string;
          priority: number;
          qty_2030: number;
          qty_2035: number;
          qty_2047: number;
          status: string;
          area_type: string;
        }>();

        const statusOrder: Record<string, number> = { FUNDED: 0, ACCEPT: 1, REVIEW: 2 };

        for (const asp of eligible) {
          const itemKey = String(asp.item || '').trim();
          if (!itemKey) continue;

          const existing = aggregateMap.get(itemKey);
          if (!existing) {
            aggregateMap.set(itemKey, {
              item: itemKey,
              dept: String(asp.dept || asp.sector || '').trim(),
              sector: String(asp.sector || '').trim(),
              priority: Number(asp.priority) || 99,
              qty_2030: Number(asp.qty_2030) || 0,
              qty_2035: Number(asp.qty_2035) || 0,
              qty_2047: Number(asp.qty_2047) || 0,
              status: String(asp.status || ''),
              area_type: String(asp.area_type || ''),
            });
          } else {
            existing.qty_2030 += Number(asp.qty_2030) || 0;
            existing.qty_2035 += Number(asp.qty_2035) || 0;
            existing.qty_2047 += Number(asp.qty_2047) || 0;
            const newPriority = Number(asp.priority) || 99;
            if (newPriority < existing.priority) existing.priority = newPriority;
            const newStatus = String(asp.status || '');
            if ((statusOrder[newStatus] ?? 3) < (statusOrder[existing.status] ?? 3)) {
              existing.status = newStatus;
            }
          }
        }

        const aggregated = Array.from(aggregateMap.values());

        aggregated.sort((a, b) => {
          const orderA = ITEM_ORDER_MAP[a.item] ?? 999;
          const orderB = ITEM_ORDER_MAP[b.item] ?? 999;
          if (orderA !== orderB) return orderA - orderB;
          const statusDiff = (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3);
          if (statusDiff !== 0) return statusDiff;
          return a.priority - b.priority;
        });

        return aggregated;
      }

      // Step 4: cap at 2 per unique item name to ensure diversity across aspiration types
      const MAX_PER_ITEM = 2;
      const itemCount: Record<string, number> = {};
      const result: any[] = [];
      for (const asp of eligible) {
        // Normalize item name: strip trailing numbers/locations to group variants
        const itemKey = String(asp.item || 'other').trim();
        itemCount[itemKey] = (itemCount[itemKey] || 0);
        if (itemCount[itemKey] < MAX_PER_ITEM) {
          result.push(asp);
          itemCount[itemKey]++;
        }
        if (result.length >= maxRows) break;
      }

      // Step 5: fill up to maxRows if needed
      if (result.length < maxRows) {
        const resultSet = new Set(result);
        for (const asp of eligible) {
          if (!resultSet.has(asp)) {
            result.push(asp);
            if (result.length >= maxRows) break;
          }
        }
      }

      return result;
    };

    const renderAspirationRows = (aspirations: any[], hideGpCol = false, sectorHint?: string) => {
      console.log('[renderAspirationRows] count:', aspirations?.length);
      aspirations = aspirations.filter(
        (a: any) => !isExcludedForSector(String(a.item || '').trim(), sectorHint || String(a.sector || a.dept || '').trim())
      );
      if (!aspirations || aspirations.length === 0) {
        const colCount = hideGpCol ? 5 : 6;
        return `<tr><td colspan="${colCount}" style="text-align:center; color:#94a3b8; padding:16px; font-style:italic; font-family:'Noto Sans Devanagari',sans-serif;">इस क्षेत्र के लिए कोई स्वीकृत आकांक्षा उपलब्ध नहीं है</td></tr>`;
      }

      return aspirations.map((aspiration) => `
        <tr>
          <td>
            <div style="font-weight:700; color:#1a1a2e; font-family:'Noto Sans Devanagari',sans-serif;">${escapeHtml(aspiration.item || '—')}</div>
            <div style="font-size:10px; color:#64748b; margin-top:2px; font-family:sans-serif;">${escapeHtml(aspiration.dept || aspiration.sector || '')}</div>
          </td>
          <td style="text-align:center;">
            <span class="priority-badge ${Number(aspiration.priority) <= 2 ? 'p1' : 'p2'}">P-${escapeHtml(aspiration.priority || '—')}</span>
          </td>
          ${hideGpCol ? '' : `<td style="text-align:center; font-family:sans-serif; font-weight:700; font-size:11px; max-width:80px; word-break:break-word;">
            ${escapeHtml(
        (aspiration.area_type === 'Urban' || aspiration.area_type === 'urban' || aspiration.ward)
          ? (aspiration.ward || aspiration.ward_name || aspiration.city || aspiration.ulb || String(aspiration.ward_id || '') || '—')
          : (aspiration.gram_panchayat || aspiration.gp_name || '—')
      )}
          </td>`}
          <td style="font-family:sans-serif;">${escapeHtml(aspiration.qty_2030 ?? '—')}</td>
          <td style="font-family:sans-serif;">${escapeHtml(aspiration.qty_2035 ?? '—')}</td>
          <td style="font-family:sans-serif;">${escapeHtml(aspiration.qty_2047 ?? '—')}</td>
        </tr>
      `).join('');
    };

    const sectorPages = (isRural || isDistrict) ? [
      {
        pageNo: '03', groupNo: '01', totalGroups: '04',
        titleHi: 'जन एवं समाज',
        titleEn: 'People & Society — स्वास्थ्य, शिक्षा, आंगनवाड़ी, सामाजिक सशक्तिकरण',
        band: 'group-blue',
        aspirationLabel: 'स्वास्थ्य · शिक्षा · पोषण · सामाजिक सशक्तिकरण',
        pageKey: 'people_society',
        cards: [
          { value: fmt(d.education?.totalSchools || 0) !== '0' ? fmt(d.education?.totalSchools || 0) : fmt(Number(d.education?.govtSchools || 0) + Number(d.education?.pvtSchools || 0)), label: 'विद्यालय (कुल)', sub: `${fmt(d.education?.govtSchools || 0)} राजकीय + ${fmt(d.education?.pvtSchools || 0)} निजी` },
          { value: fmt(d.education?.enrolledStudents || 0), label: 'नामांकित छात्र', sub: 'School enrollment' },
          { value: fmt(d.health?.awcCenters || 0), label: 'आंगनवाड़ी केंद्र', sub: isDistrict ? `${fmt(d.meta?.blockCount || 0)} blocks में` : `${fmt(d.meta?.blockCount || 0)} blocks में` },
          { value: fmt(d.education?.anganwadiEnrolledChildren || 0), label: 'AWC नामांकित बच्चे', sub: 'ICDS · 0-6 वर्ष' },
          { value: Number(d.health?.allopathicCenters || 0) + Number(d.health?.ayushCenters || 0) > 0 ? fmt(Number(d.health?.allopathicCenters || 0) + Number(d.health?.ayushCenters || 0)) : fmt(d.health?.allopathicCenters || 0), label: 'स्वास्थ्य केंद्र', sub: 'SHC · CHC · PHC सहित' },
          { value: fmt(d.health?.samChildren || 0), label: 'SAM बच्चे', sub: 'POSHAN 2.0 cohort' },
          { value: fmtLakh(Number(d.health?.ayushmanBen || 0) + Number(d.health?.urbanAyushman || 0)), label: 'CM Ayushman कवरेज', sub: 'लाभार्थी नागरिक' },
          { value: fmt(d.health?.ashaWorkers || 0), label: 'ASHA कार्यकर्ता', sub: 'अंतिम-छोर स्वास्थ्य दल' },
          { value: fmt(d.economy?.activeShgs || 0), label: 'सक्रिय SHG', sub: `+ ${fmt(d.economy?.lakhpatiDidis || 0)} लखपति दीदी` },
          { value: fmt(Number(d.social?.widowPensioners || 0) + Number(d.social?.urbanWidow || 0)), label: 'विधवा पेंशन', sub: 'सामाजिक सुरक्षा' },
          { value: fmt(d.population?.seniors || 0), label: 'वरिष्ठ नागरिक (60+)', sub: 'Senior citizens' },
          { value: fmt(d.health?.tbPatients || 0), label: 'TB रोगी', sub: 'NHM tracking' },
        ],
        narrative: [n.sectorNarratives?.health, n.sectorNarratives?.education, n.sectorNarratives?.socialWelfare].filter(Boolean).join(' '),
        aspirationKeywords: [...SECTOR_KEYWORDS.health, ...SECTOR_KEYWORDS.education, ...SECTOR_KEYWORDS.social] as readonly string[],
      },
      {
        pageNo: '04', groupNo: '02', totalGroups: '04',
        titleHi: 'आजीविका एवं अर्थव्यवस्था',
        titleEn: 'Livelihood & Economy — कृषि, पशुपालन, उद्योग, पर्यटन',
        band: 'group-rust',
        aspirationLabel: 'कृषि · पशुपालन · उद्योग · पर्यटन',
        pageKey: 'livelihood_economy',
        cards: [
          { value: fmtLakh(d.agriculture?.totalFarmers || 0), label: 'कुल किसान', sub: `ग्रामीण जनसंख्या का ${d.population?.total > 0 ? ((Number(d.agriculture?.totalFarmers || 0) / Number(d.population?.total)) * 100).toFixed(1) : '—'}%` },
          { value: fmtLakh(d.agriculture?.cultivableHa || 0), label: 'कृषि भूमि', sub: 'हेक्टेयर · कृषि-योग्य' },
          { value: fmtLakh(d.agriculture?.irrigatedHa || 0), label: 'सिंचित क्षेत्र', sub: `कृषि भूमि का ${fmtPct(d.agriculture?.irrigationPct)}` },
          { value: fmtLakh(d.dairy?.totalLivestock || 0), label: 'कुल पशुधन', sub: `${(Number(d.dairy?.totalLivestock || 0) / Math.max(Number(d.agriculture?.totalFarmers || 1), 1)).toFixed(1)} प्रति किसान` },
          { value: fmtLakh(d.dairy?.dailyMilkLpd || 0), label: 'दैनिक दुग्ध उत्पादन', sub: 'cooperative-grade क्षमता' },
          { value: fmtLakh(d.agriculture?.kccHolders || 0), label: 'KCC धारक', sub: 'ऋण-संबद्ध किसान' },
          { value: fmtLakh(d.agriculture?.pmKisan || 0), label: 'PM-KISAN नामांकन', sub: `किसानों का ${d.agriculture?.totalFarmers > 0 ? ((Number(d.agriculture?.pmKisan || 0) / Number(d.agriculture?.totalFarmers)) * 100).toFixed(1) : '—'}%` },
          { value: fmt(d.economy?.artisans || 0), label: 'स्थानीय कारीगर', sub: 'ग्रामीण + शहरी' },
          { value: fmt(d.agriculture?.cropInsurance || 0), label: 'फसल बीमा किसान', sub: 'PMFBY coverage' },
          { value: fmt(d.agriculture?.soilCards || 0), label: 'मृदा स्वास्थ्य कार्ड', sub: 'Valid soil cards' },
          { value: fmt(d.dairy?.milchAnimals || 0), label: 'दुधारू पशु', sub: 'Milch animals' },
          { value: fmt(d.economy?.mudraLoan || 0), label: 'Mudra ऋण लाभार्थी', sub: 'PMMY beneficiaries' },
        ],
        narrative: [n.sectorNarratives?.agriculture, n.sectorNarratives?.dairy, n.sectorNarratives?.economy, n.sectorNarratives?.tourism].filter(Boolean).join(' '),
        aspirationKeywords: [...SECTOR_KEYWORDS.agriculture, ...SECTOR_KEYWORDS.dairy, ...SECTOR_KEYWORDS.economy, ...SECTOR_KEYWORDS.tourism] as readonly string[],
      },
      {
        pageNo: '05', groupNo: '03', totalGroups: '04',
        titleHi: 'मूलभूत संरचना',
        titleEn: 'Core Infrastructure — जल, सड़क, विद्युत, संचार एवं स्वच्छता',
        band: 'group-teal',
        aspirationLabel: 'जल · सड़क · विद्युत · स्वच्छता',
        pageKey: 'core_infra',
        cards: [
          { value: fmtKm(d.infrastructure?.roadKm || 0), label: 'ग्रामीण सड़क नेटवर्क', sub: 'सभी श्रेणियां' },
          { value: fmtPct(d.water?.ruralFhtcAvg), label: 'FHTC (ग्रामीण)', sub: 'JJM Phase 2 inflow' },
          { value: fmtPct(d.water?.urbanFhtcAvg || 0), label: 'FHTC (शहरी)', sub: 'AMRUT linkages' },
          { value: fmt(d.population?.totalFamilies || 0), label: 'ग्रामीण परिवार', sub: 'सेवा-क्षेत्र आधार' },
          { value: fmt(d.water?.overheadTanks || 0), label: 'OVERHEAD TANKS', sub: 'भंडारण अवसंरचना' },
          { value: fmt(d.infrastructure?.electricityHouses || 0), label: 'विद्युतीकृत परिवार', sub: `${d.population?.puccaHouses > 0 ? ((Number(d.infrastructure?.electricityHouses || 0) / (Number(d.population?.puccaHouses || 1) + Number(d.population?.kutchaHouses || 1))) * 100).toFixed(1) : '—'}% ग्रामीण HH` },
          { value: fmt(d.infrastructure?.publicToilets || 0), label: 'सार्वजनिक शौचालय', sub: 'community + public' },
          { value: `${fmt(d.infrastructure?.govtBanks || 0)} · ${fmt(d.infrastructure?.postOffices || 0)}`, label: 'बैंक · डाकघर', sub: 'अंतिम-छोर वित्त + डाक' },
          { value: fmt(d.infrastructure?.streetLights || 0), label: 'स्ट्रीट लाइट', sub: 'Total street lights' },
          { value: fmt(d.infrastructure?.solarHomes || 0), label: 'सौर गृह', sub: 'Solar installed houses' },
          { value: fmt(d.water?.roFacilities || 0), label: 'RO सुविधाएं', sub: 'Drinking water RO' },
          { value: fmt(d.infrastructure?.postOffices || 0), label: 'डाकघर', sub: 'Post office network' },
        ],
        narrative: [n.sectorNarratives?.water, n.sectorNarratives?.infrastructure].filter(Boolean).join(' '),
        aspirationKeywords: [...SECTOR_KEYWORDS.water, ...SECTOR_KEYWORDS.infrastructure] as readonly string[],
      },
      {
        pageNo: '06', groupNo: '04', totalGroups: '04',
        titleHi: 'पर्यावरण एवं विरासत',
        titleEn: 'Environment & Heritage — वन, सांस्कृतिक धरोहर, शासन एवं ई-गवर्नेंस',
        band: 'group-brown',
        aspirationLabel: 'वन · विरासत · शासन · निगरानी',
        pageKey: 'env_heritage',
        cards: [
          { value: fmtLakh(d.environment?.forestHa || 0), label: 'संरक्षित वन', sub: 'हेक्टेयर · अभयारण्य सहित' },
          { value: fmtLakh(d.environment?.pastureHa || 0), label: 'चरागाह भूमि', sub: 'सामुदायिक commons' },
          { value: fmt(d.tourism?.heritageSites || 0), label: 'धार्मिक/सांस्कृतिक स्थल', sub: `${fmt(d.meta?.gpCount || 0)} GPs में` },
          { value: fmt(d.tourism?.annualFairs || 0), label: 'धार्मिक मेले', sub: 'प्रति वर्ष · जिला-व्यापी' },
          { value: fmt(d.environment?.biogasPlants || 0), label: 'Biogas Plants', sub: 'नवीकरणीय ऊर्जा' },
          scopeLevel === 'gp'
            ? { value: fmtPct(d.water?.ruralFhtcAvg || 0), label: 'FHTC कवरेज', sub: 'नल जल कनेक्शन प्रतिशत' }
            : scopeLevel === 'block'
              ? { value: fmtPct(d.water?.ruralFhtcAvg || 0), label: 'FHTC औसत (खंड)', sub: `${fmt(d.water?.gpsBelow30Fhtc || 0)} GPs below 30%` }
              : { value: fmt(d.water?.gpsBelow30Fhtc || 0), label: 'GPs — FHTC 30% से कम', sub: 'जल आपूर्ति प्राथमिकता' },
          { value: fmt(d.environment?.govtCompostPits || 0), label: 'सरकारी नर्सरी/कॉम्पोस्ट', sub: 'waste processing' },
          { value: fmt(d.environment?.suryaGharHomes || 0), label: 'PM Surya Ghar', sub: 'solar homes' },
          { value: fmt(d.environment?.wasteKgDay || 0), label: 'दैनिक अपशिष्ट (kg)', sub: 'Daily waste generated' },
          { value: fmt(d.tourism?.dailyFootfall || 0), label: 'सांस्कृतिक आगंतुक/दिन', sub: 'Cultural site footfall' },
          { value: fmtKm(d.governance?.distPoliceKm || 0), label: 'थाना दूरी (औसत)', sub: 'Avg police station dist.' },
          { value: fmtKm(d.governance?.distLpgKm || 0), label: 'LPG वितरक दूरी', sub: 'Avg LPG distributor dist.' },
        ],
        narrative: [n.sectorNarratives?.environment, n.sectorNarratives?.governance, n.sectorNarratives?.tourism].filter(Boolean).join(' '),
        aspirationKeywords: [...SECTOR_KEYWORDS.environment, ...SECTOR_KEYWORDS.governance, ...SECTOR_KEYWORDS.tourism] as readonly string[],
      },
    ] : [
      {
        pageNo: '03', groupNo: '01', totalGroups: '04',
        titleHi: 'जन एवं समाज',
        titleEn: 'People & Society — स्वास्थ्य, शिक्षा, आंगनवाड़ी, सामाजिक सशक्तिकरण',
        band: 'group-blue',
        aspirationLabel: 'स्वास्थ्य · शिक्षा · पोषण · सामाजिक सशक्तिकरण',
        pageKey: 'people_society',
        cards: [
          { value: fmt(Number(d.education?.govtSchools || 0) + Number(d.education?.pvtSchools || 0)) || fmt(d.education?.totalSchools || 0), label: 'विद्यालय (कुल)', sub: `${fmt(d.education?.govtSchools || 0)} राजकीय + ${fmt(d.education?.pvtSchools || 0)} निजी` },
          { value: fmt(d.health?.awcCenters || 0), label: 'आंगनवाड़ी केंद्र', sub: 'ICDS नेटवर्क' },
          { value: fmt(Number(d.health?.allopathicCenters || 0) + Number(d.health?.ayushCenters || 0) + Number(d.health?.privateHealthCenters || 0)), label: 'स्वास्थ्य केंद्र', sub: 'Allopathic + AYUSH + निजी' },
          { value: fmt(d.economy?.activeShgs || 0), label: 'सक्रिय SHG', sub: 'महिला समूह' },
          { value: fmtLakh(d.health?.urbanAyushman || d.health?.ayushmanBen || 0), label: 'Ayushman कवरेज', sub: 'शहरी लाभार्थी' },
          { value: fmt(d.health?.samChildren || 0), label: 'SAM बच्चे', sub: 'POSHAN 2.0' },
          { value: fmt(d.health?.ashaWorkers || 0), label: 'ASHA कार्यकर्ता', sub: 'अंतिम-छोर दल' },
          { value: fmt(d.education?.enrolledStudents || 0), label: 'नामांकित छात्र', sub: 'विद्यालय नामांकन' },
          { value: fmt(d.population?.seniors || 0), label: 'वरिष्ठ नागरिक (60+)', sub: 'Senior citizens' },
          { value: fmt(d.population?.pwd || 0), label: 'PwD जनसंख्या', sub: 'Specially Abled Persons' },
          { value: fmt(d.health?.tbPatients || 0), label: 'TB रोगी', sub: 'NHM tracking' },
          { value: fmt(d.health?.snpRecipients || 0), label: 'SNP लाभार्थी (6-72 माह)', sub: 'ICDS nutrition program' },
        ],
        narrative: [n.sectorNarratives?.health, n.sectorNarratives?.education, n.sectorNarratives?.socialWelfare].filter(Boolean).join(' '),
        aspirationKeywords: [...SECTOR_KEYWORDS.health, ...SECTOR_KEYWORDS.education, ...SECTOR_KEYWORDS.social] as readonly string[],
      },
      {
        pageNo: '04', groupNo: '02', totalGroups: '04',
        titleHi: 'आजीविका एवं अर्थव्यवस्था',
        titleEn: 'Urban Livelihood & Economy — उद्योग, कारीगर, SHG, पर्यटन',
        band: 'group-rust',
        aspirationLabel: 'उद्योग · SHG · कारीगर · पर्यटन',
        pageKey: 'livelihood_economy',
        cards: [
          { value: fmt(d.economy?.activeShgs || 0), label: 'सक्रिय SHG', sub: 'महिला स्वयं सहायता समूह' },
          { value: fmt(d.economy?.artisans || 0), label: 'स्थानीय कारीगर', sub: 'शिल्प आधार' },
          { value: fmt(d.economy?.largeIndustrialUnits || Number(d.economy?.urbanIndustries || 0)), label: 'बड़े उद्योग', sub: 'औद्योगिक इकाइयां' },
          { value: fmt(d.economy?.smallScaleIndustries || 0), label: 'लघु उद्योग', sub: 'MSME क्षेत्र' },
          { value: fmt(d.economy?.lakhpatiDidis || 0), label: 'लखपति दीदी', sub: 'महिला उद्यमी' },
          { value: fmt(d.tourism?.trainedGuides || 0), label: 'प्रशिक्षित गाइड', sub: 'पर्यटन कार्यबल' },
          { value: fmt(d.tourism?.fairEmployment || 0), label: 'SHG संचालित स्टॉल', sub: 'पर्यटन रोज़गार' },
          { value: fmt(d.social?.ujjwalaBen || 0), label: 'Ujjwala लाभार्थी', sub: 'स्वच्छ ईंधन' },
          { value: fmt(d.economy?.shgWomen || 0), label: 'SHG में महिलाएं', sub: 'Women in self-help groups' },
          { value: fmt(d.social?.oldAgePensioners || 0), label: 'वृद्धावस्था पेंशन', sub: 'Social security' },
          { value: fmt(d.social?.urbanWidow || 0), label: 'विधवा पेंशन', sub: 'Urban widow support' },
        ],
        narrative: [n.sectorNarratives?.economy, n.sectorNarratives?.tourism].filter(Boolean).join(' '),
        aspirationKeywords: [...SECTOR_KEYWORDS.economy, ...SECTOR_KEYWORDS.tourism] as readonly string[],
      },
      {
        pageNo: '05', groupNo: '03', totalGroups: '04',
        titleHi: 'मूलभूत संरचना',
        titleEn: 'Core Infrastructure — जल, सड़क, विद्युत, स्वच्छता',
        band: 'group-teal',
        aspirationLabel: 'जल · सड़क · विद्युत · स्वच्छता',
        pageKey: 'core_infra',
        cards: [
          { value: fmtPct(d.water?.urbanFhtcAvg), label: 'FHTC (शहरी)', sub: 'AMRUT linkages' },
          { value: fmt(d.water?.overheadTanks || 0), label: 'OVERHEAD TANKS', sub: 'जल भंडारण' },
          { value: fmt(d.infrastructure?.publicToilets || 0), label: 'कार्यशील शौचालय', sub: 'सार्वजनिक सुविधाएं' },
          { value: fmt(d.infrastructure?.electricityHouses || 0), label: 'विद्युत कनेक्शन', sub: 'शहरी घर' },
          { value: fmt(d.infrastructure?.govtBanks || 0), label: 'सरकारी बैंक', sub: 'वित्तीय पहुंच' },
          { value: fmt(d.infrastructure?.privateBanks || 0), label: 'निजी बैंक', sub: 'वित्तीय पहुंच' },
          { value: fmtKm(d.infrastructure?.roadKm || 0), label: 'सड़क नेटवर्क', sub: 'किमी' },
          { value: fmt(d.infrastructure?.solarHomes || 0), label: 'सौर ऊर्जा घर', sub: 'नवीकरणीय ऊर्जा' },
          { value: fmtKm(d.infrastructure?.distRailwayStationKm || 0), label: 'रेलवे स्टेशन दूरी', sub: 'Avg distance' },
          { value: fmtKm(d.infrastructure?.distBusStandKm || 0), label: 'बस स्टैंड दूरी', sub: 'Avg distance' },
          { value: fmt(d.water?.roFacilities || 0), label: 'RO सुविधाएं', sub: 'Drinking water quality' },
        ],
        narrative: [n.sectorNarratives?.water, n.sectorNarratives?.infrastructure].filter(Boolean).join(' '),
        aspirationKeywords: [...SECTOR_KEYWORDS.water, ...SECTOR_KEYWORDS.infrastructure] as readonly string[],
      },
      {
        pageNo: '06', groupNo: '04', totalGroups: '04',
        titleHi: 'पर्यावरण एवं विरासत',
        titleEn: 'Environment & Heritage — पर्यावरण, शासन, ई-गवर्नेंस',
        band: 'group-brown',
        aspirationLabel: 'पर्यावरण · विरासत · शासन · निगरानी',
        pageKey: 'env_heritage',
        cards: [
          { value: fmt(d.environment?.housesWithoutToilets || 0), label: 'शौचालय रहित घर', sub: 'स्वच्छता अंतराल' },
          { value: fmt(d.environment?.govtCompostPits || 0), label: 'कॉम्पोस्ट पिट', sub: 'कचरा प्रबंधन' },
          { value: fmt(d.environment?.govtNurseries || 0), label: 'सरकारी नर्सरी', sub: 'हरित पहल' },
          { value: fmt(d.environment?.nurserySaplingsAvailable || 0), label: 'नर्सरी पौधे', sub: 'उपलब्ध पौधे' },
          { value: fmt(d.tourism?.heritageSites || 0), label: 'सांस्कृतिक स्थल', sub: 'पर्यटन संसाधन' },
          { value: fmt(d.tourism?.avgFairFootfallDaily || d.tourism?.dailyFootfall || 0), label: 'मेले में आगंतुक/दिन', sub: 'पर्यटन प्रवाह' },
          { value: fmtKm(d.governance?.distEmitraKm || d.governance?.urbanEmitraKm || 0), label: 'ई-मित्र दूरी', sub: 'डिजिटल पहुंच' },
          { value: fmtKm(d.governance?.distPoliceKm || d.governance?.urbanPoliceKm || 0), label: 'थाना दूरी', sub: 'सुरक्षा पहुंच' },
          { value: fmt(d.environment?.suryaGharHomes || 0), label: 'PM Surya Ghar', sub: 'Solar homes' },
          { value: fmt(d.tourism?.trainedGuides || 0), label: 'प्रशिक्षित गाइड', sub: 'Tourism workforce' },
          { value: fmt(d.environment?.forestHa || 0), label: 'वन क्षेत्र (हे.)', sub: 'Forest area' },
          { value: fmt(d.tourism?.localProductStalls || 0), label: 'स्थानीय उत्पाद स्टॉल', sub: 'Fair product stalls' },
        ],
        narrative: [n.sectorNarratives?.environment, n.sectorNarratives?.governance, n.sectorNarratives?.tourism].filter(Boolean).join(' '),
        aspirationKeywords: [...SECTOR_KEYWORDS.environment, ...SECTOR_KEYWORDS.governance, ...SECTOR_KEYWORDS.tourism] as readonly string[],
      },
    ];

    const totalPages = sectorPages.length + 3;

    const thematicPages = sectorPages.map((page) => {
      const dynamicPageNo = `${page.pageNo} / ${String(totalPages).padStart(2, '0')}`;
      const aspirations = getAspirationsForSector(d.aspirations || [], page.aspirationKeywords, isDistrict ? Infinity : 8, page.pageKey);
      const cardsHtml = page.cards.map((card) => metricCard(card.value, card.label, card.sub)).join('');
      const rowsHtml = renderAspirationRows(aspirations, scopeLevel === 'gp' || scopeLevel === 'ward' || isDistrict);

      return pageShell(`
        ${pageHeader(`${page.pageNo} / ${totalPages}`, page.titleHi, page.titleEn, `PAGE ${dynamicPageNo} · ${page.titleHi}`)}

        <div class="group-band ${page.band}">
          <div class="group-band-left">
            <div class="group-band-kicker">विषयगत समूह ${page.groupNo} / ${page.totalGroups}</div>
            <div class="group-band-number">${page.groupNo}</div>
          </div>
          <div class="group-band-body">
            <div class="group-band-title">${escapeHtml(page.titleHi)}</div>
            <div class="group-band-subtitle">${escapeHtml(page.titleEn)}</div>
          </div>
        </div>

        <div class="group-section-head">
          <div class="section-kicker">वर्तमान स्थिति · BASELINE</div>
        </div>

        <div class="kpi-grid-4x2">${cardsHtml}</div>

        <div class="asp-head">
          <div class="section-kicker">सामुदायिक आकांक्षाएँ · COMMUNITY ASPIRATIONS</div>
        </div>

        <table class="aspirations-table">
          <thead>
            <tr>
              <th>आकांक्षा</th>
              <th>प्राथमिकता</th>
              ${scopeLevel !== 'gp' && scopeLevel !== 'ward' && !isDistrict ? '<th>ग्रा.प./वार्ड</th>' : ''}
              <th>2030 तक</th>
              <th>2030-35</th>
              <th>2035-47</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>

      `, 'thematic-page');
    }).join('');

    const eligibleAspirations = getEligibleAspirations(d.aspirations || []);

    const sectorCounts: Record<string, number> = {};
    eligibleAspirations.forEach((a: any) => {
      const s = a.sector || 'अन्य';
      sectorCounts[s] = (sectorCounts[s] || 0) + 1;
    });
    const topSectors = Object.entries(sectorCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([sector]) => sector);

    const strategicRows = topSectors.map(sector => {
      const sectorAsps = eligibleAspirations.filter((a: any) => a.sector === sector);
      const funded = sectorAsps.filter((a: any) => a.status === 'FUNDED');
      const accepted = sectorAsps.filter((a: any) => a.status === 'ACCEPT');
      const qty2030 = sectorAsps.reduce((sum: number, a: any) => sum + (Number(a.qty_2030) || 0), 0);
      const qty2035 = sectorAsps.reduce((sum: number, a: any) => sum + (Number(a.qty_2035) || 0), 0);
      const qty2047 = sectorAsps.reduce((sum: number, a: any) => sum + (Number(a.qty_2047) || 0), 0);
      const topItem = sectorAsps[0]?.item || sector;
      const reviewCount = sectorAsps.filter((a: any) => a.status === 'REVIEW').length;
      const fastTrackCount = sectorAsps.filter((a: any) => a.fast_track).length;
      const topScheme = sectorAsps.find((a: any) => a.scheme)?.scheme || null;

      const phase2 = qty2035 > 0
        ? `${qty2035} आकांक्षाएं · ${topScheme || 'विस्तार चरण'}`
        : reviewCount > 0
          ? `${reviewCount} under review`
          : topScheme
            ? `${topScheme}`
            : `${accepted.length} accepted`;

      return {
        indicator: sector,
        current: `${sectorAsps.length} आकांक्षाएं`,
        phase1: qty2030 > 0 ? `${fmt(qty2030)} आकांक्षाएं · 2030 तक` : `${accepted.length} स्वीकृत आकांक्षाएं`,
        phase2,
        phase2047: qty2047 > 0 ? `${fmt(qty2047)} आकांक्षाएं · ${topItem}` : `पूर्ण कवरेज`,
      };
    });

    if (strategicRows.length === 0) {
      strategicRows.push({
        indicator: 'आकांक्षा डेटा',
        current: 'उपलब्ध नहीं',
        phase1: '—', phase2: '—', phase2047: '—',
      });
    }

    const schemeMap: Record<string, Set<string>> = {};
    eligibleAspirations.forEach((a: any) => {
      if (!a.scheme) return;
      const sector = a.sector || 'अन्य';
      if (!schemeMap[sector]) schemeMap[sector] = new Set();
      schemeMap[sector].add(a.scheme);
    });

    const schemeRows = Object.entries(schemeMap)
      .map(([sector, schemesSet]) => {
        const schemes = Array.from(schemesSet).slice(0, 2).join(' / ');
        const sectorAsps = eligibleAspirations.filter((a: any) => a.sector === sector);
        const funded = sectorAsps.filter((a: any) => a.status === 'FUNDED').length;
        const fastTrack = sectorAsps.filter((a: any) => a.fast_track).length;
        const statusLabel = 'नियोजन चरण';
        const opportunity = `${sectorAsps.length} aspirations`;
        return [sector, schemes || '—', opportunity, statusLabel];
      });

    if (schemeRows.length === 0) {
      schemeRows.push(['डेटा उपलब्ध नहीं', '—', '—', 'अवधारणा स्तर']);
    }

    

    const strategicPageNo = `${totalPages} / ${totalPages}`;
    const strategicPage = pageShell(`
      ${pageHeader(strategicPageNo, `रणनीतिक विकास ढाँचा · ${scopeMasterLabel}`, 'Strategic Development Framework - Viksit Rajasthan 2047', `PAGE ${strategicPageNo} · रणनीतिक विकास ढाँचा`)}
      <div class="section-kicker">खंड 07</div>
      <h2 class="section-title">रणनीतिक विकास ढाँचा</h2>
      <div class="section-subtitle">Strategic Development Framework</div>

      <table class="strategic-table">
        <thead>
          <tr>
            <th>संकेतक</th>
            <th>वर्तमान आधार</th>
            <th>2030 तक · चरण-1</th>
            <th>2030-35 · चरण-2</th>
            <th>2047 तक · विकसित स्तर</th>
          </tr>
        </thead>
        <tbody>
          ${strategicRows.map((row) => `
            <tr>
              <td>${escapeHtml(row.indicator)}</td>
              <td>${escapeHtml(row.current)}</td>
              <td>${escapeHtml(row.phase1)}</td>
              <td>${escapeHtml(row.phase2)}</td>
              <td>${escapeHtml(row.phase2047)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="scheme-map-head">
        <div class="section-kicker">योजना अभिसरण · SCHEME CONVERGENCE MAP</div>
        <div class="section-note">status legend: सक्रिय | योजना-तैयार | स्थल चयनित | प्रस्ताव स्तर | अवधारणा स्तर</div>
      </div>
      <table class="scheme-table">
        <thead>
          <tr>
            <th>क्षेत्र</th>
            <th>प्राथमिक योजना</th>
            <th>अभिसरण अवसर</th>
            <th>स्थिति</th>
          </tr>
        </thead>
        <tbody>
          ${schemeRows.map(([area, plan, opportunity, status]) => `
            <tr>
              <td>${escapeHtml(area)}</td>
              <td>${escapeHtml(plan)}</td>
              <td>${escapeHtml(opportunity)}</td>
              <td><span class="status-badge ${String(status) === 'सक्रिय' ? 'active' : String(status) === 'योजना-तैयार' ? 'ready' : String(status) === 'स्थल चयनित' ? 'selected' : String(status) === 'प्रस्ताव स्तर' ? 'proposal' : 'concept'}">${escapeHtml(status)}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="bottom-note-box">
        These data points are entered by the Gram Panchayat/Shahari Ward level functionaries and the analysis report is based on the entered data. The aspirations captured in this are reported at the GP/Shahari Ward levels are to serve as pointers for stakeholders at the Block/ULB/District level to plan things accordingly.
      </div>

      <div class="footer-line">Govt of Rajasthan · ${escapeHtml(reportDateLabel)}</div>
    `, 'strategic-page');

    console.log('[Report Pages] cover:', !!coverPage, 'demographic:', !!demographicPage, 'thematic:', thematicPages.length, 'strategic:', !!strategicPage);

    const reportHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(district)} — Viksit Rajasthan 2047</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700;800&display=swap');
  :root {
    --report-bg: #ffffff;
    --report-navy: #1a2744;
    --report-orange: #e85d04;
    --report-blue: #1e3a5f;
    --report-rust: #7c3a1e;
    --report-teal: #1a4a3a;
    --report-brown: #5c3a1a;
    --report-text: #1a1a2e;
    --report-muted: #64748b;
    --report-border: #e2e8f0;
    --report-card-bg: #f8fafc;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: #f1f5f9; color: var(--report-text); font-family: sans-serif; }
  .report-page {
    width: 794px;
    min-height: 1123px;
    margin: 0 auto 32px;
    background: white;
    padding: 40px 48px;
    border: 1px solid var(--report-border);
    box-shadow: 0 4px 24px rgba(0,0,0,0.08);
    position: relative;
    break-after: page;
    page-break-after: always;
  }
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--report-border);
    margin-bottom: 24px;
    font-size: 10px;
    color: var(--report-muted);
    font-weight: 600;
    letter-spacing: 0.05em;
  }
  .page-header-left { display: flex; align-items: center; gap: 12px; }
  .vr-logo {
    width: 32px; height: 32px; background: var(--report-navy); border-radius: 6px; color: white; display: grid; place-items: center; font-weight: 900; font-size: 11px; font-style: italic;
  }
  .page-header-right { text-align: right; line-height: 1.4; }
  .cover-kicker {
    color: var(--report-orange);
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin: 18px 0 18px;
    font-family: sans-serif;
  }
  .cover-district {
    margin: 0;
    color: var(--report-navy);
    font-size: 72px;
    line-height: 0.92;
    font-weight: 900;
    font-family: 'Noto Sans Devanagari', sans-serif;
  }
  .cover-district span { display: block; font-size: 54px; color: var(--report-navy); margin-top: 8px; }
  .cover-subtitle {
    margin-top: 14px;
    color: #334155;
    font-size: 18px;
    font-weight: 600;
    font-family: sans-serif;
  }
  .pill-row { display: flex; flex-wrap: wrap; gap: 10px; margin: 22px 0 24px; }
  .kpi-pill {
    min-width: 148px;
    background: var(--report-card-bg);
    border: 1px solid var(--report-border);
    border-radius: 10px;
    padding: 12px 14px;
  }
  .kpi-pill-label { font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--report-muted); font-weight: 700; }
  .kpi-pill-value { margin-top: 4px; font-size: 20px; font-weight: 800; color: var(--report-navy); line-height: 1.1; }
  .kpi-pill-sub { margin-top: 2px; font-size: 10px; color: #94a3b8; font-family: sans-serif; }
  .featured-box { background: var(--report-navy); color: white; border-radius: 16px; padding: 20px 22px 16px; margin: 12px 0 18px; overflow: visible; }
  .featured-title { color: var(--report-orange); font-size: 12px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 14px; }
  .featured-body { font-family: 'Noto Sans Devanagari', sans-serif; font-size: 14px; line-height: 1.85; color: #e2e8f0; }
  .featured-body p { margin: 0 0 12px; }
  .featured-caption { margin-top: 10px; color: #94a3b8; font-size: 10px; font-family: sans-serif; }
  .cover-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 18px; }
  .stat-card { background: #f8fafc; border: 1px solid var(--report-border); border-left: 4px solid; border-radius: 12px; padding: 16px; min-height: 120px; }
  .stat-card-title { font-size: 12px; color: var(--report-muted); letter-spacing: 0.04em; text-transform: uppercase; font-weight: 800; }
  .stat-card-value { margin-top: 12px; font-size: 24px; font-weight: 900; color: var(--report-navy); line-height: 1.15; font-family: sans-serif; }
  .stat-card-note { margin-top: 6px; color: #475569; font-size: 12px; line-height: 1.6; font-family: 'Noto Sans Devanagari', sans-serif; }
  .footer-line { margin-top: 18px; color: #64748b; font-size: 11px; border-top: 1px solid var(--report-border); padding-top: 12px; font-family: sans-serif; }
  .section-kicker { color: var(--report-orange); font-size: 12px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; margin: 4px 0 8px; }
  .section-title { margin: 0; font-size: 30px; line-height: 1.08; color: var(--report-navy); font-weight: 900; font-family: 'Noto Sans Devanagari', sans-serif; }
  .section-subtitle { color: var(--report-muted); font-size: 13px; margin-top: 6px; font-weight: 600; font-family: sans-serif; }
  .section-copy { color: #334155; font-size: 14px; line-height: 1.85; margin-top: 14px; font-family: 'Noto Sans Devanagari', sans-serif; }
  .kpi-grid-5 { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; margin: 18px 0 18px; }
  .kpi-grid-5 .kpi-pill { min-width: 0; width: 100%; padding: 10px 8px; overflow: visible; }
  .kpi-grid-5 .kpi-pill-value { font-size: 15px; overflow: visible; text-overflow: unset; white-space: normal; word-break: break-word; line-height: 1.3; }
  .kpi-grid-5 .kpi-pill-sub { overflow: visible; text-overflow: unset; white-space: normal; word-break: break-word; font-size: 9px; }
  .kpi-grid-4x2 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 16px; }
  .metric-card { background: var(--report-card-bg); border: 1px solid var(--report-border); border-radius: 10px; padding: 14px 12px; min-height: 112px; overflow: hidden; }
  .metric-value { font-size: 23px; font-weight: 900; color: var(--report-navy); line-height: 1.1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
  .metric-value.wrap { white-space: normal; font-size: 18px; }
  .metric-label { margin-top: 8px; font-size: 11px; color: var(--report-muted); font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .metric-sub { margin-top: 3px; font-size: 10px; color: #94a3b8; }
  .two-col { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-top: 18px; align-items: start; }
  .one-col { display: grid; grid-template-columns: 1fr; gap: 14px; margin-top: 18px; }
  .two-col.single-col { grid-template-columns: 1fr; }
  .two-col.single-col .info-panel { max-width: 600px; }
  .info-panel { border: 1px solid var(--report-border); border-radius: 12px; background: #fff; padding: 16px; }
  .panel-title { font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--report-orange); font-weight: 800; margin-bottom: 12px; }
  .info-row { display: flex; justify-content: space-between; gap: 16px; padding: 7px 0; border-bottom: 1px solid #f1f5f9; font-size: 12px; min-height: 28px; align-items: center; }
  .info-row:last-child { border-bottom: none; }
  .info-row span:first-child { color: #64748b; font-family: 'Noto Sans Devanagari', sans-serif; flex: 1; min-width: 0; word-break: break-word; }
  .info-row span:last-child { color: #1a1a2e; font-weight: 700; font-family: sans-serif; text-align: right; flex-shrink: 0; white-space: nowrap; }
  .metrics-row { align-items: start; }
  .bottom-note-box { margin-top: 18px; background: #f8fafc; border-left: 4px solid var(--report-orange); border-radius: 12px; padding: 14px 16px; color: #334155; font-size: 13px; line-height: 1.8; font-family: 'Noto Sans Devanagari', sans-serif; }
  .group-band {
    margin: 16px -48px 22px;
    padding: 24px 28px 20px;
    color: white;
    display: grid;
    grid-template-columns: 140px 1fr;
    gap: 20px;
    align-items: end;
    overflow: visible;
  }
  .group-blue { background: #1e3a5f; }
  .group-rust { background: #7c3a1e; }
  .group-teal { background: #1a4a3a; }
  .group-brown { background: #5c3a1a; }
  .group-band-kicker { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.8; }
  .group-band-number { font-size: 58px; line-height: 0.9; font-weight: 900; margin-top: 8px; }
  .group-band-title { font-size: 30px; line-height: 1.05; font-weight: 900; font-family: 'Noto Sans Devanagari', sans-serif; }
  .group-band-subtitle { margin-top: 4px; font-size: 14px; opacity: 0.92; font-family: sans-serif; }
  .group-band-asp { margin-top: 10px; font-size: 13px; opacity: 0.92; line-height: 1.7; font-family: 'Noto Sans Devanagari', sans-serif; }
  .group-sector-strip { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
  .group-sector-chip { display: inline-flex; align-items: center; border-radius: 999px; padding: 4px 10px; background: rgba(255,255,255,0.14); color: #fff; font-size: 10px; font-weight: 800; letter-spacing: 0.04em; font-family: sans-serif; }
  .group-section-head, .asp-head, .scheme-map-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: 8px; }
  .section-note { color: var(--report-muted); font-size: 12px; font-weight: 600; font-family: sans-serif; text-align: right; }
  .aspirations-table, .strategic-table, .scheme-table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 12px; }
  .aspirations-table th, .strategic-table th, .scheme-table th { background: #f1f5f9; color: var(--report-muted); text-align: left; padding: 10px 10px; font-size: 11px; letter-spacing: 0.04em; text-transform: uppercase; border-bottom: 2px solid var(--report-border); }
  .aspirations-table td, .strategic-table td, .scheme-table td { border-bottom: 1px solid var(--report-border); padding: 10px; vertical-align: top; font-family: 'Noto Sans Devanagari', sans-serif; }
  .priority-badge { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 50%; font-size: 11px; font-weight: 900; font-family: sans-serif; }
  .priority-badge.p1 { background: var(--report-orange); color: white; }
  .priority-badge.p2 { border: 2px solid var(--report-orange); color: var(--report-orange); background: transparent; }
  .scheme-tag { display: inline-block; background: #1e293b; color: #94a3b8; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; font-family: sans-serif; margin: 2px 2px 2px 0; }
  .summary-box { background: #0f1f3d; border-radius: 12px; padding: 16px 18px; display: flex; gap: 14px; align-items: flex-start; margin-top: 16px; }
  .summary-box-arrow { width: 34px; height: 34px; border-radius: 50%; background: var(--report-orange); color: white; display: grid; place-items: center; font-size: 18px; flex: 0 0 auto; margin-top: 2px; }
  .summary-box-text { color: #e2e8f0; font-size: 13px; line-height: 1.7; font-family: 'Noto Sans Devanagari', sans-serif; }
  .master-summary { margin-top: 18px; background: var(--report-navy); border-radius: 14px; overflow: hidden; }
  .master-summary-head { padding: 12px 16px; background: var(--report-orange); color: white; font-weight: 800; font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; }
  .master-summary-body { padding: 16px; color: #e2e8f0; line-height: 1.8; font-size: 13px; font-family: 'Noto Sans Devanagari', sans-serif; }
  .status-badge { display: inline-flex; align-items: center; border-radius: 999px; padding: 4px 10px; font-size: 10px; font-weight: 800; font-family: sans-serif; }
  .status-badge.active { background: #dcfce7; color: #166534; }
  .status-badge.ready { background: #fef3c7; color: #92400e; }
  .status-badge.selected { background: #dbeafe; color: #1d4ed8; }
  .status-badge.proposal { background: #e5e7eb; color: #374151; }
  .status-badge.concept { background: #f3f4f6; color: #6b7280; }
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            width: 100% !important;
            overflow: visible !important;
          }

          /* Each report-page section = one PDF page */
          .report-page {
            width: 100% !important;
            min-height: unset !important;
            max-height: unset !important;
            overflow: visible !important;
            /* Remove forced margin between pages — let content flow */
            margin: 0 0 24px 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            /* No forced page break — let browser decide when page is full */
            page-break-after: auto !important;
            break-after: auto !important;
            page-break-inside: auto !important;
            break-inside: auto !important;
            display: block !important;
          }

          .report-page:last-child {
            margin-bottom: 0 !important;
          }

          /* Only force a page break BEFORE specific pages — cover always starts fresh */
          .report-page.cover-page {
            page-break-before: auto !important;
            break-before: auto !important;
          }

          /* Each thematic group starts on a new page */
          .report-page.thematic-page {
            page-break-before: always !important;
            break-before: always !important;
          }

          /* Strategic page starts on a new page */
          .report-page.strategic-page {
            page-break-before: always !important;
            break-before: always !important;
          }

          /* Allow tables and grids to break across printed pages if needed */
          .aspirations-table,
          .strategic-table,
          .scheme-table {
            page-break-inside: auto !important;
            break-inside: auto !important;
          }

          /* Keep individual table rows together */
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          /* Keep these compact elements from splitting */
          .kpi-pill,
          .metric-card,
          .stat-card,
          .info-panel,
          .featured-box,
          .summary-box,
          .bottom-note-box,
          .master-summary,
          .group-band,
          .kpi-grid-4x2,
          .kpi-grid-5,
          .cover-grid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          /* Keep page header with its content */
          .page-header {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }

          /* Keep group band header with its metric cards */
          .group-band {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }

          /* Fix group band negative margins in print — they cause left-side clipping */
          .group-band {
            margin: 16px 0 22px 0 !important;
            padding: 20px 24px 18px !important;
            width: 100% !important;
            box-sizing: border-box !important;
            display: grid !important;
            grid-template-columns: 100px 1fr !important;
            gap: 16px !important;
            overflow: visible !important;
          }

          .group-band-number {
            font-size: 48px !important;
            line-height: 1 !important;
            overflow: visible !important;
            white-space: nowrap !important;
          }

          .group-band-left {
            overflow: visible !important;
            min-width: 0 !important;
          }

          .group-band-body {
            overflow: visible !important;
            min-width: 0 !important;
          }

          .group-band-title {
            font-size: 26px !important;
            line-height: 1.1 !important;
          }

          /* Keep section heading with at least first row of content below */
          .group-section-head,
          .asp-head {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }

          /* Force background colors to print */
          .group-blue { background: #1e3a5f !important; color: white !important; }
          .group-rust { background: #7c3a1e !important; color: white !important; }
          .group-teal { background: #1a4a3a !important; color: white !important; }
          .group-brown { background: #5c3a1a !important; color: white !important; }
          .featured-box { background: #1a2744 !important; color: white !important; }
          .summary-box { background: #0f1f3d !important; color: white !important; }
          .master-summary { background: #1a2744 !important; color: white !important; }
          .master-summary-head { background: #e85d04 !important; color: white !important; }
          .vr-logo { background: #1a2744 !important; color: white !important; }
          .priority-badge.p1 { background: #e85d04 !important; color: white !important; }
          .priority-badge.p2 { border: 2px solid #e85d04 !important; color: #e85d04 !important; background: transparent !important; }
          .scheme-tag { background: #1e293b !important; color: #94a3b8 !important; }
          .status-badge.active { background: #dcfce7 !important; color: #166534 !important; }
          .status-badge.ready { background: #fef3c7 !important; color: #92400e !important; }
          .status-badge.selected { background: #dbeafe !important; color: #1d4ed8 !important; }
          .status-badge.proposal { background: #e5e7eb !important; color: #374151 !important; }
          .cover-kicker { color: #e85d04 !important; }
          .section-kicker { color: #e85d04 !important; }
          .panel-title { color: #e85d04 !important; }
          .group-band-number { color: white !important; }
          .group-band-title { color: white !important; }
          .group-band-subtitle { color: white !important; }
          .group-sector-chip { background: rgba(255,255,255,0.14) !important; color: white !important; }
        }
</style>
</head>
<body>

${coverPage}
${demographicPage}
${thematicPages}
${strategicPage}
</body>
</html>`;

    return reportHtml;
  }

  // STEP 4 — Render the report in a new tab
  function renderReport(scope: any, data: any, narrative: any) {
    const reportHtml = buildAlwarPdfReportHtml(scope, data, narrative);
    setGeneratedHtml(reportHtml);

    try {
      const areaType = scope.type === 'urban' ? 'Urban' : scope.type === 'district' ? 'District' : 'Rural';
      const districtVal = scope.district || null;
      // Build a clean human-readable name
      const locationParts: string[] = [];
      if (districtVal) locationParts.push(districtVal);
      if (scope.block) locationParts.push(scope.block);
      if (scope.gpName) locationParts.push(scope.gpName);
      if (scope.ulb) locationParts.push(scope.ulb);
      if (scope.wardName) locationParts.push(scope.wardName);

      // Determine scope level label
      const scopeLevelLabel = scope.wardName ? 'Ward Report'
        : scope.gpName ? 'GP Report'
          : scope.ulb ? 'ULB Report'
            : scope.block ? 'Block Report'
              : 'District Report';

      const reportName = `${locationParts.join(' › ')} — ${scopeLevelLabel} (${areaType})`;

      const scopeType = scope.type === 'district' ? 'district'
        : scope.wardName ? 'ward'
          : scope.gpName ? 'gp'
            : scope.ulb ? 'ulb'
              : scope.block ? 'block'
                : 'district';

      void (async () => {
        try {
          const { error: saveError } = await supabase.from('generated_reports').insert({
            report_name: reportName,
            scope_label: reportName,
            scope_type: scopeType,
            district: districtVal,
            block_name: scope.block || null,
            gp_name: scope.gpName || null,
            ulb_name: scope.ulb || null,
            ward_name: scope.wardName || null,
            area_type: areaType,
            html_content: reportHtml,
            created_by: typeof window !== 'undefined' ? (sessionStorage.getItem('username') || 'user') : 'user',
            file_size_kb: Math.round(reportHtml.length / 1024),
          });

          if (saveError) {
            console.warn('[Report Save] Supabase insert failed:', saveError.message);
          } else {
            console.log('[Report Save] Saved successfully:', reportName);
            loadReportHistory();
          }
        } catch (saveErr) {
          console.warn('[Report Save] Could not save report to history:', saveErr);
        }
      })();
    } catch (saveErr) {
      console.warn('Could not save report to history:', saveErr);
    }

    return;
    console.log('✅ renderReport v2 called — new code is active', scope);
    const d = data;
    const n = narrative;
    const scopeType = d.scopeType || scope.type;
    const isRural = scopeType === 'rural';
    const isUrban = scopeType === 'urban';

    const titleLine1 = scope.gpName || scope.wardName || scope.ulb || scope.block || scope.district;
    const titleLine2 = isRural
      ? (scope.gpName ? 'Gram Panchayat' : scope.block ? 'Block' : 'District')
      : (scope.wardName ? 'Urban Ward' : scope.ulb ? 'ULB' : 'District (Urban)');

    const coverTitle = isRural
      ? (d.meta.gpName || d.meta.block || d.meta.district)
      : (d.meta.wardName || d.meta.ulb || d.meta.district);

    const coverSubtitle = isRural
      ? (d.meta.gpName ? 'Gram Panchayat' : d.meta.block ? 'Block' : 'District')
      : (d.meta.wardName ? 'Urban Ward' : d.meta.ulb ? 'ULB' : 'District (Urban)');

    const coverDesc = isRural
      ? `${d.meta.gpName ? `GP ${d.meta.gpName}, ` : ''}${d.meta.block ? `${d.meta.block} Block, ` : ''}${d.meta.district} District — ${d.meta.gpCount} GP${d.meta.gpCount > 1 ? 's' : ''} ki baseline data se taiyaar planning intelligence brief`
      : `${d.meta.wardName ? `${d.meta.wardName}, ` : ''}${d.meta.ulb ? `${d.meta.ulb} ULB, ` : ''}${d.meta.district} District — ${d.meta.wardCount} ward${d.meta.wardCount > 1 ? 's' : ''} ki urban baseline data se taiyaar planning intelligence brief`;

    const SECTOR_VISIBILITY = {
      water: { rural: true, urban: true },
      agriculture: { rural: true, urban: false },
      dairy: { rural: true, urban: false },
      health: { rural: true, urban: true },
      education: { rural: true, urban: true },
      socialWelfare: { rural: true, urban: true },
      economy: { rural: true, urban: true },
      infrastructure: { rural: true, urban: true },
      environment: { rural: true, urban: true },
      tourism: { rural: true, urban: true },
      governance: { rural: true, urban: true },
    } as const;

    const formatValue = (value: any) => {
      if (value === null || value === undefined || value === '') return '—';
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric.toLocaleString() : String(value);
    };

    const formatDecimal = (value: any, digits = 1) => {
      if (value === null || value === undefined || value === '') return '—';
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric.toFixed(digits) : String(value);
    };

    const zeroNote = (value: any) => Number(value) === 0 && value !== '' && value !== null && value !== undefined
      ? '<div class="sm-note">(recorded as 0)</div>'
      : '';

    const metric = (label: string, value: any, formatter: (input: any) => string = formatValue) => `
      <div class="sm">
        <div class="sm-value">${formatter(value)}</div>
        <div class="sm-label">${label}</div>
        ${zeroNote(value)}
      </div>
    `;

    const profileRows = isRural
      ? [
        { label: 'Total Gram Panchayats', value: d.meta.gpCount },
        { label: 'Blocks', value: d.meta.blockCount },
        { label: 'Population (Rural est. 2026)', value: `${(d.population.total / 100000).toFixed(2)} Lakh` },
        { label: 'Male / Female', value: `${d.population.male.toLocaleString()} / ${d.population.female.toLocaleString()}` },
        { label: 'Total Families', value: d.population.totalFamilies.toLocaleString() },
        { label: 'BPL Families', value: d.population.bplFamilies.toLocaleString() },
        { label: 'Pucca Houses', value: d.population.puccaHouses.toLocaleString() },
        { label: 'Kutcha Houses', value: d.population.kutchaHouses.toLocaleString() },
        { label: 'Senior Citizens (60+)', value: d.population.seniors.toLocaleString() },
        { label: 'PwD Population', value: d.population.pwd.toLocaleString() },
        { label: 'Children (0-6)', value: d.population.children06.toLocaleString() },
        { label: 'Children (6-14)', value: d.population.children614.toLocaleString() },
      ]
      : [
        { label: 'Total Urban Wards', value: d.meta.wardCount },
        { label: 'ULBs', value: d.meta.ulbs?.join(', ') || '—' },
        { label: 'Population (Urban est. 2026)', value: `${(d.population.urbanPop / 100000).toFixed(2)} Lakh` },
        { label: 'Male / Female', value: `${d.population.male.toLocaleString()} / ${d.population.female.toLocaleString()}` },
        { label: 'Total Area (Hectares)', value: d.population.totalAreaHectare?.toLocaleString() || '—' },
        { label: 'Pucca Houses', value: d.population.puccaHouses.toLocaleString() },
        { label: 'Kutcha Houses', value: d.population.kutchaHouses.toLocaleString() },
        { label: 'Senior Citizens (60+)', value: d.population.seniors.toLocaleString() },
        { label: 'PwD Population', value: d.population.pwd.toLocaleString() },
        { label: 'Children (0-6)', value: d.population.children06.toLocaleString() },
      ];

    const renderProfile = (title: string, rows: Array<{ label: string; value: any }>) => `
      <div class="profile-card">
        <div class="pc-title">${title}</div>
        ${rows.map((row) => `<div class="pc-row"><span class="pc-key">${row.label}</span><span class="pc-val">${row.value}</span></div>`).join('')}
      </div>
    `;

    const renderSector = (args: {
      key: keyof typeof SECTOR_VISIBILITY;
      className?: string;
      title: string;
      badge: string;
      metrics: Array<{ label: string; value: any; formatter?: (input: any) => string }>;
      narrativeText?: string;
      pendingText?: string;
    }) => {
      const enabled = isRural ? SECTOR_VISIBILITY[args.key].rural : SECTOR_VISIBILITY[args.key].urban;
      if (!enabled) return '';
      return `
        <div class="sector-section ${args.className || ''}">
          <div class="ss-header">
            <div class="ss-title">${args.title}</div>
            <div class="ss-badge ${args.pendingText ? 'pending-badge' : ''}">${args.badge}</div>
          </div>
          ${args.pendingText
          ? `<div class="ss-pending">${args.pendingText}</div>`
          : `
              <div class="ss-metrics">
                ${args.metrics.map((metricDef) => metric(metricDef.label, metricDef.value, metricDef.formatter)).join('')}
              </div>
              <div class="ss-narrative">${args.narrativeText || ''}</div>
            `}
        </div>
      `;
    };

    const educationValueFields = isRural
      ? [d.education.awcCenters, d.education.anganwadiEnrolledChildren, d.education.ashaWorkers, d.education.samChildren]
      : [
        d.education.govtSchools,
        d.education.pvtSchools,
        d.education.totalSchools,
        d.education.enrolledStudents,
        d.education.workingTeachers,
        d.education.sanctionedTeachers,
        d.education.dropouts,
        d.education.awcCenters,
        d.education.samChildren,
        d.education.snpRecipients672Months,
      ];
    const educationHasData = educationValueFields.some((value) => {
      if (value === null || value === undefined || value === '') return false;
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) return String(value).trim().length > 0;
      return numeric !== 0;
    });

    const coverStats = isRural
      ? [
        { value: `${d.meta.gpCount} GPs · ${d.meta.blockCount} Blocks`, label: 'Rural Coverage' },
        { value: `${d.agriculture.irrigationPct}%`, label: 'Irrigation Rate' },
        { value: `₹${d.dairy.annualDairyValueCr} Cr`, label: 'Annual Dairy Economy' },
        { value: `${Math.round((d.social.widowPensioners + d.social.urbanWidow) / 100000 * 10) / 10}L`, label: 'Widow Pension Recipients' },
      ]
      : [
        { value: `${d.meta.wardCount} Wards · ${d.meta.ulbCount} ULBs`, label: 'Urban Coverage' },
        { value: `${d.water.urbanFhtcAvg}%`, label: 'Urban FHTC' },
        { value: formatValue(d.education.totalSchools), label: 'Total Schools' },
        { value: formatValue(d.infrastructure.publicToilets), label: 'Public Toilets' },
      ];

    const coverStatsHtml = coverStats.map((stat) => `
      <div>
        <div class="cs-value">${stat.value}</div>
        <div class="cs-label">${stat.label}</div>
      </div>
    `).join('');

    const sectors: string[] = [];

    if (isRural) {
      sectors.push(renderSector({
        key: 'water',
        className: 'blue',
        title: '01 · Water & Sanitation',
        badge: 'JJM · AMRUT 2.0',
        metrics: [
          { label: 'FHTC Coverage (%)', value: d.water.ruralFhtcAvg, formatter: formatDecimal },
          { label: 'Overhead Tanks', value: d.water.overheadTanks },
          { label: 'Handpump/Tubewell Only Houses', value: d.water.handpumpTubewellOnlyHouses },
          { label: 'Avg Groundwater Depth (m)', value: d.water.groundwaterDepth, formatter: formatDecimal },
          { label: 'RO Facilities', value: d.water.roFacilities },
          { label: 'Tanker-Dependent Houses', value: d.water.tankerOnlySupplyHouses },
        ],
        narrativeText: n.sectorNarratives.water,
      }));

      sectors.push(renderSector({
        key: 'agriculture',
        className: 'green',
        title: '02 · Agriculture & Irrigation',
        badge: 'PMKSY · KCC · PM-Kisan',
        metrics: [
          { label: 'Cultivable Land (Ha)', value: d.agriculture.cultivableHa },
          { label: 'Irrigated Area (Ha)', value: d.agriculture.irrigatedHa },
          { label: 'Irrigation Rate (%)', value: d.agriculture.irrigationPct, formatter: formatDecimal },
          { label: 'Total Farmers', value: d.agriculture.totalFarmers },
          { label: 'KCC Holders', value: d.agriculture.kccHolders },
          { label: 'PM-Kisan Beneficiaries', value: d.agriculture.pmKisan },
          { label: 'FPOs', value: d.agriculture.fpos },
          { label: 'Solar Pumps', value: d.agriculture.solarPumps },
          { label: 'Crop Insurance Farmers', value: d.agriculture.cropInsurance },
        ],
        narrativeText: n.sectorNarratives.agriculture,
      }));

      sectors.push(renderSector({
        key: 'dairy',
        title: '03 · Dairy & Livestock',
        badge: 'SARAS · RCDF · NLM',
        metrics: [
          { label: 'Total Livestock', value: d.dairy.totalLivestock },
          { label: 'Milch Animals', value: d.dairy.milchAnimals },
          { label: 'Daily Milk Production (L)', value: d.dairy.dailyMilkLpd },
          { label: 'Annual Dairy Value (Rs Cr)', value: d.dairy.annualDairyValueCr },
          { label: 'Milk Collection Centers', value: d.dairy.milkCenters },
          { label: 'Goat Farms', value: d.dairy.goatFarms },
          { label: 'Poultry Farms', value: d.dairy.poultryFarms },
        ],
        narrativeText: n.sectorNarratives.dairy,
      }));
    }

    sectors.push(renderSector({
      key: 'health',
      className: 'orange',
      title: isRural ? '04 · Health & Nutrition' : '01 · Health & Nutrition',
      badge: 'NHM · POSHAN · Ayushman',
      metrics: isRural
        ? [
          { label: 'Allopathic Centers', value: d.health.allopathicCenters },
          { label: 'AYUSH Centers', value: d.health.ayushCenters },
          { label: 'Health Beds', value: d.health.healthBeds },
          { label: 'Working Health Staff', value: d.health.healthStaff },
          { label: 'Ayushman Beneficiaries', value: d.health.ayushmanBen },
          { label: 'TB Patients', value: d.health.tbPatients },
          { label: 'Anemic Pregnant Women', value: d.health.anemicPregnant },
          { label: 'AWC Centers', value: d.health.awcCenters },
          { label: 'ASHA Workers', value: d.health.ashaWorkers },
          { label: 'SAM Children', value: d.health.samChildren },
        ]
        : [
          { label: 'Allopathic Centers', value: d.health.allopathicCenters },
          { label: 'AYUSH Centers', value: d.health.ayushCenters },
          { label: 'Private Health Centers', value: d.health.privateHealthCenters || d.health.pvtHealthCenters },
          { label: 'Health Beds', value: d.health.urbanHealthBeds || d.health.healthBeds },
          { label: 'Working Health Staff', value: d.health.healthStaff },
          { label: 'Ayushman Beneficiaries', value: d.health.urbanAyushman || d.health.ayushmanBen },
          { label: 'TB Patients', value: d.health.tbPatients },
          { label: 'Anemic Pregnant Women', value: d.health.anemicPregnant },
          { label: 'Hypertension Screened (FY25-26)', value: d.health.hypertensionScreening2025_26 },
          { label: 'Diabetes Screened (FY25-26)', value: d.health.diabetesScreening2025_26 },
          { label: 'AWC Centers', value: d.health.awcCenters },
          { label: 'SAM Children', value: d.health.samChildren },
        ],
      narrativeText: n.sectorNarratives.health,
    }));

    if (isRural) {
      sectors.push(renderSector({
        key: 'education',
        className: 'pending',
        title: '05 · Education & Skills',
        badge: 'Data Pending',
        metrics: [],
        pendingText: 'Education baseline data (schools, teachers, enrollment) not yet loaded in CDO baseline. AWC and ASHA data available under Health & Nutrition sector above.',
      }));
    } else {
      sectors.push(renderSector(educationHasData ? {
        key: 'education',
        className: 'blue',
        title: '03 · Education & Skills',
        badge: 'Schools · Teachers · ICDS',
        metrics: [
          { label: 'Govt Schools', value: d.education.govtSchools },
          { label: 'Private Schools', value: d.education.pvtSchools },
          { label: 'Total Schools', value: d.education.totalSchools },
          { label: 'Total Enrolled Students', value: d.education.enrolledStudents },
          { label: 'Working Teachers', value: d.education.workingTeachers },
          { label: 'Sanctioned Teachers', value: d.education.sanctionedTeachers },
          { label: 'Dropout Children (Prev Year)', value: d.education.dropouts },
          { label: 'AWC Centers', value: d.education.awcCenters },
          { label: 'SAM Children', value: d.education.samChildren },
          { label: 'SNP Recipients (6-72 months)', value: d.education.snpRecipients672Months },
        ],
        narrativeText: `Urban school baseline is available across ${formatValue(d.education.totalSchools)} schools, ${formatValue(d.education.workingTeachers)} working teachers, and ${formatValue(d.education.enrolledStudents)} enrolled students.`,
      } : {
        key: 'education',
        className: 'pending',
        title: '03 · Education & Skills',
        badge: 'Data Pending',
        metrics: [],
        pendingText: 'Data not yet loaded in CDO baseline',
      }));
    }

    sectors.push(renderSector({
      key: 'socialWelfare',
      className: 'purple',
      title: isRural ? '06 · Social Welfare & Housing' : '04 · Social Welfare & Housing',
      badge: 'PM Awas · Ujjwala · Pension',
      metrics: [
        { label: 'Old Age Pensioners', value: d.social.oldAgePensioners },
        { label: 'Widow Pensioners', value: isRural ? d.social.widowPensioners : d.social.urbanWidow },
        { label: 'PwD Pensioners', value: d.social.pwdPensioners },
        { label: 'PM Ujjwala Beneficiaries', value: d.social.ujjwalaBen },
        { label: 'PM/CM Awas Beneficiaries', value: isRural ? d.social.awasBen : d.social.urbanAwas },
      ],
      narrativeText: n.sectorNarratives.socialWelfare,
    }));

    sectors.push(renderSector({
      key: 'economy',
      className: isRural ? 'amber' : 'amber',
      title: isRural ? '07 · Economy & SHGs' : '05 · Economy & Industry',
      badge: isRural ? 'SRLM · MUDRA · NRLM' : 'SRLM · Industry · MSME',
      metrics: isRural
        ? [
          { label: 'Active SHGs', value: d.economy.activeShgs },
          { label: 'Women in SHGs', value: d.economy.shgWomen },
          { label: 'Lakhpati Didis', value: d.economy.lakhpatiDidis },
          { label: 'Millionaire Didis', value: d.economy.millionaireDidis },
          { label: 'Mudra Loan Beneficiaries', value: d.economy.mudraLoan },
          { label: 'Local Artisans', value: d.economy.artisans },
        ]
        : [
          { label: 'Active SHGs', value: d.economy.activeShgs },
          { label: 'Local Artisans', value: d.economy.artisans },
          { label: 'Large Industrial Units', value: d.economy.urbanIndustries ? d.economy.urbanIndustries : d.economy.largeIndustrialUnits },
          { label: 'Small Scale Industries', value: d.economy.smallScaleIndustries },
        ],
      narrativeText: n.sectorNarratives.economy,
    }));

    sectors.push(renderSector({
      key: 'infrastructure',
      title: isRural ? '08 · Infrastructure & Connectivity' : '06 · Infrastructure & Connectivity',
      badge: 'PMGSY · 15th FC · Solar',
      metrics: isRural
        ? [
          { label: 'Houses with Electricity', value: d.infrastructure.electricityHouses },
          { label: 'Road Length (km)', value: d.infrastructure.roadKm },
          { label: 'Street Lights', value: d.infrastructure.streetLights },
          { label: 'Govt Banks', value: d.infrastructure.govtBanks },
          { label: 'Private Banks', value: d.infrastructure.privateBanks },
          { label: 'Post Offices', value: d.infrastructure.postOffices },
          { label: 'Public Toilets', value: d.infrastructure.publicToilets },
          { label: 'Solar Installed Houses', value: d.infrastructure.solarHomes },
        ]
        : [
          { label: 'Houses with Electricity', value: d.infrastructure.electricityHouses },
          { label: 'Road Length (km)', value: d.infrastructure.roadKm },
          { label: 'Govt Banks', value: d.infrastructure.govtBanks },
          { label: 'Private Banks', value: d.infrastructure.privateBanks },
          { label: 'Solar Installed Houses', value: d.infrastructure.solarHomes },
          { label: 'Functional Public Toilets', value: d.infrastructure.publicToilets },
          { label: 'Dist. to Main Market (km)', value: d.infrastructure.distMainMarketKm },
          { label: 'Dist. to Bus Stand (km)', value: d.infrastructure.distBusStandKm },
          { label: 'Dist. to Railway Station (km)', value: d.infrastructure.distRailwayStationKm },
        ],
      narrativeText: n.sectorNarratives.infrastructure,
    }));

    sectors.push(renderSector({
      key: 'environment',
      className: isRural ? 'green' : 'green',
      title: isRural ? '09 · Environment & Sanitation' : '07 · Environment & Sanitation',
      badge: isRural ? 'SBM · PM Surya Ghar · MGNREGS' : 'SBM · Compost · Nurseries',
      metrics: isRural
        ? [
          { label: 'Forest Area (Ha)', value: d.environment.forestHa },
          { label: 'Pasture Land (Ha)', value: d.environment.pastureHa },
          { label: 'Houses with Toilets', value: d.environment.housesWithToilets },
          { label: 'Biogas Plants', value: d.environment.biogasPlants },
          { label: 'PM Surya Ghar Homes', value: d.environment.suryaGharHomes },
          { label: 'Daily Waste (Kg)', value: d.environment.wasteKgDay },
          { label: 'Govt Compost Pits', value: d.environment.govtCompostPits },
        ]
        : [
          { label: 'Houses WITHOUT Toilets', value: d.environment.housesWithoutToilets },
          { label: 'Govt Compost Pits', value: d.environment.govtCompostPits },
          { label: 'Govt Nurseries', value: d.environment.govtNurseries },
          { label: 'Nursery Saplings Available', value: d.environment.nurserySaplingsAvailable },
        ],
      narrativeText: n.sectorNarratives.environment,
    }));

    sectors.push(renderSector({
      key: 'tourism',
      className: 'blue',
      title: isRural ? '10 · Tourism & Cultural Heritage' : '08 · Tourism & Cultural Heritage',
      badge: 'Swadesh Darshan 2.0',
      metrics: isRural
        ? [
          { label: 'Heritage/Cultural Sites', value: d.tourism.heritageSites },
          { label: 'Avg Daily Footfall', value: d.tourism.dailyFootfall },
          { label: 'Annual Fairs', value: d.tourism.annualFairs },
          { label: 'Avg Fair Footfall/Day', value: d.tourism.avgFairFootfallDaily },
          { label: 'Trained Guides', value: d.tourism.trainedGuides },
          { label: 'Fair Employment', value: d.tourism.fairEmployment },
        ]
        : [
          { label: 'Avg Fair Footfall/Day', value: d.tourism.dailyFootfall },
          { label: 'SHG-Operated Stalls', value: d.tourism.fairEmployment },
          { label: 'Registered Trained Guides', value: d.tourism.trainedGuides },
        ],
      narrativeText: n.sectorNarratives.tourism,
    }));

    sectors.push(renderSector({
      key: 'governance',
      title: isRural ? '11 · Governance & Last-Mile Access' : '09 · Governance & Last-Mile Access',
      badge: 'e-Mitra · RSB · Digital Rajasthan',
      metrics: isRural
        ? [
          { label: 'Dist. to Police Station (km)', value: d.governance.distPoliceKm, formatter: formatDecimal },
          { label: 'Dist. to e-Mitra (km)', value: d.governance.distEmitraKm, formatter: formatDecimal },
          { label: 'Dist. to LPG Distributor (km)', value: d.governance.distLpgKm, formatter: formatDecimal },
        ]
        : [
          { label: 'Dist. to Police Station (km)', value: d.governance.urbanPoliceKm || d.governance.distPoliceKm, formatter: formatDecimal },
          { label: 'Dist. to e-Mitra (km)', value: d.governance.urbanEmitraKm || d.governance.distEmitraKm, formatter: formatDecimal },
        ],
      narrativeText: n.sectorNarratives.governance,
    }));

    const educationalSectionTitle = isRural ? 'Section 05 — Education & Skills' : 'Section 03 — Education & Skills';
    const coverHtml = `
      <div class="cover">
        <div class="cover-inner">
          <div class="cover-eyebrow">Manthaan OS · Planning Intelligence Brief · CDO Validated Data</div>
          <div style="width: 48px; height: 2px; background: #E8620A; margin: 1.5rem 0;"></div>
          <div>
            <div class="cover-title">${coverTitle}</div>
            <div class="cover-title-sub">${coverSubtitle}</div>
            <div class="cover-desc">${coverDesc}</div>
            <div class="cover-chips">
              <span class="chip">${isRural ? `${d.meta.blockCount} Blocks · ${d.meta.gpCount} GPs` : `${d.meta.ulbCount} ULBs · ${d.meta.wardCount} Wards`}</span>
              <span class="chip">${isRural ? `${d.population.totalFamilies.toLocaleString()} Families` : `${formatValue(d.education.totalSchools)} Schools`}</span>
              <span class="chip">${isRural ? `₹${d.dairy.annualDairyValueCr} Cr Dairy Economy` : `${formatValue(d.infrastructure.publicToilets)} Public Toilets`}</span>
              <span class="chip">${Math.round((d.social.widowPensioners + d.social.urbanWidow) / 100000 * 10) / 10}L Widow Pensions</span>
              <span class="chip">Data Confidence · CDO Validated</span>
            </div>
            <div class="cover-stats">
              ${coverStatsHtml}
            </div>
          </div>
          <div class="cover-footer">
            Manthaan OS · Aasvaa Innovation Labs · Jaipur, Rajasthan &nbsp;|&nbsp; 
            CONFIDENTIAL — Official Planning Use · Viksit Rajasthan @ 2047 · May 2026
          </div>
        </div>
      </div>
    `;

    const executiveHtml = `
      <div class="page">
        <div class="section-eyebrow">Executive Brief</div>
        <div class="section-title">Five Findings That Define the Planning Opportunity</div>
        <div class="section-body">${n.executiveSummary}</div>

        <div class="stat-row">
          <div class="stat-box accent">
            <div class="sb-value">${isRural ? `${d.agriculture.irrigationPct}%` : `${d.water.urbanFhtcAvg}%`}</div>
            <div class="sb-label">${isRural ? 'Irrigation Rate' : 'Urban FHTC'}</div>
            <div class="sb-sub">${isRural ? 'State avg ~31%' : `${formatValue(d.meta.ulbCount)} ULB coverage`}</div>
          </div>
          <div class="stat-box accent">
            <div class="sb-value">${Math.round((d.social.widowPensioners + d.social.urbanWidow) / 100000 * 10) / 10}L</div>
            <div class="sb-label">Widow Pensions</div>
            <div class="sb-sub">${isRural ? `${d.meta.gpCount} GP coverage` : `${d.meta.wardCount} ward coverage`}</div>
          </div>
          <div class="stat-box accent">
            <div class="sb-value">${isRural ? `${d.water.ruralFhtcAvg}%` : `${d.education.totalSchools?.toLocaleString() || '—'}`}</div>
            <div class="sb-label">${isRural ? 'Rural FHTC' : 'Total Schools'}</div>
            <div class="sb-sub">${isRural ? `${d.water.gpsBelow30Fhtc} GPs below 30%` : 'Urban baseline available'}</div>
          </div>
          <div class="stat-box accent">
            <div class="sb-value">${isRural ? d.health.samChildren.toLocaleString() : d.health.urbanHealthBeds?.toLocaleString() || '—'}</div>
            <div class="sb-label">${isRural ? 'SAM Children' : 'Urban Health Beds'}</div>
            <div class="sb-sub">${isRural ? 'Nutrition priority' : 'Health infrastructure'}</div>
          </div>
        </div>

        <table class="findings-table">
          <thead>
            <tr><th>#</th><th>Finding</th><th>Current Position</th><th>Opportunity</th></tr>
          </thead>
          <tbody>
            ${n.findings.map((f: any) => `
              <tr>
                <td><span class="fn">${f.number}</span></td>
                <td>${f.finding}</td>
                <td>${f.currentPosition}</td>
                <td>${f.opportunity}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    const profileTitle = isRural
      ? `${d.meta.blockCount} Blocks · ${d.meta.gpCount} Gram Panchayats`
      : `${d.meta.wardCount} Urban Wards · ${d.meta.ulbCount} Urban Local Bodies`;

    const profileHtml = `
      <div class="page">
        <div class="section-eyebrow">Section 01 — District Profile</div>
        <div class="section-title">${profileTitle}</div>
        <div class="profile-grid">
          ${renderProfile(isRural ? `Rural Profile — ${d.meta.gpCount} GPs · ${d.meta.blockCount} Blocks` : `Urban Profile — ${d.meta.wardCount} Wards · ${d.meta.ulbCount} ULBs`, profileRows)}
        </div>
      </div>
    `;

    const sectorTitle = isRural ? 'Section 02 — 11-Sector Development Analysis' : 'Section 02 — 9-Sector Development Analysis';
    const sectorIntro = isRural ? 'Baseline Snapshot Across All Development Sectors' : 'Baseline Snapshot Across Urban Development Sectors';

    const sectorHtml = `
      <div class="page">
        <div class="section-eyebrow">${sectorTitle}</div>
        <div class="section-title">${sectorIntro}</div>
        ${sectors.join('')}
      </div>
    `;

    const actionsHtml = `
      <div class="page">
        <div class="section-eyebrow">Priority Actions</div>
        <div class="section-title">Four Actions — Data-Grounded, Scheme-Linked</div>
        <div class="section-body">
          The actions below are sequenced by implementation speed and impact radius. 
          All are grounded in baseline data from this district's ${d.meta.gpCount} GPs and ${d.meta.wardCount} urban wards.
        </div>

        <div class="action-grid">
          ${n.priorityActions.map((a: any) => `
            <div class="action-card">
              <div class="ac-top">
                <span class="ac-num">Action ${a.number} · ${a.cost}</span>
                <span class="ac-meta">${a.timeline}</span>
              </div>
              <div class="ac-title">${a.title}</div>
              <div class="ac-desc">${a.description}</div>
              <div class="ac-scheme">${a.scheme}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    const closingHtml = `
      <div class="closing">
        <div class="closing-inner">
          <div class="closing-divider"></div>
          <div class="closing-quote">"${n.closingQuote}"</div>
          <div class="closing-meta">
            Manthaan OS · Aasvaa Innovation Labs · ${titleLine1.toUpperCase()} · ${titleLine2} · Viksit Rajasthan @ 2047 · May 2026
          </div>
        </div>
      </div>
    `;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${titleLine1} — Planning Intelligence Brief · May 2026</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1a1a2e; line-height: 1.6; }
  .cover { background: #1B3A6B; color: white; min-height: 100vh; display: flex; flex-direction: column; padding: 0; }
  .cover-inner { max-width: 960px; margin: 0 auto; width: 100%; padding: 5rem 4rem 4rem; display: flex; flex-direction: column; min-height: 100vh; justify-content: space-between; }
  .cover-eyebrow { font-size: 0.65rem; letter-spacing: 0.3em; color: #93c5fd; text-transform: uppercase; margin-bottom: 0; }
  .cover-title { font-size: 5.5rem; font-weight: 900; line-height: 0.9; color: #ffffff; margin-top: 3rem; }
  .cover-title-sub { font-size: 4.5rem; font-weight: 900; color: #E8620A; margin-bottom: 2rem; line-height: 1; }
  .cover-desc { color: #e2e8f0; font-size: 1rem; max-width: 600px; line-height: 1.75; margin-bottom: 2rem; }
  .cover-chips { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0; }
  .chip { border: 1px solid #4b6fa8; background: rgba(255,255,255,0.07); padding: 0.35rem 0.9rem; border-radius: 20px; font-size: 0.75rem; color: #e2e8f0; }
  .cover-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2rem; padding-top: 2.5rem; border-top: 1px solid #2d5a9e; margin-top: 3rem; }
  .cs-value { font-size: 2rem; font-weight: 800; color: #ffffff; line-height: 1.15; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .cs-label { font-size: 0.62rem; letter-spacing: 0.1em; color: #93c5fd; margin-top: 0.4rem; text-transform: uppercase; line-height: 1.4; }
  .cover-footer { font-size: 0.65rem; color: #64748b; letter-spacing: 0.05em; padding-top: 2rem; border-top: 1px solid #1e3a5f; margin-top: 2rem; }
  .page { padding: 4rem; max-width: 960px; margin: 0 auto; }
  .section-eyebrow { font-size: 0.62rem; letter-spacing: 0.25em; color: #E8620A; text-transform: uppercase; margin-bottom: 0.75rem; border-bottom: 2px solid #E8620A; padding-bottom: 0.5rem; display: inline-block; }
  .section-title { font-size: 2.2rem; font-weight: 800; color: #1B3A6B; line-height: 1.15; margin-bottom: 1rem; }
  .section-body { color: #475569; line-height: 1.75; margin-bottom: 2rem; font-size: 0.95rem; }
  .divider { border: none; border-top: 1px solid #e2e8f0; margin: 3.5rem 0; }
  .stat-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; margin: 2rem 0; }
  .stat-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1.25rem; }
  .stat-box.accent { border-left: 3px solid #E8620A; }
  .sb-value { font-size: 1.8rem; font-weight: 800; color: #1B3A6B; }
  .sb-label { font-size: 0.68rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.07em; margin-top: 0.2rem; }
  .sb-sub { font-size: 0.72rem; color: #94a3b8; margin-top: 0.4rem; }
  .profile-grid { display: grid; grid-template-columns: 1fr; gap: 2rem; margin: 2rem 0; }
  .profile-card { background: #f8fafc; border-radius: 10px; padding: 1.5rem; border: 1px solid #e2e8f0; }
  .pc-title { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #1B3A6B; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid #e2e8f0; }
  .pc-row { display: flex; justify-content: space-between; padding: 0.35rem 0; font-size: 0.85rem; border-bottom: 1px solid #f1f5f9; }
  .pc-row:last-child { border-bottom: none; }
  .pc-key { color: #64748b; }
  .pc-val { color: #1a1a2e; font-weight: 600; }
  .findings-table { width: 100%; border-collapse: collapse; margin: 2rem 0; font-size: 0.875rem; }
  .findings-table th { background: #1B3A6B; color: white; padding: 0.85rem 1rem; text-align: left; font-size: 0.72rem; letter-spacing: 0.07em; text-transform: uppercase; }
  .findings-table td { padding: 1rem; border-bottom: 1px solid #e2e8f0; vertical-align: top; color: #374151; }
  .findings-table tr:hover td { background: #f8fafc; }
  .fn { color: #E8620A; font-weight: 800; font-size: 1rem; }
  .sector-section { margin: 2.5rem 0; padding: 2rem; background: #f8fafc; border-radius: 12px; border-left: 4px solid #1B3A6B; }
  .sector-section.orange { border-left-color: #E8620A; }
  .sector-section.green { border-left-color: #16a34a; }
  .sector-section.blue { border-left-color: #0ea5e9; }
  .sector-section.purple { border-left-color: #7c3aed; }
  .sector-section.amber { border-left-color: #d97706; }
  .sector-section.pending { border-left-color: #94a3b8; background: #f1f5f9; }
  .ss-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; }
  .ss-title { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #1B3A6B; }
  .ss-badge { font-size: 0.65rem; background: #1B3A6B; color: white; padding: 0.2rem 0.6rem; border-radius: 10px; }
  .ss-badge.pending-badge { background: #94a3b8; }
  .ss-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1rem; }
  .sm { background: white; border-radius: 8px; padding: 0.85rem; border: 1px solid #e2e8f0; }
  .sm-value { font-size: 1.2rem; font-weight: 700; color: #1B3A6B; }
  .sm-label { font-size: 0.65rem; color: #64748b; margin-top: 0.15rem; }
  .sm-note { font-size: 0.58rem; color: #94a3b8; margin-top: 0.15rem; }
  .ss-narrative { font-size: 0.875rem; color: #475569; line-height: 1.7; margin-top: 0.75rem; }
  .ss-pending { font-size: 0.85rem; color: #94a3b8; font-style: italic; }
  .action-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; margin: 2rem 0; }
  .action-card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 1.5rem; }
  .ac-top { display: flex; justify-content: space-between; margin-bottom: 0.75rem; }
  .ac-num { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #E8620A; }
  .ac-meta { font-size: 0.68rem; color: #94a3b8; text-align: right; }
  .ac-title { font-size: 1rem; font-weight: 700; color: #1B3A6B; margin-bottom: 0.5rem; }
  .ac-desc { font-size: 0.85rem; color: #475569; line-height: 1.65; margin-bottom: 0.75rem; }
  .ac-scheme { font-size: 0.7rem; color: #E8620A; font-weight: 600; letter-spacing: 0.05em; }
  .closing { background: #1B3A6B; padding: 5rem 4rem; text-align: center; }
  .closing-inner { max-width: 700px; margin: 0 auto; }
  .closing-quote { font-size: 1.2rem; color: #e2e8f0; line-height: 1.8; font-style: italic; margin-bottom: 2rem; }
  .closing-divider { width: 48px; height: 2px; background: #E8620A; margin: 0 auto 2rem; }
  .closing-meta { font-size: 0.65rem; color: #4b6fa8; letter-spacing: 0.15em; text-transform: uppercase; }
  @media print { .cover { min-height: 100vh; page-break-after: always; } .page { page-break-inside: avoid; } .sector-section { page-break-inside: avoid; } }
</style>
</head>
<body>
${coverHtml}
${executiveHtml}
<hr class="divider">
${profileHtml}
<hr class="divider">
${sectorHtml}
<hr class="divider">
${actionsHtml}
${closingHtml}
</body>
</html>`;

    setGeneratedHtml(html);
  }

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <div className="pg-t" style={{ color: '#1a2744' }}>Report Library</div>
        <div className="pg-s" style={{ color: '#64748b' }}>
          Generate AI-powered planning intelligence briefs — select District, Block, and GP or Ward level
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        <div style={{ width: 420, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ height: 4, background: 'linear-gradient(90deg, #e85d04 0%, #f97316 100%)' }} />
            <div style={{ padding: '20px 22px' }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#e85d04', marginBottom: 6 }}>Planning Report · Generate</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#1a2744', marginBottom: 18 }}>District / Block / GP · Ward Level</div>

              <div style={{ display: 'inline-flex', gap: 4, padding: 3, background: '#f1f5f9', borderRadius: 8, marginBottom: 16 }}>
                {(['rural', 'urban', 'district'] as const).map((tab) => {
                  const active = activeTab === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      style={{
                        border: 'none',
                        borderRadius: 6,
                        padding: '5px 14px',
                        background: active ? '#1e3a5f' : 'transparent',
                        color: active ? '#ffffff' : '#64748b',
                        fontWeight: active ? 700 : 600,
                        fontSize: 12,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {tab === 'rural' ? 'Rural (GP Level)' : tab === 'urban' ? 'Urban (Ward Level)' : 'District (Full)'}
                    </button>
                  );
                })}
              </div>

              {activeTab === 'rural' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <select className="fs" value={ruralDistrict} onChange={(e) => handleRuralDistrictChange(e.target.value)} disabled={generating}>
                    <option value="">1. District select karo...</option>
                    {DISTRICTS_EN.map((district) => (
                      <option key={district} value={district}>{district}</option>
                    ))}
                  </select>

                  {ruralDistrict && (
                    <select className="fs" value={ruralBlock.hi} onChange={(e) => handleRuralBlockChange(e.target.value)} disabled={generating || loadingBlocks}>
                      <option value="">{loadingBlocks ? 'Blocks load ho rahe hain...' : '2. Block select karo (optional)'}</option>
                      {ruralBlocks.map((block) => (
                        <option key={block.hi} value={block.hi}>{block.hi}</option>
                      ))}
                    </select>
                  )}

                  {ruralBlock.hi && (
                    <select
                      className="fs"
                      value={ruralGpId ?? ''}
                      onChange={(e) => {
                        const selectedId = Number(e.target.value);
                        const gp = ruralGps.find(g => g.gp_id === selectedId);
                        if (gp) {
                          setRuralGpId(gp.gp_id);
                          setRuralGpName(gp.gram_panchayat);
                          setGpSearch(gp.gram_panchayat.hi);
                        } else {
                          setRuralGpId(null);
                          setRuralGpName({ hi: '', en: '' });
                          setGpSearch('');
                        }
                      }}
                      disabled={generating || loadingGps}
                    >
                      <option value="">
                        {loadingGps
                          ? 'GPs load ho rahe hain...'
                          : `3. GP select karo (${ruralGps.length} available)`}
                      </option>
                      {ruralGps.map((gp) => (
                        <option key={gp.gp_id} value={gp.gp_id}>
                          {gp.gram_panchayat.hi}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {activeTab === 'urban' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <select className="fs" value={urbanDistrict} onChange={(e) => handleUrbanDistrictChange(e.target.value)} disabled={generating}>
                    <option value="">1. District select karo...</option>
                    {DISTRICTS_EN.map((district) => (
                      <option key={district} value={district}>{district}</option>
                    ))}
                  </select>

                  {urbanDistrict && (
                    <select className="fs" value={urbanUlb} onChange={(e) => handleUrbanUlbChange(e.target.value)} disabled={generating || loadingUlbs}>
                      <option value="">{loadingUlbs ? 'ULBs load ho rahe hain...' : '2. ULB select karo (optional)'}</option>
                      {urbanUlbs.map((ulb) => (
                        <option key={ulb} value={ulb}>{ulb}</option>
                      ))}
                    </select>
                  )}

                  {urbanUlb && (
                    <select
                      className="fs"
                      value={urbanWardId ?? ''}
                      onChange={(e) => {
                        const selectedId = Number(e.target.value);
                        const ward = urbanWards.find(w => w.ward_id === selectedId);
                        if (ward) {
                          setUrbanWardId(ward.ward_id);
                          setUrbanWardName(ward.ward);
                          setWardSearch(ward.ward);
                        } else {
                          setUrbanWardId(null);
                          setUrbanWardName('');
                          setWardSearch('');
                        }
                      }}
                      disabled={generating || loadingWards}
                    >
                      <option value="">
                        {loadingWards
                          ? 'Wards load ho rahe hain...'
                          : `3. Ward select karo (${urbanWards.length} available)`}
                      </option>
                      {urbanWards.map((ward) => (
                        <option key={ward.ward_id} value={ward.ward_id}>
                          {ward.ward} — {ward.ulb}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {activeTab === 'district' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <select className="fs" value={ruralDistrict} onChange={(e) => { setRuralDistrict(e.target.value); setUrbanDistrict(e.target.value); }} disabled={generating}>
                    <option value="">1. District select karo...</option>
                    {DISTRICTS_EN.map((district) => (
                      <option key={district} value={district}>{district}</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginTop: 12, padding: '8px 0', borderTop: '1px solid #f1f5f9' }}>
                <span>Report scope</span>
                <span style={{ fontWeight: 700, color: '#e85d04' }}>{scopeLabel}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', padding: '4px 0 12px' }}>
                <span>Covers</span>
                <span style={{ fontWeight: 600, color: '#1a2744' }}>All 11 sectors</span>
              </div>

              {(ruralDistrict || urbanDistrict) && (
                <button
                  onClick={handleGenerateReport}
                  disabled={generating}
                  style={{
                    background: '#1a2744',
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    padding: 13,
                    fontSize: 14,
                    fontWeight: 700,
                    width: '100%',
                    cursor: 'pointer',
                    marginTop: 12,
                    opacity: generating ? 0.85 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!generating) (e.currentTarget as HTMLButtonElement).style.background = '#e85d04';
                  }}
                  onMouseLeave={(e) => {
                    if (!generating) (e.currentTarget as HTMLButtonElement).style.background = '#1a2744';
                  }}
                >
                  {generating ? generatingLabel : 'Generate Planning Report'}
                </button>
              )}
              {reportError && (
                <div style={{
                  marginTop: 14,
                  padding: '14px 16px',
                  background: '#fff7ed',
                  border: '1px solid #fed7aa',
                  borderLeft: '4px solid #e85d04',
                  borderRadius: 10,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#e85d04', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                    Manthaan AI · सेवा अनुपलब्ध
                  </div>
                  <div style={{ fontSize: 13, color: '#92400e', lineHeight: 1.7, fontFamily: "'Noto Sans Devanagari', sans-serif" }}>
                    {reportError}
                  </div>
                  <div style={{ fontSize: 11, color: '#b45309', marginTop: 8 }}>
                    यदि समस्या बनी रहती है तो RITI तकनीकी दल से संपर्क करें।
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '14px 18px', display: 'flex', gap: 20 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#1e3a5f', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Reports Generated</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#1a2744', marginTop: 2 }}>{reportHistory.length}</div>
            </div>
            <div style={{ width: 1, background: '#bfdbfe' }} />
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#1e3a5f', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Rural</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#16a34a', marginTop: 2 }}>{reportHistory.filter(r => r.area_type === 'Rural').length}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#1e3a5f', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Urban</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#2563eb', marginTop: 2 }}>{reportHistory.filter(r => r.area_type === 'Urban').length}</div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 16, padding: '20px 22px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1a2744' }}>Report History</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Previously generated reports — click to open or download as PDF</div>
              </div>
              <button onClick={loadReportHistory} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, color: '#64748b', cursor: 'pointer' }}>
                ↻ Refresh
              </button>
            </div>

            {historyLoading ? (
              <div style={{ color: '#94a3b8', fontStyle: 'italic', padding: '20px 0', textAlign: 'center' }}>Loading report history...</div>
            ) : reportHistory.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', background: '#f8fafc', borderRadius: 12, border: '1px dashed #e2e8f0' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1a2744' }}>No reports yet</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Generate your first report using the form on the left</div>
              </div>
            ) : (<>
              <style>{`.report-scrollbar::-webkit-scrollbar { width: 5px; } .report-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 4px; } .report-scrollbar::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 4px; } .report-scrollbar::-webkit-scrollbar-thumb:hover { background: #64748b; }`}</style>
              <div className="report-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 340, overflowY: 'auto', paddingRight: 6 }}>
                {reportHistory.map((report) => {
                  const date = new Date(report.created_at);
                  const dateStr = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                  const timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                  const isRural = report.area_type === 'Rural';
                  const isDistrictReport = report.area_type === 'District';

                  return (
                    <div key={report.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, transition: 'border-color 0.15s' }} onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = '#cbd5e1';
                      (e.currentTarget as HTMLDivElement).style.background = '#f1f5f9';
                    }} onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = '#e2e8f0';
                      (e.currentTarget as HTMLDivElement).style.background = '#f8fafc';
                    }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: isRural ? '#dcfce7' : isDistrictReport ? '#fef3c7' : '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14 }}>
                        {isRural ? '🌾' : isDistrictReport ? '🗺️' : '🏙️'}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#1a2744', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{report.report_name}</div>
                        <div style={{ display: 'flex', gap: 10, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 12, color: '#64748b' }}>{dateStr} · {timeStr}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: isRural ? '#dcfce7' : isDistrictReport ? '#fef3c7' : '#dbeafe', color: isRural ? '#166534' : isDistrictReport ? '#92400e' : '#1d4ed8' }}>{report.area_type.toUpperCase()}</span>
                          {report.file_size_kb && <span style={{ fontSize: 11, color: '#94a3b8' }}>{report.file_size_kb} KB</span>}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button onClick={() => handleOpenSavedReport(report.id)} style={{ background: '#1a2744', color: 'white', border: 'none', borderRadius: 7, padding: '7px 13px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }} title="Open report">Open</button>
                        <button
                          onClick={() => handlePrintSavedReport(report.id)}
                          style={{
                            background: '#e85d04',
                            color: 'white',
                            border: 'none',
                            borderRadius: 7,
                            padding: '7px 13px',
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                          title="Download as PDF"
                        >
                          ⬇ PDF
                        </button>
                        <button onClick={() => handleDeleteReport(report.id)} disabled={deletingId === report.id} style={{ background: 'white', color: '#dc2626', border: '1px solid #fee2e2', borderRadius: 7, padding: '7px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', opacity: deletingId === report.id ? 0.5 : 1 }} title="Delete report">✕</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>)}
          </div>

          {generatedHtml && (
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div style={{ padding: '14px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1a2744' }}>Report Preview</div>
              </div>
              <iframe ref={reportFrameRef} srcDoc={generatedHtml} style={{ width: '100%', height: 900, border: 'none', background: 'white' }} title="Generated Report" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
