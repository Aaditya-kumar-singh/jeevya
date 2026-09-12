/**
 * ScalePressable — Press feedback with spring scale animation.
 * Replaces plain Pressable for all interactive card-level elements.
 */
import React from 'react';
import { GestureResponderEvent, Pressable, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

interface ScalePressableProps {
  children: React.ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  /** Scale factor on press. Default: 0.97 */
  scale?: number;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'link' | 'checkbox' | 'radio' | 'none';
  style?: ViewStyle;
  className?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ScalePressable({
  children,
  onPress,
  onLongPress,
  scale: scaleTarget = 0.97,
  disabled = false,
  accessibilityLabel,
  accessibilityRole = 'button',
  style,
  className,
}: ScalePressableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(scaleTarget, {
      damping: 15,
      stiffness: 300,
      mass: 0.6,
    });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, {
      damping: 12,
      stiffness: 250,
      mass: 0.6,
    });
  };

  return (
    <AnimatedPressable
      style={[animatedStyle, style]}
      className={className}
      onPress={disabled ? undefined : onPress}
      onLongPress={disabled ? undefined : onLongPress}
      onPressIn={disabled ? undefined : handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
    >
      {children}
    </AnimatedPressable>
  );
}

export default ScalePressable;
