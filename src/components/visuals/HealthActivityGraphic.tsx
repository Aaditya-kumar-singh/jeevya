/**
 * HealthActivityGraphic — Intricate SVG illustration for Health tab hero.
 * Features heart pulse EKG wave, activity circles, and vitality glow.
 */
import React from 'react';
import { useColorScheme } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

interface Props {
  width?: number;
  height?: number;
}

export function HealthActivityGraphic({ width = 360, height = 140 }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const stroke1 = isDark ? '#F43F5E' : '#FB7185';
  const stroke2 = isDark ? '#E11D48' : '#F43F5E';
  const bgGradStart = isDark ? '#881337' : '#FFE4E6';
  const bgGradEnd = isDark ? '#4C0519' : '#FFF1F2';

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Defs>
        <LinearGradient id="healthHeroGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={bgGradStart} stopOpacity={isDark ? 0.45 : 0.6} />
          <Stop offset="1" stopColor={bgGradEnd} stopOpacity={isDark ? 0.15 : 0.2} />
        </LinearGradient>
        <LinearGradient id="pulseGrad" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#F43F5E" stopOpacity="0.2" />
          <Stop offset="0.5" stopColor="#FB7185" stopOpacity="1" />
          <Stop offset="1" stopColor="#F43F5E" stopOpacity="0.3" />
        </LinearGradient>
      </Defs>

      {/* Rounded container background */}
      <Rect
        x="0"
        y="0"
        width={width}
        height={height}
        rx="24"
        fill="url(#healthHeroGrad)"
      />

      {/* Ambient glowing activity rings */}
      <Circle cx={width * 0.82} cy={height * 0.5} r={height * 0.35} stroke={stroke1} strokeWidth="6" strokeOpacity="0.25" fill="none" />
      <Circle cx={width * 0.82} cy={height * 0.5} r={height * 0.24} stroke="#38BDF8" strokeWidth="5" strokeOpacity="0.3" fill="none" />
      <Circle cx={width * 0.82} cy={height * 0.5} r={height * 0.13} stroke="#10B981" strokeWidth="4" strokeOpacity="0.4" fill="none" />

      {/* Heart EKG Pulse Wave Line */}
      <Path
        d={`M15,${height * 0.55} 
           L${width * 0.18},${height * 0.55} 
           L${width * 0.23},${height * 0.25} 
           L${width * 0.28},${height * 0.75} 
           L${width * 0.33},${height * 0.15} 
           L${width * 0.38},${height * 0.85} 
           L${width * 0.43},${height * 0.55} 
           L${width * 0.65},${height * 0.55}`}
        stroke="url(#pulseGrad)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Pulse Peak Glowing Dot */}
      <Circle cx={width * 0.33} cy={height * 0.15} r="5" fill="#F43F5E" />
      <Circle cx={width * 0.33} cy={height * 0.15} r="10" fill="#F43F5E" opacity="0.3" />
    </Svg>
  );
}

export default HealthActivityGraphic;
