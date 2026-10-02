import AsyncStorage from '@react-native-async-storage/async-storage';
import { isValidCivilDate, addDays, todayCivilDate, type CivilDate } from '@/lib/date';
import { createInsight, getStandardAnalyticsRange, uniqueSourceRefs, type StandardAnalyticsPeriod } from '@/services/analyticsCore';
import type { AnalyticsInsight, AnalyticsSourceRef } from '@/types/analyticsCore';
import { getHistoricalAnalytics } from '@/services/historicalAnalytics';
import { loadSharedAnalyticsData } from '@/services/sharedAnalyticsData';
import type { HistoricalAnalyticsDomain, HistoricalAnalyticsPeriod } from '@/types/historicalAnalytics';

export type IntelligencePeriod = 7 | 30 | 90 | 365;
export type InsightFeedback = 'helpful' | 'not-helpful' | 'dismissed';

export interface IntelligenceComparison {
  period: IntelligencePeriod;
  currentStart: CivilDate;
  currentEnd: CivilDate;
  previousStart: CivilDate;
  previousEnd: CivilDate;
  metricId: string;
  currentValue: number | null;
  previousValue: number | null;
  absoluteChange: number | null;
  percentageChange: number | null;
  direction: 'up' | 'down' | 'stable' | 'insufficient_data';
}

export interface IntelligenceCorrelation {
  id: string;
  leftMetric: string;
  rightMetric: string;
  coefficient: number;
  sampleSize: number;
  direction: 'positive' | 'negative';
  strength: 'weak' | 'moderate' | 'strong';
  sourceRefs: AnalyticsSourceRef[];
  generatedAt: string;
}

export interface IntelligenceAnomaly {
  id: string;
  metric: string;
  date: CivilDate;
  value: number;
  baselineMean: number;
  baselineStdDev: number;
  zScore: number;
  direction: 'high' | 'low';
  sourceRefs: AnalyticsSourceRef[];
  generatedAt: string;
}

export interface IntelligenceRecommendation {
  id: string;
  title: string;
  action: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  sourceRefs: AnalyticsSourceRef[];
  generatedAt: string;
}

export interface InsightFeedbackRecord {
  insightId: string;
  feedback: InsightFeedback;
  updatedAt: string;
}

export interface InsightHistoryRecord {
  insight: AnalyticsInsight;
  feedback?: InsightFeedback;
  archivedAt?: string;
}

export interface IntelligenceAudit {
  safe: boolean;
  violations: string[];
  checkedAt: string;
}

export interface AdvancedIntelligenceResult {
  generatedAt: string;
  period: IntelligencePeriod;
  comparisons: IntelligenceComparison[];
  correlations: IntelligenceCorrelation[];
  anomalies: IntelligenceAnomaly[];
  recommendations: IntelligenceRecommendation[];
  insights: AnalyticsInsight[];
  history: InsightHistoryRecord[];
  feedback: InsightFeedbackRecord[];
  causalAudit: IntelligenceAudit;
  degradedDomains: HistoricalAnalyticsDomain[];
}

const FEEDBACK_KEY = 'jeevya:analytics:insight-feedback';
const HISTORY_KEY = 'jeevya:analytics:insight-history';
const CAUSAL_WORDS = /\b(caused|causes|causing|because of|leads to|led to|results in|resulted in|will make|will cause|proves that|therefore)\b/i;

function validNumber(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value); }
function strength(coefficient: number): IntelligenceCorrelation['strength'] {
  const a = Math.abs(coefficient);
  return a >= 0.7 ? 'strong' : a >= 0.4 ? 'moderate' : 'weak';
}
function dayInRange(date: string, start: string, end: string) { return date >= start && date <= end; }
function source(domain: string, ids: string[]): AnalyticsSourceRef[] {
  const clean = [...new Set(ids.filter(Boolean))];
  return clean.length ? [{ domain, recordIds: clean }] : [];
}
function pearson(a: number[], b: number[]): number | null {
  if (a.length !== b.length || a.length < 3) return null;
  const am = a.reduce((s, v) => s + v, 0) / a.length;
  const bm = b.reduce((s, v) => s + v, 0) / b.length;
  let numerator = 0; let ad = 0; let bd = 0;
  for (let i = 0; i < a.length; i += 1) { const x = a[i] - am; const y = b[i] - bm; numerator += x * y; ad += x * x; bd += y * y; }
  if (ad === 0 || bd === 0) return null;
  return numerator / Math.sqrt(ad * bd);
}
function days(start: string, end: string): string[] {
  const out: string[] = []; let cursor = start;
  while (cursor <= end) { out.push(cursor); const next = addDays(cursor, 1); if (!next) break; cursor = next; }
  return out;
}
function periodToHistorical(period: IntelligencePeriod): HistoricalAnalyticsPeriod {
  return period === 365 ? 90 : period;
}
function periodRange(endDate: CivilDate, period: IntelligencePeriod) {
  return getStandardAnalyticsRange(endDate, period as StandardAnalyticsPeriod);
}

export async function getInsightFeedback(): Promise<InsightFeedbackRecord[]> {
  try { const raw = await AsyncStorage.getItem(FEEDBACK_KEY); const parsed = raw ? JSON.parse(raw) : []; return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}

export async function setInsightFeedback(insightId: string, feedback: InsightFeedback): Promise<InsightFeedbackRecord> {
  const records = await getInsightFeedback();
  const next = { insightId, feedback, updatedAt: new Date().toISOString() };
  const merged = [...records.filter((item) => item.insightId !== insightId), next].slice(-500);
  await AsyncStorage.setItem(FEEDBACK_KEY, JSON.stringify(merged));
  return next;
}

export async function getInsightHistory(): Promise<InsightHistoryRecord[]> {
  try { const raw = await AsyncStorage.getItem(HISTORY_KEY); const parsed = raw ? JSON.parse(raw) : []; return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}

async function persistInsightHistory(insights: AnalyticsInsight[], feedback: InsightFeedbackRecord[]): Promise<InsightHistoryRecord[]> {
  const previous = await getInsightHistory();
  const feedbackMap = new Map(feedback.map((item) => [item.insightId, item.feedback]));
  const now = new Date().toISOString();
  const byId = new Map(previous.map((item) => [item.insight.id, item]));
  for (const insight of insights) byId.set(insight.id, { insight, feedback: feedbackMap.get(insight.id) ?? byId.get(insight.id)?.feedback });
  const next = [...byId.values()].slice(-1000).map((item) => ({ ...item, archivedAt: item.archivedAt ?? now }));
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  return next;
}

function auditText(values: string[]): IntelligenceAudit {
  const violations = values.filter((value) => CAUSAL_WORDS.test(value));
  return { safe: violations.length === 0, violations, checkedAt: new Date().toISOString() };
}

export function validateAnalyticsMetricRegistry(keys: string[]): { valid: boolean; missing: string[] } {
  const registry = new Set(keys);
  const required = [
    'tasks:completed','tasks:completion-rate','tasks:overdue','tasks:created',
    'habits:completions','habits:completion-rate','habits:active-consistency',
    'workout:sessions','workout:minutes','workout:sets',
    'sleep:average-duration','sleep:records',
    'nutrition:logged-days','nutrition:meals',
    'finance:income','finance:expenses','finance:net-flow','finance:transactions',
    'books:completed','books:pages','books:activity','journal:entries','journal:active-days','goals:completed','recovery:history',
  ];
  const missing = required.filter((key) => !registry.has(key));
  return { valid: missing.length === 0, missing };
}

export async function buildAdvancedIntelligence(endDate: CivilDate = todayCivilDate(), period: IntelligencePeriod = 30): Promise<AdvancedIntelligenceResult> {
  if (!isValidCivilDate(endDate)) throw new Error('Invalid intelligence date');
  const shared = await loadSharedAnalyticsData();
  const range = periodRange(endDate, period);
  const historical = await getHistoricalAnalytics({ period: periodToHistorical(period), endDate, filter: 'all' });
  const comparisons: IntelligenceComparison[] = historical.metrics.map((metric) => ({
    period,
    currentStart: range.startDate, currentEnd: range.endDate,
    previousStart: range.previousStartDate, previousEnd: range.previousEndDate,
    metricId: metric.id, currentValue: metric.currentValue, previousValue: metric.previousValue,
    absoluteChange: metric.absoluteChange, percentageChange: metric.percentageChange,
    direction: metric.rawTrend,
  }));

  const d = shared.data;
  const dayList = days(range.startDate, range.endDate);
  const taskByDay = new Map<string, number>();
  const habitByDay = new Map<string, number>();
  const workoutByDay = new Map<string, number>();
  const sleepByDay = new Map<string, number>();
  const expenseByDay = new Map<string, number>();
  const journalByDay = new Map<string, number>();
  for (const day of dayList) { taskByDay.set(day, 0); habitByDay.set(day, 0); workoutByDay.set(day, 0); sleepByDay.set(day, 0); expenseByDay.set(day, 0); journalByDay.set(day, 0); }
  for (const t of d.tasks) if (t.completed && typeof t.completedAt === 'string' && taskByDay.has(t.completedAt.slice(0,10))) taskByDay.set(t.completedAt.slice(0,10), (taskByDay.get(t.completedAt.slice(0,10)) ?? 0) + 1);
  for (const h of d.habitLogs) if (h.completed && habitByDay.has(h.date)) habitByDay.set(h.date, (habitByDay.get(h.date) ?? 0) + 1);
  for (const w of d.workouts) if (w.status === 'completed' && typeof (w.completedAt ?? w.startedAt) === 'string') { const day = (w.completedAt ?? w.startedAt)!.slice(0,10); if (workoutByDay.has(day)) workoutByDay.set(day, (workoutByDay.get(day) ?? 0) + 1); }
  for (const s of d.sleep) if (validNumber(s.durationMinutes) && sleepByDay.has(s.date)) sleepByDay.set(s.date, s.durationMinutes);
  for (const t of d.transactions) if (t.type === 'expense' && validNumber(t.amount) && expenseByDay.has(t.date)) expenseByDay.set(t.date, (expenseByDay.get(t.date) ?? 0) + t.amount);
  for (const j of d.journal) if (journalByDay.has(j.date)) journalByDay.set(j.date, (journalByDay.get(j.date) ?? 0) + 1);

  const series: Array<{ left: string; right: string; a: Map<string, number>; b: Map<string, number>; refs: AnalyticsSourceRef[] }> = [
    { left: 'tasks:completed', right: 'habits:completions', a: taskByDay, b: habitByDay, refs: [...source('tasks', d.tasks.map((x) => x.id)), ...source('habits', d.habitLogs.map((x) => x.id))] },
    { left: 'workout:sessions', right: 'sleep:average-duration', a: workoutByDay, b: sleepByDay, refs: [...source('workout', d.workouts.map((x) => x.id)), ...source('sleep', d.sleep.map((x) => x.id))] },
    { left: 'workout:sessions', right: 'journal:entries', a: workoutByDay, b: journalByDay, refs: [...source('workout', d.workouts.map((x) => x.id)), ...source('journal', d.journal.map((x) => x.id))] },
    { left: 'finance:expenses', right: 'journal:entries', a: expenseByDay, b: journalByDay, refs: [...source('finance', d.transactions.map((x) => x.id)), ...source('journal', d.journal.map((x) => x.id))] },
  ];
  const correlations: IntelligenceCorrelation[] = [];
  for (const item of series) {
    const a = dayList.map((day) => item.a.get(day) ?? 0);
    const b = dayList.map((day) => item.b.get(day) ?? 0);
    const coefficient = pearson(a, b);
    if (coefficient == null || Math.abs(coefficient) < 0.4) continue;
    correlations.push({ id: `corr-${item.left}-${item.right}`, leftMetric: item.left, rightMetric: item.right, coefficient: Number(coefficient.toFixed(3)), sampleSize: a.length, direction: coefficient >= 0 ? 'positive' : 'negative', strength: strength(coefficient), sourceRefs: uniqueSourceRefs(item.refs), generatedAt: new Date().toISOString() });
  }

  const anomalyCandidates: Array<{ metric: string; values: Array<{ date: CivilDate; value: number; ids: string[] }>; domain: string }> = [
    { metric: 'tasks:completed', values: dayList.map((date) => ({ date, value: taskByDay.get(date) ?? 0, ids: d.tasks.filter((x) => x.completedAt?.slice(0,10) === date).map((x) => x.id) })), domain: 'tasks' },
    { metric: 'habits:completions', values: dayList.map((date) => ({ date, value: habitByDay.get(date) ?? 0, ids: d.habitLogs.filter((x) => x.date === date).map((x) => x.id) })), domain: 'habits' },
    { metric: 'workout:sessions', values: dayList.map((date) => ({ date, value: workoutByDay.get(date) ?? 0, ids: d.workouts.filter((x) => (x.completedAt ?? x.startedAt)?.slice(0,10) === date).map((x) => x.id) })), domain: 'workout' },
    { metric: 'finance:expenses', values: dayList.map((date) => ({ date, value: expenseByDay.get(date) ?? 0, ids: d.transactions.filter((x) => x.date === date).map((x) => x.id) })), domain: 'finance' },
  ];
  const anomalies: IntelligenceAnomaly[] = [];
  for (const candidate of anomalyCandidates) {
    const values = candidate.values.map((x) => x.value);
    const mean = values.reduce((s, v) => s + v, 0) / Math.max(1, values.length);
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(1, values.length);
    const sd = Math.sqrt(variance);
    if (!Number.isFinite(sd) || sd === 0) continue;
    for (const point of candidate.values) {
      const z = (point.value - mean) / sd;
      if (Math.abs(z) < 2.5 || point.ids.length === 0) continue;
      anomalies.push({ id: `anomaly-${candidate.metric}-${point.date}`, metric: candidate.metric, date: point.date, value: point.value, baselineMean: Number(mean.toFixed(2)), baselineStdDev: Number(sd.toFixed(2)), zScore: Number(z.toFixed(2)), direction: z > 0 ? 'high' : 'low', sourceRefs: source(candidate.domain, point.ids), generatedAt: new Date().toISOString() });
    }
  }

  const recommendations: IntelligenceRecommendation[] = [];
  const overdue = historical.metrics.find((m) => m.id === 'tasks:overdue');
  if (overdue?.currentValue && overdue.currentValue > 0) recommendations.push({ id: 'rec-overdue-tasks', title: 'Review overdue tasks', action: 'Open Tasks and reschedule or complete overdue work.', reason: 'Recorded overdue tasks are present in the selected period.', priority: 'high', sourceRefs: source('tasks', d.tasks.filter((x) => !x.completed && x.dueDate && dayInRange(x.dueDate, range.startDate, range.endDate)).map((x) => x.id)), generatedAt: new Date().toISOString() });
  const habitRate = historical.metrics.find((m) => m.id === 'habits:completion-rate');
  if (habitRate?.currentValue != null && habitRate.currentValue < 50) recommendations.push({ id: 'rec-habit-consistency', title: 'Simplify habit load', action: 'Review active habits and reduce or reschedule low-priority habits.', reason: 'Recorded habit completion rate is below 50% for the selected period.', priority: 'medium', sourceRefs: source('habits', d.habits.filter((x) => x.isActive).map((x) => x.id)), generatedAt: new Date().toISOString() });
  const expense = historical.metrics.find((m) => m.id === 'finance:expenses');
  if (expense?.percentageChange != null && expense.percentageChange > 20) recommendations.push({ id: 'rec-expense-review', title: 'Review expense change', action: 'Open Finance and inspect the transactions contributing to the period change.', reason: 'Recorded expenses changed by more than 20% versus the previous period.', priority: 'medium', sourceRefs: source('finance', d.transactions.filter((x) => x.type === 'expense' && dayInRange(x.date, range.startDate, range.endDate)).map((x) => x.id)), generatedAt: new Date().toISOString() });
  if (anomalies.length) recommendations.push({ id: 'rec-anomaly-review', title: 'Review unusual activity', action: 'Inspect the source records behind the detected anomaly before drawing conclusions.', reason: 'A recorded metric is unusually far from its selected-period baseline.', priority: 'low', sourceRefs: uniqueSourceRefs(anomalies.flatMap((x) => x.sourceRefs)), generatedAt: new Date().toISOString() });

  const feedback = await getInsightFeedback();
  const insights: AnalyticsInsight[] = [];
  for (const recommendation of recommendations) {
    const textParts = [recommendation.title, recommendation.action, recommendation.reason];
    const audit = auditText(textParts);
    if (!audit.safe) continue;
    insights.push(createInsight(`advanced-${recommendation.id}`, recommendation.title, recommendation.action, recommendation.reason, recommendation.sourceRefs, recommendation.priority === 'high' ? 0.9 : recommendation.priority === 'medium' ? 0.75 : 0.6));
  }
  const history = await persistInsightHistory(insights, feedback);
  const causalAudit = auditText([...insights.flatMap((i) => [i.title, i.detail, i.reason]), ...recommendations.map((r) => r.reason)]);
  return { generatedAt: new Date().toISOString(), period, comparisons, correlations, anomalies, recommendations, insights, history, feedback, causalAudit, degradedDomains: shared.degradedDomains };
}

export async function buildWeeklyMonthlyYearlyIntelligence(endDate: CivilDate = todayCivilDate()) {
  const periods: IntelligencePeriod[] = [7, 30, 365];
  return Promise.all(periods.map((period) => buildAdvancedIntelligence(endDate, period)));
}
