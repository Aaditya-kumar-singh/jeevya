import { AccessibilityInfo, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

let reduceMotion = false;
let listener: { remove?: () => void } | null = null;

export async function initAccessibilityPreferences(): Promise<void> {
  try {
    reduceMotion = await AccessibilityInfo.isReduceMotionEnabled();
    listener?.remove?.();
    listener = AccessibilityInfo.addEventListener('reduceMotionChanged', value => {
      reduceMotion = value;
    });
  } catch {
    reduceMotion = false;
  }
}

export function isReduceMotionEnabled(): boolean {
  return reduceMotion;
}

export function motionDuration(duration: number, minimum = 0): number {
  return reduceMotion ? minimum : duration;
}

export function accessibilityButtonLabel(label: string): {
  accessible: boolean;
  accessibilityRole: 'button';
  accessibilityLabel: string;
} {
  return { accessible: true, accessibilityRole: 'button', accessibilityLabel: label };
}

export async function haptic(
  kind: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light',
): Promise<void> {
  if (reduceMotion || Platform.OS === 'web') return;
  try {
    if (kind === 'success') return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (kind === 'warning') return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    if (kind === 'error') return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    const style = kind === 'heavy'
      ? Haptics.ImpactFeedbackStyle.Heavy
      : kind === 'medium'
        ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Light;
    await Haptics.impactAsync(style);
  } catch {
    // Haptics are enhancement only. Never block the primary action.
  }
}

export function accessibilityStateForSelected(selected: boolean) {
  return { selected };
}
