import { Modal, Pressable, View } from 'react-native';
import { useEffect, useState } from 'react';
import { Link, type Href } from 'expo-router';
import { BookOpen, Dumbbell, Plus, Settings2, Wallet } from 'lucide-react-native';

import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { ScalePressable } from '@/components/motion/ScalePressable';
import { getQuickActionConfigs, resetQuickActionConfigs, saveQuickActionConfigs, type QuickActionConfig, type QuickActionId } from '@/services/dashboardQuickActions';

const icons = { workout: Dumbbell, task: Plus, expense: Wallet, journal: BookOpen };
const iconStyles = { workout: ['bg-rose-500/15', 'text-rose-500'], task: ['bg-violet-500/15', 'text-violet-500'], expense: ['bg-emerald-500/15', 'text-emerald-500'], journal: ['bg-amber-500/15', 'text-amber-500'] };

export default function QuickActions() {
  const [actions, setActions] = useState<QuickActionConfig[]>([]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<QuickActionConfig[]>([]);

  useEffect(() => { void getQuickActionConfigs().then((items) => { setActions(items); setDraft(items); }); }, []);

  const openEditor = () => { setDraft(actions); setOpen(true); };
  const update = (id: QuickActionId, patch: Partial<QuickActionConfig>) => setDraft((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  const save = async () => { await saveQuickActionConfigs(draft); setActions(draft); setOpen(false); };
  const reset = async () => { const items = await resetQuickActionConfigs(); setActions(items); setDraft(items); };

  const visible = actions.filter((item) => item.enabled);
  return <>
    <Card className="w-full p-4 border border-border/50 shadow-xs">
      <View className="flex-row items-center justify-between">
        <Heading size="md" className="font-bold">Quick Actions</Heading>
        <Pressable onPress={openEditor} accessibilityLabel="Configure quick actions" className="h-9 w-9 items-center justify-center rounded-full bg-muted">
          <Settings2 size={16} className="text-muted-foreground" />
        </Pressable>
      </View>
      <View className="mt-3.5 flex-row gap-2.5">
        {visible.length === 0 ? <Text size="sm" className="py-3 text-muted-foreground">No quick actions enabled. Open settings to add some.</Text> : visible.map((action) => {
          const Icon = icons[action.id];
          const [iconBg, textColor] = iconStyles[action.id];
          return <Link key={action.id} href={action.href as Href} asChild><ScalePressable className="flex-1"><View className="items-center gap-2 rounded-2xl bg-muted/60 py-3.5 px-1 border border-border/30"><View className={`h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}><Icon size={18} className={textColor} /></View><Text size="xs" className="text-center font-semibold text-foreground">{action.label}</Text></View></ScalePressable></Link>;
        })}
      </View>
    </Card>

    <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
      <View className="flex-1 justify-end bg-black/40">
        <Card className="rounded-t-3xl p-5">
          <View className="flex-row items-center justify-between"><Heading size="lg">Configure quick actions</Heading><Pressable onPress={() => setOpen(false)}><Text className="font-semibold">Done</Text></Pressable></View>
          <Text size="xs" className="mt-1 text-muted-foreground">Choose which actions appear and customize their labels. Destinations stay within Jeevya routes.</Text>
          {draft.map((item) => <View key={item.id} className="mt-3 rounded-2xl border border-border p-3">
            <View className="flex-row items-center justify-between"><Text className="font-semibold">{item.id}</Text><Pressable onPress={() => update(item.id, { enabled: !item.enabled })}><Text className={item.enabled ? 'text-primary font-semibold' : 'text-muted-foreground'}>{item.enabled ? 'Enabled' : 'Hidden'}</Text></Pressable></View>
            <Input className="mt-2"><InputField value={item.label} onChangeText={(label) => update(item.id, { label })} placeholder="Action label" maxLength={28} /></Input>
          </View>)}
          <View className="mt-4 flex-row gap-2"><Button variant="outline" className="flex-1" onPress={() => void reset()}><ButtonText>Reset</ButtonText></Button><Button className="flex-1" onPress={() => void save()}><ButtonText>Save</ButtonText></Button></View>
        </Card>
      </View>
    </Modal>
  </>;
}
