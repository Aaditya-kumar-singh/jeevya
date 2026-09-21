import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, CircleAlert, CircleCheck, Info } from 'lucide-react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { useDataQuality } from '@/hooks/useDataQuality';
import { getDataQualityStatusLabel } from '@/services/dataQuality';
import type { DataQualitySeverity } from '@/types/dataQuality';

const icons: Record<DataQualitySeverity, typeof Info> = { critical: CircleAlert, warning: CircleAlert, info: Info };

export default function DataQualityScreen() {
  const router = useRouter();
  const { data, loading, error, refresh } = useDataQuality();

  if (loading && !data) {
    return <View className="flex-1 items-center justify-center bg-background"><ActivityIndicator size="large" className="text-primary" /><Text size="sm" className="mt-3 text-muted-foreground">Checking Jeevya data...</Text></View>;
  }

  const status = data?.overallStatus ?? 'unavailable';
  const statusClass = status === 'healthy' ? 'text-emerald-600 dark:text-emerald-400' : status === 'warning' ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400';

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void refresh()} />}>
      <View className="gap-4 px-5 pt-14">
        <View className="flex-row items-center gap-3">
          <Button variant="ghost" size="icon" onPress={() => router.back()}><ArrowLeft size={20} /></Button>
          <View className="flex-1"><Text size="sm" className="text-muted-foreground">Jeevya</Text><Heading size="xl" className="mt-1">Data Quality</Heading><Text size="sm" className="mt-1 text-muted-foreground">Diagnostics from existing Jeevya data</Text></View>
          <CircleCheck size={24} className={status === 'healthy' ? 'text-emerald-500' : 'text-primary'} />
        </View>

        {error ? <Card className="p-3"><Text size="xs" className="text-red-600 dark:text-red-400">{error}</Text></Card> : null}

        <Card className="p-4">
          <Text size="xs" className="text-muted-foreground">Overall status</Text>
          <Heading size="lg" className={`mt-1 ${statusClass}`}>{getDataQualityStatusLabel(status)}</Heading>
          <Text size="sm" className="mt-1 text-muted-foreground">{data?.diagnostics.length ? `${data.diagnostics.length} issue${data.diagnostics.length === 1 ? '' : 's'} detected.` : 'No data quality issues detected.'}</Text>
        </Card>

        <View className="gap-2">
          <Heading size="sm">Domain status</Heading>
          {data?.domainStatuses.map((item) => (
            <Card key={item.domain} className="p-3">
              <View className="flex-row items-center justify-between">
                <Text size="sm" className="font-semibold capitalize">{item.domain}</Text>
                <Text size="xs" className="text-muted-foreground">{getDataQualityStatusLabel(item.status)}{item.diagnosticCount ? ` · ${item.diagnosticCount}` : ''}</Text>
              </View>
            </Card>
          ))}
        </View>

        <View className="gap-3">
          <Heading size="sm">Issues</Heading>
          {data?.diagnostics.length ? data.diagnostics.map((item) => {
            const Icon = icons[item.severity];
            return (
              <Card key={item.stableId} className="p-4">
                <View className="flex-row gap-3">
                  <Icon size={20} className={item.severity === 'critical' ? 'text-red-500' : item.severity === 'warning' ? 'text-amber-500' : 'text-muted-foreground'} />
                  <View className="flex-1">
                    <View className="flex-row items-center justify-between gap-2"><Heading size="sm">{item.issue}</Heading><Text size="xs" className="text-muted-foreground capitalize">{item.domain}</Text></View>
                    <Text size="sm" className="mt-1 text-muted-foreground">{item.description}</Text>
                    <Text size="xs" className="mt-2 text-muted-foreground">Affected: {item.affectedArea}</Text>
                    {item.actionable && item.route ? <Button variant="outline" size="sm" className="mt-3 self-start" onPress={() => router.push(item.route as any)}>Open affected area</Button> : null}
                  </View>
                </View>
              </Card>
            );
          }) : <Card className="items-center p-6"><CircleCheck size={28} className="text-emerald-500" /><Heading size="md" className="mt-3">Everything looks healthy</Heading><Text size="sm" className="mt-1 text-center text-muted-foreground">No actionable data quality problems were detected from the current authoritative data.</Text></Card>}
        </View>

        <Text size="xs" className="text-center text-muted-foreground">Diagnostics are read-only. Jeevya does not silently repair or modify your data.</Text>
      </View>
    </ScrollView>
  );
}
