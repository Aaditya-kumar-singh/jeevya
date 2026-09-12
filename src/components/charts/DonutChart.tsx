import React from 'react';
import { View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Text as SvgText, G } from 'react-native-svg';
import { Text } from '@/components/ui/text';
import { useColorScheme } from 'nativewind';

export interface DonutChartDatum {
  label: string;
  value: number;
  color?: string;
}

interface DonutChartProps {
  data: DonutChartDatum[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
}

const COLORS = [
  'rgb(59,130,246)', // blue
  'rgb(239,68,68)', // red
  'rgb(34,197,94)', // green
  'rgb(234,179,8)', // yellow
  'rgb(168,85,247)', // purple
  'rgb(236,72,153)', // pink
  'rgb(20,184,166)', // teal
  'rgb(249,115,22)', // orange
  'rgb(99,102,241)', // indigo
  'rgb(132,204,22)', // lime
];

export function DonutChart({
  data,
  size = 180,
  strokeWidth = 28,
  centerLabel,
}: DonutChartProps) {
  const { colorScheme } = useColorScheme();

  if (data.length === 0) {
    return (
      <View style={{ width: size, height: size }} className="items-center justify-center">
        <Text size="sm" className="text-muted-foreground">
          No data
        </Text>
      </View>
    );
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) {
    return (
      <View style={{ width: size, height: size }} className="items-center justify-center">
        <Text size="sm" className="text-muted-foreground">
          No data
        </Text>
      </View>
    );
  }

  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;

  // Build arcs
  let accumulatedOffset = 0;
  const arcs = data.map((item, index) => {
    const fraction = item.value / total;
    const dashLength = fraction * circumference;
    const gapLength = circumference - dashLength;
    const offset = -accumulatedOffset;
    accumulatedOffset += dashLength;

    return {
      color: item.color || COLORS[index % COLORS.length],
      dashArray: `${dashLength} ${gapLength}`,
      rotation: -90, // start at top
      offset,
      label: item.label,
      fraction,
    };
  });

  const textColor = colorScheme === 'dark' ? 'rgb(255,255,255)' : 'rgb(0,0,0)';

  return (
    <View className="items-center">
      <Svg width={size} height={size}>
        {arcs.map((arc, index) => (
          <Circle
            key={index}
            cx={cx}
            cy={cy}
            r={radius}
            stroke={arc.color}
            strokeWidth={strokeWidth}
            strokeDasharray={arc.dashArray}
            strokeLinecap="butt"
            transform={`rotate(${arc.rotation + arc.offset} ${cx} ${cy})`}
            fill="none"
          />
        ))}
        {/* Center text */}
        <SvgText
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          fontSize={14}
          fontWeight="bold"
          fill={textColor}
        >
          {centerLabel || `₹${total.toLocaleString('en-IN')}`}
        </SvgText>
        <SvgText
          x={cx}
          y={cy + 14}
          textAnchor="middle"
          fontSize={10}
          fill={colorScheme === 'dark' ? 'rgb(163,163,163)' : 'rgb(107,114,128)'}
        >
          {data.length} {data.length === 1 ? 'category' : 'categories'}
        </SvgText>
      </Svg>

      {/* Legend */}
      <View className="mt-3 flex-row flex-wrap justify-center gap-x-4 gap-y-1">
        {data.slice(0, 6).map((item, index) => (
          <View key={index} className="flex-row items-center gap-1">
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: item.color || COLORS[index % COLORS.length],
              }}
            />
            <Text size="xs" className="text-muted-foreground">
              {item.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
