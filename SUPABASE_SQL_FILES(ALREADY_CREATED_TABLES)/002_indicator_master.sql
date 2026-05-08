-- ============================================================
-- RITI Platform — Indicator Master Table
-- All canonical keys mapped from both Excel files
-- GP Rural: 289 rows across 11 categories
-- Urban Ward: ~164 rows across 10 categories
-- ============================================================

create table indicator_master (
  canonical_key       text primary key,
  category            text not null,        -- category slug
  category_hindi      text,                 -- Hindi category name
  description_en      text,                 -- English description
  unit                text,
  in_rural            boolean default false,
  in_urban            boolean default false,
  rural_indicator     text,                 -- सूचक from rural Excel
  rural_sub_indicator text,                 -- उप-सूचक from rural Excel
  urban_indicator     text,                 -- सूचक from urban Excel
  urban_sub_indicator text,                 -- उप-सूचक from urban Excel
  state_norm          numeric,              -- target value for scoring gap
  norm_source         text,
  is_text_field       boolean default false,-- true = name/type/profile, not numeric
  is_yes_no           boolean default false,-- true = हाँ/नहीं field
  created_at          timestamptz default now()
);

-- ============================================================
-- CATEGORY DEFINITIONS (for reference)
-- ============================================================
-- rural_categories (11):
--   officer_info            अधिकारियों/कार्यकर्ताओं की जानकारी
--   admin_demographic       प्रशासनिक एवं जनसांख्यिकीय विवरण
--   agriculture             कृषि एवं आजीविका
--   health                  स्वास्थ्य एवं कल्याण
--   education               शिक्षा संबंधी जानकारी
--   social_empowerment      सामाजिक सशक्तिकरण और समावेशन
--   industrial_economic     औद्योगिक, खनन और आर्थिक विकास
--   infrastructure          मुख्य (इंफ्रास्ट्रक्चर) आवागमन संबंधित
--   water_security          जल सुरक्षा और समुदाय आधारित क्षमता
--   environment             पर्यावरणीय स्थिरता और जलवायु अनुकूलता
--   tourism_culture         पर्यटन एवं सांस्कृतिक विकास
--   governance              प्रभावी शासन और सार्वजनिक सेवाएं
--
-- urban_categories (10): same except no agriculture category
-- ============================================================

insert into indicator_master (
  canonical_key, category, category_hindi, description_en, unit,
  in_rural, in_urban,
  rural_indicator, rural_sub_indicator,
  urban_indicator, urban_sub_indicator,
  state_norm, is_text_field, is_yes_no
) values

-- ============================================================
-- OFFICER INFO
-- ============================================================
('officer_name', 'officer_info', 'अधिकारियों/कार्यकर्ताओं की जानकारी',
 'Name of Sarpanch/Administrator', null, true, true,
 'सामान्य जानकारी', 'सरपंच / प्रशासक का नाम',
 'सामान्य जानकारी', 'शहरी वार्ड प्रशासक का नाम', null, true, false),

('officer_contact', 'officer_info', 'अधिकारियों/कार्यकर्ताओं की जानकारी',
 'Contact number of Sarpanch/Administrator', null, true, true,
 'सामान्य जानकारी', 'सरपंच / प्रशासक का संपर्क नंबर',
 'सामान्य जानकारी', 'वार्ड प्रशासक संपर्क नंबर', null, true, false),

('revenue_villages_count', 'officer_info', 'अधिकारियों/कार्यकर्ताओं की जानकारी',
 'Number of revenue villages in GP', 'संख्या', true, false,
 'सामान्य जानकारी', 'राजस्व ग्रामों की संख्या (ग्राम पंचायत के लिए)',
 null, null, null, false, false),

('total_geographic_area', 'officer_info', 'अधिकारियों/कार्यकर्ताओं की जानकारी',
 'Total geographic area in hectares', 'हैक्टेयर', true, true,
 'सामान्य जानकारी', 'कुल भौगोलिक क्षेत्र',
 'सामान्य जानकारी', 'कुल भौगोलिक क्षेत्र', null, false, false),

('gp_profile_text', 'officer_info', 'अधिकारियों/कार्यकर्ताओं की जानकारी',
 'GP/Ward profile description 300-400 words', null, true, true,
 'सामान्य जानकारी', 'ग्राम पंचायत प्रोफाइल (भौगोलिक स्थिति, प्रमुख विशेषताएं, सांस्कृतिक विरासत, प्रमुख आजीविका एवं अन्य विशिष्ट पहचान का संक्षिप्त विवरण 300–400 शब्दों में दर्ज करें।)',
 'सामान्य जानकारी', 'शहरी वार्ड प्रोफाइल (भौगोलिक स्थिति, सांस्कृतिक विरासत एवं अन्य विशिष्ट पहचान का संक्षिप्त विवरण 300–400 शब्दों में दर्ज करें।)',
 null, true, false),

-- ============================================================
-- ADMIN & DEMOGRAPHIC
-- ============================================================
('total_population_census_2011', 'admin_demographic', 'प्रशासनिक एवं जनसांख्यिकीय विवरण',
 'Total population Census 2011', 'संख्या', true, true,
 'कुल जनसंख्या', 'कुल जनसंख्या (Census 2011)',
 'कुल जनसंख्या', 'कुल जनसंख्या (Census- 2011)', null, false, false),

('total_population_2026', 'admin_demographic', 'प्रशासनिक एवं जनसांख्यिकीय विवरण',
 'Total estimated population 2026', 'संख्या', true, true,
 'कुल जनसंख्या', 'कुल जनसंख्या (अनुमानित- 2026)',
 'कुल जनसंख्या', 'कुल जनसंख्या (अनुमानित- 2026)', null, false, false),

('population_male_2026', 'admin_demographic', 'प्रशासनिक एवं जनसांख्यिकीय विवरण',
 'Male population 2026', 'संख्या', true, true,
 'कुल जनसंख्या', 'पुरुष जनसंख्या (अनुमानित- 2026)',
 'कुल जनसंख्या', 'पुरुष जनसंख्या (2026)', null, false, false),

('population_female_2026', 'admin_demographic', 'प्रशासनिक एवं जनसांख्यिकीय विवरण',
 'Female population 2026', 'संख्या', true, true,
 'कुल जनसंख्या', 'महिला जनसंख्या (अनुमानित- 2026)',
 'कुल जनसंख्या', 'महिला जनसंख्या (2026)', null, false, false),

('population_transgender_2026', 'admin_demographic', 'प्रशासनिक एवं जनसांख्यिकीय विवरण',
 'Transgender population 2026', 'संख्या', true, false,
 'कुल जनसंख्या', 'ट्रांसजेंडर (अनुमानित- 2026)',
 null, null, null, false, false),

('children_0_6_2026', 'admin_demographic', 'प्रशासनिक एवं जनसांख्यिकीय विवरण',
 'Children age 0-6 years 2026', 'संख्या', true, true,
 'कुल जनसंख्या', 'बच्चे (0-6 वर्ष) (अनुमानित- 2026)',
 'कुल जनसंख्या', 'बच्चे (0-6 वर्ष) (2026)', null, false, false),

('children_6_14_2026', 'admin_demographic', 'प्रशासनिक एवं जनसांख्यिकीय विवरण',
 'Children age 6-14 years 2026', 'संख्या', true, true,
 'कुल जनसंख्या', 'बच्चे (6-14 वर्ष) (अनुमानित- 2026)',
 'कुल जनसंख्या', 'बच्चे (6-14 वर्ष) (2026)', null, false, false),

('youth_14_18_2026', 'admin_demographic', 'प्रशासनिक एवं जनसांख्यिकीय विवरण',
 'Youth 14-18 years 2026', 'संख्या', true, true,
 'कुल जनसंख्या', 'जनसँख्या (14-18 वर्ष) (अनुमानित- 2026)',
 'कुल जनसंख्या', 'जनसँख्या (14-18 वर्ष) (2026)', null, false, false),

('senior_citizens_60plus_2026', 'admin_demographic', 'प्रशासनिक एवं जनसांख्यिकीय विवरण',
 'Senior citizens 60+ years 2026', 'संख्या', true, true,
 'कुल जनसंख्या', 'वरिष्ठ नागरिक (60+) (अनुमानित- 2026)',
 'कुल जनसंख्या', 'वरिष्ठ नागरिक (60+) (2026)', null, false, false),

('pwd_count_2026', 'admin_demographic', 'प्रशासनिक एवं जनसांख्यिकीय विवरण',
 'Persons with disability 2026', 'संख्या', true, true,
 'कुल जनसंख्या', 'विशेष योग्यजन (PwD) की संख्या (अनुमानित- 2026)',
 'कुल जनसंख्या', 'विशेष योग्यजन (PwD) की संख्या (2026)', null, false, false),

('defence_personnel_2026', 'admin_demographic', 'प्रशासनिक एवं जनसांख्यिकीय विवरण',
 'Defence forces personnel 2026', 'संख्या', true, true,
 'व्यवसाय', 'डिफेंस फोर्सेज (जल,थल,वायु सेना) में कार्यरत कार्मिक की संख्या',
 'कुल जनसंख्या', 'डिफेंस फोर्सेज (जल,थल,वायु सेना) में कार्यरत कार्मिक की संख्या (2026)',
 null, false, false),

('total_households_2026', 'admin_demographic', 'प्रशासनिक एवं जनसांख्यिकीय विवरण',
 'Total households 2026', 'संख्या', true, false,
 'घरेलू विवरण', 'परिवारों की कुल संख्या  (2026)',
 null, null, null, false, false),

('bpl_households_2026', 'admin_demographic', 'प्रशासनिक एवं जनसांख्यिकीय विवरण',
 'BPL households 2026', 'संख्या', true, false,
 'घरेलू विवरण', 'BPL परिवारों की संख्या  (2026)',
 null, null, null, false, false),

('nfsa_households_2026', 'admin_demographic', 'प्रशासनिक एवं जनसांख्यिकीय विवरण',
 'NFSA beneficiary households 2026', 'संख्या', true, false,
 'घरेलू विवरण', 'NFSA से लाभान्वित परिवारों की संख्या  (2026)',
 null, null, null, false, false),

('nomadic_population_2026', 'admin_demographic', 'प्रशासनिक एवं जनसांख्यिकीय विवरण',
 'Nomadic category population 2026', 'संख्या', true, false,
 'घरेलू विवरण', 'घुमंतू श्रेणी के कुल लोगो की संख्या (अनुमानित- 2026)',
 null, null, null, false, false),

('pucca_houses', 'admin_demographic', 'प्रशासनिक एवं जनसांख्यिकीय विवरण',
 'Pucca houses count', 'संख्या', true, true,
 'घरेलू विवरण', 'पक्के घरों की संख्या',
 'घरेलू विवरण', 'पक्के घरों की संख्या (2026)', null, false, false),

('kutcha_houses', 'admin_demographic', 'प्रशासनिक एवं जनसांख्यिकीय विवरण',
 'Kutcha houses count', 'संख्या', true, true,
 'घरेलू विवरण', 'कच्चे घरों की संख्या',
 'घरेलू विवरण', 'कच्चे घरों की संख्या (2026)', null, false, false),

-- ============================================================
-- AGRICULTURE & LIVELIHOOD (rural only — 11th category)
-- ============================================================
('total_cultivable_land', 'agriculture', 'कृषि एवं आजीविका',
 'Total cultivable land', 'हैक्टेयर', true, false,
 'कृषि भूमि', 'कुल कृषि योग्य भूमि', null, null, null, false, false),

('net_sown_area', 'agriculture', 'कृषि एवं आजीविका',
 'Net sown area all seasons', 'हैक्टेयर', true, false,
 'कृषि भूमि', 'शुद्ध बुवाई हेतु भूमि  (सभी मौसमों के लिए) (Net Sown Area)',
 null, null, null, false, false),

('gross_sown_area', 'agriculture', 'कृषि एवं आजीविका',
 'Gross sown area all seasons', 'हैक्टेयर', true, false,
 'कृषि भूमि', 'कुल बुवाई हेतु भूमि  (सभी मौसमों के लिए) (Gross Sown Area)',
 null, null, null, false, false),

('total_irrigated_area', 'agriculture', 'कृषि एवं आजीविका',
 'Total irrigated area', 'हैक्टेयर', true, false,
 'कृषि भूमि', 'कुल सिंचित क्षेत्र', null, null, 0.60, false, false),

('total_farmers', 'agriculture', 'कृषि एवं आजीविका',
 'Total farmers count', 'संख्या', true, false,
 'किसान व कृषि संबंधी जानकारी', 'कुल किसानो की संख्या', null, null, null, false, false),

('small_farmers', 'agriculture', 'कृषि एवं आजीविका',
 'Small farmers (land up to 2 hectares)', 'संख्या', true, false,
 'किसान व कृषि संबंधी जानकारी', 'लघु किसानो की संख्या (भूमि 2 हैक्टेयर तक )',
 null, null, null, false, false),

('medium_farmers', 'agriculture', 'कृषि एवं आजीविका',
 'Medium farmers (2-10 hectares)', 'संख्या', true, false,
 'किसान व कृषि संबंधी जानकारी', 'मध्यम किसानो की संख्या (भूमि 2-10 हैक्टेयर तक )',
 null, null, null, false, false),

('large_farmers', 'agriculture', 'कृषि एवं आजीविका',
 'Large farmers (above 10 hectares)', 'संख्या', true, false,
 'किसान व कृषि संबंधी जानकारी', 'दीर्घ किसानो की संख्या (भूमि 10 हैक्टेयर से अधिक )',
 null, null, null, false, false),

('drip_sprinkler_farmers', 'agriculture', 'कृषि एवं आजीविका',
 'Farmers using drip/sprinkler irrigation', 'संख्या', true, false,
 'लघु सिंचाई', 'ड्रिप/स्प्रिंकलर का उपयोग करने वाले किसानों की संख्या',
 null, null, null, false, false),

('drip_irrigated_area', 'agriculture', 'कृषि एवं आजीविका',
 'Area irrigated by drip/sprinkler', 'हैक्टेयर', true, false,
 'लघु सिंचाई', 'ड्रिप/स्प्रिंकलर का द्वार सिंचित कुल क्षेत्रफल',
 null, null, null, false, false),

('agri_electricity_connections', 'agriculture', 'कृषि एवं आजीविका',
 'Total agricultural electricity connections', 'संख्या', true, false,
 'लघु सिंचाई', 'कुल कृषि विद्युत कनेक्शन', null, null, null, false, false),

('solar_pumps_count', 'agriculture', 'कृषि एवं आजीविका',
 'Total solar pumps', 'संख्या', true, false,
 'लघु सिंचाई', 'कुल सोलर पम्प', null, null, null, false, false),

('diesel_pumps_count', 'agriculture', 'कृषि एवं आजीविका',
 'Total diesel pumps', 'संख्या', true, false,
 'लघु सिंचाई', 'कुल डीज़ल पम्प', null, null, null, false, false),

('fertilizer_seed_center_available', 'agriculture', 'कृषि एवं आजीविका',
 'Fertilizer/seed center availability', 'हाँ/नहीं', true, false,
 'उर्वरक व बीज', 'ग्राम पंचायत में उर्वरक/बीज केंद्र की उपलब्धता',
 null, null, null, false, true),

('nearest_seed_center_km', 'agriculture', 'कृषि एवं आजीविका',
 'Distance to nearest seed center in km', 'कि.मी.', true, false,
 'उर्वरक व बीज', 'यदि उर्वरक/बीज केंद्र नहीं है तो निकटम बीज केंद्र की ग्राम पंचायत मुख्यालय से दूरी',
 null, null, null, false, false),

('agri_market_available', 'agriculture', 'कृषि एवं आजीविका',
 'Agriculture market (mandi) availability', 'हाँ/नहीं', true, false,
 'कृषि उपज मंडी/अन्य मंडी', 'ग्राम पंचायत में कृषि उपज मंडी/अन्य मंडी की उपलब्धता',
 null, null, null, false, true),

('nearest_mandi_km', 'agriculture', 'कृषि एवं आजीविका',
 'Distance to nearest mandi in km', 'कि.मी.', true, false,
 'कृषि उपज मंडी/अन्य मंडी', 'यदि कृषि उपज मंडी/अन्य मंडी उपलब्ध नहीं है तो निकटतम मंडी की ग्राम पंचायत मुख्यालय से दूरी',
 null, null, null, false, false),

('rabi_crop_name', 'agriculture', 'कृषि एवं आजीविका',
 'Rabi crop name', null, true, false,
 'रबी फसल', 'रबी फसल का नाम', null, null, null, true, false),

('rabi_crop_area', 'agriculture', 'कृषि एवं आजीविका',
 'Rabi crop area', 'हैक्टेयर', true, false,
 'रबी फसल', 'रबी फसल का क्षेत्रफल', null, null, null, false, false),

('rabi_crop_production', 'agriculture', 'कृषि एवं आजीविका',
 'Rabi crop total production', 'क्विंटल', true, false,
 'रबी फसल', 'रबी फसल का कुल उत्पादन', null, null, null, false, false),

('kharif_crop_name', 'agriculture', 'कृषि एवं आजीविका',
 'Kharif crop name', null, true, false,
 'खरीफ फसल', 'खरीफ फसल का नाम', null, null, null, true, false),

('kharif_crop_area', 'agriculture', 'कृषि एवं आजीविका',
 'Kharif crop area', 'हैक्टेयर', true, false,
 'खरीफ फसल', 'खरीफ फसल का क्षेत्रफल', null, null, null, false, false),

('kharif_crop_production', 'agriculture', 'कृषि एवं आजीविका',
 'Kharif crop total production', 'क्विंटल', true, false,
 'खरीफ फसल', 'खरीफ फसल का कुल उत्पादन', null, null, null, false, false),

('zaid_crop_name', 'agriculture', 'कृषि एवं आजीविका',
 'Zaid crop name', null, true, false,
 'जायद फसल', 'जायद फसल का नाम', null, null, null, true, false),

('zaid_crop_area', 'agriculture', 'कृषि एवं आजीविका',
 'Zaid crop area', 'हैक्टेयर', true, false,
 'जायद फसल', 'जायद फसल का क्षेत्रफल', null, null, null, false, false),

('zaid_crop_production', 'agriculture', 'कृषि एवं आजीविका',
 'Zaid crop total production', 'क्विंटल', true, false,
 'जायद फसल', 'जायद फसल का कुल उत्पादन', null, null, null, false, false),

('custom_hiring_center', 'agriculture', 'कृषि एवं आजीविका',
 'Custom hiring centre availability', 'हाँ/नहीं', true, false,
 'कस्टम हायरिंग सेंटर (कृषि उपकरण)', 'ग्राम पंचायत मे कस्टम हायरिंग सेंटर (कृषि उपकरण) की उपलब्धता',
 null, null, null, false, true),

('food_storage_available', 'agriculture', 'कृषि एवं आजीविका',
 'Food storage warehouse availability', 'हाँ/नहीं', true, false,
 'खाद्यान भंडारण', 'खाद्यान भंडारण गोदाम की उपलब्धता',
 null, null, null, false, true),

('food_storage_capacity', 'agriculture', 'कृषि एवं आजीविका',
 'Food storage capacity in quintals', 'क्विंटल', true, false,
 'खाद्यान भंडारण', 'खाद्यान भंडारण गोदाम की कुल क्षमता',
 null, null, null, false, false),

('food_processing_units', 'agriculture', 'कृषि एवं आजीविका',
 'Food processing units count', 'संख्या', true, false,
 'फ़ूड प्रोसेसिंग इकाई', 'उपलब्ध फ़ूड प्रोसेसिंग इकाई की संख्या',
 null, null, null, false, false),

('cooperative_farmers', 'agriculture', 'कृषि एवं आजीविका',
 'Farmers linked to cooperative society', 'संख्या', true, false,
 'कोपरेटिव', 'ग्राम सेवा कोपरेटिव सोसाइटी से जुड़े कुल किसानो की संख्या',
 null, null, null, false, false),

('kcc_holders', 'agriculture', 'कृषि एवं आजीविका',
 'Kisan Credit Card holders', 'संख्या', true, false,
 'किसान क्रेडिट', 'किसान क्रेडिट कार्ड (केसीसी) धारकों की संख्या',
 null, null, null, false, false),

('soil_health_cards_issued', 'agriculture', 'कृषि एवं आजीविका',
 'Valid soil health cards issued', 'संख्या', true, false,
 'मृदा स्वास्थ्य कार्ड', 'मृदा स्वास्थ्य कार्ड जारी किए गए (वैध)',
 null, null, null, false, false),

('fpo_count', 'agriculture', 'कृषि एवं आजीविका',
 'Farmer Producer Organisations count', 'संख्या', true, false,
 'किसान उत्पादक संगठन (एफपीओ)', 'कुल किसान उत्पादक संगठन (एफपीओ)',
 null, null, null, false, false),

('pm_kisan_beneficiaries', 'agriculture', 'कृषि एवं आजीविका',
 'PM-Kisan and CM-Kisan eligible beneficiaries', 'संख्या', true, false,
 'किसान योजना लाभार्थी', 'पीएम-किसान सम्मान निधि तथा सीएम-किसान सम्मान निधि योजना योजना के पात्र लाभार्थी',
 null, null, null, false, false),

('total_livestock', 'agriculture', 'कृषि एवं आजीविका',
 'Total livestock', 'संख्या', true, false,
 'पशुधन संबंधी जानकारी', 'कुल पशुधन', null, null, null, false, false),

('dairy_animals', 'agriculture', 'कृषि एवं आजीविका',
 'Total dairy animals', 'संख्या', true, false,
 'दुग्ध  उत्पादन एवं  संग्रहण', 'कुल दुधारु पशुओ की संख्या',
 null, null, null, false, false),

('milk_production_daily', 'agriculture', 'कृषि एवं आजीविका',
 'Total daily milk production', 'लीटर प्रतिदिन', true, false,
 'दुग्ध  उत्पादन एवं  संग्रहण', 'कुल दूध उत्पादन',
 null, null, null, false, false),

('govt_vet_centers', 'agriculture', 'कृषि एवं आजीविका',
 'Government veterinary centers', 'संख्या', true, false,
 'पशु चिकित्सा', 'सरकारी पशु चिकित्सा केंद्र/यूनिट्स',
 null, null, null, false, false),

('horticulture_area', 'agriculture', 'कृषि एवं आजीविका',
 'Horticulture farming area', 'हेक्टेयर', true, false,
 'हॉर्टिकल्चर', 'हॉर्ट्रिकल्चर कृषि का एरिया',
 null, null, null, false, false),

('organic_farming_area', 'agriculture', 'कृषि एवं आजीविका',
 'Organic farming area', 'हेक्टेयर', true, false,
 'आर्गेनिक', 'आर्गेनिक कृषि का एरिया',
 null, null, null, false, false),

('crop_insurance_area', 'agriculture', 'कृषि एवं आजीविका',
 'Crop insurance insured area', 'हेक्टेयर', true, false,
 'बीमा', 'फसल बीमा योजना में बीमित एरिया',
 null, null, null, false, false),

('crop_insurance_farmers', 'agriculture', 'कृषि एवं आजीविका',
 'Farmers covered under crop insurance', 'संख्या', true, false,
 'बीमा', 'फसल बीमा योजना में बीमित किसान',
 null, null, null, false, false),

-- ============================================================
-- HEALTH & WELFARE
-- ============================================================
('allopathic_health_centers', 'health', 'स्वास्थ्य एवं कल्याण',
 'Allopathic health centres count', 'संख्या', true, true,
 'चिकित्सा एवं स्वास्थ्य', 'एलोपैथिक स्वास्थ्य केन्द्र की संख्या',
 'चिकित्सा एवं स्वास्थ्य', 'एलोपैथिक स्वास्थ्य केन्द्र / हॉस्पिटल की संख्या', null, false, false),

('ayush_health_centers', 'health', 'स्वास्थ्य एवं कल्याण',
 'Ayush health centres count', 'संख्या', true, true,
 'चिकित्सा एवं स्वास्थ्य', 'आयुष स्वास्थ्य केंद्र की संख्या',
 'चिकित्सा एवं स्वास्थ्य', 'आयुष स्वास्थ्य केंद्र / हॉस्पिटल की संख्या', null, false, false),

('private_health_centers', 'health', 'स्वास्थ्य एवं कल्याण',
 'Private health centres count', 'संख्या', true, true,
 'चिकित्सा एवं स्वास्थ्य', 'निजी स्वास्थ्य केन्द्र की संख्या',
 'चिकित्सा एवं स्वास्थ्य', 'निजी स्वास्थ्य केन्द्र / हॉस्पिटल की संख्या', null, false, false),

('nearest_phc_km', 'health', 'स्वास्थ्य एवं कल्याण',
 'Distance to nearest PHC in km', 'कि.मी.', true, false,
 'PHC/CHC स्वास्थ्य केन्द्र', 'निकटतम PHC की ग्राम पंचायत मुख्यालय से दूरी',
 null, null, 3.0, false, false),

('nearest_chc_km', 'health', 'स्वास्थ्य एवं कल्याण',
 'Distance to nearest CHC in km', 'कि.मी.', true, false,
 'PHC/CHC स्वास्थ्य केन्द्र', 'निकटतम CHC की ग्राम पंचायत मुख्यालय से दूरी',
 null, null, null, false, false),

('sam_children', 'health', 'स्वास्थ्य एवं कल्याण',
 'Severely Acute Malnourished children', 'संख्या', true, true,
 'पोषण-कवरेज', 'गंभीर तीव्र कुपोषित (Severe Acute Malnutrition) बच्चे',
 'पोषण-कवरेज', 'गंभीर तीव्र कुपोषित (Severe Acute Malnutrition) बच्चे', null, false, false),

('snp_children_6_72months', 'health', 'स्वास्थ्य एवं कल्याण',
 'Children 6-72 months receiving SNP', 'संख्या', true, true,
 'पोषण-कवरेज', '6–72 माह बच्चों को नियमित SNP (Supplementary Nutrition Programme) प्राप्त',
 'पोषण-कवरेज', '6–72 माह बच्चों को नियमित SNP (Supplementary Nutrition Programme) प्राप्त',
 null, false, false),

('annapurna_canteen_operational', 'health', 'स्वास्थ्य एवं कल्याण',
 'Annapurna canteen operational', 'हाँ/नहीं', true, true,
 'अन्नपूर्णा रसोई', 'अन्नपूर्णा रसोई संचालित',
 'अन्नपूर्णा रसोई', 'अन्नपूर्णा रसोई संचालित', null, false, true),

('diabetes_screening_2025_26', 'health', 'स्वास्थ्य एवं कल्याण',
 'Diabetes screening count FY 2025-26', 'संख्या', true, true,
 'एनसीडी (NCD) स्क्रीनिंग', 'मधुमेह (डायबीटीज) हेतु स्क्रीनिंग किए गए व्यक्ति (FY 2025-26)',
 'एनसीडी(NCD) स्क्रीनिंग', 'मधुमेह (डायबीटीज) हेतु स्क्रीनिंग किए गए  व्यक्ति (FY 2025-26)',
 null, false, false),

('hypertension_screening_2025_26', 'health', 'स्वास्थ्य एवं कल्याण',
 'Hypertension screening count FY 2025-26', 'संख्या', true, true,
 'एनसीडी ((NCD) स्क्रीनिंग', 'उच्च रक्तचाप हेतु स्क्रीनिंग किए गए व्यक्ति (FY 2025-26)',
 'एनसीडी((NCD) स्क्रीनिंग', 'उच्च रक्तचाप हेतु स्क्रीनिंग किए गए  व्यक्ति (FY 2025-26)',
 null, false, false),

('endemic_disease_affected', 'health', 'स्वास्थ्य एवं कल्याण',
 'Affected by endemic disease like silicosis', 'हाँ/नहीं', true, true,
 'स्थानिक बीमारी', 'क्या ग्राम पंचायत किसी स्थानिक बीमारी से प्रभावित है? जैसे सिलिकोसिस',
 'स्थानिक बीमारी', 'क्यावार्ड किसी स्थानिक बीमारी से प्रभावित है? जैसे सिलिकोसिस',
 null, false, true),

('anemic_pregnant_women', 'health', 'स्वास्थ्य एवं कल्याण',
 'Anemic pregnant women count', 'संख्या', true, true,
 'एनीमिया', 'कुल एनीमिक गर्भवती महिलाओं की संख्या',
 'एनीमिया', 'कुल एनीमिक गर्भवती महिलाओं की संख्या', null, false, false),

('anemic_children', 'health', 'स्वास्थ्य एवं कल्याण',
 'Anemic children count (NIPI)', 'संख्या', true, true,
 'एनीमिया', 'कुल एनीमिक बच्चों की संख्या (National Iron Plus Initiative कार्यक्रम के तहत)',
 'एनीमिया', 'कुल एनीमिक बच्चों की संख्या (National Iron Plus Initiative कार्यक्रम के तहत)',
 null, false, false),

('ayushman_beneficiaries', 'health', 'स्वास्थ्य एवं कल्याण',
 'CM Ayushman Arogya scheme beneficiaries', 'संख्या', true, true,
 'मुख्य मंत्री आयुष्मान आरोग्य', 'मुख्यमंत्री आयुष्मान आरोग्य योजना के लाभार्थों की संख्या',
 'मुख्य मंत्री आयुष्मान आरोग्य', 'मुख्य मंत्री आयुष्मान आरोग्य योजना के लाभार्थियों की संख्या',
 null, false, false),

('tb_current_patients', 'health', 'स्वास्थ्य एवं कल्याण',
 'Current TB patients', 'संख्या', true, true,
 'टीबी', 'TB के कुल वर्तमान मरीज',
 'टीबी', 'TB के कुल मरीज', null, false, false),

('jan_aadhaar_registered_families', 'health', 'स्वास्थ्य एवं कल्याण',
 'Families registered in Jan Aadhaar', 'संख्या', true, true,
 'सामाजिक सुरक्षा', 'कुल जन आधार मे पंजीकृत परिवार',
 'सामाजिक सुरक्षा', 'कुल जन आधार मे पंजीकृत परिवार', null, false, false),

-- ============================================================
-- EDUCATION
-- ============================================================
('anganwadi_count', 'education', 'शिक्षा संबंधी जानकारी',
 'Anganwadi and mini-anganwadi centres count', 'संख्या', true, true,
 'आंगनवाड़ी केंद्र', 'आंगनवाड़ी / मिनी आंगनवाड़ी केंद्रों की संख्या',
 'आंगनवाड़ी केंद्र', 'कुल आंगनवाड़ी/ मिनी आंगनवाड़ी केंद्र की संख्या', null, false, false),

('govt_schools_count', 'education', 'शिक्षा संबंधी जानकारी',
 'Total government schools', 'संख्या', true, true,
 'स्कूल शिक्षा', 'कुल विद्यालयों की संख्या (Govt.)',
 'आंगनवाड़ी केंद्र /विद्यालय', 'कुल विद्यालयों की संख्या (Govt.)', null, false, false),

('private_schools_count', 'education', 'शिक्षा संबंधी जानकारी',
 'Total private schools', 'संख्या', true, true,
 'स्कूल शिक्षा', 'कुल विद्यालयों की संख्या (निजी)',
 'आंगनवाड़ी केंद्र /विद्यालय', 'कुल विद्यालयों की संख्या (निजी)', null, false, false),

('school_total_enrolled_students', 'education', 'शिक्षा संबंधी जानकारी',
 'Total enrolled students across schools', 'संख्या', true, true,
 'स्कूल शिक्षा', 'विद्यालय मे कुल नामांकित छात्र',
 'स्कूल शिक्षा', 'विद्यालय मे कुल नामांकित छात्र', null, false, false),

('boys_class_0_5', 'education', 'शिक्षा संबंधी जानकारी',
 'Boys enrolled class 0-5', 'संख्या', true, true,
 'स्कूल शिक्षा', 'ग्राम पंचायत क्षेत्र में कक्षा 0–5 के कुल अध्ययनरत छात्रों (लड़के) की संख्या (अनुमानित)',
 'स्कूल शिक्षा', 'वार्ड में कक्षा 0–5 के कुल अध्ययनरत छात्रों (लड़के) की संख्या (अनुमानित)',
 null, false, false),

('boys_class_6_8', 'education', 'शिक्षा संबंधी जानकारी',
 'Boys enrolled class 6-8', 'संख्या', true, true,
 'स्कूल शिक्षा', 'ग्राम पंचायत क्षेत्र में कक्षा 6–8 के कुल अध्ययनरत छात्रों (लड़के) की संख्या (अनुमानित)',
 'स्कूल शिक्षा', 'वार्ड में कक्षा 6–8 के कुल अध्ययनरत छात्रों (लड़के) की संख्या (अनुमानित)',
 null, false, false),

('boys_class_9_10', 'education', 'शिक्षा संबंधी जानकारी',
 'Boys enrolled class 9-10', 'संख्या', true, true,
 'स्कूल शिक्षा', 'ग्राम पंचायत क्षेत्र में कक्षा 9–10 के कुल अध्ययनरत छात्रों (लड़के) की संख्या (अनुमानित)',
 'स्कूल शिक्षा', 'वार्ड में कक्षा 9–10 के कुल अध्ययनरत छात्रों (लड़के) की संख्या (अनुमानित)',
 null, false, false),

('boys_class_11_12', 'education', 'शिक्षा संबंधी जानकारी',
 'Boys enrolled class 11-12', 'संख्या', true, true,
 'स्कूल शिक्षा', 'ग्राम पंचायत क्षेत्र में कक्षा 11–12 के कुल अध्ययनरत छात्रों (लड़के) की संख्या (अनुमानित)',
 'स्कूल शिक्षा', 'वार्ड में कक्षा 11–12 के कुल अध्ययनरत छात्रों (लड़के) की संख्या (अनुमानित)',
 null, false, false),

('girls_class_0_5', 'education', 'शिक्षा संबंधी जानकारी',
 'Girls enrolled class 0-5', 'संख्या', true, true,
 'स्कूल शिक्षा', 'ग्राम पंचायत क्षेत्र में कक्षा 0–5 के कुल अध्ययनरत छात्रों (लड़कियाँ) की संख्या (अनुमानित)',
 'स्कूल शिक्षा', 'वार्ड में कक्षा 0–5 के कुल अध्ययनरत छात्राओं (लड़कियाँ) की संख्या (अनुमानित)',
 null, false, false),

('girls_class_6_8', 'education', 'शिक्षा संबंधी जानकारी',
 'Girls enrolled class 6-8', 'संख्या', true, true,
 'स्कूल शिक्षा', 'ग्राम पंचायत क्षेत्र में कक्षा 6–8 के कुल अध्ययनरत छात्रों (लड़कियाँ) की संख्या (अनुमानित)',
 'स्कूल शिक्षा', 'वार्ड में कक्षा 6–8 के कुल अध्ययनरत छात्राओं (लड़कियाँ) की संख्या (अनुमानित)',
 null, false, false),

('girls_class_9_10', 'education', 'शिक्षा संबंधी जानकारी',
 'Girls enrolled class 9-10', 'संख्या', true, true,
 'स्कूल शिक्षा', 'ग्राम पंचायत क्षेत्र में कक्षा 9–10 के कुल अध्ययनरत छात्रों (लड़कियाँ) की संख्या (अनुमानित)',
 'स्कूल शिक्षा', 'वार्ड में कक्षा 9–10 के कुल अध्ययनरत छात्राओं (लड़कियाँ) की संख्या (अनुमानित)',
 null, false, false),

('girls_class_11_12', 'education', 'शिक्षा संबंधी जानकारी',
 'Girls enrolled class 11-12', 'संख्या', true, true,
 'स्कूल शिक्षा', 'ग्राम पंचायत क्षेत्र में कक्षा 11–12 के कुल अध्ययनरत छात्रों (लड़कियाँ) की संख्या (अनुमानित)',
 'स्कूल शिक्षा', 'वार्ड में कक्षा 11–12 के कुल अध्ययनरत छात्राओं (लड़कियाँ) की संख्या (अनुमानित)',
 null, false, false),

('dropout_children_last_year', 'education', 'शिक्षा संबंधी जानकारी',
 'Dropout children reported last year', 'संख्या', true, true,
 'स्कूल ड्रॉप आउट रेट', 'पिछले वर्ष रिपोर्ट किए गए ड्रॉपआउट कुल बच्चे',
 'स्कूल ड्रॉप आउट रेट', 'पिछले वर्ष रिपोर्ट किए गए ड्रॉपआउट कुल बच्चे', null, false, false),

('skill_training_centers', 'education', 'शिक्षा संबंधी जानकारी',
 'Skill training centres count (govt + private)', 'संख्या', true, true,
 'स्किल ट्रेनिंग केंद्र', 'सरकार तथा निजी स्किल ट्रेनिंग केंद्रों की कुल संख्या जैसे ITIs',
 'कौशल विकास', 'कौशल प्रशिक्षण हेतु संचालित कुल केंद्रों की संख्या (राजकीय योजना अंतर्गत)',
 null, false, false),

('govt_hostels_count', 'education', 'शिक्षा संबंधी जानकारी',
 'Government hostels count', 'संख्या', true, true,
 'हॉस्टल', 'सरकारी हॉस्टल की संख्या',
 'हॉस्टल', 'सरकारी हॉस्टल की संख्या', null, false, false),

('colleges_count', 'education', 'शिक्षा संबंधी जानकारी',
 'Colleges (graduation and above) count', 'संख्या', true, true,
 'महाविद्यालय', 'क्षेत्र में उपलब्ध कुल स्नातक/स्नातकोत्तर (पॉलीटेक्निक/इंजीनियर/मेडिकल/विश्वविद्यालय आदि) की संख्या (सरकारी + निजी)',
 'महाविद्यालय', 'क्षेत्र में उपलब्ध कुल स्नातक/स्नातकोत्तर (पॉलीटेक्निक/इंजीनियर/मेडिकल/विश्वविद्यालय आदि) की संख्या (सरकारी + निजी)',
 null, false, false),

-- ============================================================
-- SOCIAL EMPOWERMENT & INCLUSION
-- ============================================================
('old_age_pension_beneficiaries', 'social_empowerment', 'सामाजिक सशक्तिकरण और समावेशन',
 'Old age pension beneficiaries', 'संख्या', true, true,
 'पेंशन लाभार्थी', 'वृद्धावस्था पेंशन लाभार्थी',
 'पेंशन लाभार्थी', 'वृद्धावस्था पेंशन लाभार्थी (अनुमानित)', null, false, false),

('widow_pension_beneficiaries', 'social_empowerment', 'सामाजिक सशक्तिकरण और समावेशन',
 'Widow pension beneficiaries', 'संख्या', true, true,
 'पेंशन लाभार्थी', 'विधवा पेंशन लाभार्थी',
 'पेंशन लाभार्थी', 'विधवा पेंशन लाभार्थी (अनुमानित)', null, false, false),

('disability_pension_beneficiaries', 'social_empowerment', 'सामाजिक सशक्तिकरण और समावेशन',
 'Disability pension beneficiaries', 'संख्या', true, true,
 'पेंशन लाभार्थी', 'विकलांगता पेंशन लाभार्थी',
 'पेंशन लाभार्थी', 'विकलांगता पेंशन लाभार्थी (अनुमानित)', null, false, false),

('pm_ujjwala_beneficiaries', 'social_empowerment', 'सामाजिक सशक्तिकरण और समावेशन',
 'PM Ujjwala scheme beneficiaries', 'संख्या', true, true,
 'पीएम उज्ज्वला', 'पीएम उज्ज्वला योजना के लाभार्थी',
 'पीएम उज्ज्वला', 'पीएम उज्ज्वला योजना के लाभार्थी', null, false, false),

('pm_cm_awas_beneficiaries', 'social_empowerment', 'सामाजिक सशक्तिकरण और समावेशन',
 'PM/CM housing scheme beneficiaries', 'संख्या', true, true,
 'आवास योजना', 'पीएम/सीएम आवास योजन के कुल लाभार्थी (Actual)',
 'पीएम आवास', 'पीएम/सीएम आवास योजन के कुल लाभार्थी (Actual)', null, false, false),

-- ============================================================
-- INDUSTRIAL, MINING & ECONOMIC DEVELOPMENT
-- ============================================================
('lakhpati_didi_count', 'industrial_economic', 'औद्योगिक, खनन और आर्थिक विकास',
 'Lakhpati Didi count', 'संख्या', true, false,
 'राजीविका', 'लखपति दीदी की संख्या', null, null, null, false, false),

('large_industries_count', 'industrial_economic', 'औद्योगिक, खनन और आर्थिक विकास',
 'Large industrial units count', 'संख्या', true, true,
 'अध्योगिक क्षेत्र', 'क्षेत्र में संचालित कुल वृहद अध्योगिक इकाई',
 'उद्योग', 'क्षेत्र में संचालित कुल वृहद औद्योगिक इकाई', null, false, false),

('shg_count', 'industrial_economic', 'औद्योगिक, खनन और आर्थिक विकास',
 'Active self-help groups count', 'संख्या', true, true,
 'स्वयं सहायता समूह', 'कुल कार्यरत स्वयं सहायता समूह',
 'स्वयं सहायता समूह', 'कुल कार्यरत स्वयं सहायता समूह', null, false, false),

('shg_women_members', 'industrial_economic', 'औद्योगिक, खनन और आर्थिक विकास',
 'Women in active SHGs', 'संख्या', true, true,
 'स्वयं सहायता समूह', 'कार्यरत स्वयं सहायता समूह मे जुड़ी हुई कुल महिलायें',
 'स्वयं सहायता समूह', 'कार्यरत स्वयं सहायता समूह मे जुड़ी  हुई कुल महिलायें', null, false, false),

('msme_small_industries_count', 'industrial_economic', 'औद्योगिक, खनन और आर्थिक विकास',
 'MSME/small industries count', 'संख्या', true, false,
 'एमएसएमई (MSME)', 'लघु उद्योगों की संख्या (मधुमक्खी पालन, रेशम कीट पालन आदि)',
 null, null, null, false, false),

('mudra_loan_beneficiaries', 'industrial_economic', 'औद्योगिक, खनन और आर्थिक विकास',
 'Mudra loan approved beneficiaries', 'संख्या', true, false,
 'एमएसएमई (MSME)', 'कुल लाभार्थी जिन्हे मुद्रा लोन स्वीकृत',
 null, null, null, false, false),

('mining_applicable', 'industrial_economic', 'औद्योगिक, खनन और आर्थिक विकास',
 'Mining activity present', 'हाँ/नहीं', true, false,
 'खनन इंटरफ़ेस (यदि लागू हो)', 'खनन/पत्थर-काम',
 null, null, null, false, true),

-- ============================================================
-- INFRASTRUCTURE & TRANSPORTATION
-- ============================================================
('road_type', 'infrastructure', 'मुख्य (इंफ्रास्ट्रक्चर) आवागमन संबंधित',
 'Main road type passing through GP/Ward', null, true, true,
 'सड़क', 'ग्राम पंचायत से गुज़रती मुख्य सड़क का प्रकार (एनएच/एस/एमडीआर)',
 'सड़क', 'वार्ड से गुज़रती मुख्या सड़क का प्रकार (NH/SH/MDR etc.)', null, true, false),

('road_length_km', 'infrastructure', 'मुख्य (इंफ्रास्ट्रक्चर) आवागमन संबंधित',
 'Road length in km', 'कि.मी.', true, true,
 'सड़क', 'सड़क की लंबाई',
 'सड़क', 'सड़क की लंबाई', null, false, false),

('electrified_households', 'infrastructure', 'मुख्य (इंफ्रास्ट्रक्चर) आवागमन संबंधित',
 'Households with electricity connection', 'संख्या', true, true,
 'बिजली', 'कुल घर जिनमे बिजली कनेक्शन है',
 'बिजली', 'कुल घर जिनमे बिजली कनेक्शन है', null, false, false),

('daily_electricity_hours', 'infrastructure', 'मुख्य (इंफ्रास्ट्रक्चर) आवागमन संबंधित',
 'Average daily domestic electricity availability in hours', 'घंटे/दिन', true, true,
 'बिजली', 'प्रतिदिन घरेलू बिजली की औसत उपलब्धता',
 'बिजली', 'प्रतिदिन घरेलू बिजली की औसत उपलब्धता', null, false, false),

('street_lights_total', 'infrastructure', 'मुख्य (इंफ्रास्ट्रक्चर) आवागमन संबंधित',
 'Total street lights', 'संख्या', true, false,
 'स्ट्रीट लाइटिंग', 'कुल स्ट्रीट लाइटें (सौर ऊर्जा से चलने वाली स्ट्रीट लाइटें भी शामिल)',
 null, null, null, false, false),

('community_halls_count', 'infrastructure', 'मुख्य (इंफ्रास्ट्रक्चर) आवागमन संबंधित',
 'Panchayat bhavan/community halls count', 'संख्या', true, true,
 'सामुदायिक संपत्तियाँ', 'पंचायत भवन/सामुदायिक सभागार की उपलब्धता',
 'सामुदायिक संपत्तियाँ', 'सामुदायिक सभागार की उपलब्धता', null, false, false),

('public_toilets_usable', 'infrastructure', 'मुख्य (इंफ्रास्ट्रक्चर) आवागमन संबंधित',
 'Usable public toilets count', 'संख्या', true, true,
 'सामुदायिक संपत्तियाँ', 'उपयोग योग्य सार्वजनिक शौचालय',
 'सामुदायिक संपत्तियाँ', 'उपयोग लायक सार्वजनिक शौचालय', null, false, false),

('nearest_bank_km', 'infrastructure', 'मुख्य (इंफ्रास्ट्रक्चर) आवागमन संबंधित',
 'Distance to nearest bank if no bank present', 'कि.मी.', true, false,
 'बैंक सुविधा', 'यदि कोई बैंक नहीं है तो निकटतम  उपलब्ध बैंक की ग्राम पंचायत मुख्यालय से दूरी',
 null, null, null, false, false),

('public_transport_available', 'infrastructure', 'मुख्य (इंफ्रास्ट्रक्चर) आवागमन संबंधित',
 'Public transport availability', 'हाँ/नहीं', true, true,
 'सार्वजनिक परिवहन', 'सार्वजनिक परिवहन उपलब्धता',
 'सार्वजनिक परिवहन', 'सार्वजनिक परिवहन उपलब्धता', null, false, true),

('bus_stand_km', 'infrastructure', 'मुख्य (इंफ्रास्ट्रक्चर) आवागमन संबंधित',
 'Distance to bus stand from GP/Ward', 'कि.मी.', true, true,
 'सार्वजनिक परिवहन', 'बस स्टैंड (जहा बसें आती है) की ग्राम पंचायत मुख्यालय से दूरी',
 'सार्वजनिक परिवहन', 'बस स्टैंड से वार्ड की दूरी', null, false, false),

('railway_station_km', 'infrastructure', 'मुख्य (इंफ्रास्ट्रक्चर) आवागमन संबंधित',
 'Distance to railway station', 'कि.मी.', true, true,
 'सार्वजनिक परिवहन', 'ग्राम पंचायत मुख्यालय से रेलवे स्टेशन की दूरी',
 'सार्वजनिक परिवहन', 'रेलवे स्टेशन से वार्ड की दूरी', null, false, false),

('broadband_available', 'infrastructure', 'मुख्य (इंफ्रास्ट्रक्चर) आवागमन संबंधित',
 'Broadband availability', 'हाँ/नहीं', true, true,
 'इंटरनेट /ब्रॉड्बैन्ड', 'ब्रॉड्बैन्ड की उपलब्धता',
 'इंटरनेट /ब्रॉड्बैन्ड', 'ब्रॉड्बैन्ड की उपलब्धता', null, false, true),

('ev_charging_station', 'infrastructure', 'मुख्य (इंफ्रास्ट्रक्चर) आवागमन संबंधित',
 'EV charging station availability (urban only)', 'हाँ/नहीं', false, true,
 null, null,
 'ई वी (electric vehicle)', 'ई वी (electric vehicle) चार्जिंग स्टेशन की उपलब्धता',
 null, false, true),

-- ============================================================
-- WATER SECURITY
-- ============================================================
('water_sources_count', 'water_security', 'जल सुरक्षा और समुदाय आधारित क्षमता',
 'Available drinking water sources (well/handpump/tank)', 'संख्या', true, true,
 'जल स्रोत एवं गुणवत्ता', 'उपलब्ध पेयजल स्रोत (कुआँ/हैंडपंप/टैंक)',
 'जल स्रोत एवं गुणवत्ता', 'उपलब्ध जल स्रोत (कुआँ/हैंडपंप/टैंक)', null, false, false),

('functional_tap_connections', 'water_security', 'जल सुरक्षा और समुदाय आधारित क्षमता',
 'Functional household tap connections (FHTC)', 'संख्या', true, true,
 'घरेलू पानी', 'घरों में नल का चालू कनेक्शन (Functional Household Tap Connection) है',
 'घरेलू पानी', 'घरों में नल का चालू कनेक्शन (FHTC) है', null, false, false),

('overhead_tanks_count', 'water_security', 'जल सुरक्षा और समुदाय आधारित क्षमता',
 'Total overhead tanks', 'संख्या', true, true,
 'घरेलू जल', 'कुल ओवरहेड टैंक',
 'घरेलू जल', 'कुल ओवरहेड  टैंक', null, false, false),

('water_quality_issues', 'water_security', 'जल सुरक्षा और समुदाय आधारित क्षमता',
 'Water quality problems (fluoride/nitrate/salinity)', 'हाँ/नहीं', true, true,
 'सार्वजनिक स्थानों मे पेयजल', 'पानी की गुणवत्ता संबंधी समस्याओं की सूचना मिली (फ्लोराइड/नाइट्रेट/लवणता)',
 'सार्वजनिक स्थानों मे पेयजल', 'पानी की गुणवत्ता संबंधी समस्याओं की सूचना मिली (फ्लोराइड/नाइट्रेट/लवणता)',
 null, false, true),

('groundwater_depth_meters', 'water_security', 'जल सुरक्षा और समुदाय आधारित क्षमता',
 'Groundwater depth in meters', 'मीटर में', true, true,
 'जल स्थिरता', 'भूजल दोहन की स्थिति (भूजल टेबल के अनुसार)',
 'जल स्थिरता', 'भूजल दोहन की स्थिति (भूजल टेबल के अनुसार)', null, false, false),

('groundwater_recharge_structures', 'water_security', 'जल सुरक्षा और समुदाय आधारित क्षमता',
 'Groundwater recharge structures (check dam/anicut/recharge well etc)', 'संख्या', true, true,
 'जल स्थिरता', 'भूजल पुनर्भरण संरचनाएं (चेक डैम/एनिकट/रिचार्ज कुआँ/रिचार्ज पिट/रेन वाटर हार्वेस्टिंग संरचना/जल संचयन टैंक / तालाब आदि)',
 'जल स्थिरता', 'भूजल पुनर्भरण संरचनाएं (चेक डैम/एनिकट/रिचार्ज कुआँ/रिचार्ज पिट/रेन वाटर हार्वेस्टिंग संरचना/जल संचयन टैंक / तालाब आदि)',
 null, false, false),

-- ============================================================
-- ENVIRONMENT & CLIMATE RESILIENCE
-- ============================================================
('households_with_toilets', 'environment', 'पर्यावरणीय स्थिरता और जलवायु अनुकूलता',
 'Households with toilets (SBM)', 'संख्या', true, false,
 'एसबीएम', 'शोचालय सहित कुल घरों की संख्या', null, null, null, false, false),

('plantation_eligible_land', 'environment', 'पर्यावरणीय स्थिरता और जलवायु अनुकूलता',
 'Vacant land suitable for plantation (excluding roadsides)', 'हेक्टेयर', true, true,
 'सरकारी गैर-कृषि भूमि', 'वृक्षारोपण के लिए उपयुक्त रिक्त भूमि (सड़क मार्गों के किनारों के अलावा)',
 'सरकारी गैर-कृषि भूमि', 'वृक्षारोपण के लिए उपयुक्त रिक्त भूमि  (सड़कमार्गों के किनारों के अलावा)',
 null, false, false),

('forest_area_hectares', 'environment', 'पर्यावरणीय स्थिरता और जलवायु अनुकूलता',
 'Reserved/protected forest area', 'हेक्टेयर', true, true,
 'वन क्षेत्र', 'आरक्षित/संरक्षित वन/ protected area का क्षेत्रफल',
 'वन क्षेत्र', 'आरक्षित/संरक्षित वन/ protected area का क्षेत्रफल', null, false, false),

('pm_surya_ghar_houses', 'environment', 'पर्यावरणीय स्थिरता और जलवायु अनुकूलता',
 'PM Surya Ghar solar panel installed houses', 'संख्या', true, true,
 'सूर्य ऊर्जा', 'पीएम सूर्यघर योजना के अंतर्गत छतों पर सौर पैनल स्थापित घरों की संख्या',
 'सूर्य ऊर्जा', 'पीएम सूर्यघर योजना के अंतर्गत छतों पर सौर पैनल स्थापित घरों की संख्या',
 null, false, false),

('waste_collection_available', 'environment', 'पर्यावरणीय स्थिरता और जलवायु अनुकूलता',
 'Waste collection system available', 'हाँ/नहीं', true, true,
 'ठोस अपशिष्ट प्रबंधन', 'अपशिष्ट संग्रहण प्रणाली उपलब्ध',
 'ठोस अपशिष्ट प्रबंधन', 'उपलब्ध अपशिष्ट संग्रहण प्रणाली', null, false, true),

('sewerage_network_available', 'environment', 'पर्यावरणीय स्थिरता और जलवायु अनुकूलता',
 'Sewerage network availability', 'हाँ/नहीं', true, true,
 'सीवरेज', 'सीवरेज नेटवर्क की उपलब्धता',
 'सीवरेज', 'सीवरेज नेटवर्क की उपलब्धता', null, false, true),

-- ============================================================
-- TOURISM & CULTURAL DEVELOPMENT
-- ============================================================
('cultural_festivals_count', 'tourism_culture', 'पर्यटन एवं सांस्कृतिक विकास',
 'Annual religious/cultural fairs count', 'संख्या', true, true,
 'सांस्कृतिक कार्यक्रम', 'प्रतिवर्ष आयोजित मुख्य धार्मिक‑सांस्कृतिक इत्यादि मेलों की संख्या',
 'सांस्कृतिक कार्यक्रम', 'प्रतिवर्ष आयोजित मुख्य धार्मिक‑सांस्कृतिक इत्यादि मेलों की संख्या',
 null, false, false),

('fair_avg_footfall_per_day', 'tourism_culture', 'पर्यटन एवं सांस्कृतिक विकास',
 'Average daily footfall at major fairs', 'संख्या', true, true,
 'सांस्कृतिक कार्यक्रम', 'प्रमुख मेलों में औसत फुटफॉल (प्रति दिवस)',
 'सांस्कृतिक कार्यक्रम', 'प्रमुख मेलों में औसत फुटफॉल(प्रति दिवस)', null, false, false),

('religious_cultural_sites_count', 'tourism_culture', 'पर्यटन एवं सांस्कृतिक विकास',
 'Major religious and cultural sites (tangible)', 'संख्या', true, true,
 'धार्मिक और सांस्कृतिक स्थल', 'प्रमुख धार्मिक और सांस्कृतिक संपत्तियां (मूर्त)',
 'धार्मिक और सांस्कृतिक स्थल', 'प्रमुख धार्मिक और सांस्कृतिक संपत्तियां (मूर्त)', null, false, false),

('trained_tourist_guides', 'tourism_culture', 'पर्यटन एवं सांस्कृतिक विकास',
 'Registered trained tourist guides', 'संख्या', true, true,
 'स्थानीय गाइड', 'प्रशिक्षित गाइड का पंजीकरण (अनुमानित)',
 'स्थानीय गाइड', 'प्रशिक्षित गाइड का पंजीकरण (अनुमानित)', null, false, false),

-- ============================================================
-- GOVERNANCE & PUBLIC SERVICES
-- ============================================================
('nearest_emitra_km', 'governance', 'प्रभावी शासन और सार्वजनिक सेवाएं',
 'Distance to nearest e-Mitra', 'कि.मी.', true, true,
 'ई-गवर्नेंस', 'निकटतम ई-मित्र की ग्राम पंचायत मुख्यालय से दूरी',
 'ई-गवर्नेंस', 'ई-मित्र की निकटतम दूरी', null, false, false),

('nearest_police_station_km', 'governance', 'प्रभावी शासन और सार्वजनिक सेवाएं',
 'Distance to nearest police station', 'कि.मी.', true, true,
 'सुरक्षा', 'निकटतम पुलिस स्टेशन की ग्राम पंचायत मुख्यालय से दूरी',
 'सुरक्षा', 'निकटतम पुलिस स्टेशन की दूरी', null, false, false),

('nearest_lpg_distributor_km', 'governance', 'प्रभावी शासन और सार्वजनिक सेवाएं',
 'Distance to nearest LPG distributor', 'कि.मी.', true, true,
 'एलपीजी सेवाएं', 'निकटतम एलपीजी वितरक की ग्राम पंचायत मुख्यालय से दूरी',
 'एलपीजी सेवाएं', 'निकटतम एलपीजी वितरक की दूरी(कि.मी.)', null, false, false),

('fire_station_km', 'governance', 'प्रभावी शासन और सार्वजनिक सेवाएं',
 'Distance to fire station', 'कि.मी.', true, true,
 'सार्वजनिक सेवा', 'दमकल स्टेशन की की ग्राम पंचायत मुख्यालय से दूरी',
 'सार्वजनिक सेवा', 'दमकल स्टेशन की निकटता', null, false, false);