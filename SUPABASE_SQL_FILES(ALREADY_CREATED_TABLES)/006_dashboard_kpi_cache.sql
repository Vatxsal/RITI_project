-- Dashboard KPI cache table for precomputed state/district snapshots
CREATE TABLE IF NOT EXISTS cache_dashboard_kpis (
    cache_key TEXT PRIMARY KEY,        -- e.g. 'state_all', 'Ajmer_rural'
    district TEXT,                     -- NULL means state-level
    area_type TEXT NOT NULL,           -- 'rural', 'urban', 'all'
    kpi_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    computed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cache_dashboard_kpis_district ON cache_dashboard_kpis (district);
CREATE INDEX IF NOT EXISTS idx_cache_dashboard_kpis_area_type ON cache_dashboard_kpis (area_type);
CREATE INDEX IF NOT EXISTS idx_cache_dashboard_kpis_computed_at ON cache_dashboard_kpis (computed_at DESC);

-- Optional helper row used by the frontend to detect fresh pipeline refreshes.
INSERT INTO cache_dashboard_kpis (cache_key, district, area_type, kpi_data)
VALUES ('last_pipeline_run', NULL, 'all', '{}'::jsonb)
ON CONFLICT (cache_key) DO NOTHING;
