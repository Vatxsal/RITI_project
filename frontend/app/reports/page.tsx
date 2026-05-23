'use client';

import { useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchBlocksForDistrict, fetchGpsForBlock, fetchUlbsForDistrict, fetchWardsForUlb } from '@/lib/cache/refresh_cache_dashboard';

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
  const [activeTab, setActiveTab] = useState<'rural' | 'urban'>('rural');
  const [ruralDistrict, setRuralDistrict] = useState('');
  const [ruralBlock, setRuralBlock] = useState('');
  const [ruralGpId, setRuralGpId] = useState<number | null>(null);
  const [ruralGpName, setRuralGpName] = useState('');
  const [ruralBlocks, setRuralBlocks] = useState<string[]>([]);
  const [ruralGps, setRuralGps] = useState<{ gp_id: number; gram_panchayat: string }[]>([]);
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

  const ALWAR_REPORT_PATH = '/reports/alwar-lok-sabha-brief-v2.pdf';
  const scopeLabel = activeTab === 'rural'
    ? ruralGpName
      ? `GP: ${ruralGpName}`
      : ruralBlock
        ? `Block: ${ruralBlock}, ${ruralDistrict}`
        : ruralDistrict
          ? `District: ${ruralDistrict}`
          : 'Select location'
    : urbanWardName
      ? `Ward: ${urbanWardName}`
      : urbanUlb
        ? `ULB: ${urbanUlb}, ${urbanDistrict}`
        : urbanDistrict
          ? `District: ${urbanDistrict}`
          : 'Select location';

  async function handleRuralDistrictChange(district: string) {
    setRuralDistrict(district);
    setRuralBlock('');
    setRuralGpId(null);
    setRuralGpName('');
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

  async function handleRuralBlockChange(block: string) {
    setRuralBlock(block);
    setRuralGpId(null);
    setRuralGpName('');
    setGpSearch('');

    if (!block) {
      setRuralGps([]);
      return;
    }

    setLoadingGps(true);
    try {
      const gps = await fetchGpsForBlock(ruralDistrict, block);
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
    const district = activeTab === 'rural' ? ruralDistrict : urbanDistrict;
    if (!district) {
      alert('Pehle district select karo');
      return;
    }

    setGenerating(true);
    setGeneratingLabel('Data fetch ho raha hai...');
    
    try {
      const scope = activeTab === 'rural'
        ? {
            type: 'rural' as const,
            district: ruralDistrict,
            block: ruralBlock || null,
            gpId: ruralGpId || null,
            gpName: ruralGpName || null,
          }
        : {
            type: 'urban' as const,
            district: urbanDistrict,
            ulb: urbanUlb || null,
            wardId: urbanWardId || null,
            wardName: urbanWardName || null,
          };

      const reportData = await fetchScopedReportData(scope);
      setGeneratingLabel('Manthaan AI report likh raha hai...');
      const narrative = await generateNarrative(reportData, scope);
      setGeneratingLabel('Report render ho rahi hai...');
      renderReport(scope, reportData, narrative);
    } catch (err: any) {
      console.error(err);
      alert(`Report generation failed: ${err.message}`);
    } finally {
      setGenerating(false);
      setGeneratingLabel('');
    }
  }

  async function fetchScopedReportData(scope: any) {
    const S = (dataset: any, col: string) => (dataset?.data || []).reduce((a: number, r: any) => a + (Number(r[col]) || 0), 0);
    const A = (dataset: any, col: string) => {
      const vals = (dataset?.data || []).map((r: any) => Number(r[col])).filter((v: number) => v > 0);
      return vals.length ? (vals.reduce((a: number, b: number) => a + b, 0) / vals.length) : 0;
    };

    if (scope.type === 'rural') {
      let gpQuery = supabase.from('dim_rural_gps').select('gp_id, gram_panchayat, block').eq('district', scope.district);
      if (scope.block) gpQuery = gpQuery.eq('block', scope.block);
      if (scope.gpId) gpQuery = gpQuery.eq('gp_id', scope.gpId);

      const { data: gps } = await gpQuery;
      const gpIds = (gps || []).map((r: any) => r.gp_id);
      const blocks = [...new Set((gps || []).map((r: any) => r.block))].filter(Boolean);

      if (gpIds.length === 0) throw new Error(`Koi data nahi mila — ${scope.gpName || scope.block || scope.district} ke liye`);

      const [admin, water, livelihood, health, education, social, economy, infra, environment, tourism, governance] = await Promise.all([
        supabase.from('fact_rural_admin').select('*').in('gp_id', gpIds),
        supabase.from('fact_rural_water').select('*').in('gp_id', gpIds),
        supabase.from('fact_rural_livelihood').select('*').in('gp_id', gpIds),
        supabase.from('fact_rural_health').select('*').in('gp_id', gpIds),
        supabase.from('fact_rural_education').select('*').in('gp_id', gpIds),
        supabase.from('fact_rural_social').select('*').in('gp_id', gpIds),
        supabase.from('fact_rural_economy').select('*').in('gp_id', gpIds),
        supabase.from('fact_rural_infra').select('*').in('gp_id', gpIds),
        supabase.from('fact_rural_environment').select('*').in('gp_id', gpIds),
        supabase.from('fact_rural_tourism').select('*').in('gp_id', gpIds),
        supabase.from('fact_rural_governance').select('*').in('gp_id', gpIds),
      ]);

      let aspirationsData: any[] = [];
      try {
        let aspQuery = supabase
          .from('aspirations')
          .select('district, block, gram_panchayat, village, ulb, ward, city, area_type, item, sector, dept, priority, qty_2030, qty_2035, qty_2047, status, total_budget, scheme, planning_year, fast_track')
          .in('status', ['ACCEPT', 'FUNDED', 'REVIEW'])
          .eq('area_type', 'Rural')
          .limit(1000);

        aspQuery = aspQuery.ilike('district', scope.district);
        if (scope.block) aspQuery = aspQuery.ilike('block', scope.block);
        if (scope.gpName) aspQuery = aspQuery.ilike('gram_panchayat', scope.gpName);

        const { data: aspData, error: aspError } = await aspQuery;
        console.log(`[Aspirations] District: ${scope.district} | Found: ${aspData?.length || 0} rows | Error: ${aspError?.message || 'none'}`);
        if (aspError) {
          console.warn('[Aspirations] Fetch failed:', aspError.message);
        }
        aspirationsData = aspData || [];
      } catch (err) {
        console.warn('[Aspirations] Fetch failed:', err);
        aspirationsData = [];
      }

      return {
        scopeType: 'rural',
        scopeLabel: scope.gpName
          ? `GP: ${scope.gpName}, ${scope.block}, ${scope.district}`
          : scope.block
            ? `${scope.block} Block, ${scope.district} District`
            : `${scope.district} District`,
        meta: {
          district: scope.district,
          block: scope.block || null,
          gpName: scope.gpName || null,
          gpCount: gpIds.length,
          blockCount: blocks.length,
          blocks,
          wardCount: 0,
          ulbCount: 0,
          ulbs: [],
          wardName: null,
        },
        population: {
          total: S(admin, 'pop_2026_est'),
          male: S(admin, 'male_pop_2026'),
          female: S(admin, 'female_pop_2026'),
          children06: S(admin, 'children_0_6_2026'),
          children614: S(admin, 'children_6_14_2026'),
          seniors: S(admin, 'senior_citizens_2026'),
          pwd: S(admin, 'pwd_pop_2026'),
          totalFamilies: S(admin, 'total_families_2026'),
          bplFamilies: S(admin, 'bpl_families_count'),
          puccaHouses: S(admin, 'pucca_houses_2026'),
          kutchaHouses: S(admin, 'kutcha_houses_2026'),
          urbanPop: 0,
        },
        water: {
          ruralFhtcAvg: A(water, 'tap_connection_pct').toFixed(1),
          gpsBelow30Fhtc: (water?.data || []).filter((r: any) => r.tap_connection_pct < 30).length,
          overheadTanks: S(water, 'overhead_tanks_count'),
          groundwaterDepth: A(water, 'groundwater_depth_meters').toFixed(1),
          roFacilities: S(water, 'ro_facilities'),
          handpumpTubewellOnlyHouses: S(water, 'handpump_tubewell_only_houses'),
          tankerOnlySupplyHouses: S(water, 'tanker_only_supply_houses'),
          urbanFhtcAvg: '0',
        },
        aspirations: aspirationsData || [],
        agriculture: {
          cultivableHa: S(livelihood, 'cultivable_land_hectare'),
          irrigatedHa: S(livelihood, 'irrigated_area_hectare'),
          irrigationPct: S(livelihood, 'cultivable_land_hectare') > 0 ? ((S(livelihood, 'irrigated_area_hectare') / S(livelihood, 'cultivable_land_hectare')) * 100).toFixed(1) : 0,
          grossSownArea: S(livelihood, 'gross_sown_area'),
          totalFarmers: S(livelihood, 'total_farmers_count'),
          kccHolders: S(livelihood, 'kcc_holders_count'),
          pmKisan: S(livelihood, 'pm_cm_kisan_beneficiaries'),
          soilCards: S(livelihood, 'soil_health_cards_valid'),
          cropInsurance: S(livelihood, 'crop_insurance_farmers'),
          fpos: S(livelihood, 'fpo_count'),
          solarPumps: S(livelihood, 'solar_pumps_count'),
        },
        dairy: {
          totalLivestock: S(livelihood, 'total_livestock_count'),
          milchAnimals: S(livelihood, 'milch_animals_count'),
          dailyMilkLpd: S(livelihood, 'daily_milk_prod_litres'),
          annualDairyValueCr: (S(livelihood, 'daily_milk_prod_litres') * 365 * 50 / 10000000).toFixed(0),
          milkCenters: S(livelihood, 'milk_collection_centers'),
          goatFarms: S(livelihood, 'goat_farms_count'),
          poultryFarms: S(livelihood, 'poultry_farms_count'),
        },
        health: {
          allopathicCenters: S(health, 'allopathic_centers'),
          ayushCenters: S(health, 'ayush_centers'),
          healthBeds: S(health, 'health_center_beds'),
          healthStaff: S(health, 'working_health_staff'),
          ayushmanBen: S(health, 'ayushman_arogya_beneficiaries'),
          tbPatients: S(health, 'tb_patients_count'),
          anemicPregnant: S(health, 'anemic_pregnant_women'),
          samChildren: S(education, 'sam_children_count'),
          ashaWorkers: S(education, 'asha_sahyogini_count'),
          awcCenters: S(education, 'anganwadi_centers'),
          urbanHealthBeds: 0,
          urbanAyushman: 0,
        },
        education: {
          dataAvailable: false,
          totalSchools: 0,
          govtSchools: 0,
          pvtSchools: 0,
          workingTeachers: 0,
          sanctionedTeachers: 0,
          enrolledStudents: 0,
          dropouts: 0,
          skillCenters: 0,
          colleges: 0,
          awcCenters: S(education, 'anganwadi_centers'),
          ashaWorkers: S(education, 'asha_sahyogini_count'),
          samChildren: S(education, 'sam_children_count'),
          urbanGovtSchools: 0,
          urbanPvtSchools: 0,
          urbanTeachers: 0,
        },
        social: {
          oldAgePensioners: S(social, 'old_age_pensioners'),
          widowPensioners: S(social, 'widow_pensioners'),
          pwdPensioners: S(social, 'pwd_pensioners_est'),
          ujjwalaBen: S(social, 'pm_ujjwala_beneficiaries'),
          awasBen: S(social, 'pm_cm_awas_beneficiaries'),
          urbanWidow: 0,
          urbanAwas: 0,
        },
        economy: {
          activeShgs: S(economy, 'active_shg_count'),
          shgWomen: S(economy, 'women_in_shgs'),
          lakhpatiDidis: S(economy, 'lakhpati_didis_count'),
          millionaireDidis: S(economy, 'millionaire_didis_count'),
          mudraLoan: S(economy, 'mudra_loan_beneficiaries'),
          artisans: S(economy, 'local_artisans_count'),
          urbanShgs: 0,
          urbanIndustries: 0,
        },
        infrastructure: {
          electricityHouses: S(infra, 'houses_with_electricity'),
          roadKm: S(infra, 'road_length_km'),
          streetLights: S(infra, 'total_street_lights'),
          govtBanks: S(infra, 'govt_banks_count'),
          postOffices: S(infra, 'post_offices_count'),
          publicToilets: S(infra, 'public_toilets'),
          solarHomes: S(infra, 'solar_installed_houses'),
        },
        environment: {
          forestHa: S(environment, 'forest_area_hectare'),
          pastureHa: S(environment, 'pasture_land_hectare'),
          biogasPlants: S(environment, 'biogas_plants_count'),
          govtCompostPits: S(environment, 'govt_compost_pits_count'),
          pvtCompostPits: S(environment, 'pvt_compost_pits_count'),
          suryaGharHomes: S(environment, 'pm_surya_ghar_solar_houses'),
          wasteKgDay: S(environment, 'total_waste_daily_kg'),
          housesWithToilets: S(environment, 'houses_with_toilets'),
        },
        tourism: {
          heritageSites: S(tourism, 'cultural_assets_count'),
          annualFairs: S(tourism, 'annual_fairs_count'),
          dailyFootfall: S(tourism, 'avg_daily_footfall_cultural_sites'),
          avgFairFootfallDaily: S(tourism, 'avg_fair_footfall_daily'),
          localProductStalls: S(tourism, 'local_product_stalls'),
          trainedGuides: S(tourism, 'registered_trained_guides'),
          fairEmployment: S(tourism, 'fair_related_employment'),
        },
        governance: {
          distPoliceKm: A(governance, 'dist_police_station_km'),
          distEmitraKm: A(governance, 'dist_emitra_km'),
          distLpgKm: A(governance, 'dist_lpg_distributor_km'),
          urbanPoliceKm: 0,
          urbanEmitraKm: 0,
        },
      };
    }

    let wardQuery = supabase.from('dim_urban_wards').select('ward_id, ward, ulb').eq('district', scope.district);
    if (scope.ulb) wardQuery = wardQuery.eq('ulb', scope.ulb);
    if (scope.wardId) wardQuery = wardQuery.eq('ward_id', scope.wardId);

    const { data: wards } = await wardQuery;
    const wardIds = (wards || []).map((r: any) => r.ward_id);
    const ulbs = [...new Set((wards || []).map((r: any) => r.ulb))].filter(Boolean);

    if (wardIds.length === 0) throw new Error(`Koi urban data nahi mila — ${scope.wardName || scope.ulb || scope.district} ke liye`);

    const [uAdmin, uHealth, uWater, uSocial, uEconomy, uEducation, uInfra, uEnv, uTourism] = await Promise.all([
      supabase.from('fact_urban_admin').select('*').in('ward_id', wardIds),
      supabase.from('fact_urban_health').select('*').in('ward_id', wardIds),
      supabase.from('fact_urban_water').select('*').in('ward_id', wardIds),
      supabase.from('fact_urban_social').select('*').in('ward_id', wardIds),
      supabase.from('fact_urban_economy').select('*').in('ward_id', wardIds),
      supabase.from('fact_urban_education').select('*').in('ward_id', wardIds),
      supabase.from('fact_urban_infra').select('*').in('ward_id', wardIds),
      supabase.from('fact_urban_environment').select('*').in('ward_id', wardIds),
      supabase.from('fact_urban_tourism').select('*').in('ward_id', wardIds),
    ]);

    let aspirationsData: any[] = [];
    try {
      let aspQuery = supabase
        .from('aspirations')
        .select('district, block, gram_panchayat, village, ulb, ward, city, area_type, item, sector, dept, priority, qty_2030, qty_2035, qty_2047, status, total_budget, scheme, planning_year, fast_track')
        .in('status', ['ACCEPT', 'FUNDED', 'REVIEW'])
        .eq('area_type', 'Urban')
        .limit(1000);

      aspQuery = aspQuery.ilike('district', scope.district);
      if (scope.ulb) aspQuery = aspQuery.ilike('city', scope.ulb);
      if (scope.wardName) {
        const wardNum = scope.wardName.replace(/[^0-9]/g, '').replace(/^0+/, '') || scope.wardName;
        aspQuery = aspQuery.ilike('ward', `%${wardNum}%`);
      }

      const { data: aspData, error: aspError } = await aspQuery;
      const rawData = aspData || [];
      if (aspError) {
        console.warn('[Aspirations] Fetch failed:', aspError.message);
      }

      aspirationsData = rawData; // area_type = 'Urban' filter already applied at DB level
      console.log(`[Urban Aspirations] District: ${scope.district} | city: ${scope.ulb || 'all'} | ward: ${scope.wardName || 'all'} | wardNum used: ${scope.wardName ? scope.wardName.replace(/[^0-9]/g, '').replace(/^0+/, '') : 'none'} | Found: ${aspirationsData.length} rows`);
    } catch (err) {
      console.warn('[Aspirations] Fetch failed:', err);
      aspirationsData = [];
    }

    return {
      scopeType: 'urban',
      scopeLabel: scope.wardName
        ? `Ward: ${scope.wardName}, ${scope.ulb}, ${scope.district}`
        : scope.ulb
          ? `${scope.ulb} ULB, ${scope.district} District`
          : `${scope.district} District (Urban)`,
      meta: {
        district: scope.district,
        block: null,
        gpName: null,
        wardName: scope.wardName || null,
        gpCount: 0,
        blockCount: 0,
        blocks: [],
        wardCount: wardIds.length,
        ulbCount: ulbs.length,
        ulbs,
      },
      population: {
        total: 0,
        male: S(uAdmin, 'male_pop_2026'),
        female: S(uAdmin, 'female_pop_2026'),
        children06: S(uAdmin, 'children_0_6_2026'),
        children614: S(uAdmin, 'children_6_14_2026'),
        seniors: S(uAdmin, 'senior_citizens_2026'),
        pwd: S(uAdmin, 'pwd_pop_2026'),
        totalFamilies: 0,
        bplFamilies: 0,
        puccaHouses: S(uAdmin, 'pucca_houses_2026'),
        kutchaHouses: S(uAdmin, 'kutcha_houses_2026'),
        urbanPop: S(uAdmin, 'pop_2026_est'),
      },
      water: {
        ruralFhtcAvg: '0',
        gpsBelow30Fhtc: 0,
        overheadTanks: S(uWater, 'overhead_tanks_count'),
        groundwaterDepth: A(uWater, 'groundwater_depth_meters').toFixed(1),
        roFacilities: 0,
        urbanFhtcAvg: A(uWater, 'tap_connection_pct').toFixed(1),
      },
      aspirations: aspirationsData || [],
      agriculture: {
        cultivableHa: 0,
        irrigatedHa: 0,
        irrigationPct: 0,
        totalFarmers: 0,
        kccHolders: 0,
        pmKisan: 0,
        soilCards: 0,
        cropInsurance: 0,
        fpos: 0,
        solarPumps: 0,
      },
      dairy: {
        totalLivestock: 0,
        milchAnimals: 0,
        dailyMilkLpd: 0,
        annualDairyValueCr: '0',
        milkCenters: 0,
        goatFarms: 0,
        poultryFarms: 0,
      },
      health: {
        allopathicCenters: S(uHealth, 'allopathic_centers'),
        ayushCenters: S(uHealth, 'ayush_centers'),
        healthBeds: S(uHealth, 'health_center_beds'),
        healthStaff: S(uHealth, 'working_health_staff'),
        ayushmanBen: 0,
          privateHealthCenters: S(uHealth, 'pvt_health_centers'),
        tbPatients: S(uHealth, 'tb_patients_count'),
        anemicPregnant: S(uHealth, 'anemic_pregnant_women'),
          hypertensionScreening2025_26: S(uHealth, 'hypertension_screening_2025_26'),
          diabetesScreening2025_26: S(uHealth, 'diabetes_screening_2025_26'),
        samChildren: S(uEducation, 'sam_children_count'),
        ashaWorkers: S(uEducation, 'asha_sahyogini_count'),
        awcCenters: S(uEducation, 'anganwadi_centers'),
        urbanHealthBeds: S(uHealth, 'health_center_beds'),
        urbanAyushman: S(uHealth, 'ayushman_arogya_beneficiaries'),
          snpRecipients: S(uEducation, 'snp_recipients_6_72_months'),
      },
      education: {
        dataAvailable: false,
        totalSchools: S(uEducation, 'total_schools_count'),
        govtSchools: S(uEducation, 'govt_schools_count'),
        pvtSchools: S(uEducation, 'pvt_schools_count'),
        workingTeachers: S(uEducation, 'working_teachers'),
        sanctionedTeachers: S(uEducation, 'sanctioned_teachers_count'),
        enrolledStudents: S(uEducation, 'total_enrolled_students'),
        dropouts: S(uEducation, 'dropout_children_prev_year'),
        skillCenters: 0,
        colleges: 0,
        awcCenters: S(uEducation, 'anganwadi_centers'),
        ashaWorkers: S(uEducation, 'asha_sahyogini_count'),
        samChildren: S(uEducation, 'sam_children_count'),
          snpRecipients672Months: S(uEducation, 'snp_recipients_6_72_months'),
          anganwadiEnrolledChildren: S(uEducation, 'anganwadi_enrolled_children'),
        urbanGovtSchools: S(uEducation, 'govt_schools_count'),
        urbanPvtSchools: S(uEducation, 'pvt_schools_count'),
        urbanTeachers: S(uEducation, 'working_teachers'),
      },
      social: {
        oldAgePensioners: S(uSocial, 'old_age_pensioners'),
        widowPensioners: 0,
        pwdPensioners: S(uSocial, 'pwd_pensioners_est'),
        ujjwalaBen: S(uSocial, 'pm_ujjwala_beneficiaries'),
        awasBen: 0,
        urbanWidow: S(uSocial, 'widow_pensioners'),
        urbanAwas: S(uSocial, 'pm_cm_awas_beneficiaries'),
      },
      economy: {
        activeShgs: S(uEconomy, 'active_shg_count'),
        shgWomen: 0,
        lakhpatiDidis: 0,
        millionaireDidis: 0,
        mudraLoan: 0,
        artisans: S(uEconomy, 'local_artisans_count'),
          largeIndustrialUnits: S(uEconomy, 'large_industrial_units'),
          smallScaleIndustries: S(uEconomy, 'small_scale_industries'),
        urbanShgs: S(uEconomy, 'active_shg_count'),
        urbanIndustries: S(uEconomy, 'large_industrial_units') + S(uEconomy, 'small_scale_industries'),
      },
      infrastructure: {
        electricityHouses: S(uInfra, 'houses_with_electricity'),
        roadKm: S(uInfra, 'road_length_km'),
        streetLights: 0,
        govtBanks: S(uInfra, 'govt_banks_count'),
          privateBanks: S(uInfra, 'private_banks_count'),
        postOffices: 0,
        publicToilets: S(uInfra, 'public_toilets_functional'),
        solarHomes: S(uInfra, 'solar_installed_houses'),
          distMainMarketKm: A(uInfra, 'dist_main_market_km'),
          distBusStandKm: A(uInfra, 'dist_bus_stand_km'),
          distRailwayStationKm: A(uInfra, 'dist_railway_station_km'),
      },
      environment: {
        forestHa: 0,
        pastureHa: 0,
        biogasPlants: 0,
          housesWithoutToilets: S(uEnv, 'houses_without_toilets'),
          govtCompostPits: S(uEnv, 'govt_compost_pits_count'),
          govtNurseries: S(uEnv, 'govt_nurseries_count'),
          nurserySaplingsAvailable: S(uEnv, 'nursery_saplings_available'),
        suryaGharHomes: 0,
        wasteKgDay: 0,
        housesWithToilets: 0,
      },
      tourism: {
        heritageSites: 0,
        annualFairs: 0,
        dailyFootfall: S(uTourism, 'avg_fair_footfall_daily'),
          avgFairFootfallDaily: S(uTourism, 'avg_fair_footfall_daily'),
          localProductStalls: S(uTourism, 'local_product_stalls'),
        trainedGuides: S(uTourism, 'registered_trained_guides'),
        fairEmployment: S(uTourism, 'shg_operated_stalls'),
      },
      governance: {
        distPoliceKm: 0,
        distEmitraKm: 0,
        distLpgKm: 0,
        urbanPoliceKm: 0,
        urbanEmitraKm: 0,
      },
    };
  }

  // STEP 3 — Gemini narrative generation
  async function generateNarrative(data: any, scope: any) {
    const d = data;
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
GPs: ${d.meta.gpCount} | Blocks: ${d.meta.blockCount} (${d.meta.blocks.slice(0,5).join(', ')}${d.meta.blocks.length > 5 ? '...' : ''})
Urban Wards: ${d.meta.wardCount} | ULBs: ${d.meta.ulbCount} (${d.meta.ulbs.slice(0,4).join(', ')}${d.meta.ulbs.length > 4 ? '...' : ''})

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
Total farmers: ${d.agriculture.totalFarmers.toLocaleString()} | KCC holders: ${d.agriculture.kccHolders.toLocaleString()} (${d.agriculture.totalFarmers > 0 ? ((d.agriculture.kccHolders/d.agriculture.totalFarmers)*100).toFixed(1) : 0}%)
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

    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key is missing. Please check your .env.local file and restart the dev server.');
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
          console.log(`Attempting report generation with ${model} (Attempt ${attempt + 1})...`);
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
            console.warn(`${model} busy, retrying in 2s...`);
            await new Promise(r => setTimeout(r, 2000));
            continue;
          }

          if (!result.candidates || result.candidates.length === 0) {
            console.warn(`${model} failed:`, result.error?.message || 'No candidates');
            lastError = result.error?.message || `No candidates returned from ${model}`;
            break; // Try next model in the list
          }

          const text = result.candidates[0].content.parts[0].text;
          const clean = text.replace(/```json|```/g, '').trim();
          return JSON.parse(clean);
        } catch (err: any) {
          console.warn(`${model} connection error:`, err.message);
          lastError = err.message;
          break; // Try next model
        }
      }
    }

    throw new Error(`AI narrative generation failed across all models. Last error: ${lastError}`);
  }

  function buildAlwarPdfReportHtml(scope: any, data: any, narrative: any) {
    console.log('✅ Alwar PDF redesign v3 active', scope);

    const d = data;
    const n = narrative || {};
    const scopeType = d.scopeType || scope.type;
    const isRural = scopeType === 'rural';
    const isUrban = scopeType === 'urban';
    // Enforce strict scope isolation: rural reports never show urban units and vice versa.
    const showRuralProfile = isRural || (!isUrban && !isRural && Number(d.meta?.gpCount || 0) > 0);
    const showUrbanProfile = isUrban || (!isUrban && !isRural && Number(d.meta?.wardCount || 0) > 0);
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
    const puccaPct = ruralFamilies > 0 ? ((Number(d.population?.puccaHouses || 0) / ruralFamilies) * 100).toFixed(1) : '—';
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
          <div class="vr-logo">VR</div>
          <div>
            <div>VIKSIT RAJASTHAN 2047 | RITI · Government of Rajasthan · जिला मास्टर प्लान</div>
            <div style="color:#94a3b8; font-weight:500; margin-top:2px;">${escapeHtml(title)}</div>
          </div>
        </div>
        <div class="page-header-right">VR-2047 / DIST / ${escapeHtml(districtCode)} / 2026-01 | PAGE ${pageNo} · ${escapeHtml(rightText)}</div>
      </div>
    `;

    const scopeLevel = scope.gpName ? 'gp'
      : scope.wardName ? 'ward'
      : scope.block ? 'block'
      : scope.ulb ? 'ulb'
      : 'district';

    const coverMainName = scope.gpName || scope.wardName || scope.block || scope.ulb || district;

    const coverTypeLabel = {
      gp: 'ग्राम पंचायत',
      ward: 'शहरी वार्ड',
      block: 'विकास खंड',
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

    const metricCard = (value: any, label: string, subLabel: string = '') => `
      <div class="metric-card">
        <div class="metric-value">${escapeHtml(value)}</div>
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
          <div style="font-size:10px; color:#64748b; margin-top:2px; font-family:'Inter',sans-serif;">${escapeHtml(row.subtitle)}</div>
        </td>
        <td style="text-align:center;"><span class="priority-badge ${row.priority === 'P-1' ? 'p1' : 'p2'}">${row.priority}</span></td>
        <td style="text-align:center; font-family:'Inter',sans-serif; font-weight:700;">${escapeHtml(row.gp)}</td>
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

    const coverPage = pageShell(`
      ${pageHeader('01 / 07', 'आवरण एवं परिचय', 'Cover · Introduction', 'PAGE 01 / 07 · आवरण एवं परिचय')}
      <div class="cover-kicker">विकसित राजस्थान @ 2047 · जिला मास्टर प्लान · SURVEY-VALIDATED</div>
      <h1 class="cover-district">${escapeHtml(coverMainName)}<span>${escapeHtml(coverTypeLabel)}</span></h1>
      <div class="cover-subtitle">${escapeHtml(coverParentLine)} · Rajasthan · District Master Plan · FY 2026-27</div>
      <div class="pill-row">
        ${kpiPill('नागरिक', `${fmtLakh(totalPopulation)}`, isRural ? `${fmt(d.meta?.gpCount || 0)} ग्राम पंचायतें` : `${fmt(d.meta?.wardCount || 0)} वार्ड`)}
        ${scopeLevel === 'district'
          ? (isUrban
              ? kpiPill('वार्ड · नगर निकाय', `${fmt(d.meta?.wardCount || 0)} वार्ड · ${fmt(d.meta?.ulbCount || 0)} नगर निकाय`, 'शहरी प्रशासनिक ढांचा')
              : kpiPill('ग्राम पंचायतें · Blocks', `${fmt(d.meta?.gpCount || 0)} ग्राम पंचायतें · ${fmt(d.meta?.blockCount || 0)} Blocks`, 'ग्रामीण प्रशासनिक ढांचा'))
          : scopeLevel === 'block'
            ? kpiPill('ग्राम पंचायतें', `${fmt(d.meta?.gpCount || 0)} ग्राम पंचायतें`, 'चयनित विकास खंड कवरेज')
            : scopeLevel === 'gp'
              ? kpiPill('ग्राम पंचायत', '1 ग्राम पंचायत', 'चयनित ग्राम पंचायत कवरेज')
              : scopeLevel === 'ward'
                ? kpiPill('वार्ड', '1 वार्ड', 'चयनित वार्ड कवरेज')
                : kpiPill('नगर निकाय', `${fmt(d.meta?.wardCount || 0)} वार्ड`, 'शहरी प्रशासनिक कवरेज')}
        ${kpiPill('क्षेत्रीय स्थिति', isRural ? `कृषि · डेयरी · ग्राम शासन` : `शहरी सेवा · उद्योग · अवसंरचना`, isRural ? 'ग्रामीण केंद्रित' : 'शहरी केंद्रित')}
        ${kpiPill('पहचान', `${selectedScopeType}`, selectedScopePath)}
      </div>

      <div class="featured-box">
        <div class="featured-title">मास्टर प्लान · एक नज़र में · THE PLANNING PROGRAMME AT A GLANCE</div>
        <div class="featured-body">
          <p><b>${escapeHtml(selectedScopeName)}</b> (${escapeHtml(selectedScopeType)}) के लिए आधारभूत डेटा के आधार पर यह नियोजन संक्षिप्तिका तैयार की गई है। मूल जिला <b>${escapeHtml(district)}</b> के अंतर्गत इस चयनित क्षेत्र की जनसंख्या, आवास, आजीविका, अवसंरचना और शासन की वर्तमान स्थिति को संरचित रूप में प्रस्तुत किया गया है।</p>
          <p>${escapeHtml(n.executiveSummary || 'जिले का आधारभूत सारांश वर्तमान नियोजन डेटासेट से उपलब्ध है।')}</p>
          <p>डेटा सत्यापन: <b>Supabase baseline tables</b> + <b>Manthaan AI narrative</b> + <b>सर्वे-सत्यापित प्रारूप</b>।</p>
        </div>
        <div class="featured-caption">जिला आधारभूत डेटा, GP/वार्ड लुकअप और AI-generated विश्लेषण से सत्यापित</div>
      </div>

      <div class="cover-grid">
              ${isRural ? `
                ${statCard('रणनीतिक स्थिति', `${fmtPct(d.water?.ruralFhtcAvg)}`, '#1e3a5f', `Rural FHTC · ${fmt(d.water?.gpsBelow30Fhtc || 0)} GPs below 30%`)}
                ${statCard('कृषि स्थिति', `${fmtPct(d.agriculture?.irrigationPct)}`, '#16a34a', `${fmtLakh(d.agriculture?.totalFarmers || 0)} farmers · ${fmtLakh(d.agriculture?.kccHolders || 0)} KCC`)}
                ${statCard('पशुधन एवं डेयरी', `${fmtLakh(totalLivestock)}`, '#e85d04', `${fmt(d.dairy?.milkCenters || 0)} milk collection centres · ${fmtLakh(dailyMilkLpd, true)} LPD`)}
                ${statCard('ग्राम पंचायतें', fmt(d.meta?.gpCount || 0), '#1a2744', 'Selected rural units')}
              ` : `
                ${statCard('जल आपूर्ति स्थिति', `${fmtPct(d.water?.urbanFhtcAvg)}`, '#1e3a5f', `Groundwater: ${fmtKm(d.water?.groundwaterDepth || 0, 1)} depth · ${fmt(d.water?.overheadTanks || 0)} overhead tanks`)}
                ${statCard('स्वास्थ्य सेवाएं', `${fmt(Number(d.health?.allopathicCenters || 0) + Number(d.health?.ayushCenters || 0) + Number(d.health?.privateHealthCenters || 0))}`, '#16a34a', `${fmtLakh(d.health?.urbanAyushman || d.health?.ayushmanBen || 0)} Ayushman · ${fmt(d.health?.healthBeds || 0)} beds`)}
                ${statCard('शहरी अर्थव्यवस्था', `${fmt(Number(d.economy?.largeIndustrialUnits || 0) + Number(d.economy?.smallScaleIndustries || 0))}`, '#e85d04', `${fmt(d.economy?.activeShgs || 0)} SHG · ${fmt(d.economy?.artisans || 0)} कारीगर`)}
                ${statCard('वार्ड / नगर निकाय', `${fmt(d.meta?.wardCount || 0)} · ${fmt(d.meta?.ulbCount || 0)}`, '#1a2744', 'Selected urban units')}
              `}
      </div>

      <div class="footer-line">तैयार किया — RITI · राजस्थान इंस्टिट्यूट फॉर ट्रांसफॉर्मेशन एंड इनोवेशन | दिनांक: ${escapeHtml(reportDateLabel)} · योजना चक्रः FY 2026-27</div>
    `, 'cover-page');

    const malePopulation = Number(d.population?.male || 0);
    const femalePopulation = Number(d.population?.female || 0);
    const sexRatio = malePopulation > 0 ? ((femalePopulation / malePopulation) * 1000).toFixed(0) : '—';
    const adminCoverage = showRuralProfile
      ? (scopeLevel === 'block'
          ? `${fmt(d.meta?.gpCount || 0)} ग्राम पंचायतें`
          : `${fmt(d.meta?.gpCount || 0)} ग्राम पंचायतें · ${fmt(d.meta?.blockCount || 0)} खंड`)
      : `${fmt(d.meta?.wardCount || 0)} वार्ड · ${fmt(d.meta?.ulbCount || 0)} नगर निकाय`;

    const demographicPage = pageShell(`
      ${pageHeader('02 / 07', 'जनसांख्यिकी एवं बस्ती संरचना', 'District Profile, Settlement & Demography', 'PAGE 02 / 07 · जनसांख्यिकी एवं बस्ती संरचना')}
      <div class="section-kicker">खंड 01</div>
      <h2 class="section-title">जनसांख्यिकी एवं बस्ती संरचना</h2>
      <div class="section-subtitle">District Profile, Settlement & Demography</div>
      <div class="section-copy">${escapeHtml(district)} जिले में ${showRuralProfile ? `${fmt(d.meta?.gpCount || 0)} ग्राम पंचायतें और ${fmt(d.meta?.blockCount || 0)} प्रशासनिक खंड` : ''}${showRuralProfile && showUrbanProfile ? ' तथा ' : ''}${showUrbanProfile ? `${fmt(d.meta?.wardCount || 0)} वार्ड और ${fmt(d.meta?.ulbCount || 0)} नगर निकाय` : ''} शामिल हैं। यह अनुभाग बस्ती संरचना, जनसंख्या वितरण और कल्याण कवरेज का आधारभूत दृश्य प्रस्तुत करता है।</div>

      <div class="kpi-grid-5">
        ${kpiPill('कुल नागरिक', fmtLakh(totalPopulation), '2026 baseline')}
        ${kpiPill('लिंग अनुपात', sexRatio === '—' ? '—' : `${sexRatio}`, 'प्रति 1000 पुरुष')}
        ${kpiPill('बच्चे (0-6)', fmt(d.population?.children06 || 0), 'प्रारंभिक आयु समूह')}
        ${kpiPill('BPL परिवार', fmt(d.population?.bplFamilies || 0), 'वंचित परिवार')}
        ${kpiPill('प्रशासनिक कवरेज', adminCoverage, showRuralProfile ? 'ग्रामीण प्रशासन' : 'शहरी प्रशासन')}
      </div>

      <div class="${showRuralProfile && showUrbanProfile ? 'two-col' : 'one-col'}">
        ${showRuralProfile ? `
        <div class="info-panel">
          <div class="panel-title">ग्रामीण बस्ती प्रोफाइल</div>
          ${infoRow('ग्रामीण जनसंख्या (2026)', fmtLakh(d.population?.total || 0))}
          ${infoRow('ग्रामीण परिवार', fmt(ruralFamilies))}
          ${infoRow('ग्राम पंचायतें', fmt(d.meta?.gpCount || 0))}
          ${scopeLevel === 'block' ? '' : infoRow('प्रशासनिक blocks', fmt(d.meta?.blockCount || 0))}
          ${infoRow('पक्के आवास कवरेज', `${puccaPct}%`)}
          ${infoRow('वरिष्ठ नागरिक (60+)', fmtLakh(d.population?.seniors || 0))}
          ${infoRow('BPL परिवार', fmt(d.population?.bplFamilies || 0))}
          ${infoRow('PwD जनसंख्या', fmt(d.population?.pwd || 0))}
        </div>
        ` : ''}
        ${showUrbanProfile ? `
        <div class="info-panel">
          <div class="panel-title">शहरी बस्ती प्रोफाइल</div>
          ${infoRow('शहरी जनसंख्या (2026)', fmtLakh(d.population?.urbanPop || 0))}
          ${infoRow('नगर निकाय', fmt(d.meta?.ulbCount || 0))}
          ${infoRow('शहरी वार्ड', fmt(d.meta?.wardCount || 0))}
          ${infoRow('सबसे बड़ा ULB', escapeHtml(largestUlb))}
          ${infoRow('औसत वार्ड जनसंख्या', avgWardPopulation ? `~${fmt(avgWardPopulation)}` : '—')}
        </div>
        ` : ''}
      </div>

      <div class="two-col metrics-row">
        <div class="info-panel">
          <div class="panel-title">प्रशासनिक प्रोफाइल</div>
          ${showRuralProfile && !showUrbanProfile ? `
            ${infoRow('जिला', district)}
            ${infoRow('चयनित स्तर', scopeLevel === 'gp' ? 'ग्राम पंचायत' : scopeLevel === 'block' ? 'विकास खंड' : 'जिला')}
            ${infoRow('चयनित इकाई', selectedScopeName)}
            ${scopeLevel === 'block' ? '' : infoRow('प्रशासनिक खंड', fmt(d.meta?.blockCount || 0))}
            ${infoRow('ग्राम पंचायतें', fmt(d.meta?.gpCount || 0))}
            ${infoRow('औसत GP क्षेत्र', avgGpArea ? `~${fmt(avgGpArea)} हे.` : '—')}
            ${infoRow('कुल भौगोलिक क्षेत्र', d.population?.totalAreaHectare ? `${fmt(d.population.totalAreaHectare)} हे.` : '—')}
          ` : !showRuralProfile && showUrbanProfile ? `
            ${infoRow('जिला', district)}
            ${infoRow('चयनित स्तर', scopeLevel === 'ward' ? 'शहरी वार्ड' : scopeLevel === 'ulb' ? 'नगर निकाय' : 'जिला')}
            ${infoRow('चयनित इकाई', selectedScopeName)}
            ${infoRow('नगर निकाय', fmt(d.meta?.ulbCount || 0))}
            ${infoRow('शहरी वार्ड', fmt(d.meta?.wardCount || 0))}
            ${infoRow('सबसे बड़ा ULB', largestUlb)}
            ${infoRow('औसत वार्ड जनसंख्या', avgWardPopulation ? `~${fmt(avgWardPopulation)}` : '—')}
          ` : `
            ${infoRow('जिला', district)}
            ${infoRow('प्रशासनिक खंड', fmt(d.meta?.blockCount || 0))}
            ${infoRow('ग्राम पंचायतें', fmt(d.meta?.gpCount || 0))}
            ${infoRow('नगर निकाय', fmt(d.meta?.ulbCount || 0))}
            ${infoRow('शहरी वार्ड', fmt(d.meta?.wardCount || 0))}
          `}
        </div>
        <div class="info-panel">
          <div class="panel-title">जनसांख्यिकी प्रोफाइल</div>
          ${infoRow('कुल नागरिक', fmtLakh(totalPopulation))}
          ${infoRow('पुरुष', fmt(malePopulation))}
          ${infoRow('महिला', fmt(femalePopulation))}
          ${infoRow('लिंग अनुपात (प्रति 1000)', sexRatio)}
          ${infoRow('बच्चे 0-6 वर्ष', fmt(d.population?.children06 || 0))}
          ${infoRow('स्कूली आयु 6-14', fmt(d.population?.children614 || 0))}
          ${infoRow('वरिष्ठ नागरिक (60+)', fmt(d.population?.seniors || 0))}
          ${infoRow('BPL परिवार', fmt(d.population?.bplFamilies || 0))}
          ${infoRow('PwD जनसंख्या', fmt(d.population?.pwd || 0))}
          ${showRuralProfile ? infoRow('पक्का आवास कवरेज', `${puccaPct}%`) : ''}
        </div>
      </div>

      <div class="bottom-note-box">${escapeHtml(showRuralProfile && !showUrbanProfile
        ? `${district} जिले की ग्रामीण बस्ती संरचना में ${fmt(d.meta?.gpCount || 0)} ग्राम पंचायतें और ${fmt(d.meta?.blockCount || 0)} प्रशासनिक खंड हैं। कृषि, पशुधन एवं सेवा पहुंच के बीच स्पष्ट संबंध दृष्टिगत होता है।`
        : !showRuralProfile && showUrbanProfile
          ? `${district} जिले की शहरी बस्ती संरचना में ${fmt(d.meta?.wardCount || 0)} वार्ड और ${fmt(d.meta?.ulbCount || 0)} नगर निकाय हैं। घनत्व, सेवा पहुंच और अवसंरचना संतृप्ति के क्षेत्र में नियोजन मांग स्पष्ट है।`
          : `${district} जिले की मिश्रित बस्ती संरचना में ग्रामीण एवं शहरी दोनों इकाइयां सम्मिलित हैं; इसलिए नियोजन में सेवाओं की पहुंच और अवसंरचना संतुलन दोनों पर समान ध्यान आवश्यक है।`)}</div>
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

    const getAspirationsForSector = (aspirations: any[], includeKeywords: readonly string[], maxRows = 4) => {
      if (!aspirations || aspirations.length === 0) return [];
      const includeKw = includeKeywords.map((keyword) => keyword.toLowerCase());
      const filtered = aspirations.filter((a) => {
        const sectorText = [a.sector || '', a.dept || '', a.item || '', a.sector_hi || '', a.indicator_hi || ''].join(' ').toLowerCase();
        return includeKw.some((keyword) => sectorText.includes(keyword));
      });
      filtered.sort((a: any, b: any) => {
        const statusOrder: Record<string, number> = { FUNDED: 0, ACCEPT: 1, REVIEW: 2 };
        const statusDiff = (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3);
        if (statusDiff !== 0) return statusDiff;
        return (Number(a.priority) || 99) - (Number(b.priority) || 99);
      });
      return filtered.slice(0, maxRows);
    };

    const renderAspirationRows = (aspirations: any[]) => {
      console.log('[renderAspirationRows] count:', aspirations?.length);
      if (!aspirations || aspirations.length === 0) {
        return `<tr><td colspan="7" style="text-align:center; color:#94a3b8; padding:16px; font-style:italic; font-family:'Noto Sans Devanagari',sans-serif;">इस क्षेत्र के लिए कोई स्वीकृत आकांक्षा उपलब्ध नहीं है</td></tr>`;
      }

      return aspirations.map((aspiration) => `
        <tr>
          <td>
            <div style="font-weight:700; color:#1a1a2e; font-family:'Noto Sans Devanagari',sans-serif;">${escapeHtml(aspiration.item || '—')}</div>
            <div style="font-size:10px; color:#64748b; margin-top:2px; font-family:'Inter',sans-serif;">${escapeHtml(aspiration.dept || aspiration.sector || '')}</div>
          </td>
          <td style="text-align:center;">
            <span class="priority-badge ${Number(aspiration.priority) <= 2 ? 'p1' : 'p2'}">P-${escapeHtml(aspiration.priority || '—')}</span>
          </td>
          <td style="text-align:center; font-family:'Inter',sans-serif; font-weight:700; font-size:11px; max-width:80px; word-break:break-word;">
            ${escapeHtml(
              aspiration.area_type === 'Urban'
                ? (aspiration.ward || aspiration.city || '—')
                : (aspiration.gram_panchayat || '—')
            )}
          </td>
          <td style="font-family:'Inter',sans-serif;">${escapeHtml(aspiration.qty_2030 ?? '—')}</td>
          <td style="font-family:'Inter',sans-serif;">${escapeHtml(aspiration.qty_2035 ?? '—')}</td>
          <td style="font-family:'Inter',sans-serif;">${escapeHtml(aspiration.qty_2047 ?? '—')}</td>
          <td>
            <span class="status-badge ${aspiration.status === 'FUNDED' ? 'active' : aspiration.status === 'ACCEPT' ? 'ready' : 'proposal'}">${escapeHtml(aspiration.status || '—')}</span>
            <div style="color:#1a1a2e; font-size:11px; line-height:1.5; font-family:'Noto Sans Devanagari',sans-serif; margin-top:4px;">
              ${escapeHtml([
                aspiration.area_type === 'Urban'
                  ? (aspiration.ward ? `${aspiration.ward} वार्ड में` : aspiration.city ? `${aspiration.city} में` : '')
                  : (aspiration.gram_panchayat ? `${aspiration.gram_panchayat} में` : aspiration.village ? `${aspiration.village} में` : ''),
                aspiration.scheme ? `योजना: ${aspiration.scheme}` : '',
                aspiration.fast_track ? 'Fast-track' : ''
              ].filter(Boolean).join(' · '))}
            </div>
            ${aspiration.scheme ? `<div style="margin-top:4px;"><span class="scheme-tag">${escapeHtml(aspiration.scheme)}</span></div>` : ''}
            ${aspiration.fast_track ? `<div style="margin-top:2px;"><span class="scheme-tag" style="background:#92400e; color:#fff;">⚡ Fast-track</span></div>` : ''}
            ${aspiration.status === 'FUNDED' ? `<div style="margin-top:2px;"><span class="scheme-tag" style="background:#14532d; color:#fff;">✓ Funded</span></div>` : ''}
            ${aspiration.total_budget ? `<div style="font-size:10px; color:#64748b; margin-top:2px; font-family:'Inter',sans-serif;">₹${(Number(aspiration.total_budget) / 10000000).toFixed(1)} Cr</div>` : ''}
          </td>
        </tr>
      `).join('');
    };

    const sectorPages = isRural ? [
      {
        pageNo: '03', groupNo: '01', totalGroups: '04',
        titleHi: 'जन एवं समाज',
        titleEn: 'People & Society — स्वास्थ्य, शिक्षा, आंगनवाड़ी, सामाजिक सशक्तिकरण',
        band: 'group-blue',
        aspirationLabel: 'स्वास्थ्य · शिक्षा · पोषण · सामाजिक सशक्तिकरण',
        cards: [
          { value: fmt(d.education?.totalSchools || 0) !== '0' ? fmt(d.education?.totalSchools || 0) : fmt(Number(d.education?.govtSchools || 0) + Number(d.education?.pvtSchools || 0)), label: 'विद्यालय (कुल)', sub: `${fmt(d.education?.govtSchools || 0)} राजकीय + ${fmt(d.education?.pvtSchools || 0)} निजी` },
          { value: fmt(d.health?.awcCenters || 0), label: 'आंगनवाड़ी केंद्र', sub: `${fmt(d.meta?.blockCount || 0)} blocks में` },
          { value: Number(d.health?.allopathicCenters || 0) + Number(d.health?.ayushCenters || 0) > 0 ? fmt(Number(d.health?.allopathicCenters || 0) + Number(d.health?.ayushCenters || 0)) : fmt(d.health?.allopathicCenters || 0), label: 'स्वास्थ्य केंद्र', sub: 'SHC · CHC · PHC सहित' },
          { value: fmt(d.economy?.activeShgs || 0), label: 'सक्रिय SHG', sub: `+ ${fmt(d.economy?.lakhpatiDidis || 0)} लखपति दीदी` },
          { value: fmtLakh(Number(d.health?.ayushmanBen || 0) + Number(d.health?.urbanAyushman || 0)), label: 'CM Ayushman कवरेज', sub: 'लाभार्थी नागरिक' },
          { value: fmt(d.health?.samChildren || 0), label: 'SAM बच्चे', sub: 'POSHAN 2.0 cohort' },
          { value: fmt(d.health?.ashaWorkers || 0), label: 'ASHA कार्यकर्ता', sub: 'अंतिम-छोर स्वास्थ्य दल' },
          { value: fmt(Number(d.social?.widowPensioners || 0) + Number(d.social?.urbanWidow || 0)), label: 'विधवा पेंशन', sub: 'सामाजिक सुरक्षा' },
        ],
        narrative: [n.sectorNarratives?.health, n.sectorNarratives?.education, n.sectorNarratives?.socialWelfare].filter(Boolean).join(' '),
        aspirationKeywords: [...SECTOR_KEYWORDS.health, ...SECTOR_KEYWORDS.education, ...SECTOR_KEYWORDS.social] as readonly string[],
        summaryText: `समूह 1 का दायरा — जन एवं समाज। ${fmt(d.education?.totalSchools || 0)} विद्यालय, ${fmt(d.health?.awcCenters || 0)} AWC केंद्र, ${fmt(Number(d.health?.allopathicCenters || 0) + Number(d.health?.ayushCenters || 0))} स्वास्थ्य केंद्र और ${fmt(d.economy?.activeShgs || 0)} सक्रिय SHG — ${d.meta?.district || ''} जिले की मानव विकास नींव को दर्शाते हैं। NHM, POSHAN, Samagra Shiksha और SRLM के अभिसरण से 2030 तक व्यापक सुधार संभव है।`,
      },
      {
        pageNo: '04', groupNo: '02', totalGroups: '04',
        titleHi: 'आजीविका एवं अर्थव्यवस्था',
        titleEn: 'Livelihood & Economy — कृषि, पशुपालन, उद्योग, पर्यटन',
        band: 'group-rust',
        aspirationLabel: 'कृषि · पशुपालन · उद्योग · पर्यटन',
        cards: [
          { value: fmtLakh(d.agriculture?.totalFarmers || 0), label: 'कुल किसान', sub: `ग्रामीण जनसंख्या का ${d.population?.total > 0 ? ((Number(d.agriculture?.totalFarmers || 0) / Number(d.population?.total)) * 100).toFixed(1) : '—'}%` },
          { value: fmtLakh(d.agriculture?.cultivableHa || 0), label: 'कृषि भूमि', sub: 'हेक्टेयर · कृषि-योग्य' },
          { value: fmtLakh(d.agriculture?.irrigatedHa || 0), label: 'सिंचित क्षेत्र', sub: `कृषि भूमि का ${fmtPct(d.agriculture?.irrigationPct)}` },
          { value: fmtLakh(d.dairy?.totalLivestock || 0), label: 'कुल पशुधन', sub: `${(Number(d.dairy?.totalLivestock || 0) / Math.max(Number(d.agriculture?.totalFarmers || 1), 1)).toFixed(1)} प्रति किसान` },
          { value: fmtLakh(d.dairy?.dailyMilkLpd || 0), label: 'दैनिक दुग्ध उत्पादन', sub: 'cooperative-grade क्षमता' },
          { value: fmtLakh(d.agriculture?.kccHolders || 0), label: 'KCC धारक', sub: 'ऋण-संबद्ध किसान' },
          { value: fmtLakh(d.agriculture?.pmKisan || 0), label: 'PM-KISAN नामांकन', sub: `किसानों का ${d.agriculture?.totalFarmers > 0 ? ((Number(d.agriculture?.pmKisan || 0) / Number(d.agriculture?.totalFarmers)) * 100).toFixed(1) : '—'}%` },
          { value: fmt(d.economy?.artisans || 0), label: 'स्थानीय कारीगर', sub: 'ग्रामीण + शहरी' },
        ],
        narrative: [n.sectorNarratives?.agriculture, n.sectorNarratives?.dairy, n.sectorNarratives?.economy, n.sectorNarratives?.tourism].filter(Boolean).join(' '),
        aspirationKeywords: [...SECTOR_KEYWORDS.agriculture, ...SECTOR_KEYWORDS.dairy, ...SECTOR_KEYWORDS.economy, ...SECTOR_KEYWORDS.tourism] as readonly string[],
        summaryText: `समूह 2 का दायरा — आजीविका एवं अर्थव्यवस्था। ${fmtLakh(d.agriculture?.totalFarmers || 0)} किसान, ${fmtPct(d.agriculture?.irrigationPct)} सिंचाई दर, ${fmtLakh(d.dairy?.dailyMilkLpd || 0)} LPD दुग्ध उत्पादन और ${fmtLakh(d.agriculture?.kccHolders || 0)} KCC धारक — जिले की कृषि-अर्थव्यवस्था की नींव हैं। PMKSY, KCC, RCDF और SRLM के माध्यम से 2030 तक उत्पादकता में उल्लेखनीय वृद्धि संभव है।`,
      },
      {
        pageNo: '05', groupNo: '03', totalGroups: '04',
        titleHi: 'मूलभूत संरचना',
        titleEn: 'Core Infrastructure — जल, सड़क, विद्युत, संचार एवं स्वच्छता',
        band: 'group-teal',
        aspirationLabel: 'जल · सड़क · विद्युत · स्वच्छता',
        cards: [
          { value: fmtKm(d.infrastructure?.roadKm || 0), label: 'ग्रामीण सड़क नेटवर्क', sub: 'सभी श्रेणियां' },
          { value: fmtPct(d.water?.ruralFhtcAvg), label: 'FHTC (ग्रामीण)', sub: 'JJM Phase 2 inflow' },
          { value: fmtPct(d.water?.urbanFhtcAvg || 0), label: 'FHTC (शहरी)', sub: 'AMRUT linkages' },
          { value: fmt(d.population?.totalFamilies || 0), label: 'ग्रामीण परिवार', sub: 'सेवा-क्षेत्र आधार' },
          { value: fmt(d.water?.overheadTanks || 0), label: 'OVERHEAD TANKS', sub: 'भंडारण अवसंरचना' },
          { value: fmt(d.infrastructure?.electricityHouses || 0), label: 'विद्युतीकृत परिवार', sub: `${d.population?.puccaHouses > 0 ? ((Number(d.infrastructure?.electricityHouses || 0) / (Number(d.population?.puccaHouses || 1) + Number(d.population?.kutchaHouses || 1))) * 100).toFixed(1) : '—'}% ग्रामीण HH` },
          { value: fmt(d.infrastructure?.publicToilets || 0), label: 'सार्वजनिक शौचालय', sub: 'community + public' },
          { value: `${fmt(d.infrastructure?.govtBanks || 0)} · ${fmt(d.infrastructure?.postOffices || 0)}`, label: 'बैंक · डाकघर', sub: 'अंतिम-छोर वित्त + डाक' },
        ],
        narrative: [n.sectorNarratives?.water, n.sectorNarratives?.infrastructure].filter(Boolean).join(' '),
        aspirationKeywords: [...SECTOR_KEYWORDS.water, ...SECTOR_KEYWORDS.infrastructure] as readonly string[],
        summaryText: `समूह 3 का दायरा — मूलभूत संरचना। ${fmtPct(d.water?.ruralFhtcAvg)} ग्रामीण FHTC, ${fmt(d.infrastructure?.electricityHouses || 0)} विद्युतीकृत परिवार, ${fmtKm(d.infrastructure?.roadKm || 0)} सड़क नेटवर्क और ${fmt(d.water?.overheadTanks || 0)} ओवरहेड टैंक — जिले की आधारभूत संरचना को परिभाषित करते हैं। JJM Phase 2, PMGSY और 15th FC के समन्वय से 2030 तक सार्वभौमिक कवरेज सुनिश्चित किया जा सकता है।`,
      },
      {
        pageNo: '06', groupNo: '04', totalGroups: '04',
        titleHi: 'पर्यावरण एवं विरासत',
        titleEn: 'Environment & Heritage — वन, सांस्कृतिक धरोहर, शासन एवं ई-गवर्नेंस',
        band: 'group-brown',
        aspirationLabel: 'वन · विरासत · शासन · निगरानी',
        cards: [
          { value: fmtLakh(d.environment?.forestHa || 0), label: 'संरक्षित वन', sub: 'हेक्टेयर · अभयारण्य सहित' },
          { value: fmtLakh(d.environment?.pastureHa || 0), label: 'चरागाह भूमि', sub: 'सामुदायिक commons' },
          { value: fmt(d.tourism?.heritageSites || 0), label: 'धार्मिक/सांस्कृतिक स्थल', sub: `${fmt(d.meta?.gpCount || 0)} GPs में` },
          { value: fmt(d.tourism?.annualFairs || 0), label: 'धार्मिक मेले', sub: 'प्रति वर्ष · जिला-व्यापी' },
          { value: fmt(d.environment?.biogasPlants || 0), label: 'Biogas Plants', sub: 'नवीकरणीय ऊर्जा' },
          { value: fmt(d.governance?.distEmitraKm ? `${Number(d.governance.distEmitraKm).toFixed(1)} km` : '—'), label: 'ई-मित्र दूरी (औसत)', sub: `${fmt(d.meta?.gpCount || 0)} GPs का औसत` },
          { value: fmt(d.environment?.govtCompostPits || 0), label: 'सरकारी नर्सरी/कॉम्पोस्ट', sub: 'waste processing' },
          { value: fmt(d.environment?.suryaGharHomes || 0), label: 'PM Surya Ghar', sub: 'solar homes' },
        ],
        narrative: [n.sectorNarratives?.environment, n.sectorNarratives?.governance, n.sectorNarratives?.tourism].filter(Boolean).join(' '),
        aspirationKeywords: [...SECTOR_KEYWORDS.environment, ...SECTOR_KEYWORDS.governance, ...SECTOR_KEYWORDS.tourism] as readonly string[],
        summaryText: `समूह 4 का दायरा — पर्यावरण एवं विरासत। ${fmtLakh(d.environment?.forestHa || 0)} हेक्टेयर वन, ${fmt(d.tourism?.heritageSites || 0)} सांस्कृतिक स्थल, ${fmt(d.tourism?.annualFairs || 0)} वार्षिक मेले और ई-मित्र नेटवर्क — जिले की पारिस्थितिक तथा सांस्कृतिक पहचान बनाते हैं। Green Rajasthan, CAMPA और Swadesh Darshan 2.0 के माध्यम से दीर्घकालिक स्थिरता सुनिश्चित होगी।`,
      },
    ] : [
      {
        pageNo: '03', groupNo: '01', totalGroups: '04',
        titleHi: 'जन एवं समाज',
        titleEn: 'People & Society — स्वास्थ्य, शिक्षा, आंगनवाड़ी, सामाजिक सशक्तिकरण',
        band: 'group-blue',
        aspirationLabel: 'स्वास्थ्य · शिक्षा · पोषण · सामाजिक सशक्तिकरण',
        cards: [
          { value: fmt(Number(d.education?.govtSchools || 0) + Number(d.education?.pvtSchools || 0)) || fmt(d.education?.totalSchools || 0), label: 'विद्यालय (कुल)', sub: `${fmt(d.education?.govtSchools || 0)} राजकीय + ${fmt(d.education?.pvtSchools || 0)} निजी` },
          { value: fmt(d.health?.awcCenters || 0), label: 'आंगनवाड़ी केंद्र', sub: 'ICDS नेटवर्क' },
          { value: fmt(Number(d.health?.allopathicCenters || 0) + Number(d.health?.ayushCenters || 0) + Number(d.health?.privateHealthCenters || 0)), label: 'स्वास्थ्य केंद्र', sub: 'Allopathic + AYUSH + निजी' },
          { value: fmt(d.economy?.activeShgs || 0), label: 'सक्रिय SHG', sub: 'महिला समूह' },
          { value: fmtLakh(d.health?.urbanAyushman || d.health?.ayushmanBen || 0), label: 'Ayushman कवरेज', sub: 'शहरी लाभार्थी' },
          { value: fmt(d.health?.samChildren || 0), label: 'SAM बच्चे', sub: 'POSHAN 2.0' },
          { value: fmt(d.health?.ashaWorkers || 0), label: 'ASHA कार्यकर्ता', sub: 'अंतिम-छोर दल' },
          { value: fmt(d.education?.enrolledStudents || 0), label: 'नामांकित छात्र', sub: 'विद्यालय नामांकन' },
        ],
        narrative: [n.sectorNarratives?.health, n.sectorNarratives?.education, n.sectorNarratives?.socialWelfare].filter(Boolean).join(' '),
        aspirationKeywords: [...SECTOR_KEYWORDS.health, ...SECTOR_KEYWORDS.education, ...SECTOR_KEYWORDS.social] as readonly string[],
        summaryText: `समूह 1 का दायरा — जन एवं समाज। ${fmt(d.education?.totalSchools || 0)} विद्यालय, ${fmt(d.health?.awcCenters || 0)} AWC केंद्र और ${fmt(d.economy?.activeShgs || 0)} SHG — शहरी मानव विकास की आधारशिला हैं। NHM, POSHAN और Samagra Shiksha के समन्वय से 2030 तक सार्वभौमिक सेवा कवरेज संभव है।`,
      },
      {
        pageNo: '04', groupNo: '02', totalGroups: '04',
        titleHi: 'आजीविका एवं अर्थव्यवस्था',
        titleEn: 'Urban Livelihood & Economy — उद्योग, कारीगर, SHG, पर्यटन',
        band: 'group-rust',
        aspirationLabel: 'उद्योग · SHG · कारीगर · पर्यटन',
        cards: [
          { value: fmt(d.economy?.activeShgs || 0), label: 'सक्रिय SHG', sub: 'महिला स्वयं सहायता समूह' },
          { value: fmt(d.economy?.artisans || 0), label: 'स्थानीय कारीगर', sub: 'शिल्प आधार' },
          { value: fmt(d.economy?.largeIndustrialUnits || Number(d.economy?.urbanIndustries || 0)), label: 'बड़े उद्योग', sub: 'औद्योगिक इकाइयां' },
          { value: fmt(d.economy?.smallScaleIndustries || 0), label: 'लघु उद्योग', sub: 'MSME क्षेत्र' },
          { value: fmt(d.economy?.lakhpatiDidis || 0), label: 'लखपति दीदी', sub: 'महिला उद्यमी' },
          { value: fmt(d.tourism?.trainedGuides || 0), label: 'प्रशिक्षित गाइड', sub: 'पर्यटन कार्यबल' },
          { value: fmt(d.tourism?.fairEmployment || 0), label: 'SHG संचालित स्टॉल', sub: 'पर्यटन रोज़गार' },
          { value: fmt(d.social?.ujjwalaBen || 0), label: 'Ujjwala लाभार्थी', sub: 'स्वच्छ ईंधन' },
        ],
        narrative: [n.sectorNarratives?.economy, n.sectorNarratives?.tourism].filter(Boolean).join(' '),
        aspirationKeywords: [...SECTOR_KEYWORDS.economy, ...SECTOR_KEYWORDS.tourism] as readonly string[],
        summaryText: `समूह 2 का दायरा — शहरी आजीविका एवं अर्थव्यवस्था। ${fmt(d.economy?.activeShgs || 0)} SHG, ${fmt(d.economy?.artisans || 0)} कारीगर और ${fmt(Number(d.economy?.largeIndustrialUnits || 0) + Number(d.economy?.smallScaleIndustries || 0))} औद्योगिक इकाइयां — शहरी आर्थिक इंजन को परिभाषित करती हैं। SRLM, MSME और पर्यटन के माध्यम से उद्यम विकास का मार्ग प्रशस्त हो सकता है।`,
      },
      {
        pageNo: '05', groupNo: '03', totalGroups: '04',
        titleHi: 'मूलभूत संरचना',
        titleEn: 'Core Infrastructure — जल, सड़क, विद्युत, स्वच्छता',
        band: 'group-teal',
        aspirationLabel: 'जल · सड़क · विद्युत · स्वच्छता',
        cards: [
          { value: fmtPct(d.water?.urbanFhtcAvg), label: 'FHTC (शहरी)', sub: 'AMRUT linkages' },
          { value: fmt(d.water?.overheadTanks || 0), label: 'OVERHEAD TANKS', sub: 'जल भंडारण' },
          { value: fmt(d.infrastructure?.publicToilets || 0), label: 'कार्यशील शौचालय', sub: 'सार्वजनिक सुविधाएं' },
          { value: fmt(d.infrastructure?.electricityHouses || 0), label: 'विद्युत कनेक्शन', sub: 'शहरी घर' },
          { value: fmt(d.infrastructure?.govtBanks || 0), label: 'सरकारी बैंक', sub: 'वित्तीय पहुंच' },
          { value: fmt(d.infrastructure?.privateBanks || 0), label: 'निजी बैंक', sub: 'वित्तीय पहुंच' },
          { value: fmtKm(d.infrastructure?.roadKm || 0), label: 'सड़क नेटवर्क', sub: 'किमी' },
          { value: fmt(d.infrastructure?.solarHomes || 0), label: 'सौर ऊर्जा घर', sub: 'नवीकरणीय ऊर्जा' },
        ],
        narrative: [n.sectorNarratives?.water, n.sectorNarratives?.infrastructure].filter(Boolean).join(' '),
        aspirationKeywords: [...SECTOR_KEYWORDS.water, ...SECTOR_KEYWORDS.infrastructure] as readonly string[],
        summaryText: `समूह 3 का दायरा — शहरी मूलभूत संरचना। ${fmtPct(d.water?.urbanFhtcAvg)} FHTC, ${fmt(d.infrastructure?.electricityHouses || 0)} विद्युत कनेक्शन और ${fmt(d.infrastructure?.publicToilets || 0)} कार्यशील शौचालय — शहरी जीवन गुणवत्ता की नींव हैं। AMRUT 2.0, PMGSY और SBM Phase 2 के समन्वय से 2030 तक सार्वभौमिक पहुंच संभव है।`,
      },
      {
        pageNo: '06', groupNo: '04', totalGroups: '04',
        titleHi: 'पर्यावरण एवं विरासत',
        titleEn: 'Environment & Heritage — पर्यावरण, शासन, ई-गवर्नेंस',
        band: 'group-brown',
        aspirationLabel: 'पर्यावरण · विरासत · शासन · निगरानी',
        cards: [
          { value: fmt(d.environment?.housesWithoutToilets || 0), label: 'शौचालय रहित घर', sub: 'स्वच्छता अंतराल' },
          { value: fmt(d.environment?.govtCompostPits || 0), label: 'कॉम्पोस्ट पिट', sub: 'कचरा प्रबंधन' },
          { value: fmt(d.environment?.govtNurseries || 0), label: 'सरकारी नर्सरी', sub: 'हरित पहल' },
          { value: fmt(d.environment?.nurserySaplingsAvailable || 0), label: 'नर्सरी पौधे', sub: 'उपलब्ध पौधे' },
          { value: fmt(d.tourism?.heritageSites || 0), label: 'सांस्कृतिक स्थल', sub: 'पर्यटन संसाधन' },
          { value: fmt(d.tourism?.avgFairFootfallDaily || d.tourism?.dailyFootfall || 0), label: 'मेले में आगंतुक/दिन', sub: 'पर्यटन प्रवाह' },
          { value: fmtKm(d.governance?.distEmitraKm || d.governance?.urbanEmitraKm || 0), label: 'ई-मित्र दूरी', sub: 'डिजिटल पहुंच' },
          { value: fmtKm(d.governance?.distPoliceKm || d.governance?.urbanPoliceKm || 0), label: 'थाना दूरी', sub: 'सुरक्षा पहुंच' },
        ],
        narrative: [n.sectorNarratives?.environment, n.sectorNarratives?.governance, n.sectorNarratives?.tourism].filter(Boolean).join(' '),
        aspirationKeywords: [...SECTOR_KEYWORDS.environment, ...SECTOR_KEYWORDS.governance, ...SECTOR_KEYWORDS.tourism] as readonly string[],
        summaryText: `समूह 4 का दायरा — शहरी पर्यावरण एवं विरासत। ${fmt(d.environment?.govtNurseries || 0)} सरकारी नर्सरी, ${fmt(d.tourism?.heritageSites || 0)} सांस्कृतिक स्थल और ई-मित्र नेटवर्क — शहरी पारिस्थितिकी एवं डिजिटल शासन की पहचान हैं। SBM, Swadesh Darshan 2.0 और DoIT&C के माध्यम से दीर्घकालिक स्थिरता बनेगी।`,
      },
    ];

    const totalPages = sectorPages.length + 3;

    const thematicPages = sectorPages.map((page) => {
      const dynamicPageNo = `${page.pageNo} / ${String(totalPages).padStart(2, '0')}`;
      const aspirations = getAspirationsForSector(d.aspirations || [], page.aspirationKeywords, 8);
      const cardsHtml = page.cards.map((card) => metricCard(card.value, card.label, card.sub)).join('');
      const rowsHtml = renderAspirationRows(aspirations);

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
            <div class="group-band-asp">${aspirations.length > 0 ? `${aspirations.length} आकांक्षाएं · 2030 तक हस्तक्षेप` : page.aspirationLabel}</div>
            <div class="group-sector-strip">
              ${page.aspirationLabel.split(' · ').map((s) => `<span class="group-sector-chip">${escapeHtml(s)}</span>`).join('')}
            </div>
          </div>
        </div>

        <div class="group-section-head">
          <div class="section-kicker">वर्तमान स्थिति · BASELINE</div>
          <div class="section-note">${escapeHtml(page.titleEn.split(' — ')[1] || page.titleEn)} — प्रमुख संकेतक</div>
        </div>

        <div class="kpi-grid-4x2">${cardsHtml}</div>

        <div class="section-copy" style="margin-top:16px; font-family:'Noto Sans Devanagari',sans-serif;">
          ${escapeHtml(page.narrative || '')}
        </div>

        <div class="asp-head">
          <div class="section-kicker">सामुदायिक आकांक्षाएँ · COMMUNITY ASPIRATIONS</div>
          <div class="section-note">norm-validated · माँग मात्रा अनुसार</div>
        </div>

        <table class="aspirations-table">
          <thead>
            <tr>
              <th>आकांक्षा</th>
              <th>प्राथमिकता</th>
              <th>ग्रा.प./वार्ड</th>
              <th>2030 तक</th>
              <th>2030-35</th>
              <th>2035-47</th>
              <th>माँग संदर्भ</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>

        <div class="summary-box">
          <div class="summary-box-arrow">›</div>
          <div class="summary-box-text" style="font-family:'Noto Sans Devanagari',sans-serif;">
            ${page.summaryText}
          </div>
        </div>
      `, 'thematic-page');
    }).join('');

    const strategicRows = [
      {
        indicator: 'FHTC · ग्रामीण',
        current: fmtPct(d.water?.ruralFhtcAvg),
        phase1: `+${Math.max(0, 100 - Number(d.water?.ruralFhtcAvg || 0)).toFixed(0)} connections (JJM Phase 2)`,
        phase2: 'Additional saturation & quality upgrades',
        phase2047: '100% ग्रामीण FHTC',
      },
      {
        indicator: 'FHTC · शहरी',
        current: fmtPct(d.water?.urbanFhtcAvg),
        phase1: `${fmt(d.meta?.ulbCount || 0)} ULBs AMRUT 2.0`,
        phase2: 'सीवरेज चक्र पूर्ण',
        phase2047: 'सार्वभौमिक जल + सीवरेज',
      },
      {
        indicator: 'पौधारोपण',
        current: fmt(d.environment?.govtNurseries || 0) + ' सरकारी नर्सरी',
        phase1: `${fmt(Math.max(Number(d.environment?.govtNurseries || 0), 1) * 10)} लाख पौधे`,
        phase2: `${fmt(Math.max(Number(d.environment?.govtNurseries || 0), 1) * 20)} लाख अतिरिक्त`,
        phase2047: 'हरित जिला नेटवर्क',
      },
      {
        indicator: 'Solar Pump घनत्व',
        current: fmt(d.agriculture?.solarPumps || 0) + ' baseline installations',
        phase1: 'PM-KUSUM Phase-I',
        phase2: 'Additional solar units',
        phase2047: 'पूर्ण जिला कवरेज',
      },
      {
        indicator: 'ग्रामीण सड़क नेटवर्क',
        current: fmtKm(d.infrastructure?.roadKm || 0),
        phase1: 'PMGSY expansion',
        phase2: 'All-weather connectivity',
        phase2047: 'Universal last-mile access',
      },
      {
        indicator: 'डिजिटल शासन / e-Mitra',
        current: fmtKm(d.governance?.distEmitraKm || 0),
        phase1: 'Service point mapping',
        phase2: 'Integrated citizen services',
        phase2047: 'Paperless district',
      },
    ];

    const schemeRows = [
      ['जल एवं स्वच्छता', 'JJM / AMRUT 2.0', 'Tap + sewerage completion', 'सक्रिय'],
      ['कृषि एवं credit', 'PMKSY / KCC', 'Irrigation + credit saturation', 'योजना-तैयार'],
      ['आजीविका', 'SRLM / MSME', 'SHG + enterprise linkage', 'स्थल चयनित'],
      ['अवसंरचना', 'PMGSY / 15th FC', 'Road + sanitation linkage', 'सक्रिय'],
      ['पर्यावरण एवं विरासत', 'SBM / Swadesh Darshan 2.0', 'Nursery + heritage circuit', 'अवधारणा स्तर'],
    ] as const;

    const strategicPageNo = `${totalPages} / ${totalPages}`;
    const strategicPage = pageShell(`
      ${pageHeader(strategicPageNo, 'रणनीतिक विकास ढाँचा · विकसित राजस्थान 2047', 'Strategic Development Framework - Viksit Rajasthan 2047', `PAGE ${strategicPageNo} · रणनीतिक विकास ढाँचा`)}
      <div class="section-kicker">खंड 07</div>
      <h2 class="section-title">रणनीतिक विकास ढाँचा · विकसित राजस्थान 2047</h2>
      <div class="section-subtitle">Strategic Development Framework - Viksit Rajasthan 2047</div>

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

      <div class="master-summary">
        <div class="master-summary-head">जिला मास्टर प्लान सारांश</div>
        <div class="master-summary-body"><b>${escapeHtml(district)}</b> जिले का मास्टर प्लान आधारभूत डेटा, विषयगत आकांक्षाओं और योजना अभिसरण को एकीकृत नियोजन प्रणाली में जोड़ता है। <b>${fmtLakh(totalPopulation)}</b> नागरिकों, <b>${fmt(d.meta?.gpCount || 0)}</b> ग्राम पंचायतों / <b>${fmt(d.meta?.wardCount || 0)}</b> वार्ड और जिला-स्तरीय अवसंरचना अंतराल के आधार पर यह ढांचा FY 2026-27 से FY 2047 तक चरणबद्ध, मापनीय और सर्वे-सत्यापित विकास पथ प्रस्तुत करता है।</div>
      </div>

      <div class="footer-line">विकसित राजस्थान @ 2047 · RITI - Government of Rajasthan | Manthaan OS द्वारा संचालित · सर्वे-सत्यापित · ${escapeHtml(reportMonth)}</div>
    `, 'strategic-page');

    console.log('[Report Pages] cover:', !!coverPage, 'demographic:', !!demographicPage, 'thematic:', thematicPages.length, 'strategic:', !!strategicPage);

    const reportHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(district)} — Viksit Rajasthan 2047</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800;900&display=swap');
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
  body { margin: 0; background: #f1f5f9; color: var(--report-text); font-family: 'Inter', sans-serif; }
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
    font-family: 'Inter', sans-serif;
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
    font-family: 'Inter', sans-serif;
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
  .kpi-pill-sub { margin-top: 2px; font-size: 10px; color: #94a3b8; font-family: 'Inter', sans-serif; }
  .featured-box { background: var(--report-navy); color: white; border-radius: 16px; padding: 22px 24px 18px; margin: 14px 0 22px; }
  .featured-title { color: var(--report-orange); font-size: 12px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 14px; }
  .featured-body { font-family: 'Noto Sans Devanagari', sans-serif; font-size: 14px; line-height: 1.85; color: #e2e8f0; }
  .featured-body p { margin: 0 0 12px; }
  .featured-caption { margin-top: 10px; color: #94a3b8; font-size: 10px; font-family: 'Inter', sans-serif; }
  .cover-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 18px; }
  .stat-card { background: #f8fafc; border: 1px solid var(--report-border); border-left: 4px solid; border-radius: 12px; padding: 16px; min-height: 120px; }
  .stat-card-title { font-size: 12px; color: var(--report-muted); letter-spacing: 0.04em; text-transform: uppercase; font-weight: 800; }
  .stat-card-value { margin-top: 12px; font-size: 24px; font-weight: 900; color: var(--report-navy); line-height: 1.15; font-family: 'Inter', sans-serif; }
  .stat-card-note { margin-top: 6px; color: #475569; font-size: 12px; line-height: 1.6; font-family: 'Noto Sans Devanagari', sans-serif; }
  .footer-line { margin-top: 18px; color: #64748b; font-size: 11px; border-top: 1px solid var(--report-border); padding-top: 12px; font-family: 'Inter', sans-serif; }
  .section-kicker { color: var(--report-orange); font-size: 12px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; margin: 4px 0 8px; }
  .section-title { margin: 0; font-size: 30px; line-height: 1.08; color: var(--report-navy); font-weight: 900; font-family: 'Noto Sans Devanagari', sans-serif; }
  .section-subtitle { color: var(--report-muted); font-size: 13px; margin-top: 6px; font-weight: 600; font-family: 'Inter', sans-serif; }
  .section-copy { color: #334155; font-size: 14px; line-height: 1.85; margin-top: 14px; font-family: 'Noto Sans Devanagari', sans-serif; }
  .kpi-grid-5 { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; margin: 18px 0 18px; }
  .kpi-grid-5 .kpi-pill { min-width: 0; width: 100%; padding: 10px 8px; overflow: visible; }
  .kpi-grid-5 .kpi-pill-value { font-size: 15px; overflow: visible; text-overflow: unset; white-space: normal; word-break: break-word; line-height: 1.3; }
  .kpi-grid-5 .kpi-pill-sub { overflow: visible; text-overflow: unset; white-space: normal; word-break: break-word; font-size: 9px; }
  .kpi-grid-4x2 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 16px; }
  .metric-card { background: var(--report-card-bg); border: 1px solid var(--report-border); border-radius: 10px; padding: 14px 12px; min-height: 112px; overflow: hidden; }
  .metric-value { font-size: 23px; font-weight: 900; color: var(--report-navy); line-height: 1.1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
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
  .info-row span:last-child { color: #1a1a2e; font-weight: 700; font-family: 'Inter', sans-serif; text-align: right; flex-shrink: 0; white-space: nowrap; }
  .metrics-row { align-items: start; }
  .bottom-note-box { margin-top: 18px; background: #f8fafc; border-left: 4px solid var(--report-orange); border-radius: 12px; padding: 14px 16px; color: #334155; font-size: 13px; line-height: 1.8; font-family: 'Noto Sans Devanagari', sans-serif; }
  .group-band {
    margin: -40px -48px 22px;
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
  .group-band-subtitle { margin-top: 4px; font-size: 14px; opacity: 0.92; font-family: 'Inter', sans-serif; }
  .group-band-asp { margin-top: 10px; font-size: 13px; opacity: 0.92; line-height: 1.7; font-family: 'Noto Sans Devanagari', sans-serif; }
  .group-sector-strip { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
  .group-sector-chip { display: inline-flex; align-items: center; border-radius: 999px; padding: 4px 10px; background: rgba(255,255,255,0.14); color: #fff; font-size: 10px; font-weight: 800; letter-spacing: 0.04em; font-family: 'Inter', sans-serif; }
  .group-section-head, .asp-head, .scheme-map-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: 8px; }
  .section-note { color: var(--report-muted); font-size: 12px; font-weight: 600; font-family: 'Inter', sans-serif; text-align: right; }
  .aspirations-table, .strategic-table, .scheme-table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 12px; }
  .aspirations-table th, .strategic-table th, .scheme-table th { background: #f1f5f9; color: var(--report-muted); text-align: left; padding: 10px 10px; font-size: 11px; letter-spacing: 0.04em; text-transform: uppercase; border-bottom: 2px solid var(--report-border); }
  .aspirations-table td, .strategic-table td, .scheme-table td { border-bottom: 1px solid var(--report-border); padding: 10px; vertical-align: top; font-family: 'Noto Sans Devanagari', sans-serif; }
  .priority-badge { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 50%; font-size: 11px; font-weight: 900; font-family: 'Inter', sans-serif; }
  .priority-badge.p1 { background: var(--report-orange); color: white; }
  .priority-badge.p2 { border: 2px solid var(--report-orange); color: var(--report-orange); background: transparent; }
  .scheme-tag { display: inline-block; background: #1e293b; color: #94a3b8; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; font-family: 'Inter', sans-serif; margin: 2px 2px 2px 0; }
  .summary-box { background: #0f1f3d; border-radius: 12px; padding: 16px 18px; display: flex; gap: 14px; align-items: flex-start; margin-top: 16px; }
  .summary-box-arrow { width: 34px; height: 34px; border-radius: 50%; background: var(--report-orange); color: white; display: grid; place-items: center; font-size: 18px; flex: 0 0 auto; margin-top: 2px; }
  .summary-box-text { color: #e2e8f0; font-size: 13px; line-height: 1.7; font-family: 'Noto Sans Devanagari', sans-serif; }
  .master-summary { margin-top: 18px; background: var(--report-navy); border-radius: 14px; overflow: hidden; }
  .master-summary-head { padding: 12px 16px; background: var(--report-orange); color: white; font-weight: 800; font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; }
  .master-summary-body { padding: 16px; color: #e2e8f0; line-height: 1.8; font-size: 13px; font-family: 'Noto Sans Devanagari', sans-serif; }
  .status-badge { display: inline-flex; align-items: center; border-radius: 999px; padding: 4px 10px; font-size: 10px; font-weight: 800; font-family: 'Inter', sans-serif; }
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
            margin: 0 0 22px 0 !important;
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
    const generatedHtml = buildAlwarPdfReportHtml(scope, data, narrative);
    setGeneratedHtml(generatedHtml);
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
    <div style={{ paddingLeft: '24px' }}>
      <div className="pg-t">Report Library</div>
      <div className="pg-s">Generate AI-powered planning intelligence briefs — select District, Block, and GP or Ward level</div>
      
      <div className="rg" style={{ display: 'flex', flexDirection: 'column', maxWidth: '700px', margin: '0 auto' }}>
        <div className="rc">
          <div className="rh">
            <div className="rtag">Planning Report · Generate</div>
            <div className="rt">District / Block / GP · Ward Level</div>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            {(['rural', 'urban'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: '8px',
                  border: '1px solid',
                  borderColor: activeTab === tab ? '#E8620A' : '#334155',
                  background: activeTab === tab ? 'rgba(232,98,10,0.1)' : 'transparent',
                  color: activeTab === tab ? '#E8620A' : '#94a3b8',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                }}
              >
                {tab === 'rural' ? 'Rural (GP Level)' : 'Urban (Ward Level)'}
              </button>
            ))}
          </div>

          {activeTab === 'rural' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <select
                className="fs"
                value={ruralDistrict}
                onChange={(e) => handleRuralDistrictChange(e.target.value)}
                disabled={generating}
              >
                <option value="">1. District select karo...</option>
                {DISTRICTS_EN.map((district) => (
                  <option key={district} value={district}>{district}</option>
                ))}
              </select>

              {ruralDistrict && (
                <select
                  className="fs"
                  value={ruralBlock}
                  onChange={(e) => handleRuralBlockChange(e.target.value)}
                  disabled={generating || loadingBlocks}
                >
                  <option value="">{loadingBlocks ? 'Blocks load ho rahe hain...' : '2. Block select karo (optional)'}</option>
                  {ruralBlocks.map((block) => (
                    <option key={block} value={block}>{block}</option>
                  ))}
                </select>
              )}

              {ruralBlock && (
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="fs"
                    placeholder={loadingGps ? 'GPs load ho rahe hain...' : `3. GP search karo (${ruralGps.length} available)`}
                    value={gpSearch}
                    onChange={(e) => {
                      setGpSearch(e.target.value);
                      setRuralGpId(null);
                      setRuralGpName('');
                    }}
                    disabled={generating || loadingGps}
                    style={{ width: '100%' }}
                  />
                  {gpSearch && !ruralGpId && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', maxHeight: '200px', overflowY: 'auto', zIndex: 10 }}>
                      {ruralGps
                        .filter((gp) => gp.gram_panchayat.toLowerCase().includes(gpSearch.toLowerCase()))
                        .slice(0, 20)
                        .map((gp) => (
                          <div
                            key={gp.gp_id}
                            onClick={() => {
                              setRuralGpId(gp.gp_id);
                              setRuralGpName(gp.gram_panchayat);
                              setGpSearch(gp.gram_panchayat);
                            }}
                            style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '13px', color: '#e2e8f0', borderBottom: '1px solid #1e293b' }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#1e293b')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                          >
                            {gp.gram_panchayat}
                          </div>
                        ))}
                      {ruralGps.filter((gp) => gp.gram_panchayat.toLowerCase().includes(gpSearch.toLowerCase())).length === 0 && (
                        <div style={{ padding: '8px 12px', color: '#64748b', fontSize: '13px' }}>Koi GP nahi mila</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'urban' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <select
                className="fs"
                value={urbanDistrict}
                onChange={(e) => handleUrbanDistrictChange(e.target.value)}
                disabled={generating}
              >
                <option value="">1. District select karo...</option>
                {DISTRICTS_EN.map((district) => (
                  <option key={district} value={district}>{district}</option>
                ))}
              </select>

              {urbanDistrict && (
                <select
                  className="fs"
                  value={urbanUlb}
                  onChange={(e) => handleUrbanUlbChange(e.target.value)}
                  disabled={generating || loadingUlbs}
                >
                  <option value="">{loadingUlbs ? 'ULBs load ho rahe hain...' : '2. ULB select karo (optional)'}</option>
                  {urbanUlbs.map((ulb) => (
                    <option key={ulb} value={ulb}>{ulb}</option>
                  ))}
                </select>
              )}

              {urbanUlb && (
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="fs"
                    placeholder={loadingWards ? 'Wards load ho rahe hain...' : `3. Ward search karo (${urbanWards.length} available)`}
                    value={wardSearch}
                    onChange={(e) => {
                      setWardSearch(e.target.value);
                      setUrbanWardId(null);
                      setUrbanWardName('');
                    }}
                    disabled={generating || loadingWards}
                    style={{ width: '100%' }}
                  />
                  {wardSearch && !urbanWardId && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', maxHeight: '200px', overflowY: 'auto', zIndex: 10 }}>
                      {urbanWards
                        .filter((ward) => ward.ward.toLowerCase().includes(wardSearch.toLowerCase()))
                        .slice(0, 20)
                        .map((ward) => (
                          <div
                            key={ward.ward_id}
                            onClick={() => {
                              setUrbanWardId(ward.ward_id);
                              setUrbanWardName(ward.ward);
                              setWardSearch(ward.ward);
                            }}
                            style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '13px', color: '#e2e8f0', borderBottom: '1px solid #1e293b' }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#1e293b')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                          >
                            {ward.ward} — {ward.ulb}
                          </div>
                        ))}
                      {urbanWards.filter((ward) => ward.ward.toLowerCase().includes(wardSearch.toLowerCase())).length === 0 && (
                        <div style={{ padding: '8px 12px', color: '#64748b', fontSize: '13px' }}>Koi Ward nahi mila</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="rr" style={{ marginTop: '12px' }}>
            <span>Report scope</span>
            <span style={{ color: (ruralDistrict || urbanDistrict) ? '#E8620A' : '#64748b', fontSize: '12px' }}>
              {scopeLabel}
            </span>
          </div>
          <div className="rr">
            <span>Covers</span>
            <span>All 11 sectors</span>
          </div>

          {(ruralDistrict || urbanDistrict) && (
            <div className="rf">
              <button
                className="btn btn-ai"
                style={{ width: '100%', justifyContent: 'center', marginTop: '12px', opacity: generating ? 0.8 : 1 }}
                onClick={handleGenerateReport}
                disabled={generating}
              >
                {generating ? generatingLabel : 'Generate Planning Report'}
              </button>
            </div>
          )}
        </div>
      </div>

      {generatedHtml && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', flexDirection: 'column'
        }}>
          <div style={{ background: '#1A2744', padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'white', fontWeight: 'bold' }}>District Intelligence Brief: {scopeLabel}</span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  if (!generatedHtml) return;
                  const blob = new Blob([generatedHtml], { type: 'text/html;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  window.open(url, '_blank');
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                }}
                style={{ padding: '5px 15px', background: 'white', color: '#1A2744', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
              >
                Open in New Tab
              </button>
              <button 
                  onClick={() => {
                    const iframe = reportFrameRef.current;
                    if (!iframe || !iframe.contentWindow) return;

                    // Inject print-trigger script into iframe to ensure proper sizing
                    iframe.contentWindow.focus();

                    // Small delay to ensure iframe is fully rendered before print dialog
                    setTimeout(() => {
                      iframe.contentWindow?.print();
                    }, 300);
                  }}
                style={{ padding: '5px 15px', background: '#E85D04', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
              >
                Download as PDF
              </button>
              <button 
                onClick={() => setGeneratedHtml(null)}
                style={{ padding: '5px 15px', background: 'white', color: '#1B3A6B', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
              >
                Close
              </button>
            </div>
          </div>
          <iframe 
            key={generatedHtml?.length}
            ref={reportFrameRef}
            srcDoc={generatedHtml} 
            style={{ flex: 1, border: 'none', background: 'white' }} 
            title="Generated Report"
                  onLoad={() => {
                    // Ensure iframe content is accessible after load
                    try {
                      reportFrameRef.current?.contentWindow?.document?.body;
                    } catch (e) {
                      console.warn('iframe not ready yet');
                    }
                  }}
          />
        </div>
      )}
    </div>
  );
}
