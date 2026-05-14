"""
export_to_csv.py
Export baseline Excel data as Supabase-ready CSVs with gp_id/ward_id included.
Reads IDs directly from Excel — no Supabase connection needed.

Run: python ETL/export_to_csv.py
Output: DATA/CSV_EXPORT/ folder with dim tables + fact tables, import-ready.
"""
from __future__ import annotations
import warnings
warnings.filterwarnings("ignore")

import time
from collections import defaultdict
from pathlib import Path

import pandas as pd

OUTPUT_DIR = Path("DATA/CSV_EXPORT")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

RURAL_FILE = Path("DATA/RAW/RURAL_BASELINE/Rural_GP_Final_Baseline.xlsx")
URBAN_FILE = Path("DATA/RAW/URBAN_BASELINE/Urban_Ward_Final_Baseline.xlsx")

# Drop these columns from fact tables (they're in dim tables)
DROP_RURAL_KEYS = ["district", "block", "gram_panchayat"]
DROP_URBAN_KEYS = ["district", "ulb", "ward"]

# ── RURAL SHEET CONFIGS ──────────────────────────────────────────────────────
RURAL_CONFIGS = [
    {
        "sheet": "01_Population",
        "table": "fact_rural_admin",
        "key": {"district_eng": "district", "block_eng": "block", "gp_eng": "gram_panchayat"},
        "cols": {
            "gp_id": "gp_id",
            "pop_census2011": "pop_2011", "pop_est2026": "pop_2026_est",
            "pop_male": "male_pop_2026", "pop_female": "female_pop_2026",
            "children_0_6": "children_0_6_2026", "children_6_14": "children_6_14_2026",
            "pop_14_18": "pop_14_18_2026", "senior_60plus": "senior_citizens_2026",
            "pwd_count": "pwd_pop_2026", "total_families": "total_families_2026",
            "bpl_families": "bpl_families_count", "nfsa_families": "nfsa_beneficiary_families",
            "pucca_houses": "pucca_houses_2026", "kachha_houses": "kutcha_houses_2026",
        },
    },
    {
        "sheet": "02_Agriculture",
        "table": "fact_rural_livelihood",
        "key": {"district_eng": "district", "block_eng": "block", "gp_eng": "gram_panchayat"},
        "cols": {
            "gp_id": "gp_id",
            "agri_land_ha": "cultivable_land_hectare", "irrigated_area_ha": "irrigated_area_hectare",
            "net_sown_area_ha": "net_sown_area", "kharif_area_ha": "kharif_area_hectare",
            "kharif_production_qtl": "kharif_production_quintal", "rabi_area_ha": "rabi_area_hectare",
            "rabi_production_qtl": "rabi_production_quintal", "total_farmers": "total_farmers_count",
            "small_farmers": "small_farmers_count", "medium_farmers": "medium_farmers_count",
            "large_farmers": "large_farmers_count", "kcc_holders": "kcc_holders_count",
            "pm_kisan_beneficiaries": "pm_cm_kisan_beneficiaries",
            "soil_health_cards": "soil_health_cards_valid",
            "crop_insurance_farmers": "crop_insurance_farmers", "fpo_count": "fpo_count",
            "drip_sprinkler_farmers": "drip_sprinkler_farmers", "solar_pumps": "solar_pumps_count",
            "agri_electric_connections": "agri_electricity_conn", "vet_centers": "govt_vet_centers",
        },
    },
    {
        "sheet": "03_Livestock",
        "table": "fact_rural_livelihood",
        "key": {"district_eng": "district", "block_eng": "block", "gp_eng": "gram_panchayat"},
        "cols": {
            "gp_id": "gp_id",
            "total_livestock": "total_livestock_count", "milch_animals": "milch_animals_count",
            "milk_production_lpd": "daily_milk_prod_litres",
            "milk_collection_centers": "milk_collection_centers",
            "goat_farms": "goat_farms_count", "poultry_farms": "poultry_farms_count",
            "horticulture_area_ha": "horticulture_area",
            "organic_farming_area_ha": "organic_farming_area",
            "livestock_insurance": "mangla_pashu_bima_ben",
        },
    },
    {
        "sheet": "04_Health",
        "table": "fact_rural_health",
        "key": {"district_eng": "district", "block_eng": "block", "gp_eng": "gram_panchayat"},
        "cols": {
            "gp_id": "gp_id",
            "allopathic_centers": "allopathic_centers", "ayush_centers": "ayush_centers",
            "pvt_health_centers": "private_health_centers", "health_beds": "health_center_beds",
            "health_workers_active": "working_health_staff", "avg_daily_patients": "avg_daily_patients",
            "ayushman_beneficiaries": "ayushman_arogya_beneficiaries",
            "jan_aadhar_pct": "janaadhar_registered_families_pct",
            "tb_cases": "tb_patients_count", "anemic_pregnant": "anemic_pregnant_women",
            "phc_dist_km": "phc_dist_km", "chc_dist_km": "chc_dist_km",
        },
    },
    {
        "sheet": "05_Anganwadi_ICDS",
        "table": "fact_rural_education",
        "key": {"district_eng": "district", "block_eng": "block", "gp_eng": "gram_panchayat"},
        "cols": {
            "gp_id": "gp_id",
            "anganwadi_centers": "anganwadi_centers", "anganwadi_workers": "anganwadi_workers",
            "anganwadi_helpers": "anganwadi_helpers",
            "anganwadi_enrolled": "anganwadi_enrolled_children",
            "anganwadi_pregnant": "anganwadi_pregnant_women",
            "asha_workers": "asha_sahyogini_count", "sam_children": "sam_children_count",
        },
    },
    {
        "sheet": "06_Education",
        "table": "fact_rural_education",
        "key": {"district_eng": "district", "block_eng": "block", "gp_eng": "gram_panchayat"},
        "cols": {
            "gp_id": "gp_id",
            "govt_schools": "govt_schools_count", "pvt_schools": "pvt_schools_count",
            "total_schools": "total_schools_count", "school_rooms": "useful_rooms_count",
            "teachers_active": "working_teachers", "teachers_sanctioned": "sanctioned_teachers_count",
            "school_computers": "computers_available", "enrolled_students": "total_enrolled_students",
            "boys_class_0_5": "enrolled_boys_0_5", "girls_class_0_5": "enrolled_girls_0_5",
            "boys_class_6_8": "enrolled_boys_6_8", "girls_class_6_8": "enrolled_girls_6_8",
            "boys_class_9_10": "enrolled_boys_9_10", "girls_class_9_10": "enrolled_girls_9_10",
            "boys_class_11_12": "enrolled_boys_11_12", "girls_class_11_12": "enrolled_girls_11_12",
            "dropout_children": "dropout_children_prev_year", "skill_centers": "skill_training_centers",
            "govt_hostels": "govt_hostels_count", "colleges_count": "higher_edu_institutes",
        },
    },
    {
        "sheet": "07_Social_Welfare",
        "table": "fact_rural_social",
        "key": {"district_eng": "district", "block_eng": "block", "gp_eng": "gram_panchayat"},
        "cols": {
            "gp_id": "gp_id",
            "old_age_pension": "old_age_pensioners", "widow_pension": "widow_pensioners",
            "pwd_pension": "pwd_pensioners_est", "ujjwala_beneficiaries": "pm_ujjwala_beneficiaries",
            "pm_cm_awas": "pm_cm_awas_beneficiaries",
        },
    },
    {
        "sheet": "07_Social_Welfare",
        "table": "fact_rural_economy",
        "key": {"district_eng": "district", "block_eng": "block", "gp_eng": "gram_panchayat"},
        "cols": {
            "gp_id": "gp_id",
            "shg_count": "active_shg_count", "shg_women": "women_in_shgs",
            "lakhpati_didi": "lakhpati_didis_count", "millionaire_didi": "millionaire_didis_count",
            "local_artisans": "local_artisans_count", "large_industries": "large_industrial_units",
            "mudra_loan_beneficiaries": "mudra_loan_beneficiaries",
        },
    },
    {
        "sheet": "08_Infrastructure",
        "table": "fact_rural_infra",
        "key": {"district_eng": "district", "block_eng": "block", "gp_eng": "gram_panchayat"},
        "cols": {
            "gp_id": "gp_id",
            "post_offices": "post_offices_count", "govt_banks": "govt_banks_count",
            "pvt_banks": "private_banks_count", "hh_with_electricity": "houses_with_electricity",
            "electricity_hrs_day": "avg_electricity_hours_daily",
            "street_lights": "total_street_lights", "solar_homes": "solar_installed_houses",
            "public_toilets": "public_toilets", "road_length_km": "road_length_km",
            "bus_stand_dist_km": "dist_bus_stand_km", "market_dist_km": "dist_main_market_km",
            "railway_dist_km": "dist_railway_station_km",
        },
    },
    {
        "sheet": "08_Infrastructure",
        "table": "fact_rural_governance",
        "key": {"district_eng": "district", "block_eng": "block", "gp_eng": "gram_panchayat"},
        "cols": {
            "gp_id": "gp_id",
            "police_dist_km": "dist_police_station_km",
            "emitra_dist_km": "dist_emitra_km",
            "lpg_dist_km": "dist_lpg_distributor_km",
        },
    },
    {
        "sheet": "09_Water",
        "table": "fact_rural_water",
        "key": {"district_eng": "district", "block_eng": "block", "gp_eng": "gram_panchayat"},
        "cols": {
            "gp_id": "gp_id",
            "fhtc_pct": "tap_connection_pct", "overhead_tanks": "overhead_tanks_count",
            "handpump_hh": "handpump_tubewell_only_houses",
            "drinking_water_sources": "drinking_water_sources",
            "groundwater_depth_m": "groundwater_depth_meters", "ro_facilities": "ro_facilities",
            "water_quality_tests": "water_quality_test_frequency",
            "tanker_hh": "tanker_only_supply_houses",
        },
    },
    {
        "sheet": "10_Environment",
        "table": "fact_rural_environment",
        "key": {"district_eng": "district", "block_eng": "block", "gp_eng": "gram_panchayat"},
        "cols": {
            "gp_id": "gp_id",
            "hh_with_toilet": "houses_with_toilets",
            "door_to_door_hh": "door_to_door_collection_houses",
            "waste_dump_sites": "waste_dump_sites", "total_waste_kg_day": "total_waste_daily_kg",
            "wet_waste_kg_day": "wet_waste_daily_kg", "dry_waste_kg_day": "dry_waste_daily_kg",
            "compost_pits_govt": "govt_compost_pits_count", "mrf_sheds": "mrf_sheds_count",
            "biogas_plants": "biogas_plants_count", "grazing_land_ha": "pasture_land_hectare",
            "forest_area_ha": "forest_area_hectare", "solar_panel_homes": "pm_surya_ghar_solar_houses",
        },
    },
    {
        "sheet": "11_Tourism",
        "table": "fact_rural_tourism",
        "key": {"district_eng": "district", "block_eng": "block", "gp_eng": "gram_panchayat"},
        "cols": {
            "gp_id": "gp_id",
            "heritage_sites": "cultural_assets_count",
            "religious_footfall": "avg_daily_footfall_cultural_sites",
            "annual_fairs": "annual_fairs_count", "fair_footfall": "avg_fair_footfall_daily",
            "fair_stalls": "temporary_fair_stalls", "stall_vendors": "fair_related_employment",
            "trained_guides": "registered_trained_guides",
        },
    },
]

URBAN_CONFIGS = [
    {
        "sheet": "01_Population",
        "table": "fact_urban_admin",
        "key": {"district": "district", "ulb": "ulb", "ward": "ward"},
        "cols": {
            "वार्ड ID": "ward_id",
            "कुल जनसंख्या (Census 2011)": "pop_2011",
            "कुल जनसंख्या (अनुमानित 2026)": "pop_2026_est",
            "पुरुष जनसंख्या (अनुमानित 2026)": "male_pop_2026",
            "महिला जनसंख्या (अनुमानित 2026)": "female_pop_2026",
            "बच्चे (0-6 वर्ष) (अनुमानित 2026)": "children_0_6_2026",
            "बच्चे (6-14 वर्ष) (अनुमानित 2026)": "children_6_14_2026",
            "जनसँख्या (14-18 वर्ष) (अनुमानित 2026)": "pop_14_18_2026",
            "वरिष्ठ नागरिक (60+) (अनुमानित 2026)": "senior_citizens_2026",
            "विशेष योग्यजन (PwD) की संख्या (अनुमानित 2026)": "pwd_pop_2026",
            "पक्के घरों की संख्या (अनुमानित- 2026)": "pucca_houses_2026",
            "कच्चे घरों की संख्या (अनुमानित- 2026)": "kutcha_houses_2026",
            "कुल भौगोलिक क्षेत्र (हैक्टेयर)": "total_area_hectare",
        },
    },
    {
        "sheet": "02_Health",
        "table": "fact_urban_health",
        "key": {"district": "district", "ulb": "ulb", "ward": "ward"},
        "cols": {
            "वार्ड ID": "ward_id",
            "एलोपैथिक स्वास्थ्य केन्द्र / हॉस्पिटल की संख्या": "allopathic_centers",
            "आयुष स्वास्थ्य केंद्र / हॉस्पिटल की संख्या": "ayush_centers",
            "निजी स्वास्थ्य केन्द्र / हॉस्पिटल की संख्या": "pvt_health_centers",
            "स्वास्थ्य केंद्र में बेड्स की संख्या": "health_center_beds",
            "स्वास्थ्य केन्द्र पर कार्यरत स्वास्थ्य कर्मचारी (संख्या)": "working_health_staff",
            "देखे गए मरीजों की औसत संख्या (प्रतिदिन)": "avg_daily_patients",
            "मुख्य मंत्री आयुष्मान आरोग्य योजना के लाभार्थियों की संख्या": "ayushman_arogya_beneficiaries",
            "कुल जन आधार मे पंजीकृत परिवार (प्रतिशत)": "janaadhar_reg_families_pct",
            "TB के कुल वर्तमान मरीज (संख्या)": "tb_patients_count",
            "कुल एनीमिक गर्भवती महिलाओं की संख्या": "anemic_pregnant_women",
            "उच्च रक्तचाप हेतु स्क्रीनिंग किए गए व्यक्ति (संख्या, FY 2025-26)": "hypertension_screening_2025_26",
            "मधुमेह (डायबीटीज) हेतु स्क्रीनिंग किए गए व्यक्ति (संख्या, FY 2025-26)": "diabetes_screening_2025_26",
        },
    },
    {
        "sheet": "03_Anganwadi_ICDS",
        "table": "fact_urban_education",
        "key": {"district": "district", "ulb": "ulb", "ward": "ward"},
        "cols": {
            "वार्ड ID": "ward_id",
            "आंगनवाड़ी / मिनी आंगनवाड़ी केंद्रों की संख्या": "anganwadi_centers",
            "आंगनवाड़ी/मिनी आंगनवाड़ी केंद्र में कार्यकर्ता की संख्या": "anganwadi_workers",
            "आंगनवाड़ी/मिनी आंगनवाड़ी में नामांकित बच्चे (संख्या)": "anganwadi_enrolled_children",
            "आशा सहयोगिनी की संख्या": "asha_sahyogini_count",
            "गंभीर तीव्र कुपोषित (SAM) बच्चे (संख्या)": "sam_children_count",
            "6–72 माह बच्चों को नियमित SNP (Supplementary Nutrition Programme) प्राप्त (संख्या)": "snp_recipients_6_72_months",
        },
    },
    {
        "sheet": "04_Education",
        "table": "fact_urban_education",
        "key": {"district": "district", "ulb": "ulb", "ward": "ward"},
        "cols": {
            "वार्ड ID": "ward_id",
            "कुल राजकीय विद्यालयों की संख्या": "govt_schools_count",
            "कुल निजी विद्यालयों की संख्या": "pvt_schools_count",
            "कुल विद्यालय (संख्या)": "total_schools_count",
            "विद्यालयों मे कुल नामांकित छात्र (संख्या)": "total_enrolled_students",
            "उपलब्ध कुल उपयोगी कमरों की संख्या": "useful_rooms_count",
            "कार्यरत शिक्षकों की कुल संख्या": "working_teachers",
            "स्वीकृत शिक्षकों की कुल संख्या": "sanctioned_teachers_count",
            "कंप्यूटर शिक्षा हेतु उपलब्ध कंप्यूटर की संख्या": "computers_available",
            "पिछले वर्ष रिपोर्ट किए गए ड्रॉपआउट कुल बच्चे (संख्या)": "dropout_children_prev_year",
            "सरकारी हॉस्टल की संख्या": "govt_hostels_count",
        },
    },
    {
        "sheet": "05_Social_Welfare",
        "table": "fact_urban_social",
        "key": {"district": "district", "ulb": "ulb", "ward": "ward"},
        "cols": {
            "वार्ड ID": "ward_id",
            "पीएम उज्ज्वला योजना के लाभार्थी (संख्या)": "pm_ujjwala_beneficiaries",
            "पीएम/सीएम आवास योजना के कुल लाभार्थी (संख्या)": "pm_cm_awas_beneficiaries",
            "वृद्धावस्था पेंशन लाभार्थी (संख्या)": "old_age_pensioners",
            "विधवा पेंशन लाभार्थी (संख्या)": "widow_pensioners",
            "विशेष योग्यजन पेंशन लाभार्थी (अनुमानित संख्या)": "pwd_pensioners_est",
        },
    },
    {
        "sheet": "05_Social_Welfare",
        "table": "fact_urban_economy",
        "key": {"district": "district", "ulb": "ulb", "ward": "ward"},
        "cols": {
            "वार्ड ID": "ward_id",
            "कुल कार्यरत स्वयं सहायता समूह (संख्या)": "active_shg_count",
            "स्थानीय कारीगरों की संख्या": "local_artisans_count",
            "क्षेत्र में संचालित कुल वृहद औद्योगिक इकाई (संख्या)": "large_industrial_units",
            "क्षेत्र में संचालित कुल लघु औद्योगिक इकाई (संख्या)": "small_scale_industries",
        },
    },
    {
        "sheet": "06_Infrastructure",
        "table": "fact_urban_infra",
        "key": {"district": "district", "ulb": "ulb", "ward": "ward"},
        "cols": {
            "वार्ड ID": "ward_id",
            "कुल सरकारी बैंक (संख्या)": "govt_banks_count",
            "निजी बैंक (संख्या)": "private_banks_count",
            "कुल घर जिनमे विद्युत कनेक्शन है (संख्या)": "houses_with_electricity",
            "सॉर ऊर्जा installed घर (संख्या)": "solar_installed_houses",
            "उपयोग लायक सार्वजनिक शौचालय (संख्या)": "public_toilets_functional",
            "सड़क की लंबाई(कि.मी.)": "road_length_km",
            "मुख्य बाजार/हाट से दूरी (कि.मी.)": "dist_main_market_km",
            "बस स्टैंड से वार्ड की दूरी(कि.मी.)": "dist_bus_stand_km",
            "रेलवे स्टेशन से वार्ड की दूरी(कि.मी.)": "dist_railway_station_km",
        },
    },
    {
        "sheet": "06_Infrastructure",
        "table": "fact_urban_governance",
        "key": {"district": "district", "ulb": "ulb", "ward": "ward"},
        "cols": {
            "वार्ड ID": "ward_id",
            "निकटतम पुलिस स्टेशन की  दूरी(कि.मी.)": "dist_police_station_km",
            "ई-मित्र की निकटतम दूरी(कि.मी.)": "dist_emitra_km",
        },
    },
    {
        "sheet": "07_Water",
        "table": "fact_urban_water",
        "key": {"district": "district", "ulb": "ulb", "ward": "ward"},
        "cols": {
            "वार्ड ID": "ward_id",
            "घरों में नल का चालू कनेक्शन (FHTC) (प्रतिशत में)": "tap_connection_pct",
            "ओवरहेड टैंक की संख्या": "overhead_tanks_count",
            "उपलब्ध जल स्रोतों (हैंडपंप) की संख्या": "handpumps_count",
            "उपलब्ध जल स्रोतों (कुआँ) की संख्या": "wells_count",
            "उपलब्ध जल स्रोतों (टैंक) की संख्या": "tanks_count",
            "भूजल दोहन की स्थिति (भूजल टेबल के अनुसार)(मीटर में)": "groundwater_depth_meters",
            "जल गुणवत्ता परीक्षण की वार्षिक आवृति": "water_quality_test_frequency",
        },
    },
    {
        "sheet": "08_Environment",
        "table": "fact_urban_environment",
        "key": {"district": "district", "ulb": "ulb", "ward": "ward"},
        "cols": {
            "वार्ड ID": "ward_id",
            "शोचालय से वंचित कुल घरों की संख्या": "houses_without_toilets",
            "compost pits की संख्या (सरकारी)": "govt_compost_pits_count",
            "सरकारी नर्सरी की उपलब्धता (संख्या)": "govt_nurseries_count",
            "नर्सरी मे उपलब्ध पौधे (संख्या)": "nursery_saplings_available",
        },
    },
    {
        "sheet": "09_Tourism",
        "table": "fact_urban_tourism",
        "key": {"district": "district", "ulb": "ulb", "ward": "ward"},
        "cols": {
            "वार्ड ID": "ward_id",
            "प्रमुख मेलों में औसत फुटफॉल(प्रति दिवस)": "avg_fair_footfall_daily",
            "SHG द्वारा संचालित स्टॉल/सेवाओं की संख्या (अनुमानित)": "shg_operated_stalls",
            "प्रशिक्षित गाइड का पंजीकरण (अनुमानित संख्या)": "registered_trained_guides",
        },
    },
]


def read_all_sheets(file: Path) -> dict[str, pd.DataFrame]:
    """Read all sheets from workbook in one pass."""
    try:
        sheets = pd.read_excel(
            file,
            sheet_name=None,
            engine="calamine",
            dtype=str,
            na_values=["", "NA", "-", "null"],
            keep_default_na=True,
        )
    except Exception:
        sheets = pd.read_excel(
            file,
            sheet_name=None,
            engine="openpyxl",
            dtype=str,
            na_values=["", "NA", "-", "null"],
            keep_default_na=True,
        )

    # Clean columns: strip whitespace, remove unnamed
    cleaned = {}
    for sheet_name, df in sheets.items():
        df.columns = df.columns.str.strip()
        df = df.loc[:, ~df.columns.astype(str).str.startswith("Unnamed")]
        cleaned[sheet_name] = df.dropna(how="all")
    return cleaned


def export_dim_tables(rural_sheets: dict, urban_sheets: dict):
    """Export dim_rural_gps and dim_urban_wards as CSVs."""
    # dim_rural_gps from 01_Population
    if "01_Population" in rural_sheets:
        rural_pop = rural_sheets["01_Population"]
        dim_rural = rural_pop[["gp_id", "district_eng", "block_eng", "gp_eng"]].copy()
        dim_rural = dim_rural.rename(columns={
            "district_eng": "district",
            "block_eng": "block",
            "gp_eng": "gram_panchayat"
        })
        dim_rural = dim_rural.dropna(subset=["gp_id"])
        dim_rural = dim_rural.drop_duplicates(subset=["gp_id"])
        dim_rural["gp_id"] = pd.to_numeric(dim_rural["gp_id"], errors="coerce")
        dim_rural = dim_rural.dropna(subset=["gp_id"])
        out = OUTPUT_DIR / "dim_rural_gps.csv"
        dim_rural.to_csv(out, index=False, encoding="utf-8-sig")
        print(f"  ✅ dim_rural_gps: {len(dim_rural)} rows → {out.name}")

    # dim_urban_wards from 01_Population
    if "01_Population" in urban_sheets:
        urban_pop = urban_sheets["01_Population"]
        dim_urban = urban_pop[["वार्ड ID", "district", "ulb", "ward"]].copy()
        dim_urban = dim_urban.rename(columns={
            "वार्ड ID": "ward_id",
            "district": "district",
            "ulb": "ulb",
            "ward": "ward"
        })
        dim_urban = dim_urban.dropna(subset=["ward_id"])
        dim_urban = dim_urban.drop_duplicates(subset=["ward_id"])
        dim_urban["ward_id"] = pd.to_numeric(dim_urban["ward_id"], errors="coerce")
        dim_urban = dim_urban.dropna(subset=["ward_id"])
        out = OUTPUT_DIR / "dim_urban_wards.csv"
        dim_urban.to_csv(out, index=False, encoding="utf-8-sig")
        print(f"  ✅ dim_urban_wards: {len(dim_urban)} rows → {out.name}")


def export_fact_tables(configs: list, sheets: dict, drop_keys: list, id_col: str):
    """Export fact tables from configs, grouped by target table."""
    groups: dict[str, list] = defaultdict(list)
    for cfg in configs:
        groups[cfg["table"]].append(cfg)

    for table_name, cfgs in groups.items():
        merged = None

        for cfg in cfgs:
            sheet = cfg["sheet"]
            if sheet not in sheets:
                continue
            df = sheets[sheet].copy()

            # Build mapping: key cols + data cols
            full_map = {**cfg["key"], **cfg["cols"]}
            available = {k: v for k, v in full_map.items() if k in df.columns}
            missing = [k for k in full_map if k not in df.columns]
            if missing:
                print(f"    ⚠ {table_name}/{sheet}: missing {missing}")

            sub = df[list(available.keys())].rename(columns=available)

            if merged is None:
                merged = sub
            else:
                # Merge on key columns
                key_targets = list(cfg["key"].values())
                merged = pd.merge(merged, sub, on=key_targets, how="outer")

        if merged is None or merged.empty:
            print(f"  ⚠ {table_name}: no data")
            continue

        # Convert numeric columns (except id and key columns)
        key_targets = list(cfgs[0]["key"].values())
        for col in merged.columns:
            if col not in key_targets and col != id_col:
                merged[col] = pd.to_numeric(merged[col], errors="coerce")

        # Drop key name columns — dim tables have these
        merged = merged.drop(columns=drop_keys, errors="ignore")

        # Ensure id column is first (if it exists)
        if id_col in merged.columns:
            cols = [id_col] + [c for c in merged.columns if c != id_col]
            merged = merged[cols]
            # Drop rows where id is null
            merged = merged.dropna(subset=[id_col])

        out = OUTPUT_DIR / f"{table_name}.csv"
        merged.to_csv(out, index=False, encoding="utf-8-sig")
        print(f"  ✅ {table_name}: {len(merged)} rows → {out.name}")


def main():
    t0 = time.time()

    print("Reading Rural Excel...")
    rural_sheets = read_all_sheets(RURAL_FILE)

    print("Reading Urban Excel...")
    urban_sheets = read_all_sheets(URBAN_FILE)

    print("\n=== DIM TABLES ===")
    export_dim_tables(rural_sheets, urban_sheets)

    print("\n=== RURAL FACT TABLES ===")
    export_fact_tables(RURAL_CONFIGS, rural_sheets, DROP_RURAL_KEYS, id_col="gp_id")

    print("\n=== URBAN FACT TABLES ===")
    export_fact_tables(URBAN_CONFIGS, urban_sheets, DROP_URBAN_KEYS, id_col="ward_id")

    elapsed = time.time() - t0
    print(f"\n✅ Done in {elapsed:.1f}s")
    print(f"CSVs saved to: {OUTPUT_DIR.resolve()}")
    print("\nImport order in Supabase Table Editor:")
    print("  1. dim_rural_gps.csv        → dim_rural_gps")
    print("  2. dim_urban_wards.csv      → dim_urban_wards")
    print("  3. fact_rural_admin.csv     → fact_rural_admin")
    print("  4. fact_rural_livelihood.csv → fact_rural_livelihood")
    print("  ... (all remaining fact tables)")


if __name__ == "__main__":
    main()
