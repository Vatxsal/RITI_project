CREATE TABLE IF NOT EXISTS generated_reports (
  id                BIGSERIAL PRIMARY KEY,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  report_name       TEXT NOT NULL,
  scope_label       TEXT NOT NULL,
  scope_type        TEXT NOT NULL,  -- 'district' | 'block' | 'gp' | 'ulb' | 'ward'
  district          TEXT,
  block_name        TEXT,
  gp_name           TEXT,
  ulb_name          TEXT,
  ward_name         TEXT,
  area_type         TEXT NOT NULL,  -- 'Rural' | 'Urban'
  html_content      TEXT NOT NULL,
  created_by        TEXT,
  file_size_kb      INTEGER
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_generated_reports_created_at 
  ON generated_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generated_reports_district 
  ON generated_reports(district);