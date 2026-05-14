-- Session table for dashboard login RBAC (admin only)
-- Apply this script in Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.auth_sessions (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  user_type text not null check (user_type in ('admin')),
  token_hash text not null unique,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists idx_auth_sessions_expires_at on public.auth_sessions (expires_at);
create index if not exists idx_auth_sessions_username on public.auth_sessions (username);

alter table public.auth_sessions enable row level security;

-- App writes/updates this table via service role key from server routes.
-- Block direct anon/authenticated access by default.
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'auth_sessions'
      and policyname = 'deny_all_anon'
  ) then
    create policy deny_all_anon on public.auth_sessions
      for all
      to anon
      using (false)
      with check (false);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'auth_sessions'
      and policyname = 'deny_all_authenticated'
  ) then
    create policy deny_all_authenticated on public.auth_sessions
      for all
      to authenticated
      using (false)
      with check (false);
  end if;
end $$;
