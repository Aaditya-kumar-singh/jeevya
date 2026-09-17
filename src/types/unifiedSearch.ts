import type { CivilDate } from '@/lib/date';

export type SearchDomain = 'tasks' | 'habits' | 'books' | 'journal' | 'finance' | 'goals';

export interface UnifiedSearchResult {
  id: string;
  domain: SearchDomain;
  title: string;
  subtitle?: string;
  route: string;
}

export interface UnifiedSearchResponse {
  query: string;
  date: CivilDate;
  results: UnifiedSearchResult[];
}
