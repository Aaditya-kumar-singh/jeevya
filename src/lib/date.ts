// ─── LifeOS Canonical Date Utilities (A3) ─────────────────────────────────────
// Date policy:
// - CivilDate is a calendar date (YYYY-MM-DD), never an instant.
// - Civil-date arithmetic uses UTC-noon internally so timezone offsets cannot
//   move a calendar day across a boundary.
// - Instant helpers operate on ISO timestamps and preserve instant semantics.

export type CivilDate = string;

const CIVIL_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86_400_000;

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return 0;
  return [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] ?? 0;
}

export function isValidCivilDate(value: unknown): value is CivilDate {
  if (typeof value !== 'string') return false;
  const match = value.match(CIVIL_DATE_RE);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return day >= 1 && day <= daysInMonth(year, month);
}

export function parseCivilDate(value: string): { year: number; month: number; day: number } | null {
  if (!isValidCivilDate(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  return { year, month, day };
}

export function formatCivilDate(year: number, month: number, day: number): CivilDate | null {
  if (!isValidCivilDate(`${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`)) return null;
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function civilNoon(value: CivilDate): Date {
  const parsed = parseCivilDate(value);
  if (!parsed) throw new RangeError(`Invalid CivilDate: ${value}`);
  return new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day, 12));
}

export function todayCivilDate(now: Date = new Date()): CivilDate {
  return now.toISOString().slice(0, 10);
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function addDays(value: CivilDate, delta: number): CivilDate | null {
  if (!isValidCivilDate(value) || !Number.isInteger(delta)) return null;
  const date = civilNoon(value);
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

export function daysBetweenInclusive(start: CivilDate, end: CivilDate): number {
  if (!isValidCivilDate(start) || !isValidCivilDate(end)) return 0;
  return Math.floor((civilNoon(end).getTime() - civilNoon(start).getTime()) / DAY_MS) + 1;
}

export function inclusiveDateRange(start: CivilDate, end: CivilDate): CivilDate[] {
  if (!isValidCivilDate(start) || !isValidCivilDate(end) || start > end) return [];
  const result: CivilDate[] = [];
  let current: CivilDate | null = start;
  while (current && current <= end) {
    result.push(current);
    current = addDays(current, 1);
  }
  return result;
}

export function weekdayOf(value: CivilDate): number {
  if (!isValidCivilDate(value)) return -1;
  return civilNoon(value).getUTCDay();
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(delta)) return null;
  const total = year * 12 + (month - 1) + delta;
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 + 1 };
}

export function isoTimestamp(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

export function formatCivilDateDisplay(value: CivilDate, locale = 'en-US'): string {
  const parsed = parseCivilDate(value);
  if (!parsed) return value;
  const date = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day, 12));
  return date.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}
