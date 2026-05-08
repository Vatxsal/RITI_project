-- Add wide_column_header column
ALTER TABLE indicator_master ADD COLUMN wide_column_header TEXT;

-- Update admin_demographic category mapping for Rural
UPDATE indicator_master SET wide_column_header = 'राजस्व ग्रामों की संख्या (ग्राम पंचायत के लिए)' WHERE canonical_key = 'revenue_villages_count';
UPDATE indicator_master SET wide_column_header = 'कुल जनसंख्या (Census 2011)' WHERE canonical_key = 'total_population_census_2011';
UPDATE indicator_master SET wide_column_header = 'कुल जनसंख्या (अनुमानित 2026)' WHERE canonical_key = 'total_population_2026';
UPDATE indicator_master SET wide_column_header = 'पुरुष जनसंख्या (अनुमानित 2026)' WHERE canonical_key = 'population_male_2026';
UPDATE indicator_master SET wide_column_header = 'महिला जनसंख्या (अनुमानित 2026)' WHERE canonical_key = 'population_female_2026';
UPDATE indicator_master SET wide_column_header = 'ट्रांसजेंडर (अनुमानित 2026)' WHERE canonical_key = 'population_transgender_2026';
UPDATE indicator_master SET wide_column_header = 'बच्चे (0-6 वर्ष) (अनुमानित 2026)' WHERE canonical_key = 'children_0_6_2026';
UPDATE indicator_master SET wide_column_header = 'बच्चे (6-14 वर्ष) (अनुमानित 2026)' WHERE canonical_key = 'children_6_14_2026';
UPDATE indicator_master SET wide_column_header = 'जनसँख्या (14-18 वर्ष) (अनुमानित 2026)' WHERE canonical_key = 'youth_14_18_2026';
UPDATE indicator_master SET wide_column_header = 'डिफेंस फोर्सेज (जल,थल,वायु सेना) में कार्यरत कार्मिक की संख्या (अनुमानित 2026)' WHERE canonical_key = 'defence_personnel_2026';
UPDATE indicator_master SET wide_column_header = 'विशेष योग्यजन (PwD) की संख्या (अनुमानित 2026)' WHERE canonical_key = 'pwd_count_2026';
UPDATE indicator_master SET wide_column_header = 'वरिष्ठ नागरिक (60+) (अनुमानित 2026)' WHERE canonical_key = 'senior_citizens_60plus_2026';
UPDATE indicator_master SET wide_column_header = 'घुमंतू श्रेणी के कुल लोगो की संख्या (अनुमानित- 2026)' WHERE canonical_key = 'nomadic_population_2026';
UPDATE indicator_master SET wide_column_header = 'कुल भौगोलिक क्षेत्र (हैक्टेयर)' WHERE canonical_key = 'total_geographic_area';
UPDATE indicator_master SET wide_column_header = 'पक्के घरों की संख्या (अनुमानित- 2026)' WHERE canonical_key = 'pucca_houses';
UPDATE indicator_master SET wide_column_header = 'कच्चे घरों की संख्या (अनुमानित- 2026)' WHERE canonical_key = 'kutcha_houses';
UPDATE indicator_master SET wide_column_header = 'परिवारों की कुल संख्या (अनुमानित- 2026)' WHERE canonical_key = 'total_households_2026';
UPDATE indicator_master SET wide_column_header = 'BPL परिवारों की संख्या (अनुमानित- 2026)' WHERE canonical_key = 'bpl_households_2026';
UPDATE indicator_master SET wide_column_header = 'NFSA से लाभान्वित परिवारों की संख्या (अनुमानित- 2026)' WHERE canonical_key = 'nfsa_households_2026';

-- Default fallback: use rural_sub_indicator or urban_sub_indicator if header is not explicitly set выше
UPDATE indicator_master SET wide_column_header = rural_sub_indicator WHERE wide_column_header IS NULL AND in_rural = true;
UPDATE indicator_master SET wide_column_header = urban_sub_indicator WHERE wide_column_header IS NULL AND in_urban = true AND in_rural = false;
