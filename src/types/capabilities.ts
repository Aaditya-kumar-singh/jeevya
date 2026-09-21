import type { AuthState } from '@/types/auth';

export type JeevyaAccessLevel = 'local' | 'account' | 'global';

export type JeevyaCapability =
  | 'tasks' | 'habits' | 'workout' | 'sleep' | 'nutrition' | 'finance' | 'books' | 'journal'
  | 'analytics' | 'weeklyReview' | 'dailyPulse' | 'dailyPlan' | 'lifeIntelligence' | 'unifiedSearch'
  | 'lifeTimeline' | 'dataQuality' | 'backup' | 'localLocation'
  | 'cloudSync' | 'crossDevice' | 'accountSettings'
  | 'globalStats' | 'leaderboard' | 'community' | 'globalChallenges' | 'locationComparison';

export interface JeevyaCapabilityDefinition {
  feature: JeevyaCapability;
  accessLevel: JeevyaAccessLevel;
}

export interface JeevyaAccessResult {
  feature: string;
  accessLevel: JeevyaAccessLevel | null;
  allowed: boolean;
  requiresAuthentication: boolean;
}

export const JEEVYA_CAPABILITY_REGISTRY: Readonly<Record<JeevyaCapability, JeevyaCapabilityDefinition>> = {
  tasks: { feature: 'tasks', accessLevel: 'local' },
  habits: { feature: 'habits', accessLevel: 'local' },
  workout: { feature: 'workout', accessLevel: 'local' },
  sleep: { feature: 'sleep', accessLevel: 'local' },
  nutrition: { feature: 'nutrition', accessLevel: 'local' },
  finance: { feature: 'finance', accessLevel: 'local' },
  books: { feature: 'books', accessLevel: 'local' },
  journal: { feature: 'journal', accessLevel: 'local' },
  analytics: { feature: 'analytics', accessLevel: 'local' },
  weeklyReview: { feature: 'weeklyReview', accessLevel: 'local' },
  dailyPulse: { feature: 'dailyPulse', accessLevel: 'local' },
  dailyPlan: { feature: 'dailyPlan', accessLevel: 'local' },
  lifeIntelligence: { feature: 'lifeIntelligence', accessLevel: 'local' },
  unifiedSearch: { feature: 'unifiedSearch', accessLevel: 'local' },
  lifeTimeline: { feature: 'lifeTimeline', accessLevel: 'local' },
  dataQuality: { feature: 'dataQuality', accessLevel: 'local' },
  backup: { feature: 'backup', accessLevel: 'local' },
  localLocation: { feature: 'localLocation', accessLevel: 'local' },
  cloudSync: { feature: 'cloudSync', accessLevel: 'account' },
  crossDevice: { feature: 'crossDevice', accessLevel: 'account' },
  accountSettings: { feature: 'accountSettings', accessLevel: 'account' },
  globalStats: { feature: 'globalStats', accessLevel: 'global' },
  leaderboard: { feature: 'leaderboard', accessLevel: 'global' },
  community: { feature: 'community', accessLevel: 'global' },
  globalChallenges: { feature: 'globalChallenges', accessLevel: 'global' },
  locationComparison: { feature: 'locationComparison', accessLevel: 'global' },
};

export function getFeatureAccess(feature: string): JeevyaCapabilityDefinition | null {
  if (!Object.prototype.hasOwnProperty.call(JEEVYA_CAPABILITY_REGISTRY, feature)) return null;
  return JEEVYA_CAPABILITY_REGISTRY[feature as JeevyaCapability];
}

export function requiresAuthentication(feature: string): boolean {
  const definition = getFeatureAccess(feature);
  return definition?.accessLevel === 'account' || definition?.accessLevel === 'global';
}

export function canAccess(feature: string, authState: AuthState): boolean {
  const definition = getFeatureAccess(feature);
  if (!definition || authState === 'loading') return false;
  return definition.accessLevel === 'local' || authState === 'authenticated';
}

export function checkFeatureAccess(feature: string, authState: AuthState): JeevyaAccessResult {
  const definition = getFeatureAccess(feature);
  return {
    feature,
    accessLevel: definition?.accessLevel ?? null,
    allowed: canAccess(feature, authState),
    requiresAuthentication: requiresAuthentication(feature),
  };
}
