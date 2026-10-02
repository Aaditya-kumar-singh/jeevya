# Jeevya Full Improvement Execution Plan

Prepared: 2026-09-22
Scope: every unchecked item currently in todo.md, including implementation, automated tests, documentation, and device/manual verification.

Important: times are engineering effort estimates, not calendar elapsed time. Provider/device-dependent items cannot be truthfully marked complete without real devices/apps.

## P0 Finance foundation

Expand FinanceTransaction model — 2h
Transaction states — 45m
Expense/income/transfer direction — 45m
Self-transfer detection — 1h
Pending/success/failed/reversed/refunded — 1.5h
Deterministic duplicate fingerprints — 1h
Idempotent imports — 1h
Separate imported/user-edited fields — 1.5h
Import batch IDs and undo — 1.5h
Import audit history — 1.5h
One-tap payment purposes — 30m
Custom reason — 30m
Free-text note — 20m
Tags — 45m
Receipt attachment — 2h
Merchant memory/rules — 1.5h
Ask purpose only when useful — 1h
Edit purpose later — 45m
Notification listener setup UX — 1h
Provider enable/disable — 1.5h
Enabled-provider filtering — 45m
Ignore unrelated notifications — 30m
Expanded notification extraction — 1h
Notification dedup/repost handling — 1h
Listener reconnect/rebind — 1h
Device reboot recovery — 1h
Parser versioning — 45m
Raw-notification logging audit — 45m
Google Pay parser — 1.5h
PhonePe parser — 1.5h
Paytm parser — 1.5h
SBI/YONO parser — 1.5h
PNB parser — 1.5h
Generic UPI parser — 1.5h
Provider parser fixtures — 2h
Parser fallback/version tolerance — 1h
Share-to-Jeevya — 3h
PDF statement import — 4h
Excel import — 3h
CSV import — 2h
Manual expense UX — 1.5h
Import preview — 2h
Large-file progress — 1.5h
Row-level import errors — 1.5h
Duplicate preview — 1.5h

## P1 Finance intelligence

Merchant normalization/aliases — 2h
Automatic category suggestion — 2h
Automatic purpose suggestion — 2h
Recurring-payment detection — 2.5h
Subscription detection — 2h
Refund/reversal matching — 2h
Split transactions — 2h
Partial refunds — 1.5h
Monthly spend summary — 1h
Weekly spend summary — 1h
Spend by merchant — 1h
Spend by purpose — 1h
Spend by category — 1h
Spend by payment source — 1h
Spend heatmap — 2h
Largest payments — 45m
Frequent-small-payment analysis — 1h
Weekend/weekday comparison — 1h
Budget vs actual — 1.5h
Savings rate — 1h
Income/expense ratio — 45m
Recurring income — 1.5h
Expense anomaly detection — 3h
Unusual-spend insight — 1.5h
Monthly finance review — 2h
Filtered CSV/Excel export — 2h

## Dashboard

Needs-attention section — 2h
Today's spending/review count — 1h
Overdue task/habit indicators — 1h
Health attention indicators — 1.5h
Goal progress — 1h
Weekly momentum — 1.5h
Customizable quick actions — 2h
Reorder/hide dashboard cards — 2.5h
Skeleton loading — 1h
Empty/error consistency — 1.5h
Daily-state caching — 1.5h
Deduplicate dashboard service calls — 2h

## Tasks

Priority system — 1.5h
Estimated duration — 1h
Energy/context — 1h
Dependencies — 2h
Templates — 2h
Natural-language quick add — 3h
Recurrence exceptions — 2h
Carry-forward rules — 1.5h
Reschedule suggestions — 2h
Focus mode — 2h
Calendar day/week improvements — 3h
Completion analytics — 2h
Task-goal linking — 1.5h
Task-habit linking — 1.5h
Reminders/notifications — 3h
Bulk actions — 2h
Timezone/recurrence audit — 2h

## Habits

Habit templates — 1.5h
Quantity habits — 2h
Skip/vacation mode — 1.5h
Skipped vs failed — 1h
Streak recovery — 1.5h
Consistency score — 1.5h
Weekly/monthly trends — 2h
Reminders — 2h
Cross-domain habit links — 2h
Habit notes — 1h
Calendar visualization — 2h

## Health / Fitness / Workouts

Recover active workout after process death — 2h
Persist rest timer — 1.5h
Previous-set values — 1h
Progressive overload — 3h
Exercise substitution — 2h
Warm-up/cool-down — 1.5h
Supersets/circuits — 2.5h
RPE/RIR — 1.5h
Volume trends — 2h
Muscle balance — 2h
PR timeline — 1.5h
Workout adherence — 1.5h
Health Connect permission UX — 2h
Data source/freshness — 1.5h
Manual vs imported health data — 1.5h
Sleep/recovery explanations — 2h
Health inference audit — 2h

## Nutrition

Recent foods — 1h
Favourite foods — 1h
Serving presets — 1h
Meal templates — 1.5h
Repeat meal — 1h
Recipe nutrition improvements — 2h
Daily targets — 1.5h
Weekly adherence — 2h
Macro charts — 2h
Meal timing insights — 1.5h
Nutrition/workout relationship — 2h
Reduce food-data loading — 2h
Review system-foods-3t14 loading strategy — 1.5h
Dataset versioning — 1h

## Goals

Goal hierarchy — 2h
Milestones — 1.5h
Measurable targets — 1.5h
Deadline handling — 1.5h
Automatic progress sources — 3h
Goal-task links — 1.5h
Goal-habit links — 1.5h
Goal-book links — 1.5h
Goal-finance links — 2h
Goal-health links — 2h
Weekly review — 1.5h
At-risk detection — 2h
Goal history/archive — 1.5h

## Books

Reading sessions — 1.5h
Reading streak — 1h
Pages/minutes — 1h
Reading goals — 1.5h
Notes/highlights — 2h
Book-goal linking — 1h
Reading analytics — 2h
Abandoned-book handling — 1h
Yearly reading review — 1.5h

## Journal

Mood/energy — 1.5h
Gratitude — 1h
Tags — 1h
Attachments — 2h
Search — 2h
Calendar heatmap — 2h
Local-only mode — 1.5h
Weekly reflection prompts — 1.5h
Cross-domain links — 2.5h
Export — 1.5h
Explicit-opt-in AI summary — 3h

## Timeline / Analytics / Intelligence

Normalize timeline events — 3h
Timeline domain filters — 1h
Timeline search — 1.5h
Source-record links — 1.5h
Day/week/month navigation — 1.5h
Import/sync duplicate prevention — 2h
Shared analytics layer — 4h
Remove duplicate calculations — 3h
Metric/unit definitions — 2h
Standard date ranges — 2h
Data freshness — 1.5h
Explain insight generation — 2h
Source links for insights — 2h
Cross-domain correlations — 4h
Period comparisons — 2h
Anomaly detection — 3h
Actionable recommendations — 3h
Insight feedback/dismissal — 2h
Insight history — 1.5h
Causal-claim audit — 2h

## Search

Cross-domain search — 3h
Ranking — 2h
Typo tolerance — 2h
Filters — 2h
Recent searches — 1h
Result actions — 1.5h
Finance filters — 1.5h
Indexed search — 3h
Immediate deletion handling — 1h

## Android widgets

Water-widget path — 2h
Spending widget — 2h
Payment-review widget — 1.5h
Goal widget — 1.5h
Refresh strategy — 2h
Stale-data state — 1h
Multiple instances — 2h
Resize — 1h
Reboot — 1h
Upgrade — 1h
Lock-screen privacy — 1.5h

## Backup / Restore / Sync

Imported transactions — 1h
Payment notes/purposes — 45m
Import batches — 1h
Schema migrations — 3h
Backup-version migration — 2h
Restore preview — 2h
Selective restore — 3h
Encrypted backup — 3h
Integrity hash — 1h
Per-domain sync status — 2h
Retry/backoff — 2h
Last-sync timestamp — 1h
Idempotent imported-payment sync — 2h
Conflict-resolution UI — 3h

## Auth / Privacy

Explicit guest/local-first mode — 1.5h
Account requirements explanation — 1h
Session recovery — 2h
Network error UX — 1.5h
Account deletion — 2h
Ownership-boundary audit — 2h
Token/session storage audit — 2h
Payment notification settings — 1.5h
Provider switches — 1h
Retention controls — 1.5h
Delete imported transactions — 1h
Delete provider data — 1h
Finance export — 1h
Full data export — 3h
Raw notification cache clearing — 1h
AI/analytics opt-in — 1.5h
Health permission status — 1h
Widget privacy — 1h
Data-source transparency — 1.5h
Permission audit — 2h

## UI / Accessibility

Semantic colour source — 2h
Light/dark parity — 3h
Contrast audit — 2h
Card consistency — 1.5h
Button hierarchy — 1.5h
Empty/loading/error states — 2h
Form components — 3h
Haptics — 1.5h
Reduced motion — 1.5h
Accessibility labels — 3h
Large-font testing — 2h
Screen-reader testing — 3h
Safe-area audit — 2h
Keyboard/input audit — 2h

## Performance / Reliability / Security / Architecture

Dashboard profiling — 2h
Finance profiling — 2h
Nutrition profiling — 2h
Workout profiling — 2h
Memoize expensive calculations — 2h
Batch storage operations — 2h
Cache stable datasets — 1.5h
Paginate transactions — 2h
Lazy-load analytics — 2h
Lazy-load food dataset — 1.5h
Remove duplicate subscriptions — 2h
Effect-loop audit — 3h
Cold-start measurement — 1.5h
Memory measurement — 2h
APK-size measurement — 1h
JS-bundle measurement — 1h
Central domain errors — 2h
Retry policy — 2h
Major-tab error boundaries — 2h
Offline indicators — 1.5h
Process-death recovery — 3h
Stale-data handling — 2h
Storage corruption handling — 3h
Migration failure handling — 2h
Sync failure handling — 2h
Payment quarantine — 2h
No silent import discard — 1h
Screen/hook/service/storage boundaries — 3h
Parser separation — 1h
Analytics separation — 2h
DTO/persistence separation — 2h
Schema migrations — 3h
Reduce direct AsyncStorage from screens — 3h
Duplicate business-logic audit — 3h
Dead-service audit — 2h
Unreachable-route audit — 2h
Unsafe-cast/any audit — 3h
Empty-catch audit — 2h
Swallowed-error audit — 2h
Effect dependency audit — 3h
Oversized-component refactor — 4h

## Testing / Device verification

Provider fixtures and parser tests — 5h
Import rollback/batch tests — 2h
Full regression suite — 3h
Redmi/Xiaomi — 1.5h
Samsung — 1.5h
realme — 1.5h
vivo — 1.5h
OPPO — 1.5h
OnePlus — 1.5h
Pixel/reference Android — 1.5h
Low-memory Android — 2h
Aggressive-background Android — 2h

## Release

Signature verification — 45m
Package/version/versionCode verification — 45m
ARM64 verification — 30m
Release asset verification — 45m
Release notes verification — 30m
SHA-256 verification — 30m
Post-release smoke test — 1.5h
Signing-key backup procedure — 1h
Secret/key/token repository audit — 1h

## Execution order

1. Release pipeline fix and clean build verification.
2. Finance transaction/import model completion.
3. Payment provider parsers and fixtures.
4. Statement/share/manual import.
5. Finance analytics.
6. Dashboard.
7. Tasks and habits.
8. Health/workouts.
9. Nutrition.
10. Goals/books/journal.
11. Timeline/intelligence/search.
12. Backup/sync/privacy/auth.
13. UI/accessibility.
14. Performance/reliability/security/architecture.
15. Device matrix and release QA.

## Completion rule

A task is complete only after implementation, relevant automated validation, git diff check, Android prebuild for native changes, and real-device verification where required.

Overall: this is a 300+ hour engineering backlog plus roughly 25-30 hours of real-device/provider verification. It cannot honestly be completed perfectly in one short pass. The correct approach is continuous implementation with each checkbox verified before being marked complete.