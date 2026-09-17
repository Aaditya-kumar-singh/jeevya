/**
 * TasksMatrixGraphic — Intricate SVG illustration for Tasks tab hero.
 * Features a cyber habit matrix grid, target bullseye, and glowing progress nodes.
 */
import React from 'react';
import { useColorScheme } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

interface Props {
  width?: number;
  height?: number;
}

export function TasksMatrixGraphic({ width = 360, height = 140 }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const bgGradStart = isDark ? '#4C1D95' : '#EDE9FE';
  const bgGradEnd = isDark ? '#2E1065' : '#F5F3FF';
  const nodeColor = isDark ? '#A78BFA' : '#8B5CF6';

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Defs>
        <LinearGradient id="tasksHeroGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={bgGradStart} stopOpacity={isDark ? 0.45 : 0.6} />
          <Stop offset="1" stopColor={bgGradEnd} stopOpacity={isDark ? 0.15 : 0.2} />
        </LinearGradient>

        <LinearGradient id="nodeLineGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#8B5CF6" stopOpacity="0.8" />
          <Stop offset="1" stopColor="#C4B5FD" stopOpacity="0.2" />
        </LinearGradient>
      </Defs>

      {/* Rounded container background */}
      <Rect
        x="0"
        y="0"
        width={width}
        height={height}
        rx="24"
        fill="url(#tasksHeroGrad)"
      />

      {/* Target bullseye rings right */}
      <Circle cx={width * 0.82} cy={height * 0.5} r={height * 0.38} stroke={nodeColor} strokeWidth="2" strokeDasharray="4 4" strokeOpacity="0.4" fill="none" />
      <Circle cx={width * 0.82} cy={height * 0.5} r={height * 0.25} stroke={nodeColor} strokeWidth="3" strokeOpacity="0.6" fill="none" />
      <Circle cx={width * 0.82} cy={height * 0.5} r={height * 0.1} fill="#8B5CF6" />

      {/* Cyber Grid Network Lines */}
      <Path
        d={`M25,${height * 0.3} L${width * 0.35},${height * 0.3} L${width * 0.55},${height * 0.7} L${width * 0.7},${height * 0.7}`}
        stroke="url(#nodeLineGrad)"
        strokeWidth="3"
        fill="none"
      />
      <Path
        d={`M25,${height * 0.7} L${width * 0.35},${height * 0.7} L${width * 0.55},${height * 0.3} L${width * 0.7},${height * 0.3}`}
        stroke="url(#nodeLineGrad)"
        strokeWidth="3"
        fill="none"
      />

      {/* Glowing Check Nodes */}
      <Circle cx={width * 0.35} cy={height * 0.3} r="6" fill="#8B5CF6" />
      <Circle cx={width * 0.35} cy={height * 0.7} r="6" fill="#10B981" />
      <Circle cx={width * 0.55} cy={height * 0.3} r="6" fill="#10B981" />
      <Circle cx={width * 0.55} cy={height * 0.7} r="6" fill="#8B5CF6" />
    </Svg>
  );
}

export default TasksMatrixGraphic;
