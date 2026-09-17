/**
 * FloatingBlobsSVG — Ambient glowing background blobs for deep visual richness.
 * Adds subtle colorful glassmorphism glow behind page content.
 */
import React from 'react';
import { useColorScheme } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

interface FloatingBlobsSVGProps {
  color1?: string;
  color2?: string;
  width?: number;
  height?: number;
}

export function FloatingBlobsSVG({
  color1 = '#6366F1',
  color2 = '#EC4899',
  width = 400,
  height = 300,
}: FloatingBlobsSVGProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Defs>
        <RadialGradient id="blobGrad1" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={color1} stopOpacity={isDark ? 0.25 : 0.18} />
          <Stop offset="100%" stopColor={color1} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="blobGrad2" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={color2} stopOpacity={isDark ? 0.22 : 0.15} />
          <Stop offset="100%" stopColor={color2} stopOpacity={0} />
        </RadialGradient>
      </Defs>

      {/* Top right ambient orb */}
      <Circle cx={width * 0.85} cy={height * 0.2} r={height * 0.35} fill="url(#blobGrad1)" />

      {/* Bottom left ambient orb */}
      <Circle cx={width * 0.15} cy={height * 0.7} r={height * 0.4} fill="url(#blobGrad2)" />
    </Svg>
  );
}

export default FloatingBlobsSVG;
