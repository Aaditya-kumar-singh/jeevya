import React from 'react';
import { Pressable, type PressableProps } from 'react-native';
import { haptic } from '@/lib/accessibility';

type Props = PressableProps & { label: string; role?: 'button' | 'link' | 'checkbox' | 'radio' | 'switch' | 'tab'; selected?: boolean };

export function AccessiblePressable({ label, role = 'button', selected, onPress, ...props }: Props) {
  return <Pressable {...props} accessible accessibilityRole={role} accessibilityLabel={label} accessibilityState={selected === undefined ? undefined : { selected }} onPress={(event) => { void haptic('light'); onPress?.(event); }} />;
}
