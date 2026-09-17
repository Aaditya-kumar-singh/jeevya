import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { buildWidgetSnapshot, getWidgetConfigurations } from '@/services/widgets';
import { getAndroidWidgetConfigurationId, removeAndroidWidgetInstance, setAndroidWidgetConfiguration } from '@/services/androidWidgetInstances';
import { renderLifeOSAndroidWidget } from '@/widgets/LifeOSAndroidWidget';

export const ANDROID_LIFEOS_WIDGET_NAME = 'LifeOSWidget';

async function resolveConfiguration(widgetId: number) {
  const configurations = await getWidgetConfigurations();
  const mappedId = await getAndroidWidgetConfigurationId(widgetId);
  return configurations.find((configuration) => configuration.id === mappedId) ?? configurations[0] ?? null;
}

async function renderCurrentWidget(props: WidgetTaskHandlerProps): Promise<void> {
  const configuration = await resolveConfiguration(props.widgetInfo.widgetId);
  if (!configuration) {
    props.renderWidget(
      renderLifeOSAndroidWidget(
        {
          configurationId: 'unavailable',
          date: new Date().toISOString().slice(0, 10),
          generatedAt: new Date().toISOString(),
          density: 'compact',
          modules: [],
          degradedDomains: ['widgets'],
        },
        props.widgetInfo.width,
        props.widgetInfo.height,
      ),
    );
    return;
  }

  await setAndroidWidgetConfiguration(props.widgetInfo.widgetId, configuration.id);
  const snapshot = await buildWidgetSnapshot(configuration, undefined, { authState: 'guest' });
  props.renderWidget(renderLifeOSAndroidWidget(snapshot, props.widgetInfo.width, props.widgetInfo.height));
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      try {
        await renderCurrentWidget(props);
      } catch {
        props.renderWidget(
          renderLifeOSAndroidWidget(
            {
              configurationId: 'unavailable',
              date: new Date().toISOString().slice(0, 10),
              generatedAt: new Date().toISOString(),
              density: 'compact',
              modules: [],
              degradedDomains: ['widgets'],
            },
            props.widgetInfo.width,
            props.widgetInfo.height,
          ),
        );
      }
      break;

    case 'WIDGET_DELETED':
      await removeAndroidWidgetInstance(props.widgetInfo.widgetId);
      break;

    case 'WIDGET_CLICK':
      // OPEN_APP and OPEN_URI actions are handled natively by the widget provider.
      // Custom actions can be handled here later without duplicating native routing.
      break;

    default:
      break;
  }
}
