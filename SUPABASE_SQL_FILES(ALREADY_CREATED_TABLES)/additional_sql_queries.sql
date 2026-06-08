-- Enable trigram extension (needed for ilike indexes)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram indexes on the three columns being ilike-searched
CREATE INDEX IF NOT EXISTS idx_mv_asp_summary_sector_trgm
  ON mv_aspirations_summary USING gin (sector gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_mv_asp_summary_item_trgm
  ON mv_aspirations_summary USING gin (item gin_trgm_ops);

-- This alone will drop the 1,617ms queries to ~5-15ms

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX idx_mv_asp_sector_trgm ON mv_aspirations_summary USING GIN (sector gin_trgm_ops);
CREATE INDEX idx_mv_asp_item_trgm   ON mv_aspirations_summary USING GIN (item gin_trgm_ops);
CREATE INDEX idx_mv_asp_dept_trgm   ON mv_aspirations_summary USING GIN (dept gin_trgm_ops);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_asp_summary_unique
ON mv_aspirations_summary(
  district, area_type, sector, item,
  COALESCE(item_other,''), status, fast_track, priority
);

CREATE OR REPLACE FUNCTION refresh_aspirations_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_aspirations_summary;
END;
$$ LANGUAGE plpgsql;

CREATE MATERIALIZED VIEW mv_asp_state_summary AS
SELECT
  area_type, sector, item, item_other,
  status, fast_track, priority,
  SUM(total_count)    AS total_count,
  SUM(total_budget)   AS total_budget,
  SUM(sum_qty_2030)   AS sum_qty_2030,
  SUM(sum_qty_2035)   AS sum_qty_2035,
  SUM(sum_qty_2047)   AS sum_qty_2047,
  SUM(sum_budget_2030) AS sum_budget_2030,
  SUM(sum_budget_2035) AS sum_budget_2035,
  SUM(sum_budget_2047) AS sum_budget_2047
FROM mv_aspirations_summary
GROUP BY area_type, sector, item, item_other, status, fast_track, priority;

CREATE UNIQUE INDEX ON mv_asp_state_summary(
  area_type, sector, item, COALESCE(item_other,''), status, fast_track, priority
);