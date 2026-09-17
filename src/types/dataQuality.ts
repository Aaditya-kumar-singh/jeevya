export type DataQualityDomain =
  | 'tasks'
  | 'habits'
  | 'health'
  | 'sleep'
  | 'recovery'
  | 'nutrition'
  | 'finance'
  | 'books'
  | 'journal'
  | 'goals'
  | 'integration';

export type DataQualityStatus = 'healthy' | 'warning' | 'degraded' | 'unavailable';
export type DataQualitySeverity = 'info' | 'warning' | 'critical';

export interface DataQualityDiagnostic {
  domain: DataQualityDomain;
  status: DataQualityStatus;
  severity: DataQualitySeverity;
  issue: string;
  description: string;
  affectedArea: string;
  actionable: boolean;
  route?: string;
  stableId: string;
}

export interface DataQualityDomainStatus {
  domain: DataQualityDomain;
  status: DataQualityStatus;
  diagnosticCount: number;
}

export interface DataQualityModel {
  date: string;
  overallStatus: DataQualityStatus;
  diagnostics: DataQualityDiagnostic[];
  domainStatuses: DataQualityDomainStatus[];
  degradedDomains: DataQualityDomain[];
}
