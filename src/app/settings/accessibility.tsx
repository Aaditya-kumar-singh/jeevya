import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Accessibility, ArrowLeft, CheckCircle2 } from 'lucide-react-native';
import { Button, ButtonText, Card, Heading, Text } from '@/components/ui';
import { getAccessibilityAudit } from '@/lib/uiAccessibilityAudit';

type Audit = Awaited<ReturnType<typeof getAccessibilityAudit>>;
function AuditRow({ label, value }: { label: string; value: string }) { return <View className="flex-row items-center justify-between border-b border-border py-3"><Text className="flex-1">{label}</Text><Text size="sm" className="font-semibold text-muted-foreground">{value}</Text></View>; }
export default function AccessibilitySettings() {
  const router = useRouter(); const [audit, setAudit] = useState<Audit | null>(null);
  useEffect(() => { void getAccessibilityAudit().then(setAudit); }, []);
  return <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingBottom: 40 }}><View className="gap-4 px-5 pt-14"><View className="flex-row items-center gap-3"><Button variant="ghost" size="icon" onPress={() => router.back()} accessibilityLabel="Back to settings"><ArrowLeft size={20} /></Button><View className="flex-1"><Text size="sm" className="text-muted-foreground">Settings</Text><Heading size="xl">Accessibility</Heading></View><Accessibility size={24} /></View><Card className="p-4"><Heading size="md">Device accessibility</Heading><AuditRow label="Screen reader" value={audit?.screenReaderEnabled ? 'Enabled' : 'Disabled'} /><AuditRow label="Reduce motion" value={audit?.reduceMotion ? 'Enabled' : 'Disabled'} /><AuditRow label="Font scale" value={audit ? `${audit.fontScale.toFixed(2)}×` : 'Checking'} /><AuditRow label="Large-font mode" value={audit?.largeFontScale ? 'Detected' : 'Standard'} /></Card><Card className="p-4"><View className="flex-row items-center gap-2"><CheckCircle2 size={18} /><Heading size="md">Jeevya accessibility baseline</Heading></View><Text size="sm" className="mt-2 text-muted-foreground">Semantic labels, comfortable touch targets, safe-area handling, and motion-aware utilities are provided across the shared UI foundation.</Text></Card></View></ScrollView>;
}
