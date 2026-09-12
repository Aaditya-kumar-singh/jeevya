import { Pressable, ScrollView, View } from 'react-native';
import { Link } from 'expo-router';
import { BookOpen, ChevronRight } from 'lucide-react-native';

import { Badge, BadgeText } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Progress, ProgressFilledTrack } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { books } from '@/lib/mockData';

export default function BooksScreen() {
  const reading = books.filter((b) => b.status === 'Reading').length;

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="gap-4 px-5 pb-8 pt-14">
        <View>
          <Text size="sm" className="text-muted-foreground">
            Growth · Library
          </Text>
          <Heading size="xl" className="mt-1">
            Books
          </Heading>
          <Text size="sm" className="mt-1 text-muted-foreground">
            {reading} currently reading · {books.length} total
          </Text>
        </View>

        <View className="gap-3">
          {books.map((book) => (
            <Link key={book.id} href={`/books/${book.id}` as any} asChild>
              <Pressable>
                <Card className="w-full p-4">
                  <View className="flex-row items-center gap-3">
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-muted">
                      <BookOpen size={18} />
                    </View>
                    <View className="flex-1">
                      <Heading size="sm">{book.title}</Heading>
                      <Text size="sm" className="text-muted-foreground">
                        {book.author}
                      </Text>
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
                    <ChevronRight size={18} />
                  </View>
                  {book.status === 'Reading' ? (
                    <Progress value={book.progress} className="mt-3">
                      <ProgressFilledTrack />
                    </Progress>
                  ) : null}
                  {book.status === 'Reading' ? (
                    <Text size="sm" className="mt-2 text-muted-foreground">
                      {book.progress}% finished
                    </Text>
                  ) : null}
                </Card>
              </Pressable>
            </Link>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

