# Personality Improvement App (LifeOS) 👋

Expo React Native + Expo Router + TypeScript + NativeWind v5 + gluestack-ui + Lucide + Supabase.

Phase 2 (Workout Engine) is **local-first**: all workout features persist to AsyncStorage.
Supabase sync arrives later with Auth — the table schema (`sql/workout-tables.sql`) is ready.

## Get started

```bash
npm install
npx expo start
```

Scan QR with Expo Go (phone + PC on same WiFi, or use `npx expo start --tunnel`).

- `a` in terminal = Android (needs emulator / adb - not installed here)
- `w` = web
- `r` = reload

## Stack

- Expo SDK 57 (`expo@~57.0.22`, `expo-router@~57.0.21`, React 19.2.3, RN 0.86.3)
- NativeWind v5 preview (`nativewind@^5.0.0-preview.2`, `tailwindcss@^4.2.0`)
- gluestack-ui components (`src/components/ui/*`, `@gluestack-ui/core` alpha)
- AsyncStorage (`@react-native-async-storage/async-storage`) — generic layer in `src/lib/storage.ts`
- Supabase (`@supabase/supabase-js`) — client in `src/lib/supabase.ts`
- Lucide (`lucide-react-native` + `react-native-svg`)

## Project structure

```text
.env.local            <- Expo env (publishable Supabase key) - GITIGNORED
.env.example          <- Template for server-side env (.env) - commit this
scripts/
  import-exercises.ts <- Server-side dataset importer (uses SERVICE ROLE key)
src/
  app/
    _layout.tsx       <- imports global.css + SafeArea + Stack
    index.tsx         <- Redirect to /(tabs)
    (tabs)/
      _layout.tsx     <- Home/Health/Tasks/Finance/More + Lucide icons
      index.tsx       <- LifeOS dashboard (DailyPulse/Progress/Health/Tasks/Finance/QuickActions)
      health.tsx tasks.tsx finance.tsx more.tsx
    health/workout.tsx exercises.tsx sleep.tsx nutrition.tsx
    finance/transactions.tsx budget.tsx goals.tsx
    books/index.tsx books/[id].tsx
    journal/index.tsx
    settings/index.tsx
  components/
    ui/               <- gluestack components (badge button card heading input progress text ...)
    dashboard/        <- HomeHeader DailyPulse TodaysProgress HealthSnapshot TaskPreview FinanceSnapshot QuickActions
  constants/
    colors.ts         <- LifeOS light/dark tokens
    spacing.ts typography.ts
  hooks/
  lib/
    storage.ts        <- generic AsyncStorage (saveData / loadData / removeData)
    supabase.ts       <- Supabase client (AsyncStorage session persistence)
    mockData.ts       <- mock + full exercise library + task types/seed
  services/           <- (reserved: exercises service lives here next)
```

## Supabase setup

### 1. Env files

- `.env.local` (Expo, client-side, publishable key — never a service-role secret):

```text
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=sb_publishable_...
```

- `.env` (server-side only, used by the import script — copy from `.env.example`):

```text
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
```

### 2. Database (SQL Editor → New query)

```sql
create table if not exists public.exercises (
  id text primary key,
  name text not null,
  category text,
  body_part text,
  equipment text,
  target text,
  muscle_group text,
  secondary_muscles jsonb default '[]'::jsonb,
  instructions jsonb,
  instruction_steps jsonb,
  media_id text,
  image text,
  gif_url text,
  created_at timestamptz default now()
);
```

Indexes + RLS:

```sql
create index if not exists exercises_body_part_idx on public.exercises (body_part);
create index if not exists exercises_equipment_idx on public.exercises (equipment);
create index if not exists exercises_target_idx on public.exercises (target);
create index if not exists exercises_category_idx on public.exercises (category);
create index if not exists exercises_name_idx on public.exercises
  using gin (to_tsvector('english', name));

alter table public.exercises enable row level security;

drop policy if exists "Anyone can read exercises" on public.exercises;
create policy "Anyone can read exercises"
  on public.exercises for select using (true);
```

### 3. Import the dataset

`npm run exercises:import` downloads `hasaneyldrm/exercises-dataset`
(`data/exercises.json`, 1,324 records), transforms to the schema, and batch-upserts
with a progress bar. It is idempotent (`onConflict: 'id'`) and works from Node 24
(native TypeScript type-stripping, `--env-file-if-exists`).

Requires the server-side `.env` above. Never put the service-role key in Expo code.

## Scripts

- `npm start` / `npx expo start`
- `npm run web` / `android` / `ios`
- `npm run lint`
- `npm run exercises:import` — Supabase dataset importer (server-side)

## Workout Engine (Phase 2, local-first)

Routes:

```text
/health/workout-builder          <- create/edit workout (name, exercises, sets/reps/rest, reorder)
/health/workout-session/[id]     <- active session (timer, sets, rest timer, PRs) + summary
/health/workout-history          <- completed workouts + totals + filters (All/Strength/Cardio)
/health/workout-history/[id]     <- workout detail (per-exercise sets, PRs, notes)
```

Architecture:

```text
src/types/workout.ts        <- Workout / WorkoutExercise / WorkoutSet / PersonalRecord
src/services/workouts.ts    <- local-first repository over AsyncStorage (@lifeos/workouts/v1, @lifeos/prs/v1)
src/hooks/useWorkout.ts     <- builder state (add/remove/duplicate/move/save/start)
src/hooks/useWorkoutSession.ts  <- session (timestamp-based elapsed + rest, pause/resume, PRs)
src/hooks/useWorkoutHistory.ts  <- completed history list
src/components/workout/     <- Stepper, WorkoutHeader, WorkoutExerciseCard, WorkoutSetRow,
                               ExercisePicker, RestTimer, WorkoutProgress, WorkoutSummary,
                               WorkoutCard, WorkoutNowCard, WorkoutEmptyState
```

Behavior notes:

- Every mutation persists immediately to AsyncStorage — closing the app never loses progress.
- Elapsed/rest timers derive from timestamps (survives backgrounding); pause accumulates offset.
- Completing a set auto-starts the rest timer (`restSeconds` per exercise, +30/+60/Skip).
- PR detection on completed sets: max_weight / max_reps / max_volume per exercise.
- Volume = Σ(weight × reps) of completed sets; duration = completed_at − started_at.
- Offline by design (AsyncStorage); `sql/workout-tables.sql` mirrors the schema for future Supabase sync.

## Validation

- `npx tsc --noEmit` ✅
- `npx expo-doctor` ✅ 21/21
- `npx expo start` ✅ Metro bundles, QR shown

## Next (per plan)

- [ ] Run the exercises table SQL in Supabase, confirm `select count(*)` = 0
- [ ] `npx expo start --clear` → temporary `testSupabaseConnection()` returns `error: null`
- [ ] `npm run exercises:import` → 1,324 rows
- [ ] Wire `health/exercises.tsx` to Supabase through `services/exercises.ts` + `hooks/useExercises.ts`
- [ ] Supabase Auth + user-scoped RLS for tasks / finance / journal / goals


