import React from 'react';
import { View, ViewStyle } from 'react-native';
import { Card } from '@/components/ui';

interface GradientBorderCardProps {
  children: React.ReactNode;
  accentColor?: string; // e.g. "border-l-indigo-500", "border-l-rose-500", "border-l-emerald-500"
  className?: string;
  style?: ViewStyle;
}

export function GradientBorderCard({
  children,
  accentColor = 'border-l-indigo-500',
  className = '',
  style,
}: GradientBorderCardProps) {
  return (
    <Card
      className={`w-full p-5 border border-border/60 border-l-4 ${accentColor} bg-card shadow-sm dark:shadow-indigo-950/20 rounded-3xl overflow-hidden relative ${className}`}
      style={style}
    >
      {children}
    </Card>
  );
}

export default GradientBorderCard;
