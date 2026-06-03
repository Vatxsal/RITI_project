-- ============================================================
-- MANTHAAN OS — BASELINE MATERIALIZED VIEWS (Performance)
-- Rajasthan Viksit 2047 · Aasvaa Innovation Labs
--
-- PURPOSE:
--   baseline_rural has MANY rows per GP (one row per crop/health center/
--   anganwadi etc. because of the denormalised structure). Full-table
--   scans for KPI computation are too slow (~50 MB).
--
--   These materialized views pre-aggregate all numeric columns at the
--   DISTRICT level so the API route fetches ~33 rows instead of ~50,000.
--
-- USAGE:
--   1. Run this entire file once in Supabase SQL Editor.
--   2. After each ETL data load, run:
--        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_baseline_rural_district_kpis;
--        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_baseline_urban_district_kpis;
--   3. Then re-run: node frontend/refresh_dashboard_cache.js
--
-- COLUMN NAMES match what route.ts / refresh_dashboard_cache.js already
-- read — see the aliasing comments below.
-- ============================================================


-- ============================================================
-- VIEW 1: mv_baseline_rural_district_kpis
-- One row per district. SUM for counts, AVG for percentages/rates.
-- ============================================================

DROP MATERIALIZED VIEW IF EXISTS mv_baseline_rural_district_kpis CASCADE;

CREATE MATERIALIZED VIEW mv_baseline_rural_district_kpis AS
SELECT
  district,

  -- ── GP COUNT: unique block+GP combos (same GP name can appear in multiple blocks) ─────
  COUNT(DISTINCT (district || '|||' || block || '|||' || gram_panchayat))  AS gp_count,
  COUNT(DISTINCT block)                               AS block_count,

  -- ── DEMOGRAPHICS ──────────────────────────────────────────────
  SUM(pop_2026_est)                               AS total_pop,
  SUM(female_pop_2026)                            AS female_pop,
  SUM(male_pop_2026)                              AS male_pop,
  SUM(total_families_2026)                        AS total_families,
  SUM(bpl_families_2026)                          AS bpl_families,
  SUM(senior_citizens_2026)                       AS senior_citizens,
  SUM(pwd_pop_2026)                               AS pwd_pop,
  SUM(children_0_6_2026)                          AS children_0_6,
  SUM(children_6_14_2026)                         AS children_6_14,
  SUM(pop_14_18_2026)                             AS pop_14_18,

  -- ── HOUSING ───────────────────────────────────────────────────
  SUM(pucca_houses_2026)                          AS pucca_houses,
  SUM(kutcha_houses_2026)                         AS kutcha_houses,
  SUM(pm_cm_awas_beneficiaries)                   AS pm_cm_awas_beneficiaries,

  -- ── AGRICULTURE ───────────────────────────────────────────────
  SUM(cultivable_land_hectare)                    AS cultivable_land_ha,
  SUM(irrigated_area_hectare)                     AS irrigated_area_ha,
  SUM(net_sown_area_hectare)                      AS net_sown_area_ha,
  SUM(gross_sown_area_hectare)                    AS gross_sown_area_ha,
  SUM(kharif_crop_area_hectare)                   AS kharif_crop_area_hectare,
  SUM(kharif_crop_production_quintal)             AS kharif_crop_production_quintal,
  SUM(rabi_crop_area_hectare)                     AS rabi_crop_area_hectare,
  SUM(rabi_crop_production_quintal)               AS rabi_crop_production_quintal,
  SUM(total_farmers_count)                        AS total_farmers,
  SUM(small_farmers_count)                        AS small_farmers,
  SUM(medium_farmers_count)                       AS medium_farmers,
  SUM(large_farmers_count)                        AS large_farmers,
  SUM(kcc_holders_count)                          AS kcc_holders,
  SUM(soil_health_cards_valid)                    AS soil_health_cards,
  SUM(fpo_count)                                  AS fpo_count,
  SUM(fpo_farmers_count)                          AS fpo_farmers,
  SUM(solar_pumps_count)                          AS solar_pumps,
  SUM(diesel_pumps_count)                         AS diesel_pumps,
  SUM(drip_sprinkler_farmers_count)               AS drip_sprinkler_farmers,
  SUM(pm_cm_kisan_beneficiaries)                  AS pm_cm_kisan_beneficiaries,
  SUM(crop_insurance_farmers_count)               AS crop_insurance_farmers,
  SUM(agri_electricity_connections)               AS agri_electricity_connections,
  SUM(govt_vet_centers_count)                     AS govt_vet_centers_count,

  -- ── DAIRY & LIVESTOCK ─────────────────────────────────────────
  SUM(total_livestock_count)                      AS total_livestock,
  SUM(milch_animals_count)                        AS milch_animals,
  SUM(daily_milk_prod_litres)                     AS daily_milk_litres,
  SUM(milk_collection_centers)                    AS milk_collection_centers,
  SUM(goat_farms_count)                           AS goat_farms,
  SUM(poultry_farms_count)                        AS poultry_farms,
  SUM(horticulture_farmers_count)                 AS horticulture_farmers,
  SUM(horticulture_area_hectare)                  AS horticulture_area_ha,
  SUM(organic_farming_farmers_count)              AS organic_farming_farmers,

  -- ── HEALTH ────────────────────────────────────────────────────
  SUM(allopathic_centers)                         AS allopathic_centers,
  SUM(ayush_centers)                              AS ayush_centers,
  SUM(private_health_centers)                     AS private_health_centers,
  SUM(health_center_beds)                         AS health_center_beds,
  SUM(working_health_staff)                       AS working_health_staff,
  SUM(sanctioned_health_staff)                    AS sanctioned_health_staff,
  SUM(ayushman_arogya_beneficiaries)              AS ayushman_beneficiaries,
  AVG(janaadhar_registered_families_pct)          AS janaadhar_registered_families_pct,
  SUM(tb_patients_count)                          AS tb_patients,
  SUM(anemic_pregnant_women_count)                AS anemic_pregnant_women,
  SUM(anemic_children_count)                      AS anemic_children,
  SUM(diabetes_screened_fy2526)                   AS diabetes_screened,
  SUM(bp_screened_fy2526)                         AS bp_screened,
  SUM(snp_children_6_72m)                         AS snp_children,
  AVG(avg_daily_patients)                         AS avg_daily_patients,
  AVG(phc_dist_km)                                AS phc_dist_km,
  AVG(chc_dist_km)                                AS chc_dist_km,

  -- ── ANGANWADI / ICDS ──────────────────────────────────────────
  SUM(anganwadi_centers_count)                    AS anganwadi_centers,
  SUM(anganwadi_workers_count)                    AS anganwadi_workers,
  SUM(anganwadi_helpers_count)                    AS anganwadi_helpers,
  SUM(asha_workers_count)                         AS asha_workers,
  SUM(anganwadi_enrolled_children)                AS anganwadi_enrolled_children,
  SUM(anganwadi_pregnant_women)                   AS anganwadi_pregnant_women,
  SUM(sam_children_count)                         AS sam_children,
  SUM(growth_monitoring_children)                 AS growth_monitoring_children,

  -- ── EDUCATION ─────────────────────────────────────────────────
  SUM(govt_schools_count)                         AS govt_schools,
  SUM(pvt_schools_count)                          AS pvt_schools,
  SUM(total_schools_count)                        AS total_schools,
  SUM(useful_classrooms_count)                    AS useful_classrooms_count,
  SUM(total_enrolled_students)                    AS total_enrolled_students,
  SUM(students_class_0_5_boys)                    AS students_class_0_5_boys,
  SUM(students_class_0_5_girls)                   AS students_class_0_5_girls,
  SUM(students_class_6_8_boys)                    AS students_class_6_8_boys,
  SUM(students_class_6_8_girls)                   AS students_class_6_8_girls,
  SUM(students_class_9_10_boys)                   AS students_class_9_10_boys,
  SUM(students_class_9_10_girls)                  AS students_class_9_10_girls,
  SUM(students_class_11_12_boys)                  AS students_class_11_12_boys,
  SUM(students_class_11_12_girls)                 AS students_class_11_12_girls,
  SUM(working_teachers)                           AS working_teachers,
  SUM(sanctioned_teachers)                        AS sanctioned_teachers,
  SUM(dropout_children_prev_year)                 AS dropout_children,
  SUM(computers_for_education)                    AS computers,
  SUM(skill_training_centers_count)               AS skill_training_centers,
  SUM(govt_hostels_count)                         AS govt_hostels,
  SUM(higher_edu_institutions_count)              AS higher_edu_institutions,

  -- ── SOCIAL WELFARE ────────────────────────────────────────────
  SUM(old_age_pensioners)                         AS old_age_pensioners,
  SUM(widow_pensioners)                           AS widow_pensioners,
  SUM(pwd_pensioners_est)                         AS pwd_pensioners_est,
  SUM(pm_ujjwala_beneficiaries)                   AS pm_ujjwala_beneficiaries,

  -- ── ECONOMY / LIVELIHOODS ─────────────────────────────────────
  SUM(lakhpati_didis_count)                       AS lakhpati_didis,
  SUM(millionaire_didis_count)                    AS millionaire_didis,
  SUM(active_shg_count)                           AS active_shg_count,
  SUM(women_in_shgs)                              AS women_in_shgs,
  SUM(shg_with_bank_account)                      AS shg_with_bank_account,
  SUM(shg_bank_linkage_count)                     AS shg_bank_linkage,
  SUM(local_artisans_count)                       AS local_artisans,
  SUM(large_industrial_units)                     AS large_industrial_units,
  SUM(small_scale_industries)                     AS small_scale_industries,
  SUM(mudra_loan_beneficiaries)                   AS mudra_loan_beneficiaries,

  -- ── INFRASTRUCTURE ────────────────────────────────────────────
  SUM(houses_with_electricity)                    AS houses_with_electricity,
  SUM(solar_installed_houses)                     AS solar_installed_houses,
  SUM(pm_surya_ghar_solar_houses)                 AS pm_surya_ghar_houses,
  SUM(road_length_km)                             AS road_length_km,
  SUM(total_street_lights)                        AS total_street_lights,
  SUM(solar_street_lights)                        AS solar_street_lights,
  SUM(public_toilets)                             AS public_toilets,
  SUM(govt_banks_count)                           AS govt_banks,
  SUM(pvt_banks_count)                            AS pvt_banks,
  SUM(post_offices_count)                         AS post_offices,
  SUM(pm_jan_dhan_accounts)                       AS jan_dhan_accounts,
  SUM(panchayat_bhawan_count)                     AS panchayat_bhawans,
  SUM(sports_grounds_count)                       AS sports_grounds,
  AVG(avg_electricity_hours_daily)                AS avg_electricity_hours,
  AVG(dist_main_market_km)                        AS dist_main_market_km,
  AVG(dist_bus_stand_km)                          AS dist_bus_stand_km,
  AVG(dist_railway_station_km)                    AS dist_railway_station_km,

  -- ── WATER & SANITATION ────────────────────────────────────────
  -- tap_connection_pct is a percentage → AVG, not SUM
  AVG(tap_connection_pct)                         AS tap_connection_pct,
  SUM(drinking_water_sources_count)               AS drinking_water_sources,
  SUM(overhead_tanks_count)                       AS overhead_tanks,
  SUM(handpump_tubewell_only_houses)              AS handpump_only_houses,
  SUM(tanker_only_supply_houses)                  AS tanker_only_houses,
  SUM(ro_facilities)                              AS ro_facilities,
  SUM(houses_with_toilets)                        AS houses_with_toilets,
  SUM(groundwater_recharge_structures)            AS groundwater_recharge_structures,
  AVG(groundwater_depth_meters)                   AS groundwater_depth_meters,
  AVG(water_quality_test_frequency)               AS water_quality_test_frequency,

  -- ── ENVIRONMENT ───────────────────────────────────────────────
  SUM(forest_area_hectare)                        AS forest_area_ha,
  SUM(pasture_land_hectare)                       AS pasture_land_ha,
  SUM(total_area_hectare)                         AS rural_total_area_ha,
  SUM(vacant_land_for_plantation_ha)              AS vacant_land_ha,
  SUM(total_waste_daily_kg)                       AS total_waste_daily_kg,
  SUM(wet_waste_daily_kg)                         AS wet_waste_daily_kg,
  SUM(dry_waste_daily_kg)                         AS dry_waste_daily_kg,
  SUM(govt_compost_pits_count)                    AS govt_compost_pits,
  SUM(biogas_plants_count)                        AS biogas_plants,
  SUM(door_to_door_collection_houses)             AS dtd_collection_houses,
  SUM(mrf_rrc_sheds_count)                        AS mrf_sheds,
  SUM(waste_dump_sites_count)                     AS waste_dump_sites,

  -- ── TOURISM & CULTURE ─────────────────────────────────────────
  SUM(annual_fairs_count)                         AS annual_fairs,
  SUM(cultural_assets_count)                      AS cultural_assets,
  SUM(fair_related_employment)                    AS fair_employment,
  SUM(fair_stalls_count)                          AS fair_stalls_count,
  SUM(registered_trained_guides)                  AS registered_trained_guides,
  AVG(avg_daily_footfall_cultural_sites)          AS avg_daily_footfall_cultural_sites,
  AVG(avg_fair_footfall_daily)                    AS avg_fair_footfall_daily,

  -- ── METADATA ──────────────────────────────────────────────────
  MAX(loaded_at)                                  AS last_loaded_at

FROM baseline_rural
WHERE district IS NOT NULL
GROUP BY district
WITH DATA;

-- Unique index required for CONCURRENT refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_rural_kpis_district
  ON mv_baseline_rural_district_kpis (district);

-- Also index for fast single-district lookups
CREATE INDEX IF NOT EXISTS idx_mv_rural_kpis_gp_count
  ON mv_baseline_rural_district_kpis (gp_count DESC);

COMMENT ON MATERIALIZED VIEW mv_baseline_rural_district_kpis IS
  'Pre-aggregated district-level KPIs from baseline_rural. '
  'Refresh after each ETL load: REFRESH MATERIALIZED VIEW CONCURRENTLY mv_baseline_rural_district_kpis;';


-- ============================================================
-- VIEW 2: mv_baseline_urban_district_kpis
-- One row per district. SUM for counts, AVG for percentages/rates.
-- ============================================================

DROP MATERIALIZED VIEW IF EXISTS mv_baseline_urban_district_kpis CASCADE;

CREATE MATERIALIZED VIEW mv_baseline_urban_district_kpis AS
SELECT
  district,

  -- ── WARD COUNT: unique district+ward combos (ward number unique within district) ─────────
  COUNT(DISTINCT (district || '|||' || ulb || '|||' || ward))    AS ward_count,
  COUNT(DISTINCT ulb)                             AS ulb_count,

  -- ── DEMOGRAPHICS ──────────────────────────────────────────────
  SUM(pop_2026_est)                               AS total_pop,
  SUM(female_pop_2026)                            AS female_pop,
  SUM(male_pop_2026)                              AS male_pop,
  SUM(pucca_houses_2026)                          AS pucca_houses,
  SUM(kutcha_houses_2026)                         AS kutcha_houses,
  SUM(senior_citizens_2026)                       AS senior_citizens,
  SUM(pwd_pop_2026)                               AS pwd_pop,
  SUM(children_0_6_2026)                          AS children_0_6,
  SUM(children_6_14_2026)                         AS children_6_14,
  SUM(pop_14_18_2026)                             AS pop_14_18,

  -- ── HEALTH ────────────────────────────────────────────────────
  SUM(allopathic_centers)                         AS allopathic_centers,
  SUM(ayush_centers)                              AS ayush_centers,
  SUM(private_health_centers)                     AS private_health_centers,
  SUM(health_center_beds)                         AS health_center_beds,
  SUM(working_health_staff)                       AS working_health_staff,
  SUM(sanctioned_health_staff)                    AS sanctioned_health_staff,
  SUM(ayushman_arogya_beneficiaries)              AS ayushman_beneficiaries,
  AVG(janaadhar_reg_families_pct)                 AS janaadhar_reg_families_pct,
  SUM(tb_patients_count)                          AS tb_patients,
  SUM(anemic_pregnant_women_count)                AS anemic_pregnant_women,
  SUM(anemic_children_count)                      AS anemic_children,
  SUM(diabetes_screened_fy2526)                   AS diabetes_screened,
  SUM(bp_screened_fy2526)                         AS bp_screened,
  SUM(snp_children_6_72m)                         AS snp_children,
  AVG(avg_daily_patients)                         AS avg_daily_patients,

  -- ── ANGANWADI / ICDS ──────────────────────────────────────────
  SUM(anganwadi_centers_count)                    AS anganwadi_centers,
  SUM(anganwadi_workers_count)                    AS anganwadi_workers,
  SUM(anganwadi_helpers_count)                    AS anganwadi_helpers,
  SUM(asha_workers_count)                         AS asha_workers,
  SUM(anganwadi_enrolled_children)                AS anganwadi_enrolled_children,
  SUM(anganwadi_pregnant_women)                   AS anganwadi_pregnant_women,
  SUM(sam_children_count)                         AS sam_children,
  SUM(growth_monitoring_children)                 AS growth_monitoring_children,

  -- ── EDUCATION ─────────────────────────────────────────────────
  SUM(govt_schools_count)                         AS govt_schools,
  SUM(pvt_schools_count)                          AS pvt_schools,
  SUM(total_schools_count)                        AS total_schools,
  SUM(useful_classrooms_count)                    AS useful_classrooms_count,
  SUM(total_enrolled_students)                    AS total_enrolled_students,
  SUM(working_teachers)                           AS working_teachers,
  SUM(sanctioned_teachers)                        AS sanctioned_teachers,
  SUM(dropout_children_prev_year)                 AS dropout_children,
  SUM(computers_for_education)                    AS computers,
  SUM(skill_training_centers_count)               AS skill_training_centers,
  SUM(govt_hostels_count)                         AS govt_hostels,
  SUM(higher_edu_institutions_count)              AS higher_edu_institutions,

  -- ── SOCIAL WELFARE ────────────────────────────────────────────
  SUM(old_age_pensioners)                         AS old_age_pensioners,
  SUM(widow_pensioners)                           AS widow_pensioners,
  SUM(pwd_pensioners_est)                         AS pwd_pensioners_est,
  SUM(pm_ujjwala_beneficiaries)                   AS pm_ujjwala_beneficiaries,
  SUM(pm_cm_awas_beneficiaries)                   AS pm_cm_awas_beneficiaries,

  -- ── ECONOMY / LIVELIHOODS ─────────────────────────────────────
  SUM(active_shg_count)                           AS active_shg_count,
  SUM(women_in_shgs)                              AS women_in_shgs,
  SUM(shg_with_bank_account)                      AS shg_with_bank_account,
  SUM(shg_bank_linkage_count)                     AS shg_bank_linkage,
  SUM(local_artisans_count)                       AS local_artisans,
  SUM(large_industrial_units)                     AS large_industrial_units,
  SUM(small_scale_industries)                     AS small_scale_industries,

  -- ── INFRASTRUCTURE ────────────────────────────────────────────
  SUM(houses_with_electricity)                    AS houses_with_electricity,
  SUM(solar_installed_houses)                     AS solar_installed_houses,
  SUM(pm_surya_ghar_solar_houses)                 AS pm_surya_ghar_houses,
  SUM(road_length_km)                             AS road_length_km,
  SUM(public_toilets)                             AS public_toilets,
  SUM(govt_banks_count)                           AS govt_banks,
  SUM(pvt_banks_count)                            AS pvt_banks,
  SUM(sports_grounds_count)                       AS sports_grounds,
  AVG(avg_electricity_hours_daily)                AS avg_electricity_hours,
  AVG(dist_main_market_km)                        AS dist_main_market_km,
  AVG(dist_bus_stand_km)                          AS dist_bus_stand_km,
  AVG(dist_railway_station_km)                    AS dist_railway_station_km,

  -- ── WATER & SANITATION ────────────────────────────────────────
  AVG(tap_connection_pct)                         AS tap_connection_pct,
  SUM(overhead_tanks_count)                       AS overhead_tanks,
  SUM(ro_facilities)                              AS ro_facilities,
  SUM(houses_without_toilets)                     AS houses_without_toilets,
  SUM(houses_without_sewerage)                    AS houses_without_sewerage,
  SUM(groundwater_recharge_structures)            AS groundwater_recharge_structures,
  AVG(groundwater_depth_meters)                   AS groundwater_depth_meters,
  AVG(water_quality_test_frequency)               AS water_quality_test_frequency,
  SUM(handpump_count)                             AS handpump_count,
  SUM(well_count)                                 AS well_count,
  SUM(tank_count)                                 AS tank_count,

  -- ── ENVIRONMENT ───────────────────────────────────────────────
  SUM(forest_area_hectare)                        AS forest_area_ha,
  SUM(total_area_hectare)                         AS urban_total_area_ha,
  SUM(govt_compost_pits_count)                    AS govt_compost_pits,
  SUM(door_to_door_collection_houses)             AS dtd_collection_houses,
  SUM(govt_nurseries_count)                       AS govt_nurseries_count,
  SUM(nursery_plants_count)                       AS nursery_plants_count,

  -- ── TOURISM ───────────────────────────────────────────────────
  SUM(annual_fairs_count)                         AS annual_fairs,
  SUM(fair_shg_stalls_count)                      AS fair_shg_stalls_count,
  SUM(registered_trained_guides)                  AS registered_trained_guides,
  AVG(avg_fair_footfall_daily)                    AS avg_fair_footfall_daily,

  -- ── METADATA ──────────────────────────────────────────────────
  MAX(loaded_at)                                  AS last_loaded_at

FROM baseline_urban
WHERE district IS NOT NULL
GROUP BY district
WITH DATA;

-- Unique index required for CONCURRENT refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_urban_kpis_district
  ON mv_baseline_urban_district_kpis (district);

CREATE INDEX IF NOT EXISTS idx_mv_urban_kpis_ward_count
  ON mv_baseline_urban_district_kpis (ward_count DESC);

COMMENT ON MATERIALIZED VIEW mv_baseline_urban_district_kpis IS
  'Pre-aggregated district-level KPIs from baseline_urban. '
  'Refresh after each ETL load: REFRESH MATERIALIZED VIEW CONCURRENTLY mv_baseline_urban_district_kpis;';


-- ============================================================
-- ASPIRATIONS TABLE: Additional Indexes (Performance Fix)
-- Fixes point #3 from sir's list: natural-key index structure
-- ============================================================

-- Composite index for the most common query pattern (status filter + district)
CREATE INDEX IF NOT EXISTS idx_aspirations_status_district
  ON aspirations (status, district, area_type, planning_year);

-- Natural-key index for upsert deduplication
CREATE INDEX IF NOT EXISTS idx_aspirations_natural_key
  ON aspirations (district, block, gram_panchayat, item, planning_year)
  WHERE status IN ('ACCEPT', 'FUNDED', 'REVIEW');

-- Partial index on active records only — dramatically reduces scan size
CREATE INDEX IF NOT EXISTS idx_aspirations_active_sector
  ON aspirations (sector, dept, status)
  WHERE status IN ('ACCEPT', 'FUNDED', 'REVIEW');

-- Index for fast_track filter used in dashboard
CREATE INDEX IF NOT EXISTS idx_aspirations_fast_track
  ON aspirations (fast_track, status)
  WHERE fast_track = true AND status IN ('ACCEPT', 'FUNDED', 'REVIEW');


-- ============================================================
-- HELPER: Manual refresh command (run after each ETL load)
-- ============================================================

-- Uncomment and run these after every data load:
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_baseline_rural_district_kpis;
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_baseline_urban_district_kpis;

-- Verify row counts:
-- SELECT 'rural' AS view, COUNT(*) AS district_count FROM mv_baseline_rural_district_kpis
-- UNION ALL
-- SELECT 'urban' AS view, COUNT(*) AS district_count FROM mv_baseline_urban_district_kpis;

DROP MATERIALIZED VIEW IF EXISTS mv_aspirations_summary CASCADE;

CREATE MATERIALIZED VIEW mv_aspirations_summary AS
SELECT 
  district,
  area_type,
  sector,
  dept,
  item,
  status,
  fast_track,
  planning_year,
  MIN(priority) as priority,
  COUNT(*) as total_count,
  SUM(qty_2030) as sum_qty_2030,
  SUM(qty_2035) as sum_qty_2035,
  SUM(qty_2047) as sum_qty_2047,
  SUM(total_budget) as total_budget,
  SUM(budget_2030) as sum_budget_2030,
  SUM(budget_2035) as sum_budget_2035,
  SUM(budget_2047) as sum_budget_2047
FROM aspirations
WHERE status IN ('ACCEPT', 'FUNDED', 'REVIEW')
GROUP BY district, area_type, sector, dept, item, status, fast_track, planning_year;

CREATE UNIQUE INDEX idx_mv_asp_summary ON mv_aspirations_summary(district, area_type, sector, dept, item, status, fast_track, planning_year);

CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW mv_baseline_rural_district_kpis;
  REFRESH MATERIALIZED VIEW mv_baseline_urban_district_kpis;
  REFRESH MATERIALIZED VIEW mv_aspirations_summary;
END;
$$ LANGUAGE plpgsql;

-- New function for fast aspirations refresh
CREATE OR REPLACE FUNCTION refresh_aspirations_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW mv_aspirations_summary;
END;
$$ LANGUAGE plpgsql;
