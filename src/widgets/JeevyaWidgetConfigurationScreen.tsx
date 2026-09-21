import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { WidgetConfigurationScreenProps } from 'react-native-android-widget';

import { getAndroidWidgetConfigurationId, setAndroidWidgetConfiguration } from '@/services/androidWidgetInstances';
import { buildWidgetSnapshot, getWidgetConfigurations } from '@/services/widgets';
import { renderJeevyaAndroidWidget } from '@/widgets/JeevyaAndroidWidget';
import type { WidgetConfiguration } from '@/types/widgets';

const colors = {
  background: '#FAFAFF',
  card: '#FFFFFF',
  border: '#E2E3F0',
  text: '#0F0F19',
  secondary: '#6B7280',
  primary: '#6366F1',
};

export function JeevyaWidgetConfigurationScreen({ widgetInfo, renderWidget, setResult }: WidgetConfigurationScreenProps) {
  const [configurations, setConfigurations] = useState<WidgetConfiguration[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const preview = useCallback(async (configuration: WidgetConfiguration | null) => {
    if (!configuration) return;
    try {
      const snapshot = await buildWidgetSnapshot(configuration, undefined, { authState: 'guest' });
      renderWidget(renderJeevyaAndroidWidget(snapshot, widgetInfo.width, widgetInfo.height));
    } catch {
      // The configuration screen remains usable if preview data is unavailable.
    }
  }, [renderWidget, widgetInfo.height, widgetInfo.width]);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const available = await getWidgetConfigurations();
      const mapped = await getAndroidWidgetConfigurationId(widgetInfo.widgetId);
      if (!mounted) return;
      const initial = available.find((item) => item.id === mapped)?.id ?? available[0]?.id ?? '';
      setConfigurations(available);
      setSelectedId(initial);
      setLoading(false);
      if (initial) await preview(available.find((item) => item.id === initial) ?? null);
    })();
    return () => { mounted = false; };
  }, [preview, widgetInfo.widgetId]);

  async function choose(configuration: WidgetConfiguration) {
    setSelectedId(configuration.id);
    await preview(configuration);
  }

  async function confirm() {
    if (!selectedId) {
      setResult('cancel');
      return;
    }
    await setAndroidWidgetConfiguration(widgetInfo.widgetId, selectedId);
    const configuration = configurations.find((item) => item.id === selectedId);
    if (configuration) await preview(configuration);
    setResult('ok');
  }

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Jeevya Widget</Text>
      <Text style={styles.subtitle}>Choose the existing Jeevya widget configuration for this home-screen instance.</Text>
      <ScrollView contentContainerStyle={styles.list}>
        {loading ? <Text style={styles.secondary}>Loading configurations…</Text> : null}
        {!loading && configurations.length === 0 ? <Text style={styles.secondary}>No widget configuration is available.</Text> : null}
        {configurations.map((configuration) => {
          const selected = configuration.id === selectedId;
          return (
            <Pressable
              key={configuration.id}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => void choose(configuration)}
              style={[styles.card, selected ? styles.cardSelected : null]}
            >
              <Text style={styles.cardTitle}>{configuration.title || 'Jeevya'}</Text>
              <Text style={styles.cardMeta}>{configuration.preset} · {configuration.density}</Text>
              <Text style={styles.modules}>{configuration.modules.join(' · ')}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={styles.actions}>
        <Pressable onPress={() => setResult('cancel')} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </Pressable>
        <Pressable disabled={!selectedId} onPress={() => void confirm()} style={[styles.primaryButton, !selectedId ? styles.disabled : null]}>
          <Text style={styles.primaryButtonText}>Use configuration</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, padding: 20 },
  title: { color: colors.text, fontSize: 24, fontWeight: '700', marginBottom: 6 },
  subtitle: { color: colors.secondary, fontSize: 14, lineHeight: 20, marginBottom: 16 },
  list: { gap: 10, paddingBottom: 16 },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 16, borderWidth: 1, padding: 14 },
  cardSelected: { borderColor: colors.primary, borderWidth: 2 },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  cardMeta: { color: colors.secondary, fontSize: 12, marginTop: 3, textTransform: 'capitalize' },
  modules: { color: colors.text, fontSize: 12, marginTop: 8 },
  secondary: { color: colors.secondary, fontSize: 14 },
  actions: { flexDirection: 'row', gap: 10, paddingTop: 10 },
  secondaryButton: { flex: 1, alignItems: 'center', borderColor: colors.border, borderRadius: 12, borderWidth: 1, paddingVertical: 13 },
  secondaryButtonText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  primaryButton: { flex: 1, alignItems: 'center', backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 13 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  disabled: { opacity: 0.5 },
});
