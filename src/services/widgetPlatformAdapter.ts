import type { WidgetConfiguration, WidgetSnapshot } from '@/types/widgets';
import { publishAndroidWidgetSnapshot } from '@/services/androidWidgetAdapter';

/** Shared contract consumed by Android and future iOS native widget adapters. */
export interface LifeOSWidgetPlatformAdapter {
  readonly platform: 'android' | 'ios' | 'none';
  publish(snapshot: WidgetSnapshot, configuration: WidgetConfiguration): Promise<void>;
  remove(configurationId: string): Promise<void>;
}

/** Web/unsupported-platform adapter intentionally performs no native work. */
export const androidWidgetPlatformAdapter: LifeOSWidgetPlatformAdapter = {
  platform: 'android',
  async publish(snapshot, configuration): Promise<void> {
    await publishAndroidWidgetSnapshot(snapshot, configuration);
  },
  async remove(configurationId): Promise<void> {
    const { removeAndroidWidgetConfigurationAssociations } = await import('@/services/androidWidgetInstances');
    await removeAndroidWidgetConfigurationAssociations(configurationId);
  },
};

export const unavailableWidgetPlatformAdapter: LifeOSWidgetPlatformAdapter = {
  platform: 'none',
  async publish(): Promise<void> { /* Native platform phase owns publishing. */ },
  async remove(): Promise<void> { /* Native platform phase owns removal. */ },
};
