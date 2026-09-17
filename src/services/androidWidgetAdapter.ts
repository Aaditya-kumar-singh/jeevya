import { requestWidgetUpdateById } from 'react-native-android-widget';

import { getAndroidWidgetInstances } from '@/services/androidWidgetInstances';
import { ANDROID_LIFEOS_WIDGET_NAME } from '@/widgets/lifeosWidgetTaskHandler';
import { renderLifeOSAndroidWidget } from '@/widgets/LifeOSAndroidWidget';
import type { WidgetConfiguration, WidgetSnapshot } from '@/types/widgets';

export async function publishAndroidWidgetSnapshot(snapshot: WidgetSnapshot, configuration: WidgetConfiguration): Promise<void> {
  const instances = await getAndroidWidgetInstances();
  const widgetIds = Object.entries(instances)
    .filter(([, configurationId]) => configurationId === configuration.id)
    .map(([widgetId]) => Number(widgetId))
    .filter((widgetId) => Number.isInteger(widgetId));

  await Promise.all(widgetIds.map((widgetId) => requestWidgetUpdateById({
    widgetName: ANDROID_LIFEOS_WIDGET_NAME,
    widgetId,
    renderWidget: (widgetInfo) => renderLifeOSAndroidWidget(snapshot, widgetInfo.width, widgetInfo.height),
  })));
}

export async function refreshAndroidLifeOSWidgets(): Promise<void> {
  const instances = await getAndroidWidgetInstances();
  const configurationIds = [...new Set(Object.values(instances))];
  const { getWidgetConfigurations, buildWidgetSnapshot } = await import('@/services/widgets');
  const configurations = await getWidgetConfigurations();

  await Promise.all(configurationIds.map(async (configurationId) => {
    const configuration = configurations.find((item) => item.id === configurationId);
    if (!configuration) return;
    const snapshot = await buildWidgetSnapshot(configuration, undefined, { authState: 'guest' });
    await publishAndroidWidgetSnapshot(snapshot, configuration);
  }));
}
