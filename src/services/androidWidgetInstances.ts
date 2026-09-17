import { readStorage, updateStorage } from '@/services/storageReliability';

export const ANDROID_WIDGET_INSTANCE_STORAGE_KEY = 'lifeos:widgets:android-instances';

export type AndroidWidgetInstanceMap = Record<string, string>;

function normalize(value: unknown): AndroidWidgetInstanceMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const entries = Object.entries(value as Record<string, unknown>).filter(
    ([widgetId, configurationId]) => /^\d+$/.test(widgetId) && typeof configurationId === 'string' && configurationId.trim().length > 0,
  ) as [string, string][];
  return Object.fromEntries(entries) as AndroidWidgetInstanceMap;
}

export async function getAndroidWidgetInstances(): Promise<AndroidWidgetInstanceMap> {
  const result = await readStorage<unknown>(ANDROID_WIDGET_INSTANCE_STORAGE_KEY, {});
  return normalize(result.value);
}

export async function getAndroidWidgetConfigurationId(widgetId: number): Promise<string | null> {
  const instances = await getAndroidWidgetInstances();
  return instances[String(widgetId)] ?? null;
}

export async function setAndroidWidgetConfiguration(widgetId: number, configurationId: string): Promise<void> {
  await updateStorage<unknown>(ANDROID_WIDGET_INSTANCE_STORAGE_KEY, {}, (current) => ({
    ...normalize(current),
    [String(widgetId)]: configurationId,
  }));
}

export async function removeAndroidWidgetInstance(widgetId: number): Promise<void> {
  await updateStorage<unknown>(ANDROID_WIDGET_INSTANCE_STORAGE_KEY, {}, (current) => {
    const next = normalize(current);
    delete next[String(widgetId)];
    return next;
  });
}

export async function removeAndroidWidgetConfigurationAssociations(configurationId: string): Promise<void> {
  await updateStorage<unknown>(ANDROID_WIDGET_INSTANCE_STORAGE_KEY, {}, (current) => {
    const next = normalize(current);
    for (const [widgetId, mappedConfigurationId] of Object.entries(next)) {
      if (mappedConfigurationId === configurationId) delete next[widgetId];
    }
    return next;
  });
}
