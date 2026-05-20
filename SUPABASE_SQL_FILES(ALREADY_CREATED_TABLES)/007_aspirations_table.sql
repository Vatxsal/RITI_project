-- ================================================================
-- MANTHAAN OS — Aspiration Rules Engine Results
-- Stores processed aspiration records from backend portal
-- ================================================================

-- Main aspirations table
CREATE TABLE IF NOT EXISTS aspirations (
  id                    BIGSERIAL PRIMARY KEY,
  
  -- Identity / traceability
  aspiration_id         TEXT,
  rajdhara_ref          TEXT,
  planning_year         TEXT NOT NULL,  -- '2030', '2035', '2047'
  upload_batch_id       TEXT NOT NULL,  -- UUID generated per upload session
  uploaded_at           TIMESTAMPTZ DEFAULT NOW(),

  -- Location (rural)
  district              TEXT,
  block                 TEXT,
  gram_panchayat        TEXT,
  village               TEXT,

  -- Location (urban)
  ulb                   TEXT,
  ward                  TEXT,
  city                  TEXT,
  area_type             TEXT,  -- 'Rural' or 'Urban'

  -- Aspiration content
  sector                TEXT,
  dept                  TEXT,
  item                  TEXT NOT NULL,
  priority              INTEGER DEFAULT 0,

  -- Quantities
  qty_2030              NUMERIC DEFAULT 0,
  qty_2035              NUMERIC DEFAULT 0,
  qty_2047              NUMERIC DEFAULT 0,

  -- Funding
  funded                TEXT DEFAULT 'NO',
  scheme                TEXT,
  is_financial          BOOLEAN DEFAULT FALSE,
  is_financial_approved BOOLEAN DEFAULT FALSE,

  -- GIS
  lat                   NUMERIC,
  lng                   NUMERIC,
  landmark              TEXT,
  address_eng           TEXT,

  -- Rules engine output
  status                TEXT NOT NULL CHECK (status IN ('ACCEPT','FUNDED','REVIEW','REJECT')),
  status_codes          TEXT[],   -- e.g. ['R2-NOGIS', 'R3-NODATA']
  reasons               TEXT[],   -- full reason strings
  fast_track            BOOLEAN DEFAULT FALSE,

  -- Budget (computed)
  budget_2030           NUMERIC DEFAULT 0,
  budget_2035           NUMERIC DEFAULT 0,
  budget_2047           NUMERIC DEFAULT 0,
  total_budget          NUMERIC DEFAULT 0,

  -- Baseline linkage
  baseline_population   INTEGER DEFAULT 0,
  zone                  TEXT   -- 'Plains', 'Desert', 'Tribal'
);

-- Upload batches metadata table
CREATE TABLE IF NOT EXISTS aspiration_batches (
  batch_id          TEXT PRIMARY KEY,
  uploaded_at       TIMESTAMPTZ DEFAULT NOW(),
  planning_years    TEXT[],        -- which years were in this upload
  total_records     INTEGER DEFAULT 0,
  accept_count      INTEGER DEFAULT 0,
  funded_count      INTEGER DEFAULT 0,
  review_count      INTEGER DEFAULT 0,
  reject_count      INTEGER DEFAULT 0,
  total_budget      NUMERIC DEFAULT 0,
  notes             TEXT
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_asp_district    ON aspirations(district);
CREATE INDEX IF NOT EXISTS idx_asp_status      ON aspirations(status);
CREATE INDEX IF NOT EXISTS idx_asp_batch       ON aspirations(upload_batch_id);
CREATE INDEX IF NOT EXISTS idx_asp_planning_yr ON aspirations(planning_year);
CREATE INDEX IF NOT EXISTS idx_asp_district_status ON aspirations(district, status);
CREATE INDEX IF NOT EXISTS idx_asp_sector      ON aspirations(sector);
