/**
 * EmptyStateIllustration — Abstract blob + icon for empty state screens.
 * Reusable across Tasks, Journal, Books, and other empty states.
 * Uses the LifeOS secondary color (indigo-50/indigo-950).
 */
import React from 'react';
import { View , useColorScheme } from 'react-native';

import Svg, { Ellipse, Path } from 'react-native-svg';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';

interface EmptyStateIllustrationProps {
  title: string;
  message: string;
  icon?: string; // emoji icon
  action?: React.ReactNode;
}

function BlobShape({ color }: { color: string }) {
  return (
    <Svg width={120} height={100} viewBox="0 0 120 100">
      {/* Abstract organic blob using ellipses */}
      <Ellipse cx="60" cy="50" rx="52" ry="38" fill={color} opacity={0.35} />
      <Ellipse cx="48" cy="44" rx="36" ry="30" fill={color} opacity={0.25} />
      <Ellipse cx="72" cy="56" rx="30" ry="24" fill={color} opacity={0.2} />
      {/* Small accent dot */}
      <Ellipse cx="88" cy="30" rx="8" ry="8" fill={color} opacity={0.4} />
      <Ellipse cx="25" cy="68" rx="6" ry="6" fill={color} opacity={0.3} />
    </Svg>
  );
}

export function EmptyStateIllustration({
  title,
  message,
  icon = '✨',
  action,
}: EmptyStateIllustrationProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const blobColor = isDark ? '#4f46e5' : '#6366f1';

  return (
    <View className="items-center py-10 px-6">
      {/* Blob + icon layered */}
      <View className="items-center justify-center" style={{ width: 120, height: 100 }}>
        <View style={{ position: 'absolute' }}>
          <BlobShape color={blobColor} />
        </View>
        <Text style={{ fontSize: 36, lineHeight: 44 }}>{icon}</Text>
      </View>

      <Heading size="md" className="mt-4 text-center">
        {title}
      </Heading>
      <Text size="sm" className="mt-2 text-center text-muted-foreground max-w-[240px]">
        {message}
      </Text>

      {action ? (
        <View className="mt-5">
          {action}
        </View>
      ) : null}
    </View>
  );
}

export default EmptyStateIllustration;
