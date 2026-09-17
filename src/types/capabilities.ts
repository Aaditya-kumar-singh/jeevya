import type { AuthState } from '@/types/auth';

export type LifeOSAccessLevel = 'local' | 'account' | 'global';

export type LifeOSCapability =
  | 'tasks' | 'habits' | 'workout' | 'sleep' | 'nutrition' | 'finance' | 'books' | 'journal'
  | 'analytics' | 'weeklyReview' | 'dailyPulse' | 'dailyPlan' | 'lifeIntelligence' | 'unifiedSearch'
  | 'lifeTimeline' | 'dataQuality' | 'backup' | 'localLocation'
  | 'cloudSync' | 'crossDevice' | 'accountSettings'
  | 'globalStats' | 'leaderboard' | 'community' | 'globalChallenges' | 'locationComparison';

export interface LifeOSCapabilityDefinition {
  feature: LifeOSCapability;
  accessLevel: LifeOSAccessLevel;
}

export interface LifeOSAccessResult {
  feature: string;
  accessLevel: LifeOSAccessLevel | null;
  allowed: boolean;
  requiresAuthentication: boolean;
}

export const LIFEOS_CAPABILITY_REGISTRY: Readonly<Record<LifeOSCapability, LifeOSCapabilityDefinition>> = {
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

export function getFeatureAccess(feature: string): LifeOSCapabilityDefinition | null {
  if (!Object.prototype.hasOwnProperty.call(LIFEOS_CAPABILITY_REGISTRY, feature)) return null;
  return LIFEOS_CAPABILITY_REGISTRY[feature as LifeOSCapability];
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

export function checkFeatureAccess(feature: string, authState: AuthState): LifeOSAccessResult {
  const definition = getFeatureAccess(feature);
  return {
    feature,
    accessLevel: definition?.accessLevel ?? null,
    allowed: canAccess(feature, authState),
    requiresAuthentication: requiresAuthentication(feature),
  };
}
