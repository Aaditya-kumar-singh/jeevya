import { todayCivilDate, addDays, inclusiveDateRange } from '@/lib/date';
import { getJeevyaDailyState } from '@/services/jeevyaIntegration';
import { getJeevyaAnalytics, loadJeevyaDailyStates } from '@/services/jeevyaAnalytics';

function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }

(async () => {
  const today = todayCivilDate();
  const start = addDays(today, -6)!;
  const dates = inclusiveDateRange(start, today);
  let passed = 0;
  const check = async (name: string, fn: () => Promise<void>) => { await fn(); passed++; console.log(`PASS ${name}`); };

  await check('empty state exposes clean data quality', async () => {
    const state = await getJeevyaDailyState(today);
    assert(Array.isArray(state.dataQuality?.degradedDomains), 'data quality missing');
    assert(state.dataQuality?.degradedDomains.length === 0, 'empty state unexpectedly degraded');
  });

  await check('daily-state batch preserves date order', async () => {
    const states = await loadJeevyaDailyStates(dates, 2);
    assert(states.length === dates.length, 'wrong state count');
    assert(states.every((state, index) => state.date === dates[index]), 'date order changed');
  });

  await check('invalid batch size falls back safely', async () => {
    const states = await loadJeevyaDailyStates([today], 0);
    assert(states.length === 1 && states[0].date === today, 'invalid batch size failed');
  });

  await check('analytics remains correct with bounded loading', async () => {
    const result = await getJeevyaAnalytics(7, today);
    assert(result.points.length === 7, 'analytics point count changed');
    assert(result.startDate === start && result.endDate === today, 'analytics boundaries changed');
  });

  await check('daily state is deterministic after reliability changes', async () => {
    const a = await getJeevyaDailyState(today);
    const b = await getJeevyaDailyState(today);
    assert(JSON.stringify(a) === JSON.stringify(b), 'daily state is not deterministic');
  });

  console.log(`JEEVYA 3H RELIABILITY: ${passed} passed, 0 failed`);
})().catch((error) => { console.error(error); process.exitCode = 1; });
