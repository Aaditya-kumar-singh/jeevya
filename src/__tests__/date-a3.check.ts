import {
  addDays,
  daysBetweenInclusive,
  inclusiveDateRange,
  isLeapYear,
  isValidCivilDate,
  isoTimestamp,
  parseCivilDate,
  shiftMonth,
  todayCivilDate,
  weekdayOf,
} from '@/lib/date';
import { getTodayISO } from '@/types/tasks';
import { getTodayDate as getNutritionToday } from '@/types/nutrition';
import { getTodayDate as getJournalToday } from '@/types/journal';

let passed = 0;
let failed = 0;
function assert(condition: boolean, message: string): void {
  if (condition) { passed += 1; console.log(`  ✓ ${message}`); }
  else { failed += 1; console.log(`  ✗ ${message}`); }
}

console.log('\n=== A3 Canonical Date Tests ===');

assert(isValidCivilDate('2024-02-29'), 'valid leap-day');
assert(!isValidCivilDate('2023-02-29'), 'invalid non-leap-day');
assert(!isValidCivilDate('2024-02-30'), 'invalid month day');
assert(!isValidCivilDate('2024-13-01'), 'invalid month');
assert(isLeapYear(2000) && !isLeapYear(1900), 'Gregorian leap-year rules');
assert(JSON.stringify(parseCivilDate('2026-09-14')) === JSON.stringify({ year: 2026, month: 9, day: 14 }), 'civil parsing');
assert(parseCivilDate('bad') === null, 'invalid parsing returns null');

assert(addDays('2024-02-28', 1) === '2024-02-29', 'leap-year +1 day');
assert(addDays('2024-02-29', 1) === '2024-03-01', 'leap-year month boundary');
assert(addDays('2024-12-31', 1) === '2025-01-01', 'year boundary +1');
assert(addDays('2025-01-01', -1) === '2024-12-31', 'year boundary -1');
assert(addDays('2024-03-01', -1) === '2024-02-29', 'month boundary -1');
assert(addDays('2024-01-01', 365) === '2024-12-31', '365-day leap-year arithmetic');

assert(JSON.stringify(inclusiveDateRange('2024-02-28', '2024-03-01')) === JSON.stringify(['2024-02-28','2024-02-29','2024-03-01']), 'inclusive range');
assert(daysBetweenInclusive('2024-12-31', '2025-01-01') === 2, 'inclusive range length across year');
assert(inclusiveDateRange('2025-01-02', '2025-01-01').length === 0, 'inverted range empty');
assert(weekdayOf('2024-01-01') === 1, 'weekday stable');
assert(JSON.stringify(shiftMonth(2024, 12, 1)) === JSON.stringify({ year: 2025, month: 1 }), 'month shift across year');

const boundaryInstant = isoTimestamp('2026-09-13T18:30:00.000Z');
assert(boundaryInstant === '2026-09-13T18:30:00.000Z', 'ISO timestamp preserved as instant');
assert(todayCivilDate(new Date('2026-09-14T00:30:00.000Z')) === '2026-09-14', 'today civil date uses instant UTC date part');

// Compatibility wrappers must continue exposing the existing public APIs.
assert(getTodayISO().length === 10 && getNutritionToday().length === 10 && getJournalToday().length === 10, 'existing today helpers remain compatible');

console.log(`\nA3 Tests: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exitCode = 1;
