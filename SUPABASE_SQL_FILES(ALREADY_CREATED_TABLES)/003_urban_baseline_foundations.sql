CREATE TABLE dim_urban_wards (
    ward_id SERIAL PRIMARY KEY,
    district TEXT NOT NULL,
    ulb TEXT NOT NULL, -- Urban Local Body (Nagar Nigam/Parishad/Palika)
    ward TEXT NOT NULL,
    UNIQUE(district, ulb, ward)
);

-- 1. प्रशासनिक एवं जनसांख्यिकीय विवरण (Admin and demographic info - 17 Headers)
-- (जिला, ULB, वार्ड + 14 डेटा कॉलम्स)
CREATE TABLE IF NOT EXISTS fact_urban_admin (
    ward_id INTEGER PRIMARY KEY REFERENCES dim_urban_wards(ward_id) ON DELETE CASCADE,
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
    total_area_hectare NUMERIC,
    pucca_houses_2026 NUMERIC,
    kutcha_houses_2026 NUMERIC,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. शिक्षा संबंधी जानकारी (Education related info - 38 Headers)
-- (जिला, ULB, वार्ड + 35 डेटा कॉलम्स)
CREATE TABLE IF NOT EXISTS fact_urban_education (
    ward_id INTEGER PRIMARY KEY REFERENCES dim_urban_wards(ward_id) ON DELETE CASCADE,
    anganwadi_centers NUMERIC,
    anganwadi_workers NUMERIC,
    anganwadi_helpers NUMERIC,
    anganwadi_enrolled_children NUMERIC,
    anganwadi_pregnant_women NUMERIC,
    asha_sahyogini_count NUMERIC,
    sam_children_count NUMERIC,
    growth_monitoring_children NUMERIC,
    useful_rooms_count NUMERIC,
    computers_available NUMERIC,
    working_teachers NUMERIC,
    pvt_schools_count NUMERIC,
    total_enrolled_students NUMERIC,
    govt_schools_count NUMERIC,
    total_schools_count NUMERIC,
    higher_edu_institutes NUMERIC,
    dropout_children_prev_year NUMERIC,
    college_students_est NUMERIC,
    school_enrolled_students NUMERIC,
    govt_hostels_count NUMERIC,
    hostel_residents_count NUMERIC,
    pre_school_monitored_children NUMERIC,
    sanctioned_teachers_count NUMERIC,
    enrolled_girls_0_5 NUMERIC,
    enrolled_boys_0_5 NUMERIC,
    enrolled_girls_6_8 NUMERIC,
    enrolled_boys_6_8 NUMERIC,
    enrolled_girls_9_10 NUMERIC,
    enrolled_boys_9_10 NUMERIC,
    enrolled_girls_11_12 NUMERIC,
    enrolled_boys_11_12 NUMERIC,
    enrolled_girls_above_12 NUMERIC,
    enrolled_boys_above_12 NUMERIC,
    skill_training_centers NUMERIC,
    trained_persons_count NUMERIC,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. स्वास्थ्य एवं कल्याण (Health and welfare - 19 Headers)
CREATE TABLE IF NOT EXISTS fact_urban_health (
    ward_id INTEGER PRIMARY KEY REFERENCES dim_urban_wards(ward_id) ON DELETE CASCADE,
    allopathic_centers NUMERIC,
    ayush_centers NUMERIC,
    pvt_health_centers NUMERIC,
    snp_recipients_6_72_months NUMERIC,
    tb_patients_count NUMERIC,
    hypertension_screening_2025_26 NUMERIC,
    anemic_pregnant_women NUMERIC,
    anemic_children_count NUMERIC,
    janaadhar_reg_families_pct NUMERIC,
    avg_daily_patients NUMERIC,
    diabetes_screening_2025_26 NUMERIC,
    ayushman_arogya_beneficiaries NUMERIC,
    annapurna_rasoi_beneficiaries NUMERIC,
    health_center_beds NUMERIC,
    working_health_staff NUMERIC,
    sanctioned_health_staff NUMERIC,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. मुख्य (इंफ्रास्ट्रक्चर) आवागमन संबंधित (Infra and transportation - 18 Headers)
CREATE TABLE IF NOT EXISTS fact_urban_infra (
    ward_id INTEGER PRIMARY KEY REFERENCES dim_urban_wards(ward_id) ON DELETE CASCADE,
    govt_banks_count NUMERIC,
    private_banks_count NUMERIC,
    houses_with_electricity NUMERIC,
    playgrounds_count NUMERIC,
    avg_electricity_hours_daily NUMERIC,
    rainwater_harvesting_buildings NUMERIC,
    road_length_km NUMERIC,
    solar_installed_houses NUMERIC,
    solar_installed_public_buildings NUMERIC,
    public_toilets_functional NUMERIC,
    gss_count NUMERIC,
    dist_bus_stand_km NUMERIC,
    dist_main_market_km NUMERIC,
    dist_railway_station_km NUMERIC,
    community_buildings_count NUMERIC,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. औद्योगिक, खनन और आर्थिक विकास (Industrial mining and Economic development - 15 Headers)
CREATE TABLE IF NOT EXISTS fact_urban_economy (
    ward_id INTEGER PRIMARY KEY REFERENCES dim_urban_wards(ward_id) ON DELETE CASCADE,
    active_shg_count NUMERIC,
    shg_livelihood_types TEXT,
    women_in_shgs NUMERIC,
    shgs_with_bank_accounts NUMERIC,
    shg_funds_received_lakhs NUMERIC,
    shgs_with_bank_linkage NUMERIC,
    large_industrial_units NUMERIC,
    employment_large_industries NUMERIC,
    small_scale_industries NUMERIC,
    employment_small_industries NUMERIC,
    artisan_livelihood_types TEXT,
    local_artisans_count NUMERIC,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. जल सुरक्षा और समुदाय आधारित क्षमता (Water security and community based capacity - 14 Headers)
CREATE TABLE IF NOT EXISTS fact_urban_water (
    ward_id INTEGER PRIMARY KEY REFERENCES dim_urban_wards(ward_id) ON DELETE CASCADE,
    wells_count NUMERIC,
    well_water_supply_daily NUMERIC,
    tanks_count NUMERIC,
    tank_water_supply_daily NUMERIC,
    handpumps_count NUMERIC,
    handpump_water_supply_daily NUMERIC,
    overhead_tanks_count NUMERIC,
    overhead_tank_supply_daily NUMERIC,
    tap_connection_pct NUMERIC,
    water_quality_test_frequency NUMERIC,
    groundwater_depth_meters NUMERIC,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. पर्यावरणीय स्थिरता और जलवायु अनुकूलता (Environmental sustainability - 19 Headers)
CREATE TABLE IF NOT EXISTS fact_urban_environment (
    ward_id INTEGER PRIMARY KEY REFERENCES dim_urban_wards(ward_id) ON DELETE CASCADE,
    govt_compost_pits_cap NUMERIC,
    pvt_compost_pits_cap NUMERIC,
    govt_compost_pits_count NUMERIC,
    pvt_compost_pits_count NUMERIC,
    door_to_door_collection_houses NUMERIC,
    total_sanitation_staff NUMERIC,
    forest_protected_area_hectare NUMERIC,
    domestic_wastewater_daily_litres NUMERIC,
    houses_without_toilets NUMERIC,
    houses_without_sewerage NUMERIC,
    nursery_saplings_available NUMERIC,
    pm_surya_ghar_solar_houses NUMERIC,
    community_wastewater_mgmt_houses NUMERIC,
    vacant_land_plantation_hectare NUMERIC,
    govt_nurseries_count NUMERIC,
    public_building_plantation_area NUMERIC,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. पर्यटन एवं सांस्कृतिक विकास (Tourism and cultural development - 14 Headers)
CREATE TABLE IF NOT EXISTS fact_urban_tourism (
    ward_id INTEGER PRIMARY KEY REFERENCES dim_urban_wards(ward_id) ON DELETE CASCADE,
    avg_daily_footfall_cultural NUMERIC,
    local_product_stalls NUMERIC,
    shg_operated_stalls NUMERIC,
    annual_fairs_count NUMERIC,
    main_fair_names TEXT,
    cultural_assets_count NUMERIC,
    avg_fair_footfall_daily NUMERIC,
    avg_stall_revenue_daily NUMERIC,
    registered_trained_guides NUMERIC,
    temporary_fair_stalls NUMERIC,
    fair_related_employment NUMERIC,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. सामाजिक सशक्तिकरण और समावेशन (Social empowerment and inclusion - 8 Headers)
CREATE TABLE IF NOT EXISTS fact_urban_social (
    ward_id INTEGER PRIMARY KEY REFERENCES dim_urban_wards(ward_id) ON DELETE CASCADE,
    pm_ujjwala_beneficiaries NUMERIC,
    pm_cm_awas_beneficiaries NUMERIC,
    old_age_pensioners NUMERIC,
    widow_pensioners NUMERIC,
    pwd_pensioners_est NUMERIC,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. प्रभावी शासन और सार्वजनिक सेवाएं (Effective governance - 7 Headers)
CREATE TABLE IF NOT EXISTS fact_urban_governance (
    ward_id INTEGER PRIMARY KEY REFERENCES dim_urban_wards(ward_id) ON DELETE CASCADE,
    dist_emitra_km NUMERIC,
    dist_fire_station_km NUMERIC,
    dist_lpg_distributor_km NUMERIC,
    dist_police_station_km NUMERIC,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);