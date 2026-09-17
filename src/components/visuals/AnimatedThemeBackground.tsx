import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/use-theme';
import { ThemeDefinition } from '@/constants/theme';

interface AnimatedThemeBackgroundProps {
  width?: number;
  height?: number;
  themeOverride?: ThemeDefinition;
}

export function AnimatedThemeBackground({
  width = 420,
  height = 360,
  themeOverride,
}: AnimatedThemeBackgroundProps) {
  const { theme: activeTheme } = useTheme();
  const currentTheme = themeOverride ?? activeTheme;
  const { isAnimated, animationType, colors } = currentTheme;

  const orbScale = useSharedValue(1);
  const orbOpacity = useSharedValue(0.7);
  const orbTranslateX = useSharedValue(0);
  const orbTranslateY = useSharedValue(0);

  useEffect(() => {
    if (!isAnimated) {
      orbScale.value = 1;
      orbOpacity.value = 0.5;
      orbTranslateX.value = 0;
      orbTranslateY.value = 0;
      return;
    }

    if (animationType === 'pulse') {
      orbScale.value = withRepeat(
        withSequence(
          withTiming(1.22, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.95, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
      orbOpacity.value = withRepeat(
        withSequence(
          withTiming(0.9, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.55, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else if (animationType === 'aurora') {
      orbTranslateX.value = withRepeat(
        withSequence(
          withTiming(35, { duration: 4000, easing: Easing.inOut(Easing.quad) }),
          withTiming(-35, { duration: 4000, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        true,
      );
      orbScale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 3200, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 3200, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else if (animationType === 'nebula') {
      orbTranslateX.value = withRepeat(
        withSequence(
          withTiming(20, { duration: 5000, easing: Easing.inOut(Easing.sin) }),
          withTiming(-20, { duration: 5000, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      );
      orbTranslateY.value = withRepeat(
        withSequence(
          withTiming(25, { duration: 4500, easing: Easing.inOut(Easing.sin) }),
          withTiming(-15, { duration: 4500, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      );
      orbScale.value = withRepeat(
        withSequence(
          withTiming(1.12, { duration: 3800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.96, { duration: 3800, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    }
  }, [isAnimated, animationType, orbScale, orbOpacity, orbTranslateX, orbTranslateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: orbTranslateX.value },
      { translateY: orbTranslateY.value },
      { scale: orbScale.value },
    ],
    opacity: orbOpacity.value,
  }));

  const primaryGrad = colors.gradient[0];
  const secondaryGrad = colors.gradient[1];
  const accentGrad = colors.gradient[2];

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        {
          overflow: 'hidden',
          backgroundColor: colors.background,
        },
      ]}
      pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
        <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <Defs>
            <RadialGradient
              id={`theme-orb-1-${currentTheme.id}`}
              cx="30%"
              cy="25%"
              r="60%"
              fx="30%"
              fy="25%">
              <Stop offset="0%" stopColor={primaryGrad} stopOpacity={isAnimated ? '0.75' : '0.4'} />
              <Stop offset="50%" stopColor={secondaryGrad} stopOpacity={isAnimated ? '0.35' : '0.15'} />
              <Stop offset="100%" stopColor={colors.background} stopOpacity="0" />
            </RadialGradient>

            <RadialGradient
              id={`theme-orb-2-${currentTheme.id}`}
              cx="75%"
              cy="65%"
              r="55%"
              fx="75%"
              fy="65%">
              <Stop offset="0%" stopColor={accentGrad} stopOpacity={isAnimated ? '0.6' : '0.3'} />
              <Stop offset="60%" stopColor={secondaryGrad} stopOpacity={isAnimated ? '0.2' : '0.08'} />
              <Stop offset="100%" stopColor={colors.background} stopOpacity="0" />
            </RadialGradient>
          </Defs>

          <Rect
            width={width}
            height={height}
            fill={`url(#theme-orb-1-${currentTheme.id})`}
          />
          <Rect
            width={width}
            height={height}
            fill={`url(#theme-orb-2-${currentTheme.id})`}
          />
        </Svg>
      </Animated.View>
    </View>
  );
}
