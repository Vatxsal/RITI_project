CREATE TABLE compliance_norms (
    id SERIAL PRIMARY KEY,
    category_en VARCHAR(50),
    asset_type VARCHAR(100),
    dist_norm_km_plain DECIMAL(5,2),
    dist_norm_km_relaxed DECIMAL(5,2),
    pop_norm_plain INTEGER,
    pop_norm_relaxed INTEGER,
    governing_rule TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO compliance_norms 
(category_en, asset_type, dist_norm_km_plain, dist_norm_km_relaxed, pop_norm_plain, pop_norm_relaxed, governing_rule)
VALUES
-- Education
('Education', 'Primary School', 1.0, 3.0, NULL, NULL, 'RTE Act 2009 / State RTE Rules'),
('Education', 'Upper Primary School', 3.0, 5.0, NULL, NULL, 'RTE Act 2009 / Samagra Shiksha'),

-- Health
('Health', 'Sub-Health Centre (HWC)', 3.0, 5.0, 5000, 3000, 'IPHS 2022 Volume III'),
('Health', 'Primary Health Centre (PHC)', NULL, NULL, 30000, 20000, 'IPHS 2022 Volume III'),
('Health', 'Community Health Centre (CHC)', NULL, NULL, 120000, 80000, 'IPHS 2022 Volume IV'),
('Health', 'ASHA Worker', 1.0, 1.0, NULL, 500, 'NHM Guidelines'),

-- Infrastructure
('Infrastructure', 'Paved Road', 0.5, 0.5, 500, 250, 'PMGSY Guidelines'),
('Infrastructure', 'Anganwadi Centre', 0.5, 1.0, 400, 150, 'ICDS Norms'),

-- Water Security
('Water_Security', 'Piped Water Connection', NULL, NULL, NULL, NULL, 'Jal Jeevan Mission');

CREATE TABLE aspiration_compliance_results (
    id SERIAL PRIMARY KEY,
    -- Changed from UUID to INTEGER to match your SERIAL primary keys
    rural_aspiration_id INTEGER REFERENCES fact_rural_aspirations(id) ON DELETE CASCADE,
    urban_aspiration_id INTEGER REFERENCES fact_urban_aspirations(id) ON DELETE CASCADE,
    gp_id INTEGER REFERENCES dim_rural_gps(gp_id),
    ward_id INTEGER REFERENCES dim_urban_wards(ward_id),
    is_compliant BOOLEAN DEFAULT FALSE,
    fail_reason TEXT, 
    check_type VARCHAR(50), 
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);