# Manthaan OS — Frontend

This folder contains the Next.js frontend scaffold for Manthaan OS (RITI · Viksit Rajasthan @ 2047).

Quick start:

1. cd frontend
2. npm install
3. Create `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. npm run dev

Notes:
- Aspirations are processed only in-memory (Zustand) and never stored in Supabase.
- The `lib/ruleEngine.ts` file contains the R1–R8 rules as pure functions.
- Server-only routes use `SUPABASE_SERVICE_ROLE_KEY`; the browser should only use the anon key.
