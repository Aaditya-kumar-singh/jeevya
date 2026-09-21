import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle2, CircleAlert, ClipboardCheck } from 'lucide-react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { useWeeklyReview } from '@/hooks/useWeeklyReview';

export default function WeeklyReviewScreen() {
  const router = useRouter();
  const { data, loading, refreshing, error, refresh } = useWeeklyReview();

  if (loading && !data) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" className="text-primary" />
        <Text size="sm" className="mt-3 text-muted-foreground">Building weekly review...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}
    >
      <View className="gap-4 px-5 pt-14">
        <View className="flex-row items-center gap-3">
          <Button variant="ghost" size="icon" onPress={() => router.back()}>
            <ArrowLeft size={20} />
          </Button>
          <View className="flex-1">
            <Text size="sm" className="text-muted-foreground">Jeevya · Review</Text>
            <Heading size="xl" className="mt-1">Weekly Review</Heading>
            <Text size="sm" className="mt-1 text-muted-foreground">A factual summary of the last 7 days</Text>
          </View>
          <ClipboardCheck size={24} className="text-primary" />
        </View>

        {error ? <Card className="p-3"><Text size="xs" className="text-red-600 dark:text-red-400">{error}</Text></Card> : null}

        {data ? (
          <>
            <Card className="p-4">
              <Heading size="sm">{data.startDate} → {data.endDate}</Heading>
              <Text size="xs" className="mt-1 text-muted-foreground">Derived directly from existing Jeevya domain records.</Text>
            </Card>
            {data.insights.length ? data.insights.map((insight) => (
              <Card key={insight.id} className="p-4">
                <View className="flex-row items-start gap-3">
                  {insight.tone === 'attention' ? <CircleAlert size={19} className="mt-0.5 text-amber-500" /> : <CheckCircle2 size={19} className="mt-0.5 text-emerald-500" />}
                  <View className="flex-1">
                    <Heading size="sm">{insight.title}</Heading>
                    <Text size="sm" className="mt-1 text-muted-foreground">{insight.description}</Text>
                  </View>
                </View>
              </Card>
            )) : (
              <Card className="items-center p-6">
                <ClipboardCheck size={28} className="text-muted-foreground" />
                <Heading size="md" className="mt-3">No review signals yet</Heading>
                <Text size="sm" className="mt-1 text-center text-muted-foreground">Use your Jeevya modules during the week and this review will summarize the available activity.</Text>
              </Card>
            )}
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}
