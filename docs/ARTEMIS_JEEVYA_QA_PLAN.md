# Jeevya + ARTEMIS QA Plan

## Purpose
Use Google ARTEMIS as an external Android QA and regression layer for Jeevya. ARTEMIS stays outside the Jeevya production runtime.

## Current environment
- Jeevya: Expo SDK 57 / React Native 0.86 / React 19
- ARTEMIS source: ./artemis
- ARTEMIS mirror: ./.artemis
- Android ADB: currently unavailable on PATH
- uv: currently unavailable on PATH
- Python compilation of ARTEMIS: passed

## Test suites

### 01 Authentication
1. Launch Jeevya.
2. Verify guest state.
3. Open sign in.
4. Sign in with a dedicated test account.
5. Verify authenticated dashboard.
6. Sign out.
7. Verify guest state and preservation of local data.

### 02 Dashboard
1. Launch Jeevya.
2. Verify Daily Pulse renders.
3. Verify today's plan/tasks render.
4. Open each dashboard action.
5. Return to dashboard.
6. Verify no crash or navigation loop.

### 03 Tasks + Habits
1. Create a task.
2. Complete it.
3. Create a habit.
4. Record today's completion.
5. Verify Daily Plan and Daily Pulse update.
6. Relaunch and verify persistence.

### 04 Health + Workout
1. Open Health.
2. Open exercise library.
3. Start a workout.
4. Add sets/reps.
5. Use rest timer.
6. Finish the workout.
7. Verify workout history, progression and analytics.
8. Verify dashboard health signals.

### 05 Nutrition + Health Connect
1. Open Nutrition.
2. Verify targets and daily log.
3. Open Energy/Health Connect flow.
4. Verify denied/unavailable permissions are handled safely.
5. Verify no fake health values appear.

### 06 Finance
1. Add account.
2. Add income.
3. Add expense.
4. Create budget.
5. Create savings goal.
6. Open analytics.
7. Verify totals and navigation.
8. Export data.
9. Verify import flow handles malformed input safely.

### 07 Books + Goals
1. Create a book.
2. Update reading progress.
3. Create a goal.
4. Verify goal progress integration.
5. Verify analytics and dashboard projections.

### 08 Journal + Timeline
1. Create journal entry.
2. Open calendar.
3. Open life timeline.
4. Verify entry navigation and persistence.

### 09 Offline / Sync
1. Start with known local test data.
2. Disable network.
3. Create and edit records.
4. Relaunch.
5. Verify local persistence.
6. Restore network.
7. Verify sync does not duplicate or overwrite unrelated data.
8. Verify conflict handling where applicable.

### 10 Android Widgets
1. Configure a widget.
2. Add modules.
3. Reorder modules.
4. Resize widget.
5. Tap deep links.
6. Verify multiple widget instances remain independent.

## ARTEMIS execution strategy

- Flash: deterministic short workflows.
- Pro: multi-domain workflows, recovery, diagnostics, checkpoints and reports.
- Use verification_level=checkpoints for release-candidate regression.
- Use verification_level=strict for high-risk release flows.
- Always lock to Jeevya's Android package when the APK is installed.
- Use a dedicated non-production test account.
- Never include real financial, health or authentication secrets in test prompts.

## Release gate

A release candidate should pass:
- Authentication
- Dashboard
- Tasks
- Health/workout
- Nutrition
- Finance
- Offline persistence
- Sync/conflict
- Widget deep links

A failure should capture:
- ARTEMIS trace ID
- screenshot
- UI hierarchy
- stderr/logcat
- failing action
- reproduction prompt
- app version / git commit

## Next environment step

Install/configure the Android toolchain and uv on the Windows development machine, then run ARTEMIS against a connected authorized Android device or emulator. Installation should be explicitly approved before using a system package manager.
