import { useState } from 'react';
import { Alert, Pressable, ScrollView, TextInput, View } from 'react-native';
import { BedDouble, MoonStar, Plus, Trash2, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { FadeInView } from '@/components/motion/FadeInView';
import { FloatingBlobsSVG } from '@/components/visuals/FloatingBlobsSVG';
import { todayDay, formatCalendarDate, isValidDay } from '@/lib/journal-calendar';
import { useSleep } from '@/hooks/useSleep';
import type { SleepEntry, SleepQuality } from '@/services/sleep';

const QUALITIES: SleepQuality[] = ['poor', 'fair', 'good', 'excellent'];

function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.floor(minutes));
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (!hours) return `${mins}m`;
  if (!mins) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function calculatedDuration(start: string, end: string): number | null {
  const a = Date.parse(start);
  const b = Date.parse(end);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return null;
  return (b - a) / 60000;
}

function displayTimestamp(value?: string): string {
  if (!value) return 'Not recorded';
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toLocaleString() : value;
}

function emptyForm(date: string) {
  return {
    date,
    bedtime: '',
    sleepStart: '',
    wakeTime: '',
    sleepEnd: '',
    quality: 'good' as SleepQuality,
    notes: '',
  };
}

export default function SleepScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top + 12, 48);
  const { entries, loading, error, loadEntries, addSleepEntry, editSleepEntry, removeSleepEntry } = useSleep();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filterDate, setFilterDate] = useState(todayDay());
  const [form, setForm] = useState(emptyForm(todayDay()));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const today = todayDay();
  const todayEntry = entries.find((entry) => entry.date === today) ?? null;
  const filteredEntries = isValidDay(filterDate)
    ? entries.filter((entry) => entry.date === filterDate)
    : entries;
  const previewDuration = calculatedDuration(form.sleepStart, form.sleepEnd);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm(today));
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (entry: SleepEntry) => {
    setEditingId(entry.id);
    setForm({
      date: entry.date,
      bedtime: entry.bedtime ?? '',
      sleepStart: entry.sleepStart,
      wakeTime: entry.wakeTime ?? '',
      sleepEnd: entry.sleepEnd,
      quality: entry.quality,
      notes: entry.notes ?? '',
    });
    setFormError(null);
    setShowForm(true);
  };

  const save = async () => {
    setFormError(null);
    if (!isValidDay(form.date)) {
      setFormError('Date must use YYYY-MM-DD and be a real calendar date.');
      return;
    }
    const duration = calculatedDuration(form.sleepStart, form.sleepEnd);
    if (!duration || duration <= 0) {
      setFormError('Sleep end must be after sleep start, using ISO timestamps.');
      return;
    }
    setSaving(true);
    try {
      const input = {
        date: form.date,
        bedtime: form.bedtime.trim() || null,
        sleepStart: form.sleepStart.trim(),
        wakeTime: form.wakeTime.trim() || null,
        sleepEnd: form.sleepEnd.trim(),
        quality: form.quality,
        notes: form.notes.trim() || null,
      };
      if (editingId) await editSleepEntry(editingId, input);
      else await addSleepEntry(input);
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm(today));
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Unable to save sleep entry.');
    } finally {
      setSaving(false);
    }
  };

  const remove = (entry: SleepEntry) => {
    Alert.alert('Delete sleep entry?', formatCalendarDate(entry.date), [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void removeSleepEntry(entry.id) },
    ]);
  };

  return (
    <View className="flex-1 bg-sky-50/40 dark:bg-slate-950 relative">
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 0 }}>
        <FloatingBlobsSVG color1="#38BDF8" color2="#6366F1" width={450} height={350} />
      </View>
      <ScrollView className="flex-1">
        <View className="gap-4 px-5 pb-12" style={{ zIndex: 1, paddingTop: topPadding }}>
          <FadeInView delay={0}>
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text size="xs" className="font-semibold text-sky-500 uppercase tracking-wider">Sleep Tracking</Text>
                <Heading size="xl" className="mt-1 font-bold tracking-tight text-foreground">Sleep</Heading>
                <Text size="sm" className="mt-1 text-muted-foreground font-medium">Record your sleep and review previous entries.</Text>
              </View>
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/15 border border-sky-500/20 shadow-xs">
                <MoonStar size={24} className="text-sky-500" />
              </View>
            </View>
          </FadeInView>

          {error ? (
            <Card className="p-4 rounded-3xl border border-destructive/30 bg-card">
              <Text className="text-destructive">{error}</Text>
              <Pressable onPress={() => void loadEntries()} className="mt-3 self-start rounded-full bg-primary px-4 py-2">
                <Text className="font-semibold text-primary-foreground">Retry</Text>
              </Pressable>
            </Card>
          ) : null}

          <FadeInView delay={40}>
            <Card className="w-full p-5 border border-border/60 bg-card/90 dark:bg-card/70 shadow-xs rounded-3xl">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <MoonStar size={20} className="text-sky-500" />
                  <Heading size="md" className="font-bold">Today&apos;s Sleep</Heading>
                </View>
                <Pressable onPress={openAdd} className="flex-row items-center gap-1 rounded-full bg-primary px-3 py-2" accessibilityRole="button" accessibilityLabel="Add sleep">
                  <Plus size={15} className="text-primary-foreground" />
                  <Text size="xs" className="font-semibold text-primary-foreground">Add</Text>
                </Pressable>
              </View>
              {todayEntry ? (
                <View className="mt-4 gap-2">
                  <Heading size="xl" className="font-extrabold">{formatDuration(todayEntry.durationMinutes)}</Heading>
                  <Text size="sm" className="text-muted-foreground">{todayEntry.quality[0].toUpperCase() + todayEntry.quality.slice(1)} quality</Text>
                  <Text size="xs" className="text-muted-foreground">Sleep: {displayTimestamp(todayEntry.sleepStart)} → {displayTimestamp(todayEntry.sleepEnd)}</Text>
                  <View className="flex-row gap-2 pt-2">
                    <Pressable onPress={() => openEdit(todayEntry)} className="rounded-full border border-border px-4 py-2"><Text size="xs" className="font-semibold">Edit</Text></Pressable>
                    <Pressable onPress={() => remove(todayEntry)} className="flex-row items-center gap-1 rounded-full border border-destructive/30 px-4 py-2"><Trash2 size={14} className="text-destructive" /><Text size="xs" className="font-semibold text-destructive">Delete</Text></Pressable>
                  </View>
                </View>
              ) : (
                <Text size="sm" className="mt-4 text-muted-foreground">No sleep recorded for today.</Text>
              )}
            </Card>
          </FadeInView>

          {showForm ? (
            <FadeInView delay={60}>
              <Card className="w-full p-5 rounded-3xl border border-border bg-card gap-3">
                <View className="flex-row items-center justify-between">
                  <Heading size="md" className="font-bold">{editingId ? 'Edit Sleep' : 'Add Sleep'}</Heading>
                  <Pressable onPress={() => setShowForm(false)} accessibilityLabel="Close sleep form"><X size={20} /></Pressable>
                </View>
                <Text size="xs" className="text-muted-foreground">Use ISO timestamps such as 2026-09-12T23:30:00.000Z. Duration is calculated automatically.</Text>
                <TextInput value={form.date} onChangeText={(value) => setForm((p) => ({ ...p, date: value }))} placeholder="Date (YYYY-MM-DD)" placeholderTextColor="#9CA3AF" className="rounded-2xl border border-border bg-card px-4 py-3 text-foreground" accessibilityLabel="Sleep date" />
                <TextInput value={form.bedtime} onChangeText={(value) => setForm((p) => ({ ...p, bedtime: value }))} placeholder="Bedtime (optional ISO timestamp)" placeholderTextColor="#9CA3AF" className="rounded-2xl border border-border bg-card px-4 py-3 text-foreground" accessibilityLabel="Bedtime" />
                <TextInput value={form.sleepStart} onChangeText={(value) => setForm((p) => ({ ...p, sleepStart: value }))} placeholder="Sleep start (ISO timestamp)" placeholderTextColor="#9CA3AF" className="rounded-2xl border border-border bg-card px-4 py-3 text-foreground" accessibilityLabel="Sleep start" />
                <TextInput value={form.wakeTime} onChangeText={(value) => setForm((p) => ({ ...p, wakeTime: value }))} placeholder="Wake time (optional ISO timestamp)" placeholderTextColor="#9CA3AF" className="rounded-2xl border border-border bg-card px-4 py-3 text-foreground" accessibilityLabel="Wake time" />
                <TextInput value={form.sleepEnd} onChangeText={(value) => setForm((p) => ({ ...p, sleepEnd: value }))} placeholder="Sleep end (ISO timestamp)" placeholderTextColor="#9CA3AF" className="rounded-2xl border border-border bg-card px-4 py-3 text-foreground" accessibilityLabel="Sleep end" />
                <View className="flex-row flex-wrap gap-2">
                  {QUALITIES.map((quality) => (
                    <Pressable key={quality} onPress={() => setForm((p) => ({ ...p, quality }))} className={`rounded-full border px-3 py-2 ${form.quality === quality ? 'border-primary bg-primary/10' : 'border-border bg-card'}`} accessibilityRole="button" accessibilityLabel={`Set quality ${quality}`}>
                      <Text size="xs" className="font-semibold">{quality[0].toUpperCase() + quality.slice(1)}</Text>
                    </Pressable>
                  ))}
                </View>
                <TextInput value={form.notes} onChangeText={(value) => setForm((p) => ({ ...p, notes: value }))} placeholder="Notes (optional)" placeholderTextColor="#9CA3AF" multiline className="min-h-20 rounded-2xl border border-border bg-card px-4 py-3 text-foreground" accessibilityLabel="Sleep notes" />
                {previewDuration ? <Text size="sm" className="font-semibold">Calculated duration: {formatDuration(previewDuration)}</Text> : null}
                {formError ? <Text size="sm" className="text-destructive">{formError}</Text> : null}
                <Pressable onPress={() => void save()} disabled={saving} className="items-center rounded-2xl bg-primary py-3 active:opacity-70">
                  <Text className="font-semibold text-primary-foreground">{saving ? 'Saving…' : editingId ? 'Save Changes' : 'Save Sleep'}</Text>
                </Pressable>
              </Card>
            </FadeInView>
          ) : null}

          <FadeInView delay={80}>
            <Card className="w-full p-5 rounded-3xl border border-border bg-card">
              <View className="flex-row items-center gap-2 mb-3">
                <BedDouble size={20} className="text-indigo-500" />
                <Heading size="md" className="font-bold">Sleep History</Heading>
              </View>
              <TextInput value={filterDate} onChangeText={setFilterDate} placeholder="Filter date (YYYY-MM-DD)" placeholderTextColor="#9CA3AF" className="rounded-2xl border border-border bg-card px-4 py-3 text-foreground" accessibilityLabel="Filter sleep by date" />
              {loading ? <Text size="sm" className="mt-4 text-muted-foreground">Loading sleep entries…</Text> : null}
              {!loading && filteredEntries.length === 0 ? <Text size="sm" className="mt-4 text-muted-foreground">No sleep entries found.</Text> : null}
              <View className="mt-3 gap-3">
                {filteredEntries.map((entry) => (
                  <View key={entry.id} className="rounded-2xl border border-border p-4">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <Text size="xs" className="font-semibold text-muted-foreground">{formatCalendarDate(entry.date)}</Text>
                        <Heading size="md" className="mt-1 font-bold">{formatDuration(entry.durationMinutes)}</Heading>
                        <Text size="xs" className="mt-1 text-muted-foreground">{entry.quality[0].toUpperCase() + entry.quality.slice(1)} · {displayTimestamp(entry.sleepStart)} → {displayTimestamp(entry.sleepEnd)}</Text>
                      </View>
                      <View className="flex-row gap-1">
                        <Pressable onPress={() => openEdit(entry)} className="rounded-full border border-border px-3 py-2" accessibilityLabel={`Edit sleep for ${entry.date}`}><Text size="xs" className="font-semibold">Edit</Text></Pressable>
                        <Pressable onPress={() => remove(entry)} className="h-9 w-9 items-center justify-center rounded-full border border-destructive/30" accessibilityLabel={`Delete sleep for ${entry.date}`}><Trash2 size={15} className="text-destructive" /></Pressable>
                      </View>
                    </View>
                    {entry.bedtime || entry.wakeTime || entry.notes ? <Text size="xs" className="mt-2 text-muted-foreground">{entry.bedtime ? `Bedtime: ${displayTimestamp(entry.bedtime)}` : ''}{entry.wakeTime ? ` · Wake: ${displayTimestamp(entry.wakeTime)}` : ''}{entry.notes ? ` · ${entry.notes}` : ''}</Text> : null}
                  </View>
                ))}
              </View>
            </Card>
          </FadeInView>
        </View>
      </ScrollView>
    </View>
  );
}
