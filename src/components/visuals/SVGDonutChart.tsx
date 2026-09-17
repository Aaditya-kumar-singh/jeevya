/**
 * SVGDonutChart — Circular SVG progress ring chart.
 * Used for visual percentage breakdowns across Health, Finance, Books, and Tasks.
 */
import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Text } from '@/components/ui';

interface SVGDonutChartProps {
  percentage: number; // 0 to 100
  size?: number;
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
  label?: string;
}

export function SVGDonutChart({
  percentage,
  size = 110,
  strokeWidth = 10,
  color = '#6366F1',
  bgColor = 'rgba(99, 102, 241, 0.15)',
  label = 'Goal',
}: SVGDonutChartProps) {
  const clampPct = Math.min(100, Math.max(0, percentage));
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * clampPct) / 100;

  return (
    <View className="items-center justify-center relative" style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background track circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={bgColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Animated fill progress arc */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      {/* Center text label */}
      <View className="absolute items-center justify-center">
        <Text size="md" className="font-black text-foreground">
          {clampPct}%
        </Text>
        <Text size="2xs" className="font-bold text-muted-foreground uppercase">
          {label}
        </Text>
      </View>
    </View>
  );
}

export default SVGDonutChart;
