-- 1. MASTER REGISTRY
CREATE TABLE IF NOT EXISTS dim_rural_gps (
    gp_id SERIAL PRIMARY KEY,
    district TEXT NOT NULL,
    block TEXT NOT NULL,
    gram_panchayat TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(district, block, gram_panchayat)
);

-- 2. ADMINISTRATIVE & DEMOGRAPHIC (22 Headers)
CREATE TABLE IF NOT EXISTS fact_rural_admin (
    gp_id INTEGER PRIMARY KEY REFERENCES dim_rural_gps(gp_id) ON DELETE CASCADE,
    rev_villages_count NUMERIC,
    pop_2011 NUMERIC,
    pop_2026_est NUMERIC,
    male_pop_2026 NUMERIC,
    female_pop_2026 NUMERIC,
    transgender_pop_2026 NUMERIC,
    children_0_6_2026 NUMERIC,
    children_6_14_2026 NUMERIC,
    pop_14_18_2026 NUMERIC,
    defense_personnel_2026 NUMERIC,
    pwd_pop_2026 NUMERIC,
    senior_citizens_2026 NUMERIC,
    nomadic_pop_2026 NUMERIC,
    total_area_hectare NUMERIC,
    pucca_houses_2026 NUMERIC,
    kutcha_houses_2026 NUMERIC,
    total_families_2026 NUMERIC,
    bpl_families_count NUMERIC,
    nfsa_beneficiary_families NUMERIC,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. EDUCATION & SKILLING (38 Headers)
CREATE TABLE IF NOT EXISTS fact_rural_education (
    gp_id INTEGER PRIMARY KEY REFERENCES dim_rural_gps(gp_id) ON DELETE CASCADE,
    anganwadi_centers NUMERIC,
    anganwadi_workers NUMERIC,
    anganwadi_helpers NUMERIC,
    anganwadi_enrolled_children NUMERIC,
    anganwadi_pregnant_women NUMERIC,
    asha_sahyogini_count NUMERIC,
    useful_rooms_count NUMERIC,
    computers_available NUMERIC,
    working_teachers NUMERIC,
    pvt_schools_count NUMERIC,
    total_enrolled_students NUMERIC,
    govt_schools_count NUMERIC,
    total_schools_count NUMERIC,
    higher_edu_institutes NUMERIC,
    sam_children_count NUMERIC,
    enrolled_girls_0_5 NUMERIC,
    enrolled_boys_0_5 NUMERIC,
    enrolled_girls_11_12 NUMERIC,
    enrolled_boys_11_12 NUMERIC,
    enrolled_girls_above_12 NUMERIC,
    enrolled_boys_above_12 NUMERIC,
    enrolled_girls_6_8 NUMERIC,
    enrolled_boys_6_8 NUMERIC,
    enrolled_girls_9_10 NUMERIC,
    enrolled_boys_9_10 NUMERIC,
    dropout_children_prev_year NUMERIC,
    college_students_est NUMERIC,
    growth_monitoring_children NUMERIC,
    skill_training_centers NUMERIC,
    trained_students_annual NUMERIC,
    govt_hostels_count NUMERIC,
    hostel_residents_count NUMERIC,
    pre_school_monitored_children NUMERIC,
    sanctioned_teachers_count NUMERIC,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. AGRICULTURE & LIVELIHOOD (66 Headers)
CREATE TABLE IF NOT EXISTS fact_rural_livelihood (
    gp_id INTEGER PRIMARY KEY REFERENCES dim_rural_gps(gp_id) ON DELETE CASCADE,
    cultivable_land_hectare NUMERIC,
    gross_sown_area NUMERIC,
    net_sown_area NUMERIC,
    irrigated_area_hectare NUMERIC,
    kharif_production_quintal NUMERIC,
    kharif_area_hectare NUMERIC,
    rabi_area_hectare NUMERIC,
    rabi_production_quintal NUMERIC,
    solar_pumps_count NUMERIC,
    total_farmers_count NUMERIC,
    large_farmers_count NUMERIC,
    small_farmers_count NUMERIC,
    agri_electricity_conn NUMERIC,
    daily_agri_units_cons NUMERIC,
    diesel_pumps_count NUMERIC,
    total_livestock_count NUMERIC,
    milch_animals_count NUMERIC,
    milk_collection_centers NUMERIC,
    daily_milk_prod_litres NUMERIC,
    milk_collection_cap_litres NUMERIC,
    fpo_count NUMERIC,
    annual_farmer_loan_lakhs NUMERIC,
    annual_livestock_loan_lakhs NUMERIC,
    kcc_holders_count NUMERIC,
    pm_cm_kisan_beneficiaries NUMERIC,
    fpo_land_area NUMERIC,
    fpo_connected_farmers NUMERIC,
    food_processing_unit_type TEXT,
    food_processing_unit_count NUMERIC,
    food_processing_prod_quintal NUMERIC,
    organic_farming_area NUMERIC,
    organic_farming_farmers NUMERIC,
    soil_health_cards_valid NUMERIC,
    soil_health_card_land NUMERIC,
    drip_sprinkler_area NUMERIC,
    drip_sprinkler_farmers NUMERIC,
    polyhouse_area NUMERIC,
    polyhouse_farmers NUMERIC,
    plastic_mulching_area NUMERIC,
    plastic_mulching_farmers NUMERIC,
    crop_insurance_area NUMERIC,
    crop_insurance_farmers NUMERIC,
    food_processing_employment NUMERIC,
    floriculture_area NUMERIC,
    floriculture_farmers NUMERIC,
    goat_farms_count NUMERIC,
    annual_goat_production NUMERIC,
    mangla_pashu_bima_ben NUMERIC,
    fisheries_prod_quintal NUMERIC,
    fisheries_water_sources NUMERIC,
    medium_farmers_count NUMERIC,
    poultry_farms_count NUMERIC,
    poultry_egg_production NUMERIC,
    poultry_chicken_production NUMERIC,
    dist_seed_center_km NUMERIC,
    dist_mandi_km NUMERIC,
    mandi_location TEXT,
    dist_grain_storage_km NUMERIC,
    govt_vet_centers NUMERIC,
    pig_farms_count NUMERIC,
    pig_annual_production NUMERIC,
    horticulture_area NUMERIC,
    horticulture_farmers NUMERIC,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. HEALTH AND WELFARE (19 Headers)
CREATE TABLE IF NOT EXISTS fact_rural_health (
    gp_id INTEGER PRIMARY KEY REFERENCES dim_rural_gps(gp_id) ON DELETE CASCADE,
    allopathic_centers NUMERIC,
    ayush_centers NUMERIC,
    snp_recipients_6_72_months NUMERIC,
    tb_patients_count NUMERIC,
    hypertension_screening_count NUMERIC,
    anemic_pregnant_women NUMERIC,
    anemic_children_count NUMERIC,
    janaadhar_registered_families_pct NUMERIC,
    avg_daily_patients NUMERIC,
    private_health_centers NUMERIC,
    diabetes_screening_count NUMERIC,
    ayushman_arogya_beneficiaries NUMERIC,
    annapurna_rasoi_beneficiaries NUMERIC,
    health_center_beds NUMERIC,
    working_health_staff NUMERIC,
    sanctioned_health_staff NUMERIC,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. INFRASTRUCTURE AND TRANSPORTATION (23 Headers)
CREATE TABLE IF NOT EXISTS fact_rural_infra (
    gp_id INTEGER PRIMARY KEY REFERENCES dim_rural_gps(gp_id) ON DELETE CASCADE,
    govt_banks_count NUMERIC,
    private_banks_count NUMERIC,
    pm_jan_dhan_accounts NUMERIC,
    public_buildings_count NUMERIC,
    houses_with_electricity NUMERIC,
    total_street_lights NUMERIC,
    playgrounds_count NUMERIC,
    panchayat_bhawan_availability NUMERIC,
    post_offices_count NUMERIC,
    avg_electricity_hours_daily NUMERIC,
    dist_bus_stand_km NUMERIC,
    dist_main_market_km NUMERIC,
    dist_nearest_bank_km NUMERIC,
    dist_railway_station_km NUMERIC,
    public_buildings_with_ramps NUMERIC,
    rainwater_harvesting_buildings NUMERIC,
    road_length_km NUMERIC,
    solar_installed_houses NUMERIC,
    solar_installed_public_buildings NUMERIC,
    solar_street_lights NUMERIC,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. INDUSTRIAL, MINING, AND ECONOMIC DEVELOPMENT (19 Headers)
CREATE TABLE IF NOT EXISTS fact_rural_economy (
    gp_id INTEGER PRIMARY KEY REFERENCES dim_rural_gps(gp_id) ON DELETE CASCADE,
    active_shg_count NUMERIC,
    women_in_shgs NUMERIC,
    total_working_persons NUMERIC,
    shgs_with_bank_accounts NUMERIC,
    shg_funds_received_lakhs NUMERIC,
    shgs_received_first_tranche NUMERIC,
    mudra_loan_beneficiaries NUMERIC,
    shgs_with_bank_linkage NUMERIC,
    large_industrial_units NUMERIC,
    employment_in_large_industries NUMERIC,
    livelihood_activity_types TEXT,
    millionaire_didis_count NUMERIC,
    lakhpati_didis_count NUMERIC,
    small_scale_industries_count NUMERIC,
    employment_in_small_industries NUMERIC,
    local_artisans_count NUMERIC,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. SOCIAL EMPOWERMENT AND INCLUSION (8 Headers)
CREATE TABLE IF NOT EXISTS fact_rural_social (
    gp_id INTEGER PRIMARY KEY REFERENCES dim_rural_gps(gp_id) ON DELETE CASCADE,
    pm_ujjwala_beneficiaries NUMERIC,
    pm_cm_awas_beneficiaries NUMERIC,
    old_age_pensioners NUMERIC,
    widow_pensioners NUMERIC,
    pwd_pensioners_est NUMERIC,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. WATER SECURITY AND COMMUNITY CAPACITY (15 Headers)
CREATE TABLE IF NOT EXISTS fact_rural_water (
    gp_id INTEGER PRIMARY KEY REFERENCES dim_rural_gps(gp_id) ON DELETE CASCADE,
    handpump_tubewell_only_houses NUMERIC,
    daily_water_available_litres NUMERIC,
    daily_water_demand_litres NUMERIC,
    daily_water_availability_litres NUMERIC,
    tap_connection_pct NUMERIC,
    water_quality_test_frequency NUMERIC,
    overhead_tanks_count NUMERIC,
    tanker_supply_daily_litres NUMERIC,
    overhead_tank_supply_litres NUMERIC,
    tanker_only_supply_houses NUMERIC,
    groundwater_depth_meters NUMERIC,
    agri_water_sources_count NUMERIC,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. ENVIRONMENTAL SUSTAINABILITY AND CLIMATE RESILIENCE (26 Headers)
CREATE TABLE IF NOT EXISTS fact_rural_environment (
    gp_id INTEGER PRIMARY KEY REFERENCES dim_rural_gps(gp_id) ON DELETE CASCADE,
    govt_compost_pits_capacity_kg NUMERIC,
    pvt_compost_pits_capacity_kg NUMERIC,
    govt_compost_pits_count NUMERIC,
    pvt_compost_pits_count NUMERIC,
    mrf_sheds_count NUMERIC,
    waste_processing_units NUMERIC,
    total_waste_daily_kg NUMERIC,
    wet_waste_daily_kg NUMERIC,
    door_to_door_collection_houses NUMERIC,
    forest_area_hectare NUMERIC,
    pasture_land_hectare NUMERIC,
    domestic_wastewater_daily_litres NUMERIC,
    nursery_saplings_available NUMERIC,
    pm_surya_ghar_solar_houses NUMERIC,
    biogas_plants_count NUMERIC,
    biogas_capacity_kg NUMERIC,
    community_wastewater_mgmt_houses NUMERIC,
    vacant_land_for_plantation_hectare NUMERIC,
    waste_dump_sites NUMERIC,
    houses_with_toilets NUMERIC,
    govt_nurseries_count NUMERIC,
    public_building_plantation_area NUMERIC,
    dry_waste_daily_kg NUMERIC,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. TOURISM AND CULTURAL DEVELOPMENT (14 Headers)
CREATE TABLE IF NOT EXISTS fact_rural_tourism (
    gp_id INTEGER PRIMARY KEY REFERENCES dim_rural_gps(gp_id) ON DELETE CASCADE,
    avg_daily_footfall_cultural_sites NUMERIC,
    local_product_stalls NUMERIC,
    shg_operated_stalls NUMERIC,
    annual_fairs_count NUMERIC,
    main_fair_names TEXT,
    cultural_assets_count NUMERIC,
    avg_fair_footfall_daily NUMERIC,
    avg_stall_revenue_fairs NUMERIC,
    registered_trained_guides NUMERIC,
    temporary_fair_stalls NUMERIC,
    fair_related_employment NUMERIC,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. EFFECTIVE GOVERNANCE AND PUBLIC SERVICES (7 Headers)
CREATE TABLE IF NOT EXISTS fact_rural_governance (
    gp_id INTEGER PRIMARY KEY REFERENCES dim_rural_gps(gp_id) ON DELETE CASCADE,
    dist_fire_station_km NUMERIC,
    dist_emitra_km NUMERIC,
    dist_lpg_distributor_km NUMERIC,
    dist_police_station_km NUMERIC,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);