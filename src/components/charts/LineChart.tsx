import React from 'react';
import { View, useWindowDimensions } from 'react-native';
import Svg, {
  Circle,
  Line,
  Text as SvgText,
  Path,
  Rect,
  G,
} from 'react-native-svg';
import { Text } from '@/components/ui/text';
import { useColorScheme } from 'nativewind';

export interface LineChartSeries {
  label: string;
  color: string;
  data: number[];
}

interface LineChartProps {
  labels: string[];
  series: LineChartSeries[];
  height?: number;
  showGrid?: boolean;
}

export function LineChart({
  labels,
  series,
  height = 200,
  showGrid = true,
}: LineChartProps) {
  const { width: screenWidth } = useWindowDimensions();
  const { colorScheme } = useColorScheme();
  const containerWidth = screenWidth - 40;
  const padding = { top: 20, right: 16, bottom: 30, left: 50 };

  if (labels.length === 0 || series.length === 0) {
    return (
      <View style={{ height }} className="items-center justify-center">
        <Text size="sm" className="text-muted-foreground">
          No data
        </Text>
      </View>
    );
  }

  const chartWidth = containerWidth - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Find max and min across all series
  let allValues: number[] = [];
  for (const s of series) {
    allValues = allValues.concat(s.data);
  }

  const maxVal = Math.max(...allValues, 0);
  const minVal = Math.min(...allValues, 0);
  const range = maxVal - minVal || 1;
  const yMin = minVal < 0 ? minVal - range * 0.1 : 0;
  const yMax = maxVal + range * 0.1;
  const yRange = yMax - yMin;

  // Scale functions
  const xScale = (index: number) =>
    padding.left + (index / Math.max(labels.length - 1, 1)) * chartWidth;
  const yScale = (value: number) =>
    padding.top + chartHeight - ((value - yMin) / yRange) * chartHeight;

  // Y-axis ticks
  const tickCount = 4;
  const yTicks: number[] = [];
  for (let i = 0; i <= tickCount; i++) {
    yTicks.push(yMin + (yRange * i) / tickCount);
  }

  const textColor =
    colorScheme === 'dark' ? 'rgb(255,255,255)' : 'rgb(0,0,0)';
  const mutedColor =
    colorScheme === 'dark' ? 'rgb(115,115,115)' : 'rgb(209,213,219)';
  const gridColor =
    colorScheme === 'dark' ? 'rgb(38,38,38)' : 'rgb(229,229,229)';

  return (
    <View>
      <Svg width={containerWidth} height={height}>
        {/* Grid lines */}
        {showGrid &&
          yTicks.map((tick, index) => (
            <Line
              key={`grid-${index}`}
              x1={padding.left}
              y1={yScale(tick)}
              x2={containerWidth - padding.right}
              y2={yScale(tick)}
              stroke={gridColor}
              strokeWidth={1}
            />
          ))}

        {/* Zero line if applicable */}
        {yMin < 0 && (
          <Line
            x1={padding.left}
            y1={yScale(0)}
            x2={containerWidth - padding.right}
            y2={yScale(0)}
            stroke={mutedColor}
            strokeWidth={1}
            strokeDasharray="4 4"
          />
        )}

        {/* Y-axis labels */}
        {yTicks.map((tick, index) => (
          <SvgText
            key={`ytick-${index}`}
            x={padding.left - 8}
            y={yScale(tick) + 4}
            textAnchor="end"
            fontSize={9}
            fill={mutedColor}
          >
            {Math.abs(tick) >= 1000
              ? `${(tick / 1000).toFixed(1)}k`
              : Math.round(tick).toString()}
          </SvgText>
        ))}

        {/* X-axis labels */}
        {labels.map((label, index) => {
          const x = xScale(index);
          // Show every other label if too many
          const showLabel =
            labels.length <= 6 ||
            index % Math.ceil(labels.length / 6) === 0 ||
            index === labels.length - 1;
          if (!showLabel) return null;
          return (
            <SvgText
              key={`xlabel-${index}`}
              x={x}
              y={height - 4}
              textAnchor="middle"
              fontSize={10}
              fill={mutedColor}
            >
              {label}
            </SvgText>
          );
        })}

        {/* Lines */}
        {series.map((s, si) => {
          if (s.data.length === 0) return null;

          // Build path
          const points = s.data.map((val, i) => ({
            x: xScale(i),
            y: yScale(val),
          }));

          if (points.length === 1) {
            return (
              <Circle
                key={`point-${si}`}
                cx={points[0].x}
                cy={points[0].y}
                r={4}
                fill={s.color}
              />
            );
          }

          // Smooth line path using quadratic bezier
          let pathD = `M ${points[0].x} ${points[0].y}`;
          for (let i = 1; i < points.length; i++) {
            const prev = points[i - 1];
            const curr = points[i];
            const midX = (prev.x + curr.x) / 2;
            pathD += ` Q ${prev.x + (curr.x - prev.x) * 0.5} ${prev.y} ${midX} ${(prev.y + curr.y) / 2}`;
            if (i === points.length - 1) {
              pathD += ` Q ${midX} ${curr.y} ${curr.x} ${curr.y}`;
            }
          }

          return (
            <G key={`series-${si}`}>
              {/* Line */}
              <Path
                d={pathD}
                stroke={s.color}
                strokeWidth={2.5}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Dots */}
              {points.map((pt, i) => (
                <Circle
                  key={`dot-${si}-${i}`}
                  cx={pt.x}
                  cy={pt.y}
                  r={3}
                  fill={s.color}
                />
              ))}
            </G>
          );
        })}
      </Svg>

      {/* Legend */}
      <View className="mt-2 flex-row justify-center gap-4">
        {series.map((s, index) => (
          <View key={index} className="flex-row items-center gap-1">
            <View
              style={{
                width: 10,
                height: 3,
                borderRadius: 1.5,
                backgroundColor: s.color,
              }}
            />
            <Text size="xs" className="text-muted-foreground">
              {s.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
