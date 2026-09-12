/**
 * GradientOrb — Soft radial gradient SVG circle for card background accents.
 * Used in DailyPulse hero card to replace the flat bg-black treatment.
 */
import React from 'react';
import { useColorScheme } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

interface GradientOrbProps {
  width?: number;
  height?: number;
}

export function GradientOrb({ width = 400, height = 200 }: GradientOrbProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Light: rich indigo → violet gradient
  // Dark: deep indigo → near-black
  const centerColor = isDark ? '#4f46e5' : '#4338ca';
  const midColor = isDark ? '#312e81' : '#4f46e5';
  const edgeColor = isDark ? '#0a0a18' : '#1e1b4b';

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Defs>
        {/* Main orb — top-left */}
        <RadialGradient
          id="orb1"
          cx="35%"
          cy="35%"
          r="55%"
          fx="35%"
          fy="35%"
          gradientUnits="objectBoundingBox">
          <Stop offset="0" stopColor={centerColor} stopOpacity="1" />
          <Stop offset="0.6" stopColor={midColor} stopOpacity="0.8" />
          <Stop offset="1" stopColor={edgeColor} stopOpacity="1" />
        </RadialGradient>
        {/* Secondary accent orb — bottom-right */}
        <RadialGradient
          id="orb2"
          cx="75%"
          cy="70%"
          r="40%"
          fx="75%"
          fy="70%"
          gradientUnits="objectBoundingBox">
          <Stop offset="0" stopColor="#7c3aed" stopOpacity="0.6" />
          <Stop offset="1" stopColor={edgeColor} stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {/* Base fill */}
      <Rect width={width} height={height} fill={edgeColor} />
      {/* Main orb */}
      <Rect width={width} height={height} fill="url(#orb1)" />
      {/* Accent orb */}
      <Rect width={width} height={height} fill="url(#orb2)" />
    </Svg>
  );
}

export default GradientOrb;
