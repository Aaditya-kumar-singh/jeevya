import type { AuthState } from '@/types/auth';
import {
  LIFEOS_CAPABILITY_REGISTRY,
  canAccess as canAccessCapability,
  checkFeatureAccess,
  getFeatureAccess as getCapabilityDefinition,
  requiresAuthentication as capabilityRequiresAuthentication,
} from '@/types/capabilities';
import type { LifeOSAccessResult, LifeOSCapabilityDefinition } from '@/types/capabilities';

export type { LifeOSAccessLevel, LifeOSCapability, LifeOSCapabilityDefinition } from '@/types/capabilities';
export { LIFEOS_CAPABILITY_REGISTRY };

export function getFeatureAccess(feature: string): LifeOSCapabilityDefinition | null {
  return getCapabilityDefinition(feature);
}

export function canAccess(feature: string, authState: AuthState): boolean {
  return canAccessCapability(feature, authState);
}

export function requiresAuthentication(feature: string): boolean {
  return capabilityRequiresAuthentication(feature);
}

export function checkAccess(feature: string, authState: AuthState): LifeOSAccessResult {
  return checkFeatureAccess(feature, authState);
}
