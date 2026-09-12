import { ScrollView, View } from 'react-native';

import { Badge, BadgeText } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { journalEntries } from '@/lib/mockData';

export default function JournalScreen() {
  return (
    <ScrollView className="flex-1 bg-background">
      <View className="gap-4 px-5 pb-8 pt-14">
        <View>
          <Text size="sm" className="text-muted-foreground">
            Growth · Reflection
          </Text>
          <Heading size="xl" className="mt-1">
            Journal
          </Heading>
          <Text size="sm" className="mt-1 text-muted-foreground">
            {journalEntries.length} recent entries
          </Text>
        </View>

        <View className="gap-3">
          {journalEntries.map((entry) => (
            <Card key={entry.id} className="w-full p-4">
              <View className="flex-row items-center justify-between">
                <Heading size="sm">{entry.title}</Heading>
                <Badge variant={entry.mood === 'Great' ? 'default' : 'secondary'}>
                  <BadgeText>{entry.mood}</BadgeText>
                </Badge>
              </View>
              <Text size="sm" className="mt-2">
                {entry.preview}
              </Text>
              <Text size="sm" className="mt-2 text-muted-foreground">
                {entry.date}
              </Text>
            </Card>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

