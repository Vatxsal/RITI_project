"""
baseline_upload.py  —  FINAL FIXED VERSION
Fixes:
  1. Unicode normalization (NFC) on all column names → solves all "missing col" issues
  2. All numeric data sent as NUMERIC (float) never cast to int → solves bigint overflow
  3. Row-level error handling → bad rows logged, rest of batch continues
"""

import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
import numpy as np
import unicodedata
import time

# ── CONFIG ──────────────────────────────────────────────────────────────────
DB_HOST     = "db.jnzhmcngxigtptztdjhl.supabase.co"
DB_PORT     = 5432
DB_NAME     = "postgres"
DB_USER     = "postgres"
DB_PASSWORD = "Aasvaa@2026"

RURAL_FILE  = "../DATA/RAW/RURAL_BASELINE/RURAL_BASELINE.xlsx"
URBAN_FILE  = "../DATA/RAW/URBAN_BASELINE/URBAN_BASELINE.xlsx"
BATCH_SIZE  = 500

def nfc(s):
    """Normalize string to NFC unicode form (fixes ड़ / ड़ mismatch etc.)"""
    return unicodedata.normalize('NFC', s) if isinstance(s, str) else s

# ── RURAL COL MAP ────────────────────────────────────────────────────────────
RURAL_COL_MAP = {
    'जिला': 'district',
    'ब्लॉक': 'block',
    'ग्राम पंचायत': 'gram_panchayat',
    'ग्राम पंचायत ID': 'gp_id_rajdhara',
    'सरपंच / प्रशासक का नाम': 'sarpanch_name',
    'सरपंच / प्रशासक का संपर्क नंबर': 'sarpanch_contact',
    'राजस्व ग्रामों की संख्या': 'revenue_villages_count',
    'कुल भौगोलिक क्षेत्र (हैक्टेयर)': 'total_area_hectare',
    'ग्राम पंचायत Profile': 'gp_profile',
    'कुल जनसंख्या (Census 2011)': 'pop_census_2011',
    'कुल जनसंख्या (अनुमानित 2026)': 'pop_2026_est',
    'पुरुष जनसंख्या (अनुमानित 2026)': 'male_pop_2026',
    'महिला जनसंख्या (अनुमानित 2026)': 'female_pop_2026',
    'ट्रांसजेंडर (अनुमानित 2026)': 'transgender_pop_2026',
    'बच्चे (0-6 वर्ष) (अनुमानित 2026)': 'children_0_6_2026',
    'बच्चे (6-14 वर्ष) (अनुमानित 2026)': 'children_6_14_2026',
    'जनसँख्या (14-18 वर्ष) (अनुमानित 2026)': 'pop_14_18_2026',
    'वरिष्ठ नागरिक (60+) (अनुमानित 2026)': 'senior_citizens_2026',
    'विशेष योग्यजन (PwD) की संख्या (अनुमानित 2026)': 'pwd_pop_2026',
    'डिफेंस फोर्सेज (जल,थल,वायु सेना) में कार्यरत कार्मिक की संख्या (अनुमानित 2026)': 'defence_personnel_2026',
    'परिवारों की कुल संख्या (अनुमानित- 2026)': 'total_families_2026',
    'BPL परिवारों की संख्या (अनुमानित- 2026)': 'bpl_families_2026',
    'NFSA से लाभान्वित परिवारों की संख्या (अनुमानित- 2026)': 'nfsa_families_2026',
    'घुमंतू श्रेणी के कुल लोगो की संख्या (अनुमानित- 2026)': 'nomadic_population_2026',
    'पक्के घरों की संख्या (अनुमानित- 2026)': 'pucca_houses_2026',
    'कच्चे घरों की संख्या (अनुमानित- 2026)': 'kutcha_houses_2026',
    'कुल कृषि योग्य भूमि(हैक्टेयर)': 'cultivable_land_hectare',
    'कुल सिंचित क्षेत्र(हैक्टेयर)': 'irrigated_area_hectare',
    'शुद्ध बुवाई हेतु भूमि (सभी मौसमों के लिए) (Net Sown Area)(हैक्टेयर)': 'net_sown_area_hectare',
    'कुल बुवाई हेतु भूमि (सभी मौसमों के लिए) (Gross Sown Area)(हैक्टेयर)': 'gross_sown_area_hectare',
    'कुल किसानो की संख्या': 'total_farmers_count',
    'लघु किसानो की संख्या (भूमि 2 हैक्टेयर तक )': 'small_farmers_count',
    'मध्यम किसानो की संख्या (भूमि 2-10 हैक्टेयर तक )': 'medium_farmers_count',
    'दीर्घ किसानो की संख्या (भूमि 10 हैक्टेयर से अधिक )': 'large_farmers_count',
    'ड्रिप/स्प्रिंकलर का उपयोग करने वाले किसानों की संख्या': 'drip_sprinkler_farmers_count',
    'ड्रिप/स्प्रिंकलर द्वारा सिंचित कुल क्षेत्रफल(हैक्टेयर)': 'drip_sprinkler_area_hectare',
    'कुल कृषि विद्युत कनेक्शन (संख्या)': 'agri_electricity_connections',
    'कुल यूनिट उपभोग (कृषि विद्युत कनेक्शन द्वारा) (प्रतिदिन)': 'agri_electricity_units_daily',
    'कुल सोलर पम्प (संख्या)': 'solar_pumps_count',
    'कुल डीज़ल पम्प (संख्या)': 'diesel_pumps_count',
    'ग्राम पंचायत में उर्वरक/बीज केंद्र की उपलब्धता': 'fertilizer_seed_center_avail',
    'यदि उर्वरक/बीज केंद्र नहीं है तो निकटम बीज केंद्र की ग्रामपंचायत मुख्यालय से दूरी(कि.मी.)': 'dist_seed_center_km',
    'ग्राम पंचायत में कृषि उपज मंडी/अन्य मंडी की उपलब्धता': 'mandi_avail',
    "'Query3'[S2_गांव का नाम Krishi upaj Mandi F1]": 'mandi_village_name',
    'यदि कृषि उपज मंडी/अन्य मंडी उपलब्ध है तो मंडी की location': 'mandi_location',
    'यदि कृषि उपज मंडी/अन्य मंडी उपलब्ध नहीं है तो निकटतम मंडी की ग्रामपंचायत मुख्यालय से दूरी(कि.मी.)': 'dist_mandi_km',
    'रबी फसल का नाम': 'rabi_crop_name',
    'रबी फसल का क्षेत्रफल(हैक्टेयर)': 'rabi_crop_area_hectare',
    'रबी फसल का कुल उत्पादन(क्विंटल)': 'rabi_crop_production_quintal',
    'खरीफ फसल का नाम': 'kharif_crop_name',
    'खरीफ फसल का क्षेत्रफल(हैक्टेयर)': 'kharif_crop_area_hectare',
    'खरीफ फसल का कुल उत्पादन(क्विंटल)': 'kharif_crop_production_quintal',
    'जायद फसल का नाम': 'zaid_crop_name',
    'जायद फसल का क्षेत्रफल(हैक्टेयर)': 'zaid_crop_area_hectare',
    'जायद फसल का कुल उत्पादन(क्विंटल)': 'zaid_crop_production_quintal',
    'खाद्यान भंडारण गोदाम की उपलब्धता': 'food_storage_avail',
    "'Query3'[S2_गांव का नाम Krishi Mandi F2]": 'food_storage_village',
    'खाद्यान भंडारण गोदाम की location': 'food_storage_location',
    'खाद्यान भंडारण गोदाम की कुल क्षमता(क्विंटल)': 'food_storage_capacity_quintal',
    'यदि नहीं है तो निकटतम खाद्यान भंडारण गोदाम की ग्राम पंचायत मुख्यालय से दूरी(कि.मी.)': 'dist_food_storage_km',
    'उपलब्ध फ़ूड प्रोसेसिंग इकाई के प्रकार': 'food_processing_unit_type',
    'उपलब्ध फ़ूड प्रोसेसिंग इकाई की संख्या': 'food_processing_unit_count',
    'उपलब्ध फ़ूड प्रोसेसिंग इकाई का कुल उत्पादन(क्विंटल)': 'food_processing_production_qtl',
    'फ़ूड प्रोसेसिंग इकाई में प्राप्त रोजगार (लोगों की संख्या)': 'food_processing_employment',
    'ग्राम पंचायत मे कस्टम हायरिंग सेंटर (कृषि उपकरण) की उपलब्धता': 'custom_hiring_center_avail',
    'ग्राम सेवा सहकारी समिति से जुड़े कुल किसानो की संख्या': 'cooperative_farmers_count',
    'किसानों को दी गई वार्षिक ऋण राशि (लाखों मे)': 'cooperative_farmer_loan_lakhs',
    'ग्राम सेवा सहकारी समिति से जुड़े कुल पशुपालकों की संख्या': 'cooperative_livestock_count',
    'पशुपालकों को दी गई वार्षिक ऋण राशि (लाखों मे)': 'cooperative_livestock_loan_lkhs',
    'किसान क्रेडिट कार्ड (केसीसी) धारकों की संख्या': 'kcc_holders_count',
    'जारी किए गए मृदा स्वास्थ्य कार्ड की संख्या (वैध)': 'soil_health_cards_valid',
    'जारी किए गए मृदा स्वास्थ्य कार्ड के अंतर्गत कुल कृषि भूमि(हैक्टेयर)': 'soil_health_card_area_hectare',
    'कुल किसान उत्पादक संगठन (एफपीओ) की संख्या': 'fpo_count',
    'एफपीओ से जुड़े हुए कुल किसान (संख्या)': 'fpo_farmers_count',
    'एफपीओ से जुड़े हुए कुल किसानों की कुल कृषि भूमि(हेक्टेर)': 'fpo_land_hectare',
    'पीएम-किसान सम्मान निधि तथा सीएम-किसान सम्मान निधि योजना योजना के पात्र लाभार्थी (संख्या)': 'pm_cm_kisan_beneficiaries',
    'कुल पशुधन (संख्या)': 'total_livestock_count',
    'कुल दुधारु पशुओ की संख्या': 'milch_animals_count',
    'कुल दूध उत्पादन(लीटर प्रतिदिन)': 'daily_milk_prod_litres',
    'दूध संग्रहण केंद्रों की संख्या': 'milk_collection_centers',
    'दूध संग्रहण केंद्रों की क्षमता(लीटर प्रतिदिन)': 'milk_collection_capacity_litres',
    'सरकारी पशु चिकित्सा केंद्र/यूनिट्स (संख्या)': 'govt_vet_centers_count',
    'मंगला पशु बीमा योजना के लाभार्थियों की संख्या (वर्ष 2025-26)': 'mangala_insurance_beneficiaries',
    'मत्स्य पालन में शामिल कुल जल स्रोतों की संख्या (निजी + सरकारी)': 'fishery_water_sources_count',
    'मत्स्य पालन में कुल वार्षिक उत्पादन (निजी + सरकारी)(क्विंटल)': 'fishery_annual_prod_quintal',
    'मुर्गी पालन फार्म्स की संख्या': 'poultry_farms_count',
    'मुर्गी पालन फार्म्स में कुल वार्षिक उत्पादन (मुर्गी की संख्या)': 'poultry_annual_bird_count',
    'मुर्गी पालन फार्म्स में कुल वार्षिक उत्पादन (अण्डे की संख्या)': 'poultry_annual_egg_count',
    'बकरी पालन फार्म्स की संख्या': 'goat_farms_count',
    'बकरी पालन से कुल वार्षिक उत्पादन (बकरी की संख्या)': 'goat_annual_count',
    'सुअर पालन फार्म्स की संख्या': 'pig_farms_count',
    'सुअर पालन से कुल वार्षिक उत्पादन (सुअर की संख्या)': 'pig_annual_count',
    'हॉर्ट्रिकल्चर कृषि का एरिया(हेक्टेयर)': 'horticulture_area_hectare',
    'हॉर्ट्रिकल्चर कृषि में लगे किसानो की संख्या': 'horticulture_farmers_count',
    'फ्लोरिकल्चर कृषि का एरिया(हेक्टेयर)': 'floriculture_area_hectare',
    'फ्लोरिकल्चर कृषि में लगे किसानो की संख्या': 'floriculture_farmers_count',
    'आर्गेनिक कृषि का एरिया(हेक्टेयर)': 'organic_farming_area_hectare',
    'आर्गेनिक कृषि में लगे किसानो की संख्या': 'organic_farming_farmers_count',
    'पॉली हाउस कृषि का एरिया(हेक्टेयर)': 'polyhouse_area_hectare',
    'पॉली हाउस कृषि में लगे किसानो की संख्या': 'polyhouse_farmers_count',
    'प्लास्टिक मल्चिंग/टनल कृषि का एरिया(हेक्टेयर)': 'mulching_tunnel_area_hectare',
    'प्लास्टिक मल्चिंग/टनल कृषि में लगे किसानो की संख्या': 'mulching_tunnel_farmers_count',
    'फसल बीमा योजना में बीमित एरिया(हेक्टेयर)': 'crop_insurance_area_hectare',
    'फसल बीमा योजना में बीमित किसान (संख्या)': 'crop_insurance_farmers_count',
    'एलोपैथिक स्वास्थ्य केन्द्र की संख्या': 'allopathic_centers',
    'आयुष स्वास्थ्य केंद्र की संख्या': 'ayush_centers',
    'निजी स्वास्थ्य केन्द्र की संख्या': 'private_health_centers',
    'स्वास्थ्य केंद्र का नाम': 'health_center_name',
    'स्वास्थ्य केंद्र की location': 'health_center_location',
    "'Query3'[S3_गांव का नाम Swasthya F1]": 'health_center_village',
    'स्वास्थ्य केंद्र का प्रकार': 'health_center_type',
    'स्वास्थ्य केंद्र में बेड्स की संख्या': 'health_center_beds',
    'क्या यह स्वास्थ्य केंद्र आयुष्मान आरोग्य मंदिर हैं ?': 'is_ayushman_arogya_mandir',
    'स्वास्थ्य केन्द्र पर स्वीकृत स्वास्थ्य कर्मचारी (संख्या)': 'sanctioned_health_staff',
    'स्वास्थ्य केन्द्र पर कार्यरत स्वास्थ्य कर्मचारी (संख्या)': 'working_health_staff',
    'देखे गए मरीजों की औसत संख्या (प्रतिदिन)': 'avg_daily_patients',
    'निकटतम PHC की ग्राम पंचायत मुख्यालय से दूरी (कि.मी.)': 'phc_dist_km',
    'निकटतम CHC की ग्राम पंचायत मुख्यालय से दूरी (कि.मी.)': 'chc_dist_km',
    'मधुमेह (डायबीटीज) हेतु स्क्रीनिंग किए गए व्यक्ति (संख्या, FY 2025-26)': 'diabetes_screened_fy2526',
    'उच्च रक्तचाप हेतु स्क्रीनिंग किए गए व्यक्ति (संख्या, FY 2025-26)': 'bp_screened_fy2526',
    'क्या ग्राम पंचायत किसी स्थानिक बीमारी से प्रभावित है? जैसे सिलिकोसिस F': 'endemic_disease_affected',
    'कुल एनीमिक गर्भवती महिलाओं की संख्या': 'anemic_pregnant_women_count',
    'कुल एनीमिक बच्चों की संख्या (National Iron Plus Initiative कार्यक्रम के तहत)': 'anemic_children_count',
    'TB के कुल वर्तमान मरीज (संख्या)': 'tb_patients_count',
    '6–72 माह बच्चों को नियमित SNP (Supplementary Nutrition Programme) प्राप्त (संख्या)': 'snp_children_6_72m',
    'मुख्य मंत्री आयुष्मान आरोग्य योजना के लाभार्थियों की संख्या': 'ayushman_arogya_beneficiaries',
    'कुल जन आधार मे पंजीकृत परिवार (प्रतिशत)': 'janaadhar_registered_families_pct',
    'बायोमेडिकल अपशिष्ट प्रबंधन सुविधा': 'biomedical_waste_facility',
    'श्री अन्नपूर्णा रसोई संचालित': 'annapurna_rasoi_operational',
    'श्री अन्नपूर्णा संचालित रसोई से औसतन  प्रतिदिन लाभार्थियों की संख्या (संचालित दिनों के अनुसार)': 'annapurna_daily_beneficiaries',
    'आंगनवाड़ी / मिनी आंगनवाड़ी केंद्रों की संख्या': 'anganwadi_centers_count',
    'आंगनवाड़ी केंद्र का कोड': 'anganwadi_center_code',
    'आंगनवाड़ी केंद्र का प्रकार': 'anganwadi_center_type',
    'आंगनवाड़ी/मिनी आंगनवाड़ी केंद्र की location F': 'anganwadi_location',
    'गांव का नाम Aanganwadi': 'anganwadi_village',
    'बिजली की उपलब्धता': 'anganwadi_electricity',
    'पानी की उपलब्धता': 'anganwadi_water',
    'शौचालय की उपलब्धता': 'anganwadi_toilet',
    'राजकीय भवन की उपलब्धता': 'anganwadi_govt_building',
    'आंगनवाड़ी/मिनी आंगनवाड़ी केंद्र में कार्यकर्ता की संख्या': 'anganwadi_workers_count',
    'आंगनवाड़ी/मिनी आंगनवाड़ी केंद्र में सहायिका की संख्या': 'anganwadi_helpers_count',
    'आशा सहयोगिनी की संख्या': 'asha_workers_count',
    'आंगनवाड़ी/मिनी आंगनवाड़ी में नामांकित बच्चे (संख्या)': 'anganwadi_enrolled_children',
    'वृद्धि निगरानी चार्ट मे लिए गए बच्चे (संख्या)': 'growth_monitoring_children',
    'स्कूल पूर्व शिक्षा (प्री स्कूल) निगरानी मे लिए गए बच्चे (संख्या)': 'preschool_monitoring_children',
    'आंगनवाड़ी/मिनी आंगनवाड़ी मे पंजीकृत गर्भवती व धात्री महिला (संख्या)': 'anganwadi_pregnant_women',
    'गंभीर तीव्र कुपोषित (SAM) बच्चे (संख्या)': 'sam_children_count',
    'कुल राजकीय विद्यालयों की संख्या': 'govt_schools_count',
    'विद्यालय का प्रकार': 'school_type',
    'नाम': 'school_name',
    'स्थान': 'school_location',
    "'Query3'[S4_गांव का नाम School F2]": 'school_village',
    'विद्यालयों मे कुल नामांकित छात्र (संख्या)': 'total_enrolled_students',
    'उपलब्ध कुल उपयोगी कमरों की संख्या': 'useful_classrooms_count',
    'पीने योग्य पानी की सुविधा उपलब्ध': 'school_drinking_water',
    'विद्यालय में खेल मैदान की सुविधा उपलब्ध': 'school_playground',
    'विद्यालय में उपयोगी शौचालय सुविधा उपलब्ध': 'school_toilet_avail',
    'विद्यालय में छात्राओं के लिए उपयोगी शौचालय सुविधा उपलब्ध': 'school_girls_toilet_avail',
    'स्वीकृत शिक्षकों की कुल संख्या': 'sanctioned_teachers',
    'कार्यरत शिक्षकों की कुल संख्या': 'working_teachers',
    'कंप्यूटर शिक्षा हेतु उपलब्ध कंप्यूटर की संख्या': 'computers_for_education',
    'स्मार्ट क्लास उपलब्ध': 'smart_class_avail',
    'ग्राम पंचायत क्षेत्र में कक्षा 0–5 के कुल अध्ययनरत छात्रों की संख्या (अनुमानित)': 'students_class_0_5_boys',
    'ग्राम पंचायत क्षेत्र में कक्षा 0–5 के कुल अध्ययनरत छात्राओं की संख्या (अनुमानित)': 'students_class_0_5_girls',
    'ग्राम पंचायत क्षेत्र में कक्षा 6–8 के कुल अध्ययनरत छात्रों की संख्या (अनुमानित)': 'students_class_6_8_boys',
    'ग्राम पंचायत क्षेत्र में कक्षा 6–8 के कुल अध्ययनरत छात्राओं की संख्या (अनुमानित)': 'students_class_6_8_girls',
    'ग्राम पंचायत क्षेत्र में कक्षा 9–10 के कुल अध्ययनरत छात्रों की संख्या (अनुमानित)': 'students_class_9_10_boys',
    'ग्राम पंचायत क्षेत्र में कक्षा 9–10 के कुल अध्ययनरत छात्राओं की संख्या (अनुमानित)': 'students_class_9_10_girls',
    'ग्राम पंचायत क्षेत्र में कक्षा 11–12 के कुल अध्ययनरत छात्रों की संख्या (अनुमानित)': 'students_class_11_12_boys',
    'ग्राम पंचायत क्षेत्र में कक्षा 11–12 के कुल अध्ययनरत छात्राओं की संख्या (अनुमानित)': 'students_class_11_12_girls',
    'ग्राम पंचायत क्षेत्र में कक्षा 12 से ऊपर के कुल अध्ययनरत छात्रों की संख्या (अनुमानित)': 'students_above_class_12_boys',
    'ग्राम पंचायत क्षेत्र में कक्षा 12 से ऊपर के कुल अध्ययनरत छात्राओं की संख्या (अनुमानित)': 'students_above_class_12_girls',
    'कुल निजी विद्यालयों की संख्या': 'pvt_schools_count',
    'विद्यालय का प्रकार 2': 'pvt_school_type',
    'कुल नामांकित छात्र (संख्या)': 'pvt_school_enrolled_students',
    'कुल विद्यालय (संख्या)': 'total_schools_count',
    'पिछले वर्ष रिपोर्ट किए गए ड्रॉपआउट कुल बच्चे (संख्या)': 'dropout_children_prev_year',
    'ड्रॉपआउट का मुख्य कारण': 'dropout_main_reason',
    'सरकार तथा निजी स्किल ट्रेनिंग केंद्रों की कुल संख्या जैसे ITIs': 'skill_training_centers_count',
    'सरकार तथा निजी स्किल ट्रेनिंग केंद्रों में कुल प्रशिक्षित छात्र / छात्राओं की संख्या (वार्षिक अनुमानित )': 'skill_trained_students_annual',
    'क्षेत्र में उपलब्ध कुल स्नातक/स्नातकोत्तर(पॉलीटेक्निक/इंजीनियर/मेडिकल/विश्वविद्यालय आदि) की संख्या (सरकारी + निजी)': 'higher_edu_institutions_count',
    'महाविद्यालयों में अध्यनरत छात्र / छात्राओं की संख्या (अनुमानित)': 'college_enrolled_students',
    'सरकारी हॉस्टल की संख्या': 'govt_hostels_count',
    'सरकारी हॉस्टल में निवासरत कुल छात्र / छात्राओं की संख्या (अनुमानित)': 'govt_hostel_students',
    'वृद्धावस्था पेंशन लाभार्थी (संख्या)': 'old_age_pensioners',
    'विधवा पेंशन लाभार्थी (संख्या)': 'widow_pensioners',
    'विशेष योग्यजन पेंशन लाभार्थी (अनुमानित संख्या)': 'pwd_pensioners_est',
    'पीएम उज्ज्वला योजना के लाभार्थी (संख्या)': 'pm_ujjwala_beneficiaries',
    'पीएम/सीएम आवास योजना के कुल लाभार्थी (संख्या)': 'pm_cm_awas_beneficiaries',
    'लखपति दीदी की संख्या': 'lakhpati_didis_count',
    'मिलेनियर (दस लाख) दीदी की संख्या': 'millionaire_didis_count',
    'क्षेत्र में संचालित कुल वृहद औद्योगिक इकाई (संख्या)': 'large_industrial_units',
    'क्षेत्र में संचालित वृहद औद्योगिक इकाओं में रोजगार प्राप्त व्यक्तियों की संख्या': 'large_industry_employment',
    'कुल कार्यरत स्वयं सहायता समूह (संख्या)': 'active_shg_count',
    'कार्यरत स्वयं सहायता समूह मे जुड़ी हुई कुल महिलायें (संख्या)': 'women_in_shgs',
    'कुल कार्यरत स्वयं सहायता समूह (SHG) जिनका बैंक अकाउंट खुल गया है (संख्या)': 'shg_with_bank_account',
    'कुल कार्यरत स्वयं सहायता समूहों जिनको First Tranche प्राप्त हुई (संख्या)': 'shg_first_tranche_received',
    'कुल कार्यरत स्वयं सहायता समूहों को फंड (निधि) से प्राप्त हुई कुल राशि का विवरण राशि (लाखों मे)': 'shg_fund_amount_lakhs',
    'कुल स्वयं सहायता समूह जिनका बैंक लिन्केज हो चुका हैं (संख्या)': 'shg_bank_linkage_count',
    'कार्यरत स्वयं सहायता समूह द्वारा किए जाने वाले प्रमुख विभिन्न आजीविका कार्यों का प्रकार F': 'shg_livelihood_types',
    'स्थानीय कारीगरों की संख्या': 'local_artisans_count',
    'प्रमुख विभिन्न आजीविका कार्यों का प्रकार (हस्तकला, शिल्पकला आदि )': 'artisan_livelihood_types',
    'कुल कार्यरत व्यक्ति (संख्या)': 'total_employed_persons',
    'लघु उद्योगों की संख्या (मधुमक्खी पालन, रेशम कीट पालन आदि)': 'small_scale_industries',
    'लघु उद्योगों का प्रकार': 'small_scale_industry_types',
    'लघु उद्योगों में कुल कार्यरत व्यक्ति (संख्या)': 'small_scale_industry_employment',
    'कुल लाभार्थी जिन्हे मुद्रा लोन स्वीकृत (संख्या)': 'mudra_loan_beneficiaries',
    'खनन/पत्थर-काम': 'mining_stonework',
    'मुख्य खनिज का प्रकार': 'main_mineral_type',
    'ग्राम पंचायत से गुज़रती मुख्य सड़क का प्रकार (एनएच/एस/एमडीआर)': 'main_road_type',
    'सड़क की लंबाई(कि.मी.)': 'road_length_km',
    'कुल घर जिनमे विद्युत कनेक्शन है (संख्या)': 'houses_with_electricity',
    'कुल GSS की संख्या': 'gss_count',
    'सॉर ऊर्जा installed घर (संख्या)': 'solar_installed_houses',
    'प्रतिदिन घरेलू विद्युत की औसत उपलब्धता(घंटे/दिन)': 'avg_electricity_hours_daily',
    'पंचायत भवन/सामुदायिक सभागार की उपलब्धता (संख्या)': 'panchayat_bhawan_count',
    'कुल सार्वजनिक भवन/कार्यालय (संख्या)': 'total_public_buildings',
    'उपयोग लायक सार्वजनिक शौचालय (संख्या)': 'public_toilets',
    'सौर ऊर्जा installed कुल सार्वजनिक भवन/कार्यालय (संख्या)': 'solar_public_buildings',
    'वर्षा जल संचयन installed कुल सार्वजनिक भवन/कार्यालय (संख्या)': 'rainwater_harvest_public_bldgs',
    'मुख्य बाजार/हाट की ग्राम पंचायत मुख्यालय से दूरी(कि.मी.)': 'dist_main_market_km',
    'कुल सरकारी बैंक (संख्या)': 'govt_banks_count',
    'निजी बैंक (संख्या)': 'pvt_banks_count',
    'cooperative बैंक (संख्या)': 'cooperative_banks_count',
    'पोस्ट ऑफिस (संख्या)': 'post_offices_count',
    'कुल पीएम जन धन खाते (संख्या)': 'pm_jan_dhan_accounts',
    'यदि कोई बैंक नहीं है तो निकटतम उपलब्ध बैंक की ग्रामपंचायत मुख्यालय से दूरी(कि.मी.)': 'dist_bank_km',
    'कुल स्ट्रीट लाइटों की संख्या (सौर ऊर्जा से चलने वाली स्ट्रीट लाइटें भी शामिल)': 'total_street_lights',
    'सौर ऊर्जा से चलने वाली स्ट्रीट लाइटों की संख्या': 'solar_street_lights',
    'रैंप/सुलभ शौचालयों वाले सार्वजनिक भवनों की संख्या': 'accessible_public_buildings',
    'कुल खेल के मैदानों की संख्या (निजी मैदान/ विद्यालय के मैदान को छोड़ कर)': 'sports_grounds_count',
    'सार्वजनिक परिवहन उपलब्धता': 'public_transport_avail',
    'बस स्टैंड (जहा बसें आती है) की ग्राम पंचायत मुख्यालय से दूरी(कि.मी.)': 'dist_bus_stand_km',
    'रेलवे स्टेशन से ग्राम पंचायत मुख्यालय की दूरी(कि.मी.)': 'dist_railway_station_km',
    'ब्रॉड्बैन्ड की उपलब्धता': 'broadband_avail',
    'सुचारु इंटरनेट कनेक्शन उपलब्धता': 'internet_avail',
    'उपलब्ध पेयजल स्रोत (कुआँ/हैंडपंप/टैंक/ट्यूब वेल आदि की संख्या)': 'drinking_water_sources_count',
    'घरेलू जल की कुल डिमांड(लीटर प्रतिदिन)': 'water_demand_daily_litres',
    'घरेलू जल की कुल उपलब्धता(लीटर प्रतिदिन)': 'water_supply_daily_litres',
    'phed द्वारा (ट्यूब वेल के अलावा) जल वितरण के लिए कुल सप्लाइ(लीटर प्रतिदिन)': 'phed_non_tubwell_supply_litres',
    'phed द्वारा (ट्यूब वेल के अलावा) जल वितरण से जुड़े घरों की संख्या)': 'phed_non_tubwell_houses',
    'phed द्वारा ट्यूब वेल आधारित जल वितरण द्वारा कुल सप्लाइ(लीटर प्रतिदिन)': 'phed_tubwell_supply_litres',
    'केवल हैंडपंप/ट्यूबवेल के जल से जुड़े घरों की संख्या': 'handpump_tubewell_only_houses',
    'कुल ओवरहेड टैंक (संख्या)': 'overhead_tanks_count',
    'ओवरहेड टैंक द्वारा कुल सप्लाइ(लीटर प्रतिदिन )': 'overhead_tank_supply_litres',
    'टैंकर द्वारा कुल सप्लाइ(लीटर प्रतिदिन)': 'tanker_supply_litres',
    'केवल टैंकर द्वारा सप्लाइ वाले घरों की संख्या': 'tanker_only_supply_houses',
    'घरों में नल का चालू कनेक्शन (FHTC) (प्रतिशत में)': 'tap_connection_pct',
    'कृषि जल की मुख्य सप्लाइ ( नहर, फार्म पॉन्ड्स, ट्यूब वेल etc की संख्या)': 'agri_water_supply_sources',
    'कार्यशील सार्वजनिक जल‑सुविधा(सार्वजनिक नल/हैंडपंप/ट्यूबवेल/बोरवेल/ पानी की टंकी/ओवरहेड टैंक से जुड़े स्टैंड पोस्ट/जल कियोस्क/पानी/एटीएम/सामुदायिक पेयजल पॉइंट की संख्या) F': 'public_water_facilities_count',
    'आरओ(RO) सिस्टम/फ़िल्टर/रासायनिक उपचार से युक्त सार्वजनिक पेयजल सुविधाएं (संख्या)': 'ro_facilities',
    'पानी की गुणवत्ता संबंधी समस्याओं की सूचना मिली (फ्लोराइड/नाइट्रेट/लवणता) F': 'water_quality_issues_reported',
    'जल गुणवत्ता परीक्षण की वार्षिक आवृति': 'water_quality_test_frequency',
    'भूजल दोहन की स्थिति (भूजल टेबल के अनुसार)(मीटर में)': 'groundwater_depth_meters',
    'भूजल पुनर्भरण संरचनाएं (चेक डैम/एनिकट/रिचार्ज कुआँ/रिचार्ज पिट/रेन वाटर हार्वेस्टिंग संरचना/जल संचयन टैंक / तालाब आदि की संख्या) F': 'groundwater_recharge_structures',
    'शोचालय सहित कुल घरों की संख्या': 'houses_with_toilets',
    'वृक्षारोपण के लिए उपयुक्त रिक्त भूमि (सड़कमार्गों के किनारों के अलावा )(हेक्टेयर)': 'vacant_land_for_plantation_ha',
    'सरकारी नर्सरी की उपलब्धता (संख्या)': 'govt_nurseries_count',
    'नर्सरी मे उपलब्ध पौधे (संख्या)': 'nursery_plants_count',
    'ग्राम पंचायत में चरागाह भूमि(हेक्टेयर)': 'pasture_land_hectare',
    'आरक्षित/संरक्षित वन/ protected area का क्षेत्रफल(हेक्टेयर)': 'forest_area_hectare',
    'सार्वजनिक भवन में वृक्षारोपण की संभावना वाली भूमि(हेक्टेयर)': 'public_bldg_plantation_land_ha',
    'पीएम सूर्यघर योजना के अंतर्गत छतों पर सौर पैनल स्थापित घरों की संख्या': 'pm_surya_ghar_solar_houses',
    'घरेलू अपशिष्ट जल उत्पादन (अनुमानित)(लीटर प्रतिदिन)': 'domestic_wastewater_daily_ltr',
    'विकेंद्रकृत अपशिष्ट जल प्रबंधन वाले घरों की संख्या (मैजिक पिट या हाउस लेवल सोक पिट)': 'decentralised_ww_mgmt_houses',
    'विकेंद्रकृत सामुदायिक अपशिष्ट जल प्रबंधन वाले घरों की संख्या (पक्की नालियों से जुड़े घर)': 'community_ww_mgmt_houses',
    'सीवरेज नेटवर्क की उपलब्धता': 'sewerage_network_avail',
    'कुल अपशिष्ठ(कि.ग्रा. प्रतिदिन)': 'total_waste_daily_kg',
    'सूखा अपशिष्ठ(कि.ग्रा. प्रतिदिन)': 'dry_waste_daily_kg',
    'गीला अपशिष्ठ(कि.ग्रा. प्रतिदिन)': 'wet_waste_daily_kg',
    'Material Recovery Facility (MRF)/ (RRC) शेड की संख्या': 'mrf_rrc_sheds_count',
    'वेस्ट डम्प साइट्स (संख्या)': 'waste_dump_sites_count',
    'उपलब्ध अपशिष्ट संग्रहण प्रणाली F': 'waste_collection_system_type',
    'घर-घर जाकर कचरा संग्रहण की सुविधा से जुड़े हुए घरों/ इमारत की संख्या (अनुमानित)': 'door_to_door_collection_houses',
    'कचरा उठाने वाली गाड़ी पर पृथक्करण लागू किया गया (2-बिन)': 'two_bin_segregation_applied',
    'compost pits की संख्या (सरकारी)': 'govt_compost_pits_count',
    'compost pits (सरकारी) क्षमता(कि.ग्रा.)': 'govt_compost_pits_capacity_kg',
    'compost pits की संख्या (प्राइवेट- थोक अपशिष्ट उत्पादक )': 'pvt_compost_pits_count',
    'compost pits (प्राइवेट) क्षमता(कि.ग्रा.)': 'pvt_compost_pits_capacity_kg',
    'बायोगैस तथा Compressed Biogas Plants (संख्या)': 'biogas_plants_count',
    'बायोगैस तथा Compressed Biogas Plants क्षमता(कि.ग्रा.)': 'biogas_plants_capacity_kg',
    'अन्य वेस्ट प्रोसेसिंग units (संख्या)': 'other_waste_processing_units',
    'प्रमुख मेले/त्योहार के नाम': 'major_fairs_festival_names',
    'प्रतिवर्ष आयोजित मुख्य धार्मिक‑सांस्कृतिक इत्यादि मेलों की संख्या': 'annual_fairs_count',
    'प्रमुख मेलों में औसत फुटफॉल(प्रति दिवस)': 'avg_fair_footfall_daily',
    'मेले में अस्थायी दुकानें/स्टॉल लगाने वालों की संख्या (अनुमानित)': 'fair_stalls_count',
    'खाद्य/हस्तशिल्प/खेल सामग्री/स्थानीय उत्पाद के स्टॉल की संख्या (अनुमानित)': 'fair_product_stalls_count',
    'SHG द्वारा संचालित स्टॉल/सेवाओं की संख्या (अनुमानित)': 'fair_shg_stalls_count',
    'प्रमुख वार्षिक मेलों में भाग लेने वाले प्रत्येक स्टॉल द्वारा अर्जित औसत दैनिक राजस्व राशि (रुपयों में)': 'avg_stall_daily_revenue_rs',
    'प्रमुख धार्मिक और सांस्कृतिक संपत्तियों (मूर्त) की संख्या': 'cultural_assets_count',
    'धार्मिक और सांस्कृतिक संपत्तियां में औसत फुट्फॉल (प्रति दिवस)': 'avg_daily_footfall_cultural_sites',
    'प्रमुख धार्मिक एवं सांस्कृतिक मेलों के दौरान उपलब्ध मूलभूत सुविधाओं की उपलब्धता (सड़क, जल, पेयजल, बिजली) F': 'fair_basic_facilities',
    'सड़क: मेले तक आने‑जाने का मार्ग सुचारू है या नहीं F': 'fair_road_access',
    'पानी: प्रतिदिन उपलब्ध पानी(लीटर)': 'fair_water_daily_litres',
    'मेले से जुड़े रोजगार पाने वाले व्यक्तियों की संख्या (अनुमानित)': 'fair_related_employment',
    'सार्वजनिक शौचालय की पर्याप्त उपलब्धता(महिला एवं पुरुष) F': 'fair_public_toilet_avail',
    'प्रशिक्षित गाइड का पंजीकरण (अनुमानित संख्या)': 'registered_trained_guides',
    'ई-मित्र की उपलब्धता F': 'emitra_avail',
    'निकटतम ई-मित्र की ग्राम पंचायत मुख्यालय से दूरी(कि.मी.)': 'dist_emitra_km',
    'निकटतम पुलिस स्टेशन की ग्राम पंचायत मुख्यालय से दूरी(कि.मी.)': 'dist_police_station_km',
    'निकटतम एलपीजी वितरक की ग्राम पंचायत मुख्यालय से दूरी(कि.मी.)': 'dist_lpg_distributor_km',
    'दमकल स्टेशन की की ग्राम पंचायत मुख्यालय से दूरी(कि.मी.)': 'dist_fire_station_km',
}

# ── URBAN COL MAP ─────────────────────────────────────────────────────────────
URBAN_COL_MAP = {
    'जिला': 'district',
    'ULB': 'ulb',
    'वार्ड': 'ward',
    'वार्ड ID': 'ward_id_rajdhara',
    'शहरी वार्ड प्रभारी / प्रशासक का नाम': 'ward_incharge_name',
    'संपर्क नंबर': 'ward_incharge_contact',
    'कुल भौगोलिक क्षेत्र (हैक्टेयर)': 'total_area_hectare',
    'शहरी Profile': 'urban_profile',
    'कुल जनसंख्या (Census 2011)': 'pop_census_2011',
    'कुल जनसंख्या (अनुमानित 2026)': 'pop_2026_est',
    'पुरुष जनसंख्या (अनुमानित 2026)': 'male_pop_2026',
    'महिला जनसंख्या (अनुमानित 2026)': 'female_pop_2026',
    'ट्रांसजेंडर (अनुमानित 2026)': 'transgender_pop_2026',
    'बच्चे (0-6 वर्ष) (अनुमानित 2026)': 'children_0_6_2026',
    'बच्चे (6-14 वर्ष) (अनुमानित 2026)': 'children_6_14_2026',
    'जनसँख्या (14-18 वर्ष) (अनुमानित 2026)': 'pop_14_18_2026',
    'वरिष्ठ नागरिक (60+) (अनुमानित 2026)': 'senior_citizens_2026',
    'विशेष योग्यजन (PwD) की संख्या (अनुमानित 2026)': 'pwd_pop_2026',
    'डिफेंस फोर्सेज (जल,थल,वायु सेना) में कार्यरत कार्मिक की संख्या (अनुमानित 2026)': 'defence_personnel_2026',
    'पक्के घरों की संख्या (अनुमानित- 2026)': 'pucca_houses_2026',
    'कच्चे घरों की संख्या (अनुमानित- 2026)': 'kutcha_houses_2026',
    'एलोपैथिक स्वास्थ्य केन्द्र / हॉस्पिटल की संख्या': 'allopathic_centers',
    'आयुष स्वास्थ्य केंद्र / हॉस्पिटल की संख्या': 'ayush_centers',
    'निजी स्वास्थ्य केन्द्र / हॉस्पिटल की संख्या': 'private_health_centers',
    'स्वास्थ्य केंद्र का नाम': 'health_center_name',
    'स्वास्थ्य केंद्र का प्रकार': 'health_center_type',
    'स्वास्थ्य केंद्र की location': 'health_center_location',
    'स्वास्थ्य केंद्र में बेड्स की संख्या': 'health_center_beds',
    'क्या यह स्वास्थ्य केंद्र आयुष्मान आरोग्य मंदिर हैं ?': 'is_ayushman_arogya_mandir',
    'स्वास्थ्य केन्द्र पर स्वीकृत स्वास्थ्य कर्मचारी (संख्या)': 'sanctioned_health_staff',
    'स्वास्थ्य केन्द्र पर कार्यरत स्वास्थ्य कर्मचारी (संख्या)': 'working_health_staff',
    'देखे गए मरीजों की औसत संख्या (प्रतिदिन)': 'avg_daily_patients',
    '6–72 माह बच्चों को नियमित SNP (Supplementary Nutrition Programme) प्राप्त (संख्या)': 'snp_children_6_72m',
    'मधुमेह (डायबीटीज) हेतु स्क्रीनिंग किए गए व्यक्ति (संख्या, FY 2025-26)': 'diabetes_screened_fy2526',
    'उच्च रक्तचाप हेतु स्क्रीनिंग किए गए व्यक्ति (संख्या, FY 2025-26)': 'bp_screened_fy2526',
    'क्या वार्ड किसी स्थानिक बीमारी से प्रभावित है? जैसे सिलिकोसिस F': 'endemic_disease_affected',
    'TB के कुल वर्तमान मरीज (संख्या)': 'tb_patients_count',
    'कुल एनीमिक गर्भवती महिलाओं की संख्या': 'anemic_pregnant_women_count',
    'कुल एनीमिक बच्चों की संख्या (National Iron Plus Initiative कार्यक्रम के तहत)': 'anemic_children_count',
    'मुख्य मंत्री आयुष्मान आरोग्य योजना के लाभार्थियों की संख्या': 'ayushman_arogya_beneficiaries',
    'कुल जन आधार मे पंजीकृत परिवार (प्रतिशत)': 'janaadhar_reg_families_pct',
    'बायोमेडिकल अपशिष्ट प्रबंधन सुविधा': 'biomedical_waste_facility',
    'श्री अन्नपूर्णा रसोई संचालित': 'annapurna_rasoi_operational',
    'श्री अन्नपूर्णा संचालित रसोई से औसतन  प्रतिदिन लाभार्थियों की संख्या (संचालित दिनों के अनुसार)': 'annapurna_daily_beneficiaries',
    'आंगनवाड़ी / मिनी आंगनवाड़ी केंद्रों की संख्या': 'anganwadi_centers_count',
    'आंगनवाड़ी केंद्र का कोड': 'anganwadi_center_code',
    'आंगनवाड़ी केंद्र का प्रकार': 'anganwadi_center_type',
    'आंगनवाड़ी/मिनी आंगनवाड़ी केंद्र की location': 'anganwadi_location',
    'आंगनवाड़ी/मिनी आंगनवाड़ी केंद्र में कार्यकर्ता की संख्या': 'anganwadi_workers_count',
    'आंगनवाड़ी/मिनी आंगनवाड़ी केंद्र में सहायिका की संख्या': 'anganwadi_helpers_count',
    'आशा सहयोगिनी की संख्या': 'asha_workers_count',
    'आंगनवाड़ी/मिनी आंगनवाड़ी में नामांकित बच्चे (संख्या)': 'anganwadi_enrolled_children',
    'स्कूल पूर्व शिक्षा (प्री स्कूल) निगरानी मे लिए गए बच्चे (संख्या)': 'preschool_monitoring_children',
    'वृद्धि निगरानी चार्ट मे लिए गए बच्चे (संख्या)': 'growth_monitoring_children',
    'गंभीर तीव्र कुपोषित (SAM) बच्चे (संख्या)': 'sam_children_count',
    'आंगनवाड़ी/मिनी आंगनवाड़ी मे पंजीकृत गर्भवती व धात्री महिला (संख्या)': 'anganwadi_pregnant_women',
    'बिजली की उपलब्धता': 'anganwadi_electricity',
    'पानी की उपलब्धता': 'anganwadi_water',
    'शौचालय की उपलब्धता': 'anganwadi_toilet',
    'राजकीय भवन की उपलब्धता': 'anganwadi_govt_building',
    'कुल राजकीय विद्यालयों की संख्या': 'govt_schools_count',
    'नाम': 'school_name',
    'स्थान': 'school_location',
    "'Query3'[S4_विद्यालय का प्रकार 1 F]": 'school_type',
    'विद्यालयों मे कुल नामांकित छात्र (संख्या)': 'total_enrolled_students',
    'उपलब्ध कुल उपयोगी कमरों की संख्या': 'useful_classrooms_count',
    'पीने योग्य पानी की सुविधा उपलब्ध': 'school_drinking_water',
    'विद्यालय में खेल मैदान की सुविधा उपलब्ध': 'school_playground',
    'विद्यालय में उपयोगी शौचालय सुविधा उपलब्ध': 'school_toilet_avail',
    'विद्यालय में छात्राओं के लिए उपयोगी शौचालय सुविधा उपलब्ध': 'school_girls_toilet_avail',
    'स्वीकृत शिक्षकों की कुल संख्या': 'sanctioned_teachers',
    'कार्यरत शिक्षकों की कुल संख्या': 'working_teachers',
    'कंप्यूटर शिक्षा हेतु उपलब्ध कंप्यूटर की संख्या': 'computers_for_education',
    'स्मार्ट क्लास उपलब्ध': 'smart_class_avail',
    'कुल निजी विद्यालयों की संख्या': 'pvt_schools_count',
    "'Query3'[S4_विद्यालय का प्रकार 2 F]": 'pvt_school_type',
    'कुल नामांकित छात्र (संख्या)': 'pvt_school_enrolled_students',
    'कुल विद्यालय (संख्या)': 'total_schools_count',
    'पिछले वर्ष रिपोर्ट किए गए ड्रॉपआउट कुल बच्चे (संख्या)': 'dropout_children_prev_year',
    'ड्रॉपआउट का मुख्य कारण': 'dropout_main_reason',
    'वार्ड में कक्षा 0–5 के कुल अध्ययनरत छात्रों की संख्या (अनुमानित)': 'students_class_0_5_boys',
    'वार्ड में कक्षा 0–5 के कुल अध्ययनरत छात्राओं की संख्या (अनुमानित)': 'students_class_0_5_girls',
    'वार्ड में कक्षा 6–8 के कुल अध्ययनरत छात्रों की संख्या (अनुमानित)': 'students_class_6_8_boys',
    'वार्ड में कक्षा 6–8 के कुल अध्ययनरत छात्राओं की संख्या (अनुमानित)': 'students_class_6_8_girls',
    'वार्ड में कक्षा 9–10 के कुल अध्ययनरत छात्रों की संख्या (अनुमानित)': 'students_class_9_10_boys',
    'वार्ड में कक्षा 9–10 के कुल अध्ययनरत छात्राओं की संख्या (अनुमानित)': 'students_class_9_10_girls',
    'वार्ड में कक्षा 11–12 के कुल अध्ययनरत छात्रों की संख्या (अनुमानित)': 'students_class_11_12_boys',
    'वार्ड में कक्षा 11–12 के कुल अध्ययनरत छात्राओं की संख्या (अनुमानित)': 'students_class_11_12_girls',
    'वार्ड में कक्षा 12 से ऊपर के कुल अध्ययनरत छात्रों की संख्या (अनुमानित)': 'students_above_class_12_boys',
    'वार्ड में कक्षा 12 से ऊपर के कुल अध्ययनरत छात्राओं की संख्या (अनुमानित)': 'students_above_class_12_girls',
    'क्षेत्र में उपलब्ध कुल स्नातक/स्नातकोत्तर(पॉलीटेक्निक/इंजीनियर/मेडिकल/विश्वविद्यालय आदि) की संख्या (सरकारी + निजी)': 'higher_edu_institutions_count',
    'महाविद्यालयों में अध्यनरत छात्र / छात्राओं की संख्या (अनुमानित)': 'college_enrolled_students',
    'सरकारी हॉस्टल की संख्या': 'govt_hostels_count',
    'सरकारी हॉस्टल में निवासरत कुल छात्र / छात्राओं की संख्या (अनुमानित)': 'govt_hostel_students',
    'कौशल प्रशिक्षण हेतु संचालित कुल केंद्रों की संख्या (राजकीय योजना अंतर्गत )': 'skill_training_centers_count',
    'वार्ड में कुल कौशल प्रशिक्षित व्यक्तियों की संख्या (अनुमानित )': 'skill_trained_persons_count',
    'वृद्धावस्था पेंशन लाभार्थी (संख्या)': 'old_age_pensioners',
    'विधवा पेंशन लाभार्थी (संख्या)': 'widow_pensioners',
    'विशेष योग्यजन पेंशन लाभार्थी (अनुमानित संख्या)': 'pwd_pensioners_est',
    'पीएम उज्ज्वला योजना के लाभार्थी (संख्या)': 'pm_ujjwala_beneficiaries',
    'पीएम/सीएम आवास योजना के कुल लाभार्थी (संख्या)': 'pm_cm_awas_beneficiaries',
    'क्षेत्र में संचालित कुल वृहद औद्योगिक इकाई (संख्या)': 'large_industrial_units',
    'क्षेत्र में संचालित वृहद औद्योगिक इकाओं में रोजगार प्राप्त व्यक्तियों की संख्या': 'large_industry_employment',
    'क्षेत्र में संचालित कुल लघु औद्योगिक इकाई (संख्या)': 'small_scale_industries',
    'क्षेत्र में संचालित लघु औद्योगिक इकाओं में रोजगार प्राप्त व्यक्तियों की संख्या': 'small_scale_industry_employment',
    'कुल कार्यरत स्वयं सहायता समूह (संख्या)': 'active_shg_count',
    'कार्यरत स्वयं सहायता समूह मे जुड़ी हुई कुल महिलायें (संख्या)': 'women_in_shgs',
    'कुल कार्यरत स्वयं सहायता समूह (SHG) जिनका बैंक अकाउंट खुल गया है (संख्या)': 'shg_with_bank_account',
    'कुल कार्यरत स्वयं सहायता समूहों को फंड (निधि) से प्राप्त हुई कुल राशि का विवरण राशि (लाखों मे)': 'shg_fund_amount_lakhs',
    'कुल स्वयं सहायता समूह जिनका बैंक लिन्केज हो चुका हैं (संख्या)': 'shg_bank_linkage_count',
    'कार्यरत स्वयं सहायता समूह द्वारा किए जाने वाले प्रमुख विभिन्न आजीविका कार्यों का प्रकार F': 'shg_livelihood_types',
    'स्थानीय कारीगरों की संख्या': 'local_artisans_count',
    'प्रमुख विभिन्न आजीविका कार्यों का प्रकार (हस्तकला, शिल्पकला आदि )': 'artisan_livelihood_types',
    'वार्ड से गुज़रती मुख्य सड़क का प्रकार (NH/SH/MDR etc.)': 'main_road_type',
    'सड़क की लंबाई(कि.मी.)': 'road_length_km',
    'कुल घर जिनमे विद्युत कनेक्शन है (संख्या)': 'houses_with_electricity',
    'कुल GSS की संख्या': 'gss_count',
    'सॉर ऊर्जा installed घर (संख्या)': 'solar_installed_houses',
    'प्रतिदिन घरेलू विद्युत की औसत उपलब्धता(घंटे/दिन)': 'avg_electricity_hours_daily',
    'सामुदायिक भवनों की संख्या': 'community_buildings_count',
    'उपयोग लायक सार्वजनिक शौचालय (संख्या)': 'public_toilets',
    'सौर ऊर्जा installed कुल सार्वजनिक भवन/कार्यालय (संख्या)': 'solar_public_buildings',
    'वर्षा जल संचयन installed कुल सार्वजनिक भवन/कार्यालय (संख्या)': 'rainwater_harvest_public_bldgs',
    'कुल खेल के मैदानों की संख्या (निजी मैदान/ विद्यालय के मैदान को छोड़ कर)': 'sports_grounds_count',
    'मुख्य बाजार/हाट से दूरी (कि.मी.)': 'dist_main_market_km',
    'सार्वजनिक परिवहन उपलब्धता': 'public_transport_avail',
    'बस स्टैंड से वार्ड की दूरी(कि.मी.)': 'dist_bus_stand_km',
    'रेलवे स्टेशन से वार्ड की दूरी(कि.मी.)': 'dist_railway_station_km',
    'ई वी (electric vehicle) चार्जिंग स्टेशन की उपलब्धता': 'ev_charging_station_avail',
    'ब्रॉड्बैन्ड की उपलब्धता': 'broadband_avail',
    'कुल सरकारी बैंक (संख्या)': 'govt_banks_count',
    'निजी बैंक (संख्या)': 'pvt_banks_count',
    'उपलब्ध जल स्रोतों (कुआँ) की संख्या': 'well_count',
    'उपलब्ध जल स्रोतों (कुआँ) द्वारा कुल सप्लाई (लीटर प्रतिदिन)': 'well_supply_daily_litres',
    'उपलब्ध जल स्रोतों (हैंडपंप) की संख्या': 'handpump_count',
    'उपलब्ध जल स्रोतों (हैंडपंप) द्वारा कुल सप्लाई (लीटर प्रतिदिन)': 'handpump_supply_daily_litres',
    'उपलब्ध जल स्रोतों (टैंक) की संख्या': 'tank_count',
    'उपलब्ध जल स्रोतों (टैंक) द्वारा कुल सप्लाई (लीटर प्रतिदिन)': 'tank_supply_daily_litres',
    'ओवरहेड टैंक की संख्या': 'overhead_tanks_count',
    'ओवरहेड टैंक द्वारा कुल सप्लाई (लीटर प्रतिदिन)': 'overhead_tank_supply_litres',
    'घरों में नल का चालू कनेक्शन (FHTC) (प्रतिशत में)': 'tap_connection_pct',
    'आरओ(RO) सिस्टम/फ़िल्टर/रासायनिक उपचार से युक्त सार्वजनिक पेयजल सुविधाएं (संख्या)': 'ro_facilities',
    'पानी की गुणवत्ता संबंधी समस्याओं की सूचना मिली (फ्लोराइड/नाइट्रेट/लवणता) F': 'water_quality_issues_reported',
    'जल गुणवत्ता परीक्षण की वार्षिक आवृति': 'water_quality_test_frequency',
    'भूजल दोहन की स्थिति (भूजल टेबल के अनुसार)(मीटर में)': 'groundwater_depth_meters',
    'भूजल पुनर्भरण संरचनाएं (चेक डैम/एनिकट/रिचार्ज कुआँ/रिचार्ज पिट/रेन वाटर हार्वेस्टिंग संरचना/जल संचयन टैंक / तालाब आदि की संख्या) F': 'groundwater_recharge_structures',
    'वृक्षारोपण के लिए उपयुक्त रिक्त भूमि (सड़कमार्गों के किनारों के अलावा )(हेक्टेयर)': 'vacant_land_for_plantation_ha',
    'सरकारी नर्सरी की उपलब्धता (संख्या)': 'govt_nurseries_count',
    'नर्सरी मे उपलब्ध पौधे (संख्या)': 'nursery_plants_count',
    'आरक्षित/संरक्षित वन/ protected area का क्षेत्रफल(हेक्टेयर)': 'forest_area_hectare',
    'सार्वजनिक भवन में वृक्षारोपण की संभावना वाली भूमि(हेक्टेयर)': 'public_bldg_plantation_land_ha',
    'पीएम सूर्यघर योजना के अंतर्गत छतों पर सौर पैनल स्थापित घरों की संख्या': 'pm_surya_ghar_solar_houses',
    'घरेलू अपशिष्ट जल उत्पादन (अनुमानित)(लीटर प्रतिदिन)': 'domestic_wastewater_daily_ltr',
    'विकेंद्रकृत अपशिष्ट जल प्रबंधन वाले घरों की संख्या (मैजिक पिट या हाउस लेवल सोक पिट)': 'decentralised_ww_mgmt_houses',
    'विकेंद्रकृत सामुदायिक अपशिष्ट जल प्रबंधन वाले घरों की संख्या (पक्की नालियों से जुड़े घर)': 'community_ww_mgmt_houses',
    'सीवरेज नेटवर्क की उपलब्धता': 'sewerage_network_avail',
    'शोचालय से वंचित कुल घरों की संख्या': 'houses_without_toilets',
    'सीवरेज नेटवर्क से वंचित घरों की संख्या': 'houses_without_sewerage',
    'कुल कार्यरत सफाई कर्मचारी की संख्या': 'sanitation_workers_count',
    'उपलब्ध अपशिष्ट संग्रहण प्रणाली': 'waste_collection_system_type',
    'घर-घर जाकर कचरा संग्रहण की सुविधा से जुड़े हुए घरों/ इमारत की संख्या (अनुमानित)': 'door_to_door_collection_houses',
    'कचरा उठाने वाली गाड़ी पर पृथक्करण लागू किया गया (2-बिन)': 'two_bin_segregation_applied',
    'compost pits की संख्या (सरकारी)': 'govt_compost_pits_count',
    'compost pits (सरकारी) क्षमता(कि.ग्रा.)': 'govt_compost_pits_capacity_kg',
    'compost pits की संख्या (प्राइवेट- थोक अपशिष्ट उत्पादक )': 'pvt_compost_pits_count',
    'compost pits (प्राइवेट) क्षमता(कि.ग्रा.)': 'pvt_compost_pits_capacity_kg',
    'प्रमुख मेले/त्योहार के नाम': 'major_fairs_festival_names',
    'प्रतिवर्ष आयोजित मुख्य धार्मिक‑सांस्कृतिक इत्यादि मेलों की संख्या': 'annual_fairs_count',
    'प्रमुख मेलों में औसत फुटफॉल(प्रति दिवस)': 'avg_fair_footfall_daily',
    'मेले में अस्थायी दुकानें/स्टॉल लगाने वालों की संख्या (अनुमानित)': 'fair_stalls_count',
    'खाद्य/हस्तशिल्प/खेल सामग्री/स्थानीय उत्पाद के स्टॉल की संख्या (अनुमानित)': 'fair_product_stalls_count',
    'SHG द्वारा संचालित स्टॉल/सेवाओं की संख्या (अनुमानित)': 'fair_shg_stalls_count',
    'प्रमुख वार्षिक मेलों में भाग लेने वाले प्रत्येक स्टॉल द्वारा अर्जित औसत दैनिक राजस्व राशि (रुपयों में)': 'avg_stall_daily_revenue_rs',
    'प्रमुख धार्मिक एवं सांस्कृतिक मेलों के दौरान उपलब्ध मूलभूत सुविधाओं की उपलब्धता (सड़क, जल, पेयजल, बिजली)': 'fair_basic_facilities',
    'सड़क: मेले तक आने‑जाने का मार्ग सुचारू है या नहीं': 'fair_road_access',
    'पानी: प्रतिदिन उपलब्ध पानी(लीटर)': 'fair_water_daily_litres',
    'मेले से जुड़े रोजगार पाने वाले व्यक्तियों की संख्या (अनुमानित)': 'fair_related_employment',
    'सार्वजनिक शौचालय की पर्याप्त उपलब्धता(महिला एवं पुरुष)': 'fair_public_toilet_avail',
    'प्रशिक्षित गाइड का पंजीकरण (अनुमानित संख्या)': 'registered_trained_guides',
    'निकटतम पुलिस स्टेशन की  दूरी(कि.मी.)': 'dist_police_station_km',
    'ई-मित्र की उपलब्धता F': 'emitra_avail',
    'ई-मित्र की निकटतम दूरी(कि.मी.)': 'dist_emitra_km',
    'निकटतम एलपीजी वितरक की  दूरी(कि.मी.)': 'dist_lpg_distributor_km',
    'दमकल स्टेशन की निकटता(कि.मी.)': 'dist_fire_station_km',
}

# ── DB columns that must stay as TEXT (never try numeric conversion) ──────────
# These contain phone numbers, codes, IDs that look numeric but are actually text
TEXT_ONLY_DB_COLS = {
    'sarpanch_contact', 'ward_incharge_contact',
    'anganwadi_center_code', 'gp_id_rajdhara', 'ward_id_rajdhara',
    'mandi_village_name', 'food_storage_village', 'health_center_village',
    'school_village', 'anganwadi_village',
    'gp_profile', 'urban_profile',
    'mandi_location', 'food_storage_location', 'health_center_location',
    'anganwadi_location', 'school_location',
}

# ── HELPERS ──────────────────────────────────────────────────────────────────
def clean_value(v):
    """Send all values as Python native. Floats go as float (Postgres NUMERIC/BIGINT both accept)."""
    if v is None:
        return None
    if isinstance(v, float) and (np.isnan(v) or np.isinf(v)):
        return None
    if isinstance(v, (np.integer,)):
        return int(v)
    if isinstance(v, (np.floating,)):
        f = float(v)
        return None if (np.isnan(f) or np.isinf(f)) else f
    if isinstance(v, (np.bool_,)):
        return bool(v)
    return v


def load_excel(filepath, col_map):
    print(f"  Reading {filepath} …")
    df = pd.read_excel(filepath, dtype=str)

    # KEY FIX 1: NFC-normalize ALL column names — fixes invisible Unicode differences (ड़ etc.)
    df.columns = [nfc(c.strip()) for c in df.columns]

    # NFC-normalize + strip col_map keys too
    col_map_norm = {nfc(k.strip()): v for k, v in col_map.items()}

    keep = {k: v for k, v in col_map_norm.items() if k in df.columns}
    missing = [k for k in col_map_norm if k not in df.columns]
    if missing:
        print(f"  ⚠  {len(missing)} cols still not found: {missing[:3]}")

    df = df[list(keep.keys())].rename(columns=keep)

    # KEY FIX 2: Convert numeric cols to float64 (never int) — avoids bigint overflow
    # Skip TEXT_ONLY_DB_COLS entirely
    for col in df.columns:
        if col in TEXT_ONLY_DB_COLS:
            continue  # keep as string
        converted = pd.to_numeric(df[col], errors='coerce')
        non_null_orig = df[col].dropna()
        non_null_conv = converted.dropna()
        if len(non_null_orig) > 0 and len(non_null_conv) / len(non_null_orig) > 0.5:
            # Clamp values that exceed NUMERIC safe range to NULL rather than erroring
            MAX_SAFE = 1e15
            converted = converted.where(converted.abs() <= MAX_SAFE, other=np.nan)
            df[col] = converted  # float64 — psycopg2 sends as Python float, Postgres casts to BIGINT/NUMERIC

    print(f"  → {len(df)} rows, {len(df.columns)} columns")
    return df


def truncate_and_insert(conn, table, df):
    cur = conn.cursor()
    print(f"  Truncating {table} …")
    cur.execute(f"TRUNCATE TABLE {table} RESTART IDENTITY CASCADE;")
    conn.commit()
    print(f"  ✓ Truncated")

    cols    = list(df.columns)
    col_str = ", ".join(cols)
    sql     = f"INSERT INTO {table} ({col_str}) VALUES %s"
    total   = len(df)
    inserted = 0
    errors   = 0

    for start in range(0, total, BATCH_SIZE):
        batch = df.iloc[start:start + BATCH_SIZE]
        rows = [tuple(clean_value(v) for v in row)
                for row in batch.itertuples(index=False, name=None)]
        try:
            execute_values(cur, sql, rows)
            conn.commit()
            inserted += len(rows)
            print(f"  {table}: {inserted}/{total} ({inserted/total*100:.1f}%)", end="\r")
        except Exception as e:
            conn.rollback()
            # KEY FIX 3: Row-by-row fallback — don't lose the whole 500-row batch
            print(f"\n  ⚠ Batch {start}-{start+BATCH_SIZE} failed ({e}), trying row-by-row…")
            for i, row in enumerate(rows):
                try:
                    cur.execute(f"INSERT INTO {table} ({col_str}) VALUES ({','.join(['%s']*len(row))})", row)
                    conn.commit()
                    inserted += 1
                except Exception as re:
                    conn.rollback()
                    errors += 1
                    if errors <= 10:
                        print(f"    Row {start+i} failed: {re}")

    cur.close()
    print(f"\n  ✅ {table}: {inserted} inserted, {errors} errors")


def main():
    t0 = time.time()
    print("Connecting …")
    conn = psycopg2.connect(
        host=DB_HOST, port=DB_PORT,
        dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD,
        connect_timeout=10
    )
    print("Connected ✓\n")

    print("── RURAL ──")
    rural_df = load_excel(RURAL_FILE, RURAL_COL_MAP)
    truncate_and_insert(conn, "baseline_rural", rural_df)

    print("\n── URBAN ──")
    urban_df = load_excel(URBAN_FILE, URBAN_COL_MAP)
    truncate_and_insert(conn, "baseline_urban", urban_df)

    conn.close()
    print(f"\nDone in {time.time()-t0:.1f}s")

if __name__ == "__main__":
    main()
