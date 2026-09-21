import type { CivilDate } from '@/lib/date';
import type { JeevyaAnalyticsResult } from '@/types/jeevyaAnalytics';

export type WeeklyReviewTone = 'positive' | 'attention' | 'neutral';

export interface WeeklyReviewInsight {
  id: string;
  tone: WeeklyReviewTone;
  title: string;
  description: string;
  value?: number;
}

export interface WeeklyReviewResult {
  startDate: CivilDate;
  endDate: CivilDate;
  analytics: JeevyaAnalyticsResult;
  insights: WeeklyReviewInsight[];
}
