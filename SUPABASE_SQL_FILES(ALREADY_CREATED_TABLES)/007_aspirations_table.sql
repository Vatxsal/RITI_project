-- Drop and recreate without planning_year

DROP TABLE IF EXISTS aspirations_rural CASCADE;
DROP TABLE IF EXISTS aspirations_urban CASCADE;
DROP TABLE IF EXISTS aspiration_batches CASCADE;

CREATE TABLE aspirations_rural (
  id                    BIGSERIAL PRIMARY KEY,
  uploaded_at           TIMESTAMPTZ DEFAULT NOW(),
  upload_batch_id       TEXT NOT NULL,
  sector                TEXT,

  -- Location
  district              TEXT,
  lok_sabha             TEXT,
  vidhan_sabha          TEXT,
  block                 TEXT,
  gram_panchayat        TEXT,
  gp_id                 TEXT,

  -- Aspiration content
  item                  TEXT NOT NULL,
  item_other            TEXT,
  priority              INTEGER DEFAULT 0,

  -- Quantities
  qty_2030              NUMERIC DEFAULT 0,
  qty_2035              NUMERIC DEFAULT 0,
  qty_2047              NUMERIC DEFAULT 0,

  -- Funding
  funded                TEXT DEFAULT 'NO',
  scheme                TEXT,

  -- GIS
  lat                   NUMERIC,
  lng                   NUMERIC,

  -- Rules engine
  status                TEXT NOT NULL CHECK (status IN ('ACCEPT','FUNDED','REVIEW','REJECT')),
  status_codes          TEXT[],
  reasons               TEXT[],
  fast_track            BOOLEAN DEFAULT FALSE,

  -- Budget
  budget_2030           NUMERIC DEFAULT 0,
  budget_2035           NUMERIC DEFAULT 0,
  budget_2047           NUMERIC DEFAULT 0,
  total_budget          NUMERIC DEFAULT 0,

  baseline_population   INTEGER DEFAULT 0,
  zone                  TEXT,

  base_natural_key      TEXT,
  CONSTRAINT asp_rural_bnk_unique UNIQUE (base_natural_key)
);

CREATE INDEX IF NOT EXISTS idx_asp_rural_district        ON aspirations_rural(district);
CREATE INDEX IF NOT EXISTS idx_asp_rural_gp_id           ON aspirations_rural(gp_id);
CREATE INDEX IF NOT EXISTS idx_asp_rural_status          ON aspirations_rural(status);
CREATE INDEX IF NOT EXISTS idx_asp_rural_sector          ON aspirations_rural(sector);
CREATE INDEX IF NOT EXISTS idx_asp_rural_district_status ON aspirations_rural(district, status);
CREATE INDEX IF NOT EXISTS idx_asp_rural_batch           ON aspirations_rural(upload_batch_id);


CREATE TABLE aspirations_urban (
  id                    BIGSERIAL PRIMARY KEY,
  uploaded_at           TIMESTAMPTZ DEFAULT NOW(),
  upload_batch_id       TEXT NOT NULL,
  sector                TEXT,

  -- Location
  district              TEXT,
  lok_sabha             TEXT,
  vidhan_sabha          TEXT,
  ulb                   TEXT,
  ward                  TEXT,
  ward_id               TEXT,

  -- Aspiration content
  item                  TEXT NOT NULL,
  item_other            TEXT,
  priority              INTEGER DEFAULT 0,

  -- Quantities
  qty_2030              NUMERIC DEFAULT 0,
  qty_2035              NUMERIC DEFAULT 0,
  qty_2047              NUMERIC DEFAULT 0,

  -- Funding
  funded                TEXT DEFAULT 'NO',
  scheme                TEXT,

  -- GIS
  lat                   NUMERIC,
  lng                   NUMERIC,

  -- Rules engine
  status                TEXT NOT NULL CHECK (status IN ('ACCEPT','FUNDED','REVIEW','REJECT')),
  status_codes          TEXT[],
  reasons               TEXT[],
  fast_track            BOOLEAN DEFAULT FALSE,

  -- Budget
  budget_2030           NUMERIC DEFAULT 0,
  budget_2035           NUMERIC DEFAULT 0,
  budget_2047           NUMERIC DEFAULT 0,
  total_budget          NUMERIC DEFAULT 0,

  baseline_population   INTEGER DEFAULT 0,
  zone                  TEXT,

  base_natural_key      TEXT,
  CONSTRAINT asp_urban_bnk_unique UNIQUE (base_natural_key)
);

CREATE INDEX IF NOT EXISTS idx_asp_urban_district        ON aspirations_urban(district);
CREATE INDEX IF NOT EXISTS idx_asp_urban_ward_id         ON aspirations_urban(ward_id);
CREATE INDEX IF NOT EXISTS idx_asp_urban_status          ON aspirations_urban(status);
CREATE INDEX IF NOT EXISTS idx_asp_urban_sector          ON aspirations_urban(sector);
CREATE INDEX IF NOT EXISTS idx_asp_urban_district_status ON aspirations_urban(district, status);
CREATE INDEX IF NOT EXISTS idx_asp_urban_batch           ON aspirations_urban(upload_batch_id);


CREATE TABLE aspiration_batches (
  batch_id        TEXT PRIMARY KEY,
  uploaded_at     TIMESTAMPTZ DEFAULT NOW(),
  area_type       TEXT,
  sector          TEXT,
  total_records   INTEGER DEFAULT 0,
  accept_count    INTEGER DEFAULT 0,
  funded_count    INTEGER DEFAULT 0,
  review_count    INTEGER DEFAULT 0,
  reject_count    INTEGER DEFAULT 0,
  total_budget    NUMERIC DEFAULT 0,
  notes           TEXT
);