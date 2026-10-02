import type { CivilDate } from '@/lib/date';

export type SearchDomain = 'tasks' | 'habits' | 'books' | 'journal' | 'finance' | 'goals' | 'nutrition' | 'workouts';

export interface SearchFilters {
  domains?: SearchDomain[];
  finance?: {
    minAmount?: number;
    maxAmount?: number;
    startDate?: string;
    endDate?: string;
    source?: string;
    categoryId?: string;
    type?: 'income' | 'expense' | 'transfer';
  };
}

export interface UnifiedSearchAction {
  label: string;
  route: string;
}

export interface UnifiedSearchResult {
  id: string;
  domain: SearchDomain;
  title: string;
  subtitle?: string;
  route: string;
  score?: number;
  matchedFields?: string[];
  actions?: UnifiedSearchAction[];
}

export interface UnifiedSearchResponse {
  query: string;
  date: CivilDate;
  filters?: SearchFilters;
  results: UnifiedSearchResult[];
  total: number;
}

export const SEARCH_DOMAINS: SearchDomain[] = [
  'tasks', 'habits', 'books', 'journal', 'finance', 'goals', 'nutrition', 'workouts',
];
