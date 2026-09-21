import type { AuthState } from '@/types/auth';
import {
  JEEVYA_CAPABILITY_REGISTRY,
  canAccess as canAccessCapability,
  checkFeatureAccess,
  getFeatureAccess as getCapabilityDefinition,
  requiresAuthentication as capabilityRequiresAuthentication,
} from '@/types/capabilities';
import type { JeevyaAccessResult, JeevyaCapabilityDefinition } from '@/types/capabilities';

export type { JeevyaAccessLevel, JeevyaCapability, JeevyaCapabilityDefinition } from '@/types/capabilities';
export { JEEVYA_CAPABILITY_REGISTRY };

export function getFeatureAccess(feature: string): JeevyaCapabilityDefinition | null {
  return getCapabilityDefinition(feature);
}

export function canAccess(feature: string, authState: AuthState): boolean {
  return canAccessCapability(feature, authState);
}

export function requiresAuthentication(feature: string): boolean {
  return capabilityRequiresAuthentication(feature);
}

export function checkAccess(feature: string, authState: AuthState): JeevyaAccessResult {
  return checkFeatureAccess(feature, authState);
}
