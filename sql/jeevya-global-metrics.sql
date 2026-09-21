-- JEEVYA 3T.9: privacy-safe global aggregate foundation.
-- This table is intentionally NOT user-owned. It contains only aggregated data.
-- Trusted population/aggregation writes belong to a future server-side authority,
-- not to the Expo client or the normal authenticated client role.

create table if not exists public.jeevya_global_metrics (
  id uuid primary key default gen_random_uuid(),
  metric_name text not null,
  metric_type text not null,
  period text not null,
  period_start date not null,
  period_end date not null,
  geographic_level text,
  geographic_code text,
  aggregate_value numeric(30, 10) not null,
  aggregate_count bigint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  data_version integer not null default 1,
  schema_version integer not null default 1,
  constraint jeevya_global_metrics_metric_type_check
    check (metric_type in ('count', 'sum', 'average', 'rate', 'ratio')),
  constraint jeevya_global_metrics_period_check
    check (period in ('day', 'week', 'month', 'quarter', 'year')),
  constraint jeevya_global_metrics_dates_check
    check (period_end >= period_start),
  constraint jeevya_global_metrics_geography_check
    check (geographic_level is null or geographic_level in ('global', 'country', 'region', 'city')),
  constraint jeevya_global_metrics_geography_code_check
    check (geographic_level is not null or geographic_code is null),
  -- A global row must represent a cohort, never a single person.
  constraint jeevya_global_metrics_count_check
    check (aggregate_count >= 5),
  constraint jeevya_global_metrics_versions_check
    check (data_version >= 1 and schema_version >= 1),
  constraint jeevya_global_metrics_identity unique (
    metric_name,
    metric_type,
    period,
    period_start,
    period_end,
    geographic_level,
    geographic_code,
    data_version,
    schema_version
  )
);

create index if not exists jeevya_global_metrics_period_idx
  on public.jeevya_global_metrics (period_start, period_end, metric_name);

create index if not exists jeevya_global_metrics_geography_idx
  on public.jeevya_global_metrics (geographic_level, geographic_code, period_start);

alter table public.jeevya_global_metrics enable row level security;

-- The normal client may read only privacy-safe aggregate rows while authenticated.
-- There is deliberately no INSERT, UPDATE, or DELETE policy for anon/authenticated.
-- RLS therefore denies client writes even if a client attempts to call the table directly.
drop policy if exists "jeevya global metrics authenticated read" on public.jeevya_global_metrics;
create policy "jeevya global metrics authenticated read"
  on public.jeevya_global_metrics
  for select
  to authenticated
  using (true);

revoke all on table public.jeevya_global_metrics from anon, authenticated;
grant select on table public.jeevya_global_metrics to authenticated;

-- IMPORTANT AUTHORITY BOUNDARY:
-- Future trusted aggregation should run through a server-side role/job with
-- narrowly scoped write authority. Do not grant INSERT/UPDATE/DELETE to the
-- Expo client's anon/authenticated roles and do not place a service-role key
-- in the Expo bundle. No server-side aggregation implementation is introduced
-- in Phase 3T.9.
