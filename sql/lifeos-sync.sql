-- LIFEOS 3R: generic authenticated sync foundation.
-- Phase 3R only. Auth UI/session creation is Phase 3T.
-- This table stores authoritative local records in their native JSON shape.
-- Derived LifeOS projections are intentionally not represented here.

create table if not exists public.lifeos_sync_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  domain text not null,
  record_id text not null,
  storage_key text not null,
  payload jsonb,
  updated_at timestamptz not null,
  deleted boolean not null default false,
  sync_version bigint not null default 1,
  device_updated_at timestamptz,
  created_at timestamptz not null default now(),
  constraint lifeos_sync_records_identity unique (user_id, domain, storage_key, record_id),
  constraint lifeos_sync_records_domain check (domain in ('tasks','habits','books','journal','finance','nutrition','workout','sleep'))
);

create index if not exists lifeos_sync_records_user_idx
  on public.lifeos_sync_records (user_id, updated_at desc);

create index if not exists lifeos_sync_records_lookup_idx
  on public.lifeos_sync_records (user_id, domain, storage_key, record_id);

alter table public.lifeos_sync_records enable row level security;

-- No public/anonymous write policy is created. All access is scoped to an
-- authenticated Supabase identity. Service-role credentials are never used by
-- the mobile client.

drop policy if exists "lifeos sync read own records" on public.lifeos_sync_records;
create policy "lifeos sync read own records"
  on public.lifeos_sync_records
  for select
  using (auth.uid() = user_id);

drop policy if exists "lifeos sync insert own records" on public.lifeos_sync_records;
create policy "lifeos sync insert own records"
  on public.lifeos_sync_records
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "lifeos sync update own records" on public.lifeos_sync_records;
create policy "lifeos sync update own records"
  on public.lifeos_sync_records
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Deletes are deliberately not exposed to the client. 3R uses tombstones so
-- future conflict handling can distinguish deletion from absence.
