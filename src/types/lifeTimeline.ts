import type { CivilDate } from '@/lib/date';

export type LifeTimelineDomain =
  | 'tasks' | 'habits' | 'workout' | 'sleep' | 'nutrition' | 'finance' | 'books' | 'journal' | 'goals';

export type LifeTimelineEventType =
  | 'created' | 'completed' | 'updated' | 'logged' | 'started' | 'finished' | 'progress' | 'transaction' | 'entry' | 'milestone';

export type LifeTimelineFilter =
  | 'all' | 'tasks' | 'habits' | 'health/workout' | 'nutrition' | 'finance' | 'books' | 'journal' | 'goals';

export interface LifeTimelineEvent {
  id: string;
  domain: LifeTimelineDomain;
  type: LifeTimelineEventType;
  title: string;
  description?: string;
  timestamp: string;
  date: CivilDate;
  status?: string;
  sourceId: string;
  route?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface LifeTimelineRange {
  startDate?: CivilDate;
  endDate?: CivilDate;
}

export interface LifeTimelineQuery extends LifeTimelineRange {
  filter?: LifeTimelineFilter;
  search?: string;
  newestFirst?: boolean;
  limit?: number;
  offset?: number;
}

export interface LifeTimelineResult {
  events: LifeTimelineEvent[];
  total: number;
  degradedDomains: LifeTimelineDomain[];
  errors: Partial<Record<LifeTimelineDomain, string>>;
}
