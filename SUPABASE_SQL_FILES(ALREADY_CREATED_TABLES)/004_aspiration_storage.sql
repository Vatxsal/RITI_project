-- Rural Aspirations
CREATE TABLE IF NOT EXISTS fact_rural_aspirations (
    id SERIAL PRIMARY KEY,
    gp_id INTEGER REFERENCES dim_rural_gps(gp_id),
    category_en VARCHAR(100), -- English name (e.g., 'Health')
    category_hi VARCHAR(100), -- Hindi name (e.g., 'स्वास्थ्य एवं कल्याण')
    sub_indicator TEXT,
    priority_level INTEGER,
    target_2030 TEXT,
    target_2030_35 TEXT,
    target_2035_47 TEXT,
    financial_approval VARCHAR(50),
    scheme_name TEXT,
    rajdhara_ref_no TEXT,
    latitude NUMERIC,
    longitude NUMERIC,
    remarks TEXT
);

-- Urban Aspirations
CREATE TABLE IF NOT EXISTS fact_urban_aspirations (
    id SERIAL PRIMARY KEY,
    ward_id INTEGER REFERENCES dim_urban_wards(ward_id),
    category_en VARCHAR(100),
    category_hi VARCHAR(100),
    sub_indicator TEXT,
    priority_level INTEGER,
    target_2030 TEXT,
    target_2030_35 TEXT,
    target_2035_47 TEXT,
    financial_approval VARCHAR(50),
    scheme_name TEXT,
    rajdhara_ref_no TEXT,
    latitude NUMERIC,
    longitude NUMERIC,
    remarks TEXT
);

-- Ensure lat/long allow NULL
ALTER TABLE fact_rural_aspirations ALTER COLUMN latitude DROP NOT NULL;
ALTER TABLE fact_rural_aspirations ALTER COLUMN longitude DROP NOT NULL;

ALTER TABLE fact_urban_aspirations ALTER COLUMN latitude DROP NOT NULL;
ALTER TABLE fact_urban_aspirations ALTER COLUMN longitude DROP NOT NULL;
