import { Text, View } from 'react-native';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export function OfflineBanner() {
  const { connected, checking } = useNetworkStatus();
  if (checking || connected) return null;
  return (
    <View className="bg-amber-500 px-4 py-2">
      <Text className="text-center text-xs font-semibold text-white">
        Offline mode: local changes continue to work. Sync will resume when the connection returns.
      </Text>
    </View>
  );
}
