import { ScrollView, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { BookOpen } from 'lucide-react-native';

import { Badge, BadgeText } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Progress, ProgressFilledTrack } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { books } from '@/lib/mockData';

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const book = books.find((b) => b.id === id);

  if (!book) {
    return (
      <ScrollView className="flex-1 bg-background">
        <View className="gap-4 px-5 pb-8 pt-14">
          <Heading size="xl">Book not found</Heading>
          <Text size="sm" className="text-muted-foreground">
            No book matches id “{id}”.
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="gap-4 px-5 pb-8 pt-14">
        <View>
          <Text size="sm" className="text-muted-foreground">
            Growth · Book detail
          </Text>
          <Heading size="xl" className="mt-1">
            {book.title}
          </Heading>
          <Text size="sm" className="mt-1 text-muted-foreground">
            {book.author}
          </Text>
        </View>

        <Card className="w-full p-4">
          <View className="flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-muted">
              <BookOpen size={18} />
            </View>
            <Badge
              variant={
                book.status === 'Finished'
                  ? 'default'
                  : book.status === 'Reading'
                    ? 'secondary'
                    : 'outline'
              }>
              <BadgeText>{book.status}</BadgeText>
            </Badge>
            <Text size="sm" className="text-muted-foreground">
              {book.progress}% finished
            </Text>
          </View>
          <Progress value={book.progress} className="mt-3">
            <ProgressFilledTrack />
          </Progress>
          <Text size="sm" className="mt-3 text-muted-foreground">
            Continue where you left off. Log pages from your daily reading habit to move this
            forward.
          </Text>
        </Card>
      </View>
    </ScrollView>
  );
}

