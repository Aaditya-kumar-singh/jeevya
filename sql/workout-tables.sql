-- LifeOS Workout Engine — table schema + RLS.
-- Local-first phase: the app persists to AsyncStorage today.
-- Run this in Supabase SQL Editor when you add Supabase Auth to enable online sync.
-- Column shapes intentionally match src/types/workout.ts and src/services/workouts.ts.

create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  status text not null default 'planned'
    check (status in ('planned', 'active', 'completed', 'cancelled')),
  started_at timestamptz,
  completed_at timestamptz,
  duration_seconds integer,
  notes text,
  total_volume numeric default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workouts_user_id_idx on public.workouts (user_id);
create index workouts_user_created_idx on public.workouts (user_id, created_at desc);
create index workouts_user_status_idx on public.workouts (user_id, status);

create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  exercise_id text not null references public.exercises(id),
  position integer not null,
  sets_target integer default 3,
  reps_target integer,
  weight_target numeric,
  rest_seconds integer default 90,
  notes text,
  created_at timestamptz not null default now()
);

create index workout_exercises_workout_idx on public.workout_exercises (workout_id, position);
create index workout_exercises_exercise_idx on public.workout_exercises (exercise_id);

create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid not null references public.workout_exercises(id) on delete cascade,
  set_number integer not null,
  reps integer,
  weight numeric,
  weight_unit text default 'kg' check (weight_unit in ('kg', 'lb')),
  duration_seconds integer,
  distance numeric,
  distance_unit text,
  rpe numeric,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.personal_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id text not null references public.exercises(id),
  record_type text not null
    check (record_type in ('max_weight', 'max_reps', 'max_volume', 'best_time', 'best_distance')),
  value numeric not null,
  workout_set_id uuid references public.workout_sets(id) on delete set null,
  achieved_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- RLS: owners only. (Exercises table keeps its public read policy.)

alter table public.workouts enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_sets enable row level security;
alter table public.personal_records enable row level security;

create policy "users read own workouts" on public.workouts for select using (auth.uid() = user_id);
create policy "users insert own workouts" on public.workouts for insert with check (auth.uid() = user_id);
create policy "users update own workouts" on public.workouts for update using (auth.uid() = user_id);
create policy "users delete own workouts" on public.workouts for delete using (auth.uid() = user_id);

create policy "users read own workout exercises" on public.workout_exercises
  for select using (exists (
    select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid()));
create policy "users insert own workout exercises" on public.workout_exercises
  for insert with check (exists (
    select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid()));
create policy "users update own workout exercises" on public.workout_exercises
  for update using (exists (
    select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid()));
create policy "users delete own workout exercises" on public.workout_exercises
  for delete using (exists (
    select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid()));

create policy "users read own workout sets" on public.workout_sets
  for select using (exists (
    select 1 from public.workout_exercises we
    join public.workouts w on w.id = we.workout_id
    where we.id = workout_exercise_id and w.user_id = auth.uid()));
create policy "users insert own workout sets" on public.workout_sets
  for insert with check (exists (
    select 1 from public.workout_exercises we
    join public.workouts w on w.id = we.workout_id
    where we.id = workout_exercise_id and w.user_id = auth.uid()));
create policy "users update own workout sets" on public.workout_sets
  for update using (exists (
    select 1 from public.workout_exercises we
    join public.workouts w on w.id = we.workout_id
    where we.id = workout_exercise_id and w.user_id = auth.uid()));
create policy "users delete own workout sets" on public.workout_sets
  for delete using (exists (
    select 1 from public.workout_exercises we
    join public.workouts w on w.id = we.workout_id
    where we.id = workout_exercise_id and w.user_id = auth.uid()));

create policy "users read own records" on public.personal_records for select using (auth.uid() = user_id);
create policy "users insert own records" on public.personal_records for insert with check (auth.uid() = user_id);
create policy "users update own records" on public.personal_records for update using (auth.uid() = user_id);
create policy "users delete own records" on public.personal_records for delete using (auth.uid() = user_id);