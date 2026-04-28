import os
from pathlib import Path

import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

KEY_COLUMNS = ["district", "block", "gram_panchayat"]
SOURCE_DIR = Path("DATA/RAW/RURAL_BASELINE")

ADMIN_FILE = "प्रशासनिक एवं जनसांख्यिकीय विवरण.xlsx"
EDUCATION_FILE = "शिक्षा संबंधी जानकारी.xlsx"
LIVELIHOOD_FILE = "कृषि एवं आजीविका.xlsx"
HEALTH_FILE = "स्वास्थ्य एवं कल्याण.xlsx"
INFRA_FILE = "मुख्य (इंफ्रास्ट्रक्चर) आवागमन संबंधित.xlsx"
ECONOMY_FILE = "औद्योगिक, खनन और आर्थिक विकास.xlsx"
SOCIAL_FILE = "सामाजिक सशक्तिकरण और समावेशन.xlsx"
WATER_FILE = "जल सुरक्षा और समुदाय आधारित क्षमता.xlsx"
ENVIRONMENT_FILE = "पर्यावरणीय स्थिरता और जलवायु अनुकूलता.xlsx"
TOURISM_FILE = "पर्यटन एवं सांस्कृतिक विकास.xlsx"
GOVERNANCE_FILE = "प्रभावी शासन और सार्वजनिक सेवाएं.xlsx"

# Counts include location keys and match source header counts.
ADMIN_MAPPING = {
    "जिला": "district",
    "ब्लॉक": "block",
    "ग्राम पंचायत": "gram_panchayat",
    "राजस्व ग्रामों की संख्या (ग्राम पंचायत के लिए)": "rev_villages_count",
    "कुल जनसंख्या (Census 2011)": "pop_2011",
    "कुल जनसंख्या (अनुमानित 2026)": "pop_2026_est",
    "पुरुष जनसंख्या (अनुमानित 2026)": "male_pop_2026",
    "महिला जनसंख्या (अनुमानित 2026)": "female_pop_2026",
    "ट्रांसजेंडर (अनुमानित 2026)": "transgender_pop_2026",
    "बच्चे (0-6 वर्ष) (अनुमानित 2026)": "children_0_6_2026",
    "बच्चे (6-14 वर्ष) (अनुमानित 2026)": "children_6_14_2026",
    "जनसँख्या (14-18 वर्ष) (अनुमानित 2026)": "pop_14_18_2026",
    "डिफेंस फोर्सेज (जल,थल,वायु सेना) में कार्यरत कार्मिक की संख्या (अनुमानित 2026)": "defense_personnel_2026",
    "विशेष योग्यजन (PwD) की संख्या (अनुमानित 2026)": "pwd_pop_2026",
    "वरिष्ठ नागरिक (60+) (अनुमानित 2026)": "senior_citizens_2026",
    "घुमंतू श्रेणी के कुल लोगो की संख्या (अनुमानित- 2026)": "nomadic_pop_2026",
    "कुल भौगोलिक क्षेत्र (हैक्टेयर)": "total_area_hectare",
    "पक्के घरों की संख्या (अनुमानित- 2026)": "pucca_houses_2026",
    "कच्चे घरों की संख्या (अनुमानित- 2026)": "kutcha_houses_2026",
    "परिवारों की कुल संख्या (अनुमानित- 2026)": "total_families_2026",
    "BPL परिवारों की संख्या (अनुमानित- 2026)": "bpl_families_count",
    "NFSA से लाभान्वित परिवारों की संख्या (अनुमानित- 2026)": "nfsa_beneficiary_families",
}

EDUCATION_MAPPING = {
    "जिला": "district",
    "ब्लॉक": "block",
    "ग्राम पंचायत": "gram_panchayat",
    "आंगनवाड़ी / मिनी आंगनवाड़ी केंद्रों की संख्या": "anganwadi_centers",
    "आंगनवाड़ी/मिनी आंगनवाड़ी केंद्र में कार्यकर्ता की संख्या": "anganwadi_workers",
    "आंगनवाड़ी/मिनी आंगनवाड़ी केंद्र में सहायिका की संख्या": "anganwadi_helpers",
    "आंगनवाड़ी/मिनी आंगनवाड़ी में नामांकित बच्चे (संख्या)": "anganwadi_enrolled_children",
    "आंगनवाड़ी/मिनी आंगनवाड़ी मे पंजीकृत गर्भवती व धात्री महिला (संख्या)": "anganwadi_pregnant_women",
    "आशा सहयोगिनी की संख्या": "asha_sahyogini_count",
    "उपलब्ध कुल उपयोगी कमरों की संख्या": "useful_rooms_count",
    "कंप्यूटर शिक्षा हेतु उपलब्ध कंप्यूटर की संख्या": "computers_available",
    "कार्यरत शिक्षकों की कुल संख्या": "working_teachers",
    "कुल निजी विद्यालयों की संख्या": "pvt_schools_count",
    "कुल नामांकित छात्र (संख्या)": "total_enrolled_students",
    "कुल राजकीय विद्यालयों की संख्या": "govt_schools_count",
    "कुल विद्यालय (संख्या)": "total_schools_count",
    "क्षेत्र में उपलब्ध कुल स्नातक/स्नातकोत्तर(पॉलीटेक्निक/इंजीनियर/मेडिकल/विश्वविद्यालय आदि) की संख्या (सरकारी + निजी)": "higher_edu_institutes",
    "गंभीर तीव्र कुपोषित (SAM) बच्चे (संख्या)": "sam_children_count",
    "ग्राम पंचायत क्षेत्र में कक्षा 0–5 के कुल अध्ययनरत छात्राओं की संख्या (अनुमानित)": "enrolled_girls_0_5",
    "ग्राम पंचायत क्षेत्र में कक्षा 0–5 के कुल अध्ययनरत छात्रों की संख्या (अनुमानित)": "enrolled_boys_0_5",
    "ग्राम पंचायत क्षेत्र में कक्षा 11–12 के कुल अध्ययनरत छात्राओं की संख्या (अनुमानित)": "enrolled_girls_11_12",
    "ग्राम पंचायत क्षेत्र में कक्षा 11–12 के कुल अध्ययनरत छात्रों की संख्या (अनुमानित)": "enrolled_boys_11_12",
    "ग्राम पंचायत क्षेत्र में कक्षा 12 से ऊपर के कुल अध्ययनरत छात्राओं की संख्या (अनुमानित)": "enrolled_girls_above_12",
    "ग्राम पंचायत क्षेत्र में कक्षा 12 से ऊपर के कुल अध्ययनरत छात्रों की संख्या (अनुमानित)": "enrolled_boys_above_12",
    "ग्राम पंचायत क्षेत्र में कक्षा 6–8 के कुल अध्ययनरत छात्राओं की संख्या (अनुमानित)": "enrolled_girls_6_8",
    "ग्राम पंचायत क्षेत्र में कक्षा 6–8 के कुल अध्ययनरत छात्रों की संख्या (अनुमानित)": "enrolled_boys_6_8",
    "ग्राम पंचायत क्षेत्र में कक्षा 9–10 के कुल अध्ययनरत छात्राओं की संख्या (अनुमानित)": "enrolled_girls_9_10",
    "ग्राम पंचायत क्षेत्र में कक्षा 9–10 के कुल अध्ययनरत छात्रों की संख्या (अनुमानित)": "enrolled_boys_9_10",
    "पिछले वर्ष रिपोर्ट किए गए ड्रॉपआउट कुल बच्चे (संख्या)": "dropout_children_prev_year",
    "महाविद्यालयों में अध्यनरत छात्र / छात्राओं की संख्या (अनुमानित)": "college_students_est",
    "विद्यालयों मे कुल नामांकित छात्र (संख्या)": "total_enrolled_students",
    "वृद्धि निगरानी चार्ट मे लिए गए बच्चे (संख्या)": "growth_monitoring_children",
    "सरकार तथा निजी स्किल ट्रेनिंग केंद्रों की कुल संख्या जैसे ITIs": "skill_training_centers",
    "सरकार तथा निजी स्किल ट्रेनिंग केंद्रों में कुल प्रशिक्षित छात्र / छात्राओं की संख्या (वार्षिक अनुमानित )": "trained_students_annual",
    "सरकारी हॉस्टल की संख्या": "govt_hostels_count",
    "सरकारी हॉस्टल में निवासरत कुल छात्र / छात्राओं की संख्या (अनुमानित)": "hostel_residents_count",
    "स्कूल पूर्व शिक्षा (प्री स्कूल) निगरानी मे लिए गए बच्चे (संख्या)": "pre_school_monitored_children",
    "स्वीकृत शिक्षकों की कुल संख्या": "sanctioned_teachers_count",
}

LIVELIHOOD_MAPPING = {
    "जिला": "district",
    "ब्लॉक": "block",
    "ग्राम पंचायत": "gram_panchayat",
    "कुल कृषि योग्य भूमि(हैक्टेयर)": "cultivable_land_hectare",
    "कुल बुवाई हेतु भूमि (सभी मौसमों के लिए) (Gross Sown Area)(हैक्टेयर)": "gross_sown_area",
    "शुद्ध बुवाई हेतु भूमि (सभी मौसमों के लिए) (Net Sown Area)(हैक्टेयर)": "net_sown_area",
    "कुल सिंचित क्षेत्र(हैक्टेयर)": "irrigated_area_hectare",
    "खरीफ फसल का कुल उत्पादन(क्विंटल)": "kharif_production_quintal",
    "खरीफ फसल का क्षेत्रफल(हैक्टेयर)": "kharif_area_hectare",
    "रबी फसल का क्षेत्रफल(हैक्टेयर)": "rabi_area_hectare",
    "रबी फसल का कुल उत्पादन(क्विंटल)": "rabi_production_quintal",
    "कुल सोलर पम्प (संख्या)": "solar_pumps_count",
    "कुल किसानो की संख्या": "total_farmers_count",
    "दीर्घ किसानो की संख्या (भूमि 10 हैक्टेयर से अधिक )": "large_farmers_count",
    "लघु किसानो की संख्या (भूमि 2 हैक्टेयर तक )": "small_farmers_count",
    "कुल कृषि विद्युत कनेक्शन (संख्या)": "agri_electricity_conn",
    "कुल यूनिट उपभोग (कृषि विद्युत कनेक्शन द्वारा) (प्रतिदिन)": "daily_agri_units_cons",
    "कुल डीज़ल पम्प (संख्या)": "diesel_pumps_count",
    "कुल पशुधन (संख्या)": "total_livestock_count",
    "कुल दुधारु पशुओ की संख्या": "milch_animals_count",
    "दूध संग्रहण केंद्रों की संख्या": "milk_collection_centers",
    "कुल दूध उत्पादन(लीटर प्रतिदिन)": "daily_milk_prod_litres",
    "दूध संग्रहण केंद्रों की क्षमता(लीटर प्रतिदिन)": "milk_collection_cap_litres",
    "कुल किसान उत्पादक संगठन (एफपीओ) की संख्या": "fpo_count",
    "किसानों को दी गई वार्षिक ऋण राशि (लाखों मे)": "annual_farmer_loan_lakhs",
    "पशुपालकों को दी गई वार्षिक ऋण राशि (लाखों मे)": "annual_livestock_loan_lakhs",
    "किसान क्रेडिट कार्ड (केसीसी) धारकों की संख्या": "kcc_holders_count",
    "पीएम-किसान सम्मान निधि तथा सीएम-किसान सम्मान निधि योजना योजना के पात्र लाभार्थी (संख्या)": "pm_cm_kisan_beneficiaries",
    "एफपीओ से जुड़े हुए कुल किसानों की कुल कृषि भूमि(हेक्टेर)": "fpo_land_area",
    "एफपीओ से जुड़े हुए कुल किसान (संख्या)": "fpo_connected_farmers",
    "उपलब्ध फ़ूड प्रोसेसिंग इकाई के प्रकार": "food_processing_unit_type",
    "उपलब्ध फ़ूड प्रोसेसिंग इकाई की संख्या": "food_processing_unit_count",
    "उपलब्ध फ़ूड प्रोसेसिंग इकाई का कुल उत्पादन(क्विंटल)": "food_processing_prod_quintal",
    "आर्गेनिक कृषि का एरिया(हेक्टेयर)": "organic_farming_area",
    "आर्गेनिक कृषि में लगे किसानो की संख्या": "organic_farming_farmers",
    "जारी किए गए मृदा स्वास्थ्य कार्ड की संख्या (वैध)": "soil_health_cards_valid",
    "जारी किए गए मृदा स्वास्थ्य कार्ड के अंतर्गत कुल कृषि भूमि(हैक्टेयर)": "soil_health_card_land",
    "ड्रिप/स्प्रिंकलर द्वारा सिंचित कुल क्षेत्रफल(हैक्टेयर)": "drip_sprinkler_area",
    "ड्रिप/स्प्रिंकलर का उपयोग करने वाले किसानों की संख्या": "drip_sprinkler_farmers",
    "पॉली हाउस कृषि का एरिया(हेक्टेयर)": "polyhouse_area",
    "पॉली हाउस कृषि में लगे किसानो की संख्या": "polyhouse_farmers",
    "प्लास्टिक मल्चिंग/टनल कृषि का एरिया(हेक्टेयर)": "plastic_mulching_area",
    "प्लास्टिक मल्चिंग/टनल कृषि में लगे किसानो की संख्या": "plastic_mulching_farmers",
    "फसल बीमा योजना में बीमित एरिया(हेक्टेयर)": "crop_insurance_area",
    "फसल बीमा योजना में बीमित किसान (संख्या)": "crop_insurance_farmers",
    "फ़ूड प्रोसेसिंग इकाई में प्राप्त रोजगार (लोगों की संख्या)": "food_processing_employment",
    "फ्लोरिकल्चर कृषि का एरिया(हेक्टेयर)": "floriculture_area",
    "फ्लोरिकल्चर कृषि में लगे किसानो की संख्या": "floriculture_farmers",
    "बकरी पालन फार्म्स की संख्या": "goat_farms_count",
    "बकरी पालन से कुल वार्षिक उत्पादन (बकरी की संख्या)": "annual_goat_production",
    "मंगला पशु बीमा योजना के लाभार्थियों की संख्या (वर्ष 2025-26)": "mangla_pashu_bima_ben",
    "मत्स्य पालन में कुल वार्षिक उत्पादन (निजी + सरकारी)(क्विंटल)": "fisheries_prod_quintal",
    "मत्स्य पालन में शामिल कुल जल स्रोतों की संख्या (निजी + सरकारी)": "fisheries_water_sources",
    "मध्यम किसानो की संख्या (भूमि 2-10 हैक्टेयर तक )": "medium_farmers_count",
    "मुर्गी पालन फार्म्स की संख्या": "poultry_farms_count",
    "मुर्गी पालन फार्म्स में कुल वार्षिक उत्पादन (अण्डे की संख्या)": "poultry_egg_production",
    "मुर्गी पालन फार्म्स में कुल वार्षिक उत्पादन (मुर्गी की संख्या)": "poultry_chicken_production",
    "यदि उर्वरक/बीज केंद्र नहीं है तो निकटम बीज केंद्र की ग्रामपंचायत मुख्यालय से दूरी(कि.मी.)": "dist_seed_center_km",
    "यदि कृषि उपज मंडी/अन्य मंडी उपलब्ध नहीं है तो निकटतम मंडी की ग्रामपंचायत मुख्यालय से दूरी(कि.मी.)": "dist_mandi_km",
    "यदि कृषि उपज मंडी/अन्य मंडी उपलब्ध है तो मंडी की location": "mandi_location",
    "यदि नहीं है तो निकटतम खाद्यान भंडारण गोदाम की ग्राम पंचायत मुख्यालय से दूरी(कि.मी.)": "dist_grain_storage_km",
    "सरकारी पशु चिकित्सा केंद्र/यूनिट्स (संख्या)": "govt_vet_centers",
    "सुअर पालन फार्म्स की संख्या": "pig_farms_count",
    "सुअर पालन से कुल वार्षिक उत्पादन (सुअर की संख्या)": "pig_annual_production",
    "हॉर्ट्रिकल्चर कृषि का एरिया(हेक्टेयर)": "horticulture_area",
    "हॉर्ट्रिकल्चर कृषि में लगे किसानो की संख्या": "horticulture_farmers",
}

HEALTH_MAPPING = {
    "जिला": "district",
    "ब्लॉक": "block",
    "ग्राम पंचायत": "gram_panchayat",
    "एलोपैथिक स्वास्थ्य केन्द्र की संख्या": "allopathic_centers",
    "आयुष स्वास्थ्य केंद्र की संख्या": "ayush_centers",
    "6–72 माह बच्चों को नियमित SNP (Supplementary Nutrition Programme) प्राप्त (संख्या)": "snp_recipients_6_72_months",
    "TB के कुल वर्तमान मरीज (संख्या)": "tb_patients_count",
    "उच्च रक्तचाप हेतु स्क्रीनिंग किए गए व्यक्ति (संख्या, FY 2025-26)": "hypertension_screening_count",
    "कुल एनीमिक गर्भवती महिलाओं की संख्या": "anemic_pregnant_women",
    "कुल एनीमिक बच्चों की संख्या (National Iron Plus Initiative कार्यक्रम के तहत)": "anemic_children_count",
    "कुल जन आधार मे पंजीकृत परिवार (प्रतिशत)": "janaadhar_registered_families_pct",
    "देखे गए मरीजों की औसत संख्या (प्रतिदिन)": "avg_daily_patients",
    "निजी स्वास्थ्य केन्द्र की संख्या": "private_health_centers",
    "मधुमेह (डायबीटीज) हेतु स्क्रीनिंग किए गए व्यक्ति (संख्या, FY 2025-26)": "diabetes_screening_count",
    "मुख्य मंत्री आयुष्मान आरोग्य योजना के लाभार्थियों की संख्या": "ayushman_arogya_beneficiaries",
    "श्री अन्नपूर्णा संचालित रसोई से औसतन  प्रतिदिन लाभार्थियों की संख्या (संचालित दिनों के अनुसार)": "annapurna_rasoi_beneficiaries",
    "स्वास्थ्य केंद्र में बेड्स की संख्या": "health_center_beds",
    "स्वास्थ्य केन्द्र पर कार्यरत स्वास्थ्य कर्मचारी (संख्या)": "working_health_staff",
    "स्वास्थ्य केन्द्र पर स्वीकृत स्वास्थ्य कर्मचारी (संख्या)": "sanctioned_health_staff",
}

INFRA_MAPPING = {
    "जिला": "district",
    "ब्लॉक": "block",
    "ग्राम पंचायत": "gram_panchayat",
    "कुल सरकारी बैंक (संख्या)": "govt_banks_count",
    "निजी बैंक (संख्या)": "private_banks_count",
    "कुल पीएम जन धन खाते (संख्या)": "pm_jan_dhan_accounts",
    "कुल सार्वजनिक भवन/कार्यालय (संख्या)": "public_buildings_count",
    "कुल घर जिनमे विद्युत कनेक्शन है (संख्या)": "houses_with_electricity",
    "कुल स्ट्रीट लाइटों की संख्या (सौर ऊर्जा से चलने वाली स्ट्रीट लाइटें भी शामिल)": "total_street_lights",
    "कुल खेल के मैदानों की संख्या (निजी मैदान/ विद्यालय के मैदान को छोड़ कर)": "playgrounds_count",
    "पंचायत भवन/सामुदायिक सभागार की उपलब्धता (संख्या)": "panchayat_bhawan_availability",
    "पोस्ट ऑफिस (संख्या)": "post_offices_count",
    "प्रतिदिन घरेलू विद्युत की औसत उपलब्धता(घंटे/दिन)": "avg_electricity_hours_daily",
    "बस स्टैंड (जहा बसें आती है) की ग्राम पंचायत मुख्यालय से दूरी(कि.मी.)": "dist_bus_stand_km",
    "मुख्य बाजार/हाट की ग्राम पंचायत मुख्यालय से दूरी(कि.मी.)": "dist_main_market_km",
    "यदि कोई बैंक नहीं है तो निकटतम उपलब्ध बैंक की ग्रामपंचायत मुख्यालय से दूरी(कि.मी.)": "dist_nearest_bank_km",
    "रेलवे स्टेशन से ग्राम पंचायत मुख्यालय की दूरी(कि.मी.)": "dist_railway_station_km",
    "रैंप/सुलभ शौचालयों वाले सार्वजनिक भवनों की संख्या": "public_buildings_with_ramps",
    "वर्षा जल संचयन installed कुल सार्वजनिक भवन/कार्यालय (संख्या)": "rainwater_harvesting_buildings",
    "सड़क की लंबाई(कि.मी.)": "road_length_km",
    "सॉर ऊर्जा installed घर (संख्या)": "solar_installed_houses",
    "सौर ऊर्जा installed कुल सार्वजनिक भवन/कार्यालय (संख्या)": "solar_installed_public_buildings",
    "सौर ऊर्जा से चलने वाली स्ट्रीट लाइटों की संख्या": "solar_street_lights",
}

ECONOMY_MAPPING = {
    "जिला": "district",
    "ब्लॉक": "block",
    "ग्राम पंचायत": "gram_panchayat",
    "कुल कार्यरत स्वयं सहायता समूह (संख्या)": "active_shg_count",
    "कार्यरत स्वयं सहायता समूह मे जुड़ी हुई कुल महिलायें (संख्या)": "women_in_shgs",
    "कुल कार्यरत व्यक्ति (संख्या)": "total_working_persons",
    "कुल कार्यरत स्वयं सहायता समूह (SHG) जिनका बैंक अकाउंट खुल गया है (संख्या)": "shgs_with_bank_accounts",
    "कुल कार्यरत स्वयं सहायता समूहों को फंड (निधि) से प्राप्त हुई कुल राशि का विवरण राशि (लाखों मे)": "shg_funds_received_lakhs",
    "कुल कार्यरत स्वयं सहायता समूहों जिनको First Tranche प्राप्त हुई (संख्या)": "shgs_received_first_tranche",
    "कुल लाभार्थी जिन्हे मुद्रा लोन स्वीकृत (संख्या)": "mudra_loan_beneficiaries",
    "कुल स्वयं सहायता समूह जिनका बैंक लिन्केज हो चुका हैं (संख्या)": "shgs_with_bank_linkage",
    "क्षेत्र में संचालित कुल वृहद औद्योगिक इकाई (संख्या)": "large_industrial_units",
    "क्षेत्र में संचालित वृहद औद्योगिक इकाओं में रोजगार प्राप्त व्यक्तियों की संख्या": "employment_in_large_industries",
    "प्रमुख विभिन्न आजीविका कार्यों का प्रकार (हस्तकला, शिल्पकला आदि )": "livelihood_activity_types",
    "मिलेनियर (दस लाख) दीदी की संख्या": "millionaire_didis_count",
    "लखपति दीदी की संख्या": "lakhpati_didis_count",
    "लघु उद्योगों की संख्या (मधुमक्खी पालन, रेशम कीट पालन आदि)": "small_scale_industries_count",
    "लघु उद्योगों में कुल कार्यरत व्यक्ति (संख्या)": "employment_in_small_industries",
    "स्थानीय कारीगरों की संख्या": "local_artisans_count",
}

SOCIAL_MAPPING = {
    "जिला": "district",
    "ब्लॉक": "block",
    "ग्राम पंचायत": "gram_panchayat",
    "पीएम उज्ज्वला योजना के लाभार्थी (संख्या)": "pm_ujjwala_beneficiaries",
    "पीएम/सीएम आवास योजना के कुल लाभार्थी (संख्या)": "pm_cm_awas_beneficiaries",
    "वृद्धावस्था पेंशन लाभार्थी (संख्या)": "old_age_pensioners",
    "विधवा पेंशन लाभार्थी (संख्या)": "widow_pensioners",
    "विशेष योग्यजन पेंशन लाभार्थी (अनुमानित संख्या)": "pwd_pensioners_est",
}

WATER_MAPPING = {
    "जिला": "district",
    "ब्लॉक": "block",
    "ग्राम पंचायत": "gram_panchayat",
    "केवल हैंडपंप/ट्यूबवेल के जल से जुड़े घरों की संख्या": "handpump_tubewell_only_houses",
    "पानी: प्रतिदिन उपलब्ध पानी(लीटर)": "daily_water_available_litres",
    "घरेलू जल की कुल डिमांड(लीटर प्रतिदिन)": "daily_water_demand_litres",
    "घरेलू जल की कुल उपलब्धता(लीटर प्रतिदिन)": "daily_water_availability_litres",
    "घरों में नल का चालू कनेक्शन (FHTC) (प्रतिशत में)": "tap_connection_pct",
    "जल गुणवत्ता परीक्षण की वार्षिक आवृति": "water_quality_test_frequency",
    "कुल ओवरहेड टैंक (संख्या)": "overhead_tanks_count",
    "टैंकर द्वारा कुल सप्लाइ(लीटर प्रतिदिन)": "tanker_supply_daily_litres",
    "ओवरहेड टैंक द्वारा कुल सप्लाइ(लीटर प्रतिदिन )": "overhead_tank_supply_litres",
    "केवल टैंकर द्वारा सप्लाइ वाले घरों की संख्या": "tanker_only_supply_houses",
    "भूजल दोहन की स्थिति (भूजल टेबल के अनुसार)(मीटर में)": "groundwater_depth_meters",
    "कृषि जल की मुख्य सप्लाइ ( नहर, फार्म पॉन्ड्स, ट्यूब वेल etc की संख्या)": "agri_water_sources_count",
}

ENVIRONMENT_MAPPING = {
    "जिला": "district",
    "ब्लॉक": "block",
    "ग्राम पंचायत": "gram_panchayat",
    "Composit pits (सरकारी) क्षमता(कि.ग्रा.)": "govt_compost_pits_capacity_kg",
    "Composit pits (प्राइवेट) क्षमता(कि.ग्रा.)": "pvt_compost_pits_capacity_kg",
    "Composit pits की संख्या (सरकारी)": "govt_compost_pits_count",
    "Composit pits की संख्या (प्राइवेट- थोक अपशिष्ट उत्पादक )": "pvt_compost_pits_count",
    "Material Recovery Facility (MRF)/ (RRC) शेड की संख्या": "mrf_sheds_count",
    "अन्य वेस्ट प्रोसेसिंग units (संख्या)": "waste_processing_units",
    "कुल अपशिष्ठ(कि.ग्रा. प्रतिदिन)": "total_waste_daily_kg",
    "गीला अपशिष्ठ(कि.ग्रा. प्रतिदिन)": "wet_waste_daily_kg",
    "घर-घर जाकर कचरा संग्रहण की सुविधा से जुड़े हुए घरों/ इमारत की संख्या (अनुमानित)": "door_to_door_collection_houses",
    "आरक्षित/संरक्षित वन/ protected area का क्षेत्रफल(हेक्टेयर)": "forest_area_hectare",
    "ग्राम पंचायत में चरागाह भूमि(हेक्टेयर)": "pasture_land_hectare",
    "घरेलू अपशिष्ट जल उत्पादन (अनुमानित)(लीटर प्रतिदिन)": "domestic_wastewater_daily_litres",
    "नर्सरी मे उपलब्ध पौधे (संख्या)": "nursery_saplings_available",
    "पीएम सूर्यघर योजना के अंतर्गत छतों पर सौर पैनल स्थापित घरों की संख्या": "pm_surya_ghar_solar_houses",
    "बायोगैस तथा Compressed Biogas Plants (संख्या)": "biogas_plants_count",
    "बायोगैस तथा Compressed Biogas Plants क्षमता(कि.ग्रा.)": "biogas_capacity_kg",
    "विकेंद्रकृत सामुदायिक अपशिष्ट जल प्रबंधन वाले घरों की संख्या (पक्की नालियों से जुड़े घर)": "community_wastewater_mgmt_houses",
    "वृक्षारोपण के लिए उपयुक्त रिक्त भूमि (सड़कमार्गों के किनारों के अलावा )(हेक्टेयर)": "vacant_land_for_plantation_hectare",
    "वेस्ट डम्प साइट्स (संख्या)": "waste_dump_sites",
    "शोचालय सहित कुल घरों की संख्या": "houses_with_toilets",
    "सरकारी नर्सरी की उपलब्धता (संख्या)": "govt_nurseries_count",
    "सार्वजनिक भवन में वृक्षारोपण की संभावना वाली भूमि(हेक्टेयर)": "public_building_plantation_area",
    "सूखा अपशिष्ठ(कि.ग्रा. प्रतिदिन)": "dry_waste_daily_kg",
}

TOURISM_MAPPING = {
    "जिला": "district",
    "ब्लॉक": "block",
    "ग्राम पंचायत": "gram_panchayat",
    "धार्मिक और सांस्कृतिक संपत्तियां में औसत फुट्फॉल (प्रति दिवस)": "avg_daily_footfall_cultural_sites",
    "खाद्य/हस्तशिल्प/खेल सामग्री/स्थानीय उत्पाद के स्टॉल की संख्या (अनुमानित)": "local_product_stalls",
    "SHG द्वारा संचालित स्टॉल/सेवाओं की संख्या (अनुमानित)": "shg_operated_stalls",
    "प्रतिवर्ष आयोजित मुख्य धार्मिक‑सांस्कृतिक इत्यादि मेलों की संख्या": "annual_fairs_count",
    "प्रमुख मेले/त्योहार के नाम": "main_fair_names",
    "प्रमुख धार्मिक और सांस्कृतिक संपत्तियों (मूर्त) की संख्या": "cultural_assets_count",
    "प्रमुख मेलों में औसत फुटफॉल(प्रति दिवस)": "avg_fair_footfall_daily",
    "प्रमुख वार्षिक मेलों में भाग लेने वाले प्रत्येक स्टॉल द्वारा अर्जित औसत दैनिक राजस्व राशि (रुपयों में)": "avg_stall_revenue_fairs",
    "प्रशिक्षित गाइड का पंजीकरण (अनुमानित संख्या)": "registered_trained_guides",
    "मेले में अस्थायी दुकानें/स्टॉल लगाने वालों की संख्या (अनुमानित)": "temporary_fair_stalls",
    "मेले से जुड़े रोजगार पाने वाले व्यक्तियों की संख्या (अनुमानित)": "fair_related_employment",
}

GOVERNANCE_MAPPING = {
    "जिला": "district",
    "ब्लॉक": "block",
    "ग्राम पंचायत": "gram_panchayat",
    "दमकल स्टेशन की की ग्राम पंचायत मुख्यालय से दूरी(कि.मी.)": "dist_fire_station_km",
    "निकटतम ई-मित्र की ग्राम पंचायत मुख्यालय से दूरी(कि.मी.)": "dist_emitra_km",
    "निकटतम एलपीजी वितरक की ग्राम पंचायत मुख्यालय से दूरी(कि.मी.)": "dist_lpg_distributor_km",
    "निकटतम पुलिस स्टेशन की ग्राम पंचायत मुख्यालय से दूरी(कि.मी.)": "dist_police_station_km",
}

FILE_CONFIGS = [
    {"file_name": ADMIN_FILE, "mapping": ADMIN_MAPPING, "table_name": "fact_rural_admin", "text_columns": []},
    {"file_name": EDUCATION_FILE, "mapping": EDUCATION_MAPPING, "table_name": "fact_rural_education", "text_columns": []},
    {"file_name": LIVELIHOOD_FILE, "mapping": LIVELIHOOD_MAPPING, "table_name": "fact_rural_livelihood", "text_columns": ["food_processing_unit_type", "mandi_location"]},
    {"file_name": HEALTH_FILE, "mapping": HEALTH_MAPPING, "table_name": "fact_rural_health", "text_columns": []},
    {"file_name": INFRA_FILE, "mapping": INFRA_MAPPING, "table_name": "fact_rural_infra", "text_columns": []},
    {"file_name": ECONOMY_FILE, "mapping": ECONOMY_MAPPING, "table_name": "fact_rural_economy", "text_columns": ["livelihood_activity_types"]},
    {"file_name": SOCIAL_FILE, "mapping": SOCIAL_MAPPING, "table_name": "fact_rural_social", "text_columns": []},
    {"file_name": WATER_FILE, "mapping": WATER_MAPPING, "table_name": "fact_rural_water", "text_columns": []},
    {"file_name": ENVIRONMENT_FILE, "mapping": ENVIRONMENT_MAPPING, "table_name": "fact_rural_environment", "text_columns": []},
    {"file_name": TOURISM_FILE, "mapping": TOURISM_MAPPING, "table_name": "fact_rural_tourism", "text_columns": ["main_fair_names"]},
    {"file_name": GOVERNANCE_FILE, "mapping": GOVERNANCE_MAPPING, "table_name": "fact_rural_governance", "text_columns": []},
]

EXPECTED_MAPPING_COUNTS = {
    "ADMIN_MAPPING": 22,
    "EDUCATION_MAPPING": 38,
    "LIVELIHOOD_MAPPING": 66,
    "HEALTH_MAPPING": 19,
    "INFRA_MAPPING": 23,
    "ECONOMY_MAPPING": 19,
    "SOCIAL_MAPPING": 8,
    "WATER_MAPPING": 15,
    "ENVIRONMENT_MAPPING": 26,
    "TOURISM_MAPPING": 14,
    "GOVERNANCE_MAPPING": 7,
}


def _normalize_key(value):
    if pd.isna(value):
        return None
    text_value = str(value).strip()
    return text_value if text_value else None


def _clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = [str(col).strip() for col in df.columns]
    df = df.loc[:, ~df.columns.astype(str).str.startswith("Unnamed")]
    df = df.replace(r"^\s*$", None, regex=True)
    df = df.replace({"NaN": None, "nan": None, "NAN": None})
    df = df.where(pd.notna(df), None)
    return df


def _load_excel(path: Path) -> pd.DataFrame:
    # Real headers start on row index 2
    raw_df = pd.read_excel(path, header=2)
    return _clean_dataframe(raw_df)


def _get_fact_table_column_types(conn, table_name: str) -> dict[str, str]:
    rows = conn.execute(
        text(
            """
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = :table_name
            """
        ),
        {"table_name": table_name},
    ).fetchall()
    return {row[0]: row[1] for row in rows}


def _prepare_fact_rows(
    df: pd.DataFrame,
    mapping: dict[str, str],
    numeric_columns: list[str],
    active_fact_columns: list[str],
) -> list[dict]:
    mapped_df = df.rename(columns=mapping)

    # Multiple source headers can map to one SQL field; keep first non-null.
    mapped_df = mapped_df.T.groupby(level=0).first().T

    required_keys = set(KEY_COLUMNS)
    if not required_keys.issubset(mapped_df.columns):
        missing = required_keys - set(mapped_df.columns)
        raise ValueError(f"Missing required location columns after mapping: {sorted(missing)}")

    keep_columns = [
        col
        for col in mapping.values()
        if col in mapped_df.columns and (col in KEY_COLUMNS or col in set(active_fact_columns))
    ]
    keep_columns = list(dict.fromkeys(keep_columns))
    prepared = mapped_df[keep_columns].copy()

    for col in KEY_COLUMNS:
        prepared[col] = prepared[col].apply(_normalize_key)

    for col in numeric_columns:
        if col in prepared.columns:
            prepared[col] = pd.to_numeric(prepared[col], errors="coerce")

    prepared = prepared.where(pd.notna(prepared), None)
    prepared = prepared.dropna(subset=KEY_COLUMNS)
    prepared = prepared.drop_duplicates(subset=KEY_COLUMNS, keep="last")
    return prepared.to_dict(orient="records")


def _get_or_create_gp_id(conn, district: str, block: str, gram_panchayat: str) -> int:
    find_sql = text(
        """
        SELECT gp_id
        FROM dim_rural_gps
        WHERE district = :district
          AND block = :block
          AND gram_panchayat = :gram_panchayat
        """
    )
    found = conn.execute(
        find_sql,
        {"district": district, "block": block, "gram_panchayat": gram_panchayat},
    ).scalar_one_or_none()
    if found is not None:
        return int(found)

    insert_sql = text(
        """
        INSERT INTO dim_rural_gps (district, block, gram_panchayat)
        VALUES (:district, :block, :gram_panchayat)
        RETURNING gp_id
        """
    )
    created = conn.execute(
        insert_sql,
        {"district": district, "block": block, "gram_panchayat": gram_panchayat},
    ).scalar_one()
    return int(created)


def _upsert_fact_row(conn, table_name: str, row: dict, allowed_fact_columns: list[str]) -> None:
    data = {k: row.get(k) for k in allowed_fact_columns if k in row}
    insert_columns = ["gp_id", *data.keys()]
    params = {"gp_id": row["gp_id"], **data}

    placeholders = ", ".join(f":{col}" for col in insert_columns)
    if data:
        set_clause = ", ".join(f"{col} = EXCLUDED.{col}" for col in data.keys())
        set_clause += ", updated_at = CURRENT_TIMESTAMP"
    else:
        set_clause = "updated_at = CURRENT_TIMESTAMP"

    upsert_sql = text(
        f"""
        INSERT INTO {table_name} ({", ".join(insert_columns)})
        VALUES ({placeholders})
        ON CONFLICT (gp_id)
        DO UPDATE SET {set_clause}
        """
    )
    conn.execute(upsert_sql, params)


def _run_theme(engine, file_name: str, mapping: dict[str, str], table_name: str, text_columns: list[str]) -> int:
    file_path = SOURCE_DIR / file_name
    if not file_path.exists():
        raise FileNotFoundError(f"Source file not found: {file_path}")

    df = _load_excel(file_path)

    with engine.connect() as conn:
        table_cols = _get_fact_table_column_types(conn, table_name)

    active_fact_columns = [
        col for col in mapping.values() if col in table_cols and col not in KEY_COLUMNS
    ]
    numeric_columns = [
        col
        for col in active_fact_columns
        if col not in set(text_columns)
        and table_cols.get(col, "").lower()
        in {
            "smallint",
            "integer",
            "bigint",
            "decimal",
            "numeric",
            "real",
            "double precision",
        }
    ]

    missing_in_db = [
        col for col in mapping.values() if col not in KEY_COLUMNS and col not in table_cols
    ]
    if missing_in_db:
        print(f"{table_name}: skipping {len(missing_in_db)} mapped columns not present in DB yet")

    records = _prepare_fact_rows(df, mapping, numeric_columns, active_fact_columns)
    if not records:
        print(f"No valid rows found in {file_name}.")
        return 0

    upserted = 0
    with engine.begin() as conn:
        for record in records:
            gp_id = _get_or_create_gp_id(
                conn,
                district=record["district"],
                block=record["block"],
                gram_panchayat=record["gram_panchayat"],
            )
            fact_row = {**record, "gp_id": gp_id}
            _upsert_fact_row(conn, table_name, fact_row, active_fact_columns)
            upserted += 1

    print(f"{table_name}: upserted {upserted} rows from {file_name}")
    return upserted


def _validate_mapping_counts() -> None:
    actual_counts = {
        "ADMIN_MAPPING": len(ADMIN_MAPPING),
        "EDUCATION_MAPPING": len(EDUCATION_MAPPING),
        "LIVELIHOOD_MAPPING": len(LIVELIHOOD_MAPPING),
        "HEALTH_MAPPING": len(HEALTH_MAPPING),
        "INFRA_MAPPING": len(INFRA_MAPPING),
        "ECONOMY_MAPPING": len(ECONOMY_MAPPING),
        "SOCIAL_MAPPING": len(SOCIAL_MAPPING),
        "WATER_MAPPING": len(WATER_MAPPING),
        "ENVIRONMENT_MAPPING": len(ENVIRONMENT_MAPPING),
        "TOURISM_MAPPING": len(TOURISM_MAPPING),
        "GOVERNANCE_MAPPING": len(GOVERNANCE_MAPPING),
    }
    for mapping_name, expected in EXPECTED_MAPPING_COUNTS.items():
        actual = actual_counts[mapping_name]
        if actual != expected:
            raise ValueError(f"{mapping_name} must contain {expected} headers, found {actual}")


def run_pipeline() -> None:
    db_url = os.getenv("SUPABASE_DB_URL")
    if not db_url:
        raise ValueError("SUPABASE_DB_URL is not set in .env")

    _validate_mapping_counts()

    engine = create_engine(db_url)
    total = 0
    for config in FILE_CONFIGS:
        total += _run_theme(
            engine=engine,
            file_name=config["file_name"],
            mapping=config["mapping"],
            table_name=config["table_name"],
            text_columns=config["text_columns"],
        )

    print(f"Pipeline complete. Total thematic rows processed: {total}")


if __name__ == "__main__":
    run_pipeline()
