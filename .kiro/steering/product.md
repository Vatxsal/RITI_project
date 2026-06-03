# Manthaan OS — Product Overview

**Manthaan OS** is a planning intelligence platform for Viksit Rajasthan 2047. It helps government planners and administrators manage rural and urban development aspirations across Rajasthan's districts, blocks, and Gram Panchayats (GPs).

## Core Purpose

- Ingest baseline and aspiration data from field surveys (rural and urban)
- Validate aspirations against an 8-rule compliance engine (data integrity, GIS bounds, population norms, scheme assignment, priority alignment, budget ceiling, deduplication, baseline gap)
- Score GPs using a Composite Needs Index (CNI) across 11 development sectors (health, education, water, sanitation, roads, etc.)
- Visualise KPIs, district scores, sector breakdowns, and GIS maps in a dashboard
- Provide an AI planning assistant (Gemini-powered) for data-aware Q&A
- Export reports and support bulk CSV import/upload workflows

## Key Domain Concepts

- **Aspiration**: A planned development item for a GP, with quantities across three planning horizons (2030, 2035, 2047), a unit cost, and a funding status
- **CNI (Composite Needs Index)**: A weighted score (0–100) indicating how critical a GP's development needs are. Bands: Critical (≥70), Moderate (40–69), On Track (<40)
- **Rule Engine**: 8 rules (R1–R8) that validate each aspiration row before it enters the planning pipeline
- **Baseline**: Ground-truth data for each GP covering current infrastructure coverage across sectors
- **Fast-track**: Aspirations in GPs with zero baseline coverage get prioritised automatically
- **Budget split**: Costs above ₹1 Crore split 40% central / 60% state; below that, 50/50

## User Roles

- **Admin**: Full access — can upload data, view all pages, manage sessions
- The auth system uses a custom session stored in `localStorage` (`riti_auth_session`) backed by Supabase session tables. Sessions have a server-set expiry and are checked client-side every 15 seconds.

## Target Users

State-level and district-level planning officials in Rajasthan's RITI (Rural Infrastructure and Technology Initiative) or equivalent governance bodies.
