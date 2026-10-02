import { loadData, saveData } from '@/lib/storage';
import { uid } from '@/lib/uid';
import { getBooks } from '@/services/books';
import { getProgressHistory } from '@/services/book-progress';
import { getEntries } from '@/services/journal';
import type { Book, BookProgressEntry } from '@/types/books';
import type { JournalEntry } from '@/types/journal';

const KEYS = {
  sessions: 'jeevya:reading-sessions:v1',
  goals: 'jeevya:reading-goals:v2',
  notes: 'jeevya:book-notes:v1',
  journalMeta: 'jeevya:journal-meta:v2',
  journalLinks: 'jeevya:journal-links:v1',
  journalSettings: 'jeevya:journal-settings:v1',
} as const;

export type ReadingSession = {
  id: string;
  bookId: string;
  startedAt: string;
  endedAt: string;
  minutes: number;
  pagesStart: number;
  pagesEnd: number;
  pagesRead: number;
  notes?: string;
};

export type ReadingGoal = {
  id: string;
  title: string;
  metric: 'pages' | 'minutes' | 'sessions' | 'books';
  target: number;
  startDate: string;
  endDate: string;
  bookId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BookNote = {
  id: string;
  bookId: string;
  type: 'note' | 'highlight' | 'quote';
  text: string;
  page?: number | null;
  color?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type JournalMeta = {
  journalId: string;
  energy: number | null;
  gratitude: string[];
  attachments: Array<{ id: string; uri: string; name?: string; mimeType?: string }>;
  privateOnly: boolean;
};

export type JournalLink = {
  id: string;
  journalId: string;
  domain: 'tasks' | 'goals' | 'workout';
  recordId: string;
  createdAt: string;
};

export type JournalSettings = {
  privateOnly: boolean;
  aiSummaryOptIn: boolean;
  weeklyReflectionEnabled: boolean;
};

const read = async <T>(key: string, fallback: T): Promise<T> => {
  const value = await loadData<T>(key, fallback);
  return value ?? fallback;
};

const write = (key: string, value: unknown) => saveData(key, value);

const cleanDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : new Date().toISOString().slice(0, 10);
const dayOf = (value: string) => value.slice(0, 10);
const inRange = (day: string, start?: string, end?: string) => (!start || day >= start) && (!end || day <= end);

export async function getReadingSessions(bookId?: string): Promise<ReadingSession[]> {
  const rows = await read<ReadingSession[]>(KEYS.sessions, []);
  return rows.filter(x => !bookId || x.bookId === bookId).filter(x => x.id && x.bookId && x.minutes >= 0).sort((a,b) => b.startedAt.localeCompare(a.startedAt));
}

export async function createReadingSession(input: Omit<ReadingSession, 'id' | 'pagesRead'>): Promise<ReadingSession> {
  const minutes = Math.max(0, Math.round(input.minutes));
  const pagesRead = Math.max(0, Math.floor(input.pagesEnd) - Math.floor(input.pagesStart));
  const row: ReadingSession = { ...input, id: uid('rs_'), minutes, pagesStart: Math.max(0, Math.floor(input.pagesStart)), pagesEnd: Math.max(0, Math.floor(input.pagesEnd)), pagesRead };
  const rows = await read<ReadingSession[]>(KEYS.sessions, []);
  await write(KEYS.sessions, [row, ...rows]);
  return row;
}

export async function deleteReadingSession(id: string): Promise<void> {
  const rows = await read<ReadingSession[]>(KEYS.sessions, []);
  await write(KEYS.sessions, rows.filter(x => x.id !== id));
}

export async function getReadingStreak(bookId?: string, asOf = new Date().toISOString().slice(0,10)): Promise<number> {
  const [sessions, progress] = await Promise.all([
    getReadingSessions(bookId),
    bookId ? getProgressHistory(bookId) : Promise.resolve([] as BookProgressEntry[]),
  ]);
  const active = new Set<string>();
  sessions.forEach(s => { if (s.minutes > 0) active.add(dayOf(s.startedAt)); });
  progress.forEach(p => active.add(dayOf(p.recordedAt)));
  let cursor = cleanDate(asOf);
  if (!active.has(cursor)) {
    const d = new Date(cursor + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate()-1); cursor = d.toISOString().slice(0,10);
  }
  let streak = 0;
  while (active.has(cursor)) {
    streak++;
    const d = new Date(cursor + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate()-1); cursor = d.toISOString().slice(0,10);
  }
  return streak;
}

export async function getReadingGoals(): Promise<ReadingGoal[]> {
  return (await read<ReadingGoal[]>(KEYS.goals, [])).sort((a,b) => a.endDate.localeCompare(b.endDate));
}

export async function saveReadingGoal(input: Omit<ReadingGoal, 'id'|'createdAt'|'updatedAt'>, id?: string): Promise<ReadingGoal> {
  const rows = await getReadingGoals();
  const now = new Date().toISOString();
  const existing = id ? rows.find(x => x.id === id) : undefined;
  const row: ReadingGoal = { ...input, id: id ?? uid('rgoal_'), createdAt: existing?.createdAt ?? now, updatedAt: now };
  await write(KEYS.goals, existing ? rows.map(x => x.id === id ? row : x) : [row, ...rows]);
  return row;
}

export async function getReadingGoalProgress(goal: ReadingGoal): Promise<{ current: number; target: number; percent: number }> {
  const books = await getBooks();
  const sessions = await getReadingSessions(goal.bookId ?? undefined);
  let current = 0;
  if (goal.metric === 'books') current = books.filter(b => b.status === 'completed' && b.completedAt && inRange(dayOf(b.completedAt), goal.startDate, goal.endDate)).length;
  if (goal.metric === 'minutes') current = sessions.filter(s => inRange(dayOf(s.startedAt), goal.startDate, goal.endDate)).reduce((n,s) => n+s.minutes, 0);
  if (goal.metric === 'pages') current = sessions.filter(s => inRange(dayOf(s.startedAt), goal.startDate, goal.endDate)).reduce((n,s) => n+s.pagesRead, 0);
  if (goal.metric === 'sessions') current = sessions.filter(s => inRange(dayOf(s.startedAt), goal.startDate, goal.endDate)).length;
  return { current, target: goal.target, percent: goal.target > 0 ? Math.min(100, Math.round(current / goal.target * 100)) : 0 };
}

export async function getBookNotes(bookId: string): Promise<BookNote[]> {
  const rows = await read<BookNote[]>(KEYS.notes, []);
  return rows.filter(x => x.bookId === bookId).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
}

export async function saveBookNote(input: Omit<BookNote, 'id'|'createdAt'|'updatedAt'>, id?: string): Promise<BookNote> {
  const rows = await read<BookNote[]>(KEYS.notes, []);
  const now = new Date().toISOString();
  const existing = id ? rows.find(x => x.id === id) : undefined;
  const row: BookNote = { ...input, text: input.text.trim(), id: id ?? uid('bnote_'), createdAt: existing?.createdAt ?? now, updatedAt: now };
  await write(KEYS.notes, existing ? rows.map(x => x.id === id ? row : x) : [row, ...rows]);
  return row;
}

export async function deleteBookNote(id: string): Promise<void> {
  const rows = await read<BookNote[]>(KEYS.notes, []);
  await write(KEYS.notes, rows.filter(x => x.id !== id));
}

export async function getJournalMeta(journalId: string): Promise<JournalMeta> {
  const all = await read<Record<string, JournalMeta>>(KEYS.journalMeta, {});
  return all[journalId] ?? { journalId, energy: null, gratitude: [], attachments: [], privateOnly: false };
}

export async function saveJournalMeta(meta: JournalMeta): Promise<JournalMeta> {
  const all = await read<Record<string, JournalMeta>>(KEYS.journalMeta, {});
  all[meta.journalId] = { ...meta, energy: meta.energy == null ? null : Math.min(10, Math.max(1, Math.round(meta.energy))), gratitude: meta.gratitude.filter(Boolean).slice(0, 10) };
  await write(KEYS.journalMeta, all);
  return all[meta.journalId];
}

export async function getJournalSettings(): Promise<JournalSettings> {
  return read<JournalSettings>(KEYS.journalSettings, { privateOnly: true, aiSummaryOptIn: false, weeklyReflectionEnabled: true });
}

export async function saveJournalSettings(patch: Partial<JournalSettings>): Promise<JournalSettings> {
  const next = { ...(await getJournalSettings()), ...patch };
  await write(KEYS.journalSettings, next);
  return next;
}

export async function searchJournal(query: string, filters?: { mood?: JournalEntry['mood']; startDate?: string; endDate?: string }): Promise<JournalEntry[]> {
  const q = query.trim().toLowerCase();
  const rows = await getEntries();
  return rows.filter(e => (!q || [e.title,e.content,...e.tags].join(' ').toLowerCase().includes(q)) && (!filters?.mood || e.mood === filters.mood) && inRange(e.date, filters?.startDate, filters?.endDate));
}

export async function getJournalHeatmap(startDate: string, endDate: string): Promise<Array<{ date: string; entries: number; mood: number | null; energy: number | null }>> {
  const [entries, metas] = await Promise.all([getEntries(), read<Record<string, JournalMeta>>(KEYS.journalMeta, {})]);
  const byDate = new Map<string, JournalEntry[]>();
  entries.filter(e => inRange(e.date, startDate, endDate)).forEach(e => byDate.set(e.date, [...(byDate.get(e.date) ?? []), e]));
  const out: Array<{date:string;entries:number;mood:number|null;energy:number|null}> = [];
  const d = new Date(startDate + 'T12:00:00Z'); const end = new Date(endDate + 'T12:00:00Z');
  while (d <= end) {
    const date = d.toISOString().slice(0,10), es = byDate.get(date) ?? [];
    const moods: number[] = es.map(e => e.mood === 'great' ? 5 : e.mood === 'good' ? 4 : e.mood === 'okay' ? 3 : e.mood === 'bad' ? 2 : e.mood === 'awful' ? 1 : 0); const positiveMoods = moods.filter(x => x > 0);
    const energies = es.map(e => metas[e.id]?.energy ?? null).filter((x): x is number => x != null);
    out.push({ date, entries: es.length, mood: positiveMoods.length ? Math.round(positiveMoods.reduce((a,b)=>a+b,0)/positiveMoods.length) : null, energy: energies.length ? Math.round(energies.reduce((a,b)=>a+b,0)/energies.length) : null });
    d.setUTCDate(d.getUTCDate()+1);
  }
  return out;
}

export async function saveJournalLink(input: Omit<JournalLink,'id'|'createdAt'>): Promise<JournalLink> {
  const rows = await read<JournalLink[]>(KEYS.journalLinks, []);
  const existing = rows.find(x => x.journalId === input.journalId && x.domain === input.domain && x.recordId === input.recordId);
  if (existing) return existing;
  const row = { ...input, id: uid('jlink_'), createdAt: new Date().toISOString() };
  await write(KEYS.journalLinks, [row, ...rows]);
  return row;
}

export async function getJournalLinks(journalId: string): Promise<JournalLink[]> {
  return (await read<JournalLink[]>(KEYS.journalLinks, [])).filter(x => x.journalId === journalId);
}

export async function deleteJournalLink(id: string): Promise<void> {
  const rows = await read<JournalLink[]>(KEYS.journalLinks, []);
  await write(KEYS.journalLinks, rows.filter(x => x.id !== id));
}

export async function exportJournalJSON(): Promise<string> {
  const [entries, meta, links] = await Promise.all([getEntries(), read<Record<string, JournalMeta>>(KEYS.journalMeta, {}), read<JournalLink[]>(KEYS.journalLinks, [])]);
  return JSON.stringify({ exportedAt: new Date().toISOString(), entries, meta, links }, null, 2);
}

export async function exportReadingJSON(): Promise<string> {
  const [books, sessions, goals, notes] = await Promise.all([getBooks(), read<ReadingSession[]>(KEYS.sessions, []), read<ReadingGoal[]>(KEYS.goals, []), read<BookNote[]>(KEYS.notes, [])]);
  return JSON.stringify({ exportedAt: new Date().toISOString(), books, sessions, goals, notes }, null, 2);
}

export async function generateWeeklyReflectionPrompt(): Promise<string> {
  const entries = await getEntries();
  const weekAgo = new Date(); weekAgo.setUTCDate(weekAgo.getUTCDate()-6);
  const start = weekAgo.toISOString().slice(0,10);
  const recent = entries.filter(e => e.date >= start);
  if (!recent.length) return 'What would make next week feel meaningful?';
  const moods = recent.map(e => e.mood).filter(Boolean);
  const best = moods.includes('great') ? 'What helped you feel great this week?' : moods.includes('bad') || moods.includes('awful') ? 'What drained your energy, and what boundary could help next week?' : 'What pattern from this week would you like to repeat?';
  return best;
}

export async function summarizeJournalWithOptIn(journalId: string): Promise<string> {
  const settings = await getJournalSettings();
  if (!settings.aiSummaryOptIn) throw new Error('AI summarization is disabled. Enable explicit AI opt-in first.');
  const entry = (await getEntries()).find(e => e.id === journalId);
  if (!entry) throw new Error('Journal entry not found.');
  const endpoint = process.env.EXPO_PUBLIC_AI_SUMMARY_URL;
  if (!endpoint) throw new Error('No AI summary endpoint is configured. Your journal remains local-only.');
  const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: entry.content, title: entry.title }) });
  if (!response.ok) throw new Error('AI summary request failed.');
  const payload = await response.json() as { summary?: string };
  if (!payload.summary) throw new Error('AI provider returned no summary.');
  return payload.summary;
}

export async function getYearlyReadingReview(year: number): Promise<{
  year: number; booksCompleted: number; pagesRead: number; minutesRead: number; sessions: number; activeDays: number; streak: number; topBooks: Array<{book: Book; minutes: number; pages: number}>; byMonth: Array<{month:string;books:number;pages:number;minutes:number}>;
}> {
  const [books, sessions] = await Promise.all([getBooks(), getReadingSessions()]);
  const prefix = String(year).padStart(4,'0') + '-';
  const yearSessions = sessions.filter(s => dayOf(s.startedAt).startsWith(prefix));
  const completed = books.filter(b => b.status === 'completed' && b.completedAt?.startsWith(prefix));
  const pages = yearSessions.reduce((n,s)=>n+s.pagesRead,0);
  const minutes = yearSessions.reduce((n,s)=>n+s.minutes,0);
  const activeDays = new Set(yearSessions.map(s=>dayOf(s.startedAt))).size;
  const streak = await getReadingStreak(undefined, prefix + '12-31');
  const topMap = new Map<string,{minutes:number;pages:number}>();
  yearSessions.forEach(s => { const x=topMap.get(s.bookId) ?? {minutes:0,pages:0}; x.minutes += s.minutes; x.pages += s.pagesRead; topMap.set(s.bookId,x); });
  const topBooks = [...topMap].map(([id,v]) => ({ book: books.find(b=>b.id===id)!, ...v })).filter(x=>x.book).sort((a,b)=>b.minutes-a.minutes).slice(0,5);
  const byMonth = Array.from({length:12},(_,i)=>{ const m=String(i+1).padStart(2,'0'), p=prefix+m; return {month:p, books:completed.filter(b=>b.completedAt?.startsWith(p)).length, pages:yearSessions.filter(s=>dayOf(s.startedAt).startsWith(p)).reduce((n,s)=>n+s.pagesRead,0), minutes:yearSessions.filter(s=>dayOf(s.startedAt).startsWith(p)).reduce((n,s)=>n+s.minutes,0)}; });
  return { year, booksCompleted: completed.length, pagesRead: pages, minutesRead: minutes, sessions: yearSessions.length, activeDays, streak, topBooks, byMonth };
}
