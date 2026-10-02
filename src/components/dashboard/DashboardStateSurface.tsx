import { Pressable, View } from 'react-native';
import { RefreshCw } from 'lucide-react-native';
import { Card, Heading, Text } from '@/components/ui';

function SkeletonCard({ height = 90 }: { height?: number }) {
  return <Card className="p-4 border border-border/40"><View className="h-4 w-32 rounded-lg bg-muted" /><View style={{ height: 12 }} /><View className="h-3 w-full rounded-lg bg-muted" /><View className="mt-2 h-3 w-2/3 rounded-lg bg-muted" /><View style={{ height: Math.max(0, height - 58) }} /></Card>;
}

export function DashboardSkeleton() {
  return <View className="gap-4"><SkeletonCard height={110} /><SkeletonCard height={85} /><SkeletonCard height={105} /><SkeletonCard height={120} /></View>;
}

export function DashboardErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <Card className="border border-destructive/30 p-5"><Heading size="md">Dashboard unavailable</Heading><Text size="sm" className="mt-1 text-muted-foreground">{message}</Text><Pressable onPress={onRetry} className="mt-4 flex-row items-center gap-2 self-start rounded-xl bg-primary px-4 py-2.5"><RefreshCw size={15} className="text-primary-foreground" /><Text className="font-semibold text-primary-foreground">Retry</Text></Pressable></Card>;
}

export function DashboardEmptyState() {
  return <Card className="p-5"><Heading size="md">Your day is ready</Heading><Text size="sm" className="mt-1 text-muted-foreground">Start with a task, habit, workout, journal entry, or expense. Your dashboard will populate with real activity.</Text></Card>;
}
