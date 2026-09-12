/**
 * HeroWave — Multi-stop gradient SVG wave for hero sections.
 * Features vibrant Violet → Indigo → Cyan gradients for high visual impact.
 */
import React from 'react';
import { useColorScheme } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

interface HeroWaveProps {
  width?: number;
  height?: number;
}

export function HeroWave({ width = 400, height = 180 }: HeroWaveProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const stop1 = isDark ? '#4338CA' : '#818CF8';
  const stop2 = isDark ? '#6D28D9' : '#C084FC';
  const stop3 = isDark ? '#0284C7' : '#38BDF8';

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Defs>
        <LinearGradient id="heroWaveGrad1" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={stop1} stopOpacity={isDark ? 0.35 : 0.25} />
          <Stop offset="0.5" stopColor={stop2} stopOpacity={isDark ? 0.3 : 0.2} />
          <Stop offset="1" stopColor={stop3} stopOpacity={isDark ? 0.2 : 0.12} />
        </LinearGradient>
        <LinearGradient id="heroWaveGrad2" x1="1" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={stop3} stopOpacity={isDark ? 0.3 : 0.2} />
          <Stop offset="1" stopColor={stop1} stopOpacity={isDark ? 0.4 : 0.28} />
        </LinearGradient>
      </Defs>

      {/* Back wave — glowing multi-color gradient */}
      <Path
        d={`M0,${height * 0.3} 
           C${width * 0.2},${height * 0.1} 
            ${width * 0.4},${height * 0.5} 
            ${width * 0.6},${height * 0.35} 
           C${width * 0.8},${height * 0.2} 
            ${width * 0.95},${height * 0.48} 
            ${width},${height * 0.32} 
           L${width},${height} L0,${height} Z`}
        fill="url(#heroWaveGrad1)"
      />

      {/* Front wave — overlapping accent wave */}
      <Path
        d={`M0,${height * 0.55} 
           C${width * 0.25},${height * 0.4} 
            ${width * 0.45},${height * 0.75} 
            ${width * 0.65},${height * 0.52} 
           C${width * 0.82},${height * 0.35} 
            ${width * 0.92},${height * 0.65} 
            ${width},${height * 0.5} 
           L${width},${height} L0,${height} Z`}
        fill="url(#heroWaveGrad2)"
      />
    </Svg>
  );
}

export default HeroWave;
