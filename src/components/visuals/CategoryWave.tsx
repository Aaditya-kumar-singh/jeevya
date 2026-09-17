/**
 * CategoryWave — Lightweight, multi-theme SVG wave hero background.
 * Supports presets for Health (Rose), Tasks (Violet), Finance (Emerald), and More (Amber).
 */
import React from 'react';
import { useColorScheme } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

export type CategoryTheme = 'health' | 'tasks' | 'finance' | 'more' | 'journal' | 'books';

interface CategoryWaveProps {
  theme: CategoryTheme;
  width?: number;
  height?: number;
}

const THEME_STOPS: Record<CategoryTheme, { light: [string, string, string]; dark: [string, string, string] }> = {
  health: {
    light: ['#F43F5E', '#FB7185', '#FDA4AF'],
    dark: ['#E11D48', '#BE123C', '#881337'],
  },
  tasks: {
    light: ['#8B5CF6', '#A78BFA', '#C4B5FD'],
    dark: ['#7C3AED', '#6D28D9', '#4C1D95'],
  },
  finance: {
    light: ['#10B981', '#34D399', '#6EE7B7'],
    dark: ['#059669', '#047857', '#064E3B'],
  },
  more: {
    light: ['#F59E0B', '#FBBF24', '#FDE68A'],
    dark: ['#D97706', '#B45309', '#78350F'],
  },
  journal: {
    light: ['#EC4899', '#F472B6', '#FBCFE8'],
    dark: ['#DB2777', '#BE185D', '#831843'],
  },
  books: {
    light: ['#3B82F6', '#60A5FA', '#93C5FD'],
    dark: ['#2563EB', '#1D4ED8', '#1E3A8A'],
  },
};

export function CategoryWave({ theme, width = 450, height = 180 }: CategoryWaveProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const stops = isDark ? THEME_STOPS[theme].dark : THEME_STOPS[theme].light;
  const gradientId = `catWaveGrad_${theme}`;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={stops[0]} stopOpacity={isDark ? 0.35 : 0.22} />
          <Stop offset="0.5" stopColor={stops[1]} stopOpacity={isDark ? 0.25 : 0.15} />
          <Stop offset="1" stopColor={stops[2]} stopOpacity={isDark ? 0.15 : 0.08} />
        </LinearGradient>
      </Defs>

      {/* Layer 1 - Deep curved wave */}
      <Path
        d={`M0,${height * 0.25} 
           C${width * 0.25},${height * 0.05} 
            ${width * 0.5},${height * 0.45} 
            ${width * 0.75},${height * 0.2} 
           C${width * 0.9},${height * 0.1} 
            ${width * 0.98},${height * 0.35} 
            ${width},${height * 0.25} 
           L${width},${height} L0,${height} Z`}
        fill={`url(#${gradientId})`}
      />

      {/* Layer 2 - Secondary overlapping wave */}
      <Path
        d={`M0,${height * 0.5} 
           C${width * 0.2},${height * 0.35} 
            ${width * 0.45},${height * 0.68} 
            ${width * 0.65},${height * 0.48} 
           C${width * 0.8},${height * 0.35} 
            ${width * 0.92},${height * 0.6} 
            ${width},${height * 0.45} 
           L${width},${height} L0,${height} Z`}
        fill={`url(#${gradientId})`}
        opacity={0.8}
      />
    </Svg>
  );
}

export default CategoryWave;
