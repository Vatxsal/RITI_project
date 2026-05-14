# CSV Import Workflow for Supabase

## Summary

**CSV Export Complete:** All 21 fact tables exported from Excel in **10 seconds** flat.

### Rural Tables (11):
- `fact_rural_admin.csv` (14,403 rows)
- `fact_rural_livelihood.csv` (14,403 rows) — merged from Agriculture + Livestock sheets
- `fact_rural_health.csv` (14,403 rows)
- `fact_rural_education.csv` (14,403 rows) — merged from Anganwadi + Education
- `fact_rural_social.csv` (14,403 rows)
- `fact_rural_economy.csv` (14,403 rows)
- `fact_rural_infra.csv` (14,403 rows) — Infrastructure data
- `fact_rural_governance.csv` (14,403 rows) — Governance data
- `fact_rural_water.csv` (14,403 rows)
- `fact_rural_environment.csv` (14,403 rows)
- `fact_rural_tourism.csv` (14,403 rows)

### Urban Tables (10):
- `fact_urban_admin.csv` (10,245 rows)
- `fact_urban_health.csv` (10,245 rows)
- `fact_urban_education.csv` (10,245 rows) — merged from Anganwadi + Education
- `fact_urban_social.csv` (10,245 rows)
- `fact_urban_economy.csv` (10,245 rows)
- `fact_urban_infra.csv` (10,245 rows)
- `fact_urban_governance.csv` (10,245 rows)
- `fact_urban_water.csv` (10,245 rows)
- `fact_urban_environment.csv` (10,245 rows)
- `fact_urban_tourism.csv` (10,245 rows)

---

## Import Steps (Phase 1: Dimension Tables)

### Step 1A — Import Rural Dimension Table

1. **Supabase Dashboard** → **Table Editor**
2. Click on **`dim_rural_gps`**
3. Click **"Insert" → "Import data"** → **"CSV"**
4. Upload: `DATA/CSV_EXPORT/fact_rural_admin.csv`
5. **Column mapping** (Supabase will auto-detect):
   - `district` → `district`
   - `block` → `block`
   - `gram_panchayat` → `gram_panchayat`
6. **Skip columns**: All fact columns (pop_2011, male_pop_2026, etc.)
   - Supabase will ignore extra columns; only map key columns
7. Click **"Import"** — wait ~30-60 seconds
8. **Result**: dim_rural_gps now has 14,403 rows with auto-generated `gp_id`

### Step 1B — Import Urban Dimension Table

1. **Table Editor** → **`dim_urban_wards`**
2. **"Insert" → "Import data" → "CSV"**
3. Upload: `DATA/CSV_EXPORT/fact_urban_admin.csv`
4. **Column mapping**:
   - `district` → `district`
   - `ulb` → `ulb`
   - `ward` → `ward`
5. Skip all fact columns
6. Click **"Import"** — wait ~30-60 seconds
7. **Result**: dim_urban_wards now has 10,245 rows with auto-generated `ward_id`

---

## Enrichment Step (Phase 2: Add IDs to Fact CSVs)

Once both dim tables are populated, run:

```bash
python ETL/enrich_csv_with_ids.py
```

This script will:
1. Fetch all `gp_id` values from `dim_rural_gps`
2. Add `gp_id` column to each rural fact CSV
3. Remove `district`, `block`, `gram_panchayat` columns (no longer needed)
4. Fetch all `ward_id` values from `dim_urban_wards`
5. Add `ward_id` column to each urban fact CSV
6. Remove `district`, `ulb`, `ward` columns

**Output**: CSVs ready for fact table import (21 CSVs updated in-place)

---

## Import Steps (Phase 3: Fact Tables)

### For Each Rural Fact Table:

1. **Table Editor** → **`fact_rural_admin`** (or any fact table)
2. **"Insert" → "Import data" → "CSV"**
3. Upload: `DATA/CSV_EXPORT/fact_rural_admin.csv`
4. **Mapping**:
   - `gp_id` → `gp_id` (REQUIRED)
   - All other columns auto-map by name
5. Click **"Import"**

**Repeat for all 11 rural + 10 urban tables** (21 imports total, ~5 min each = ~1.5 hours manual)

---

## Faster Alternative: Batch Import via SQL

If Supabase allows, use their **COPY** command via SQL Editor:

```sql
-- After dim tables are populated, run for each fact table:
\COPY fact_rural_admin FROM STDIN CSV HEADER;
-- Paste CSV content or use:
COPY fact_rural_admin (gp_id, column1, column2, ...) 
FROM PROGRAM 'cat /path/to/fact_rural_admin.csv';
```

This skips the UI and imports all 21 tables in ~10 minutes total.

---

## Timeline

| Step | Time | Status |
|------|------|--------|
| CSV Export | 10s | ✅ Complete |
| Import dim_rural_gps | 1 min | ⏳ Next |
| Import dim_urban_wards | 1 min | ⏳ Next |
| Enrich CSVs with IDs | 30s | ⏳ After dims |
| Import 11 rural fact tables | ~55 min | ⏳ Manual or SQL |
| Import 10 urban fact tables | ~50 min | ⏳ Manual or SQL |
| **Total** | **~2 hours** | |

---

## Files Generated

- `DATA/CSV_EXPORT/fact_rural_*.csv` (11 files)
- `DATA/CSV_EXPORT/fact_urban_*.csv` (10 files)
- `ETL/export_to_csv.py` — CSV generation script
- `ETL/enrich_csv_with_ids.py` — ID enrichment script

---

## Why This Approach is Fast

1. **No Python pipeline needed** for initial load
2. **Excel → CSV in 10s** (fast with calamine)
3. **CSV import via UI is optimized** for batch inserts
4. **Dimension IDs auto-generated** by Supabase
5. **No row-by-row upserts** — all bulk insert

---

## Next Action

1. Go to Supabase Dashboard
2. Import `fact_rural_admin.csv` into `dim_rural_gps` (Step 1A above)
3. Come back here once dims are populated
4. Run `python ETL/enrich_csv_with_ids.py`
5. Import fact tables (21 imports, ~2 hours total)
