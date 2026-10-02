import { Modal, Pressable, View } from 'react-native';
import { useEffect, useState } from 'react';
import { Settings2 } from 'lucide-react-native';
import { Card, Heading, Text } from '@/components/ui';
import { getDashboardPreferences, saveDashboardPreferences, type DashboardCardId, type DashboardPreferences } from '@/services/dashboardPreferences';

const labels: Record<DashboardCardId, string> = { pulse: 'Daily pulse', attention: 'Needs attention', progress: 'Today progress', quickActions: 'Quick actions', habits: 'Habits', tasks: 'Tasks', health: 'Health', goals: 'Goals', finance: 'Finance' };

export default function DashboardCustomization({ onChange }: { onChange: (preferences: DashboardPreferences) => void }) {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<DashboardPreferences | null>(null);
  useEffect(() => { if (open) void getDashboardPreferences().then(setPrefs); }, [open]);
  const toggle = async (id: DashboardCardId) => {
    if (!prefs) return;
    const hidden = prefs.hidden.includes(id) ? prefs.hidden.filter((x) => x !== id) : [...prefs.hidden, id];
    const next = { ...prefs, hidden };
    setPrefs(next); onChange(next); await saveDashboardPreferences(next);
  };
  const move = async (id: DashboardCardId, direction: -1 | 1) => {
    if (!prefs) return;
    const index = prefs.order.indexOf(id); const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= prefs.order.length) return;
    const order = [...prefs.order]; [order[index], order[nextIndex]] = [order[nextIndex], order[index]];
    const next = { ...prefs, order }; setPrefs(next); onChange(next); await saveDashboardPreferences(next);
  };
  return <>
    <Pressable onPress={() => setOpen(true)} accessibilityLabel="Customize dashboard" className="absolute right-5 top-12 z-20 h-10 w-10 items-center justify-center rounded-full bg-background/90 border border-border">
      <Settings2 size={18} className="text-foreground" />
    </Pressable>
    <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
      <View className="flex-1 justify-end bg-black/40">
        <Card className="rounded-t-3xl p-5">
          <View className="flex-row items-center justify-between"><Heading size="lg">Customize dashboard</Heading><Pressable onPress={() => setOpen(false)}><Text className="font-semibold">Done</Text></Pressable></View>
          <Text size="xs" className="mt-1 text-muted-foreground">Hide cards or change their order.</Text>
          {prefs?.order.map((id, index) => <View key={id} className="mt-3 flex-row items-center gap-2 rounded-2xl border border-border p-3">
            <Pressable onPress={() => void toggle(id)} className="flex-1"><Text className={prefs.hidden.includes(id) ? 'text-muted-foreground line-through' : 'font-semibold'}>{labels[id]}</Text></Pressable>
            <Pressable onPress={() => void move(id, -1)} disabled={index === 0}><Text className="px-2 text-lg">↑</Text></Pressable>
            <Pressable onPress={() => void move(id, 1)} disabled={index === prefs.order.length - 1}><Text className="px-2 text-lg">↓</Text></Pressable>
          </View>)}
        </Card>
      </View>
    </Modal>
  </>;
}
