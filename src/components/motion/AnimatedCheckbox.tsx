/**
 * AnimatedCheckbox — Animated task/habit completion checkbox with vibrant color pop.
 * Compatible with Reanimated 4 (react-native-reanimated@4.x).
 */
import React, { useEffect } from 'react';
import { Pressable, Text, useColorScheme } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  Easing,
  interpolateColor,
} from 'react-native-reanimated';

interface AnimatedCheckboxProps {
  checked: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
  size?: number;
  /** Custom checked color, e.g. emerald "#10B981" or violet "#8B5CF6" */
  checkedColor?: string;
}

export function AnimatedCheckbox({
  checked,
  onPress,
  accessibilityLabel = 'Toggle completion',
  size = 24,
  checkedColor = '#10B981', // Vibrant Emerald by default
}: AnimatedCheckboxProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const uncheckedBorder = isDark ? '#334155' : '#CBD5E1';
  const uncheckedBg = isDark ? '#1E293B' : '#FFFFFF';

  const progress = useSharedValue(checked ? 1 : 0);
  const scale = useSharedValue(1);

  useEffect(() => {
    progress.value = withTiming(checked ? 1 : 0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
    if (checked) {
      scale.value = withSpring(1.22, { damping: 7, stiffness: 450 }, () => {
        scale.value = withSpring(1, { damping: 10, stiffness: 300 });
      });
    }
  }, [checked]);

  const circleStyle = useAnimatedStyle(() => ({
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    transform: [{ scale: scale.value }],
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [uncheckedBg, checkedColor]
    ),
    borderColor: interpolateColor(
      progress.value,
      [0, 1],
      [uncheckedBorder, checkedColor]
    ),
    shadowColor: checkedColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: progress.value * 0.4,
    shadowRadius: 4,
    elevation: progress.value * 3,
  }));

  const checkmarkStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: progress.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
    >
      <Animated.View style={circleStyle}>
        <Animated.View style={checkmarkStyle}>
          <Text
            style={{
              color: '#ffffff',
              fontSize: size * 0.55,
              fontWeight: '800',
              lineHeight: size * 0.7,
            }}
          >
            ✓
          </Text>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

export default AnimatedCheckbox;
