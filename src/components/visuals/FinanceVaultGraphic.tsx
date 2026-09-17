/**
 * FinanceVaultGraphic — Intricate SVG illustration for Finance tab hero.
 * Features a glowing emerald vault shield, upward growth trend chart, and gold nodes.
 */
import React from 'react';
import { useColorScheme } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

interface Props {
  width?: number;
  height?: number;
}

export function FinanceVaultGraphic({ width = 360, height = 140 }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const bgGradStart = isDark ? '#064E3B' : '#D1FAE5';
  const bgGradEnd = isDark ? '#022C22' : '#ECFDF5';

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Defs>
        <LinearGradient id="financeHeroGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={bgGradStart} stopOpacity={isDark ? 0.5 : 0.65} />
          <Stop offset="1" stopColor={bgGradEnd} stopOpacity={isDark ? 0.2 : 0.25} />
        </LinearGradient>

        <LinearGradient id="trendLineGrad" x1="0" y1="1" x2="1" y2="0">
          <Stop offset="0" stopColor="#10B981" stopOpacity="0.3" />
          <Stop offset="0.7" stopColor="#34D399" stopOpacity="1" />
          <Stop offset="1" stopColor="#F59E0B" stopOpacity="1" />
        </LinearGradient>
      </Defs>

      {/* Container background */}
      <Rect
        x="0"
        y="0"
        width={width}
        height={height}
        rx="24"
        fill="url(#financeHeroGrad)"
      />

      {/* Upward Wealth Growth Line Chart */}
      <Path
        d={`M20,${height * 0.75} 
           Q${width * 0.25},${height * 0.7} ${width * 0.4},${height * 0.45} 
           T${width * 0.7},${height * 0.35} 
           T${width * 0.92},${height * 0.2}`}
        stroke="url(#trendLineGrad)"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />

      {/* Peak gold node */}
      <Circle cx={width * 0.92} cy={height * 0.2} r="6" fill="#F59E0B" />
      <Circle cx={width * 0.92} cy={height * 0.2} r="11" fill="#F59E0B" opacity="0.3" />

      {/* Intermediate emerald nodes */}
      <Circle cx={width * 0.4} cy={height * 0.45} r="4" fill="#10B981" />
      <Circle cx={width * 0.7} cy={height * 0.35} r="4" fill="#34D399" />
    </Svg>
  );
}

export default FinanceVaultGraphic;
