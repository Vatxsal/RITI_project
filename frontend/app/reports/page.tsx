'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

const DISTRICTS_EN = [
  'Ajmer','Alwar','Balotara','Banswara','Baran','Barmer','Beawar',
  'Bharatpur','Bhilwara','Bikaner','Bundi','Chittorgarh','Churu',
  'Dausa','Deeg','Dholpur','Didwana-Kuchaman','Dungarpur','Hanumangarh',
  'Jaipur','Jaisalmer','Jalore','Jhalawar','Jhunjhunu','Jodhpur',
  'Karauli','Khairthal-Tijara','Kota','Kotputli-Behror','Nagaur',
  'Pali','Phalodi','Pratapgarh','Rajsamand','Salumbar','Sawai Madhopur',
  'Sikar','Sirohi','Sri Ganganagar','Tonk','Udaipur'
];

export default function ReportsPage() {
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatingLabel, setGeneratingLabel] = useState('');
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);

  const ALWAR_REPORT_PATH = '/reports/alwar-lok-sabha-brief-v2.pdf';

  function openAlwarReport() {
    window.open(ALWAR_REPORT_PATH, '_blank');
  }

  function downloadAlwarReport() {
    const link = document.createElement('a');
    link.href = ALWAR_REPORT_PATH;
    link.download = 'Alwar_Lok_Sabha_Planning_Brief_May2026.pdf';
    link.click();
  }

  // STEP 1 — Wire up the Generate button
  async function handleGenerateReport() {
    if (!selectedDistrict) {
      alert('Please select a district first');
      return;
    }
    
    // Show loading state on button
    setGenerating(true);
    setGeneratingLabel('Fetching baseline data...');
    
    try {
      const reportData = await fetchDistrictReportData(selectedDistrict);
      setGeneratingLabel('Generating AI narrative...');
      const narrative = await generateNarrative(reportData);
      setGeneratingLabel('Rendering report...');
      renderReport(selectedDistrict, reportData, narrative);
    } catch (err: any) {
      console.error(err);
      alert(`Report generation failed: ${err.message || 'Please try again.'}`);
    } finally {
      setGenerating(false);
      setGeneratingLabel('');
    }
  }

  // STEP 2 — Fetch all district data from Supabase
  async function fetchDistrictReportData(district: string) {
    // Get GP IDs
    const { data: gps } = await supabase
      .from('dim_rural_gps')
      .select('gp_id, gram_panchayat, block')
      .eq('district', district);
    
    if (!gps || gps.length === 0) throw new Error('No rural data found for this district');
    
    const gpIds = (gps as any[]).map(r => r.gp_id);
    const blocks = [...new Set((gps as any[]).map(r => r.block))].filter(Boolean);

    // Get Ward IDs using the English district column
    const { data: wards } = await supabase
      .from('dim_urban_wards')
      .select('ward_id, ward, ulb')
      .eq('district', district);
    
    const wardIds = (wards as any[])?.map(r => r.ward_id) || [];
    const ulbs = [...new Set((wards as any[])?.map(r => r.ulb))].filter(Boolean);

    // Parallel fetch all rural fact tables
    const [
      admin, water, livelihood, health,
      education, social, economy, infra, environment, tourism, governance
    ] = await Promise.all([
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

    // Parallel fetch urban fact tables
    const [uAdmin, uHealth, uWater, uSocial, uEconomy, uEducation, uInfra] = 
      wardIds.length > 0 ? await Promise.all([
        supabase.from('fact_urban_admin').select('*').in('ward_id', wardIds),
        supabase.from('fact_urban_health').select('*').in('ward_id', wardIds),
        supabase.from('fact_urban_water').select('*').in('ward_id', wardIds),
        supabase.from('fact_urban_social').select('*').in('ward_id', wardIds),
        supabase.from('fact_urban_economy').select('*').in('ward_id', wardIds),
        supabase.from('fact_urban_education').select('*').in('ward_id', wardIds),
        supabase.from('fact_urban_infra').select('*').in('ward_id', wardIds),
      ]) : Array(7).fill({ data: [] });

    // Aggregate helper
    const S = (dataset: any, col: string) => 
      (dataset?.data || []).reduce((a: number, r: any) => a + (Number(r[col]) || 0), 0);
    const A = (dataset: any, col: string) => {
      const vals = (dataset?.data || []).map((r: any) => Number(r[col])).filter((v: number) => v > 0);
      return vals.length ? (vals.reduce((a: number, b: number) => a + b, 0) / vals.length) : 0;
    };

    return {
      meta: {
        district,
        gpCount: gpIds.length,
        blockCount: blocks.length,
        blocks,
        wardCount: wardIds.length,
        ulbCount: ulbs.length,
        ulbs,
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
        urbanPop: S(uAdmin, 'pop_2026_est'),
      },
      water: {
        ruralFhtcAvg: A(water, 'tap_connection_pct').toFixed(1),
        gpsBelow30Fhtc: (water?.data || []).filter((r: any) => r.tap_connection_pct < 30).length,
        overheadTanks: S(water, 'overhead_tanks_count'),
        groundwaterDepth: A(water, 'groundwater_depth_meters').toFixed(1),
        roFacilities: S(water, 'ro_facilities'),
        urbanFhtcAvg: A(uWater, 'tap_connection_pct').toFixed(1),
      },
      agriculture: {
        cultivableHa: S(livelihood, 'cultivable_land_hectare'),
        irrigatedHa: S(livelihood, 'irrigated_area_hectare'),
        irrigationPct: S(livelihood, 'cultivable_land_hectare') > 0 
          ? ((S(livelihood,'irrigated_area_hectare')/S(livelihood,'cultivable_land_hectare'))*100).toFixed(1) 
          : 0,
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
        annualDairyValueCr: (S(livelihood,'daily_milk_prod_litres') * 365 * 50 / 10000000).toFixed(0),
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
        urbanHealthBeds: S(uHealth, 'health_center_beds'),
        urbanAyushman: S(uHealth, 'ayushman_arogya_beneficiaries'),
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
        urbanWidow: S(uSocial, 'widow_pensioners'),
        urbanAwas: S(uSocial, 'pm_cm_awas_beneficiaries'),
      },
      economy: {
        activeShgs: S(economy, 'active_shg_count'),
        shgWomen: S(economy, 'women_in_shgs'),
        lakhpatiDidis: S(economy, 'lakhpati_didis_count'),
        millionaireDidis: S(economy, 'millionaire_didis_count'),
        mudraLoan: S(economy, 'mudra_loan_beneficiaries'),
        artisans: S(economy, 'local_artisans_count'),
        urbanShgs: S(uEconomy, 'active_shg_count'),
        urbanIndustries: S(uEconomy, 'large_industrial_units') + S(uEconomy, 'small_scale_industries'),
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
        urbanPoliceKm: A(uInfra, 'dist_police_station_km'),
        urbanEmitraKm: A(uInfra, 'dist_emitra_km'),
      },
    };
  }

  // STEP 3 — Gemini narrative generation
  async function generateNarrative(data: any) {
    const d = data;
    const prompt = `You are Manthaan AI, planning intelligence engine for Viksit Rajasthan @ 2047 by Aasvaa Innovation Labs.

Generate a district planning intelligence brief for ${d.meta.district} district using ONLY the numbers below. Do not invent figures. Do not include Vision 2047 targets or aspiration data — this is a baseline-only report.

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
  function renderReport(district: string, data: any, narrative: any) {
    const d = data;
    const n = narrative;
    const totalPop = (d.population.total + d.population.urbanPop).toLocaleString();
    const totalWidow = (d.social.widowPensioners + d.social.urbanWidow).toLocaleString();
    const totalAyushman = (d.health.ayushmanBen + d.health.urbanAyushman).toLocaleString();
    const kccPct = d.agriculture.totalFarmers > 0 
      ? ((d.agriculture.kccHolders / d.agriculture.totalFarmers) * 100).toFixed(1) 
      : '0';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${district} District — Planning Intelligence Brief · May 2026</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1a1a2e; line-height: 1.6; }

  /* COVER */
  .cover { background: #1B3A6B; color: white; min-height: 100vh; padding: 4rem; display: flex; flex-direction: column; justify-content: flex-end; position: relative; }
  .cover-eyebrow { font-size: 0.65rem; letter-spacing: 0.25em; color: #64748b; margin-bottom: 4rem; text-transform: uppercase; }
  .cover-title { font-size: 5rem; font-weight: 900; line-height: 0.95; color: white; }
  .cover-title-sub { font-size: 4rem; font-weight: 900; color: #E8620A; margin-bottom: 1.5rem; }
  .cover-desc { color: #94a3b8; font-size: 1rem; max-width: 580px; line-height: 1.7; margin-bottom: 1.5rem; }
  .cover-chips { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 3rem; }
  .chip { border: 1px solid #334155; padding: 0.3rem 0.85rem; border-radius: 20px; font-size: 0.72rem; color: #94a3b8; }
  .cover-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2.5rem; padding-top: 2rem; border-top: 1px solid #1e3a5f; }
  .cs-value { font-size: 2.8rem; font-weight: 800; color: white; line-height: 1; }
  .cs-label { font-size: 0.65rem; letter-spacing: 0.12em; color: #64748b; margin-top: 0.4rem; text-transform: uppercase; }
  .cover-footer { margin-top: 3rem; font-size: 0.65rem; color: #334155; letter-spacing: 0.05em; }

  /* LAYOUT */
  .page { padding: 4rem; max-width: 960px; margin: 0 auto; }
  .section-eyebrow { font-size: 0.62rem; letter-spacing: 0.25em; color: #E8620A; text-transform: uppercase; margin-bottom: 0.75rem; border-bottom: 2px solid #E8620A; padding-bottom: 0.5rem; display: inline-block; }
  .section-title { font-size: 2.2rem; font-weight: 800; color: #1B3A6B; line-height: 1.15; margin-bottom: 1rem; }
  .section-body { color: #475569; line-height: 1.75; margin-bottom: 2rem; font-size: 0.95rem; }
  .divider { border: none; border-top: 1px solid #e2e8f0; margin: 3.5rem 0; }

  /* STAT ROW (4-col) */
  .stat-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; margin: 2rem 0; }
  .stat-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1.25rem; }
  .stat-box.accent { border-left: 3px solid #E8620A; }
  .sb-value { font-size: 1.8rem; font-weight: 800; color: #1B3A6B; }
  .sb-label { font-size: 0.68rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.07em; margin-top: 0.2rem; }
  .sb-sub { font-size: 0.72rem; color: #94a3b8; margin-top: 0.4rem; }

  /* PROFILE GRID */
  .profile-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin: 2rem 0; }
  .profile-card { background: #f8fafc; border-radius: 10px; padding: 1.5rem; border: 1px solid #e2e8f0; }
  .pc-title { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #1B3A6B; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid #e2e8f0; }
  .pc-row { display: flex; justify-content: space-between; padding: 0.35rem 0; font-size: 0.85rem; border-bottom: 1px solid #f1f5f9; }
  .pc-row:last-child { border-bottom: none; }
  .pc-key { color: #64748b; }
  .pc-val { color: #1a1a2e; font-weight: 600; }

  /* FINDINGS TABLE */
  .findings-table { width: 100%; border-collapse: collapse; margin: 2rem 0; font-size: 0.875rem; }
  .findings-table th { background: #1B3A6B; color: white; padding: 0.85rem 1rem; text-align: left; font-size: 0.72rem; letter-spacing: 0.07em; text-transform: uppercase; }
  .findings-table td { padding: 1rem; border-bottom: 1px solid #e2e8f0; vertical-align: top; color: #374151; }
  .findings-table tr:hover td { background: #f8fafc; }
  .fn { color: #E8620A; font-weight: 800; font-size: 1rem; }

  /* SECTOR SECTIONS */
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
  .ss-narrative { font-size: 0.875rem; color: #475569; line-height: 1.7; margin-top: 0.75rem; }
  .ss-pending { font-size: 0.85rem; color: #94a3b8; font-style: italic; }

  /* ACTIONS */
  .action-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; margin: 2rem 0; }
  .action-card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 1.5rem; }
  .ac-top { display: flex; justify-content: space-between; margin-bottom: 0.75rem; }
  .ac-num { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #E8620A; }
  .ac-meta { font-size: 0.68rem; color: #94a3b8; text-align: right; }
  .ac-title { font-size: 1rem; font-weight: 700; color: #1B3A6B; margin-bottom: 0.5rem; }
  .ac-desc { font-size: 0.85rem; color: #475569; line-height: 1.65; margin-bottom: 0.75rem; }
  .ac-scheme { font-size: 0.7rem; color: #E8620A; font-weight: 600; letter-spacing: 0.05em; }

  /* CLOSING */
  .closing { background: #1B3A6B; padding: 5rem 4rem; text-align: center; }
  .closing-quote { font-size: 1.3rem; color: #cbd5e1; line-height: 1.75; max-width: 680px; margin: 0 auto 2.5rem; font-style: italic; }
  .closing-divider { width: 60px; height: 2px; background: #E8620A; margin: 0 auto 1.5rem; }
  .closing-meta { font-size: 0.65rem; color: #475569; letter-spacing: 0.15em; text-transform: uppercase; }

  @media print {
    .cover { min-height: 100vh; page-break-after: always; }
    .page { page-break-inside: avoid; }
    .sector-section { page-break-inside: avoid; }
  }
</style>
</head>
<body>

<!-- ═══════════════ COVER PAGE ═══════════════ -->
<div class="cover">
  <div class="cover-eyebrow">Manthaan OS · Planning Intelligence Brief · CDO Validated Data</div>
  <div>
    <div class="cover-title">${district}</div>
    <div class="cover-title-sub">District</div>
    <div class="cover-desc">
      A district-wide planning intelligence brief built from verified administrative data across 
      ${d.meta.gpCount} Gram Panchayats and ${d.meta.wardCount} urban wards — spanning 
      ${d.meta.blockCount} blocks and ${d.meta.ulbCount} ULBs across 11 development sectors.
    </div>
    <div class="cover-chips">
      <span class="chip">${d.meta.blockCount} Blocks · ${d.meta.gpCount} GPs</span>
      <span class="chip">${d.meta.ulbCount} ULBs · ${d.meta.wardCount} Wards</span>
      <span class="chip">Rs ${d.dairy.annualDairyValueCr} Cr Dairy Economy</span>
      <span class="chip">${totalWidow} Widow Pensions</span>
      <span class="chip">Data Confidence · CDO Validated</span>
    </div>
    <div class="cover-stats">
      <div>
        <div class="cs-value">~${Math.round((d.population.total + d.population.urbanPop)/100000)}L</div>
        <div class="cs-label">Total Population (Rural + Urban)</div>
      </div>
      <div>
        <div class="cs-value">${d.agriculture.irrigationPct}%</div>
        <div class="cs-label">Irrigation Rate</div>
      </div>
      <div>
        <div class="cs-value">Rs ${d.dairy.annualDairyValueCr} Cr</div>
        <div class="cs-label">Annual Dairy Economy</div>
      </div>
      <div>
        <div class="cs-value">${Math.round((d.social.widowPensioners + d.social.urbanWidow)/100000 * 10)/10}L</div>
        <div class="cs-label">Widow Pension Recipients</div>
      </div>
    </div>
  </div>
  <div class="cover-footer">
    Manthaan OS · Aasvaa Innovation Labs · Jaipur, Rajasthan &nbsp;|&nbsp; 
    CONFIDENTIAL — Official Planning Use · Viksit Rajasthan @ 2047 · May 2026
  </div>
</div>

<!-- ═══════════════ EXECUTIVE BRIEF ═══════════════ -->
<div class="page">
  <div class="section-eyebrow">Executive Brief</div>
  <div class="section-title">Five Findings That Define the Planning Opportunity</div>
  <div class="section-body">${n.executiveSummary}</div>

  <div class="stat-row">
    <div class="stat-box accent">
      <div class="sb-value">${d.agriculture.irrigationPct}%</div>
      <div class="sb-label">Irrigation Rate</div>
      <div class="sb-sub">State avg ~31%</div>
    </div>
    <div class="stat-box accent">
      <div class="sb-value">${Math.round((d.social.widowPensioners + d.social.urbanWidow)/100000 * 10)/10}L</div>
      <div class="sb-label">Widow Pensions</div>
      <div class="sb-sub">${d.meta.gpCount} GP coverage</div>
    </div>
    <div class="stat-box accent">
      <div class="sb-value">${d.water.ruralFhtcAvg}%</div>
      <div class="sb-label">Rural FHTC</div>
      <div class="sb-sub">${d.water.gpsBelow30Fhtc} GPs below 30%</div>
    </div>
    <div class="stat-box accent">
      <div class="sb-value">${d.health.samChildren.toLocaleString()}</div>
      <div class="sb-label">SAM Children</div>
      <div class="sb-sub">Nutrition priority</div>
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

<hr class="divider">

<!-- ═══════════════ DISTRICT PROFILE ═══════════════ -->
<div class="page">
  <div class="section-eyebrow">Section 01 — District Profile</div>
  <div class="section-title">${d.meta.blockCount} Blocks · ${d.meta.gpCount} Gram Panchayats · ${d.meta.ulbCount} Urban Local Bodies</div>

  <div class="profile-grid">
    <div class="profile-card">
      <div class="pc-title">Rural Profile — ${d.meta.gpCount} GPs · ${d.meta.blockCount} Blocks</div>
      <div class="pc-row"><span class="pc-key">Total Gram Panchayats</span><span class="pc-val">${d.meta.gpCount}</span></div>
      <div class="pc-row"><span class="pc-key">Population (Rural est. 2026)</span><span class="pc-val">${(d.population.total/100000).toFixed(2)} Lakh</span></div>
      <div class="pc-row"><span class="pc-key">Total Families</span><span class="pc-val">${(d.population.totalFamilies/100000).toFixed(2)} Lakh</span></div>
      <div class="pc-row"><span class="pc-key">BPL Families</span><span class="pc-val">${d.population.bplFamilies.toLocaleString()}</span></div>
      <div class="pc-row"><span class="pc-key">Pucca Houses</span><span class="pc-val">${d.population.puccaHouses.toLocaleString()}</span></div>
      <div class="pc-row"><span class="pc-key">Kutcha Houses</span><span class="pc-val">${d.population.kutchaHouses.toLocaleString()}</span></div>
      <div class="pc-row"><span class="pc-key">Senior Citizens (60+)</span><span class="pc-val">${d.population.seniors.toLocaleString()}</span></div>
      <div class="pc-row"><span class="pc-key">PwD Population</span><span class="pc-val">${d.population.pwd.toLocaleString()}</span></div>
    </div>
    <div class="profile-card">
      <div class="pc-title">Urban Profile — ${d.meta.wardCount} Wards · ${d.meta.ulbCount} ULBs</div>
      <div class="pc-row"><span class="pc-key">Total Urban Wards</span><span class="pc-val">${d.meta.wardCount}</span></div>
      <div class="pc-row"><span class="pc-key">ULBs</span><span class="pc-val">${d.meta.ulbs.slice(0,4).join(', ')}${d.meta.ulbs.length > 4 ? '...' : ''}</span></div>
      <div class="pc-row"><span class="pc-key">Population (Urban est. 2026)</span><span class="pc-val">${(d.population.urbanPop/100000).toFixed(2)} Lakh</span></div>
      <div class="pc-row"><span class="pc-key">Allopathy Centres</span><span class="pc-val">${d.health.allopathicCenters}</span></div>
      <div class="pc-row"><span class="pc-key">Health Beds (Urban)</span><span class="pc-val">${d.health.urbanHealthBeds.toLocaleString()}</span></div>
      <div class="pc-row"><span class="pc-key">Urban FHTC Coverage</span><span class="pc-val">${d.water.urbanFhtcAvg}%</span></div>
      <div class="pc-row"><span class="pc-key">Urban Ayushman Beneficiaries</span><span class="pc-val">${d.health.urbanAyushman.toLocaleString()}</span></div>
      <div class="pc-row"><span class="pc-key">Urban Widow Pensioners</span><span class="pc-val">${d.social.urbanWidow.toLocaleString()}</span></div>
    </div>
  </div>
</div>

<hr class="divider">

<!-- ═══════════════ 11-SECTOR ANALYSIS ═══════════════ -->
<div class="page">
  <div class="section-eyebrow">Section 02 — 11-Sector Development Analysis</div>
  <div class="section-title">Baseline Snapshot Across All Development Sectors</div>

  <!-- SECTOR 1: WATER -->
  <div class="sector-section blue">
    <div class="ss-header">
      <div class="ss-title">01 · Water & Sanitation</div>
      <div class="ss-badge">JJM · AMRUT 2.0</div>
    </div>
    <div class="ss-metrics">
      <div class="sm"><div class="sm-value">${d.water.ruralFhtcAvg}%</div><div class="sm-label">Rural FHTC Coverage</div></div>
      <div class="sm"><div class="sm-value">${d.water.urbanFhtcAvg}%</div><div class="sm-label">Urban FHTC Coverage</div></div>
      <div class="sm"><div class="sm-value">${d.water.gpsBelow30Fhtc}</div><div class="sm-label">GPs Below 30% FHTC</div></div>
      <div class="sm"><div class="sm-value">${d.water.overheadTanks}</div><div class="sm-label">Overhead Tanks</div></div>
      <div class="sm"><div class="sm-value">${d.water.groundwaterDepth}m</div><div class="sm-label">Avg Groundwater Depth</div></div>
      <div class="sm"><div class="sm-value">${d.water.roFacilities}</div><div class="sm-label">RO Facilities</div></div>
    </div>
    <div class="ss-narrative">${n.sectorNarratives.water}</div>
  </div>

  <!-- SECTOR 2: AGRICULTURE -->
  <div class="sector-section green">
    <div class="ss-header">
      <div class="ss-title">02 · Agriculture & Irrigation</div>
      <div class="ss-badge">PMKSY · KCC · PM-Kisan</div>
    </div>
    <div class="ss-metrics">
      <div class="sm"><div class="sm-value">${d.agriculture.irrigationPct}%</div><div class="sm-label">Irrigation Rate</div></div>
      <div class="sm"><div class="sm-value">${d.agriculture.totalFarmers.toLocaleString()}</div><div class="sm-label">Total Farmers</div></div>
      <div class="sm"><div class="sm-value">${kccPct}%</div><div class="sm-label">KCC Penetration</div></div>
      <div class="sm"><div class="sm-value">${d.agriculture.pmKisan.toLocaleString()}</div><div class="sm-label">PM-Kisan Beneficiaries</div></div>
      <div class="sm"><div class="sm-value">${d.agriculture.fpos}</div><div class="sm-label">FPOs</div></div>
      <div class="sm"><div class="sm-value">${d.agriculture.solarPumps}</div><div class="sm-label">Solar Pumps</div></div>
    </div>
    <div class="ss-narrative">${n.sectorNarratives.agriculture}</div>
  </div>

  <!-- SECTOR 3: DAIRY -->
  <div class="sector-section">
    <div class="ss-header">
      <div class="ss-title">03 · Dairy & Livestock</div>
      <div class="ss-badge">SARAS · RCDF · NLM</div>
    </div>
    <div class="ss-metrics">
      <div class="sm"><div class="sm-value">${d.dairy.dailyMilkLpd.toLocaleString()}</div><div class="sm-label">Daily Milk (LPD)</div></div>
      <div class="sm"><div class="sm-value">Rs ${d.dairy.annualDairyValueCr} Cr</div><div class="sm-label">Annual Dairy Value</div></div>
      <div class="sm"><div class="sm-value">${d.dairy.milchAnimals.toLocaleString()}</div><div class="sm-label">Milch Animals</div></div>
      <div class="sm"><div class="sm-value">${d.dairy.totalLivestock.toLocaleString()}</div><div class="sm-label">Total Livestock</div></div>
      <div class="sm"><div class="sm-value">${d.dairy.milkCenters}</div><div class="sm-label">Milk Collection Centers</div></div>
      <div class="sm"><div class="sm-value">${d.dairy.goatFarms + d.dairy.poultryFarms}</div><div class="sm-label">Goat + Poultry Farms</div></div>
    </div>
    <div class="ss-narrative">${n.sectorNarratives.dairy}</div>
  </div>

  <!-- SECTOR 4: HEALTH -->
  <div class="sector-section orange">
    <div class="ss-header">
      <div class="ss-title">04 · Health & Nutrition</div>
      <div class="ss-badge">NHM · POSHAN · Ayushman</div>
    </div>
    <div class="ss-metrics">
      <div class="sm"><div class="sm-value">${d.health.allopathicCenters}</div><div class="sm-label">Allopathic Centers</div></div>
      <div class="sm"><div class="sm-value">${(d.health.healthBeds + d.health.urbanHealthBeds).toLocaleString()}</div><div class="sm-label">Total Health Beds</div></div>
      <div class="sm"><div class="sm-value">${(d.health.ayushmanBen + d.health.urbanAyushman).toLocaleString()}</div><div class="sm-label">Ayushman Beneficiaries</div></div>
      <div class="sm"><div class="sm-value">${d.health.samChildren.toLocaleString()}</div><div class="sm-label">SAM Children</div></div>
      <div class="sm"><div class="sm-value">${d.health.awcCenters}</div><div class="sm-label">AWC Centers</div></div>
      <div class="sm"><div class="sm-value">${d.health.ashaWorkers}</div><div class="sm-label">ASHA Workers</div></div>
    </div>
    <div class="ss-narrative">${n.sectorNarratives.health}</div>
  </div>

  <!-- SECTOR 5: EDUCATION (PENDING) -->
  <div class="sector-section pending">
    <div class="ss-header">
      <div class="ss-title">05 · Education & Skills</div>
      <div class="ss-badge pending-badge">Data Pending</div>
    </div>
    <div class="ss-metrics">
      <div class="sm"><div class="sm-value">${d.health.awcCenters}</div><div class="sm-label">AWC Centers (Available)</div></div>
      <div class="sm"><div class="sm-value">${d.health.samChildren.toLocaleString()}</div><div class="sm-label">SAM Children (Available)</div></div>
      <div class="sm"><div class="sm-value">—</div><div class="sm-label">Schools (Pending)</div></div>
      <div class="sm"><div class="sm-value">—</div><div class="sm-label">Teachers (Pending)</div></div>
      <div class="sm"><div class="sm-value">—</div><div class="sm-label">Enrolled Students (Pending)</div></div>
      <div class="sm"><div class="sm-value">—</div><div class="sm-label">Dropout Rate (Pending)</div></div>
    </div>
    <div class="ss-pending">${n.sectorNarratives.education}</div>
  </div>

  <!-- SECTOR 6: SOCIAL WELFARE -->
  <div class="sector-section purple">
    <div class="ss-header">
      <div class="ss-title">06 · Social Welfare & Housing</div>
      <div class="ss-badge">PM Awas · Ujjwala · Pension</div>
    </div>
    <div class="ss-metrics">
      <div class="sm"><div class="sm-value">${(d.social.widowPensioners + d.social.urbanWidow).toLocaleString()}</div><div class="sm-label">Total Widow Pensioners</div></div>
      <div class="sm"><div class="sm-value">${d.social.oldAgePensioners.toLocaleString()}</div><div class="sm-label">Old Age Pensioners</div></div>
      <div class="sm"><div class="sm-value">${d.social.pwdPensioners.toLocaleString()}</div><div class="sm-label">PwD Pensioners</div></div>
      <div class="sm"><div class="sm-value">${d.social.ujjwalaBen.toLocaleString()}</div><div class="sm-label">PM Ujjwala Beneficiaries</div></div>
      <div class="sm"><div class="sm-value">${(d.social.awasBen + d.social.urbanAwas).toLocaleString()}</div><div class="sm-label">PM/CM Awas Beneficiaries</div></div>
      <div class="sm"><div class="sm-value">${d.population.bplFamilies.toLocaleString()}</div><div class="sm-label">BPL Families</div></div>
    </div>
    <div class="ss-narrative">${n.sectorNarratives.socialWelfare}</div>
  </div>

  <!-- SECTOR 7: ECONOMY -->
  <div class="sector-section amber">
    <div class="ss-header">
      <div class="ss-title">07 · Economy & Women's Empowerment</div>
      <div class="ss-badge">SRLM · MUDRA · NRLM</div>
    </div>
    <div class="ss-metrics">
      <div class="sm"><div class="sm-value">${d.economy.activeShgs.toLocaleString()}</div><div class="sm-label">Active SHGs</div></div>
      <div class="sm"><div class="sm-value">${d.economy.shgWomen.toLocaleString()}</div><div class="sm-label">Women in SHGs</div></div>
      <div class="sm"><div class="sm-value">${d.economy.lakhpatiDidis.toLocaleString()}</div><div class="sm-label">Lakhpati Didis</div></div>
      <div class="sm"><div class="sm-value">${d.economy.millionaireDidis.toLocaleString()}</div><div class="sm-label">Millionaire Didis</div></div>
      <div class="sm"><div class="sm-value">${d.economy.mudraLoan.toLocaleString()}</div><div class="sm-label">Mudra Loan Beneficiaries</div></div>
      <div class="sm"><div class="sm-value">${d.economy.artisans.toLocaleString()}</div><div class="sm-label">Local Artisans</div></div>
    </div>
    <div class="ss-narrative">${n.sectorNarratives.economy}</div>
  </div>

  <!-- SECTOR 8: INFRASTRUCTURE -->
  <div class="sector-section">
    <div class="ss-header">
      <div class="ss-title">08 · Infrastructure & Connectivity</div>
      <div class="ss-badge">PMGSY · 15th FC · Solar</div>
    </div>
    <div class="ss-metrics">
      <div class="sm"><div class="sm-value">${d.infrastructure.electricityHouses.toLocaleString()}</div><div class="sm-label">Houses with Electricity</div></div>
      <div class="sm"><div class="sm-value">${d.infrastructure.roadKm.toLocaleString()} km</div><div class="sm-label">Road Length</div></div>
      <div class="sm"><div class="sm-value">${d.infrastructure.streetLights.toLocaleString()}</div><div class="sm-label">Street Lights</div></div>
      <div class="sm"><div class="sm-value">${d.infrastructure.govtBanks}</div><div class="sm-label">Govt Banks</div></div>
      <div class="sm"><div class="sm-value">${d.infrastructure.postOffices}</div><div class="sm-label">Post Offices</div></div>
      <div class="sm"><div class="sm-value">${d.infrastructure.solarHomes.toLocaleString()}</div><div class="sm-label">Solar Installed Homes</div></div>
    </div>
    <div class="ss-narrative">${n.sectorNarratives.infrastructure}</div>
  </div>

  <!-- SECTOR 9: ENVIRONMENT -->
  <div class="sector-section green">
    <div class="ss-header">
      <div class="ss-title">09 · Environment & Sanitation</div>
      <div class="ss-badge">SBM · PM Surya Ghar · MGNREGS</div>
    </div>
    <div class="ss-metrics">
      <div class="sm"><div class="sm-value">${d.environment.forestHa.toLocaleString()} ha</div><div class="sm-label">Forest Area</div></div>
      <div class="sm"><div class="sm-value">${d.environment.pastureHa.toLocaleString()} ha</div><div class="sm-label">Pasture Land</div></div>
      <div class="sm"><div class="sm-value">${d.environment.housesWithToilets.toLocaleString()}</div><div class="sm-label">Houses with Toilets</div></div>
      <div class="sm"><div class="sm-value">${d.environment.biogasPlants}</div><div class="sm-label">Biogas Plants</div></div>
      <div class="sm"><div class="sm-value">${d.environment.suryaGharHomes.toLocaleString()}</div><div class="sm-label">PM Surya Ghar Homes</div></div>
      <div class="sm"><div class="sm-value">${d.environment.wasteKgDay.toLocaleString()} kg</div><div class="sm-label">Daily Waste Generated</div></div>
    </div>
    <div class="ss-narrative">${n.sectorNarratives.environment}</div>
  </div>

  <!-- SECTOR 10: TOURISM -->
  <div class="sector-section blue">
    <div class="ss-header">
      <div class="ss-title">10 · Tourism & Cultural Heritage</div>
      <div class="ss-badge">Swadesh Darshan 2.0</div>
    </div>
    <div class="ss-metrics">
      <div class="sm"><div class="sm-value">${d.tourism.heritageSites}</div><div class="sm-label">Heritage/Cultural Sites</div></div>
      <div class="sm"><div class="sm-value">${d.tourism.dailyFootfall.toLocaleString()}</div><div class="sm-label">Avg Daily Footfall</div></div>
      <div class="sm"><div class="sm-value">${d.tourism.annualFairs}</div><div class="sm-label">Annual Fairs</div></div>
      <div class="sm"><div class="sm-value">${d.tourism.trainedGuides}</div><div class="sm-label">Registered Trained Guides</div></div>
      <div class="sm"><div class="sm-value">${d.tourism.fairEmployment.toLocaleString()}</div><div class="sm-label">Fair-Related Employment</div></div>
      <div class="sm"><div class="sm-value">${(d.tourism.dailyFootfall * 365).toLocaleString()}</div><div class="sm-label">Est. Annual Visitors</div></div>
    </div>
    <div class="ss-narrative">${n.sectorNarratives.tourism}</div>
  </div>

  <!-- SECTOR 11: GOVERNANCE -->
  <div class="sector-section">
    <div class="ss-header">
      <div class="ss-title">11 · Governance & Last-Mile Access</div>
      <div class="ss-badge">e-Mitra · RSB · Digital Rajasthan</div>
    </div>
    <div class="ss-metrics">
      <div class="sm"><div class="sm-value">${d.infrastructure.publicToilets}</div><div class="sm-label">Public Toilets</div></div>
      <div class="sm"><div class="sm-value">${d.infrastructure.govtBanks}</div><div class="sm-label">Govt Banks</div></div>
      <div class="sm"><div class="sm-value">${d.infrastructure.postOffices}</div><div class="sm-label">Post Offices</div></div>
      <div class="sm"><div class="sm-value">${d.meta.gpCount}</div><div class="sm-label">GPs with Admin Coverage</div></div>
      <div class="sm"><div class="sm-value">${d.meta.ulbCount}</div><div class="sm-label">Urban Local Bodies</div></div>
      <div class="sm"><div class="sm-value">${d.meta.wardCount}</div><div class="sm-label">Urban Wards Covered</div></div>
    </div>
    <div class="ss-narrative">${n.sectorNarratives.governance}</div>
  </div>
</div>

<hr class="divider">

<!-- ═══════════════ PRIORITY ACTIONS ═══════════════ -->
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

<!-- ═══════════════ CLOSING ═══════════════ -->
<div class="closing">
  <div class="closing-divider"></div>
  <div class="closing-quote">"${n.closingQuote}"</div>
  <div class="closing-meta">
    Manthaan OS · Aasvaa Innovation Labs · ${district.toUpperCase()} District · Viksit Rajasthan @ 2047 · May 2026
  </div>
</div>

</body>
</html>`;

    setGeneratedHtml(html);
  }

  return (
    <div>
      <div className="pg-t">Report Library</div>
      <div className="pg-s">Generate AI-powered planning intelligence briefs for any of Rajasthan's 41 districts</div>
      
      <div className="rg">
        <div className="rc">
          <div className="rh">
            <div className="rtag">Constituency · Sample</div>
            <div className="rt">Alwar Lok Sabha</div>
          </div>
          <div className="rb">
            <div className="rr">
              <span>Dev Score</span>
              <span>52/100 — Tier 3</span>
            </div>
            <div className="rr">
              <span>Status</span>
              <span>Available</span>
            </div>
          </div>
          <div className="rf">
            <button className="btn btn-o" onClick={openAlwarReport}>Open Report</button>
            <button className="btn btn-ghost" onClick={downloadAlwarReport}>Download</button>
          </div>
        </div>

        <div className="rc">
          <div className="rh">
            <div className="rtag">District Report · Generate</div>
            <div className="rt">Any district</div>
          </div>
          <div className="rb">
            <select 
              className="fs" 
              style={{ width: '100%', marginBottom: '8px' }}
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              disabled={generating}
            >
              <option value="">Select district...</option>
              {DISTRICTS_EN.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <div className="rr">
              <span>Covers</span>
              <span>All 11 sectors</span>
            </div>
          </div>
          <div className="rf">
            <button 
              className="btn btn-ai" 
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={handleGenerateReport}
              disabled={generating}
            >
              {generating ? generatingLabel : 'Generate Planning Report'}
            </button>
          </div>
        </div>
      </div>

      {generatedHtml && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', flexDirection: 'column'
        }}>
          <div style={{ background: '#1B3A6B', padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'white', fontWeight: 'bold' }}>District Intelligence Brief: {selectedDistrict}</span>
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
