import type { CivilDate } from '@/lib/date';

export type LifeInsightSeverity = 'warning' | 'positive' | 'info';
export type LifeInsightDomain = 'productivity' | 'health' | 'nutrition' | 'finance' | 'learning' | 'reflection' | 'goals' | 'consistency';

export interface LifeInsightSourceRef {
  domain: string;
  recordIds: string[];
}

export interface LifeInsight {
  id: string;
  domain: LifeInsightDomain;
  severity: LifeInsightSeverity;
  title: string;
  description: string;
  value?: number;
  unit?: string;
  source: string;
  sourceRefs: LifeInsightSourceRef[];
}

export interface LifeIntelligenceResult {
  date: CivilDate;
  insights: LifeInsight[];
  summary: string;
}
