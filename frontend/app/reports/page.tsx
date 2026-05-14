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
      education, social, economy, infra, environment, tourism
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
        totalSchools: S(education, 'total_schools_count'),
        govtSchools: S(education, 'govt_schools_count'),
        pvtSchools: S(education, 'pvt_schools_count'),
        workingTeachers: S(education, 'working_teachers'),
        sanctionedTeachers: S(education, 'sanctioned_teachers_count'),
        enrolledStudents: S(education, 'total_enrolled_students'),
        dropouts: S(education, 'dropout_children_prev_year'),
        skillCenters: S(education, 'skill_training_centers'),
        colleges: S(education, 'higher_edu_institutes'),
        urbanGovtSchools: S(uEducation, 'govt_schools_count'),
        urbanPvtSchools: S(uEducation, 'pvt_schools_count'),
        urbanTeachers: S(uEducation, 'working_teachers'),
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
    };
  }

  // STEP 3 — Gemini narrative generation
  async function generateNarrative(data: any) {
    const d = data;
    const prompt = `You are Manthaan AI, planning intelligence engine for Viksit Rajasthan @ 2047 by Aasvaa Innovation Labs.

Generate a district planning intelligence brief for ${d.meta.district} district using ONLY the numbers below. Do not invent any figures.

KEY METRICS:
Population: ${d.population.total.toLocaleString()} (Rural) + ${d.population.urbanPop.toLocaleString()} (Urban)
GPs: ${d.meta.gpCount} across ${d.meta.blockCount} blocks | Urban Wards: ${d.meta.wardCount} across ${d.meta.ulbCount} ULBs
Irrigation: ${d.agriculture.irrigationPct}% of ${d.agriculture.cultivableHa.toLocaleString()} ha cultivable land
Total farmers: ${d.agriculture.totalFarmers.toLocaleString()} | KCC: ${d.agriculture.kccHolders.toLocaleString()} (${d.agriculture.totalFarmers > 0 ? ((d.agriculture.kccHolders/d.agriculture.totalFarmers)*100).toFixed(1) : 0}%) | PM-Kisan: ${d.agriculture.pmKisan.toLocaleString()}
Daily milk: ${d.dairy.dailyMilkLpd.toLocaleString()} LPD | Dairy value: Rs ${d.dairy.annualDairyValueCr} Cr/yr
Widow pensioners: ${(d.social.widowPensioners + d.social.urbanWidow).toLocaleString()} | Lakhpati Didi: ${d.economy.lakhpatiDidis.toLocaleString()} | SHG women: ${d.economy.shgWomen.toLocaleString()}
Rural FHTC: ${d.water.ruralFhtcAvg}% | Urban FHTC: ${d.water.urbanFhtcAvg}% | GPs below 30% FHTC: ${d.water.gpsBelow30Fhtc}
SAM children: ${d.health.samChildren.toLocaleString()} | Ayushman beneficiaries: ${(d.health.ayushmanBen + d.health.urbanAyushman).toLocaleString()}
Total schools: ${d.education.totalSchools.toLocaleString()} | Teachers: ${d.education.workingTeachers.toLocaleString()} sanctioned: ${d.education.sanctionedTeachers.toLocaleString()} | Dropouts: ${d.education.dropouts.toLocaleString()}
Forest area: ${d.environment.forestHa.toLocaleString()} ha | PM Surya Ghar homes: ${d.environment.suryaGharHomes.toLocaleString()}
Heritage sites: ${d.tourism.heritageSites} | Annual fairs: ${d.tourism.annualFairs} | Daily footfall: ${d.tourism.dailyFootfall.toLocaleString()}

Generate the following sections in JSON format only, no markdown, no preamble:
{
  "executiveSummary": "3-4 sentences summarizing the district's development position and biggest opportunity",
  "findings": [
    { "number": "01", "finding": "one sentence finding", "currentPosition": "specific metric", "opportunity": "specific actionable opportunity with scheme name" },
    { "number": "02", ... },
    { "number": "03", ... },
    { "number": "04", ... },
    { "number": "05", ... }
  ],
  "sectorNarratives": {
    "agriculture": "60-word narrative with key numbers and one recommendation",
    "dairy": "60-word narrative with key numbers and one recommendation",
    "welfare": "60-word narrative with key numbers and one recommendation",
    "health": "60-word narrative with key numbers and one recommendation",
    "water": "60-word narrative with key numbers and one recommendation",
    "education": "60-word narrative with key numbers and one recommendation"
  },
  "priorityActions": [
    { "number": "01", "cost": "Zero Cost", "timeline": "30 days", "title": "action title", "description": "2-3 sentence description with specific numbers", "scheme": "scheme/dept name" },
    { "number": "02", ... },
    { "number": "03", ... },
    { "number": "04", ... }
  ],
  "closingQuote": "one powerful planning insight sentence for this district"
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
    const totalWidow = (d.social.widowPensioners + d.social.urbanWidow).toLocaleString();
    const totalAyushman = (d.health.ayushmanBen + d.health.urbanAyushman).toLocaleString();

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${district} District — Planning Intelligence Brief · May 2026</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1a1a2e; }
  
  /* COVER */
  .cover { background: #1B3A6B; color: white; min-height: 100vh; padding: 4rem; display: flex; flex-direction: column; justify-content: flex-end; }
  .cover-label { font-size: 0.7rem; letter-spacing: 0.2em; color: #94a3b8; margin-bottom: 3rem; }
  .cover-title { font-size: 5rem; font-weight: 800; line-height: 1; }
  .cover-title span { color: #E8620A; display: block; }
  .cover-subtitle { color: #94a3b8; margin: 1.5rem 0; font-size: 1rem; max-width: 600px; line-height: 1.6; }
  .cover-chips { display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 1.5rem 0; }
  .chip { border: 1px solid #334155; padding: 0.3rem 0.75rem; border-radius: 20px; font-size: 0.75rem; color: #94a3b8; }
  .cover-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2rem; margin-top: 3rem; padding-top: 2rem; border-top: 1px solid #334155; }
  .cover-stat-value { font-size: 2.5rem; font-weight: 700; color: #E8620A; }
  .cover-stat-label { font-size: 0.7rem; letter-spacing: 0.1em; color: #64748b; margin-top: 0.25rem; text-transform: uppercase; }
  .cover-footer { margin-top: 3rem; font-size: 0.7rem; color: #475569; }

  /* SECTIONS */
  .section { padding: 4rem; max-width: 1000px; margin: 0 auto; }
  .section-label { font-size: 0.65rem; letter-spacing: 0.2em; color: #E8620A; text-transform: uppercase; margin-bottom: 1rem; }
  .section-title { font-size: 2rem; font-weight: 700; color: #1B3A6B; line-height: 1.2; margin-bottom: 1rem; }
  .section-body { color: #475569; line-height: 1.7; margin-bottom: 2rem; }
  hr.divider { border: none; border-top: 1px solid #e2e8f0; margin: 3rem 0; }

  /* STAT GRID */
  .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; margin: 2rem 0; }
  .stat-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1.25rem; }
  .stat-box-value { font-size: 1.75rem; font-weight: 700; color: #1B3A6B; }
  .stat-box-label { font-size: 0.7rem; color: #64748b; margin-top: 0.25rem; text-transform: uppercase; letter-spacing: 0.05em; }
  .stat-box-sub { font-size: 0.75rem; color: #94a3b8; margin-top: 0.5rem; }

  /* FINDINGS TABLE */
  .findings-table { width: 100%; border-collapse: collapse; margin: 2rem 0; }
  .findings-table th { background: #1B3A6B; color: white; padding: 0.75rem 1rem; text-align: left; font-size: 0.75rem; letter-spacing: 0.05em; }
  .findings-table td { padding: 1rem; border-bottom: 1px solid #e2e8f0; font-size: 0.875rem; vertical-align: top; }
  .findings-table tr:hover td { background: #f8fafc; }
  .finding-num { color: #E8620A; font-weight: 700; }

  /* SECTOR NARRATIVES */
  .sector-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; margin: 2rem 0; }
  .sector-card { background: #f8fafc; border-left: 3px solid #E8620A; padding: 1.25rem; border-radius: 0 8px 8px 0; }
  .sector-card-title { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: #1B3A6B; margin-bottom: 0.5rem; }
  .sector-card-text { font-size: 0.85rem; color: #475569; line-height: 1.6; }

  /* PRIORITY ACTIONS */
  .action-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; margin: 2rem 0; }
  .action-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 1.5rem; }
  .action-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem; }
  .action-num { color: #E8620A; font-weight: 700; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; }
  .action-meta { font-size: 0.7rem; color: #64748b; text-align: right; }
  .action-title { font-size: 1rem; font-weight: 600; color: #1B3A6B; margin-bottom: 0.5rem; }
  .action-desc { font-size: 0.85rem; color: #475569; line-height: 1.6; margin-bottom: 0.75rem; }
  .action-scheme { font-size: 0.7rem; color: #E8620A; font-weight: 500; }

  /* 2047 TABLE */
  .targets-table { width: 100%; border-collapse: collapse; margin: 2rem 0; }
  .targets-table th { background: #1B3A6B; color: white; padding: 0.75rem 1rem; text-align: left; font-size: 0.8rem; }
  .targets-table td { padding: 0.875rem 1rem; border-bottom: 1px solid #e2e8f0; font-size: 0.875rem; }
  .targets-table tr:nth-child(even) td { background: #f8fafc; }
  .target-2047 { color: #16a34a; font-weight: 600; }

  /* CLOSING */
  .closing { background: #1B3A6B; color: white; padding: 4rem; text-align: center; }
  .closing-quote { font-size: 1.25rem; color: #cbd5e1; line-height: 1.7; max-width: 700px; margin: 0 auto 2rem; font-style: italic; }
  .closing-meta { font-size: 0.7rem; color: #475569; letter-spacing: 0.1em; }

  @media print {
    .cover { min-height: 100vh; page-break-after: always; }
    .section { page-break-inside: avoid; }
  }
</style>
</head>
<body>

<!-- COVER PAGE -->
<div class="cover">
  <div class="cover-label">MANTHAAN OS · PLANNING INTELLIGENCE BRIEF · CDO VALIDATED DATA</div>
  <div>
    <div class="cover-title">${district}<span>District</span></div>
    <div class="cover-subtitle">A district-wide planning intelligence brief built from verified administrative data across ${d.meta.gpCount} Gram Panchayats and ${d.meta.wardCount} urban wards — spanning ${d.meta.blockCount} blocks and ${d.meta.ulbCount} ULBs.</div>
    <div class="cover-chips">
      <span class="chip">${d.meta.blockCount} Blocks · ${d.meta.gpCount} GPs</span>
      <span class="chip">${d.meta.ulbCount} ULBs · ${d.meta.wardCount} Wards</span>
      <span class="chip">Rs ${d.dairy.annualDairyValueCr} Cr Dairy Economy</span>
      <span class="chip">${totalWidow} Widow Pensions</span>
      <span class="chip">Data Confidence · CDO Validated</span>
    </div>
    <div class="cover-stats">
      <div><div class="cover-stat-value">~${Math.round((d.population.total + d.population.urbanPop)/100000)}L</div><div class="cover-stat-label">Total Population (Rural + Urban)</div></div>
      <div><div class="cover-stat-value">${d.agriculture.irrigationPct}%</div><div class="cover-stat-label">Irrigation Rate</div></div>
      <div><div class="cover-stat-value">Rs ${d.dairy.annualDairyValueCr} Cr</div><div class="cover-stat-label">Annual Dairy Economy</div></div>
      <div><div class="cover-stat-value">${Math.round((d.social.widowPensioners+d.social.urbanWidow)/100000*10)/10}L</div><div class="cover-stat-label">Widow Pension Recipients</div></div>
    </div>
  </div>
  <div class="cover-footer">Manthaan OS · Aasvaa Innovation Labs · Jaipur, Rajasthan &nbsp;|&nbsp; CONFIDENTIAL — Official Planning Use · Viksit Rajasthan @ 2047 · May 2026</div>
</div>

<!-- EXECUTIVE BRIEF -->
<div class="section">
  <div class="section-label">EXECUTIVE BRIEF</div>
  <div class="section-title">Five Findings That Define the Planning Opportunity</div>
  <div class="section-body">${n.executiveSummary}</div>
  
  <div class="stat-grid">
    <div class="stat-box"><div class="stat-box-value">${d.agriculture.irrigationPct}%</div><div class="stat-box-label">Irrigation Rate</div><div class="stat-box-sub">State avg ~31%</div></div>
    <div class="stat-box"><div class="stat-box-value">${Math.round((d.social.widowPensioners+d.social.urbanWidow)/100000*10)/10}L</div><div class="stat-box-label">Widow Pensions</div><div class="stat-box-sub">${d.meta.gpCount} GPs coverage</div></div>
    <div class="stat-box"><div class="stat-box-value">${d.water.ruralFhtcAvg}%</div><div class="stat-box-label">Rural FHTC</div><div class="stat-box-sub">${d.water.gpsBelow30Fhtc} GPs below 30%</div></div>
    <div class="stat-box"><div class="stat-box-value">${d.health.samChildren.toLocaleString()}</div><div class="stat-box-label">SAM Children</div><div class="stat-box-sub">Nutrition priority</div></div>
  </div>

  <table class="findings-table">
    <thead><tr><th>#</th><th>Finding</th><th>Current Position</th><th>Opportunity</th></tr></thead>
    <tbody>
      ${n.findings.map((f: any) => `
        <tr>
          <td><span class="finding-num">${f.number}</span></td>
          <td>${f.finding}</td>
          <td>${f.currentPosition}</td>
          <td>${f.opportunity}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</div>

<hr class="divider">

<!-- SECTOR NARRATIVES -->
<div class="section">
  <div class="section-label">SECTOR ANALYSIS</div>
  <div class="section-title">11-Sector Development Snapshot</div>
  
  <div class="stat-grid">
    <div class="stat-box"><div class="stat-box-value">${d.agriculture.totalFarmers.toLocaleString()}</div><div class="stat-box-label">Total Farmers</div></div>
    <div class="stat-box"><div class="stat-box-value">${d.agriculture.totalFarmers > 0 ? ((d.agriculture.kccHolders / d.agriculture.totalFarmers) * 100).toFixed(1) : 0}%</div><div class="stat-box-label">KCC Penetration</div></div>
    <div class="stat-box"><div class="stat-box-value">${d.dairy.dailyMilkLpd.toLocaleString()}</div><div class="stat-box-label">Daily Milk (LPD)</div></div>
    <div class="stat-box"><div class="stat-box-value">${d.economy.lakhpatiDidis.toLocaleString()}</div><div class="stat-box-label">Lakhpati Didis</div></div>
  </div>

  <div class="sector-grid">
    ${Object.entries(n.sectorNarratives).map(([sector, text]) => `
      <div class="sector-card">
        <div class="sector-card-title">${sector.charAt(0).toUpperCase() + sector.slice(1)}</div>
        <div class="sector-card-text">${text}</div>
      </div>
    `).join('')}
  </div>
</div>

<hr class="divider">

<!-- PRIORITY ACTIONS -->
<div class="section">
  <div class="section-label">PRIORITY ACTIONS</div>
  <div class="section-title">Four Actions — Data-Grounded, Scheme-Linked</div>
  
  <div class="action-grid">
    ${n.priorityActions.map((a: any) => `
      <div class="action-card">
        <div class="action-header">
          <span class="action-num">ACTION ${a.number} · ${a.cost}</span>
          <span class="action-meta">${a.timeline}</span>
        </div>
        <div class="action-title">${a.title}</div>
        <div class="action-desc">${a.description}</div>
        <div class="action-scheme">${a.scheme}</div>
      </div>
    `).join('')}
  </div>
</div>

<!-- CLOSING -->
<div class="closing">
  <div class="closing-quote">"${n.closingQuote}"</div>
  <div class="closing-meta">MANTHAAN OS · AASVAA INNOVATION LABS · ${district.toUpperCase()} DISTRICT · VIKSIT RAJASTHAN @ 2047 · MAY 2026</div>
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
