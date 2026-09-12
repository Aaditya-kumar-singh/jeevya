import React from 'react';
import { View, useWindowDimensions } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { Text } from '@/components/ui/text';
import { useColorScheme } from 'nativewind';

export interface HorizontalBarChartDatum {
  label: string;
  value: number;
  color?: string;
}

interface HorizontalBarChartProps {
  data: HorizontalBarChartDatum[];
  maxValue?: number;
  height?: number;
  barHeight?: number;
  gap?: number;
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

export function HorizontalBarChart({
  data,
  maxValue,
  height = 200,
  barHeight = 24,
  gap = 8,
}: HorizontalBarChartProps) {
  const { width: screenWidth } = useWindowDimensions();
  const { colorScheme } = useColorScheme();
  const containerWidth = screenWidth - 40; // account for padding

  if (data.length === 0) {
    return (
      <View style={{ height }} className="items-center justify-center">
        <Text size="sm" className="text-muted-foreground">
          No data
        </Text>
      </View>
    );
  }

  const max = maxValue || Math.max(...data.map((d) => d.value), 1);
  const labelWidth = 80;
  const chartWidth = containerWidth - labelWidth - 50; // 50 for value text
  const svgHeight = data.length * (barHeight + gap);

  return (
    <View>
      <Svg width={containerWidth} height={svgHeight}>
        {data.map((item, index) => {
          const y = index * (barHeight + gap);
          const barWidth = max > 0 ? (item.value / max) * chartWidth : 0;
          const color =
            item.color || COLORS[index % COLORS.length];
          const textColor =
            colorScheme === 'dark' ? 'rgb(255,255,255)' : 'rgb(0,0,0)';

          return (
            <React.Fragment key={index}>
              {/* Label */}
              <SvgText
                x={0}
                y={y + barHeight / 2 + 4}
                fontSize={12}
                fill={textColor}
                textAnchor="start"
              >
                {item.label.length > 10
                  ? item.label.slice(0, 10) + '…'
                  : item.label}
              </SvgText>

              {/* Bar background */}
              <Rect
                x={labelWidth}
                y={y}
                width={chartWidth}
                height={barHeight}
                rx={4}
                fill={colorScheme === 'dark' ? 'rgb(38,38,38)' : 'rgb(229,229,229)'}
              />

              {/* Bar fill */}
              <Rect
                x={labelWidth}
                y={y}
                width={Math.max(barWidth, 2)}
                height={barHeight}
                rx={4}
                fill={color}
              />

              {/* Value */}
              <SvgText
                x={labelWidth + chartWidth + 8}
                y={y + barHeight / 2 + 4}
                fontSize={11}
                fill={textColor}
                textAnchor="start"
              >
                ₹{item.value.toLocaleString('en-IN')}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}
