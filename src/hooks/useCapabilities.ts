import { useAuth } from '@/hooks/useAuth';
import { canAccess, checkAccess, getFeatureAccess, requiresAuthentication } from '@/services/capabilities';

export function useCapabilities() {
  const { authState } = useAuth();
  return {
    authState,
    getFeatureAccess,
    canAccess: (feature: string) => canAccess(feature, authState),
    requiresAuthentication,
    checkAccess: (feature: string) => checkAccess(feature, authState),
  };
}
