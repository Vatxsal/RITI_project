# Project Structure

## Root Layout

```
RITI_data_test/
├── frontend/          # Next.js app (primary codebase)
├── ETL/               # Python data pipeline scripts
├── DATA/              # Local data files (gitignored)
│   ├── RAW/           # Source Excel/CSV from field surveys
│   └── CSV_EXPORT/    # ETL-generated import-ready CSVs
├── SUPABASE_SQL_FILES(ALREADY_CREATED_TABLES)/  # DB migrations (run once, in order)
├── backend/           # Static HTML portal (minimal)
├── .env               # Root config for backend scripts (gitignored)
└── README.md
```

---

## Frontend (`frontend/`)

### `app/` — Next.js App Router pages

Each subfolder is a route. All page files are named `page.tsx`.

| Route | Purpose |
|---|---|
| `/` | Root redirect |
| `/overview` | Dashboard command centre — KPI cards, charts, area filter |
| `/aspirations` | Aspiration analytics — sector mix, filters, density |
| `/districts` | District scores and summaries |
| `/gp-ranking` | GP performance ranking table |
| `/gp-baseline` | Baseline data viewer per GP |
| `/sector/[sector]` | Dynamic sector detail page |
| `/budget-engine` | Budget allocation engine |
| `/gis-map` | Leaflet GIS map (primary) |
| `/gis-map-new` | Alternate GIS / data exploration view |
| `/ai-chat` | Gemini-powered planning assistant |
| `/reports` | Reports view |
| `/upload` | CSV upload portal |
| `/backend` | Backend upload portal |
| `/dashboard/backend` | Backend dashboard portal |
| `/login` | Admin sign-in |
| `/[view]` | Catch-all dynamic view |

API routes live under `app/api/` and are Next.js Route Handlers (server-only):

| Route | Purpose |
|---|---|
| `api/auth/login` | Custom credential login — writes session to `auth_sessions` |
| `api/auth/logout` | Clears session cookie |
| `api/dashboard/kpis` | Main KPI aggregation — checks `cache_dashboard_kpis` first, then live materialized views |
| `api/gp-baseline` | GP baseline data fetch |
| `api/gp-search` | GP search/autocomplete |
| `api/sidebar-stats` | Sidebar stat counts |
| `api/stats` | General stats |
| `api/compliance-norms` | Compliance norm lookups |
| `api/chat` | AI chat route (Gemini) |

### `components/`

| Path | Contents |
|---|---|
| `components/dashboard/` | `DashboardLayout`, `DashboardFrame`, `Sidebar`, `Topbar`, `RightPanel`, `KPICard`, `Map`, `charts/` |
| `components/aspirations/` | Aspiration-specific components |
| `components/layout/` | Shared layout primitives |
| `components/upload/` | Upload UI components |
| `components/AuthProvider.tsx` | Auth context — `useAuth()` hook, login/logout, localStorage session |
| `components/FilterContext.tsx` | Shared filter state via React context |
| `components/StatCard.tsx` | Reusable KPI stat card |
| `components/Chips.tsx` | Tag/chip UI component |

### `lib/`

| File | Purpose |
|---|---|
| `supabase.ts` | Public Supabase client + `fetchAll()` pagination helper |
| `supabaseAdmin.ts` | Admin Supabase client (server-only, service role key) |
| `types.ts` | Shared TypeScript types — `AspirationRow`, `RuleResult` |
| `ruleEngine.ts` | 8-rule validation engine (R1–R8) + `computeBudgetSplit()` |
| `cniEngine.ts` | CNI scoring with sector weights + `bandFromCNI()` |
| `dashboard-kpis.ts` | `fetchDashboardKpis()`, `DashboardKpiPayload` type, format helpers |
| `budgetEngine.ts` | Budget allocation logic |
| `aiContext.ts` | Gemini AI context builder |
| `data.ts` | Static reference data |
| `store.ts` | Basic Zustand store (legacy, minimal) |
| `cache/` | Dashboard cache refresh utilities |
| `client/` | Client-side fetch helpers |
| `utils/` | General utility functions |

### `store/`

| File | Purpose |
|---|---|
| `aspirationStore.ts` | Primary Zustand store — holds `aspirationData`, `ruleResults`, `baselineCache`, `complianceNorms`; contains `loadBaselineCache()` and `loadComplianceNorms()` async loaders |

### `types/`
Shared TypeScript declaration files.

---

## ETL (`ETL/`)

| File | Purpose |
|---|---|
| `export_to_csv.py` | Converts raw Excel baselines to import-ready CSVs |
| `enrich_csv_with_ids.py` | Enriches fact CSVs with Supabase dimension IDs |
| `baseline_upload.py` | Uploads processed baseline data to Supabase |
| `simple_csv_import.py` | Direct CSV import helper for smaller loads |
| `validate_audit.py` | Post-import validation and audit |
| `test_timing_diagnostic.py` | Performance timing tests |
| `requirements.txt` | Python dependencies |
| `.env.example` | Template for `ETL/.env` |

---

## Database Migrations (`SUPABASE_SQL_FILES/`)

Run via Supabase SQL Editor in this order:

| File | Creates |
|---|---|
| `001_rural_baseline_foundation.sql` | Rural GP dimension + baseline fact tables |
| `002_indicator_master.sql` | Indicator master table |
| `003_urban_baseline_foundations.sql` | Urban ward dimension + baseline tables |
| `004_aspiration_storage.sql` | Aspiration staging tables |
| `005_auth_sessions_rbac.sql` | `auth_sessions` table + RBAC policies |
| `006_dashboard_kpi_cache.sql` | `cache_dashboard_kpis` cache table |
| `007_aspirations_table.sql` | Aspirations main table |
| `008_generated_reports.sql` | Reports storage table |
| `baseline_materialized_views.sql` | `mv_baseline_rural_district_kpis` + `mv_baseline_urban_district_kpis` |

---

## Key Conventions

- **All pages are `"use client"` components** unless they are API routes or pure server components. Pages that fetch data do so in `useEffect` after mount.
- **API routes use the admin Supabase client** (`supabaseAdmin.ts`) for writes; page components and client-side code use the public client (`supabase.ts`).
- **State flows through `aspirationStore`** — upload pages write to it, dashboard pages read from it. Don't bypass the store for aspiration/rule result data.
- **Dashboard KPI API checks cache first** (`cache_dashboard_kpis`) before querying materialized views. Always upsert new results back into the cache after a live query.
- **`fetchAll()` for any large table** — never use a bare `.select()` without `.range()` on tables that can exceed 1000 rows.
- **Tailwind for all styling** — use `vr-*` colour tokens for anything that matches the RITI design system; use standard Tailwind zinc/slate/blue tokens for general UI chrome.
- **No test framework is set up** — validate changes by running `npm run build` and checking for TypeScript errors.
