/**
 * MoreSystemGraphic — Intricate SVG illustration for More tab hero.
 * Features orbital growth rings, gear nodes, and golden OS core glow.
 */
import React from 'react';
import { useColorScheme } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

interface Props {
  width?: number;
  height?: number;
}

export function MoreSystemGraphic({ width = 360, height = 140 }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const bgGradStart = isDark ? '#78350F' : '#FEF3C7';
  const bgGradEnd = isDark ? '#451A03' : '#FFFBEB';

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Defs>
        <LinearGradient id="moreHeroGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={bgGradStart} stopOpacity={isDark ? 0.45 : 0.6} />
          <Stop offset="1" stopColor={bgGradEnd} stopOpacity={isDark ? 0.15 : 0.2} />
        </LinearGradient>
      </Defs>

      {/* Container background */}
      <Rect
        x="0"
        y="0"
        width={width}
        height={height}
        rx="24"
        fill="url(#moreHeroGrad)"
      />

      {/* Orbital growth rings */}
      <Circle cx={width * 0.5} cy={height * 0.5} r={height * 0.4} stroke="#F59E0B" strokeWidth="2" strokeDasharray="6 6" strokeOpacity="0.3" fill="none" />
      <Circle cx={width * 0.5} cy={height * 0.5} r={height * 0.26} stroke="#FBBF24" strokeWidth="3" strokeOpacity="0.5" fill="none" />
      <Circle cx={width * 0.5} cy={height * 0.5} r={height * 0.12} fill="#F59E0B" />

      {/* Orbiting nodes */}
      <Circle cx={width * 0.5 + height * 0.4} cy={height * 0.5} r="5" fill="#F97316" />
      <Circle cx={width * 0.5 - height * 0.26} cy={height * 0.5} r="4" fill="#8B5CF6" />
      <Circle cx={width * 0.5} cy={height * 0.5 - height * 0.26} r="4" fill="#10B981" />
    </Svg>
  );
}

export default MoreSystemGraphic;
