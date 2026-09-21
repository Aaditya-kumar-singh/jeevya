import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Plus, Trash2, ChevronUp, ChevronDown, Save, RotateCcw } from 'lucide-react-native';

import {
  DEFAULT_WIDGET_THEME,
  WIDGET_MODULE_LABELS,
  WIDGET_MODULES,
  type WidgetConfiguration,
  type WidgetLayout,
  type WidgetModule,
  type WidgetSize,
} from '@/types/widgets';
import { getWidgetConfigurations, upsertWidgetConfiguration, deleteWidgetConfiguration } from '@/services/widgets';

const presets: Record<string, WidgetModule[]> = {
  Daily: ['daily_pulse', 'tasks', 'habits', 'daily_plan'],
  Health: ['workout', 'sleep', 'recovery', 'water', 'calories', 'protein'],
  Finance: ['finance_spending', 'finance_budget', 'savings'],
  Progress: ['goals', 'books', 'daily_pulse', 'life_intelligence'],
};

function makeConfig(modules: WidgetModule[] = presets.Daily): WidgetConfiguration {
  const now = new Date().toISOString();
  return {
    id: 'widget_' + Date.now().toString(36),
    title: 'My Jeevya Widget',
    preset: 'custom',
    density: 'compact',
    modules,
    slots: modules.map((module, index) => ({ slotId: 'slot_' + (index + 1), module, enabled: true })),
    size: 'medium',
    layout: 'stack',
    theme: DEFAULT_WIDGET_THEME,
    selectedMetrics: [],
    createdAt: now,
    updatedAt: now,
  };
}

export default function WidgetSettingsScreen() {
  const [configs, setConfigs] = useState<WidgetConfiguration[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [draft, setDraft] = useState<WidgetConfiguration | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);

  const load = useCallback(async () => {
    const items = await getWidgetConfigurations();
    setConfigs(items);
    const id = selectedId && items.some((item) => item.id === selectedId) ? selectedId : items[0]?.id ?? '';
    setSelectedId(id);
    setDraft(items.find((item) => item.id === id) ?? null);
  }, [selectedId]);

  useEffect(() => { void load(); }, [load]);

  const available = useMemo(() => {
    const used = new Set(draft?.modules ?? []);
    return WIDGET_MODULES.filter((module) => !used.has(module));
  }, [draft]);

  const updateDraft = (patch: Partial<WidgetConfiguration>) => {
    setDraft((current) => current ? { ...current, ...patch, updatedAt: new Date().toISOString() } : current);
  };

  const selectConfig = (id: string) => {
    setSelectedId(id);
    setDraft(configs.find((item) => item.id === id) ?? null);
    setLibraryOpen(false);
  };

  const addModule = (module: WidgetModule) => {
    if (!draft) return;
    const slots = draft.slots ?? draft.modules.map((item, index) => ({ slotId: 'slot_' + (index + 1), module: item, enabled: true }));
    const nextSlots = [...slots, { slotId: 'slot_' + (slots.length + 1), module, enabled: true }];
    updateDraft({ modules: nextSlots.map((slot) => slot.module), slots: nextSlots });
    setLibraryOpen(false);
  };

  const removeModule = (index: number) => {
    if (!draft) return;
    const slots = (draft.slots ?? []).filter((_, slotIndex) => slotIndex !== index);
    updateDraft({ modules: slots.map((slot) => slot.module), slots });
  };

  const moveModule = (index: number, direction: -1 | 1) => {
    if (!draft) return;
    const slots = [...(draft.slots ?? [])];
    const target = index + direction;
    if (target < 0 || target >= slots.length) return;
    [slots[index], slots[target]] = [slots[target], slots[index]];
    updateDraft({ modules: slots.map((slot) => slot.module), slots });
  };

  const save = async () => {
    if (!draft || !draft.modules.length) {
      Alert.alert('Add a block', 'Choose at least one Jeevya module.');
      return;
    }
    const saved = await upsertWidgetConfiguration(draft);
    setConfigs(saved);
    Alert.alert('Saved', 'Your widget layout is ready. Add or reconfigure the Jeevya widget from the Android home screen.');
  };

  const create = async () => {
    const config = makeConfig();
    const saved = await upsertWidgetConfiguration(config);
    setConfigs(saved);
    setSelectedId(config.id);
    setDraft(config);
  };

  const remove = async () => {
    if (!draft) return;
    const saved = await deleteWidgetConfiguration(draft.id);
    setConfigs(saved);
    const next = saved[0];
    setSelectedId(next?.id ?? '');
    setDraft(next ?? null);
  };

  if (!draft) {
    return <View style={styles.center}><Text style={styles.title}>Jeevya Widgets</Text><Pressable style={styles.primary} onPress={() => void create()}><Plus color="#fff" size={18}/><Text style={styles.primaryText}>Create widget</Text></Pressable></View>;
  }

  const slots = draft.slots ?? draft.modules.map((module, index) => ({ slotId: 'slot_' + (index + 1), module, enabled: true }));

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Jeevya Widget Studio</Text>
            <Text style={styles.title}>Build your widget</Text>
            <Text style={styles.subtitle}>Add modules from across Jeevya, arrange them, and save different layouts for different home-screen widgets.</Text>
          </View>
          <Pressable onPress={() => router.back()}><Text style={styles.link}>Done</Text></Pressable>
        </View>

        <View style={styles.row}>
          {configs.map((config) => (
            <Pressable key={config.id} onPress={() => selectConfig(config.id)} style={[styles.chip, config.id === selectedId && styles.chipActive]}>
              <Text style={[styles.chipText, config.id === selectedId && styles.chipTextActive]}>{config.title || 'Jeevya'}</Text>
            </Pressable>
          ))}
          <Pressable onPress={() => void create()} style={styles.addChip}><Plus size={16} color="#6366F1"/><Text style={styles.addText}>New</Text></Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Name</Text>
          <TextInput value={draft.title ?? ''} onChangeText={(title) => updateDraft({ title })} placeholder="My Jeevya Widget" style={styles.input}/>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Start from a preset</Text>
          <View style={styles.wrap}>
            {Object.entries(presets).map(([name, modules]) => (
              <Pressable key={name} onPress={() => {
                const slots = modules.map((module, index) => ({ slotId: 'slot_' + (index + 1), module, enabled: true }));
                updateDraft({ modules, slots, preset: name.toLowerCase() as WidgetConfiguration['preset'] });
              }} style={styles.option}><Text style={styles.optionText}>{name}</Text></Pressable>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Blocks</Text><Text style={styles.counter}>{slots.length}/12</Text></View>
          {slots.map((slot, index) => (
            <View key={slot.slotId} style={styles.blockRow}>
              <View style={styles.number}><Text style={styles.numberText}>{index + 1}</Text></View>
              <Text style={styles.blockName}>{WIDGET_MODULE_LABELS[slot.module]}</Text>
              <Pressable onPress={() => moveModule(index, -1)} disabled={index === 0}><ChevronUp size={18} color={index === 0 ? '#CBD5E1' : '#475569'}/></Pressable>
              <Pressable onPress={() => moveModule(index, 1)} disabled={index === slots.length - 1}><ChevronDown size={18} color={index === slots.length - 1 ? '#CBD5E1' : '#475569'}/></Pressable>
              <Pressable onPress={() => removeModule(index)}><Trash2 size={18} color="#EF4444"/></Pressable>
            </View>
          ))}
          <Pressable style={styles.addBlock} onPress={() => setLibraryOpen((value) => !value)}><Plus size={18} color="#6366F1"/><Text style={styles.addText}>Add anything from Jeevya</Text></Pressable>
          {libraryOpen ? <View style={styles.library}>{available.map((module) => <Pressable key={module} onPress={() => addModule(module)} style={styles.libraryItem}><Text style={styles.libraryText}>{WIDGET_MODULE_LABELS[module]}</Text><Plus size={16} color="#6366F1"/></Pressable>)}</View> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Widget shape & layout</Text>
          <Text style={styles.label}>Size</Text>
          <View style={styles.wrap}>{(['small', 'medium', 'large'] as WidgetSize[]).map((value) => <Pressable key={value} onPress={() => updateDraft({ size: value })} style={[styles.option, draft.size === value && styles.optionActive]}><Text style={styles.optionText}>{value}</Text></Pressable>)}</View>
          <Text style={styles.label}>Layout</Text>
          <View style={styles.wrap}>{(['stack', 'split', 'grid', 'hero_list'] as WidgetLayout[]).map((value) => <Pressable key={value} onPress={() => updateDraft({ layout: value })} style={[styles.option, draft.layout === value && styles.optionActive]}><Text style={styles.optionText}>{value.replace('_', ' ')}</Text></Pressable>)}</View>
          <Text style={styles.label}>Density</Text>
          <View style={styles.wrap}>{(['compact', 'detailed'] as const).map((value) => <Pressable key={value} onPress={() => updateDraft({ density: value })} style={[styles.option, draft.density === value && styles.optionActive]}><Text style={styles.optionText}>{value}</Text></Pressable>)}</View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Theme</Text>
          <View style={styles.wrap}>{['#FFFFFF', '#12141F', '#0B1020', '#111827'].map((color) => <Pressable key={color} onPress={() => updateDraft({ theme: { ...(draft.theme ?? DEFAULT_WIDGET_THEME), backgroundColor: color, textColor: color === '#FFFFFF' ? '#0F0F19' : '#F8FAFC' } })} style={[styles.color, { backgroundColor: color }, draft.theme?.backgroundColor === color && styles.colorActive]}/>)}</View>
          <Text style={styles.label}>Accent</Text>
          <View style={styles.wrap}>{['#6366F1', '#00F5D4', '#F97316', '#22C55E', '#EC4899'].map((color) => <Pressable key={color} onPress={() => updateDraft({ theme: { ...(draft.theme ?? DEFAULT_WIDGET_THEME), accentColor: color } })} style={[styles.color, { backgroundColor: color }, draft.theme?.accentColor === color && styles.colorActive]}/>)}</View>
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.danger} onPress={() => void remove()}><Trash2 size={17} color="#EF4444"/><Text style={styles.dangerText}>Delete</Text></Pressable>
          <Pressable style={styles.primary} onPress={() => void save()}><Save size={17} color="#fff"/><Text style={styles.primaryText}>Save widget</Text></Pressable>
        </View>
        <Pressable style={styles.reset} onPress={() => setDraft(makeConfig())}><RotateCcw size={16} color="#64748B"/><Text style={styles.resetText}>Reset this editor</Text></Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 20, paddingTop: 58, paddingBottom: 48, gap: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  eyebrow: { color: '#6366F1', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  title: { color: '#0F172A', fontSize: 28, fontWeight: '800', marginTop: 4 },
  subtitle: { color: '#64748B', fontSize: 14, lineHeight: 20, marginTop: 5, maxWidth: 650 },
  link: { color: '#6366F1', fontWeight: '800', padding: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 20, backgroundColor: '#E2E8F0' },
  chipActive: { backgroundColor: '#6366F1' },
  chipText: { color: '#475569', fontWeight: '700' },
  chipTextActive: { color: '#fff' },
  addChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 20, backgroundColor: '#EEF2FF' },
  addText: { color: '#6366F1', fontWeight: '800' },
  card: { backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', padding: 16, gap: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  sectionTitle: { color: '#0F172A', fontSize: 16, fontWeight: '800' },
  counter: { color: '#64748B', fontSize: 12, fontWeight: '700' },
  input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, color: '#0F172A' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#F8FAFC' },
  optionActive: { borderColor: '#6366F1', backgroundColor: '#EEF2FF' },
  optionText: { color: '#334155', fontWeight: '700', textTransform: 'capitalize' },
  blockRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingVertical: 10 },
  number: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  numberText: { color: '#6366F1', fontWeight: '800', fontSize: 12 },
  blockName: { flex: 1, color: '#1E293B', fontWeight: '700' },
  addBlock: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 12, borderRadius: 12, backgroundColor: '#EEF2FF' },
  library: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, overflow: 'hidden' },
  libraryItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 13, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  libraryText: { color: '#334155', fontWeight: '700' },
  label: { color: '#64748B', fontSize: 12, fontWeight: '700', marginTop: 2 },
  color: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: '#E2E8F0' },
  colorActive: { borderColor: '#0F172A', borderWidth: 4 },
  actions: { flexDirection: 'row', gap: 10 },
  danger: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: '#FECACA', borderRadius: 14, paddingVertical: 13 },
  dangerText: { color: '#EF4444', fontWeight: '800' },
  primary: { flex: 2, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7, backgroundColor: '#6366F1', borderRadius: 14, paddingVertical: 13 },
  primaryText: { color: '#fff', fontWeight: '800' },
  reset: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, padding: 10 },
  resetText: { color: '#64748B', fontWeight: '700' },
});
