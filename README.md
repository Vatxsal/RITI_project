# Manthaan OS — Planning Intelligence for Viksit Rajasthan 2047

A planning intelligence platform for aspirational governance under the **Viksit Rajasthan @ 2047** initiative by **Aasvaa Innovation Labs**. Combines Supabase-backed data services, GIS visualization, authentication, ETL tooling, and dashboard analytics across **41 districts** of Rajasthan.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Features](#features)
4. [Pages & Routes](#pages--routes)
5. [API Routes](#api-routes)
6. [Database Schema](#database-schema)
7. [Component Architecture](#component-architecture)
8. [State Management](#state-management)
9. [AI Integration](#ai-integration)
10. [Data Model — 41 Districts & 11 Sectors](#data-model--41-districts--11-sectors)
11. [ETL Pipeline](#etl-pipeline)
12. [Validation & Scoring Engines](#validation--scoring-engines)
13. [Authentication & RBAC](#authentication--rbac)
14. [Cache System](#cache-system)
15. [Quick Start](#quick-start)
16. [Environment Variables](#environment-variables)
17. [Deployment](#deployment)
18. [Project Structure](#project-structure)
19. [Tech Stack](#tech-stack)
20. [Current Status](#current-status)

---

## Project Overview

**Manthaan OS** is a full-stack planning intelligence platform designed to support data-driven governance for **Viksit Rajasthan @ 2047**. It provides:

- **Command Center Dashboard** — Real-time KPI monitoring across 11 development sectors
- **Aspiration Analytics** — Track and manage aspirational projects across rural/urban areas
- **GIS Mapping** — Spatial visualization of district-level development data
- **AI Planning Assistant** — Gemini-powered chat with live data context
- **Report Generation** — AI-powered planning intelligence briefs with drill-down from state → district → block → GP/ward level
- **Data Validation** — 8-rule engine + CNI scoring for data quality and prioritization
- **ETL Pipeline** — Excel → Supabase data ingestion via baseline_upload.py

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Next.js 16 App                    │
│  ┌─────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │ Pages   │  │ API      │  │ Components        │  │
│  │ (16)    │  │ Routes   │  │ (20+)             │  │
│  └────┬────┘  └────┬─────┘  └────────┬──────────┘  │
│       │            │                  │             │
│  ┌────┴────────────┴──────────────────┴──────────┐  │
│  │           Lib Layer (12 files)                │  │
│  │  supabase.ts │ data.ts │ ruleEngine.ts        │  │
│  │  cniEngine.ts │ aiContext.ts │ dashboard-kpis │  │
│  └─────────────────────┬─────────────────────────┘  │
│                        │                            │
│  ┌─────────────────────┴─────────────────────────┐  │
│  │           Zustand Store (2 stores)            │  │
│  └─────────────────────┬─────────────────────────┘  │
└────────────────────────┼────────────────────────────┘
                         │
┌────────────────────────┼────────────────────────────┐
│              Supabase (PostgreSQL)                   │
│  ┌──────────┐ ┌──────────────┐ ┌────────────────┐  │
│  │ Baseline │ │ Aspiration   │ │ Materialized    │  │
│  │ Tables   │ │ Tables       │ │ Views (3)       │  │
│  └──────────┘ └──────────────┘ └────────────────┘  │
│  ┌──────────┐ ┌──────────────┐ ┌────────────────┐  │
│  │ Auth     │ │ Cache Tables │ │ RPC Functions   │  │
│  │ Sessions │ │              │ │ (3)             │  │
│  └──────────┘ └──────────────┘ └────────────────┘  │
└────────────────────────────────────────────────────┘
                         │
┌────────────────────────┼────────────────────────────┐
│              ETL Pipeline (Python)                   │
│              baseline_upload.py                      │
└────────────────────────────────────────────────────┘
```

### Data Flow

```
Excel Baseline Files
       ↓
ETL Pipeline (Python)
  - baseline_upload.py (reads RURAL_BASELINE.xlsx + URBAN_BASELINE.xlsx)
       ↓
Supabase PostgreSQL
  - Baseline tables (baseline_rural, baseline_urban)
  - Aspiration tables (aspirations_rural, aspirations_urban)
  - Materialized Views (district KPIs, aspirations summary)
  - Cache tables (dashboard KPI cache, generated_reports)
       ↓
Next.js API Routes (server-side)
  - Dashboard KPI aggregation (/api/dashboard/kpis)
  - GP baseline lookup (/api/gp-baseline)
  - AI chat context building (/api/chat)
  - Authentication (/api/auth/login, /api/auth/logout)
       ↓
React Components (client-side)
  - DashboardLayout, Sidebar, Topbar
  - KPICard, charts (Recharts, Chart.js)
  - GIS Map (Leaflet)
  - Data tables (TanStack Table)
       ↓
User Interface (16 routes)
```

---

## Features

### ✅ Dashboard & Analytics
| Feature | Description |
|---------|-------------|
| **Command Center** (`/`) | 9 KPI cards, sector pie charts, aspiration status mix, top strategic aspirations table, sector-wise top aspirations grid, year filter pills (2030/2035/2047), urban/rural/all filter |
| **District Scores** (`/districts`) | Sortable/searchable table of 41 districts with composite scores and 11 sector scores |
| **Sector Dashboards** (`/sector/[sector]`) | 11 dynamic sector pages with baseline KPIs, aspiration data, district rankings, AI-generated insights |
| **GP Performance Ranking** (`/gp-ranking`) | Zone/tribal/desert-aware ranking with CNI banding (Critical/Moderate/On Track) |
| **GP Baseline Viewer** (`/gp-baseline`) | Lookup by GP ID or Ward ID, fetches from baseline tables |

### ✅ GIS & Mapping
| Feature | Description |
|---------|-------------|
| **Primary GIS Map** (`/gis-map`) | Leaflet with 41 district circle markers (score-based coloring), predicate builder, layer toggles (schools, health, AYUSH, police, anganwadi) — [currently hidden — not shown in navigation] |
| **Alternate GIS View** (`/gis-map-new`) | Simplified map with area-type filter and demo markers |

### ✅ AI Planning Assistant
| Feature | Description |
|---------|-------------|
| **AI Chat** (`/ai-chat`) | Manthaan AI-powered chat with Markdown rendering, copy button, suggestion buttons, loading animation |
| **Context Builder** (`aiContext.ts`, 862 lines) | Intelligent query parser detecting districts (41 in English & Hindi), sectors (12 with keyword maps), intent classification (FULL_REPORT/INTERVENTIONS/COMPARISON/GENERAL), fetches live Supabase baseline data |

### ✅ Data Management
| Feature | Description |
|---------|-------------|
| **CSV Upload Portal** (`/upload`) | Drag-and-drop CSV dropzone with data preview |
| **Backend Portal** (`/backend`) | Super-admin static HTML portal for data management |
| **Cache System** | `cache_dashboard_kpis` table with keyed caching, refresh endpoint, manual refresh button |
| **Cache Refresh** (`/api/dashboard/refresh`) | Clears cache, refreshes materialized views and aspiration summaries |

### ✅ Validation & Processing
| Feature | Description |
|---------|-------------|
| **8-Rule Validation Engine** | R1 (Integrity), R2 (GIS bounds), R3 (Population Norm), R4 (Scheme), R5 (Priority), R6 (Budget Ceiling 50Cr), R7 (Duplicate), R8 (Baseline Gap/Fast-track) |
| **CNI Scoring Engine** | Weighted sector scoring (health 22%, education 22%, water 13%, etc.) with desert/tribal adjustments |
| **Web Worker** | Offloads rule computation to background thread via `public/workers/ruleWorker.js` |

### ✅ Reports & Export
| Feature | Description |
|---------|-------------|
| **Report Library** (`/reports`, ~3200 lines) | Full-featured AI-powered planning intelligence brief generation with Hindi (Devanagari) UI. **Three report tabs:** Rural (GP Level) — district → block → GP drill-down; Urban (Ward Level) — district → ULB → ward drill-down; District (Full) — aggregates both rural + urban baseline data, paginates aspirations (1000/page) to avoid Supabase row cap. **7-page report structure:** Cover, Demographic Structure, 4 thematic sector pages (जन एवं समाज, आजीविका एवं अर्थव्यवस्था, मूलभूत संरचना, पर्यावरण एवं विरासत), Strategic Development Framework. **Gemini AI narrative generation** with a 5-model fallback chain (tries each model up to 2 times before moving on): `gemini-3.1-flash-lite` → `gemini-3.1-flash` → `gemini-2.5-flash` → `gemini-2.0-flash` → `gemini-1.5-flash`. **Aspiration filtering** uses `PAGE_DEPT_NAMES` mapping (dept-first, not keyword-based) — aspirations are routed by their sector/dept DB column to the correct thematic page. **SECTOR_EXCLUDED_ITEMS** per-sector exclusion sets and **ITEM_ORDER_MAP** for canonical sort order (~130 items from Aspiration_Grouping Excel). **PAGE_SUB_SECTOR_MAP** ensures sub-sector diversity (2 rows per sub-sector). ShortenMetricValue() helper compacts large numbers (Cr/L/K) in metric cards. Report history saved to `generated_reports` Supabase table with Open + PDF download buttons. **Error branding:** all Gemini errors shown as "Manthaan AI" errors in Hindi, no model names exposed to user. Scope-aware metric cards (e.g. FHTC card shows GP %, block avg, or district count depending on level). |

---

## Pages & Routes

| Route | File (lines) | Purpose |
|-------|-------------|---------|
| `/` | `app/page.tsx` (717) | **Command Center** — Main dashboard with KPI cards, sector charts, aspiration analytics, year/area filters |
| `/login` | `app/login/page.tsx` (246) | **Admin Login** — Two-panel layout, username/password/role form, displays dev credentials |
| `/overview` | Same as `/` | Alias to Command Center |
| `/aspirations` | `app/aspirations/page.tsx` (77) | **Aspiration Analytics** — Filterable table with district/block/status/priority/search, stats summary |
| `/districts` | `app/districts/page.tsx` (129) | **District Scores** — Searchable/sortable table of 41 districts with composite scores |
| `/gp-ranking` | `app/gp-ranking/page.tsx` (184) | **GP Performance Ranking** — Zone-aware ranking with CNI banding |
| `/gp-baseline` | `app/gp-baseline/page.tsx` (115) | **GP Baseline Viewer** — Lookup by GP/Ward ID across baseline tables |
| `/sector/[sector]` | `app/sector/[sector]/page.tsx` (783) | **Sector Detail Pages** — 11 dynamic sector dashboards |
| `/gis-map` | `app/gis-map/page.tsx` (400) | **GIS Map** — Leaflet with predicate builder, layer toggles, district markers [currently hidden — not shown in navigation] |
| `/gis-map-new` | `app/gis-map-new/page.tsx` (103) | **Alternate GIS View** — Simplified map with area-type filter |
| `/ai-chat` | `app/ai-chat/page.tsx` (177) | **AI Planning Assistant** — Manthaan AI-powered chat with Markdown rendering |
| `/reports` | `app/reports/page.tsx` (~3200) | **Report Library** — Full-featured report engine with 3 tabs, Gemini narrative generation, report history |
| `/upload` | `app/upload/page.tsx` (16) | **CSV Upload Portal** — Drag-and-drop with data preview |
| `/backend` | `app/backend/page.tsx` (55) | **Backend Portal Gate** — Super-admin only, links to static HTML portal |
| `/dashboard/backend` | `app/dashboard/backend/page.tsx` (5) | Redirect to `/backend` |
| `/[view]` | `app/[view]/page.tsx` (22) | **Catch-all** — Maps view slugs to DashboardFrame |

---

## API Routes

| Method | Route | File (lines) | Purpose |
|--------|-------|-------------|---------|
| POST | `/api/auth/login` | `api/auth/login/route.ts` (70) | Validates credentials, creates SHA-256 session token, sets HttpOnly cookie |
| POST | `/api/auth/logout` | `api/auth/logout/route.ts` (36) | Revokes session in DB, clears cookie |
| GET | `/api/dashboard/kpis` | `api/dashboard/kpis/route.ts` (416) | Main KPI aggregation — checks cache, queries materialized views, computes 11 sector scores per district |
| POST | `/api/dashboard/refresh` | `api/dashboard/refresh/route.ts` (42) | Clears KPI cache, refreshes materialized views and aspiration summaries |
| GET | `/api/gp-baseline` | `api/gp-baseline/route.ts` (35) | Fetches baseline tables for given GP/Ward ID |
| GET | `/api/gp-search` | `api/gp-search/route.ts` (24) | Autocomplete search against baseline tables |
| GET | `/api/sidebar-stats` | `api/sidebar-stats/route.ts` (68) | Rural GP count, urban ward count, data quality |
| GET | `/api/stats` | `api/stats/route.ts` (34) | District count (41), block count (457), GP count (14,404) |
| GET | `/api/compliance-norms` | `api/compliance-norms/route.ts` (12) | Fetches compliance norms from Supabase |
| POST | `/api/chat` | `api/chat/route.ts` (118) | AI Chat — builds context via aiContext.ts, calls Google Gemini API with model fallback chain |

---

## Database Schema

### Baseline Tables
| Table | Purpose |
|-------|---------|
| `baseline_rural` | Raw rural baseline data (denormalized, 200+ columns per GP) |
| `baseline_urban` | Raw urban baseline data (denormalized, 200+ columns per ward) |

### Aspiration Tables
| Table | Purpose |
|-------|---------|
| `aspirations_rural` | Rural aspiration data |
| `aspirations_urban` | Urban aspiration data |

### System Tables
| Table | Purpose |
|-------|---------|
| `auth_sessions` | Session records (username, user_type, token_hash, ip, user_agent, expires_at, revoked_at) |
| `cache_dashboard_kpis` | Precomputed KPI cache (cache_key, district, area_type, kpi_data JSONB, computed_at) |
| `compliance_norms` | Compliance norm reference data |
| `generated_reports` | Generated report storage |

### Materialized Views
| View | Lines | Purpose |
|------|-------|---------|
| `mv_baseline_rural_district_kpis` | 522 (file) | Pre-aggregated district-level KPIs from 200+ columns of baseline_rural |
| `mv_baseline_urban_district_kpis` | Same file | Pre-aggregated district-level KPIs from baseline_urban |
| `mv_aspirations_summary` | Same file | Aggregated aspiration summaries by district/sector/item/status |

### SQL Migrations
| File | Lines | Purpose |
|------|-------|---------|
| `baseline_materialized_views.sql` | 522 | Creates 3 materialized views, 15+ indexes, 3 RPC functions |
| `005_auth_sessions_rbac.sql` | 55 | Auth sessions table with RLS policies |
| `006_dashboard_kpi_cache.sql` | 17 | Dashboard KPI cache table |
| `007_aspirations_table.sql` | — | Aspirations table schema |
| `008_generated_reports.sql` | — | Generated reports table |

### RPC Functions
- `refresh_materialized_views()` — Refreshes all 3 materialized views
- `refresh_aspirations_summary()` — Quick refresh of aspirations MV only

---

## Component Architecture

### Dashboard Layout (`components/dashboard/`)
| Component | Lines | Purpose |
|-----------|-------|---------|
| `DashboardLayout.tsx` | 84 | Main wrapper — auth check, sidebar, topbar, right panel, filter provider, mobile responsive |
| `Sidebar.tsx` | 174 | Navigation — brand logo, Command Center, Report Library, Talk to Data, 11 sector links, mobile overlay |
| `Topbar.tsx` | 254 | Header — district selector (41), area-type filter, ask-AI button, refresh button, session info, user badge, logout |
| `RightPanel.tsx` | 118 | Slide-in district detail — 11-sector scores, key metrics, snapshot |
| `KPICard.tsx` | 41 | Reusable KPI card with label, value, status, color-keyed progress bar |
| `Map.tsx` | 257 | Leaflet GIS map — 41 district circle markers with score-based coloring |
| `DashboardFrame.tsx` | 14 | Placeholder frame component |

### Charts (`components/dashboard/charts/`)
| Component | Lines | Purpose |
|-----------|-------|---------|
| `RadarChart.tsx` | 45 | Chart.js Radar chart for sector scores |
| `SectorBarChart.tsx` | 35 | Chart.js horizontal bar chart |
| `SectorDistributionChart.tsx` | — | Sector distribution visualization |

### Shared Components
| Component | Lines | Purpose |
|-----------|-------|---------|
| `AuthProvider.tsx` | 129 | Auth context with `useAuth()` hook, login/logout, localStorage session, 15-second expiry check |
| `FilterContext.tsx` | 33 | Shared filter state — `selectedDistrict`, `urbanFilter`, `useFilter()` hook |
| `Chips.tsx` | — | Tag/chip UI element |
| `StatCard.tsx` | — | Reusable stat card |
| `AspirationTable.tsx` | — | Aspiration data table |
| `CSVDropzone.tsx` | — | Drag-and-drop CSV upload zone |
| `DataPreview.tsx` | — | Uploaded CSV data preview |

---

## State Management

### Zustand Stores
| Store | File (lines) | State | Actions |
|-------|-------------|-------|---------|
| `aspirationStore.ts` | 52 | `aspirationData`, `ruleResults`, `baselineCache`, `complianceNorms` | `loadBaselineCache()`, `loadComplianceNorms()` |
| `lib/store.ts` | 16 | Legacy minimal store | — |

### React Contexts
| Context | File (lines) | State |
|---------|-------------|-------|
| `AuthProvider` | 129 | `user`, `userType`, `token`, `isAuthenticated`, `login()`, `logout()` |
| `FilterContext` | 33 | `selectedDistrict`, `urbanFilter` |

---

## AI Integration

### Architecture
```
User Query → /api/chat → aiContext.ts → Gemini API → Markdown Response
                              ↓
                    Supabase (live data)
                    - District baselines
                    - Sector KPIs
                    - Aspiration data
```

### aiContext.ts (862 lines)
- **District Detection**: All 41 districts in English & Hindi
- **Sector Detection**: 12 sectors with keyword maps
- **Intent Classification**: FULL_REPORT, INTERVENTIONS, COMPARISON, GENERAL
- **Data Aggregation**: Fetches live baseline data per district/sector
- **Prompt Builder**: Constructs comprehensive Gemini prompts with 11-sector metrics

### Gemini Model Fallback Chain (AI Chat)
1. `gemini-3-flash-preview`
2. `gemini-3-pro-preview`
3. `gemini-3-flash-thinking`
4. `gemini-3-pro-thinking`

### Gemini Model Fallback Chain (Report Generation)
1. `gemini-3.1-flash-lite`
2. `gemini-3.1-flash`
3. `gemini-2.5-flash`
4. `gemini-2.0-flash`
5. `gemini-1.5-flash`

Each model is tried up to 2 times for transient errors (503/429). The AI is branded as **Manthaan AI** throughout user-facing UI, with error messages in Hindi (Devanagari). Technical model names are never exposed to users.

---

## Data Model — 41 Districts & 11 Sectors

### 11 Development Sectors
| Key | Label | Weight | Example Metrics |
|-----|-------|--------|-----------------|
| water | Water & Sanitation | 13% | FHTC, JJM, groundwater depth |
| health | Health & Nutrition | 22% | SAM children, Ayushman, beds, AWC, ASHA |
| agri | Agriculture | — | Irrigation %, PM-Kisan, KCC |
| dairy | Dairy & Livestock | — | Milk production, milch animals |
| edu | Education | 22% | Schools, enrollment, dropout |
| employ | Employment & Skills | — | SHG, Lakhpati Didi, DDU-GKY |
| women | Social Empowerment | — | Gender parity, Shakti |
| welfare | Welfare & Housing | — | PM Awas, pensions |
| infra | Infrastructure | — | Roads, electricity, sewerage |
| tourism | Tourism & Heritage | — | Heritage sites, fairs |
| env | Environment & Forest | — | Afforestation, CAMPA |

### 41 Districts Reference Data
Stored in `lib/data.ts` (202 lines, 41 entries) with 30+ metrics per district:
- Identifiers: name, GP count (14,404 total), block count (457), population
- Infrastructure: FHTC, irrigation, groundwater
- Social: SHG, Lakhpati Didi, pensions
- Health: SAM children, Ayushman coverage, hospital beds
- Scores: 11 sector scores + composite development score (0-100)

---

## ETL Pipeline

### Python Scripts (`ETL/`)

| Script | Lines | Purpose |
|--------|-------|---------|
| `baseline_upload.py` | 653 | **Active pipeline** — Reads `RURAL_BASELINE.xlsx` and `URBAN_BASELINE.xlsx` directly, normalizes Unicode (NFC), converts numeric columns to float64, truncates and inserts into `baseline_rural` and `baseline_urban` tables via psycopg2 batch inserts. Includes row-level error recovery and schema cache retry logic. |

### Data Ingestion Flow
```
Excel Files
  ├── RURAL_BASELINE.xlsx → baseline_upload.py → baseline_rural
  └── URBAN_BASELINE.xlsx → baseline_upload.py → baseline_urban
```

Data is uploaded directly via `baseline_upload.py` — the sole active ETL script. Other scripts (`export_to_csv.py`, `enrich_csv_with_ids.py`, `validate_audit.py`, `test_timing_diagnostic.py`, `simple_csv_import.py`) exist in the repo but are not part of the current workflow.

### Dependencies (`requirements.txt`)
```
pandas, SQLAlchemy, psycopg2-binary, openpyxl, python-dotenv, supabase-py, python-calamine
```

---

## Validation & Scoring Engines

### 8-Rule Validation Engine (`lib/ruleEngine.ts`, 105 lines)

| Rule | Code | Description |
|------|------|-------------|
| R1 | Integrity | Missing fields, required data validation |
| R2 | GIS Bounds | Latitude/longitude within Rajasthan bounds |
| R3 | Population Norm | Compliance with population-based norms |
| R4 | Scheme | Scheme name requirement validation |
| R5 | Priority Alignment | Alignment with development priorities |
| R6 | Budget Ceiling | Per-item budget cap of ₹50 Cr |
| R7 | Duplicate | Duplicate aspiration detection |
| R8 | Baseline Gap/Fast-track | Gap analysis enabling fast-track processing |

### CNI Scoring Engine (`lib/cniEngine.ts`, 60 lines)

- **Sector Weights**: Health 22%, Education 22%, Water 13%, Infrastructure 11%, Agriculture 8%, etc.
- **Adjustments**: Desert zone, tribal zone, urban zone modifiers
- **Banding**: `bandFromCNI()` → Critical, Moderate, On Track

---

## Authentication & RBAC

### Login Credentials
- **Username:** `sakshamaasvaa`
- **Password:** `Aasvaa@2026`
- **Roles:** `admin` (standard), `super_admin` (backend access)

### Session Flow
```
Login → Credentials validated (hardcoded)
      → SHA-256 session token generated
      → Session stored in auth_sessions (Supabase)
      → riti_session HttpOnly cookie set (30-min expiry)
      → Every 15s: AuthProvider checks session validity
      → Logout: Session revoked in DB, cookie cleared
```

### Route Protection
- `DashboardLayout.tsx` checks authentication state
- Backend routes restricted to `super_admin` role
- Login page redirects authenticated users to overview

---

## Cache System

### Architecture
```
Request → /api/dashboard/kpis
        → Check cache_dashboard_kpis (cache hit → return)
        → Query materialized views (cache miss)
        → Compute KPIs
        → Store in cache_dashboard_kpis
        → Return response
```

### Cache Components
| Component | Description |
|-----------|-------------|
| `cache_dashboard_kpis` table | Keyed by (cache_key, district, area_type), stores JSONB payloads |
| `/api/dashboard/refresh` | Clears cache, calls refresh RPCs |
| Manual refresh button | In Topbar for on-demand refresh |
| Cache key strategy | District + area_type + year combination |

### Geo Lookup Cache (`lib/cache/refresh_cache_dashboard.ts`)
Provides sessionStorage-backed lookup functions used by the Reports page for drill-down selectors:
- **`fetchBlocksForDistrict(district)`** — Returns blocks for a given district with Hindi/English paired names
- **`fetchGpsForBlock(district, block)`** — Returns GPs within a block with Hindi/English paired names
- **`fetchUlbsForDistrict(district)`** — Returns ULBs for a given district
- **`fetchWardsForUlb(district, ulb)`** — Returns wards within a ULB

Also provides `fetchAspirationsKpis()` and `fetchSectorPageData()` with in-memory 10-minute/5-minute TTL caching for dashboard and sector page data.

---

## Quick Start

### Prerequisites
- **Node.js** 18+
- **Python** 3.8+
- **Supabase Account** (database backend)
- **Google AI API Key** (for Gemini features)

### 1. Clone & Install
```bash
git clone <repo-url>
cd RITI_data_test
cd frontend
npm install
```

### 2. Configure Environment
Create `frontend/.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_GEMINI_API_KEY=your-gemini-key
NEXT_PUBLIC_GEMINI_MODEL=gemini-3-flash-preview
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Setup Database
Run SQL migrations in order from `SUPABASE_SQL_FILES(ALREADY_CREATED_TABLES)/`:
1. `new_updated_baseline.sql`
2. `005_auth_sessions_rbac.sql`
3. `006_dashboard_kpi_cache.sql`
4. `007_aspirations_table.sql`
5. `008_generated_reports.sql`
6. `baseline_materialized_views.sql`

### 4. Load Data
```bash
cd ETL
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
python baseline_upload.py
```

### 5. Run
```bash
cd frontend
npm run dev
# Open http://localhost:3000
```

---

## Environment Variables

| Variable | Visibility | Purpose | Required |
|----------|-----------|---------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Supabase anon key | ✅ |
| `NEXT_PUBLIC_GEMINI_API_KEY` | Public | Gemini API key | ✅ |
| `NEXT_PUBLIC_GEMINI_MODEL` | Public | Gemini model version | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | 🔒 Secret | Admin Supabase access (server-only) | ✅ |
| `DATABASE_URL` | 🔒 Secret | Direct PostgreSQL connection | Optional |

---

## Deployment

### Vercel (Production)
- **Root Directory:** `frontend/`
- **Build Command:** `npm run build`
- **Auto-deploys** on push to `main`
- Set all environment variables in Vercel dashboard

### Build Verification
```bash
cd frontend
npm run build
# Must pass without errors
```

---

## Project Structure

```
RITI_data_test/
├── frontend/                     # Next.js 16 application
│   ├── app/                      # App Router (pages + API)
│   │   ├── page.tsx              # Command Center (/)
│   │   ├── login/page.tsx        # Admin Login
│   │   ├── aspirations/page.tsx  # Aspiration Analytics
│   │   ├── districts/page.tsx    # District Scores
│   │   ├── gp-ranking/page.tsx   # GP Ranking
│   │   ├── gp-baseline/page.tsx  # GP Baseline Viewer
│   │   ├── sector/[sector]/page.tsx  # Sector Dashboards
│   │   ├── gis-map/page.tsx      # GIS Map (hidden from nav)
│   │   ├── gis-map-new/page.tsx  # Alternate GIS
│   │   ├── ai-chat/page.tsx      # AI Chat
│   │   ├── reports/page.tsx      # Report Library
│   │   ├── upload/page.tsx       # CSV Upload
│   │   ├── backend/page.tsx      # Backend Portal
│   │   └── api/                  # API Routes
│   │       ├── auth/login/route.ts
│   │       ├── auth/logout/route.ts
│   │       ├── dashboard/kpis/route.ts
│   │       ├── dashboard/refresh/route.ts
│   │       ├── gp-baseline/route.ts
│   │       ├── gp-search/route.ts
│   │       ├── sidebar-stats/route.ts
│   │       ├── stats/route.ts
│   │       ├── compliance-norms/route.ts
│   │       └── chat/route.ts
│   ├── components/               # React Components
│   │   ├── dashboard/            # Dashboard Layout components
│   │   │   ├── DashboardLayout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Topbar.tsx
│   │   │   ├── RightPanel.tsx
│   │   │   ├── KPICard.tsx
│   │   │   ├── Map.tsx
│   │   │   └── charts/           # Chart components
│   │   ├── upload/               # Upload components
│   │   ├── AuthProvider.tsx      # Auth context
│   │   ├── FilterContext.tsx     # Filter context
│   │   └── aspirations/          # Aspiration components
│   ├── lib/                      # Utilities
│   │   ├── supabase.ts           # Supabase client + fetchAll()
│   │   ├── supabaseAdmin.ts      # Admin Supabase client
│   │   ├── data.ts               # 41 districts, 11 sectors
│   │   ├── types.ts              # Shared TypeScript types
│   │   ├── ruleEngine.ts         # 8-Rule validation
│   │   ├── cniEngine.ts          # CNI scoring
│   │   ├── budgetEngine.ts       # Budget allocation
│   │   ├── aiContext.ts          # AI context builder
│   │   ├── dashboard-kpis.ts     # KPI types & fetchers
│   │   ├── store.ts              # Legacy store
│   │   └── cache/                # Cache utilities
│   ├── store/                    # Zustand stores
│   │   └── aspirationStore.ts    # Primary store
│   ├── public/                   # Static assets
│   │   ├── backend/index.html    # Static backend portal
│   │   └── workers/ruleWorker.js # Web worker
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   ├── tailwind.config.cjs
│   └── vercel.json
│
├── ETL/                          # Python ETL pipeline
│   ├── baseline_upload.py        # Upload to Supabase (active)
│   ├── export_to_csv.py          # Excel → CSVs (archived)
│   ├── enrich_csv_with_ids.py    # Add Supabase IDs (archived)
│   ├── simple_csv_import.py      # CSV import helper (archived)
│   ├── validate_audit.py         # Data validation (archived)
│   ├── test_timing_diagnostic.py # Performance diagnostics (archived)
│   ├── requirements.txt
│   └── .env.example
│
├── SUPABASE_SQL_FILES(ALREADY_CREATED_TABLES)/
│   ├── new_updated_baseline.sql
│   ├── 005_auth_sessions_rbac.sql
│   ├── 006_dashboard_kpi_cache.sql
│   ├── 007_aspirations_table.sql
│   ├── 008_generated_reports.sql
│   └── baseline_materialized_views.sql  (522 lines)
│
├── .kiro/steering/               # Product docs
│   ├── product.md
│   ├── structure.md
│   └── tech.md
│
├── README.md
├── CSV_IMPORT_GUIDE.md
├── .gitignore
└── .env.example
```

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Framework** | Next.js | ^16.2.6 |
| **UI Library** | React | 18.2.0 |
| **Language** | TypeScript | 5.4.4 |
| **Styling** | Tailwind CSS | 3.4.19 |
| **State Management** | Zustand | 4.4.0 |
| **Database** | Supabase (PostgreSQL) | — |
| **DB Client** | @supabase/supabase-js | 2.25.0 |
| **Maps** | Leaflet | 1.9.4 |
| **Charts** | Recharts + Chart.js | 2.5.0 / 4.5.1 |
| **Tables** | TanStack React Table | 8.7.0 |
| **Virtualization** | TanStack React Virtual | 3.7.0 |
| **AI** | Google Gemini API | — |
| **CSV** | PapaParse | 5.4.1 |
| **Excel** | ExcelJS | 4.4.0 |
| **Markdown** | marked | 18.0.3 |
| **ETL** | Python (pandas, SQLAlchemy) | 3.8+ |
| **Deployment** | Vercel | — |

---

## Current Status

### Implemented & Working (Complete)
- All 16 routes rendering correctly
- 10 API routes functional with Supabase integration
- Authentication with session management (admin + super_admin roles)
- Command Center dashboard with live KPI cards, charts, and filters
- All 11 sector dashboards with baseline data and aspiration analytics
- 41-district scores page with sorting and search
- GP performance ranking with CNI banding (Critical/Moderate/On Track)
- GP baseline viewer with multi-table baseline data
- GIS Map with district markers, predicate builder, and layer toggles (hidden from navigation)
- AI Chat with Manthaan AI branding, Gemini integration, and live data context
- Full report library with rural/urban/district tabs, Gemini-powered narrative generation with 5-model fallback chain
- CSV upload portal with dropzone and preview
- Backend portal for super-admin data management
- Cache system (cache_dashboard_kpis + refresh endpoint + geo lookup cache)
- Materialized views for dashboard performance
- ETL pipeline via baseline_upload.py (Excel → Supabase)
- 8-rule validation engine + CNI scoring engine
- Build passes (`npm run build` succeeds)
- Vercel deployment configuration

### Known Gaps
- Some API route directories exist but are empty (`api/aspirations/kpis/`, `api/backend/ingest/`, `api/cache-invalidate/`, `api/warm-aspirations/`)
- Old middleware file present but unused (`middleware_old.ts`)
- Education baseline data (schools, teachers, enrollment) not yet loaded in CDO baseline for rural GP reports — AWC and ASHA data used as proxy
- Budget Engine page and lib/budgetEngine.ts still present in codebase but deprecated (removed from feature documentation)

---

## Git Branches
- `main` — Primary development branch
- `raghav/main` — Secondary remote origin

---

**Last Updated:** June 2026  
**Status:** Active Development  
**Built by:** Aasvaa Innovation Labs for Viksit Rajasthan @ 2047
