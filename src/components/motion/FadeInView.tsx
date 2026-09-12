/**
 * FadeInView — Entrance animation: opacity 0→1 + slight vertical rise.
 * Used for screen section entrance. Respects performance: runs once on mount.
 */
import React, { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface FadeInViewProps {
  children: React.ReactNode;
  /** Delay before animation starts, in ms. Default: 0. */
  delay?: number;
  /** Duration of animation, in ms. Default: 280. */
  duration?: number;
  /** Vertical offset to rise from, in px. Default: 10. */
  translateY?: number;
  className?: string;
}

export function FadeInView({
  children,
  delay = 0,
  duration = 280,
  translateY: offsetY = 10,
  className,
}: FadeInViewProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(offsetY);

  useEffect(() => {
    const easing = Easing.out(Easing.cubic);
    opacity.value = withDelay(delay, withTiming(1, { duration, easing }));
    translateY.value = withDelay(delay, withTiming(0, { duration, easing }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={animatedStyle} className={className}>
      {children}
    </Animated.View>
  );
}

export default FadeInView;
