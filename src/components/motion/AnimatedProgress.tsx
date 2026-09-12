/**
 * AnimatedProgress — Progress bar that animates fill width smoothly.
 * Compatible with Reanimated 4 (react-native-reanimated@4.x).
 */
import React, { useEffect } from 'react';
import { View, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';

export interface AnimatedProgressProps {
  /** Progress percentage from 0 to 100 */
  value: number;
  /** Height in pixels. Default: 8 */
  height?: number;
  /** Tailwind color class for filled bar, e.g. "bg-primary" */
  trackColor?: string;
  /** Alias for trackColor */
  color?: string;
  /** Optional delay before animation starts in ms */
  delay?: number;
  className?: string;
  style?: ViewStyle;
}

export function AnimatedProgress({
  value,
  height = 8,
  trackColor,
  color = 'bg-primary',
  delay = 0,
  className,
  style,
}: AnimatedProgressProps) {
  const clampValue = Math.min(100, Math.max(0, value));
  const progress = useSharedValue(0);
  const activeColor = trackColor || color;

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(clampValue, {
        duration: 500,
        easing: Easing.out(Easing.quad),
      }),
    );
  }, [clampValue, delay]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  return (
    <View
      className={`w-full overflow-hidden rounded-full bg-muted ${className || ''}`}
      style={[{ height }, style]}
    >
      <Animated.View
        className={`h-full rounded-full ${activeColor}`}
        style={fillStyle}
      />
    </View>
  );
}

export default AnimatedProgress;
