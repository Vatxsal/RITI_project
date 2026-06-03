# Tech Stack

## Frontend

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router, `^16.2.6`) with React 18 |
| Language | TypeScript 5.4 — strict mode enabled |
| Styling | Tailwind CSS 3.4 with a custom RITI colour palette (see `tailwind.config.cjs`) |
| State management | Zustand 4.4 — two stores: `lib/store.ts` (basic) and `store/aspirationStore.ts` (primary, with Supabase loaders) |
| Database client | `@supabase/supabase-js` 2.25 |
| Charts | Recharts 2.5 (most charts) and Chart.js 4 / react-chartjs-2 (some pages) |
| Tables | `@tanstack/react-table` 8.7 + `@tanstack/react-virtual` 3.7 |
| Maps | Leaflet 1.9.4 (CSS loaded via CDN in `layout.tsx`) |
| CSV parsing | PapaParse 5.4 |
| Excel | ExcelJS 4.4 |
| AI | Google Gemini API via `NEXT_PUBLIC_GEMINI_API_KEY` (model configured via `NEXT_PUBLIC_GEMINI_MODEL`) |
| Markdown rendering | `marked` |

### Path alias
`@/*` maps to the `frontend/` root (e.g. `@/lib/supabase`, `@/components/StatCard`).

### Custom Tailwind colours
Defined in `tailwind.config.cjs` under `theme.extend.colors`:
- Background: `vr-navy`, `vr-navy2–4`, `vr-bg`, `vr-sf`, `vr-sf2`
- Primary accent: `vr-orange`, `vr-orange2`
- Text: `vr-text-1/2/3`
- Status: `vr-success`, `vr-warning`, `vr-danger`, `vr-info`, `vr-cyan`, `vr-purple`, `vr-pink`

---

## Backend / Database

| Layer | Choice |
|---|---|
| Database | Supabase (PostgreSQL) |
| Admin client | `lib/supabaseAdmin.ts` — uses `SUPABASE_SERVICE_ROLE_KEY`, server-only |
| Public client | `lib/supabase.ts` — uses `NEXT_PUBLIC_SUPABASE_ANON_KEY`, safe for client |
| Materialized views | `mv_baseline_rural_district_kpis`, `mv_baseline_urban_district_kpis` |
| KPI cache table | `cache_dashboard_kpis` — keyed by `cache_key` string (`state_{areaType}_v3`, `district_{name}_{areaType}_v3`) |
| Auth sessions | `auth_sessions` table — token stored as SHA-256 hash; session cookie `riti_session` is HttpOnly |
| SQL migrations | `SUPABASE_SQL_FILES(ALREADY_CREATED_TABLES)/` — run in numeric order (001–008) |

### Supabase pagination helper
`fetchAll(table, filters, select)` in `lib/supabase.ts` paginates at 1000 rows/page with automatic retry on schema-cache errors (`PGRST002`). Use this instead of raw `.select()` for large tables.

---

## ETL (Python)

| Layer | Choice |
|---|---|
| Language | Python 3.8+ |
| Data processing | pandas 2.2, openpyxl 3.1, python-calamine |
| DB access | SQLAlchemy 2.0 + psycopg2-binary 2.9 |
| Supabase SDK | supabase-py 2.15 |
| Config | python-dotenv 1.0 — reads from `ETL/.env` |

---

## Common Commands

### Frontend
```bash
cd frontend

# Install dependencies
npm install

# Development server (run manually in terminal)
npm run dev          # http://localhost:3000

# Production build (run before deploying)
npm run build

# Lint
npm run lint

# Refresh dashboard cache
npm run refresh:cache
```

### Python ETL
```bash
cd ETL

# Activate virtualenv (Windows)
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run pipelines
python export_to_csv.py           # Excel → import-ready CSVs
python enrich_csv_with_ids.py     # Add Supabase IDs to fact CSVs
python baseline_upload.py         # Upload baseline to Supabase
python simple_csv_import.py       # Direct CSV import helper
python validate_audit.py          # Validate uploaded data
python test_timing_diagnostic.py  # Timing diagnostics
```

### Database
SQL migration files in `SUPABASE_SQL_FILES(ALREADY_CREATED_TABLES)/` must be run in order via the Supabase SQL Editor.

---

## Environment Variables

| Variable | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `frontend/.env.local` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `frontend/.env.local` | Supabase anon key (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | `frontend/.env.local` | Admin key — server API routes only |
| `NEXT_PUBLIC_GEMINI_API_KEY` | `frontend/.env.local` | Gemini AI key |
| `NEXT_PUBLIC_GEMINI_MODEL` | `frontend/.env.local` | Gemini model string |
| `SUPABASE_URL` | `ETL/.env` | Same Supabase URL for Python ETL |
| `SUPABASE_SERVICE_ROLE_KEY` | `ETL/.env` | Admin key for ETL writes |
| `DATABASE_URL` | `ETL/.env` | Direct PostgreSQL connection string |

Never commit `.env` or `.env.local`. Use `.env.example` files as templates.

---

## Deployment

- Hosted on Vercel; root directory set to `frontend/`
- All env vars set in Vercel project settings (never in git)
- `npm run build` must pass before deploying
