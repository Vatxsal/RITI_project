'use client';

import { useState } from 'react';
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
          urbanFhtcAvg: '0',
        },
        agriculture: {
          cultivableHa: S(livelihood, 'cultivable_land_hectare'),
          irrigatedHa: S(livelihood, 'irrigated_area_hectare'),
          irrigationPct: S(livelihood, 'cultivable_land_hectare') > 0 ? ((S(livelihood, 'irrigated_area_hectare') / S(livelihood, 'cultivable_land_hectare')) * 100).toFixed(1) : 0,
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
          suryaGharHomes: S(environment, 'pm_surya_ghar_solar_houses'),
          wasteKgDay: S(environment, 'total_waste_daily_kg'),
          housesWithToilets: S(environment, 'houses_with_toilets'),
        },
        tourism: {
          heritageSites: S(tourism, 'cultural_assets_count'),
          annualFairs: S(tourism, 'annual_fairs_count'),
          dailyFootfall: S(tourism, 'avg_daily_footfall_cultural_sites'),
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
        tbPatients: S(uHealth, 'tb_patients_count'),
        anemicPregnant: S(uHealth, 'anemic_pregnant_women'),
        samChildren: S(uEducation, 'sam_children_count'),
        ashaWorkers: S(uEducation, 'asha_sahyogini_count'),
        awcCenters: S(uEducation, 'anganwadi_centers'),
        urbanHealthBeds: S(uHealth, 'health_center_beds'),
        urbanAyushman: S(uHealth, 'ayushman_arogya_beneficiaries'),
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
        urbanShgs: S(uEconomy, 'active_shg_count'),
        urbanIndustries: S(uEconomy, 'large_industrial_units') + S(uEconomy, 'small_scale_industries'),
      },
      infrastructure: {
        electricityHouses: S(uInfra, 'houses_with_electricity'),
        roadKm: S(uInfra, 'road_length_km'),
        streetLights: 0,
        govtBanks: S(uInfra, 'govt_banks_count'),
        postOffices: 0,
        publicToilets: S(uInfra, 'public_toilets_functional'),
        solarHomes: S(uInfra, 'solar_installed_houses'),
      },
      environment: {
        forestHa: 0,
        pastureHa: 0,
        biogasPlants: 0,
        suryaGharHomes: 0,
        wasteKgDay: 0,
        housesWithToilets: 0,
      },
      tourism: {
        heritageSites: 0,
        annualFairs: 0,
        dailyFootfall: S(uTourism, 'avg_fair_footfall_daily'),
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
  Write this entire report in Hinglish — a natural mix of Hindi and English that senior government officials and district-level officers in Rajasthan use daily. 
  Rules:
  - All headings, labels, section names stay in English (they are standard terms)
  - All narrative paragraphs, findings, descriptions, recommendations: write in Hinglish
  - Hinglish means: Hindi sentence structure with English technical/scheme terms mixed in naturally
  - Example of correct Hinglish: "Ajmer district mein irrigation rate 41.5% hai, jo state average se kaafi behtar hai. KCC penetration abhi 38% par hai, isme sudhaar ki zarurat hai. PMKSY scheme ke through sinchai coverage 2 saal mein 60% tak le jaana possible hai."
  - Example of WRONG style: full English paragraphs, or full Hindi with no English terms
  - Scheme names, KPI names, department names always in English: JJM, PMKSY, KCC, RCDF, SARAS, NHM, POSHAN, SRLM etc.
  - Numbers always in English digits
  - Keep sentences short and clear — these reports will be read by Collectors, BDOs, and senior officers
  - executiveSummary: Hinglish
  - findings[].finding: Hinglish | findings[].currentPosition: English metrics ok | findings[].opportunity: Hinglish
  - All sectorNarratives: Hinglish
  - priorityActions[].description: Hinglish
  - closingQuote: Hinglish — make it inspiring and grounded

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

EDUCATION: [NOTE: School/teacher/enrollment data not yet loaded in database. Only AWC/ASHA data available above.]

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

  // STEP 4 — Render the report in a new tab
  function renderReport(scope: any, data: any, narrative: any) {
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
        metrics: [
          { label: 'AWC Centers', value: d.education.awcCenters || d.health.awcCenters },
          { label: 'AWC Enrolled Children', value: d.education.anganwadiEnrolledChildren },
          { label: 'ASHA Workers', value: d.education.ashaWorkers || d.health.ashaWorkers },
          { label: 'SAM Children', value: d.education.samChildren || d.health.samChildren },
        ],
        pendingText: 'Data not yet loaded in CDO baseline',
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
    <div>
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
                {tab === 'rural' ? '🌾 Rural (GP Level)' : '🏙️ Urban (Ward Level)'}
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
          <div style={{ background: '#1B3A6B', padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'white', fontWeight: 'bold' }}>District Intelligence Brief: {scopeLabel}</span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => {
                  const newTab = window.open('', '_blank');
                  if (newTab) {
                    newTab.document.write(generatedHtml);
                    newTab.document.close();
                  } else {
                    alert('Popup blocked. Please allow popups for this site.');
                  }
                }}
                style={{ padding: '5px 15px', background: '#E8620A', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
              >
                Open in New Tab
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
            srcDoc={generatedHtml} 
            style={{ flex: 1, border: 'none', background: 'white' }} 
            title="Generated Report"
          />
        </div>
      )}
    </div>
  );
}
