import { AccessibilityInfo, PixelRatio } from 'react-native';

export type AccessibilityAudit = {
  reduceMotion: boolean;
  fontScale: number;
  largeFontScale: boolean;
  screenReaderEnabled: boolean;
};

export async function getAccessibilityAudit(): Promise<AccessibilityAudit> {
  const [reduceMotion, screenReaderEnabled] = await Promise.all([
    AccessibilityInfo.isReduceMotionEnabled().catch(() => false),
    AccessibilityInfo.isScreenReaderEnabled().catch(() => false),
  ]);
  const fontScale = PixelRatio.getFontScale();
  return {
    reduceMotion,
    fontScale,
    largeFontScale: fontScale >= 1.3,
    screenReaderEnabled,
  };
}

export function accessibleText(label: string) {
  return {
    accessible: true,
    accessibilityRole: 'text' as const,
    accessibilityLabel: label,
  };
}
